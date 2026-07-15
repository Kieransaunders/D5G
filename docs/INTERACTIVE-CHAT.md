# Interactive chat — run, use, troubleshoot

Practical guide to the Agent-SDK chat in the Divi 5 Generator app. For the design rationale and full architecture, see [`interactive-chat-architecture.md`](./interactive-chat-architecture.md).

## What it is

A multi-turn chat (in the left panel) backed by the **Claude Agent SDK**, replacing the old one-shot `claude -p` call. It can ask you clarifying questions, take a colour/slider/form input, show an HTML mockup you iterate on, then hand off to the real generator. Auth is your `claude login` subscription — **no `ANTHROPIC_API_KEY` needed**.

## Run it

```bash
cd app
npm install        # pulls @anthropic-ai/claude-agent-sdk + zod (first time / after a pull)
npm run dev        # http://localhost:3747
```

Verify the SDK + auth + skills load before relying on the UI:

```bash
node agent-smoke.js
```

To fall back to the old one-shot chat, set `USE_AGENT_CHAT = false` near the bottom of `public/app.js`.

## The flow

1. **Describe the page.** Optionally paste a URL to base it on, or attach a logo/screenshot (📎).
2. **Answer the questions.** Single-pick = click an option. Multi-pick = toggle several, then **Done**. Or type a free-text answer. Colours/sliders/forms render as widgets.
3. **Stage 1 — mockup.** A draft HTML page appears in the canvas. Ask for changes ("darker hero", "swap the sections") — it updates in place. Cheap to iterate; nothing heavy has run yet.
4. **Stage 2 — build.** When you approve, a one-click **Generate** card appears → runs the real page generator → preview + import, matching the approved mockup.
5. **Save the brand** (optional). Ask to save it and it lands in the Brand tab, reusable.

## Tools the agent has

`pick_colour`, `pick_number`, `collect_fields` (custom inputs) · `show_mockup` (Stage 1) · `propose_page` (Stage 2 handoff) · `extract_brand` (URL → tokens) · `save_brand` (→ Brand tab) · plus the standard SDK tools (`Read` for vision on uploads, `WebFetch`) and the loaded `divi5generate` skills.

## Endpoints

`POST /agent/chat` (SSE stream; events: `session`, `ask_question`, `ask_input`, `mockup`, `gen_intent`, `brand_saved`, `tool_use`, `status`, `turn_done`; data: `{chunk}` / `{done}`) · `POST /agent/answer` (`{id,value}`) · `POST /agent/upload` (multipart `file`).

## Troubleshooting

**"network error" after answering / during a long step.**
First, the usual cause: the app isn't running the new code. Confirm `npm install` ran and you restarted (`npm run dev`).
If it still happens: the stream was dropping during Claude's silent "thinking" gaps — fixed with a 15s keep-alive ping (`/agent/chat`) plus a client "still working… (Ns)" indicator. If you're on an older build, pull these.
If it *persists* after that, it's a real server error — **read the terminal running `npm run dev`**; the SDK runner prints the stack trace. Common ones: SDK not installed, or an auth prompt (run `claude login`).

**Chat talks but no preview appears.** The agent should call `show_mockup` (Stage 1) then `propose_page` (Stage 2). If it only describes the page in prose, the `AGENT_GUIDE` steer in `server.js` isn't reaching it — check it's prepended to the first turn, and that the `divi-inputs` MCP tools registered (smoke test).

**A custom tool (colour/mockup/etc.) never fires.** Tool-name/shape detail against your installed SDK version. Tools are namespaced `mcp__divi-inputs__*`; if the SDK on your machine differs, check `tool()` / `createSdkMcpServer()` / `mcpServers` in its docs and adjust `lib/claude-agent.js`. The chat still runs without them (graceful degrade).

**Old generation showing on a new session.** *Clear conversation* now blanks the canvas. A full page **refresh** still auto-loads your latest generation by design (`loadLatestIntoCanvas()`).

**Uploads.** Saved to `outputs/_chat/uploads`; the path is passed to the agent, which opens it with `Read`. Images are read with vision; Divi exports are read as JSON via the `divi5-extract-style` skill.

## Known limits

Single-operator/local use (subscription auth, in-memory sessions, idle-closed after 15 min). Live token streaming is per-turn, not per-token. Sessions don't survive a server restart — the V2 Session API (`unstable_v2_*`) is the upgrade path. The SDK tool shapes are version-dependent and unverified from the build environment — pin the SDK version.
