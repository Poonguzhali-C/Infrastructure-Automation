const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');

/**
 * Reads all tasks from the JSON data file.
 * Returns an empty array if the file is missing or empty.
 */
async function readTasks() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Persists the full task list back to the JSON data file.
 */
async function writeTasks(tasks) {
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

/**
 * Computes the next unique numeric id for a new task.
 */
function getNextId(tasks) {
  if (tasks.length === 0) return 1;
  return Math.max(...tasks.map((t) => t.id)) + 1;
}

module.exports = { readTasks, writeTasks, getNextId };
