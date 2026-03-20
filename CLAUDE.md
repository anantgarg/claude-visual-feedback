# claude-visual-feedback

Visual feedback system for Claude Code. Users select elements on any website, leave comments, and Claude Code automatically processes and fixes the code.

## Project Structure

```
server/                    — Express feedback server (file-based storage)
chrome-extension/          — Chrome extension (Manifest V3, Linear-style UI)
skills-package/            — npx installer package (claude-visual-feedback)
.claude/skills/            — Claude Code skill definitions
```

## Server

- Express app on random port (49152-65535), registers in `~/.claude-feedback/servers.json`
- REST API: POST/GET/PATCH/DELETE /api/feedback, POST /api/feedback/:id/reply
- File storage: feedback as JSON + screenshots in `<project>/feedback/`
- Run: `cd server && npm install && node index.js --project-path /path/to/project`

## Chrome Extension

- Load unpacked from `chrome-extension/` in chrome://extensions
- All UI in Shadow DOM for style isolation, classes prefixed `vf-`
- Components: SelectionOverlay, CommentCard, FeedbackMarker, FloatingButton, SidePanel
- Discovers servers via `~/.claude-feedback/servers.json` registry

## Skills

- `/feedback-init` — starts server, installs if needed, begins auto-processing loop
- `/feedback-status` — shows feedback counts by status + recent items
- `/feedback-pending` — lists open items with screenshots for visual context
- `/feedback-process` — picks oldest open item, reads screenshot, finds code, fixes, resolves

## npx Installer

```bash
npx claude-visual-feedback
```
Copies skills + server into target project's `.claude/` directory.
