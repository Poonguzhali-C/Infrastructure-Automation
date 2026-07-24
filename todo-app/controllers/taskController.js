const { readTasks, writeTasks, getNextId } = require('../data/taskStore');
const { ApiError } = require('../middleware/errorHandler');

const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * Validates the body of a create/update request.
 * `partial` = true allows fields to be missing (used for PATCH).
 */
function validateTaskInput(body, { partial = false } = {}) {
  const errors = [];

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('title is required and must be a non-empty string');
    }
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string');
  }

  if (body.completed !== undefined && typeof body.completed !== 'boolean') {
    errors.push('completed must be a boolean');
  }

  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '') {
    const parsed = new Date(body.dueDate);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('dueDate must be a valid date string');
    }
  }

  return errors;
}

/**
 * GET /tasks
 * Supports ?completed=true|false, ?priority=low|medium|high, ?search=term
 */
async function getAllTasks(req, res, next) {
  try {
    let tasks = await readTasks();
    const { completed, priority, search } = req.query;

    if (completed !== undefined) {
      const wantCompleted = completed === 'true';
      tasks = tasks.filter((t) => t.completed === wantCompleted);
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        throw new ApiError(400, `priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
      }
      tasks = tasks.filter((t) => t.priority === priority);
    }

    if (search !== undefined && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.description || '').toLowerCase().includes(term)
      );
    }

    res.status(200).json({
      success: true,
      data: tasks,
      message: 'Tasks retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tasks/:id
 */
async function getTaskById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tasks = await readTasks();
    const task = tasks.find((t) => t.id === id);

    if (!task) {
      throw new ApiError(404, `Task with id ${req.params.id} not found`);
    }

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /tasks
 */
async function createTask(req, res, next) {
  try {
    const errors = validateTaskInput(req.body);
    if (errors.length > 0) {
      throw new ApiError(400, errors.join('; '));
    }

    const tasks = await readTasks();

    const newTask = {
      id: getNextId(tasks),
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      completed: false,
      priority: req.body.priority || 'medium',
      dueDate: req.body.dueDate || null,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    await writeTasks(tasks);

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /tasks/:id
 * Replaces the editable fields of a task.
 */
async function updateTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    const errors = validateTaskInput(req.body);
    if (errors.length > 0) {
      throw new ApiError(400, errors.join('; '));
    }

    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new ApiError(404, `Task with id ${req.params.id} not found`);
    }

    const existing = tasks[index];
    const updated = {
      ...existing,
      title: req.body.title.trim(),
      description: req.body.description !== undefined ? req.body.description.trim() : existing.description,
      priority: req.body.priority || existing.priority,
      dueDate: req.body.dueDate !== undefined ? req.body.dueDate : existing.dueDate,
      completed: req.body.completed !== undefined ? req.body.completed : existing.completed,
    };

    tasks[index] = updated;
    await writeTasks(tasks);

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /tasks/:id
 * Partially updates a task, most commonly used to toggle `completed`.
 */
async function patchTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    const errors = validateTaskInput(req.body, { partial: true });
    if (errors.length > 0) {
      throw new ApiError(400, errors.join('; '));
    }

    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new ApiError(404, `Task with id ${req.params.id} not found`);
    }

    const existing = tasks[index];
    const updated = { ...existing, ...req.body };

    if (typeof updated.title === 'string') {
      updated.title = updated.title.trim();
    }
    if (typeof updated.description === 'string') {
      updated.description = updated.description.trim();
    }

    tasks[index] = updated;
    await writeTasks(tasks);

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /tasks/:id
 */
async function deleteTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new ApiError(404, `Task with id ${req.params.id} not found`);
    }

    const [removed] = tasks.splice(index, 1);
    await writeTasks(tasks);

    res.status(200).json({
      success: true,
      data: removed,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
};
