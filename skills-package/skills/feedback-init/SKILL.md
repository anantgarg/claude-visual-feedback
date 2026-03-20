---
name: feedback-init
description: Start the visual feedback server for this project. Downloads server if needed, binds to a random port, registers for Chrome extension discovery.
user_invocable: true
---

# /feedback-init

Start the visual feedback system for the current project.

## Steps

1. **Check if the feedback server is already installed** at `.claude/feedback-server/` in the current project directory. If NOT found:
   - Run: `npx claude-visual-feedback` to install the server and skills into this project
   - If npx is not available or fails, manually create `.claude/feedback-server/` by copying from the npm package or cloning from the repo

2. **Check if a feedback server is already running for this project** by reading `~/.claude-feedback/servers.json` and checking if any entry has a matching `projectPath` to the current working directory. If found, check if the process is still alive by checking the PID. If alive:
   - Print: "Feedback server already running on port {port}"
   - Skip to step 5

3. **Install server dependencies** if `node_modules/` doesn't exist in `.claude/feedback-server/`:
   ```bash
   cd .claude/feedback-server && npm install
   ```

4. **Start the feedback server** in the background:
   ```bash
   node .claude/feedback-server/index.js --project-path "$(pwd)" --project-name "$(basename $(pwd))" &
   ```
   Wait a moment, then read `~/.claude-feedback/servers.json` to confirm it registered and get the port number.

5. **Print connection info:**
   ```
   Feedback server running on port XXXXX
   Project: <project-name>

   To use:
   1. Install the Chrome extension "Visual Feedback for Claude Code"
   2. The extension will auto-detect this project
   3. Select any element on your site and leave feedback
   4. Run /feedback-process or start auto-processing below
   ```

6. **Start auto-processing loop** — run:
   ```
   /loop 30s /feedback-process
   ```
   This will check for new feedback every 30 seconds and automatically process it.

## Important
- The server binds to 127.0.0.1 only (localhost) — no external access
- Server auto-deregisters from `~/.claude-feedback/servers.json` on shutdown
- Feedback is stored in `<project>/feedback/` as JSON files + screenshots
- Add `feedback/` to `.gitignore` if not already there
