---
description: Start the Divi 5 Generator app and open it in the browser at http://localhost:3747
allowed-tools: Bash(lsof *), Bash(kill *), Bash(npm install *), Bash(node *), Bash(open *)
---

Start the Divi 5 Generator local app.

```bash
PLUGIN_DIR=$(find ~/.claude/plugins/cache ~/.claude/plugins/marketplaces -maxdepth 6 -name "server.js" -path "*/divi5generate*/app/*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
if [ -z "$PLUGIN_DIR" ]; then
  echo "Could not locate the Divi5Generate app. Is the plugin installed?"
  exit 1
fi

lsof -ti:3747 | xargs kill -9 2>/dev/null || true
sleep 0.5

[ ! -d "$PLUGIN_DIR/node_modules" ] && npm install --silent --prefix "$PLUGIN_DIR"

node "$PLUGIN_DIR/server.js" &

for i in {1..10}; do
  sleep 1
  curl -s http://localhost:3747/prereqs > /dev/null 2>&1 && break
done

open http://localhost:3747
echo "Divi 5 Generator running at http://localhost:3747"
```
