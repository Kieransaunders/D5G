---
description: Start the Divi 5 Generator app and open it in the browser at http://localhost:3747
allowed-tools: Bash(lsof *), Bash(kill *), Bash(npm install *), Bash(node *), Bash(open *)
---

Start the Divi 5 Generator local app.

**The app is a separate Pro download, not part of this toolkit install**
(split out 16/07/2026 — see `docs/PRD.md` §3.4/§3.1). It lives at
`~/Library/Application Support/Divi5Generator/app/` once installed.

```bash
APP_DIR="$HOME/Library/Application Support/Divi5Generator/app"

if [ ! -f "$APP_DIR/server.js" ]; then
  echo "The Divi 5 Generator app isn't installed."
  echo "It's a Pro-only download (Divi5 Generator plugin → Settings → Add-Ons in WordPress)."
  echo "Unzip it to: $APP_DIR"
  exit 1
fi

lsof -ti:3747 | xargs kill -9 2>/dev/null || true
sleep 0.5

[ ! -d "$APP_DIR/node_modules" ] && npm install --silent --prefix "$APP_DIR"

node "$APP_DIR/server.js" &

for i in {1..10}; do
  sleep 1
  curl -s http://localhost:3747/prereqs > /dev/null 2>&1 && break
done

open http://localhost:3747
echo "Divi 5 Generator running at http://localhost:3747"
```
