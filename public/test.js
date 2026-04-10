// ========== CONFIG ==========
const API_URL = '/api';
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

let testData = null;
let questions = [];
let currentIndex = 0;
let responseId = null;
let endTime = null;
let timerInterval = null;
let flaggedQuestions = new Set();
let answers = {}; // questionId -> selectedAnswer
let autoSaveTimeout = null;

const urlParams = new URLSearchParams(window.location.search);
const testId = urlParams.get('id');

// ========== API HELPERS ==========
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
  const response = await fetch(`${API_URL}${endpoint}`, { headers, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Debounced auto-save
function autoSaveAnswer(questionId, selectedAnswer) {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      await apiCall('/student/submit-answer', {
        method: 'POST',
        body: JSON.stringify({ responseId, questionId, selectedAnswer })
      });
      console.log('Answer auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 1000);
}

// ========== TEST LOADING ==========
async function loadTest() {
  try {
    testData = await apiCall(`/student/test/${testId}`);
    questions = testData.questions;
    responseId = testData.responseId;
    endTime = new Date(testData.endTime);
    
    // Prepopulate answers from response if any
    const response = await apiCall(`/student/test/${testId}`); // we need answers from response; better to have separate endpoint but we'll use the data from testData if available.
    // Actually the response object is inside testData.response? We'll store answers separately.
    
    renderTestInterface();
    startTimer();
    renderQuestion();
    renderPalette();
  } catch (error) {
    alert('Error loading test: ' + error.message);
    window.location.href = 'index.html';
  }
}

function renderTestInterface() {
  document.getElementById('test-title').textContent = testData.test.title;
}

// ========== TIMER ==========
function startTimer() {
  function updateTimer() {
    const now = new Date();
    const diff = endTime - now;
    if (diff <= 0) {
      clearInterval(timerInterval);
      document.getElementById('timer').textContent = '00:00';
      document.getElementById('timer').classList.add('timer-red');
      autoSubmitTest();
      return;
    }
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    document.getElementById('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (diff < 60000) {
      document.getElementById('timer').classList.add('timer-red');
    }
  }
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

// ========== QUESTION RENDERING ==========
function renderQuestion() {
  const q = questions[currentIndex];
  const container = document.getElementById('question-container');
  const isFlagged = flaggedQuestions.has(q._id);
  
  let optionsHtml = '';
  if (q.type === 'mcq') {
    optionsHtml = q.options.map((opt, idx) => `
      <label class="block p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50 ${answers[q._id] === opt ? 'bg-blue-100 border-blue-500' : ''}">
        <input type="radio" name="answer" value="${opt}" ${answers[q._id] === opt ? 'checked' : ''} class="mr-2">
        ${opt}
      </label>
    `).join('');
  } else {
    optionsHtml = `
      <input type="number" step="any" id="numerical-answer" value="${answers[q._id] || ''}" 
             class="w-full p-3 border rounded-lg" placeholder="Enter numerical value">
    `;
  }
  
  container.innerHTML = `
    <div class="mb-4 flex justify-between">
      <span class="text-sm font-medium text-gray-500">Question ${currentIndex + 1} of ${questions.length}</span>
      ${isFlagged ? '<span class="text-yellow-600">🚩 Flagged for review</span>' : ''}
    </div>
    <h2 class="text-xl font-semibold mb-4">${q.questionText}</h2>
    <div id="options-container">
      ${optionsHtml}
    </div>
  `;
  
  // Attach event listeners
  if (q.type === 'mcq') {
    document.querySelectorAll('input[name="answer"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        answers[q._id] = e.target.value;
        autoSaveAnswer(q._id, e.target.value);
        updatePalette();
      });
    });
  } else {
    const numInput = document.getElementById('numerical-answer');
    numInput.addEventListener('input', (e) => {
      answers[q._id] = e.target.value;
      autoSaveAnswer(q._id, e.target.value);
      updatePalette();
    });
  }
  
  // Update navigation buttons
  document.getElementById('prev-btn').disabled = currentIndex === 0;
  document.getElementById('next-btn').disabled = currentIndex === questions.length - 1;
}

function updatePalette() {
  renderPalette();
}

function renderPalette() {
  const palette = document.getElementById('palette');
  palette.innerHTML = '';
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.className = 'w-8 h-8 rounded-full text-sm font-medium';
    
    if (answers[q._id]) {
      btn.classList.add('bg-green-500', 'text-white');
    } else if (flaggedQuestions.has(q._id)) {
      btn.classList.add('bg-yellow-500', 'text-white');
    } else {
      btn.classList.add('bg-gray-200', 'text-gray-700');
    }
    if (i === currentIndex) {
      btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
    }
    btn.addEventListener('click', () => {
      currentIndex = i;
      renderQuestion();
      renderPalette();
    });
    palette.appendChild(btn);
  }
}

// ========== ACTIONS ==========
document.getElementById('prev-btn')?.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
    renderPalette();
  }
});

document.getElementById('next-btn')?.addEventListener('click', () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
    renderPalette();
  }
});

document.getElementById('clear-btn')?.addEventListener('click', () => {
  const q = questions[currentIndex];
  delete answers[q._id];
  autoSaveAnswer(q._id, '');
  renderQuestion();
  renderPalette();
});

document.getElementById('flag-btn')?.addEventListener('click', () => {
  const q = questions[currentIndex];
  if (flaggedQuestions.has(q._id)) {
    flaggedQuestions.delete(q._id);
  } else {
    flaggedQuestions.add(q._id);
  }
  renderQuestion();
  renderPalette();
});

document.getElementById('submit-test')?.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to submit the test?')) return;
  await submitTest();
});

async function submitTest() {
  try {
    const result = await apiCall('/student/submit-test', {
      method: 'POST',
      body: JSON.stringify({ responseId })
    });
    clearInterval(timerInterval);
    alert(`Test submitted! Your score: ${result.score}, Rank: ${result.rank}`);
    window.location.href = 'index.html';
  } catch (error) {
    alert('Submit failed: ' + error.message);
  }
}

async function autoSubmitTest() {
  alert('Time is up! Submitting automatically.');
  await submitTest();
}

// ========== START ==========
loadTest();
