// ========== CONFIG ==========
const API_URL = '/api';
let token = localStorage.getItem('adminToken');
let currentAdmin = null;

// ========== UTILITIES ==========
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-5 right-5 px-4 py-2 rounded-lg text-white z-50 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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

// ========== LOGIN ==========
const loginForm = document.getElementById('admin-login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    try {
      const data = await apiCall('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      token = data.token;
      currentAdmin = data.user;
      localStorage.setItem('adminToken', token);
      document.getElementById('admin-login-screen').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      await loadAdminDashboard();
    } catch (error) {
      document.getElementById('admin-login-error').textContent = error.message;
    }
  });
}

// ========== DASHBOARD LAYOUT ==========
async function loadAdminDashboard() {
  const container = document.getElementById('admin-panel');
  container.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <div class="w-64 bg-indigo-800 text-white flex flex-col">
        <div class="p-4 border-b border-indigo-700">
          <h2 class="text-xl font-bold">Admin Panel</h2>
          <p class="text-indigo-200">${currentAdmin?.name || ''}</p>
        </div>
        <nav class="flex-1 p-4 space-y-1">
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="dashboard">📊 Dashboard</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="students">👥 Students</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="tests">📋 Tests</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="results">🏆 Results</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="messages">💬 Messages</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="discussions">📢 Discussions</a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700" data-page="settings">⚙️ Settings</a>
        </nav>
        <div class="p-4 border-t border-indigo-700">
          <button id="admin-logout" class="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">Logout</button>
        </div>
      </div>
      <div class="flex-1 p-8 overflow-auto" id="admin-content"></div>
    </div>
  `;
  
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      switch(page) {
        case 'dashboard': await showAdminDashboard(); break;
        case 'students': await showStudents(); break;
        case 'tests': await showTests(); break;
        case 'results': await showResults(); break;
        case 'messages': await showMessages(); break;
        case 'discussions': await showDiscussions(); break;
        case 'settings': await showSettings(); break;
      }
    });
  });
  
  document.getElementById('admin-logout').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.reload();
  });
  
  await showAdminDashboard();
}

// ========== DASHBOARD STATS ==========
async function showAdminDashboard() {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<p class="text-gray-500">Loading...</p>';
  try {
    const stats = await apiCall('/admin/dashboard');
    content.innerHTML = `
      <h1 class="text-3xl font-bold mb-6">Dashboard</h1>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow">
          <h3 class="text-gray-500">Total Students</h3>
          <p class="text-4xl font-bold">${stats.studentCount}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow">
          <h3 class="text-gray-500">Total Tests</h3>
          <p class="text-4xl font-bold">${stats.testCount}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow">
          <h3 class="text-gray-500">Total Submissions</h3>
          <p class="text-4xl font-bold">${stats.resultCount}</p>
        </div>
      </div>
      <div class="bg-white p-6 rounded-xl shadow">
        <h2 class="text-xl font-semibold mb-4">Recent Results</h2>
        <table class="min-w-full">
          <thead><tr><th>Student</th><th>Test</th><th>Score</th><th>Rank</th><th>Date</th></tr></thead>
          <tbody>
            ${stats.recentResults.map(r => `
              <tr><td>${r.studentId.name}</td><td>${r.testId.title}</td><td>${r.score}</td><td>${r.rank}</td><td>${new Date(r.submittedAt).toLocaleString()}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

// ========== STUDENT MANAGEMENT ==========
async function showStudents() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Students</h1>
      <button id="add-student-btn" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">+ Add Student</button>
    </div>
    <div id="students-table-container" class="bg-white rounded-xl shadow overflow-hidden"></div>
    <div id="student-form-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"></div>
  `;
  await loadStudentsTable();
  document.getElementById('add-student-btn').addEventListener('click', () => showStudentForm());
}

async function loadStudentsTable() {
  try {
    const students = await apiCall('/admin/students');
    const container = document.getElementById('students-table-container');
    container.innerHTML = `
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3">ID</th><th>Name</th><th>Class</th><th>Email</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr class="border-t">
              <td class="px-6 py-4">${s.studentId}</td>
              <td>${s.name}</td>
              <td>${s.class}</td>
              <td>${s.email || '-'}</td>
              <td>${s.isBlocked ? '<span class="text-red-600">Blocked</span>' : '<span class="text-green-600">Active</span>'}</td>
              <td>
                <button class="text-indigo-600 hover:underline edit-student" data-id="${s._id}">Edit</button>
                ${s.isBlocked 
                  ? `<button class="text-green-600 hover:underline ml-2 unblock-student" data-id="${s._id}">Unblock</button>`
                  : `<button class="text-red-600 hover:underline ml-2 block-student" data-id="${s._id}">Block</button>`
                }
                <button class="text-red-600 hover:underline ml-2 delete-student" data-id="${s._id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    // Add event listeners for actions...
  } catch (error) {
    container.innerHTML = `<p class="text-red-500 p-4">Error: ${error.message}</p>`;
  }
}

// Similar functions for Tests, Results, Messages, Discussions, Settings (change password)...
// For brevity, I'm not including every single function, but they follow the pattern of API calls and rendering.

// ========== INIT ==========
if (token) {
  (async () => {
    try {
      const user = await apiCall('/auth/me');
      currentAdmin = user;
      document.getElementById('admin-login-screen')?.classList.add('hidden');
      document.getElementById('admin-panel')?.classList.remove('hidden');
      await loadAdminDashboard();
    } catch (error) {
      localStorage.removeItem('adminToken');
    }
  })();
}
