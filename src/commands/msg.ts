import { Command } from 'commander';
import pc from 'picocolors';
import { globalOutput } from '../core/output.js';
import { UsageError } from '../core/errors.js';
import type { Message } from '../types/index.js';

export function registerMsgCommands(program: Command): void {
  const msg = program.command('msg').description('Send, view, edit, react to, and watch messages');

  // aero msg chats
  msg
    .command('chats')
    .description('List all active direct conversations, user IDs, and unread counts')
    .action(async () => {
      const { createHttpClient } = await import('../core/http.js');
      const client = createHttpClient();
      const res = await client.get('/api/messages/chats?includeCalls=1');
      const chats = Array.isArray(res.data) ? res.data : [];

      if (globalOutput.isJson()) {
        globalOutput.print(chats);
        return;
      }

      if (chats.length === 0) {
        globalOutput.info('No active conversations found.');
        return;
      }

      const rows = chats.map((c: { _id: string; username?: string; fullName?: string; unreadCount?: number }) => ({
        id: c._id,
        user: `@${c.username || 'unknown'}`,
        name: c.fullName || 'N/A',
        unread: String(c.unreadCount || 0),
      }));

      const { formatTable } = await import('../core/output.js');
      const table = formatTable(rows, ['id', 'user', 'name', 'unread']);
      globalOutput.print(chats, table);
    });

  // aero msg send [text] [target] [--to <id>] [--file <path>] [--dock]
  msg
    .command('send [text] [target]')
    .description('Send a message or attachment to a direct recipient (User ID or username) or dock channel')
    .option('-t, --to [id]', 'Recipient User ID, username, or dock ID')
    .option('-f, --file <path>', 'Attach a local file (image, audio, document, video) to send')
    .option('-d, --dock', 'Send to a community dock channel instead of direct message', false)
    .option('-c, --channel-id <id>', 'Dock channel ID (for dock messaging)')
    .option('-r, --reply <messageId>', 'Message ID to reply to')
    .action(
      async (
        textArg: string | undefined,
        positionalTarget: string | undefined,
        options: { to?: string | boolean; file?: string; dock: boolean; channelId?: string; reply?: string }
      ) => {
        let text = textArg || '';
        const scope = options.dock ? 'dock' : 'dm';
        let target =
          typeof options.to === 'string' && options.to.trim().length > 0
            ? options.to.trim()
            : positionalTarget?.trim() || '';

        // If PowerShell stripped an unquoted @username, options.to is true with no value
        if (!target && options.to === true) {
          globalOutput.warn(
            'PowerShell stripped the unquoted "@username" parameter because "@" is a PowerShell splatting operator.'
          );
          process.stdout.write(
            pc.dim('  Tip: You can pass usernames without "@" (e.g. --to javed) or in quotes (e.g. --to "@javed")\n\n')
          );
          const { input } = await import('@inquirer/prompts');
          target = await input({ message: 'Enter recipient username or User ID:' });
        }

        if (!target) {
          const { input } = await import('@inquirer/prompts');
          target = await input({ message: 'Enter recipient (username or User ID):' });
        }

        if (!target || !target.trim()) {
          throw new UsageError('Recipient is required: aero msg send "<text>" --to <usernameOrId>');
        }

        if (!text.trim() && !options.file) {
          const { input } = await import('@inquirer/prompts');
          text = await input({ message: 'Enter message text:' });
          if (!text.trim() && !options.file) {
            throw new UsageError('Either message text or an attachment file (--file) is required.');
          }
        }

        let targetId = target.trim();

        // If DM and target is username (e.g. javed or @javed), resolve to ObjectID
        if (scope === 'dm' && !/^[0-9a-fA-F]{24}$/.test(targetId)) {
          const cleanName = targetId.startsWith('@') ? targetId.slice(1) : targetId;
          const { createHttpClient } = await import('../core/http.js');
          const client = createHttpClient();
          try {
            const sugRes = await client.get<{ _id?: string; username?: string }[]>(
              `/api/friends/suggestions?q=${encodeURIComponent(cleanName)}`
            );
            const users = Array.isArray(sugRes.data) ? sugRes.data : [];
            const match = users.find(u => u.username?.toLowerCase() === cleanName.toLowerCase()) || users[0];
            if (match?._id) {
              targetId = match._id;
            } else {
              throw new UsageError(
                `User "${cleanName}" not found. Find users with: aero friend find ${cleanName}`
              );
            }
          } catch (err) {
            if (err instanceof UsageError) throw err;
            // fall back to targetId
          }
        }

      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();

      const created = await transport.sendMessage(scope, targetId, text, {
        channelId: options.channelId,
        replyToMessageId: options.reply,
        filePath: options.file,
      });

      if (globalOutput.isJson()) {
        globalOutput.print(created);
      } else {
        globalOutput.success(`Message sent [ID: ${created._id}]`);
        if (created.text) {
          globalOutput.info(`Text: "${created.text}"`);
        }
        if (options.file) {
          globalOutput.info(`Attachment: ${options.file}`);
        }
      }
    });

  // aero msg list <target> [count] [--dock] [--limit N]
  msg
    .command('list <target> [count]')
    .description('List recent messages for a direct conversation (User ID or username) or dock')
    .option('-d, --dock', 'List messages from a community dock', false)
    .option('-c, --channel-id <id>', 'Dock channel ID')
    .option('-l, --limit <n>', 'Maximum number of messages to fetch', '50')
    .option('--before <timestamp>', 'Fetch messages older than timestamp')
    .action(
      async (
        targetArg: string,
        countArg: string | undefined,
        options: { dock: boolean; channelId?: string; limit: string; before?: string }
      ) => {
        const scope = options.dock ? 'dock' : 'dm';
        let targetId = targetArg.trim();
        let limit = parseInt(options.limit, 10) || 50;

        // If user typed "aero msg list 50 <id>" or "aero msg list <id> 50"
        if (/^\d+$/.test(targetArg) && countArg) {
          limit = parseInt(targetArg, 10);
          targetId = countArg.trim();
        } else if (countArg && /^\d+$/.test(countArg.trim())) {
          limit = parseInt(countArg.trim(), 10);
        }

        // If DM and target is username (e.g. javed or @javed), resolve to ObjectID
        if (scope === 'dm' && !/^[0-9a-fA-F]{24}$/.test(targetId)) {
          const cleanName = targetId.startsWith('@') ? targetId.slice(1) : targetId;
          const { createHttpClient } = await import('../core/http.js');
          const client = createHttpClient();
          try {
            const sugRes = await client.get<{ _id?: string; username?: string }[]>(
              `/api/friends/suggestions?q=${encodeURIComponent(cleanName)}`
            );
            const users = Array.isArray(sugRes.data) ? sugRes.data : [];
            const match = users.find(u => u.username?.toLowerCase() === cleanName.toLowerCase()) || users[0];
            if (match?._id) {
              targetId = match._id;
            } else {
              throw new UsageError(`User "${cleanName}" not found. Find users with: aero friend find ${cleanName}`);
            }
          } catch (err) {
            if (err instanceof UsageError) throw err;
            // fall back to targetId
          }
        }

        const { AeroTransport } = await import('../core/transport.js');
        const transport = new AeroTransport();

        const messages = await transport.listMessages(scope, targetId, {
          channelId: options.channelId,
          limit,
          before: options.before,
        });

        if (globalOutput.isJson()) {
          globalOutput.print(messages);
        } else {
          if (!messages || messages.length === 0) {
            globalOutput.info('No messages found.');
            return;
          }

          const { loadConfig, getActiveProfile } = await import('../core/config.js');
          const activeProfile = getActiveProfile(loadConfig());
          const currentUserId = activeProfile.user?._id;

          const lines = messages.map((m: Message) => {
            const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : 'N/A';
            let author = 'unknown';
            if (typeof m.senderId === 'object' && m.senderId !== null) {
              author =
                (m.senderId as { username?: string; _id?: string }).username ||
                (m.senderId as { _id?: string })._id ||
                'unknown';
            } else if (currentUserId && m.senderId === currentUserId) {
              author = 'You';
            } else if (m.senderId) {
              author = m.senderId;
            }

            let content = m.text || '';
            const msgAny = m as unknown as { image?: string; voiceNote?: unknown };
            if (m.attachment) {
              const fileDesc = m.attachment.fileName
                ? `${m.attachment.fileName}${m.attachment.fileSize ? ` (${Math.round(m.attachment.fileSize / 1024)} KB)` : ''}`
                : m.attachment.type || 'file';
              const attachLabel = pc.magenta(`[Attachment: ${fileDesc}]`);
              content = content ? `${content} ${attachLabel}` : attachLabel;
            } else if (msgAny.image) {
              const imgLabel = pc.magenta('[Image]');
              content = content ? `${content} ${imgLabel}` : imgLabel;
            } else if (msgAny.voiceNote) {
              const voiceLabel = pc.magenta('[Voice Note]');
              content = content ? `${content} ${voiceLabel}` : voiceLabel;
            }
            const edited = m.editedAt ? pc.dim(' (edited)') : '';
            const pinned = m.isPinned ? pc.yellow(' 📌') : '';
            const reactions = m.reactions?.length
              ? pc.dim(` [${m.reactions.map(r => r.emoji).join(' ')}]`)
              : '';
            const authorFormatted = author === 'You' ? pc.green(author) : pc.cyan(String(author));
            return `${pc.dim(`[${time}]`)} ${authorFormatted}: ${content}${edited}${pinned}${reactions} ${pc.dim(`(${m._id})`)}`;
          });

          globalOutput.print(messages, lines.join('\n'));
        }
      }
    );

  // aero msg edit <messageId> <newText> [--dock] [--dock-id <id>]
  msg
    .command('edit <messageId> <newText>')
    .description('Edit an existing message sent by the authenticated user')
    .option('-d, --dock', 'Target a dock message', false)
    .option('--dock-id <id>', 'Dock ID (required when editing dock messages)')
    .action(async (messageId: string, newText: string, options: { dock: boolean; dockId?: string }) => {
      const scope = options.dock ? 'dock' : 'dm';
      if (options.dock && !options.dockId) {
        throw new UsageError('--dock-id is required when editing a dock message');
      }

      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();
      const updated = await transport.editMessage(scope, options.dockId || '', messageId, newText);

      if (globalOutput.isJson()) {
        globalOutput.print(updated);
      } else {
        globalOutput.success(`Message updated [ID: ${updated._id}]`);
        globalOutput.info(`New Text: "${updated.text}"`);
      }
    });

  // aero msg delete <messageId> [--dock] [--dock-id <id>] [--yes]
  msg
    .command('delete <messageId>')
    .description('Permanently delete a message')
    .option('-d, --dock', 'Target a dock message', false)
    .option('--dock-id <id>', 'Dock ID (required when deleting dock messages)')
    .option('-y, --yes', 'Confirm deletion automatically without prompt', false)
    .action(async (messageId: string, options: { dock: boolean; dockId?: string; yes: boolean }) => {
      const scope = options.dock ? 'dock' : 'dm';
      if (options.dock && !options.dockId) {
        throw new UsageError('--dock-id is required when deleting a dock message');
      }

      const globalOpts = program.opts();
      const skipPrompt = options.yes || globalOpts.yes || globalOutput.isJson();

      if (!skipPrompt) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: `Are you sure you want to delete message ${messageId}? This cannot be undone.`,
          default: false,
        });
        if (!proceed) {
          globalOutput.info('Deletion cancelled.');
          return;
        }
      }

      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();
      const res = await transport.deleteMessage(scope, options.dockId || '', messageId);

      if (globalOutput.isJson()) {
        globalOutput.print(res);
      } else {
        globalOutput.success(`Message deleted [ID: ${messageId}]`);
      }
    });

  // aero msg react <messageId> <emoji> [--dock] [--dock-id <id>]
  msg
    .command('react <messageId> <emoji>')
    .description('Add or toggle an emoji reaction on a message')
    .option('-d, --dock', 'Target a dock message', false)
    .option('--dock-id <id>', 'Dock ID (required for dock message reactions)')
    .action(async (messageId: string, emoji: string, options: { dock: boolean; dockId?: string }) => {
      const scope = options.dock ? 'dock' : 'dm';
      if (options.dock && !options.dockId) {
        throw new UsageError('--dock-id is required when reacting to a dock message');
      }

      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();
      const reactions = await transport.reactMessage(scope, options.dockId || '', messageId, emoji, true);

      if (globalOutput.isJson()) {
        globalOutput.print({ messageId, reactions });
      } else {
        const list = reactions.map(r => `${r.emoji} (${r.userId})`).join(', ') || 'none';
        globalOutput.success(`Reaction ${emoji} updated on message ${messageId}. Active reactions: ${list}`);
      }
    });

  // aero msg unreact <messageId> <emoji> [--dock] [--dock-id <id>]
  msg
    .command('unreact <messageId> <emoji>')
    .description('Remove an emoji reaction from a message')
    .option('-d, --dock', 'Target a dock message', false)
    .option('--dock-id <id>', 'Dock ID (required for dock message reactions)')
    .action(async (messageId: string, emoji: string, options: { dock: boolean; dockId?: string }) => {
      const scope = options.dock ? 'dock' : 'dm';
      if (options.dock && !options.dockId) {
        throw new UsageError('--dock-id is required when reacting to a dock message');
      }

      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();
      const reactions = await transport.reactMessage(scope, options.dockId || '', messageId, emoji, false);

      if (globalOutput.isJson()) {
        globalOutput.print({ messageId, reactions });
      } else {
        globalOutput.success(`Reaction ${emoji} removed from message ${messageId}`);
      }
    });

  // aero msg watch [--dock] [--json]
  msg
    .command('watch')
    .description('Stream real-time messages and presence events via WebSocket')
    .option('-c, --conversation <id>', 'Join a specific conversation room')
    .action(async (options: { conversation?: string }) => {
      const { getAeroSocket } = await import('../core/socket.js');
      const aeroSocket = getAeroSocket();
      await aeroSocket.connect();

      if (options.conversation) {
        aeroSocket.joinConversation(options.conversation);
      }

      if (!globalOutput.isJson()) {
        globalOutput.info('Connected to Aero real-time gateway. Streaming events (Press Ctrl+C to exit)...');
      }

      // Stream events
      const forwardEvent = (eventName: string, data: unknown) => {
        if (globalOutput.isJson()) {
          // NDJSON format: one json line per event
          process.stdout.write(JSON.stringify({ event: eventName, data, timestamp: new Date().toISOString() }) + '\n');
        } else {
          const time = pc.dim(new Date().toLocaleTimeString());
          if (eventName === 'newMessage') {
            const m = data as Message;
            process.stdout.write(`${time} [${pc.green('NEW MSG')}] ${pc.cyan(m.senderId)}: ${m.text} (${m._id})\n`);
          } else if (eventName === 'messageUpdated') {
            const m = data as Message;
            process.stdout.write(`${time} [${pc.yellow('EDIT')}] ${pc.cyan(m.senderId)}: ${m.text} (${m._id})\n`);
          } else if (eventName === 'messageReaction') {
            const r = data as { messageId?: string; change?: { action?: string; emoji?: string } };
            process.stdout.write(`${time} [${pc.magenta('REACTION')}] Message ${r.messageId || 'unknown'} -> ${r.change?.action || 'update'} ${r.change?.emoji || ''}\n`);
          } else if (eventName === 'user:online') {
            const u = data as { userId?: string };
            process.stdout.write(`${time} [${pc.blue('ONLINE')}] User ${u.userId || 'unknown'} connected\n`);
          } else {
            process.stdout.write(`${time} [${pc.dim(eventName)}] ${JSON.stringify(data)}\n`);
          }
        }
      };

      aeroSocket.on('newMessage', (d) => forwardEvent('newMessage', d));
      aeroSocket.on('messageUpdated', (d) => forwardEvent('messageUpdated', d));
      aeroSocket.on('messageReaction', (d) => forwardEvent('messageReaction', d));
      aeroSocket.on('user:online', (d) => forwardEvent('user:online', d));
      aeroSocket.on('user:lastSeen', (d) => forwardEvent('user:lastSeen', d));
      aeroSocket.on('typing:start', (d) => forwardEvent('typing:start', d));
      aeroSocket.on('typing:stop', (d) => forwardEvent('typing:stop', d));

      // Handle termination signals
      const cleanup = () => {
        aeroSocket.disconnect();
        process.exit(0);
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Keep process alive until terminated
      await new Promise(() => {});
    });

  // aero msg media <messageId> [--field <field>] [--variants]
  msg
    .command('media <messageId>')
    .description('Get the temporary S3 presigned download URL for a message attachment')
    .option('-f, --field <field>', 'Media field: image, document, video, or attachment', 'image')
    .option('-v, --variants', 'Include all resolution variants (thumb, sd, hd)', false)
    .action(async (messageId: string, options: { field: string; variants: boolean }) => {
      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();
      const res = await transport.getMediaUrl(messageId, {
        field: options.field,
        variants: options.variants,
      });

      if (globalOutput.isJson()) {
        globalOutput.print(res);
        return;
      }

      globalOutput.success(`Attachment Media URL [Message ID: ${messageId}]:`);
      if (res.url) {
        process.stdout.write(`  URL:         ${pc.cyan(res.url)}\n`);
      }
      if (res.expiresIn) {
        process.stdout.write(`  Expires In:  ${res.expiresIn}s\n`);
      }
      if (res.variants) {
        process.stdout.write(`\n  Variants:\n`);
        if (res.variants.hd?.url) {
          process.stdout.write(`    HD:    ${pc.dim(res.variants.hd.url)}\n`);
        }
        if (res.variants.sd?.url) {
          process.stdout.write(`    SD:    ${pc.dim(res.variants.sd.url)}\n`);
        }
        if (res.variants.thumb?.url) {
          process.stdout.write(`    Thumb: ${pc.dim(res.variants.thumb.url)}\n`);
        }
      }
      process.stdout.write(
        pc.dim(`\n  Tip: Download directly to disk with: aero msg download ${messageId}\n`)
      );
    });

  // aero msg download <messageId> [destination] [--field <field>]
  msg
    .command('download <messageId> [destination]')
    .description('Download an image, document, or audio attachment from a message to disk')
    .option('-f, --field <field>', 'Attachment field (image, document, video, or attachment)')
    .action(async (messageId: string, destination: string | undefined, options: { field?: string }) => {
      const { AeroTransport } = await import('../core/transport.js');
      const transport = new AeroTransport();
      const ora = (await import('ora')).default;
      const spinner = ora(`Fetching attachment for message ${messageId}...`).start();

      try {
        let originalFileName: string | undefined;
        let detectedField = options.field;

        // Try to fetch message info to get original fileName & type if available
        try {
          const client = (await import('../core/http.js')).createHttpClient();
          const msgRes = await client.get<Message>(`/api/messages/${messageId}`);
          if (msgRes.data?.attachment?.fileName) {
            originalFileName = msgRes.data.attachment.fileName;
          }
          if (!detectedField) {
            if (
              msgRes.data?.attachment?.type === 'document' ||
              msgRes.data?.attachment?.mimeType?.startsWith('application/')
            ) {
              detectedField = 'document';
            } else if (
              msgRes.data?.attachment?.type === 'video' ||
              msgRes.data?.attachment?.mimeType?.startsWith('video/')
            ) {
              detectedField = 'video';
            }
          }
        } catch {
          // If individual message GET fails, proceed with default field
        }

        const downloaded = await transport.downloadMedia(messageId, destination, {
          field: detectedField || 'image',
          originalFileName,
        });

        spinner.succeed(
          `Downloaded attachment [${downloaded.filename}] (${Math.round(downloaded.size / 1024)} KB)`
        );
        globalOutput.info(`Saved to: ${downloaded.path}`);
      } catch (err) {
        spinner.fail('Download failed');
        throw err;
      }
    });
}
