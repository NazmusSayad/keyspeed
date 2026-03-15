Build a cross-platform desktop application that tracks typing activity **without recording the actual characters typed**. The system must consist of **two executables** packaged together in **one installer**.

Goal: analyze typing behavior and productivity metrics while preserving strict user privacy.

---

SYSTEM OVERVIEW

The application has two separate programs:

1. Background Runner
   A lightweight process that runs continuously and collects keyboard activity.

2. Tauri UI Application
   A desktop dashboard that visualizes typing statistics and configuration.

Both programs share the same **SQLite database**.

---

ARCHITECTURE

Two-process architecture:

typing-runner (background process)

- collects keyboard metadata
- computes timing metrics
- writes data to SQLite

typing-ui (Tauri app)

- reads SQLite
- displays analytics dashboards
- provides settings and controls

The UI **does not collect keyboard events**. Only the runner does.

---

TECH STACK

Background Runner

- Language: Rust
- Keyboard capture: rdev crate (or platform APIs)
- Database: SQLite
- ORM / DB access: sqlx
- Must be extremely lightweight

UI Application

- Framework: Tauri
- Frontend: React / Svelte / Vue (any is acceptable)
- Backend: Rust commands
- Database access: sqlx

Do NOT use the Tauri SQL plugin.

---

PRIVACY REQUIREMENTS

The system must **never store actual typed characters**.

Forbidden data:

- typed text
- passwords
- clipboard data
- key values

Allowed metadata:

- timestamp
- key_down / key_up event
- interval between events
- key hold duration
- typing session start/end
- optional active application name

The system stores **behavioral typing data only**.

---

DATA COLLECTION

The background runner must capture global keyboard events.

For each event record:

- timestamp
- event_type (down/up)
- interval_since_previous_event_ms
- hold_duration_ms (when possible)
- session_id

The runner should also track typing sessions based on idle time.

Example rule:
if no key events for 5 seconds → session ends.

---

DATABASE

Use SQLite.

Example schema:

events

- id
- timestamp
- event_type
- interval_ms
- hold_duration_ms
- session_id

minute_stats

- minute_timestamp
- key_count
- active_seconds
- avg_interval_ms

Daily stats and aggregated data should be generated periodically so the database does not grow excessively.

---

ANALYTICS

Metrics to compute:

- total key presses
- keys per minute
- estimated typing speed
- typing bursts
- idle vs active typing time
- average key interval
- average key hold duration
- session lengths

All metrics must be derived from metadata only.

---

TAURI UI FEATURES

The UI dashboard should include:

- typing activity timeline
- keys per minute chart
- daily and weekly summaries
- typing session history
- productivity analytics
- configuration settings

The UI reads data from SQLite using Rust commands exposed to the frontend.

---

PACKAGING

The project must produce **two executables**:

typing-runner
typing-ui (Tauri app)

Both must be included in **one installer**.

Use Tauri bundling to include the runner binary using:

bundle.externalBin

Example installed structure:

Windows

Program Files / TypingApp

- typing-ui.exe
- typing-runner.exe

macOS

TypingApp.app
Contents/Resources/typing-runner

---

RUNNER STARTUP

The installer should configure the runner to start automatically on system login.

Possible approaches:

- Windows Startup entry
- macOS LaunchAgent

The runner must work independently of the UI.

---

PERFORMANCE REQUIREMENTS

The runner must:

- use minimal CPU
- use minimal memory
- run continuously for long periods
- avoid excessive database writes
- aggregate data where possible

---

PERMISSIONS

macOS requires Accessibility permission for keyboard monitoring.

The application must guide the user to enable this permission if necessary.

---

DELIVERABLES

The implementation must include:

- full project structure
- Rust background runner
- Tauri UI project
- SQLite schema
- sqlx database layer
- keyboard event collector
- installer configuration
- build instructions for Windows and macOS
