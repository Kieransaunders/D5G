# Interactive chat — follow-up / backlog

Parked items and decisions, so we can revisit without re-deriving context. Companion to [`interactive-chat-architecture.md`](./interactive-chat-architecture.md) (design) and [`INTERACTIVE-CHAT.md`](./INTERACTIVE-CHAT.md) (run/use/troubleshoot).

_Last updated: 24/06/2026._

## Shipped (working)

- Multi-turn interactive chat on the Claude Agent SDK (`/agent/chat`, `lib/claude-agent.js`), subscription auth (no API key).
- Two-stage flow: conversation → **Stage 1 HTML mockup** in the canvas (iterate) → approve → Stage 2.
- Custom tools: `pick_colour`, `pick_number`, `collect_fields`, `show_mockup`, `propose_page`, `extract_brand`, `save_brand`.
- Multi-select questions, colour/slider/form widgets.
- Uploads into chat (📎 → `/agent/upload`, agent reads via vision); brief autofill from URL/export; save brand to Brand tab.
- Keep-alive ping on the stream + branded **iConnectIT spinning logo** working indicator (`/iconnectit.png`, falls back to accent ring).
- Enter sends (Shift+Enter newline). Clear blanks the canvas.

## Parked — to revisit

### 1. Stage 2 should run IN the chat, agent-built  ✅ BUILT (24/06, pending on-Mac smoke test)
**Status:** implemented end-to-end. `propose_page` → `gen_intent` → tab-switch is replaced by two in-chat tools, `start_build` + `deliver_page` (`lib/claude-agent.js`); the legacy `/generate` registration logic was extracted into a shared `lib/generation-registrar.js` (`registerGenerationFromDir`) used by both paths. Frontend handles new SSE events `building` + `page_built` (renders the real preview in-canvas via `showInCanvas` + drops file/import cards via `appendGenerationCards`); `tool_use` labels cover `start_build`/`deliver_page`. The `claude -p` form path stays as a manual fallback. **All four files pass `node --check`; the live SDK round-trip still needs verifying on the Mac** (`better-sqlite3` is native + needs `claude login`) — run `agent-smoke.js` then a real approve→build→deliver in chat. The old `gen_intent`/`propose_page` frontend handler is kept only as a harmless legacy fallback.

**Target:** generation lives in the chat screen. When a mockup is approved, the **agent builds the Divi 5 JSON in-session** from the approved mockup (it already has the `divi5-page-generator` skill loaded), streaming progress with the spinner and dropping the preview into the canvas. No tab switch, no legacy `claude -p`, no hang.

**Current (problem) behaviour:** `propose_page` → `gen_intent` → `appendIntentCard` → **switches to the Generate tab** and submits the old form-based `/generate`, which runs the one-shot `claude -p` pipeline — the very thing that hangs. Symptom seen 24/06: user approved a mockup, got dumped on the structured-brief form with "Generating…" stuck for minutes.

**Decision (user, 24/06):** "Agent builds it in chat." Move Stage 2 off `/generate` onto the agent engine.

**Implementation sketch when we pick it up:**
- Replace the `propose_page` handoff: instead of emitting `gen_intent` (which fills + submits the form), have the agent run the page generator itself and write the page JSON to a per-session output dir; detect the file, register a generation row, render the preview into the canvas (reuse `showInCanvas` / `appendGenerationCards`), keep the user in chat.
- Keep the approved-mockup-match steer (already wired into the `/generate` prompt; port the same instruction into the in-chat generation).
- Retire or hide the tab-switch path for chat-originated builds. Leave the manual Generate form as-is for direct use.
- Watch: the page-generator skill can be slow — rely on `tool_use`/spinner heartbeats (already in place) rather than a blunt hang-guard.

### 2. Resume-based session model  ✅ BUILT (24/06)
Switch multi-turn from the held-open `query()` + streaming-input generator to the email-agent pattern: each turn is a fresh `query({ prompt, options: { resume: sdkSessionId } })`, capturing `session_id` from the `system/init` message. **Net simplification** (deletes the generator/waiters/`onTurnEnd`), less version-sensitive, and enables restart-persistence. One file (`lib/claude-agent.js`); endpoints + frontend unchanged. ~60–90 lines, low risk (old `/chat` fallback intact). Verify: `resume` coexists with the in-process MCP tools (smoke test).

### 3. Subscribe / reconnect decoupling  (optional, robustness)
From the email-agent: a session has *subscribers*; a dropped connection doesn't kill the run — the client reconnects and keeps watching. Would need a `GET /agent/stream/:sessionId` subscribe endpoint + client reconnect. Best resilience; biggest change. Do only if dropped-stream loss is still a problem after keep-alive + resume.

### 4. "Hand over to Claude Design" path  (open question)
The app **already has a `design-sync` / Claude Design path, but it's not wired into the chat agent**, so when the user said "hand over to Claude Design" the agent had no such action and interpreted it as "build" — triggering generation instead. If you actually want to push the design to claude.ai/design, that's a **separate wire-up**: expose the `design-sync` flow as a distinct chat action (its own tool), kept separate from the build/`propose_page` flow, so "hand to Claude Design" and "build the Divi page" are two different, explicit intents.

Relevant existing skills: `design-sync` (brand ↔ Claude Design Design System) and `claude-design-to-divi` (Claude Design hand-off bundle → importable Divi page). The chat agent should be able to call into these.

**Open:** confirm this is actually wanted before building.

### 5. Session persistence across restarts  ✅ BUILT (24/06)
`sdk_session_id TEXT` column added to `generations` via migration. Set in `start_build` when a generation row is created. Survives server restarts.

### 6. Re-run reopens the chat session (not the form)  ✅ BUILT (24/06)
**Depends on #2 + #5.** Today Re-run (`rerunGeneration` → `POST /rerun/:id`) refetches the saved *brief* fields, repopulates the structured form, drops in revision notes, and auto-submits a stateless `claude -p` run — no mockup, no prior turns, no context. The user just sees the old brief form, divorced from the conversation that produced the page.

**Target:** Re-run reads the generation's stored `sdkSessionId`, opens the **chat** tab, and resumes that session (`query({ resume: sdkSessionId })`) so the user iterates conversationally with full context — the mockup, the earlier turns, the brand — instead of re-deriving it.

**Dependency chain:** #1 (generation runs *in* the chat session, so a generation belongs to a conversation) → #2 (sessions resumable + `sdkSessionId` captured) → #5 (id persisted on the generation row) → this. Without #2/#5 there is no session id to reconnect to.

**Implementation sketch when we pick it up:**
- `/rerun/:id` returns the generation's `sdkSessionId` (added by #5) alongside the brief.
- Frontend Re-run: if a `sdkSessionId` exists, open the chat tab and start a turn with `sessionId` set to it (resume) instead of filling + submitting the form.
- Fallback: form-originated generations (no session id) keep today's form-based Re-run.
- Seed the resumed turn with a short "the user wants to revise this page" nudge so the agent re-engages on the existing page rather than starting fresh.

## Verification still pending

- Confirm the **keep-alive + spinner** actually cleared the "network error" in a real run (the immediate fix from 24/06). If it still errors, it's a server-side exception — capture the stack trace from the `npm run dev` terminal.
- A combined smoke test for the new tools (`extract_brand` → `show_mockup` → `propose_page` round-trip) to verify the MCP tool shapes against the installed SDK version.
