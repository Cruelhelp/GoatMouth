const fs = require('fs');
const path = require('path');

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getRunId() {
  const source =
    process.env.PLAYWRIGHT_RUN_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    `${Date.now()}`;
  return source.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
}

const runId = getRunId();
const reportDir = path.join(process.cwd(), 'public', 'reports', 'playwright', runId);
const summaryPath = path.join(reportDir, 'summary.json');
const indexPath = path.join(process.cwd(), 'public', 'reports', 'playwright', 'index.json');

ensureDir(path.dirname(indexPath));

const summary = safeReadJson(summaryPath);
const stats = summary?.stats || {};

const entry = {
  runId,
  createdAt: new Date().toISOString(),
  status: stats.unexpected > 0 ? 'failed' : 'passed',
  passed: stats.passed ?? null,
  failed: stats.unexpected ?? null,
  skipped: stats.skipped ?? null,
  total: stats.total ?? null,
  reportUrl: `/reports/playwright/${runId}/index.html`,
};

const existing = safeReadJson(indexPath);
const list = Array.isArray(existing?.runs) ? existing.runs : [];

const updated = [entry, ...list.filter(item => item.runId !== runId)].slice(0, 50);
const payload = {
  generatedAt: new Date().toISOString(),
  runs: updated,
};

fs.writeFileSync(indexPath, JSON.stringify(payload, null, 2));

console.log(`Playwright report indexed at ${entry.reportUrl}`);
