# Contributing to Aero Chat CLI

Thank you for your interest in contributing to `aero-chat-cli`!

## Development Setup

1. **Clone & Navigate**:
   ```bash
   cd cli
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   pnpm approve-builds --all
   ```

3. **Development Build**:
   ```bash
   # Run bundler in watch mode
   pnpm dev

   # Or compile distribution once
   pnpm build
   ```

4. **Running Tests**:
   ```bash
   # Run Vitest test suites
   pnpm test

   # Run test coverage audit
   pnpm test -- --coverage

   # Static type check
   pnpm typecheck
   ```

## Development Standards

- **Strict TypeScript**: No implicit `any` without documented architectural justification.
- **Evidence-First**: Any new endpoint or WebSocket event must be verified in `../research/docs/` before implementation.
- **Error Exit Codes**: Ensure errors map to standard exit codes (0: success, 1: generic, 2: usage, 3: auth, 4: network).
