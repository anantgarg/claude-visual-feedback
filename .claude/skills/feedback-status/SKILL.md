---
name: feedback-status
description: Show a summary of all visual feedback items for this project with counts by status.
user_invocable: true
---

# /feedback-status

Show the current status of all visual feedback for this project.

## Steps

1. **Read all feedback JSON files** from `feedback/` directory in the current project. Each file is named `<id>.json`.

2. **Count items by status:**
   - Open
   - In Progress
   - Resolved

3. **Display summary:**
   ```
   Feedback Status:
   ----------------
   Open:        X items
   In Progress: X items
   Resolved:    X items
   Total:       X items
   ```

4. **Show the 5 most recent items** (sorted by createdAt descending):
   ```
   Recent Feedback:
   1. [open]        "Comment text preview..." — localhost:3000/page — 2h ago
   2. [in-progress] "Another comment..."     — localhost:3000/other — 5h ago
   3. [resolved]    "Fixed the heading..."   — localhost:3000/page — 1d ago
   ...
   ```

## Notes
- If no feedback/ directory exists, print "No feedback found. Run /feedback-init to start the feedback system."
- Truncate comment text to 60 characters in the summary
- Use relative time (e.g., "2h ago", "1d ago") for timestamps
