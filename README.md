<div align="center">

# ⚡ Aero Chat CLI (`aero-chat-cli`)

### *The Lightweight, Self-Hostable Terminal Client for the Aero Messaging Platform*

[![NPM Version](https://img.shields.io/npm/v/aero-chat-cli.svg?style=for-the-badge&color=0284c7&logo=npm)](https://www.npmjs.com/package/aero-chat-cli)
[![NPM Downloads](https://img.shields.io/npm/dt/aero-chat-cli.svg?style=for-the-badge&color=22c55e&logo=npm)](https://www.npmjs.com/package/aero-chat-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg?style=for-the-badge)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-iamjaved026%2Faero--chat--cli-181717?style=for-the-badge&logo=github)](https://github.com/iamjaved026/aero-chat-cli)
[![Maintainer](https://img.shields.io/badge/Maintainer-Javed%20Hussain-6366f1?style=for-the-badge&logo=github)](https://github.com/iamjaved026)
[![Web Spec](https://img.shields.io/badge/API_Spec-Aero_Web_v1.5.0-ec4899?style=for-the-badge)](https://github.com/iamjaved026/aero-chat-cli)

<p align="center">
  <strong>Engineered & Maintained by <a href="https://javedhussain.com">Javed Hussain</a> (<a href="https://github.com/iamjaved026">@iamjaved026</a>)</strong><br>
  <em>Portfolios: <a href="https://javedhussain.com">javedhussain.com</a> • <a href="https://iamjaved.site">iamjaved.site</a></em>
</p>

---

[⚡ Quickstart](#-quickstart-wizard) • [📦 Installation](#-installation) • [✨ Feature Showcase](#-feature-showcase) • [📖 Full Command Manual](./COMMANDS.md) • [🤖 Scripting & Bots](#-automation--scripting-recipes) • [💖 Credits](#-open-source-credits--attribution)

</div>

---

## 🌟 Overview & Architecture

**Aero** is an real-time messaging ecosystem featuring mobile, desktop, and web applications originally built by **Aryan Kaushik**. While the official GUI apps deliver a polished visual chat experience, developers, system administrators, and automation enthusiasts often need a headless, keyboard-driven interface.

**Aero CLI (`aero-chat-cli`)** was created, engineered, and is actively maintained by **[Javed Hussain](https://javedhussain.com)** ([@iamjaved026](https://github.com/iamjaved026)) to bridge this gap. It provides a full-fledged terminal client that communicates directly with the Aero API gateway and Socket.IO v4 realtime infrastructure without needing Electron, Chromium, or a web browser.

> [!NOTE]
> **API Version & Upstream Compatibility:**  
> This CLI build is engineered and verified against the **Aero / Intridium Web v1.5.0** API specification. If upstream gateway endpoints or websocket payloads change in future Aero releases, certain features may evolve. Maintainer **Javed Hussain** and the community actively monitor and update the codebase. If you discover an API discrepancy or bug, please [open an issue](https://github.com/iamjaved026/aero-chat-cli/issues) or submit a Pull Request!

---

## 🚀 Key Highlights

- ⚡ **Lightning Fast & Ultra Lightweight**: Sub-100ms startup time, tiny package footprint, and minimal dependencies.
- 🔄 **Proactive Single-Flight JWT Auto-Renewal**: Aero access tokens expire every 5 minutes. The built-in mutex interceptor proactively refreshes tokens using the 7-day refresh cookie before expiry, ensuring zero session dropouts in long-running terminal sessions or daemon watchers.
- 👥 **Full Friends & Social Suite**: Search users, send friend requests, list friends with User IDs, view pending invites, and accept/reject requests.
- 📎 **Multimedia Pipeline (Upload & Download)**: Send photos, audio recordings, documents, and videos directly via `--file`. Fetch 1-hour presigned AWS S3 URLs or download attachments to disk with a single command.
- ⚡ **Realtime Streaming**: Stream live incoming messages, reactions, edits, presence status, and typing indicators via Socket.IO v4.
- 🏰 **Community Docks**: Explore community servers, inspect channel trees, and publish announcements to dock channels.
- 🤖 **Unix Pipe & Bot Ready**: Every command supports `--json` and NDJSON streaming for seamless piping into `jq`, Python, curl, and automated CI/CD webhooks.
- 🆓 **100% Free & Open-Source (MIT)**: Free for personal use, self-hosting on your private servers, commercial deployments, or building custom automation bots.

---

## 📦 Installation

Install globally through any modern package manager, or run on-demand using `npx`:

### 1. Global Installation (Recommended)
```bash
# Using npm
npm install -g aero-chat-cli

# Using pnpm
pnpm add -g aero-chat-cli

# Using yarn
yarn global add aero-chat-cli
```

### 2. Run Instantly with `npx`
```bash
# Launch interactive setup without installation
npx aero-chat-cli setup

# Run any command directly
npx aero-chat-cli status
```

### 3. Build & Install from Source (GitHub Clone)
If you prefer to audit the source code, contribute, or build locally on your system:
```bash
# 1. Clone the repository from GitHub
git clone https://github.com/iamjaved026/aero-chat-cli.git
cd aero-chat-cli

# 2. Install dependencies
pnpm install    # or: npm install

# 3. Compile TypeScript into production bundles
npm run build

# 4. Link globally so commands are available across your entire system
npm link

# 5. Run test suites to verify integrity
npm test
```

### 4. Binary Aliases
Once installed globally via NPM or linked from source, you can invoke the CLI with any of these three interchangeable aliases:
```bash
aero --version
aero-cli --version
aero-chat-cli --version
```

> [!TIP]
> **WSL (Windows Subsystem for Linux) Users:**  
> If you are running WSL without a native Linux Node.js installed and encounter `exec: node: not found` when invoking global Windows npm packages, simply symlink Windows Node into Linux:  
> `sudo ln -s "/mnt/c/Program Files/nodejs/node.exe" /usr/local/bin/node`  
> or install native Linux Node via `sudo apt install -y nodejs`.

---

## ⚡ Quickstart Wizard

Set up your gateway connection and authenticate your account in seconds:

```bash
aero setup
```

The interactive wizard guides you through:
1. **API Gateway URL** (defaults to the official cloud gateway `https://api.aryankaushik.space`, or enter your custom self-hosted gateway URL).
2. **Account Credentials** (Username or Email, and Password).
3. **Automated Compliance Verification** (Date of Birth compliance gate handled automatically if required by the server).
4. **Secure Token Storage** (Saves session credentials safely to your operating system's config vault: `%APPDATA%\aero\config.json` on Windows or `~/.config/aero/config.json` on Linux/macOS).

### Check Connection Health
```bash
aero status
```
**Example output:**
```text
User:           @javed (69a53442891d34f83ab2ad70)
Session ID:     6c26d97b557fa5daa52e3529c1f43286de3d1fdc252b02ae92329468cc1911e6
API Gateway:    https://api.aryankaushik.space
Token Expiry:   2026-10-18T14:45:00.000Z (280s remaining)
Connectivity:   OK
```

---

## ✨ Feature Showcase

### 1. Friends & Contact Management (`aero friend`)
Search the platform, manage contacts, and discover user IDs for messaging:

```bash
# List all your confirmed friends and their unique User IDs
aero friend list

# Find users by username or display name
aero friend find javed

# Send a friend request
aero friend add javed

# View pending incoming friend requests
aero friend requests

# Accept or reject a friend request
aero friend accept <requestId>
aero friend reject <requestId>

# Remove or block a contact
aero friend remove javed
aero friend block javed
```

---

### 2. Direct Messaging (`aero msg`)
Send messages, reply to threads, edit messages, and add emoji reactions:

```bash
# Send a direct message to a friend (by username or User ID)
aero msg send "Hey Javed, are you free to test the new release?" javed

# Reply directly to an existing message ID
aero msg send "I agree with this!" javed --reply 6ad200748523dba7df8975de

# View recent conversation history (last 20 messages)
aero msg list javed 20

# Edit a message you previously sent
aero msg edit 6ad200748523dba7df8975de "Updated message content here"

# Add an emoji reaction to any message
aero msg react 6ad200748523dba7df8975de "🔥"

# Remove an emoji reaction
aero msg unreact 6ad200748523dba7df8975de "🔥"

# Permanently delete a message
aero msg delete 6ad200748523dba7df8975de --yes
```

> [!TIP]
> **PowerShell Splatting Tip:** In Windows PowerShell, unquoted `@username` is reserved for splatting. You can safely pass usernames without `@` (e.g. `javed`) or wrap them in quotes (e.g. `"@javed"`).

---

### 3. Attachments & Multimedia (Sending & Downloading)

Aero CLI supports sending and receiving multimedia attachments with full AWS S3 integration.

#### Sending Attachments
Attach photos, voice clips, audio files, or documents using `-f, --file <path>`:
```bash
# Send an image with a text caption
aero msg send "Check out our new release mockup!" javed --file ./design.png

# Send an audio file or document without a text caption
aero msg send "" javed --file ./voice_note.mp3
aero msg send "" javed --file ./specification.pdf
```
*Supported formats: PNG, JPG, JPEG, WEBP, GIF, MP3, WAV, M4A, OGG, AAC, PDF, DOC, DOCX, ZIP, MP4, WEBM.*

#### Downloading Received Attachments
When viewing messages with `aero msg list`, attachments show up with their filename and size. You can inspect the temporary S3 URL or download the file directly to your drive:

```bash
# 1. Download attachment directly to your current folder (preserves original filename)
aero msg download 6ad469aa49a6cc27616d3d34

# 2. Download with custom target file path
aero msg download 6ad469aa49a6cc27616d3d34 ./downloads/photo.jpg

# 3. Download directly into a target folder
aero msg download 6ad469aa49a6cc27616d3d34 C:\Users\jvdhu\Downloads

# 4. Inspect the 1-hour presigned AWS S3 download URL (with resolution variants)
aero msg media 6ad469aa49a6cc27616d3d34 --variants
```

---

### 4. Realtime Streaming (`aero msg watch`)
Stream real-time incoming events (`newMessage`, `messageUpdated`, `messageReaction`, `user:online`, `typing:start`) through an active Socket.IO v4 connection:

```bash
# Stream formatted events live in your terminal
aero msg watch

# Join and monitor a specific conversation or dock room
aero msg watch --conversation 69a53442891d34f83ab2ad70

# Stream as raw NDJSON (New-line Delimited JSON) for piping
aero msg watch --json
```

---

### 5. Community Docks & Channels (`aero dock`)
Explore community servers, categories, and channels:

```bash
# List all your joined community docks
aero dock list

# Inspect channels and metadata for a specific dock
aero dock info <dockId>

# Read messages from a dock channel
aero msg list <dockId> --dock --channel-id <channelId>

# Post a message into a dock channel
aero msg send "Hello Aero Community!" --to <dockId> --dock --channel-id <channelId>
```

---

## 🤖 Automation & Scripting Recipes

`aero` is built from the ground up for command-line scripters, sysadmins, and bots. Every command respects `--json` output.

### Realtime Message Processing with `jq`
Filter and extract live incoming message text:
```bash
aero msg watch --json | jq -r 'select(.event=="newMessage") | "[\(.data.senderId)]: \(.data.text)"'
```

### CI/CD Deployment Notifications
Trigger a notification from your GitHub Actions or GitLab CI pipeline:
```bash
aero msg send "🚀 Build #$BUILD_ID completed successfully!" javed
```

### Automated Backup / Log Sender
Send server logs or backup files directly to your Aero account:
```bash
aero msg send "Nightly Database Backup" javed --file /var/backups/db-latest.tar.gz
```

---

## 📖 Complete Documentation & Commands

Looking for every single command, option, exit code, and configuration parameter?  
Check out the [**Comprehensive Command Reference Manual (COMMANDS.md)**](./COMMANDS.md).

| Category | Commands |
| :--- | :--- |
| **Setup & Health** | `aero setup`, `aero status`, `aero auth status`, `aero auth whoami`, `aero auth logout` |
| **Messaging** | `aero msg chats`, `aero msg send`, `aero msg list`, `aero msg edit`, `aero msg delete`, `aero msg react`, `aero msg unreact` |
| **Media & Files** | `aero msg media`, `aero msg download`, `aero msg send --file <path>` |
| **Realtime** | `aero msg watch`, `aero msg watch --json`, `aero msg watch --conversation <id>` |
| **Friends** | `aero friend list`, `aero friend find`, `aero friend add`, `aero friend requests`, `aero friend accept`, `aero friend reject`, `aero friend remove`, `aero friend block` |
| **Docks** | `aero dock list`, `aero dock info` |
| **Configuration** | `aero config where`, `aero config list`, `aero config get`, `aero config set` |
| **Shell Tools** | `aero completion bash`, `aero completion zsh`, `aero completion fish` |
| **Credits** | `aero credits`, `aero credit` |

---

## 🤝 Contributing & Bug Reports

We welcome contributions, feature requests, bug reports, and pull requests!

1. **Fork the Repository**: [https://github.com/iamjaved026/aero-chat-cli](https://github.com/iamjaved026/aero-chat-cli)
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/aero-chat-cli.git
   cd aero-chat-cli/cli
   ```
3. **Install dependencies & build**:
   ```bash
   npm install
   npm run build
   ```
4. **Run test suite**:
   ```bash
   npm test
   npm run typecheck
   ```
5. **Create a feature branch & open a Pull Request**:
   Push your changes and open a PR on the `main` branch.

---

## 💖 Open Source Credits & Attribution

### Developer & Maintainer
- **Developer**: **[Javed Hussain](https://javedhussain.com)**
- **GitHub**: [@iamjaved026](https://github.com/iamjaved026)
- **Portfolio & Personal Site**: [https://javedhussain.com](https://javedhussain.com)
- **Alternate Portfolio**: [https://iamjaved.site](https://iamjaved.site)
- **Project Repository**: [https://github.com/iamjaved026/aero-chat-cli](https://github.com/iamjaved026/aero-chat-cli)
- **Package on NPM**: [`aero-chat-cli`](https://www.npmjs.com/package/aero-chat-cli)

### Upstream Platform Credits
- The **Aero** messaging platform, web client (Intridium), desktop, and mobile applications were originally designed and developed by **Aryan Kaushik**. This CLI tool is a community-driven, standalone open-source client designed for developer automation and terminal workflows.

---

## 📄 License

This project is licensed under the **MIT License** — free for personal, commercial, and self-hosted use.  
See the [LICENSE](LICENSE) file for complete details.
