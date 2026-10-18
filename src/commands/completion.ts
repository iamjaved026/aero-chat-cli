import { Command } from 'commander';
import { UsageError } from '../core/errors.js';

export function registerCompletionCommand(program: Command): void {
  program
    .command('completion [shell]')
    .description('Generate shell autocompletion script (bash, zsh, fish)')
    .action((shell?: string) => {
      const targetShell = (shell || 'bash').toLowerCase();

      if (targetShell === 'bash') {
        process.stdout.write(
          `# aero completion for bash
_aero_completions()
{
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  opts="setup auth msg dock friend config completion --help --version --json --quiet --yes --config"

  case "\${prev}" in
    auth)
      COMPREPLY=( $(compgen -W "login logout refresh status whoami register" -- \${cur}) )
      return 0
      ;;
    msg)
      COMPREPLY=( $(compgen -W "chats send list edit delete react unreact watch" -- \${cur}) )
      return 0
      ;;
    dock)
      COMPREPLY=( $(compgen -W "list info" -- \${cur}) )
      return 0
      ;;
    friend|friends)
      COMPREPLY=( $(compgen -W "list find search add requests accept reject remove block unblock" -- \${cur}) )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "where list get set" -- \${cur}) )
      return 0
      ;;
    *)
      ;;
  esac

  COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
  return 0
}
complete -F _aero_completions aero
`
        );
      } else if (targetShell === 'zsh') {
        process.stdout.write(
          `#compdef aero
_aero() {
  local -a commands
  commands=(
    'setup:Run interactive first-time setup wizard'
    'auth:Manage authentication and session state'
    'msg:Send, view, edit, react to, and watch messages'
    'dock:Explore and interact with community docks and channels'
    'friend:Find, add, list, and manage friends'
    'config:Manage CLI configuration settings'
    'completion:Generate shell autocompletion script'
  )
  _describe 'command' commands
}
compdef _aero aero
`
        );
      } else if (targetShell === 'fish') {
        process.stdout.write(
          `# aero completion for fish
complete -c aero -f
complete -c aero -n "__fish_use_subcommand" -a "setup" -d "Run interactive setup wizard"
complete -c aero -n "__fish_use_subcommand" -a "auth" -d "Manage authentication"
complete -c aero -n "__fish_use_subcommand" -a "msg" -d "Messaging operations"
complete -c aero -n "__fish_use_subcommand" -a "dock" -d "Community docks"
complete -c aero -n "__fish_use_subcommand" -a "friend" -d "Find, add, and manage friends"
complete -c aero -n "__fish_use_subcommand" -a "config" -d "Configuration settings"
`
        );
      } else {
        throw new UsageError(`Unsupported shell '${targetShell}'. Supported shells: bash, zsh, fish`);
      }
    });
}
