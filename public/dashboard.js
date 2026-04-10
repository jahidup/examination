// Global variables
const API_URL = '/api';
let token = localStorage.getItem('token');
let currentUser = null;

// Utility: Toast
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `fixed bottom-5 right-5 px-4 py-2 rounded-lg text-white ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// API calls
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
  const response = await fetch(`${API_URL}${endpoint}`, { headers, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

// Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
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
    loadDashboard();
  } catch (error) {
    document.getElementById('login-error').textContent = error.message;
  }
});

// Load Dashboard
async function loadDashboard() {
  try {
    const stats = await apiCall('/student/dashboard');
    const tests = await apiCall('/student/tests');
    renderDashboard(stats, tests);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderDashboard(stats, tests) {
  const container = document.getElementById('dashboard-screen');
  container.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <!-- Sidebar -->
      <div class="w-64 bg-white shadow-md">
        <div class="p-4 border-b">
          <h2 class="text-xl font-bold">Test Portal</h2>
          <p class="text-gray-600">${stats.profile.name}</p>
        </div>
        <nav class="p-4">
          <a href="#" class="block py-2 px-4 rounded hover:bg-gray-200" data-page="dashboard">Dashboard</a>
          <a href="#" class="block py-2 px-4 rounded hover:bg-gray-200" data-page="tests">Available Tests</a>
          <a href="#" class="block py-2 px-4 rounded hover:bg-gray-200" data-page="results">My Results</a>
          <a href="#" class="block py-2 px-4 rounded hover:bg-gray-200" data-page="messages">Messages</a>
          <a href="#" class="block py-2 px-4 rounded hover:bg-gray-200" id="logout-btn">Logout</a>
        </nav>
      </div>
      <!-- Main Content -->
      <div class="flex-1 p-8 overflow-auto" id="main-content">
        <h1 class="text-3xl font-bold mb-6">Dashboard</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-xl shadow">
            <h3 class="text-gray-500">Total Tests</h3>
            <p class="text-3xl font-bold">${stats.totalTests}</p>
          </div>
          <div class="bg-white p-6 rounded-xl shadow">
            <h3 class="text-gray-500">Average Score</h3>
            <p class="text-3xl font-bold">${stats.averageScore}</p>
          </div>
          <div class="bg-white p-6 rounded-xl shadow">
            <h3 class="text-gray-500">Rank</h3>
            <p class="text-3xl font-bold">${stats.rank}</p>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow">
          <h2 class="text-xl font-semibold mb-4">Recent Tests</h2>
          <div id="recent-tests"></div>
        </div>
      </div>
    </div>
  `;
  
  // Render recent tests
  const recentDiv = document.getElementById('recent-tests');
  if (stats.recentResults.length) {
    recentDiv.innerHTML = stats.recentResults.map(r => `
      <div class="border-b py-2 flex justify-between">
        <span>${r.testId.title}</span>
        <span>Score: ${r.score} | Rank: ${r.rank}</span>
      </div>
    `).join('');
  } else {
    recentDiv.innerHTML = '<p class="text-gray-500">No tests taken yet.</p>';
  }
  
  // Navigation
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      if (page === 'tests') loadTests();
      else if (page === 'results') loadResults();
      else if (page === 'messages') loadMessages();
      else if (page === 'dashboard') loadDashboard();
    });
  });
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.reload();
  });
}

async function loadTests() {
  try {
    const tests = await apiCall('/student/tests');
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <h1 class="text-3xl font-bold mb-6">Available Tests</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${tests.map(test => `
          <div class="bg-white p-6 rounded-xl shadow">
            <h3 class="text-xl font-semibold">${test.title}</h3>
            <p class="text-gray-600">Duration: ${test.duration} mins</p>
            <p class="text-gray-600">Marks: +${test.marksConfig.correct} / -${test.marksConfig.wrong}</p>
            ${test.submitted 
              ? '<p class="text-green-600 mt-2">Completed</p>' 
              : `<button class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 start-test" data-id="${test._id}">Start Test</button>`
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
    showToast(error.message, 'error');
  }
}

// Additional functions: loadResults, loadMessages would be implemented similarly.
// For brevity, not all included here but follow same pattern.

// Check if already logged in
if (token) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  loadDashboard();
}
