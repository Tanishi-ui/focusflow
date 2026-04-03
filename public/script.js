// ============================================
// FocusFlow - Pomodoro Timer & Task Manager
// ============================================

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const timerMode = document.getElementById('timerMode');
const progressRing = document.getElementById('progressRing');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const completedTasksEl = document.getElementById('completedTasks');
const focusSessionsEl = document.getElementById('focusSessions');
const themeToggle = document.getElementById('themeToggle');
const notificationSound = document.getElementById('notificationSound');

// Timer Constants
const FOCUS_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60;  // 5 minutes in seconds
const CIRCUMFERENCE = 2 * Math.PI * 90; // Progress ring circumference

// Timer State
let timeRemaining = FOCUS_TIME;
let isRunning = false;
let isFocusMode = true;
let timerInterval = null;

// App State
let tasks = [];
let stats = {
  completedTasks: 0,
  focusSessions: 0
};

// ============================================
// Theme Management
// ============================================

function initTheme() {
  const savedTheme = localStorage.getItem('focusflow-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('focusflow-theme', newTheme);
}

// ============================================
// Timer Functions
// ============================================

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timeRemaining);
  
  // Update progress ring
  const totalTime = isFocusMode ? FOCUS_TIME : BREAK_TIME;
  const progress = timeRemaining / totalTime;
  const offset = CIRCUMFERENCE * (1 - progress);
  progressRing.style.strokeDasharray = CIRCUMFERENCE;
  progressRing.style.strokeDashoffset = offset;
}

function startTimer() {
  if (isRunning) return;
  
  isRunning = true;
  timerDisplay.classList.add('running');
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    if (timeRemaining <= 0) {
      timerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  
  isRunning = false;
  timerDisplay.classList.remove('running');
  clearInterval(timerInterval);
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function resetTimer() {
  pauseTimer();
  timeRemaining = isFocusMode ? FOCUS_TIME : BREAK_TIME;
  updateTimerDisplay();
}

function timerComplete() {
  pauseTimer();
  playNotificationSound();
  
  if (isFocusMode) {
    // Completed a focus session
    stats.focusSessions++;
    saveStats();
    updateStatsDisplay();
    
    // Switch to break mode
    isFocusMode = false;
    timerMode.textContent = 'Break';
    timerMode.classList.add('break');
    progressRing.classList.add('break');
    timeRemaining = BREAK_TIME;
  } else {
    // Break is over, switch back to focus
    isFocusMode = true;
    timerMode.textContent = 'Focus';
    timerMode.classList.remove('break');
    progressRing.classList.remove('break');
    timeRemaining = FOCUS_TIME;
  }
  
  updateTimerDisplay();
}

function playNotificationSound() {
  try {
    notificationSound.currentTime = 0;
    notificationSound.play().catch(() => {
      // Audio play failed, likely due to autoplay restrictions
    });
  } catch (e) {
    // Sound not available
  }
}

// ============================================
// Task Functions
// ============================================

function loadTasks() {
  const savedTasks = localStorage.getItem('focusflow-tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
    renderTasks();
  }
}

function saveTasks() {
  localStorage.setItem('focusflow-tasks', JSON.stringify(tasks));
}

function addTask(text) {
  const task = {
    id: Date.now(),
    text: text.trim(),
    completed: false
  };
  
  tasks.unshift(task);
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    
    if (task.completed) {
      stats.completedTasks++;
      saveStats();
      updateStatsDisplay();
    }
    
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  
  emptyState.classList.remove('visible');
  
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}" aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</span>
      <button class="task-delete" data-id="${task.id}" aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    taskList.appendChild(li);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Stats Functions
// ============================================

function loadStats() {
  const savedStats = localStorage.getItem('focusflow-stats');
  if (savedStats) {
    stats = JSON.parse(savedStats);
    updateStatsDisplay();
  }
}

function saveStats() {
  localStorage.setItem('focusflow-stats', JSON.stringify(stats));
}

function updateStatsDisplay() {
  completedTasksEl.textContent = stats.completedTasks;
  focusSessionsEl.textContent = stats.focusSessions;
}

// ============================================
// Event Listeners
// ============================================

// Timer controls
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Task form submission
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (text) {
    addTask(text);
    taskInput.value = '';
    taskInput.focus();
  }
});

// Task list interactions (event delegation)
taskList.addEventListener('click', (e) => {
  const checkbox = e.target.closest('.task-checkbox');
  const deleteBtn = e.target.closest('.task-delete');
  
  if (checkbox) {
    const id = parseInt(checkbox.dataset.id);
    toggleTask(id);
  }
  
  if (deleteBtn) {
    const id = parseInt(deleteBtn.dataset.id);
    deleteTask(id);
  }
});

// Keyboard accessibility for checkboxes
taskList.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const checkbox = e.target.closest('.task-checkbox');
    if (checkbox) {
      e.preventDefault();
      const id = parseInt(checkbox.dataset.id);
      toggleTask(id);
    }
  }
});

// ============================================
// Initialize App
// ============================================

function init() {
  initTheme();
  loadTasks();
  loadStats();
  updateTimerDisplay();
  
  // Set initial progress ring
  progressRing.style.strokeDasharray = CIRCUMFERENCE;
  progressRing.style.strokeDashoffset = 0;
}

// Run initialization
init();
