# Making the app's chat interactive

**Date:** 24/06/2026
**Problem:** `/chat` and `/generate` spawn `claude -p --dangerously-skip-permissions --plugin-dir <dir> "<prompt>"` then immediately `proc.stdin.end()`. Print mode is **one-shot and non-interactive**. The instant a skill asks a clarifying question (AskUserQuestion or a prose question), there is no stdin to answer it, so the process stalls and the 2–3 min hang-guard kills it. Your own code comment already names it: *"asked a clarifying question it couldn't deliver in -p mode."*

The fix is not a longer timeout. It's switching from a one-shot process to a **persistent, two-way session** so the user can answer mid-run.

---

## The three options you floated, evaluated

| Option | Verdict | Why |
|---|---|---|
| **1. Drive Claude Desktop to run the skill, then update the app** | ✗ Avoid | No clean programmatic API. You'd be GUI-automating Desktop (computer-use / AppleScript), which is brittle, needs Desktop always open and logged in, and can't reliably stream structured output back to your app. Dead end for a product. |
| **2. Embed a real terminal inside the app** | ✓ Pragmatic fallback | `node-pty` + `xterm.js` gives Claude a real TTY. AskUserQuestion's native UI renders, the user types answers — true interactivity, zero reverse-engineered protocol. Downside: it's a raw terminal pane (ANSI), harder to parse your `GEN_INTENT` markers or render nice confirm-cards. Fastest route to "it just works". |
| **3. Do what Desktop does to run Claude Code in an app** | ✓✓ Recommended | Desktop/Cowork is built on the **Claude Agent SDK**. This is the supported, documented path. Questions and permission prompts arrive as **structured events** you can render as your own UI cards (matching the existing `gen_intent` confirm-card pattern) and answer by pushing a message back into the live session. |

**Recommendation: Option 3 (Agent SDK) as the target architecture; Option 2 (PTY) if you want it working this week and can live with a terminal-style pane.**

---

## Recommended: Claude Agent SDK

Package: `@anthropic-ai/claude-agent-sdk` (the renamed Claude Code SDK — same engine Desktop runs).

Three things it gives you that `-p` cannot:

1. **Streaming input** — `query({ prompt })` accepts an `AsyncIterable` of user messages, so the session stays open for multi-turn. You push the user's answer into the generator and Claude continues the *same* run.
2. **`canUseTool` callback** — fires before each tool use; you return `{behavior:'allow'}` / `{behavior:'deny'}`. This is your hook to surface a permission prompt to the browser and feed the decision back. (Note: it still fires under `bypassPermissions` — the callback is the last line of control, so you can keep auto-approving the safe stuff and only ask on the risky stuff.)
3. **`includePartialMessages`** — live token streaming to the browser, plus `tool_use` events so the UI can show *"running design-review…"* instead of dead air. That removes the root cause of your blunt hang-guard: silence during long work.

AskUserQuestion arrives as a `tool_use` block in the assistant message. You detect it, render the choices in the UI, and yield the user's pick back as the next `SDKUserMessage`.

### The one architectural change you must make

A single HTTP request can't hold a multi-turn conversation where the user answers a question in a *later* request. So you need a **session manager**: keep each live `query()` session in memory keyed by a chat-session id, with its SSE stream attached and a way to push new user messages into its input generator.

```js
// app/lib/claude-session.js  (sketch)
const { query } = require('@anthropic-ai/claude-agent-sdk');
const sessions = new Map(); // sessionId -> { push, abort }

function startSession(sessionId, firstPrompt, { onText, onQuestion, onToolUse, onDone }) {
  let resolveNext;
  const queue = [];
  // async generator that stays open; we feed it user replies over time
  async function* input() {
    yield userMsg(firstPrompt);
    while (true) {
      const next = queue.length ? queue.shift()
        : await new Promise(r => (resolveNext = r));
      if (next === null) return;          // null = end session
      yield userMsg(next);
    }
  }
  const push = (text) => { resolveNext ? resolveNext(text) : queue.push(text); resolveNext = null; };

  const run = query({
    prompt: input(),
    options: {
      cwd: OUTPUT_PATH,
      includePartialMessages: true,
      permissionMode: 'default',          // route unknown tools to canUseTool
      settingSources: ['project', 'user'], // loads your plugin/skills config
      additionalDirectories: [PLUGIN_DIR],
      canUseTool: async (tool, inputArgs) => {
        if (SAFE_TOOLS.has(tool)) return { behavior: 'allow' };
        const ok = await onQuestion({ kind: 'permission', tool, inputArgs });
        return ok ? { behavior: 'allow' } : { behavior: 'deny', message: 'User declined' };
      },
    },
  });

  (async () => {
    for await (const msg of run) {
      if (msg.type === 'stream_event' && msg.event?.delta?.text) onText(msg.event.delta.text);
      else if (msg.type === 'assistant') {
        for (const block of msg.message.content) {
          if (block.type === 'tool_use' && block.name === 'AskUserQuestion') onQuestion({ kind: 'ask', block });
          else if (block.type === 'tool_use') onToolUse(block.name);
        }
      } else if (msg.type === 'result') onDone(msg);
    }
  })();

  sessions.set(sessionId, { push, abort: () => push(null) });
}

const userMsg = (text) => ({ type: 'user', message: { content: [{ type: 'text', text }] } });
module.exports = { startSession, sessions };
```

Express wiring (replaces the current `spawn` in `/chat`):

- `POST /chat/:sessionId/message` → if no session, `startSession(...)`; else `sessions.get(id).push(text)`. The handlers (`onText`, `onQuestion`, `onToolUse`) write to the existing SSE channel.
- `onQuestion({kind:'ask', block})` → emit an `event: ask_question` over SSE; the frontend renders the choice card (same shape as your `gen_intent` card) and POSTs the answer back to `/chat/:sessionId/message`, which `push()`es it into the live generator.
- Kill the hang-guard, or relax it massively — you now get `tool_use` heartbeats, so "no output for 2 min" no longer means "stuck".

That's the whole shift: **one persistent session per chat, structured events out, user replies in.**

---

## There's an almost-exact reference implementation

Anthropic's official `claude-agent-sdk-demos` repo (MIT, ~2.3k★) contains three demos that together *are* your app's missing pieces. Don't build the round-trip from scratch — lift it.

### `ask-user-question-previews` — your problem, solved, in your domain

It's a **branding assistant** (same shape as Divi5Generate) that walks the user through clarifying questions one at a time over WebSocket, rendering each option as a **live HTML preview card** — colour swatches, type specimens, sample UI — that the user clicks, or types a free-text answer. That is precisely "answer Claude's questions in the app," and the visual-card angle is a gift for a *page* generator: your option cards could show actual section/colour/layout mockups.

The mechanism, lifted from its README:

```ts
// server-side query options
query({
  prompt,
  options: {
    permissionMode: "plan",                 // puts Claude in ask-first mode
    tools: ["AskUserQuestion"],             // forces it to ask, not act
    toolConfig: { askUserQuestion: { previewFormat: "html" } }, // adds opt.preview HTML
    canUseTool: async (tool, input) => {
      if (tool !== "AskUserQuestion") return { behavior: "allow" };
      const answers = await askBrowserAndWait(input.questions); // ← your SSE/WS round-trip
      return { behavior: "allow", updatedInput: { questions: input.questions, answers } };
    },
  },
});
```

The round-trip is exactly the pattern I sketched: `canUseTool` fires → server forwards the question to the browser → **stores a promise resolver in a `Map`** → user clicks a card → browser sends the label back → server resolves the promise → `canUseTool` returns `updatedInput.answers` → SDK continues the same run. That `Map<requestId, resolve>` *is* your session manager for the question case.

Two findings that sharpen the earlier advice:

- **`permissionMode: "plan"` is the trick to make Claude ask before acting.** Your skills "hanging" partly reflects Claude trying to *do* the work silently; plan mode flips it into requirements-gathering so questions surface early as structured events.
- **`previewFormat: "html"`** means you get a sanitised HTML fragment per option (SDK strips `<script>`/`<style>`; they still run it through DOMPurify). Render with `dangerouslySetInnerHTML`.

### `simple-chatapp` — the structural skeleton

React + **Express** + WebSocket + streaming, full conversation loop. Your backend is already Express, so this is the closest starting frame. Its *Production Considerations* section confirms the three things you'll need to add for a real product, and validates my session point:

> "**Transcript syncing** — for Agent Sessions to be persisted across server restarts, you'll need to persist and restore the SDK's conversation transcripts. The SDK maintains internal state for multi-turn conversations that must be synced with your storage."

So: in-memory live session works for a single run; for durability across restarts you persist the transcript and resume. Also flagged: isolate the SDK in its own service/container (it has Bash + filesystem), and add auth.

### `hello-world-v2` — the cleaner session API (worth adopting)

There's now a **V2 Session API** that replaces the keep-an-async-generator-alive dance with explicit calls:

```ts
await using session = unstable_v2_createSession({ model: "sonnet" });
await session.send("Generate a pricing page for …");
for await (const msg of session.stream()) { /* stream out; handle AskUserQuestion */ }
await session.send(userAnswer);            // multi-turn: just send again
// later / after restart:
await using s = unstable_v2_resumeSession(sessionId, { model: "sonnet" });
```

`send()` / `stream()` / `resumeSession()` map far more naturally onto stateless HTTP handlers than the single `query()` generator — `send()` on each `POST /message`, `stream()` feeding your SSE. **Caveat: it's `unstable_v2_*`** — the API may change, so pin the SDK version and keep the call sites thin. If you want stability today, use `query()` streaming-input (the generator sketch earlier); if you want the ergonomics, use V2 and accept the churn risk.

**Net:** clone the repo, run `ask-user-question-previews` and `simple-chatapp` locally, then port the `canUseTool` round-trip + plan mode into your Express server, keeping your SSE transport (or switch to WS to match the demos). You're adapting working code, not inventing a protocol.

Repo: `github.com/anthropics/claude-agent-sdk-demos` — note the banner: *demos are local-dev only, not for production at scale* (hence the isolate-the-SDK / auth / persistence work).

---

## Fallback: embedded PTY terminal (Option 2)

If you want interactivity working fast and don't need structured cards yet:

- Server: `node-pty` spawns `claude --plugin-dir <dir>` (interactive, **not** `-p`) inside a pseudo-terminal. Pipe pty output → WebSocket; WebSocket input → pty.
- Browser: `xterm.js` renders it. The user sees Claude's questions and types answers directly. AskUserQuestion's arrow-key menu works because there's a real TTY.

~50 lines each side. The cost is you lose clean programmatic parsing of `GEN_INTENT` and you're showing a terminal, not your styled chat. Good as a stopgap or a "power user" pane; the SDK is the better destination.

---

## What I'd avoid

- **Don't just raise the timeout.** The process is waiting on input that will never come; more time changes nothing.
- **Don't keep `--dangerously-skip-permissions` as the whole strategy.** With the SDK, prefer `permissionMode: 'default'` + a `canUseTool` allowlist so risky tools surface to the user and everything else auto-approves. Same convenience, far less foot-gun.
- **Don't go down the stream-json child-process route** (`-p --input-format stream-json --output-format stream-json`) unless you specifically want the smallest diff and accept risk. It works, but the control/permission wire protocol is currently **undocumented and reverse-engineered** — fragile to build a product on. The SDK wraps the same machinery with a supported API.

---

## Built: interactive chat v1 (24/06/2026)

A working first cut is in the repo, **additive** — the old `claude -p` `/chat` is untouched and still there as a fallback.

**New / changed files**

- `app/lib/claude-agent.js` — Agent SDK wrapper. `runAgentChat()` runs `query()`, auto-allows tools except `AskUserQuestion`, which it round-trips to the browser (promise parked in a module-level `Map`, resolved by a separate request). Exports `answerQuestion`, `abortRun`.
- `app/server.js` — two additive routes: `POST /agent/chat` (SSE: `data:{chunk}/{done}` + `event: ask_question` + `event: tool_use`/`status`) and `POST /agent/answer` (`{id,label}` → resolves the parked question). Existing `/chat` left as-is.
- `app/public/app.js` — `sendChatAgent()` (interactive send), `appendQuestionCard()` (option buttons + free-text), `postAnswer()`. Send button now routes through `USE_AGENT_CHAT` (set `false` to fall back).
- `app/agent-smoke.js` — standalone verifier (SDK + auth + skill loading) you run before trusting the app.
- `app/package.json` — adds `@anthropic-ai/claude-agent-sdk`.

**Run it (on your Mac — not the sandbox; `better-sqlite3` is a native build)**

```bash
cd app
npm install                 # pulls the SDK
node agent-smoke.js         # 1) verify SDK + subscription auth + skill visibility
npm run dev                 # 2) start the app, open the chat, ask something that needs a clarifying question
```

**Auth:** none to configure. The SDK spawns the `claude` CLI and uses your `claude login` (subscription) session — the same auth the old spawn already used. No `ANTHROPIC_API_KEY`.

**The one thing to verify first (`agent-smoke.js`):** whether your `divi5generate` plugin skills load inside an SDK session via `settingSources: ['user','project']`. The CLI used `--plugin-dir`; the SDK has no identical flag, so this is the unverified bit. If the smoke test shows the skill is **not** visible, options in order of preference: (a) check the SDK version's plugin/`agents` option and pass the plugin explicitly; (b) keep the CLI spawn for `/generate` and use the SDK only for interactive chat Q&A; (c) load the page-generator as an MCP server. Don't wire `/generate` over to the SDK until skills are confirmed loading.

**Deliberately deferred (v1 scope):** live token streaming (`includePartialMessages` — v1 streams per assistant turn, which is enough and avoids double-emitting text); `multiSelect` questions (single-pick only); HTML option previews (`previewFormat:'html'` — supported by the card renderer if you flip `enablePreviews`, off by default because Claude rendering HTML per option is slow); session persistence across server restarts (in-memory only — fine for single-operator local use). The V2 Session API (`unstable_v2_*`) is the upgrade path if/when you want resumable sessions.

---

## v2 (24/06/2026): two-stage interactive flow

Built on top of v1. The chat is now a multi-turn session with a deliberate two-stage flow, so you always get something **visual to react to** before any heavy Divi JSON is generated.

**The flow**

1. **Converse** — the agent gathers the brief, using `AskUserQuestion` (incl. multi-select) and custom input tools (`pick_colour`, `pick_number`, `collect_fields`).
2. **Stage 1 — HTML mockup** — agent calls `show_mockup(html)`; the canvas renders it via `srcdoc` (a draft, Import hidden). Cheap to regenerate, so you iterate across turns ("darker hero", "swap the sections") and it updates in place. This is the multi-turn session paying off.
3. **Approve → Stage 2 — real Divi 5 JSON** — agent calls `propose_page(brief)`, which emits a `gen_intent` event → your existing one-click Generate card → your existing `/generate` → preview + canvas + import. No new generation/preview code; it hands off to the proven path.

**How each piece is wired**

- `lib/claude-agent.js` — persistent session per chat (SDK streaming input). In-process SDK MCP server exposes `pick_colour` / `pick_number` / `collect_fields` / `show_mockup` / `propose_page`. `AskUserQuestion` is round-tripped via `canUseTool`; everything else auto-allows. Degrades gracefully if the SDK helpers or `zod` are missing (chat still runs, minus custom tools). 15-min idle close.
- `server.js` — `AGENT_GUIDE` (two-stage instructions) prepended to the first turn only; sessions run in a scratch `outputs/_chat` dir, not the repo root. `/agent/chat` (session-aware, emits `session`/`mockup`/`gen_intent`/`ask_*`/`tool_use`/`turn_done`) and `/agent/answer`.
- `public/app.js` — `sendChatAgent` tracks `chatSessionId` across turns; renders `mockup` (srcdoc), `gen_intent` (reuses `appendIntentCard`), multi-select question cards, and colour/slider/form input widgets. *Clear* now also blanks the canvas. `showInCanvas` clears `srcdoc` so a Stage-2 render replaces the draft.

**Known live issues from testing (24/06)**

- *"network error" in chat* — almost certainly environmental: confirm `cd app && npm install` (SDK + zod) ran and the server was restarted on the new code. The real error prints in the server terminal. The route fails fast if the SDK isn't installed.
- *Old generation showing on a new session* — fixed for *Clear*. Note a full page **refresh** still auto-loads your latest generation into the canvas by design (`loadLatestIntoCanvas()`); change that if you want refresh to start blank.

**Still unverified (can't run the SDK from the build sandbox):** the exact `tool()` / `createSdkMcpServer()` / `mcpServers` shapes and the streaming-input message shape are version-dependent. Pin the SDK version and run the smoke test before relying on it. If `show_mockup`/`propose_page` don't fire, check the tool-name prefix (`mcp__divi-inputs__*`) and the SDK's custom-tools docs.

---

## v2.1 (24/06/2026): inputs, brand autofill, brand-save, Stage 2 match

Four additions, all reusing existing app machinery:

- **Brief autofill from a URL** — `extract_brand(url)` tool calls the app's own `/brand/extract-url` parser (colours, fonts, logo, OG/meta) so the agent bases the mockup on a real site instead of you typing the brief. For a Divi **export**, upload it (below) and the agent reads it via the loaded `divi5-extract-style` skill.
- **Upload image/file into chat (vision)** — 📎 button → `POST /agent/upload` (saves to `outputs/_chat/uploads`) → the path rides the next message as an attachment; the agent opens it with `Read` (images via vision, exports/PDFs as files). Use for logos, screenshots of sites you like, brand PDFs.
- **Save agent-derived brand to the Brand tab** — `save_brand({name,colors,fonts,logo,voice,tagline})` tool writes a real Brand Profile via `createBrandProfile` and emits `brand_saved` → the chat confirms and refreshes the Brand grid. So a brand pulled from a URL/export/image becomes reusable.
- **Stage 2 matches the mockup** — `show_mockup` now also writes the HTML to `outputs/_chat/mockup-<session>.html`; `propose_page` passes that path through `gen_intent` → a hidden `mockupPath` field → `/generate`, which adds *"reproduce this approved mockup's layout/colours/copy in Divi 5"* to the generator prompt (the skill reads the file). So the built page tracks the draft you signed off, not just the text brief.

New tools on the in-process MCP server: `pick_colour`, `pick_number`, `collect_fields`, `show_mockup`, `propose_page`, `extract_brand`, `save_brand`. New endpoints: `POST /agent/upload`. New SSE events: `mockup`, `gen_intent`, `brand_saved`.

*Nice find:* the app's own progress rail already lists "Stage 2 — HTML Preview", so a visual-first flow matches how the pipeline was always meant to work.

---

## Migration checklist

1. `cd app && npm i @anthropic-ai/claude-agent-sdk`
2. Add `app/lib/claude-session.js` (session manager above).
3. Rewrite `/chat` to message-into-session instead of `spawn(... '-p' ...)`. Add `POST /chat/:sessionId/message` and an SSE `event: ask_question`.
4. Frontend: render `ask_question` as a card (reuse the `gen_intent` card component); POST the answer back to the same session.
5. Do the same for `/generate` (`runClaudeGeneration`) so generation can ask and report tool progress.
6. Replace the hang-guard with a tool-use heartbeat; only fail on a genuinely long idle (e.g. 10 min with no events at all).
7. Verify: kick off a generation that you *know* triggers a clarifying question, confirm the card appears, answer it, confirm the run completes.

## Open questions / uncertainties

- Exact SDK type names (`SDKUserMessage`, `stream_event` vs `partial_assistant`) shift between versions — pin the version and check `node_modules/@anthropic-ai/claude-agent-sdk` types after install.
- Whether `settingSources`/`additionalDirectories` loads your `--plugin-dir` plugin exactly as the CLI does needs a quick smoke test; if not, the SDK also accepts explicit `mcpServers`/`agents` config.
- Auth: the SDK uses the same logged-in Claude Code credentials / `ANTHROPIC_API_KEY` resolution as the CLI — confirm which your users will have.

**Docs:** platform.claude.com/docs/en/agent-sdk/typescript · /user-input · /permissions · /streaming-output · code.claude.com/docs/en/headless
