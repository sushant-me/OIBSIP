(function () {
  'use strict';

  var STORAGE_KEY = 'taskline.tasks.v1';
  var MAX_TASK_LENGTH = 120;
  var TOAST_DURATION = 8000;

  var ICONS = {
    check:
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
      '<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>',
    pencil:
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
      '<path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="m13.5 6.5 4 4" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '</svg>',
    trash:
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
      '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M10 11v5M14 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>',
    save:
      '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
      '<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
  };

  var els = {
    addForm: document.getElementById('addForm'),
    taskInput: document.getElementById('taskInput'),
    addError: document.getElementById('addError'),
    pendingList: document.getElementById('pendingList'),
    completedList: document.getElementById('completedList'),
    pendingCount: document.getElementById('pendingCount'),
    completedCount: document.getElementById('completedCount'),
    pendingPanel: document.getElementById('pendingPanel'),
    completedPanel: document.getElementById('completedPanel'),
    pendingEmpty: document.getElementById('pendingEmpty'),
    pendingEmptyTitle: document.getElementById('pendingEmptyTitle'),
    pendingEmptyText: document.getElementById('pendingEmptyText'),
    completedEmpty: document.getElementById('completedEmpty'),
    completedEmptyTitle: document.getElementById('completedEmptyTitle'),
    completedEmptyText: document.getElementById('completedEmptyText'),
    clearCompleted: document.getElementById('clearCompleted'),
    completedFoot: document.querySelector('.panel__foot'),
    filters: Array.prototype.slice.call(document.querySelectorAll('.filter')),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    toastAction: document.getElementById('toastAction'),
    toastClose: document.getElementById('toastClose'),
    liveStatus: document.getElementById('liveStatus'),
    todayChip: document.getElementById('todayChip')
  };

  var state = {
    tasks: [],
    filter: 'all',
    editingId: null,
    editingError: '',
    toastTimer: null,
    undoSnapshot: null,
    focusAfterRender: null
  };

  var dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  var todayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function isValidTask(task) {
    return (
      task &&
      typeof task === 'object' &&
      typeof task.id === 'string' &&
      typeof task.text === 'string' &&
      typeof task.createdAt === 'number' &&
      typeof task.completed === 'boolean' &&
      (task.completedAt === null || typeof task.completedAt === 'number')
    );
  }

  function normaliseTask(task) {
    return {
      id: task.id,
      text: String(task.text).slice(0, MAX_TASK_LENGTH),
      createdAt: task.createdAt,
      completed: task.completed,
      completedAt: task.completed ? task.completedAt || task.createdAt : null
    };
  }

  function loadTasks() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      var list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.tasks) ? parsed.tasks : [];
      return list.filter(isValidTask).map(normaliseTask);
    } catch (error) {
      return [];
    }
  }

  function saveTasks() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, updatedAt: Date.now(), tasks: state.tasks })
      );
    } catch (error) {
      announce('Local storage is unavailable, so this change will not be saved.');
    }
  }

  function cloneTasks() {
    return state.tasks.map(function (task) {
      return {
        id: task.id,
        text: task.text,
        createdAt: task.createdAt,
        completed: task.completed,
        completedAt: task.completedAt
      };
    });
  }

  function formatTimestamp(timestamp) {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return 'just now';
    }
    try {
      return dateFormatter.format(new Date(timestamp));
    } catch (error) {
      return 'just now';
    }
  }

  function truncate(text, length) {
    return text.length > length ? text.slice(0, length - 1).trimEnd() + '…' : text;
  }

  function announce(message) {
    if (!els.liveStatus) {
      return;
    }
    els.liveStatus.textContent = '';
    window.setTimeout(function () {
      els.liveStatus.textContent = message;
    }, 30);
  }

  function findTask(id) {
    return state.tasks.find(function (task) {
      return task.id === id;
    }) || null;
  }

  function iconElement(name) {
    var span = document.createElement('span');
    span.className = 'icon-wrap';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = ICONS[name];
    return span;
  }

  function makeButton(className, action, label) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.action = action;
    if (label) {
      button.setAttribute('aria-label', label);
    }
    return button;
  }

  function focusTaskControl(id, action) {
    var row = document.querySelector('li.task[data-id="' + cssEscape(id) + '"]');
    if (!row) {
      return;
    }
    var control = row.querySelector('[data-action="' + action + '"]');
    if (control) {
      control.focus();
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function buildTaskRow(task) {
    var isCompleted = task.completed;
    var row = document.createElement('li');
    row.className = 'task' + (isCompleted ? ' task--completed' : '');
    row.dataset.id = task.id;

    if (state.editingId === task.id) {
      row.classList.add('task--editing');
    }

    var toggle = makeButton(
      'task__toggle',
      'toggle',
      isCompleted ? 'Mark “' + task.text + '” as pending' : 'Mark “' + task.text + '” as complete'
    );
    toggle.setAttribute('aria-pressed', isCompleted ? 'true' : 'false');
    toggle.appendChild(iconElement('check'));
    row.appendChild(toggle);

    if (state.editingId === task.id) {
      var editingBody = document.createElement('div');
      editingBody.className = 'task__body task__body--editing';

      var editLabel = document.createElement('label');
      editLabel.className = 'visually-hidden';
      editLabel.setAttribute('for', 'edit-' + task.id);
      editLabel.textContent = 'Edit task';

      var input = document.createElement('input');
      input.className = 'edit-input';
      input.id = 'edit-' + task.id;
      input.type = 'text';
      input.maxLength = MAX_TASK_LENGTH;
      input.value = task.text;
      input.dataset.action = 'edit-input';
      input.setAttribute('autocomplete', 'off');

      var actions = document.createElement('div');
      actions.className = 'edit-actions';

      var save = makeButton('btn btn--small btn--save', 'save-edit', null);
      save.appendChild(iconElement('save'));
      save.appendChild(document.createTextNode('Save'));

      var cancel = makeButton('btn btn--small btn--quiet', 'cancel-edit', null);
      cancel.appendChild(document.createTextNode('Cancel'));

      actions.appendChild(save);
      actions.appendChild(cancel);

      var hint = document.createElement('p');
      hint.className = 'edit-error';
      hint.hidden = state.editingError === '';
      hint.textContent = state.editingError;

      editingBody.appendChild(editLabel);
      editingBody.appendChild(input);
      editingBody.appendChild(actions);
      editingBody.appendChild(hint);
      row.appendChild(editingBody);
    } else {
      var body = document.createElement('div');
      body.className = 'task__body';

      var text = document.createElement('p');
      text.className = 'task__text';
      text.textContent = task.text;
      body.appendChild(text);

      var meta = document.createElement('p');
      meta.className = 'task__meta';

      var added = document.createElement('span');
      added.className = 'task__meta-added';
      added.textContent = 'Added ' + formatTimestamp(task.createdAt);
      meta.appendChild(added);

      if (isCompleted && task.completedAt) {
        var done = document.createElement('span');
        done.className = 'task__meta-done';
        done.textContent = 'Completed ' + formatTimestamp(task.completedAt);
        meta.appendChild(done);
      }

      body.appendChild(meta);
      row.appendChild(body);

      var rowActions = document.createElement('div');
      rowActions.className = 'task__actions';

      var edit = makeButton('icon-btn', 'edit', 'Edit “' + task.text + '”');
      edit.appendChild(iconElement('pencil'));
      var editText = document.createElement('span');
      editText.className = 'icon-btn__label';
      editText.textContent = 'Edit';
      edit.appendChild(editText);

      var remove = makeButton('icon-btn icon-btn--danger', 'delete', 'Delete “' + task.text + '”');
      remove.appendChild(iconElement('trash'));
      var removeText = document.createElement('span');
      removeText.className = 'icon-btn__label';
      removeText.textContent = 'Delete';
      remove.appendChild(removeText);

      rowActions.appendChild(edit);
      rowActions.appendChild(remove);
      row.appendChild(rowActions);
    }

    return row;
  }

  function fillList(listElement, tasks) {
    listElement.textContent = '';
    tasks.forEach(function (task) {
      listElement.appendChild(buildTaskRow(task));
    });
  }

  function updateEmptyStates(pendingCount, completedCount) {
    var total = state.tasks.length;

    if (pendingCount === 0) {
      els.pendingEmpty.hidden = false;
      if (total === 0) {
        els.pendingEmptyTitle.textContent = 'Nothing here yet';
        els.pendingEmptyText.textContent =
          'Add a task above and it will show up in this list.';
      } else {
        els.pendingEmptyTitle.textContent = 'All caught up';
        els.pendingEmptyText.textContent =
          'Nothing is pending. Add a new task whenever you need one.';
      }
    } else {
      els.pendingEmpty.hidden = true;
    }

    if (completedCount === 0) {
      els.completedEmpty.hidden = false;
      if (total === 0) {
        els.completedEmptyTitle.textContent = 'Nothing completed yet';
        els.completedEmptyText.textContent =
          'Use the round button on a task and it moves here, with a completion time.';
      } else {
        els.completedEmptyTitle.textContent = 'No completed tasks yet';
        els.completedEmptyText.textContent =
          'Finish a pending task and it will move here on its own.';
      }
    } else {
      els.completedEmpty.hidden = true;
    }
  }

  function render() {
    var pending = state.tasks
      .filter(function (task) {
        return !task.completed;
      })
      .sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });

    var completed = state.tasks
      .filter(function (task) {
        return task.completed;
      })
      .sort(function (a, b) {
        return (b.completedAt || 0) - (a.completedAt || 0);
      });

    els.pendingCount.textContent = pending.length + ' pending';
    els.completedCount.textContent = completed.length + ' completed';

    fillList(els.pendingList, pending);
    fillList(els.completedList, completed);

    els.pendingPanel.hidden = state.filter === 'completed';
    els.completedPanel.hidden = state.filter === 'pending';

    updateEmptyStates(pending.length, completed.length);

    els.clearCompleted.hidden = completed.length === 0;
    els.clearCompleted.textContent = 'Clear completed (' + completed.length + ')';
    if (els.completedFoot) {
      els.completedFoot.hidden = completed.length === 0;
    }

    document.title = pending.length
      ? '(' + pending.length + ') Taskline — To-Do Web App'
      : 'Taskline — To-Do Web App';

    if (state.focusAfterRender) {
      var focusTarget = state.focusAfterRender;
      state.focusAfterRender = null;
      window.requestAnimationFrame(function () {
        if (focusTarget.type === 'edit') {
          var input = document.querySelector(
            'li.task[data-id="' + cssEscape(focusTarget.id) + '"] .edit-input'
          );
          if (input) {
            input.focus();
            input.select();
          }
        } else if (focusTarget.type === 'control') {
          focusTaskControl(focusTarget.id, focusTarget.action);
        } else if (focusTarget.type === 'input') {
          els.taskInput.focus();
        }
      });
    }
  }

  function hideToast() {
    window.clearTimeout(state.toastTimer);
    state.toastTimer = null;
    els.toast.hidden = true;
    els.toastAction.hidden = true;
    state.undoSnapshot = null;
  }

  function showToast(message, snapshot) {
    window.clearTimeout(state.toastTimer);
    els.toast.hidden = false;
    els.toastText.textContent = message;
    state.undoSnapshot = snapshot || null;
    els.toastAction.hidden = !snapshot;
    state.toastTimer = window.setTimeout(hideToast, TOAST_DURATION);
  }

  function undoLastAction() {
    if (!state.undoSnapshot) {
      hideToast();
      return;
    }
    state.tasks = state.undoSnapshot.map(normaliseTask);
    state.editingId = null;
    saveTasks();
    render();
    hideToast();
    announce('Change undone. ' + summaryCounts());
  }

  function summaryCounts() {
    var pending = state.tasks.filter(function (task) {
      return !task.completed;
    }).length;
    var completed = state.tasks.length - pending;
    return pending + ' pending, ' + completed + ' completed.';
  }

  function showAddError(message) {
    els.addError.textContent = message;
    els.addError.hidden = false;
    els.taskInput.setAttribute('aria-invalid', 'true');
    els.taskInput.focus();
  }

  function clearAddError() {
    els.addError.hidden = true;
    els.addError.textContent = '';
    els.taskInput.removeAttribute('aria-invalid');
  }

  function addTask(rawText) {
    var text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      showAddError('Give your task a name before adding it.');
      return;
    }
    if (text.length > MAX_TASK_LENGTH) {
      text = text.slice(0, MAX_TASK_LENGTH);
    }

    state.tasks.push({
      id: createId(),
      text: text,
      createdAt: Date.now(),
      completed: false,
      completedAt: null
    });

    saveTasks();
    clearAddError();
    els.taskInput.value = '';
    state.editingId = null;

    /* Always surface the new task in the Pending list, even if the user
       was viewing the Completed filter when they added it. */
    if (state.filter === 'completed') {
      state.filter = 'pending';
      syncFilterButtons();
    }

    render();
    els.taskInput.focus();
    announce('Task added: ' + text + '. ' + summaryCounts());
  }

  function toggleTask(id) {
    var task = findTask(id);
    if (!task) {
      return;
    }
    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    state.editingId = null;
    saveTasks();
    state.focusAfterRender = { type: 'control', id: id, action: 'toggle' };
    render();
    announce(
      (task.completed ? 'Task completed: ' : 'Task moved back to pending: ') +
        task.text +
        '. ' +
        summaryCounts()
    );
  }

  function startEditing(id) {
    var task = findTask(id);
    if (!task) {
      return;
    }
    state.editingId = id;
    state.editingError = '';
    state.focusAfterRender = { type: 'edit', id: id };
    render();
  }

  function cancelEditing() {
    if (!state.editingId) {
      return;
    }
    var id = state.editingId;
    state.editingId = null;
    state.editingError = '';
    state.focusAfterRender = { type: 'control', id: id, action: 'edit' };
    render();
  }

  function commitEditing(row) {
    if (!state.editingId) {
      return;
    }
    var input = row.querySelector('.edit-input');
    var task = findTask(state.editingId);
    if (!input || !task) {
      return;
    }

    var value = input.value.replace(/\s+/g, ' ').trim();
    if (!value) {
      state.editingError = 'Task text cannot be empty. Press Escape to cancel.';
      var error = row.querySelector('.edit-error');
      if (error) {
        error.textContent = state.editingError;
        error.hidden = false;
      }
      input.focus();
      return;
    }

    var id = state.editingId;
    task.text = value.slice(0, MAX_TASK_LENGTH);
    state.editingId = null;
    state.editingError = '';
    saveTasks();
    state.focusAfterRender = { type: 'control', id: id, action: 'edit' };
    render();
    announce('Task updated: ' + task.text + '.');
  }

  function deleteTask(id) {
    var task = findTask(id);
    if (!task) {
      return;
    }
    var snapshot = cloneTasks();
    state.tasks = state.tasks.filter(function (item) {
      return item.id !== id;
    });
    state.editingId = null;
    saveTasks();
    state.focusAfterRender = { type: 'input' };
    render();
    showToast('Deleted “' + truncate(task.text, 48) + '”.', snapshot);
    announce('Task deleted: ' + task.text + '. Undo is available.');
  }

  function clearCompletedTasks() {
    var snapshot = cloneTasks();
    var count = state.tasks.filter(function (task) {
      return task.completed;
    }).length;
    if (count === 0) {
      return;
    }
    state.tasks = state.tasks.filter(function (task) {
      return !task.completed;
    });
    state.editingId = null;
    saveTasks();
    state.focusAfterRender = { type: 'input' };
    render();
    showToast('Cleared ' + count + ' completed task' + (count === 1 ? '.' : 's.'), snapshot);
    announce('Cleared ' + count + ' completed task' + (count === 1 ? '.' : 's.') + '. Undo is available.');
  }

  function syncFilterButtons() {
    els.filters.forEach(function (button) {
      var isActive = button.dataset.filter === state.filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setFilter(filter) {
    state.filter = filter;
    syncFilterButtons();
    state.editingId = null;
    render();
  }

  function handleListClick(event) {
    var button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }
    var row = button.closest('li.task');
    if (!row) {
      return;
    }
    var id = row.dataset.id;
    var action = button.dataset.action;

    if (action === 'toggle') {
      toggleTask(id);
    } else if (action === 'edit') {
      startEditing(id);
    } else if (action === 'delete') {
      deleteTask(id);
    } else if (action === 'save-edit') {
      commitEditing(row);
    } else if (action === 'cancel-edit') {
      cancelEditing();
    }
  }

  function handleListKeydown(event) {
    if (event.key !== 'Enter' && event.key !== 'Escape') {
      return;
    }
    var target = event.target;
    if (!target || !target.classList || !target.classList.contains('edit-input')) {
      return;
    }
    var row = target.closest('li.task');
    if (!row) {
      return;
    }
    event.preventDefault();
    if (event.key === 'Enter') {
      commitEditing(row);
    } else {
      cancelEditing();
    }
  }

  function handleEditInput(event) {
    var target = event.target;
    if (!target || !target.classList || !target.classList.contains('edit-input')) {
      return;
    }
    var row = target.closest('li.task');
    var error = row ? row.querySelector('.edit-error') : null;
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    state.editingError = '';
  }

  function wireEvents() {
    els.addForm.addEventListener('submit', function (event) {
      event.preventDefault();
      addTask(els.taskInput.value);
    });

    els.taskInput.addEventListener('input', function () {
      if (!els.addError.hidden) {
        clearAddError();
      }
    });

    els.filters.forEach(function (button) {
      button.addEventListener('click', function () {
        setFilter(button.dataset.filter);
      });
    });

    els.pendingList.addEventListener('click', handleListClick);
    els.completedList.addEventListener('click', handleListClick);
    els.pendingList.addEventListener('keydown', handleListKeydown);
    els.completedList.addEventListener('keydown', handleListKeydown);
    els.pendingList.addEventListener('input', handleEditInput);
    els.completedList.addEventListener('input', handleEditInput);

    els.clearCompleted.addEventListener('click', clearCompletedTasks);

    els.toastAction.addEventListener('click', undoLastAction);
    els.toastClose.addEventListener('click', hideToast);
  }

  function init() {
    state.tasks = loadTasks();
    els.todayChip.textContent = todayFormatter.format(new Date());
    wireEvents();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
