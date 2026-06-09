# GitNotes

GitNotes is a local-first macOS notes app for plain-file vaults. It edits
Markdown (`.md`) and Typst (`.typ`) files, previews notes side by side, indexes
vault content with SQLite FTS5, and syncs to any Git remote through the system
`git` CLI.

Website: https://antonbc.github.io/gitnotes/

## Features

- Plain Markdown and Typst files in a user-selected vault
- Live Markdown and Typst preview
- CodeMirror editor with optional Vim mode
- Local full-text search
- Git pull, commit, push, and conflict-resolution workflows
- Trash and search indexes stored outside the vault
- Standalone Svelte download site in `site/`

## Stack

- Tauri v2
- Svelte 5, SvelteKit, TypeScript, and Vite
- CodeMirror 6
- Rust commands for file IO, Typst, Git, search, trash, and Finder reveal
- Static Svelte site deployed with GitHub Pages

## Prerequisites

- Node.js 22
- npm
- Rust stable
- macOS for Tauri app builds and release signing
- Git installed and available on `PATH`

For local Git-backed vault testing on macOS, install the command line tools if
needed:

```sh
xcode-select --install
```

## Install

```sh
npm install
```

Use `npm ci` in CI and release jobs.

## App Development

Run the desktop app in Tauri development mode:

```sh
npm run tauri dev
```

Run the SvelteKit frontend by itself:

```sh
npm run dev
```

`npm run tauri dev` leaves the dev server in normal interactive mode. `npm run
tauri build` sets `CI=true` only for the build subcommand so Tauri's DMG script
skips Finder automation that can fail in headless or local automation sessions.

## Download Site

The public download site is a standalone Svelte app in `site/`. It is separate
from the Tauri/SvelteKit app shell so the marketing/download page can evolve
without coupling to desktop runtime APIs.

Run it locally:

```sh
npm run site:dev
```

Open:

```text
http://127.0.0.1:5174/
```

Build the static site:

```sh
npm run site:build
```

The generated output is written to `site/dist` and is intentionally ignored by
Git. GitHub Pages builds and deploys that directory from source via
`.github/workflows/pages.yml` on pushes to `main`.

## Verification

Run these before opening a PR or cutting a release:

```sh
npm run verify
```

`npm run verify` runs Svelte checks, Vitest, the app build, the static download
site build, Rust tests, and Rust compile checks.

Build the signed app release locally only when signing credentials are available:

```sh
npm run tauri build
```

Release artifacts are written to:

- `src-tauri/target/release/bundle/macos/GitNotes.app`
- `src-tauri/target/release/bundle/dmg/GitNotes_0.1.0_aarch64.dmg`

## Releases

The download button targets the latest GitHub Release asset:

```text
https://github.com/antonbc/gitnotes/releases/latest/download/GitNotes-aarch64.dmg
```

Tagging a release with `v*` runs `.github/workflows/release.yml`, builds the
signed macOS DMG, and uploads it to the GitHub Release with the stable
`GitNotes-aarch64.dmg` filename.

## Vault Rules

- Notes are plain files in the vault.
- Supported note extensions are `.md` and `.typ`.
- `quick/` is for quick capture.
- `.archive/` is reserved and excluded from the default tree and search.
- `.git/` is always ignored by the watcher.
- Trash lives outside the vault in `~/Library/Application Support/GitNotes/trash`.
- Search index lives outside the vault in
  `~/Library/Application Support/GitNotes/index.sqlite`.

## Signing

The release workflow builds on macOS and fails early if Developer ID and
notarytool secrets are missing. Required secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## Repository Hygiene

- Commit source files, tests, workflow definitions, and static site assets.
- Do not commit generated build output such as `build/`, `.svelte-kit/`,
  `site/dist/`, `src-tauri/target/`, or platform-specific Tauri generated files.
- Keep release artifacts in GitHub Releases, not in the repository.
- Keep secrets in environment variables or GitHub Actions secrets.

## License

MIT. Typst bundled font asset notices are included in `NOTICE`.
