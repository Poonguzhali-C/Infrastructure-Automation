// ==========================================================================
// TaskFlow — frontend application logic
// Talks to the backend exclusively via fetch('/tasks', ...)
// ==========================================================================

const API_BASE = '/tasks';

// --- App state ---
const state = {
  tasks: [],
  statusFilter: 'all', // all | active | completed
  priorityFilter: 'all', // all | low | medium | high
  sortBy: 'newest', // newest | oldest | dueDate | priority
  searchTerm: '',
  editingTaskId: null,
  pendingDeleteId: null,
};

// --- DOM references ---
const dom = {
  taskList: document.getElementById('taskList'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  emptyStateTitle: document.getElementById('emptyStateTitle'),
  emptyStateMessage: document.getElementById('emptyStateMessage'),
  emptyStateAddBtn: document.getElementById('emptyStateAddBtn'),

  taskCountPill: document.getElementById('taskCountPill'),
  statTotal: document.getElementById('statTotal'),
  statCompleted: document.getElementById('statCompleted'),
  statPending: document.getElementById('statPending'),
  statHighPriority: document.getElementById('statHighPriority'),

  searchInput: document.getElementById('searchInput'),
  filterChips: document.querySelectorAll('.filter-chip'),
  priorityFilter: document.getElementById('priorityFilter'),
  sortSelect: document.getElementById('sortSelect'),

  openAddTaskBtn: document.getElementById('openAddTaskBtn'),
  themeToggle: document.getElementById('themeToggle'),

  modalOverlay: document.getElementById('modalOverlay'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  taskForm: document.getElementById('taskForm'),
  taskIdInput: document.getElementById('taskId'),
  titleInput: document.getElementById('titleInput'),
  titleError: document.getElementById('titleError'),
  descriptionInput: document.getElementById('descriptionInput'),
  priorityInput: document.getElementById('priorityInput'),
  dueDateInput: document.getElementById('dueDateInput'),
  submitTaskBtn: document.getElementById('submitTaskBtn'),

  confirmOverlay: document.getElementById('confirmOverlay'),
  closeConfirmBtn: document.getElementById('closeConfirmBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

  toastContainer: document.getElementById('toastContainer'),
};

// ==========================================================================
// Theme handling
// ==========================================================================

function initTheme() {
  const saved = localStorage.getItem('taskflow-theme');
  const theme = saved || 'light';
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  localStorage.setItem('taskflow-theme', theme);
}

dom.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ==========================================================================
// Toast notifications
// ==========================================================================

const TOAST_ICONS = {
  success: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L9.5 17L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
  info: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
};

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  const timeout = setTimeout(() => removeToast(toast), 3200);
  toast.addEventListener('click', () => {
    clearTimeout(timeout);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.classList.add('is-leaving');
  setTimeout(() => toast.remove(), 180);
}

// ==========================================================================
// Helpers
// ==========================================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// ==========================================================================
// API calls
// ==========================================================================

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    // no JSON body
  }

  if (!response.ok || (body && body.success === false)) {
    const message = (body && body.message) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

async function fetchTasks() {
  const result = await apiRequest(API_BASE);
  return result.data;
}

async function createTaskRequest(payload) {
  const result = await apiRequest(API_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

async function updateTaskRequest(id, payload) {
  const result = await apiRequest(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

async function patchTaskRequest(id, payload) {
  const result = await apiRequest(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return result.data;
}

async function deleteTaskRequest(id) {
  const result = await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
  return result.data;
}

// ==========================================================================
// Rendering
// ==========================================================================

function getVisibleTasks() {
  let tasks = [...state.tasks];

  if (state.statusFilter === 'active') {
    tasks = tasks.filter((t) => !t.completed);
  } else if (state.statusFilter === 'completed') {
    tasks = tasks.filter((t) => t.completed);
  }

  if (state.priorityFilter !== 'all') {
    tasks = tasks.filter((t) => t.priority === state.priorityFilter);
  }

  if (state.searchTerm.trim()) {
    const term = state.searchTerm.trim().toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term)
    );
  }

  tasks.sort((a, b) => {
    switch (state.sortBy) {
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      case 'priority':
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case 'newest':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return tasks;
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const highPriority = state.tasks.filter((t) => t.priority === 'high' && !t.completed).length;

  dom.statTotal.textContent = total;
  dom.statCompleted.textContent = completed;
  dom.statPending.textContent = pending;
  dom.statHighPriority.textContent = highPriority;
  dom.taskCountPill.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
}

function taskCardTemplate(task) {
  const dueLabel = formatDate(task.dueDate);
  const createdLabel = formatDate(task.createdAt);
  const overdue = isOverdue(task);

  return `
    <li class="task-card ${task.completed ? 'is-completed' : ''}" data-id="${task.id}">
      <button class="task-checkbox ${task.completed ? 'is-checked' : ''}" aria-label="${task.completed ? 'Mark as not completed' : 'Mark as completed'}" data-action="toggle">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L9.5 17L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <div class="task-body">
        <div class="task-top-row">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="task-actions">
            <button class="icon-btn edit-btn" data-action="edit" aria-label="Edit task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20l4.4-.9L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.6 4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
            </button>
            <button class="icon-btn delete-btn" data-action="delete" aria-label="Delete task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.4a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>

        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}

        <div class="task-meta">
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
          ${dueLabel ? `<span class="meta-chip ${overdue ? 'is-overdue' : ''}">${overdue ? 'Overdue · ' : 'Due '}${dueLabel}</span>` : ''}
          ${createdLabel ? `<span class="meta-chip">Created ${createdLabel}</span>` : ''}
        </div>
      </div>
    </li>
  `;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();

  if (state.tasks.length === 0) {
    dom.emptyStateTitle.textContent = 'No tasks yet';
    dom.emptyStateMessage.textContent = 'Add your first task and start building momentum.';
    dom.emptyState.hidden = false;
    dom.taskList.hidden = true;
  } else if (visibleTasks.length === 0) {
    dom.emptyStateTitle.textContent = 'No matching tasks';
    dom.emptyStateMessage.textContent = 'Try adjusting your search or filters.';
    dom.emptyState.hidden = false;
    dom.taskList.hidden = true;
  } else {
    dom.emptyState.hidden = true;
    dom.taskList.hidden = false;
    dom.taskList.innerHTML = visibleTasks.map(taskCardTemplate).join('');
  }

  renderStats();
}

// ==========================================================================
// Data loading
// ==========================================================================

async function loadTasks() {
  dom.loadingState.hidden = false;
  dom.taskList.hidden = true;
  dom.emptyState.hidden = true;

  try {
    state.tasks = await fetchTasks();
    renderTasks();
  } catch (err) {
    showToast(err.message || 'Failed to load tasks', 'error');
  } finally {
    dom.loadingState.hidden = true;
  }
}

// ==========================================================================
// Modal (add / edit task)
// ==========================================================================

function openModalForCreate() {
  state.editingTaskId = null;
  dom.modalTitle.textContent = 'New task';
  dom.submitTaskBtn.textContent = 'Add task';
  dom.taskForm.reset();
  dom.taskIdInput.value = '';
  dom.priorityInput.value = 'medium';
  clearFieldError();
  openModal(dom.modalOverlay);
  dom.titleInput.focus();
}

function openModalForEdit(task) {
  state.editingTaskId = task.id;
  dom.modalTitle.textContent = 'Edit task';
  dom.submitTaskBtn.textContent = 'Save changes';
  dom.taskIdInput.value = task.id;
  dom.titleInput.value = task.title;
  dom.descriptionInput.value = task.description || '';
  dom.priorityInput.value = task.priority;
  dom.dueDateInput.value = task.dueDate ? task.dueDate.slice(0, 10) : '';
  clearFieldError();
  openModal(dom.modalOverlay);
  dom.titleInput.focus();
}

function openModal(overlay) {
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal(overlay) {
  overlay.hidden = true;
  document.body.style.overflow = '';
}

function clearFieldError() {
  dom.titleError.textContent = '';
  dom.titleInput.closest('.field').classList.remove('has-error');
}

function setFieldError(message) {
  dom.titleError.textContent = message;
  dom.titleInput.closest('.field').classList.add('has-error');
}

dom.openAddTaskBtn.addEventListener('click', openModalForCreate);
dom.emptyStateAddBtn.addEventListener('click', openModalForCreate);
dom.closeModalBtn.addEventListener('click', () => closeModal(dom.modalOverlay));
dom.cancelModalBtn.addEventListener('click', () => closeModal(dom.modalOverlay));

dom.modalOverlay.addEventListener('click', (e) => {
  if (e.target === dom.modalOverlay) closeModal(dom.modalOverlay);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!dom.modalOverlay.hidden) closeModal(dom.modalOverlay);
    if (!dom.confirmOverlay.hidden) closeModal(dom.confirmOverlay);
  }
});

dom.taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldError();

  const title = dom.titleInput.value.trim();
  if (!title) {
    setFieldError('Title is required.');
    return;
  }

  const payload = {
    title,
    description: dom.descriptionInput.value.trim(),
    priority: dom.priorityInput.value,
    dueDate: dom.dueDateInput.value || null,
  };

  dom.submitTaskBtn.disabled = true;

  try {
    if (state.editingTaskId) {
      const existing = state.tasks.find((t) => t.id === state.editingTaskId);
      const updated = await updateTaskRequest(state.editingTaskId, {
        ...payload,
        completed: existing ? existing.completed : false,
      });
      const idx = state.tasks.findIndex((t) => t.id === state.editingTaskId);
      if (idx !== -1) state.tasks[idx] = updated;
      showToast('Task updated', 'success');
    } else {
      const created = await createTaskRequest(payload);
      state.tasks.unshift(created);
      showToast('Task created', 'success');
    }

    renderTasks();
    closeModal(dom.modalOverlay);
  } catch (err) {
    setFieldError(err.message || 'Something went wrong. Please try again.');
  } finally {
    dom.submitTaskBtn.disabled = false;
  }
});

// ==========================================================================
// Delete confirmation
// ==========================================================================

function openDeleteConfirm(task) {
  state.pendingDeleteId = task.id;
  document.getElementById('confirmMessage').textContent = `Delete "${task.title}"? This can't be undone.`;
  openModal(dom.confirmOverlay);
}

dom.closeConfirmBtn.addEventListener('click', () => closeModal(dom.confirmOverlay));
dom.cancelDeleteBtn.addEventListener('click', () => closeModal(dom.confirmOverlay));
dom.confirmOverlay.addEventListener('click', (e) => {
  if (e.target === dom.confirmOverlay) closeModal(dom.confirmOverlay);
});

dom.confirmDeleteBtn.addEventListener('click', async () => {
  const id = state.pendingDeleteId;
  if (id == null) return;

  const cardEl = dom.taskList.querySelector(`.task-card[data-id="${id}"]`);

  try {
    dom.confirmDeleteBtn.disabled = true;
    await deleteTaskRequest(id);

    if (cardEl) {
      cardEl.classList.add('is-removing');
      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    state.tasks = state.tasks.filter((t) => t.id !== id);
    renderTasks();
    showToast('Task deleted', 'success');
    closeModal(dom.confirmOverlay);
  } catch (err) {
    showToast(err.message || 'Failed to delete task', 'error');
  } finally {
    dom.confirmDeleteBtn.disabled = false;
    state.pendingDeleteId = null;
  }
});

// ==========================================================================
// Task list interactions (toggle / edit / delete)
// ==========================================================================

dom.taskList.addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const cardEl = e.target.closest('.task-card');
  const id = Number(cardEl.dataset.id);
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const action = actionEl.dataset.action;

  if (action === 'toggle') {
    actionEl.disabled = true;
    try {
      const updated = await patchTaskRequest(id, { completed: !task.completed });
      const idx = state.tasks.findIndex((t) => t.id === id);
      state.tasks[idx] = updated;
      renderTasks();
      showToast(updated.completed ? 'Task marked complete' : 'Task marked pending', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error');
    } finally {
      actionEl.disabled = false;
    }
  } else if (action === 'edit') {
    openModalForEdit(task);
  } else if (action === 'delete') {
    openDeleteConfirm(task);
  }
});

// ==========================================================================
// Filters, search, sort
// ==========================================================================

let searchDebounce;
dom.searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.searchTerm = e.target.value;
    renderTasks();
  }, 150);
});

dom.filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    dom.filterChips.forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.statusFilter = chip.dataset.filter;
    renderTasks();
  });
});

dom.priorityFilter.addEventListener('change', (e) => {
  state.priorityFilter = e.target.value;
  renderTasks();
});

dom.sortSelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  renderTasks();
});

// ==========================================================================
// Init
// ==========================================================================

initTheme();
loadTasks();
