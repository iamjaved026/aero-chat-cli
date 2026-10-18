# Changelog

All notable changes to `aero-chat-cli` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-17

### Added
- **Interactive Setup Wizard**: `aero setup` walks through gateway URL configuration, user authentication, and DOB compliance verification.
- **Session & Auth Management**:
  - `aero auth login` with interactive password mask, flags (`--username`, `--password`), or `--stdin`.
  - `aero auth logout` with server session termination and local credential purging.
  - `aero auth refresh` for explicit token renewal.
  - `aero auth status` showing active user, session ID, seconds remaining, and `/api/time` connectivity check.
  - `aero auth whoami` inspecting server profile details.
- **Messaging Engine**:
  - `aero msg send` supporting direct messages and dock community channels (`--dock`).
  - `aero msg list` fetching paginated history.
  - `aero msg edit` and `aero msg delete` with confirmation prompts (skippable via `--yes`).
  - `aero msg react` and `aero msg unreact` for bidirectional emoji reactions.
  - `aero msg watch` for real-time WebSocket event streaming with `--json` NDJSON support.
- **Community Docks**:
  - `aero dock list` viewing joined communities with unread counts.
  - `aero dock info` inspecting metadata and public channel rosters.
- **Configuration Engine**:
  - Multi-profile configuration store with resolution hierarchy.
  - `aero config where`, `aero config list`, `aero config get`, and `aero config set`.
- **Core Reliability**:
  - Single-flight token refresh mutex preventing 401 stampedes.
  - Engine.IO v4 / Socket.IO v4 WebSocket reconnect with exponential backoff.
  - Standardized exit codes (0: success, 1: generic, 2: usage, 3: auth, 4: network).
  - Shell completion scripts for bash, zsh, and fish (`aero completion`).
