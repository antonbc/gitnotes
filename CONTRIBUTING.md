# Contributing to GitNotes

Thanks for helping improve GitNotes. This project is a local-first macOS notes
app built with Tauri, Svelte, TypeScript, and Rust.

## Development Setup

```sh
npm install
npm run tauri dev
```

Use Node.js 22, npm, Rust stable, and macOS when working on Tauri builds.

## Before Opening a Pull Request

Run the full verification suite:

```sh
npm run verify
```

For small frontend-only changes, at minimum run:

```sh
npm run check
npm test
npm run build
```

## Pull Request Guidelines

- Keep changes focused and explain the user-facing impact.
- Add or update tests when changing parsing, formatting, file IO, Git behavior,
  search, preview rendering, or public site data.
- Do not commit generated output such as `build/`, `.svelte-kit/`,
  `site/dist/`, or `src-tauri/target/`.
- Keep notes and vault fixtures free of secrets or personal data.

## Reporting Bugs

Please include:

- macOS version
- GitNotes version or commit SHA
- Whether the vault is Git-backed
- Steps to reproduce
- Expected and actual behavior
- Any relevant diagnostics or screenshots
