const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// GET    /tasks
// GET    /tasks/:id
// POST   /tasks
// PUT    /tasks/:id
// PATCH  /tasks/:id
// DELETE /tasks/:id

router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.patch('/:id', taskController.patchTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
