// agent-smoke.js — verify the Agent SDK works with your setup BEFORE wiring the
// app. Run from the app dir:  node agent-smoke.js
//
// Checks, in order:
//   1. SDK imports and a session starts (auth: your `claude login` subscription).
//   2. AskUserQuestion round-trips (we auto-answer option 0 so it won't hang).
//   3. Whether this repo's divi5generate skills are visible in-session.
//
// No ANTHROPIC_API_KEY needed if you're logged in via `claude login`.

const path = require('node:path');
const PLUGIN_DIR = path.resolve(__dirname, '..'); // repo root = the plugin

(async () => {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  const prompt =
    'Two things. (1) Call AskUserQuestion once with a single question ' +
    '"Pick a colour" offering options Red, Blue, Green. (2) After I answer, ' +
    'tell me plainly whether you have a skill called "divi5-page-generator" ' +
    'available to you right now, yes or no.';

  let sawInit = false, sawQuestion = false, answered = false;
  const pendingResolvers = [];

  for await (const msg of query({
    prompt,
    options: {
      model: 'sonnet',
      cwd: PLUGIN_DIR,
      permissionMode: 'default',
      settingSources: ['user', 'project'],
      canUseTool: async (toolName, input) => {
        if (toolName !== 'AskUserQuestion') return { behavior: 'allow', updatedInput: input };
        sawQuestion = true;
        const questions = (input && input.questions) || [];
        const answers = {};
        for (const q of questions) {
          const first = (q.options && q.options[0] && q.options[0].label) || 'Red';
          answers[q.question] = first;
          console.log(`  ↳ auto-answering "${q.question}" → ${first}`);
        }
        answered = true;
        return { behavior: 'allow', updatedInput: { questions, answers } };
      },
    },
  })) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      sawInit = true;
      console.log('[init] session started. cwd:', PLUGIN_DIR);
      // Some SDK versions list loaded tools/skills on the init message:
      if (msg.tools) console.log('[init] tools:', msg.tools);
      if (msg.slash_commands) console.log('[init] slash_commands:', msg.slash_commands);
    } else if (msg.type === 'assistant') {
      for (const b of msg.message.content) {
        if (b.type === 'text') process.stdout.write(b.text);
        else if (b.type === 'tool_use') console.log(`\n[tool_use] ${b.name}`);
      }
    } else if (msg.type === 'result') {
      console.log('\n\n──────── SMOKE RESULTS ────────');
      console.log('SDK session started: ', sawInit ? '✅' : '❌');
      console.log('AskUserQuestion fired:', sawQuestion ? '✅' : '❌ (Claude answered in text — try plan mode or a firmer prompt)');
      console.log('Answer round-tripped: ', answered ? '✅' : '❌');
      console.log('Skill visibility: read the assistant text above — does it say it has divi5-page-generator?');
      console.log('If skills are NOT visible, see the plugin-loading note in lib/claude-agent.js.');
    }
  }
})().catch((e) => {
  console.error('\n❌ smoke failed:', e.message);
  console.error('If this is an auth error, run `claude login` first. The SDK uses the CLI session — no API key needed.');
  process.exit(1);
});
