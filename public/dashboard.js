// ========== CONFIGURATION ==========
const API_URL = '/api';
let token = localStorage.getItem('token');
let currentUser = null;

// ========== UTILITIES ==========
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = `fixed bottom-5 right-5 px-4 py-2 rounded-lg text-white z-50 transition-opacity ${
    type === 'error' ? 'bg-red-500' : 'bg-green-500'
  }`;
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
  const response = await fetch(`${API_URL}${endpoint}`, { headers, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

// ========== AUTHENTICATION ==========
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('studentId').value;
    const dob = document.getElementById('dob').value;
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ studentId, dob })
      });
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard-screen').classList.remove('hidden');
      await loadDashboard();
    } catch (error) {
      const errorEl = document.getElementById('login-error');
      if (errorEl) errorEl.textContent = error.message;
      if (error.message.includes('blocked')) {
        // Show unblock request button if blocked
        if (data?.unblockRequested === false) {
          const btn = document.createElement('button');
          btn.textContent = 'Request Unblock';
          btn.className = 'mt-2 bg-yellow-500 text-white px-4 py-2 rounded';
          btn.onclick = requestUnblock;
          errorEl.appendChild(btn);
        }
      }
    }
  });
}

async function requestUnblock() {
  try {
    await apiCall('/student/unblock-request', { method: 'POST' });
    showToast('Unblock request sent to admin', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ========== DASHBOARD RENDERING ==========
async function loadDashboard() {
  try {
    const stats = await apiCall('/student/dashboard');
    renderDashboardLayout(stats);
    await showDashboardHome(stats);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderDashboardLayout(stats) {
  const container = document.getElementById('dashboard-screen');
  container.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <!-- Sidebar -->
      <div class="w-64 bg-white shadow-md flex flex-col">
        <div class="p-4 border-b">
          <h2 class="text-xl font-bold">Test Portal</h2>
          <p class="text-gray-600">${stats.profile.name}</p>
          <p class="text-sm text-gray-500">${stats.profile.studentId}</p>
        </div>
        <nav class="flex-1 p-4 space-y-1">
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-gray-200" data-page="dashboard">📊 Dashboard</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-gray-200" data-page="tests">📝 Available Tests</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-gray-200" data-page="results">📈 My Results</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-gray-200" data-page="messages">💬 Messages</a>
        </nav>
        <div class="p-4 border-t">
          <button id="logout-btn" class="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600">Logout</button>
        </div>
      </div>
      <!-- Main Content -->
      <div class="flex-1 p-8 overflow-auto" id="main-content"></div>
    </div>
  `;
  
  // Navigation event listeners
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      switch(page) {
        case 'dashboard': await showDashboardHome(stats); break;
        case 'tests': await loadTests(); break;
        case 'results': await loadResults(); break;
        case 'messages': await loadMessages(); break;
      }
    });
  });
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.reload();
  });
}

async function showDashboardHome(stats) {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Dashboard</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white p-6 rounded-xl shadow">
        <h3 class="text-gray-500">Total Tests</h3>
        <p class="text-4xl font-bold">${stats.totalTests}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow">
        <h3 class="text-gray-500">Average Score</h3>
        <p class="text-4xl font-bold">${stats.averageScore}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow">
        <h3 class="text-gray-500">Overall Rank</h3>
        <p class="text-4xl font-bold">${stats.rank || 'N/A'}</p>
      </div>
    </div>
    <div class="bg-white p-6 rounded-xl shadow">
      <h2 class="text-xl font-semibold mb-4">Recent Tests</h2>
      <div id="recent-tests"></div>
    </div>
  `;
  const recentDiv = document.getElementById('recent-tests');
  if (stats.recentResults?.length) {
    recentDiv.innerHTML = stats.recentResults.map(r => `
      <div class="border-b py-2 flex justify-between">
        <span>${r.testId.title}</span>
        <span class="font-mono">Score: ${r.score} | Rank: ${r.rank}</span>
      </div>
    `).join('');
  } else {
    recentDiv.innerHTML = '<p class="text-gray-500">No tests taken yet.</p>';
  }
}

// ========== AVAILABLE TESTS ==========
async function loadTests() {
  const main = document.getElementById('main-content');
  main.innerHTML = `<h1 class="text-3xl font-bold mb-6">Available Tests</h1><div id="tests-container">Loading...</div>`;
  try {
    const tests = await apiCall('/student/tests');
    const container = document.getElementById('tests-container');
    if (tests.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No tests available at the moment.</p>';
      return;
    }
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${tests.map(test => `
          <div class="bg-white p-6 rounded-xl shadow">
            <h3 class="text-xl font-semibold">${test.title}</h3>
            <p class="text-gray-600">⏱️ Duration: ${test.duration} mins</p>
            <p class="text-gray-600">📊 Marks: +${test.marksConfig.correct} / -${test.marksConfig.wrong}</p>
            <p class="text-gray-500 text-sm">🗓️ ${formatDate(test.startTime)} - ${formatDate(test.endTime)}</p>
            ${test.submitted 
              ? '<p class="text-green-600 mt-2 font-semibold">✅ Completed</p>' 
              : `<button class="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 start-test" data-id="${test._id}">Start Test</button>`
            }
          </div>
        `).join('')}
      </div>
    `;
    document.querySelectorAll('.start-test').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = `test.html?id=${btn.dataset.id}`;
      });
    });
  } catch (error) {
    main.innerHTML = `<p class="text-red-500">Error loading tests: ${error.message}</p>`;
  }
}

// ========== RESULTS HISTORY ==========
async function loadResults() {
  const main = document.getElementById('main-content');
  main.innerHTML = `<h1 class="text-3xl font-bold mb-6">My Results</h1><div id="results-container">Loading...</div>`;
  try {
    const results = await apiCall('/student/results');
    const container = document.getElementById('results-container');
    if (results.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No results yet.</p>';
      return;
    }
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct/Wrong</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${results.map(r => `
              <tr>
                <td class="px-6 py-4">${r.testId?.title || 'Unknown'}</td>
                <td class="px-6 py-4 font-mono">${r.score}</td>
                <td class="px-6 py-4">${r.correctAnswers} / ${r.wrongAnswers}</td>
                <td class="px-6 py-4">${r.rank}</td>
                <td class="px-6 py-4">${new Date(r.submittedAt).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                  <button class="text-blue-600 hover:underline view-details" data-testid="${r.testId._id}">Details</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', async () => {
        const testId = btn.dataset.testid;
        await loadResultDetail(testId);
      });
    });
  } catch (error) {
    main.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

async function loadResultDetail(testId) {
  const main = document.getElementById('main-content');
  main.innerHTML = `<h1 class="text-3xl font-bold mb-6">Result Details</h1><div id="detail-container">Loading...</div>`;
  try {
    const data = await apiCall(`/student/result/${testId}`);
    const container = document.getElementById('detail-container');
    const result = data.result;
    const answers = data.answers;
    container.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow mb-4">
        <h2 class="text-xl font-semibold">${result.testId?.title || 'Test'}</h2>
        <p class="text-gray-600">Score: ${result.score} | Rank: ${result.rank}</p>
        <p class="text-gray-600">Correct: ${result.correctAnswers} | Wrong: ${result.wrongAnswers} | Skipped: ${result.skipped}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-6">
        <h3 class="font-semibold mb-4">Question-wise Analysis</h3>
        <div class="space-y-4">
          ${answers.map((ans, idx) => {
            const q = ans.questionId;
            const isCorrect = ans.isCorrect;
            return `
              <div class="border p-4 rounded ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <p class="font-medium">Q${idx+1}: ${q.questionText}</p>
                <p class="mt-1">Your answer: ${ans.selectedAnswer || '<span class="text-gray-400">Not answered</span>'}</p>
                <p>Correct answer: ${q.correctAnswer}</p>
                <p class="font-mono">Marks: ${ans.marksObtained ?? 0}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <button class="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="loadResults()">← Back to Results</button>
    `;
  } catch (error) {
    main.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

// ========== MESSAGING ==========
async function loadMessages() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Messages</h1>
    <div class="bg-white rounded-xl shadow p-6">
      <div id="message-list" class="h-96 overflow-y-auto mb-4 space-y-3"></div>
      <div class="flex gap-2">
        <input type="text" id="message-input" placeholder="Type your message..." class="flex-1 border rounded-lg px-4 py-2">
        <button id="send-message" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Send</button>
      </div>
    </div>
  `;
  await refreshMessages();
  document.getElementById('send-message').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

async function refreshMessages() {
  try {
    const messages = await apiCall('/student/messages');
    const list = document.getElementById('message-list');
    if (messages.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-center">No messages yet.</p>';
      return;
    }
    list.innerHTML = messages.map(msg => {
      const isOwn = msg.senderId === currentUser?.id;
      return `
        <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
          <div class="max-w-xs px-4 py-2 rounded-lg ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}">
            <p>${msg.message}</p>
            <p class="text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}">${new Date(msg.createdAt).toLocaleTimeString()}</p>
          </div>
        </div>
      `;
    }).join('');
    list.scrollTop = list.scrollHeight;
  } catch (error) {
    showToast('Failed to load messages', 'error');
  }
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (!message) return;
  try {
    await apiCall('/student/message', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    input.value = '';
    await refreshMessages();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ========== INITIALIZATION ==========
if (token) {
  // Try to auto-login
  (async () => {
    try {
      const user = await apiCall('/auth/me');
      currentUser = user;
      document.getElementById('login-screen')?.classList.add('hidden');
      document.getElementById('dashboard-screen')?.classList.remove('hidden');
      await loadDashboard();
    } catch (error) {
      localStorage.removeItem('token');
      token = null;
    }
  })();
}
