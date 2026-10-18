import { Command } from 'commander';
import pc from 'picocolors';
import { globalOutput, formatTable } from '../core/output.js';
import { UsageError } from '../core/errors.js';
import type { Dock, DockChannel } from '../types/index.js';

export function registerDockCommands(program: Command): void {
  const dock = program.command('dock').description('Explore and interact with community docks and channels');

  // aero dock list
  dock
    .command('list')
    .description('List community docks you are a member of')
    .action(async () => {
      const { createHttpClient } = await import('../core/http.js');
      const client = createHttpClient();
      // GET /api/docks/my per docs/02:51
      const res = await client.get<Dock[] | { docks?: Dock[] }>('/api/docks/my');
      const rawData = res.data;
      const docks: Dock[] = Array.isArray(rawData) ? rawData : rawData?.docks || [];

      if (globalOutput.isJson()) {
        globalOutput.print(docks);
      } else {
        if (docks.length === 0) {
          globalOutput.info('You are not currently a member of any docks.');
          return;
        }

        const formattedRows = docks.map(d => ({
          id: d._id,
          name: d.name,
          role: d.role || 'member',
          unread: d.unreadCount ? String(d.unreadCount) : '0',
        }));

        const table = formatTable(formattedRows, ['id', 'name', 'role', 'unread']);
        globalOutput.print(docks, table);
      }
    });

  // aero dock info <dockId>
  dock
    .command('info <dockId>')
    .description('Display detailed information and channels for a specific dock')
    .action(async (dockId: string) => {
      if (!dockId) {
        throw new UsageError('Dock ID is required');
      }

      const { createHttpClient } = await import('../core/http.js');
      const client = createHttpClient();

      // GET /api/docks/{id} per docs/02:54
      const dockRes = await client.get<Dock | { dock?: Dock }>(`/api/docks/${dockId}`);
      const rawDock = dockRes.data;
      const dockData: Dock =
        rawDock && typeof rawDock === 'object' && 'dock' in rawDock
          ? (rawDock as { dock: Dock }).dock
          : (rawDock as Dock);

      // GET /api/docks/{id}/channels per docs/02:55
      let channels: DockChannel[] = [];
      try {
        const chanRes = await client.get<DockChannel[] | { channels?: DockChannel[] }>(
          `/api/docks/${dockId}/channels`
        );
        const rawChan = chanRes.data;
        channels = Array.isArray(rawChan) ? rawChan : rawChan?.channels || [];
      } catch {
        // Channels may be forbidden or empty
      }

      const fullData = {
        ...dockData,
        channels,
      };

      if (globalOutput.isJson()) {
        globalOutput.print(fullData);
      } else {
        const textLines = [
          pc.bold(`Dock: ${dockData.name}`) + pc.dim(` (${dockData._id})`),
          dockData.description ? `Description: ${dockData.description}` : '',
          `Member Role: ${dockData.role || 'member'}`,
          `Unread Count: ${dockData.unreadCount || 0}`,
          '',
          pc.bold('Channels:'),
        ];

        if (channels.length === 0) {
          textLines.push('  No public channels found.');
        } else {
          for (const ch of channels) {
            const unread = ch.unreadCount ? pc.yellow(` [${ch.unreadCount} unread]`) : '';
            textLines.push(`  # ${ch.name} ${pc.dim(`(ID: ${ch._id}, type: ${ch.type || 'text'})`)}${unread}`);
          }
        }

        globalOutput.print(fullData, textLines.filter(Boolean).join('\n'));
      }
    });
}
