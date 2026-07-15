# Interactive chat — follow-up / backlog

Parked items and decisions, so we can revisit without re-deriving context. Companion to [`interactive-chat-architecture.md`](./interactive-chat-architecture.md) (design) and [`INTERACTIVE-CHAT.md`](./INTERACTIVE-CHAT.md) (run/use/troubleshoot).

_Last updated: 03/07/2026._

## Shipped (working)

- Multi-turn interactive chat on the Claude Agent SDK (`/agent/chat`, `lib/claude-agent.js`), subscription auth (no API key).
- Two-stage flow: conversation → **Stage 1 HTML mockup** in the canvas (iterate) → approve → Stage 2.
- Custom tools: `pick_colour`, `pick_number`, `collect_fields`, `show_mockup`, `extract_brand`, `save_brand`, `start_build`, `deliver_page`.
- Multi-select questions, colour/slider/form widgets.
- Uploads into chat (📎 → `/agent/upload`, agent reads via vision); brief autofill from URL/export; save brand to Brand tab.
- Keep-alive ping on the stream + branded **iConnectIT spinning logo** working indicator (`/iconnectit.png`, falls back to accent ring).
- Enter sends (Shift+Enter newline). Clear blanks the canvas.
- **Stage 2 in-chat build** (`start_build` + `deliver_page`): agent builds Divi 5 JSON in-session, streams progress, drops preview into canvas. No tab switch, no `claude -p`.
- **Resume-based session model**: each turn is a fresh `query({ resume: sdkSessionId })`. Simpler, restart-safe.
- **SDK session persistence**: `sdk_session_id` column on `generations`; set at `start_build` time.
- **Re-run opens chat**: if a generation was built in-chat, Re-run resumes the conversation (full context, mockup, prior turns) instead of re-submitting the old brief form. Form-based generations fall back to the old behaviour.
- **Chat session persistence — resume + transcript restore** (25/06): every `/agent/chat` turn auto-saves to `chat_sessions`/`chat_messages` keyed by the durable `sdk_session_id`. Survives app restart and the 15-min idle close. **Recent chats** menu + **+ New chat** in the footer; most-recent chat auto-restores on load (transcript replayed, mockup/preview back in canvas, conversation reconnected via `resumeSdkSession`). Endpoints: `GET /agent/sessions`, `GET /agent/sessions/:sdkId`, `DELETE /agent/sessions/:sdkId`. Tests: `tests/chat-sessions.test.js`.
- **Import fix — generated page, not the base clone** (25/06): `classifyKind` now tags `*-base-page.json` (cloned ET layout) as `base`, not `page`; `/import` prefers the landing-page and self-heals already-registered generations. Was causing the ET template's stock content to go live instead of the generated page.
- **DiviTheatre preset sync** (03/07): the page-generator allowlist now loads the generated `preset-manifest.json` from the real DiviTheatre registry, `validate.js` warns on unknown `data-theatre` names, and the `divitheatre-section` docs/examples now match the actual 15 presets instead of dead placeholder names. This removed silently dead attributes and stopped rejecting legitimate effect presets.

## Pending — needs on-Mac smoke test

### 1. Stage 2 end-to-end on the Mac
All code passes `node --check` and unit tests pass. Needs a real `claude login` run to verify:
- `agent-smoke.js` — confirms SDK + MCP tools connect.
- A real chat flow: mockup → approve → `start_build` → `deliver_page` → preview in canvas.
- A Re-run on a chat-originated generation → should open the chat tab and resume the session.

### 2. Keep-alive / network-error cleared
Confirm the 15s ping actually cleared the "network error" symptom from 24/06. If it still drops, capture the stack from `npm run dev` terminal.

### 2b. Session persistence smoke test (25/06)
Code passes `node --check`; pure-logic checks pass. Native `better-sqlite3` can't load in the cross-arch sandbox, so verify on the Mac:
- `node --test app/tests/chat-sessions.test.js` (DB layer).
- Real flow: have a chat → restart the app → most-recent chat repopulates the panel, canvas restores, next message continues with context.
- Re-import the existing "Clowns Are Us" generation → should now push the landing-page, not the ET About template.

## Parked — optional / open questions

### 3. Subscribe / reconnect decoupling  (optional, robustness)
A session has *subscribers*; a dropped connection doesn't kill the run — the client reconnects and keeps watching. Would need a `GET /agent/stream/:sessionId` subscribe endpoint + client reconnect. Do only if dropped-stream loss is still a problem after keep-alive + resume.

### 4. "Hand over to Claude Design" path  (open question)
The `design-sync` / Claude Design path is not wired into the chat agent. If "hand over to Claude Design" should be a distinct action (not generation), wire it as its own tool. Confirm this is wanted before building.

Relevant skills: `design-sync` (brand ↔ Claude Design Design System) and `claude-design-to-divi` (Claude Design hand-off bundle → importable Divi page).

## Next steps

App work is parked for now. The active focus is the generator itself:

1. Regenerate and resync `skills/divi5-page-generator/scripts/preset-manifest.json` whenever the DiviTheatre registry changes.
2. Add a small manifest-drift check to CI so the builder allowlist and docs fail fast when the registry changes upstream.
3. Tighten generator docs/tests around the real preset catalog before adding any new app-side polish.
4. Use [docs/generator-runbook.md](/Volumes/External/Divi5Generate/docs/generator-runbook.md) as the quick checklist for future generator runs.
