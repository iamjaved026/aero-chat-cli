# Aero CLI — Complete Command Reference Manual

> **Package:** `aero-chat-cli` | **Binaries:** `aero`, `aero-cli`, `aero-chat-cli`  
> Complete, production-grade command manual for the Aero messaging terminal client.

---

## Command Invocation Aliases

You can invoke the CLI using any of the following three equivalent commands:
- **`aero <cmd>`** — Short, fast, developer standard
- **`aero-cli <cmd>`** — Explicit package alias
- **`aero-chat-cli <cmd>`** — Full npm package binary

All three options map to the exact same CLI binary and execute identically.

---

## Auto-Auth & Seamless Session Renewal

Aero uses a dual-token architecture:
1. **Short-lived JWT Access Token:** Valid for 300 seconds (5 minutes) for low-latency API verification.
2. **Persistent HttpOnly Refresh Token:** Valid for 7 days (`604800` seconds).

### How Aero CLI Keeps You Logged In:
- When you log in with `aero setup` or `aero auth login`, the CLI securely extracts and caches the `refreshToken` and `csrf` cookies from the API Gateway.
- **Proactive Auto-Renewal:** Whenever you run a command (even hours or days later), the CLI automatically checks if the access token has expired and performs a single-flight token rotation behind the scenes before making requests.
- You do **not** need to manually re-login every few hours.

---

## Table of Contents

- [Global Flags & Options](#global-flags--options)
- [1. Quick Start & Setup](#1-quick-start--setup)
  - [`aero setup`](#aero-setup)
  - [`aero status`](#aero-status)
- [2. Authentication Commands (`aero auth`)](#2-authentication-commands-aero-auth)
  - [`aero auth login`](#aero-auth-login)
  - [`aero auth status`](#aero-auth-status)
  - [`aero auth whoami`](#aero-auth-whoami)
  - [`aero auth refresh`](#aero-auth-refresh)
  - [`aero auth logout`](#aero-auth-logout)
  - [`aero auth register`](#aero-auth-register)
- [3. Messaging Commands (`aero msg`)](#3-messaging-commands-aero-msg)
  - [`aero msg chats`](#aero-msg-chats)
  - [`aero msg send`](#aero-msg-send)
  - [`aero msg list`](#aero-msg-list)
  - [`aero msg edit`](#aero-msg-edit)
  - [`aero msg delete`](#aero-msg-delete)
  - [`aero msg react`](#aero-msg-react)
  - [`aero msg unreact`](#aero-msg-unreact)
  - [`aero msg media`](#aero-msg-media-messageid)
  - [`aero msg download`](#aero-msg-download-messageid-destination)
  - [`aero msg watch`](#aero-msg-watch)
- [4. Friends & Contacts (`aero friend`)](#4-friends--contacts-aero-friend)
  - [`aero friend list`](#aero-friend-list)
  - [`aero friend find`](#aero-friend-find)
  - [`aero friend add`](#aero-friend-add)
  - [`aero friend requests`](#aero-friend-requests)
  - [`aero friend accept`](#aero-friend-accept)
  - [`aero friend reject`](#aero-friend-reject)
  - [`aero friend remove`](#aero-friend-remove)
  - [`aero friend block`](#aero-friend-block)
  - [`aero friend unblock`](#aero-friend-unblock)
- [5. Community Dock Commands (`aero dock`)](#5-community-dock-commands-aero-dock)
  - [`aero dock list`](#aero-dock-list)
  - [`aero dock info`](#aero-dock-info)
- [6. Configuration Management (`aero config`)](#6-configuration-management-aero-config)
  - [`aero config where`](#aero-config-where)
  - [`aero config list`](#aero-config-list)
  - [`aero config get`](#aero-config-get)
  - [`aero config set`](#aero-config-set)
- [7. Shell Autocompletion (`aero completion`)](#7-shell-autocompletion-aero-completion)
- [8. Advanced Scripting & Automation Patterns](#8-advanced-scripting--automation-patterns)
- [9. Developer Credits & Open Source (`aero credits`)](#9-developer-credits--open-source-aero-credits)

---

## Global Flags & Options

These flags apply to **all** commands across the entire CLI:

| Flag | Short | Description | Example |
| :--- | :---: | :--- | :--- |
| `--debug` | `-D` | Prints verbose HTTP requests, response headers, status codes, and server error bodies. | `aero setup --debug` |
| `--json` | | Formats all output as pure, uncolored JSON or NDJSON (perfect for `jq`). | `aero dock list --json` |
| `--quiet` | `-q` | Suppresses spinners, welcome headers, and informational notices. | `aero msg send "Ping" --to ID -q` |
| `--yes` | `-y` | Skips interactive confirmation prompts (e.g. confirming message deletion). | `aero msg delete ID --yes` |
| `--config <path>` | | Uses a custom configuration JSON file instead of the default location. | `aero status --config ./custom.json` |
| `--version` | `-V` | Displays the installed CLI version. | `aero --version` |
| `--help` | `-h` | Prints help and available options for any command or subcommand. | `aero friend --help` |

---

## 1. Quick Start & Setup

### `aero setup`
Interactive setup wizard that configures your API endpoint, authenticates your account, stores your 7-day refresh token, handles policy compliance (Date of Birth), and verifies gateway connectivity.

```powershell
# Standard interactive setup
aero setup

# With verbose diagnostic logging
aero setup --debug
```

---

### `aero status`
Top-level quick alias for `aero auth status`. Displays active login user, session ID, gateway URL, JWT token expiry, and gateway connectivity. Automatically refreshes expired tokens if needed.

```powershell
# Pretty terminal output
aero status

# Machine-readable JSON
aero status --json
```

**Example Output:**
```
User:           @aryan22 (6a2eb56a834ba558882c0937)
Session ID:     6c26d97b557fa5daa52e3529c1f43286de3d1fdc252b02ae92329468cc1911e6
API Gateway:    https://api.aryankaushik.space
Token Expiry:   2026-10-18T06:19:35.000Z (287s remaining)
Connectivity:   OK
```

---

## 2. Authentication Commands (`aero auth`)

### `aero auth login`
Authenticates a user session against the Aero API gateway. Automatically captures both the short-lived JWT access token and the 7-day refresh cookie.

```powershell
# 1. Interactive prompt
aero auth login

# 2. Command-line flags
aero auth login -u myusername -p "mypassword"

# 3. Environment variables
$env:AERO_USERNAME="myusername"; $env:AERO_PASSWORD="mypassword"
aero auth login

# 4. JSON input from stdin (for CI / secrets managers)
'{"identifier":"myusername","password":"mypassword"}' | aero auth login --stdin

# 5. Debugging authentication errors
aero auth login -u myusername -p "mypassword" --debug
```

#### Options
| Option | Short | Description |
| :--- | :---: | :--- |
| `--username <str>` | `-u` | Username or email address |
| `--password <str>` | `-p` | Account password |
| `--stdin` | | Read credentials from standard input (JSON or newline-separated) |

---

### `aero auth status`
Displays the full session status, decoded JWT claims, and tests gateway heartbeat connectivity (`GET /api/time`).

```powershell
aero auth status
aero auth status --json
```

---

### `aero auth whoami`
Fetches and displays the complete user profile from the server (`GET /api/users/:id`). Proactively refreshes expired tokens.

```powershell
# Standard view
aero auth whoami

# JSON view
aero auth whoami --json
```

**Example Output:**
```
Username:   @aryan22
Full Name:  aryan22
Email:      jocayo3709@afterdo.com
Plan:       free
Joined:     2026-06-14T14:06:34.494Z
```

---

### `aero auth refresh`
Forces an immediate refresh of the current JWT access token using the cached 7-day `refreshToken` cookie (`POST /api/auth/refresh`). Rotates the refresh cookie seamlessly.

```powershell
aero auth refresh
```

---

### `aero auth logout`
Terminates the active session on the gateway (`POST /api/auth/logout`), closes active WebSocket connections, and removes stored session tokens from local config.

```powershell
aero auth logout
```

---

### `aero auth register`
*Protected Guard Endpoint.* Self-registration from the CLI is intentionally blocked (`UnsupportedError`) because the web signup endpoint is unexercised in verified captures. Direct users to the web application.

```powershell
aero auth register
# Output: UnsupportedError: New Account Registration is not supported by Aero CLI.
```

---

## 3. Messaging Commands (`aero msg`)

### `aero msg chats`
Lists all active 1-on-1 direct conversations, friend user IDs, and unread counts.

```powershell
# View recent chats
aero msg chats

# Output as JSON
aero msg chats --json
```

**Example Output:**
```
ID                        USER    NAME       UNREAD
------------------------  ------  ---------  ------
grace                     @grace  G.R.A.C.E  0     
69a53442891d34f83ab2ad70  @javed  Javed      0     
```

---

### `aero msg send [text] [target]`
Sends a message or file attachment (image, audio, document, video) to a direct recipient (DM) or a community dock channel.  
Supports passing either a 24-character User ID or a username!

> **💡 PowerShell Tip:** In PowerShell, `@username` (unquoted) is reserved for variable splatting. You can pass usernames directly without `@` (e.g. `javed`), or wrap them in quotes (e.g. `"@javed"`).

```powershell
# 1. Positional target with username (simplest & fastest!)
aero msg send "Hey Javed, are you free?" javed

# 2. Send an image attachment with a caption
aero msg send "Check out this screenshot!" javed --file ./screenshot.png

# 3. Send a document or audio file without caption text
aero msg send "" javed --file ./report.pdf

# 4. Flag with username
aero msg send "Hey Javed, are you free?" --to javed

# 5. Quoted with @ in PowerShell
aero msg send "Hey Javed, are you free?" --to "@javed"

# 6. Using 24-character User ID
aero msg send "Hey, check this out!" --to 69a53442891d34f83ab2ad70

# 7. Reply directly to an existing message in a DM
aero msg send "I agree with this" javed --reply 6ad200748523dba7df8975de

# 8. Post a message into a Community Dock channel
aero msg send "Hello everyone in Aero Official!" --to 69a4145f194fafb2e18ec3a2 --dock --channel-id 69b30ebc2175c797208d538c

# 9. Silent JSON output for automation
aero msg send "Deployment successful" javed --json
```

#### Options
| Option | Short | Description |
| :--- | :---: | :--- |
| `[target]` | | Optional positional recipient: username, `"@username"`, or User ID |
| `--to [id]` | `-t` | Optional flag recipient: username, `"@username"`, or User ID |
| `--file <path>` | `-f` | Path to a local file (image, audio, document, video) to attach and upload |
| `--dock` | `-d` | Send to a dock instead of direct conversation |
| `--channel-id <id>` | `-c` | Specific channel ID inside the dock |
| `--reply <messageId>` | `-r` | Target message ID to reply to |

---

### `aero msg list <target> [count]`
Fetches recent conversation history with rich author display, timestamps, attachments, pinned indicators, and reaction counters.  
Supports passing username (e.g. `javed` or `"@javed"`) or User ID!

```powershell
# 1. View previous messages with a friend by username
aero msg list javed

# 2. View last 5 messages with a friend
aero msg list javed 5

# 3. View using User ID
aero msg list 69a53442891d34f83ab2ad70

# 4. List latest 10 messages from a Community Dock
aero msg list 69a4145f194fafb2e18ec3a2 --dock --limit 10

# 5. List messages from a specific channel within a dock
aero msg list 69a4145f194fafb2e18ec3a2 --dock --channel-id 69b30ebc2175c797208d538c

# 6. Fetch older messages before a specific timestamp
aero msg list javed --before 2026-10-18T06:00:00.000Z

# 7. Output raw JSON for parsing
aero msg list javed 5 --json
```


---

### `aero msg edit <messageId> <newText>`
Edits a message previously sent by your user.

```powershell
# Edit a direct message
aero msg edit 6ad200748523dba7df8975de "Updated message content here"

# Edit a message inside a community dock
aero msg edit 6ad200748523dba7df8975de "Updated announcement" --dock --dock-id 69a4145f194fafb2e18ec3a2
```

---

### `aero msg delete <messageId>`
Permanently deletes a message. Requires confirmation unless `--yes` or `-y` is provided.

```powershell
# Delete with interactive confirmation
aero msg delete 6ad200748523dba7df8975de

# Delete without prompt (force)
aero msg delete 6ad200748523dba7df8975de --yes

# Delete a dock message
aero msg delete 6ad200748523dba7df8975de --dock --dock-id 69a4145f194fafb2e18ec3a2 --yes
```

---

### `aero msg react <messageId> <emoji>`
Adds or toggles an emoji reaction on any visible message.

```powershell
# React to a DM message with a heart
aero msg react 6ad200748523dba7df8975de "❤️"

# React to a dock message with a thumbs up
aero msg react 6ad200748523dba7df8975de "👍" --dock --dock-id 69a4145f194fafb2e18ec3a2
```

---

### `aero msg unreact <messageId> <emoji>`
Removes an existing emoji reaction from a message.

```powershell
# Remove reaction from a DM
aero msg unreact 6ad200748523dba7df8975de "❤️"

# Remove reaction from a dock message
aero msg unreact 6ad200748523dba7df8975de "🔥" --dock --dock-id 69a4145f194fafb2e18ec3a2
```

---

### `aero msg media <messageId>`
Fetches the temporary, presigned AWS S3 download URL for an attachment in a message (valid for 1 hour / 3600 seconds).

```powershell
# 1. Fetch presigned S3 URL for a message image
aero msg media 6ad469aa49a6cc27616d3d34

# 2. Fetch presigned S3 URL for a document or video attachment
aero msg media 6ad469aa49a6cc27616d3d34 --field document

# 3. Include all available resolution variants (Thumb, SD, HD)
aero msg media 6ad469aa49a6cc27616d3d34 --variants

# 4. Output as JSON for scripting
aero msg media 6ad469aa49a6cc27616d3d34 --json
```

**Example Output:**
```
✔ Attachment Media URL [Message ID: 6ad469aa49a6cc27616d3d34]:
  URL:         https://aero-media-prod.s3.ap-south-1.amazonaws.com/chats/1155ba7d-771d...
  Expires In:  3600s

  Variants:
    HD:    https://aero-media-prod.s3.ap-south-1.amazonaws.com/.../hd.webp?...
    SD:    https://aero-media-prod.s3.ap-south-1.amazonaws.com/.../sd.webp?...
    Thumb: https://aero-media-prod.s3.ap-south-1.amazonaws.com/.../thumb.webp?...

  Tip: Download directly to disk with: aero msg download 6ad469aa49a6cc27616d3d34
```

---

### `aero msg download <messageId> [destination]`
Directly downloads a received image, document, audio clip, or video attachment to local storage. Automatically preserves the original sender's file name when available.

```powershell
# 1. Download attachment to current directory (uses original sender filename)
aero msg download 6ad469aa49a6cc27616d3d34

# 2. Download with custom target file path
aero msg download 6ad469aa49a6cc27616d3d34 ./downloads/photo.jpg

# 3. Download to a specific directory folder
aero msg download 6ad469aa49a6cc27616d3d34 C:\Users\jvdhu\Downloads
```

**Example Output:**
```
√ Downloaded attachment [2912ac734febcfff3e9edcca627bed5d.jpg] (46 KB)
ℹ Saved to: D:\Lab\projects\aero-cli\cli\2912ac734febcfff3e9edcca627bed5d.jpg
```

---

### `aero msg watch`
Opens a real-time WebSocket connection to the Aero gateway (Socket.IO v4) and streams live incoming events (`newMessage`, `messageUpdated`, `messageReaction`, `user:online`, `typing:start`).

```powershell
# 1. Watch all incoming personal real-time events
aero msg watch

# 2. Join and monitor a specific conversation or dock room
aero msg watch --conversation 69a4145f194fafb2e18ec3a2

# 3. Stream real-time events as raw NDJSON (one JSON object per line)
aero msg watch --json
```

---

## 4. Friends & Contacts (`aero friend`)

The `aero friend` (or `aero friends`) suite manages friends, users, and friend requests.

### `aero friend list`
Lists all confirmed friends with their **User IDs**, usernames, names, and online status.

```powershell
# Standard table view
aero friend list

# Output as JSON
aero friend list --json
```

**Example Output:**
```
ID                        USERNAME  NAME   STATUS 
------------------------  --------  -----  -------
69a53442891d34f83ab2ad70  @javed    Javed  offline
```

---

### `aero friend find <query>`
Searches for users across the platform by username or display name. Displays their **User ID** so you can add them as a friend or message them.

```powershell
# Search for users matching "javed"
aero friend find javed

# Alias: aero friend search
aero friend search aryan
```

**Example Output:**
```
ID                        USERNAME                  NAME                     BIO                                
------------------------  ------------------------  -----------------------  -----------------------------------
69a53442891d34f83ab2ad70  @javed                    Javed                    Just a guy who loves creating co...
6a0abce490eb90f0893aec54  @javed07                  javed                    none                      
69d66c1c783e9f06696a2ba8  @javed_shaikh             javed_shaikh             none                      

Quick Actions:
  • Add as friend:   aero friend add javed (or use User ID: 69a53442891d34f83ab2ad70)
  • Send a message:  aero msg send "Hello!" --to 69a53442891d34f83ab2ad70
```

---

### `aero friend add <usernameOrId>`
Sends a friend request to a user. Accepts either their **username** (e.g. `@javed`) or their **24-character User ID**.

```powershell
# Add by username
aero friend add javed
aero friend add @javed

# Add by User ID
aero friend add 69a53442891d34f83ab2ad70
```

---

### `aero friend requests`
Lists all pending incoming friend requests and sent outgoing friend requests.

```powershell
aero friend requests
aero friend requests --json
```

**Example Output:**
```
Incoming Friend Requests:
  • Request ID: 6ad37e8b44fb5104473a8647 from @javed (Javed)
    Accept: aero friend accept 6ad37e8b44fb5104473a8647
    Reject: aero friend reject 6ad37e8b44fb5104473a8647
```

---

### `aero friend accept <requestId>`
Accepts an incoming friend request by Request ID.

```powershell
aero friend accept 6ad37e8b44fb5104473a8647
```

---

### `aero friend reject <requestId>`
Rejects an incoming friend request by Request ID.

```powershell
aero friend reject 6ad37e8b44fb5104473a8647
```

---

### `aero friend remove <friendId>`
Removes a user from your friends list.

```powershell
# Remove with prompt
aero friend remove 69a53442891d34f83ab2ad70

# Remove without prompt
aero friend remove 69a53442891d34f83ab2ad70 --yes
```

---

### `aero friend block <userId>` / `aero friend unblock <userId>`
Blocks or unblocks a contact across direct messaging.

```powershell
# Block user
aero friend block 69a53442891d34f83ab2ad70

# Unblock user
aero friend unblock 69a53442891d34f83ab2ad70
```

---

## 5. Community Dock Commands (`aero dock`)

### `aero dock list`
Lists all community docks and servers where your user is a member.

```powershell
# Pretty table format
aero dock list

# Structured JSON format
aero dock list --json
```

**Example Output:**
```
ID                        NAME           ROLE    UNREAD
------------------------  -------------  ------  ------
69a4145f194fafb2e18ec3a2  Aero Official  member  0     
```

---

### `aero dock info <dockId>`
Fetches detailed metadata, description, member permissions, and channel lists for a dock.

```powershell
# Detailed terminal view
aero dock info 69a4145f194fafb2e18ec3a2

# Raw JSON
aero dock info 69a4145f194fafb2e18ec3a2 --json
```

---

## 6. Configuration Management (`aero config`)

The Aero configuration file manages endpoints, active profiles, and output preferences.

### `aero config where`
Prints the exact absolute filesystem path of your active configuration file.

```powershell
aero config where
# Windows: C:\Users\<Username>\AppData\Roaming\aero\config.json
```

---

### `aero config list`
Displays all current configuration values, active profile, and preferences.

```powershell
aero config list
```

---

### `aero config get <key>`
Retrieves a single configuration property by dot-notation key.

```powershell
# Get active API URL
aero config get apiUrl

# Get output preference
aero config get preferences.output
```

---

### `aero config set <key> <value>`
Updates a configuration setting.

```powershell
# Change API gateway URL
aero config set apiUrl https://api.aryankaushik.space

# Change default output mode to json
aero config set output json
```

---

## 7. Shell Autocompletion (`aero completion`)

Generates shell completion scripts for tab-completion of commands, subcommands, and flags.

### Bash
```bash
# Add to ~/.bashrc:
source <(aero completion bash)
```

### Zsh
```zsh
# Add to ~/.zshrc:
source <(aero completion zsh)
```

### Fish
```fish
# Add to ~/.config/fish/config.fish:
aero completion fish | source
```

---

## 8. Advanced Scripting & Automation Patterns

### 1. Send Direct Message Using Username
```powershell
aero msg send "Automated test notification" --to @javed
```

### 2. Stream Real-Time Messages to JSON
```powershell
aero msg watch --json
```

### 3. Check Session Health and Auto-Refresh
```powershell
aero status
```

---

## 9. Developer Credits & Open Source (`aero credits`)

Displays full developer credits, current maintainer details, official project repository, and open-source license information.

### `aero credits`
Alias: `aero credit`

```powershell
# Standard terminal view
aero credits

# Output as JSON for scripting
aero credits --json
```

**Developer & Maintainer Details:**
- **Developer & Maintainer**: Javed Hussain
- **GitHub Profile**: [@iamjaved026](https://github.com/iamjaved026)
- **Portfolio Websites**: [https://javedhussain.com](https://javedhussain.com) • [https://iamjaved.site](https://iamjaved.site)
- **Official Repository**: [https://github.com/iamjaved026/aero-chat-cli](https://github.com/iamjaved026/aero-chat-cli)
- **NPM Package**: [`aero-chat-cli`](https://www.npmjs.com/package/aero-chat-cli)
- **License**: MIT Open Source License (Free for private, personal, bot, and self-hosted deployments)

