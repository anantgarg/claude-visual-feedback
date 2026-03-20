---
name: feedback-process
description: Automatically process the oldest open feedback item — read the screenshot, find the code, fix it, and mark resolved.
user_invocable: true
---

# /feedback-process

Pick up the oldest open feedback item, understand it, fix the code, and mark it resolved.

## Steps

1. **Find the oldest open feedback item:**
   - Read all JSON files from `feedback/` directory
   - Filter to status "open"
   - Sort by createdAt ascending
   - Pick the first one
   - If none found, print "No pending feedback to process." and stop

2. **Set status to "in-progress":**
   - Update the feedback JSON file: set `status` to `"in-progress"` and `updatedAt` to now
   - Also PATCH the feedback server if running: `curl -s -X PATCH http://localhost:<port>/api/feedback/<id> -H "Content-Type: application/json" -d '{"status":"in-progress"}'`
   - Read `~/.claude-feedback/servers.json` to find the port for this project

3. **Understand the feedback:**
   - Read the screenshot from `feedback/screenshots/<id>.png` using the Read tool (this shows you what the user sees)
   - Read the comment text carefully
   - Note the CSS selector (tells you which element to look at)
   - Note the URL (tells you which page/route)

4. **Find the relevant source code:**
   - Use the URL path to identify the route/page component (e.g., `/dashboard` → look for dashboard page)
   - Use the CSS selector classes to grep for the component (e.g., `.card` → grep for "card" in component files)
   - Use Grep and Glob to search the project for relevant files
   - Look at both the component/template code and the CSS/styles
   - Read the relevant files to understand the current implementation

5. **Make the fix:**
   - Based on the screenshot + comment, determine what change is needed
   - Edit the relevant source files to implement the fix
   - Keep changes minimal and focused on what the feedback requests

6. **Mark as resolved:**
   - Update the feedback JSON file: set `status` to `"resolved"` and `updatedAt` to now
   - Add a reply explaining what was fixed:
     ```json
     {
       "id": "reply_<timestamp>",
       "author": "Claude",
       "comment": "Fixed — <brief description of what was changed>",
       "createdAt": "<now>"
     }
     ```
   - Also update via the server API if running:
     - `PATCH /api/feedback/<id>` with `{"status": "resolved"}`
     - `POST /api/feedback/<id>/reply` with the reply

7. **Print summary:**
   ```
   Processed: fb_XXXXX
   Comment: "<original comment>"
   Fix: <what was changed>
   Status: resolved
   ```

## Important
- Always READ the screenshot — it's the most important context for understanding what the user sees
- The CSS selector is a strong hint for finding the right component in code
- The URL path maps to a route which maps to a page/component
- Keep fixes minimal — only change what the feedback asks for
- If you can't determine what to fix, set status back to "open" and add a reply asking for clarification
