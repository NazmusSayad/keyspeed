# Keyspeed

Keyspeed is a privacy-first desktop typing analytics app made of two executables that share a single SQLite database:

- `typing-runner`: lightweight global keyboard metadata collector written in Rust
- `typing-ui`: Tauri dashboard for visualizing sessions, trends, and productivity signals

The runner never stores actual typed text, key values, passwords, or clipboard data. It only writes metadata such as timestamps, press/release events, inter-key timing, hold durations, and session boundaries.

## Architecture

- `src-tauri/src/bin/typing-runner.rs` starts the background process
- `src-tauri/src/runner.rs` captures keyboard events with `rdev`, batches writes, and maintains heartbeats
- `src-tauri/src/db.rs` owns the shared `sqlx` SQLite layer, schema bootstrap, aggregates, and analytics queries
- `src-tauri/src/lib.rs` exposes Tauri commands to the React frontend
- `src/features/home-page/home-page.tsx` renders the analytics dashboard and settings UI

## Database

The SQLite schema lives in `src-tauri/schema.sql` and includes:

- `events` for raw metadata-only key events
- `sessions` for idle-split typing sessions
- `minute_stats` for compact chart-ready aggregates
- `daily_stats` for long-term summaries
- `settings` for shared app configuration
- `runner_state` for heartbeats, flush status, and error reporting

## Development

Install dependencies:

```bash
make install
```

Start the desktop app in development:

```bash
make dev
```

Validate TypeScript and lint fixes:

```bash
make ts-check
```

Validate Rust code:

```bash
make cargo-check
```

Run Rust tests:

```bash
make cargo-test
```

## Packaging

`typing-runner` is bundled into the installer through `bundle.externalBin` in `src-tauri/tauri.conf.json`.

Build the default installer/bundle:

```bash
make build
```

Windows-only bundle build:

```bash
make build-win-win
```

## Startup Behavior

- On launch, the UI attempts to ensure the runner is available and started.
- The settings screen can enable or disable login autostart for the runner.
- Windows uses the current user `Run` registry entry.
- macOS writes a LaunchAgent plist.

## macOS Permission Note

Global keyboard monitoring on macOS requires Accessibility permission. The dashboard surfaces this requirement and points users to the correct system setting.
