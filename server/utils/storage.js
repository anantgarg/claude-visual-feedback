const fs = require('fs');
const path = require('path');

function feedbackDir(projectPath) {
  return path.join(projectPath, 'feedback');
}

function feedbackFile(projectPath, id) {
  return path.join(feedbackDir(projectPath), `${id}.json`);
}

function screenshotFile(projectPath, id) {
  return path.join(feedbackDir(projectPath), 'screenshots', `${id}.png`);
}

/**
 * Save a feedback object to disk as JSON.
 */
function saveFeedback(projectPath, feedback) {
  try {
    const filePath = feedbackFile(projectPath, feedback.id);
    fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
    return feedback;
  } catch (err) {
    console.error(`Error saving feedback ${feedback.id}:`, err.message);
    return null;
  }
}

/**
 * Read a single feedback item by id. Returns null if not found.
 */
function getFeedback(projectPath, id) {
  try {
    const filePath = feedbackFile(projectPath, id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading feedback ${id}:`, err.message);
    return null;
  }
}

/**
 * List all feedback items. Returns array sorted by createdAt descending.
 */
function listFeedback(projectPath) {
  try {
    const dir = feedbackDir(projectPath);
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const items = [];
    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(dir, file), 'utf-8');
        items.push(JSON.parse(data));
      } catch (err) {
        // Skip malformed files
        console.error(`Error reading ${file}:`, err.message);
      }
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items;
  } catch (err) {
    console.error('Error listing feedback:', err.message);
    return [];
  }
}

/**
 * Update a feedback item by merging updates into the existing object.
 * Returns the updated item, or null if not found.
 */
function updateFeedback(projectPath, id, updates) {
  try {
    const existing = getFeedback(projectPath, id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    saveFeedback(projectPath, updated);
    return updated;
  } catch (err) {
    console.error(`Error updating feedback ${id}:`, err.message);
    return null;
  }
}

/**
 * Delete a feedback item and its associated screenshot.
 * Returns true if deleted, false otherwise.
 */
function deleteFeedback(projectPath, id) {
  try {
    const filePath = feedbackFile(projectPath, id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const screenshot = screenshotFile(projectPath, id);
    if (fs.existsSync(screenshot)) {
      fs.unlinkSync(screenshot);
    }
    return true;
  } catch (err) {
    console.error(`Error deleting feedback ${id}:`, err.message);
    return false;
  }
}

module.exports = {
  saveFeedback,
  getFeedback,
  listFeedback,
  updateFeedback,
  deleteFeedback
};
