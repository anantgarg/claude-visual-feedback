#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetDir = process.cwd();
const sourceDir = path.resolve(__dirname, '..');

console.log('Installing Claude Code visual feedback skills...\n');

// 1. Copy skills into .claude/skills/
const skillNames = ['feedback-init', 'feedback-status', 'feedback-pending', 'feedback-process'];

for (const skill of skillNames) {
  const destDir = path.join(targetDir, '.claude', 'skills', skill);
  const srcFile = path.join(sourceDir, 'skills', skill, 'SKILL.md');
  const destFile = path.join(destDir, 'SKILL.md');

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcFile, destFile);
  console.log(`  Installed skill: /\x1b[36m${skill}\x1b[0m`);
}

// 2. Copy feedback server into .claude/feedback-server/
const serverSrcDir = path.join(sourceDir, 'server');
const serverDestDir = path.join(targetDir, '.claude', 'feedback-server');
fs.mkdirSync(serverDestDir, { recursive: true });

const serverFiles = [
  'package.json',
  'index.js',
  'middleware/cors.js',
  'routes/feedback.js',
  'utils/storage.js'
];

for (const file of serverFiles) {
  const srcFile = path.join(serverSrcDir, file);
  const destFile = path.join(serverDestDir, file);
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.copyFileSync(srcFile, destFile);
}
console.log('  Installed feedback server: .claude/feedback-server/');

// 3. Update .gitignore
const gitignorePath = path.join(targetDir, '.gitignore');
const entriesToAdd = ['feedback/', '.claude/feedback-server/node_modules/'];
let gitignoreContent = '';

if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
}

let modified = false;
for (const entry of entriesToAdd) {
  if (!gitignoreContent.includes(entry)) {
    gitignoreContent += (gitignoreContent.endsWith('\n') || gitignoreContent === '' ? '' : '\n') + entry + '\n';
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
  console.log('  Updated .gitignore');
}

console.log(`
\x1b[32mDone!\x1b[0m Visual feedback skills installed.

\x1b[1mNext steps:\x1b[0m
  1. Open Claude Code in this project
  2. Run \x1b[36m/feedback-init\x1b[0m to start the feedback server
  3. Install the Chrome extension "Visual Feedback for Claude Code"
  4. Select elements on your site, leave comments, and Claude fixes them automatically
`);
