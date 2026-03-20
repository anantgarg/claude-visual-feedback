const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { saveFeedback, getFeedback, listFeedback, updateFeedback, deleteFeedback } = require('../utils/storage');

const router = express.Router();

/**
 * Configure multer for screenshot uploads.
 * The destination is set dynamically per-request based on app.locals.projectPath.
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const projectPath = req.app.locals.projectPath;
      const screenshotsDir = path.join(projectPath, 'feedback', 'screenshots');
      fs.mkdirSync(screenshotsDir, { recursive: true });
      cb(null, screenshotsDir);
    },
    filename: function (req, file, cb) {
      // Temporary name; will be renamed after we generate the feedback id
      cb(null, `tmp_${Date.now()}.png`);
    }
  })
});

/**
 * POST /api/feedback
 * Create a new feedback item. Accepts JSON (with base64 screenshot) or multipart form.
 */
router.post('/api/feedback', upload.single('screenshot'), (req, res) => {
  try {
    const projectPath = req.app.locals.projectPath;
    const id = `fb_${Date.now()}`;
    const now = new Date().toISOString();

    // Parse coordinates and viewport if provided as strings
    let coordinates = req.body.coordinates || req.body.position;
    if (typeof coordinates === 'string') {
      try { coordinates = JSON.parse(coordinates); } catch (e) { coordinates = null; }
    }

    let viewport = req.body.viewport;
    if (typeof viewport === 'string') {
      try { viewport = JSON.parse(viewport); } catch (e) { viewport = null; }
    }

    const feedback = {
      id,
      url: req.body.url || '',
      selector: req.body.selector || '',
      coordinates: coordinates || null,
      viewport: viewport || null,
      screenshot: null,
      comment: req.body.comment || '',
      author: req.body.author || 'User',
      status: req.body.status || 'open',
      priority: req.body.priority || 'medium',
      createdAt: now,
      updatedAt: now,
      replies: []
    };

    // Handle screenshot file upload (multipart)
    if (req.file) {
      const finalName = `${id}.png`;
      const finalPath = path.join(projectPath, 'feedback', 'screenshots', finalName);
      fs.renameSync(req.file.path, finalPath);
      feedback.screenshot = `screenshots/${finalName}`;
    }
    // Handle base64 screenshot from JSON body
    else if (req.body.screenshot && typeof req.body.screenshot === 'string' && req.body.screenshot.startsWith('data:')) {
      const finalName = `${id}.png`;
      const finalPath = path.join(projectPath, 'feedback', 'screenshots', finalName);
      const base64Data = req.body.screenshot.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(finalPath, Buffer.from(base64Data, 'base64'));
      feedback.screenshot = `screenshots/${finalName}`;
    }

    saveFeedback(projectPath, feedback);
    res.status(201).json(feedback);
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

/**
 * GET /api/feedback
 * List all feedback. Optional query params: status, page (filter by url).
 */
router.get('/api/feedback', (req, res) => {
  try {
    const projectPath = req.app.locals.projectPath;
    let items = listFeedback(projectPath);

    // Filter by status if provided
    if (req.query.status) {
      items = items.filter(item => item.status === req.query.status);
    }

    // Filter by page (url) if provided
    if (req.query.page) {
      items = items.filter(item => item.url === req.query.page);
    }

    res.json(items);
  } catch (err) {
    console.error('Error listing feedback:', err);
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

/**
 * GET /api/feedback/:id
 * Get a single feedback item.
 */
router.get('/api/feedback/:id', (req, res) => {
  try {
    const projectPath = req.app.locals.projectPath;
    const item = getFeedback(projectPath, req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error getting feedback:', err);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

/**
 * PATCH /api/feedback/:id
 * Update feedback fields (status, priority, comment).
 */
router.patch('/api/feedback/:id', express.json(), (req, res) => {
  try {
    const projectPath = req.app.locals.projectPath;
    const allowedUpdates = {};

    if (req.body.status !== undefined) allowedUpdates.status = req.body.status;
    if (req.body.priority !== undefined) allowedUpdates.priority = req.body.priority;
    if (req.body.comment !== undefined) allowedUpdates.comment = req.body.comment;

    const updated = updateFeedback(projectPath, req.params.id, allowedUpdates);
    if (!updated) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating feedback:', err);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

/**
 * DELETE /api/feedback/:id
 * Delete a feedback item and its screenshot.
 */
router.delete('/api/feedback/:id', (req, res) => {
  try {
    const projectPath = req.app.locals.projectPath;
    const item = getFeedback(projectPath, req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    deleteFeedback(projectPath, req.params.id);
    res.json({ message: 'Feedback deleted', id: req.params.id });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

/**
 * POST /api/feedback/:id/reply
 * Add a reply to a feedback item.
 */
router.post('/api/feedback/:id/reply', express.json(), (req, res) => {
  try {
    const projectPath = req.app.locals.projectPath;
    const item = getFeedback(projectPath, req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const reply = {
      id: `reply_${Date.now()}`,
      author: req.body.author || 'User',
      comment: req.body.comment || '',
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(item.replies)) {
      item.replies = [];
    }
    item.replies.push(reply);
    item.updatedAt = new Date().toISOString();

    saveFeedback(projectPath, item);
    res.json(item);
  } catch (err) {
    console.error('Error adding reply:', err);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

module.exports = router;
