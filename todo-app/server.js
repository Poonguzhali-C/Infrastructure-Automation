const express = require('express');
const path = require('path');

const taskRoutes = require('./routes/taskRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Core middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API routes ---
// Mounted at the root of the app so the final routes are exactly
// /tasks and /tasks/:id, as required.
app.use('/tasks', taskRoutes);

// --- 404 + error handling (must come after routes) ---
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TaskFlow server running at http://localhost:${PORT}`);
});
