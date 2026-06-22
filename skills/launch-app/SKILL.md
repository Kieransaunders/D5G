---
name: launch-app
description: Launch the Divi 5 Generator app. Use when the user says "open the app", "start the app", "launch the generator", "open the generator", or "run the app".
allowed-tools: Bash(lsof *), Bash(kill *), Bash(npm install *), Bash(node *), Bash(open *)
---

Launch the Divi 5 Generator local app and open it in the browser.

```bash
PLUGIN_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$PLUGIN_DIR/app"

# Kill any existing instance
lsof -ti:3747 | xargs kill -9 2>/dev/null || true
sleep 0.5

# Install deps if needed
if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "Installing dependencies (first run only)…"
  npm install --silent --prefix "$APP_DIR"
fi

# Start server
node "$APP_DIR/server.js" &

# Wait up to 10s for it to be ready
for i in {1..10}; do
  sleep 1
  curl -s http://localhost:3747/prereqs > /dev/null 2>&1 && break
done

open http://localhost:3747
echo "Divi 5 Generator running at http://localhost:3747"
```
