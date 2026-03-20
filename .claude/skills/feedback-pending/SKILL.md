---
name: feedback-pending
description: List all open/pending visual feedback items with full details including screenshots.
user_invocable: true
---

# /feedback-pending

Show all unprocessed (open) feedback items with full visual context.

## Steps

1. **Read all feedback JSON files** from `feedback/` directory in the current project.

2. **Filter to only "open" status items** and sort by createdAt ascending (oldest first — process oldest feedback first).

3. **For each open item, display:**
   - ID and priority
   - The comment text in full
   - The URL where feedback was left
   - The CSS selector of the targeted element
   - The coordinates and viewport size
   - Read and display the screenshot image from `feedback/screenshots/<id>.png` (use the Read tool on the image file so you can see it)

4. **Format:**
   ```
   Pending Feedback (X items):

   --- fb_1710934200000 [high priority] ---
   URL:      http://localhost:3000/dashboard
   Selector: div.card > h2.title
   Comment:  "This heading is too small on mobile"
   Screenshot: [displayed inline via Read tool]

   --- fb_1710934300000 [medium priority] ---
   ...
   ```

5. If no open items exist, print: "No pending feedback. All caught up!"

## Notes
- Reading the screenshot is critical — it provides visual context for what the user is seeing
- The selector helps identify which component/element to look for in the codebase
- The URL helps identify which route/page the code is in
