# claude-visual-feedback

Visual feedback for Claude Code. Select any element on a website, leave a comment, and Claude Code automatically finds the code and fixes it.

```
Browser (Chrome Extension)  -->  Local Server  -->  Claude Code Skills
   select + comment              stores JSON       reads + fixes code
```

## Install Skills

In any project directory:

```bash
npx claude-visual-feedback
```

Then in Claude Code:

```
/feedback-init
```

That's it. The server starts, the extension connects, and Claude begins auto-processing feedback every 30 seconds.

## Install Chrome Extension

The extension is not yet on the Chrome Web Store. Install manually:

1. Clone this repo (or download the `chrome-extension/` folder):
   ```bash
   git clone https://github.com/anantgarg/claude-visual-feedback.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (toggle in the top right)

4. Click **Load unpacked**

5. Select the `chrome-extension/` folder from this repo

6. The extension icon appears in your toolbar. Pin it for easy access.

## How It Works

1. **Start the server** — run `/feedback-init` in Claude Code. It prints a port number.

2. **Connect the extension** — click the extension icon, enter the port, hit Connect. If only one server is running, it auto-connects.

3. **Leave feedback** — on any page, click the floating purple button (or press `Cmd+Shift+F`). Hover over an element and click it, or drag to select an area. Write your comment and submit.

4. **Claude fixes it** — `/feedback-process` runs automatically every 30s. It reads your screenshot and comment, finds the relevant code, makes the fix, and marks the feedback as resolved. The extension updates in real-time.

## Skills

| Skill | What it does |
|-------|-------------|
| `/feedback-init` | Starts the feedback server, installs dependencies if needed, begins auto-processing |
| `/feedback-status` | Shows feedback counts by status (open / in-progress / resolved) |
| `/feedback-pending` | Lists all open feedback with screenshots for visual context |
| `/feedback-process` | Picks the oldest open item, reads the screenshot, finds the code, fixes it, marks resolved |

## Extension Features

- **Element selection** — hover to highlight, click to select
- **Area selection** — drag to select any rectangular region
- **Screenshot capture** — automatic screenshot of the selected area
- **Comment cards** — Linear-style UI with priority, author, threaded replies
- **Side panel** — view all feedback for the current page or project (`Cmd+Shift+L`)
- **Markers** — numbered pins on the page, colored by status (purple=open, yellow=in-progress, green=resolved)
- **Multi-project** — supports multiple Claude Code sessions simultaneously

## Project Structure

```
chrome-extension/     Chrome extension (Manifest V3)
server/               Express feedback server
skills-package/       npx installer (published to npm)
.claude/skills/       Claude Code skill definitions
```

## Privacy

- All data stays on your machine
- The extension only talks to localhost
- No external servers, analytics, or tracking
- Screenshots are stored locally in your project's `feedback/` directory

## License

MIT
