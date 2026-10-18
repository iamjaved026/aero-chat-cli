import { Command } from 'commander';
import pc from 'picocolors';
import { globalOutput, formatTable } from '../core/output.js';
import { UsageError } from '../core/errors.js';
import { createHttpClient } from '../core/http.js';
import type { Friend, FriendRequest, FriendRequestsResult } from '../types/index.js';

export function registerFriendCommands(program: Command): void {
  const friend = program
    .command('friend')
    .alias('friends')
    .description('Find, add, list, and manage friends and friend requests');

  // aero friend list
  friend
    .command('list')
    .description('List all confirmed friends and their user IDs')
    .action(async () => {
      const client = createHttpClient(program.opts().config);
      const res = await client.get<Friend[] | string>('/api/friends/friends');
      let friends: Friend[] = [];

      if (typeof res.data === 'string') {
        try {
          const decoded = Buffer.from(res.data, 'base64').toString('utf-8');
          friends = JSON.parse(decoded);
        } catch {
          friends = [];
        }
      } else if (Array.isArray(res.data)) {
        friends = res.data;
      }

      if (globalOutput.isJson()) {
        globalOutput.print(friends);
        return;
      }

      if (!friends || friends.length === 0) {
        globalOutput.info('You have no friends on your list yet.');
        process.stdout.write(
          pc.dim('  Find users to add with: ') +
            pc.cyan('aero friend find <username>') +
            '\n'
        );
        return;
      }

      const rows = friends.map(f => ({
        id: f._id,
        username: `@${f.username}`,
        name: f.fullName || f.username,
        status: f.status || 'offline',
      }));

      const table = formatTable(rows, ['id', 'username', 'name', 'status']);
      globalOutput.print(friends, table);
    });

  // aero friend find <query> / aero friend search <query>
  const findCmd = async (query: string) => {
    if (!query || !query.trim()) {
      throw new UsageError('Search query or username is required: aero friend find <username>');
    }

    const cleanQuery = query.startsWith('@') ? query.slice(1) : query;
    const client = createHttpClient(program.opts().config);
    const res = await client.get<Friend[]>(`/api/friends/suggestions?q=${encodeURIComponent(cleanQuery.trim())}`);
    const users: Friend[] = Array.isArray(res.data) ? res.data : [];

    if (globalOutput.isJson()) {
      globalOutput.print(users);
      return;
    }

    if (users.length === 0) {
      globalOutput.info(`No users found matching "${query}".`);
      return;
    }

    const rows = users.map(u => ({
      id: u._id,
      username: `@${u.username}`,
      name: u.fullName || u.username,
      bio: u.bio ? (u.bio.length > 35 ? u.bio.slice(0, 32) + '...' : u.bio) : pc.dim('none'),
    }));

    const table = formatTable(rows, ['id', 'username', 'name', 'bio']);
    globalOutput.print(users, table);

    process.stdout.write('\n' + pc.bold('Quick Actions:') + '\n');
    process.stdout.write(
      `  • Add as friend:   ${pc.cyan(`aero friend add ${users[0].username}`)} (or use User ID: ${pc.dim(users[0]._id)})\n`
    );
    process.stdout.write(
      `  • Send a message:  ${pc.cyan(`aero msg send "Hello!" --to ${users[0]._id}`)}\n`
    );
  };

  friend
    .command('find <query>')
    .alias('search')
    .description('Search for users by username or name to get their User ID')
    .action(findCmd);

  // aero friend add [target]
  friend
    .command('add [target]')
    .description('Send a friend request to a user by username or User ID')
    .action(async (target?: string) => {
      let resolvedTarget = target;
      if (!resolvedTarget || !resolvedTarget.trim()) {
        const { input } = await import('@inquirer/prompts');
        resolvedTarget = await input({
          message: 'Enter username or User ID to add (Note: if using PowerShell, enter username without @ or quote "@name"):',
        });
      }

      if (!resolvedTarget || !resolvedTarget.trim()) {
        throw new UsageError('Target username or User ID is required: aero friend add <usernameOrId>');
      }

      const client = createHttpClient(program.opts().config);
      let recipientId = resolvedTarget.trim();
      let displayTarget = resolvedTarget.trim();

      // If target is not a 24-character hexadecimal MongoDB ID, resolve it via search
      if (!/^[0-9a-fA-F]{24}$/.test(recipientId)) {
        const cleanName = recipientId.startsWith('@') ? recipientId.slice(1) : recipientId;
        globalOutput.info(`Looking up user @${cleanName}...`);
        const sugRes = await client.get<Friend[]>(`/api/friends/suggestions?q=${encodeURIComponent(cleanName)}`);
        const candidates = Array.isArray(sugRes.data) ? sugRes.data : [];
        const match =
          candidates.find(u => u.username?.toLowerCase() === cleanName.toLowerCase()) || candidates[0];

        if (!match || !match._id) {
          throw new UsageError(`User "@${cleanName}" was not found. Use "aero friend find ${cleanName}" to search.`);
        }

        recipientId = match._id;
        displayTarget = `@${match.username} (${match._id})`;
      }

      const res = await client.post('/api/friends/send', { recipientId });

      if (globalOutput.isJson()) {
        globalOutput.print(res.data);
      } else {
        globalOutput.success(`Friend request sent successfully to ${pc.cyan(displayTarget)}`);
      }
    });

  // aero friend requests
  friend
    .command('requests')
    .description('List pending incoming and outgoing friend requests')
    .action(async () => {
      const client = createHttpClient(program.opts().config);
      const res = await client.get<FriendRequestsResult>('/api/friends/requests');
      const data = res.data || { incoming: [], outgoing: [] };

      if (globalOutput.isJson()) {
        globalOutput.print(data);
        return;
      }

      const incoming = data.incoming || [];
      const outgoing = data.outgoing || [];

      if (incoming.length === 0 && outgoing.length === 0) {
        globalOutput.info('No pending friend requests.');
        return;
      }

      if (incoming.length > 0) {
        process.stdout.write(pc.bold(pc.green('Incoming Friend Requests:')) + '\n');
        for (const req of incoming) {
          const reqId = req._id;
          const sender = typeof req.requester === 'object' ? req.requester : null;
          const username = sender?.username ? `@${sender.username}` : (req.requester as string);
          const name = sender?.fullName ? ` (${sender.fullName})` : '';
          process.stdout.write(`  • Request ID: ${pc.cyan(reqId)} from ${pc.bold(username)}${name}\n`);
          process.stdout.write(`    Accept: ${pc.green(`aero friend accept ${reqId}`)}\n`);
          process.stdout.write(`    Reject: ${pc.red(`aero friend reject ${reqId}`)}\n\n`);
        }
      }

      if (outgoing.length > 0) {
        process.stdout.write(pc.bold(pc.yellow('Outgoing Pending Requests:')) + '\n');
        for (const req of outgoing) {
          const target = typeof req.recipient === 'object' ? req.recipient : null;
          const username = target?.username ? `@${target.username}` : (req.recipient as string);
          process.stdout.write(`  • Request ID: ${pc.dim(req._id)} sent to ${pc.bold(username)} [${req.status}]\n`);
        }
      }
    });

  // aero friend accept <requestId>
  friend
    .command('accept <requestId>')
    .description('Accept a pending incoming friend request')
    .action(async (requestId: string) => {
      if (!requestId) throw new UsageError('Request ID is required: aero friend accept <requestId>');
      const client = createHttpClient(program.opts().config);
      const res = await client.post('/api/friends/respond', {
        requestId: requestId.trim(),
        action: 'accept',
      });

      if (globalOutput.isJson()) {
        globalOutput.print(res.data);
      } else {
        globalOutput.success(`Accepted friend request [ID: ${requestId}]`);
      }
    });

  // aero friend reject <requestId>
  friend
    .command('reject <requestId>')
    .description('Reject a pending incoming friend request')
    .action(async (requestId: string) => {
      if (!requestId) throw new UsageError('Request ID is required: aero friend reject <requestId>');
      const client = createHttpClient(program.opts().config);
      const res = await client.post('/api/friends/respond', {
        requestId: requestId.trim(),
        action: 'reject',
      });

      if (globalOutput.isJson()) {
        globalOutput.print(res.data);
      } else {
        globalOutput.success(`Rejected friend request [ID: ${requestId}]`);
      }
    });

  // aero friend remove <friendId>
  friend
    .command('remove <friendId>')
    .description('Remove a user from your friends list')
    .option('-y, --yes', 'Confirm removal automatically without prompt', false)
    .action(async (friendId: string, options: { yes: boolean }) => {
      if (!friendId) throw new UsageError('Friend User ID is required: aero friend remove <friendId>');

      const globalOpts = program.opts();
      const skipPrompt = options.yes || globalOpts.yes || globalOutput.isJson();

      if (!skipPrompt) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: `Are you sure you want to remove friend ${friendId}?`,
          default: false,
        });
        if (!proceed) {
          globalOutput.info('Removal cancelled.');
          return;
        }
      }

      const client = createHttpClient(program.opts().config);
      const res = await client.post('/api/friends/remove', { friendId: friendId.trim() });

      if (globalOutput.isJson()) {
        globalOutput.print(res.data);
      } else {
        globalOutput.success(`Removed friend [ID: ${friendId}]`);
      }
    });

  // aero friend block <userId>
  friend
    .command('block <userId>')
    .description('Block a user across direct chats')
    .action(async (userId: string) => {
      if (!userId) throw new UsageError('User ID is required to block');
      const client = createHttpClient(program.opts().config);
      const res = await client.post('/api/friends/block', {
        userId: userId.trim(),
        scope: 'chats',
      });

      if (globalOutput.isJson()) {
        globalOutput.print(res.data);
      } else {
        globalOutput.success(`User ${userId} blocked successfully.`);
      }
    });

  // aero friend unblock <userId>
  friend
    .command('unblock <userId>')
    .description('Unblock a previously blocked user')
    .action(async (userId: string) => {
      if (!userId) throw new UsageError('User ID is required to unblock');
      const client = createHttpClient(program.opts().config);
      const res = await client.post('/api/friends/unblock', {
        userId: userId.trim(),
      });

      if (globalOutput.isJson()) {
        globalOutput.print(res.data);
      } else {
        globalOutput.success(`User ${userId} unblocked successfully.`);
      }
    });
}
