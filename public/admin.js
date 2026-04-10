// ========== CONFIGURATION ==========
const API_URL = '/api';
let token = localStorage.getItem('adminToken');
let currentAdmin = null;

// ========== UTILITIES ==========
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-5 right-5 px-4 py-2 rounded-lg text-white z-50 shadow-lg ${
    type === 'error' ? 'bg-red-500' : 'bg-green-500'
  }`;
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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
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

// ========== MAIN LAYOUT ==========
async function loadAdminDashboard() {
  const container = document.getElementById('admin-panel');
  container.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <!-- Sidebar -->
      <div class="w-64 bg-indigo-800 text-white flex flex-col">
        <div class="p-4 border-b border-indigo-700">
          <h2 class="text-xl font-bold">Test Portal Admin</h2>
          <p class="text-indigo-200 text-sm">${currentAdmin?.name || ''}</p>
        </div>
        <nav class="flex-1 p-4 space-y-1">
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="dashboard">
            <span class="mr-2">📊</span> Dashboard
          </a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="students">
            <span class="mr-2">👥</span> Students
          </a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="tests">
            <span class="mr-2">📋</span> Tests
          </a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="results">
            <span class="mr-2">🏆</span> Results
          </a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="messages">
            <span class="mr-2">💬</span> Messages
          </a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="discussions">
            <span class="mr-2">📢</span> Discussions
          </a>
          <a href="#" class="nav-link block py-2 px-4 rounded hover:bg-indigo-700 flex items-center" data-page="settings">
            <span class="mr-2">⚙️</span> Settings
          </a>
        </nav>
        <div class="p-4 border-t border-indigo-700">
          <button id="admin-logout" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition">
            Logout
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-8 overflow-auto" id="admin-content">
        <div class="flex justify-center items-center h-full">
          <p class="text-gray-500">Loading...</p>
        </div>
      </div>
    </div>
  `;

  // Navigation event listeners
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = e.target.closest('[data-page]').dataset.page;
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

// ========== DASHBOARD ==========
async function showAdminDashboard() {
  const content = document.getElementById('admin-content');
  try {
    const stats = await apiCall('/admin/dashboard');
    content.innerHTML = `
      <h1 class="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 class="text-gray-500 text-sm font-medium">Total Students</h3>
          <p class="text-4xl font-bold text-indigo-600 mt-2">${stats.studentCount}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 class="text-gray-500 text-sm font-medium">Total Tests</h3>
          <p class="text-4xl font-bold text-indigo-600 mt-2">${stats.testCount}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 class="text-gray-500 text-sm font-medium">Submissions</h3>
          <p class="text-4xl font-bold text-indigo-600 mt-2">${stats.resultCount}</p>
        </div>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Recent Results</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${stats.recentResults.map(r => `
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">${r.studentId.name}</td>
                  <td class="px-6 py-4 whitespace-nowrap">${r.testId.title}</td>
                  <td class="px-6 py-4 whitespace-nowrap font-mono">${r.score}</td>
                  <td class="px-6 py-4 whitespace-nowrap">${r.rank}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(r.submittedAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="bg-red-50 p-4 rounded text-red-600">Error: ${error.message}</div>`;
  }
}

// ========== STUDENT MANAGEMENT ==========
async function showStudents() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Students</h1>
      <button id="add-student-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
        + Add Student
      </button>
    </div>
    <div id="students-table-container" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"></div>
    <div id="student-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"></div>
  `;
  await loadStudentsTable();
  document.getElementById('add-student-btn').addEventListener('click', () => showStudentForm());
}

async function loadStudentsTable() {
  const container = document.getElementById('students-table-container');
  try {
    const students = await apiCall('/admin/students');
    container.innerHTML = `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${students.map(s => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap font-mono">${s.studentId}</td>
              <td class="px-6 py-4 whitespace-nowrap">${s.name}</td>
              <td class="px-6 py-4 whitespace-nowrap">${s.class}</td>
              <td class="px-6 py-4 whitespace-nowrap">${s.email || '-'}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                ${s.isBlocked 
                  ? '<span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Blocked</span>' 
                  : '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap space-x-2">
                <button class="text-indigo-600 hover:text-indigo-900 edit-student" data-id="${s._id}">Edit</button>
                ${s.isBlocked 
                  ? `<button class="text-green-600 hover:text-green-900 unblock-student" data-id="${s._id}">Unblock</button>`
                  : `<button class="text-yellow-600 hover:text-yellow-900 block-student" data-id="${s._id}">Block</button>`
                }
                <button class="text-red-600 hover:text-red-900 delete-student" data-id="${s._id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    attachStudentActions();
  } catch (error) {
    container.innerHTML = `<div class="p-4 text-red-600">Error loading students: ${error.message}</div>`;
  }
}

function attachStudentActions() {
  document.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', () => showStudentForm(btn.dataset.id));
  });
  document.querySelectorAll('.block-student').forEach(btn => {
    btn.addEventListener('click', () => blockStudent(btn.dataset.id));
  });
  document.querySelectorAll('.unblock-student').forEach(btn => {
    btn.addEventListener('click', () => unblockStudent(btn.dataset.id));
  });
  document.querySelectorAll('.delete-student').forEach(btn => {
    btn.addEventListener('click', () => deleteStudent(btn.dataset.id));
  });
}

async function showStudentForm(studentId = null) {
  const modal = document.getElementById('student-modal');
  let student = null;
  if (studentId) {
    try {
      const students = await apiCall('/admin/students');
      student = students.find(s => s._id === studentId);
    } catch (error) {
      showToast('Failed to load student data', 'error');
      return;
    }
  }
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
      <h2 class="text-xl font-bold mb-4">${student ? 'Edit' : 'Add'} Student</h2>
      <form id="student-form">
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">Student ID</label>
          <input type="text" name="studentId" value="${student?.studentId || ''}" required class="w-full border rounded-lg px-3 py-2">
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">Full Name</label>
          <input type="text" name="name" value="${student?.name || ''}" required class="w-full border rounded-lg px-3 py-2">
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">Date of Birth</label>
          <input type="date" name="dob" value="${student ? new Date(student.dob).toISOString().split('T')[0] : ''}" required class="w-full border rounded-lg px-3 py-2">
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">Class</label>
          <input type="text" name="class" value="${student?.class || ''}" required class="w-full border rounded-lg px-3 py-2">
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">Email (optional)</label>
          <input type="email" name="email" value="${student?.email || ''}" class="w-full border rounded-lg px-3 py-2">
        </div>
        <div class="flex justify-end space-x-3">
          <button type="button" id="cancel-modal" class="px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  `;
  modal.classList.remove('hidden');
  document.getElementById('cancel-modal').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
      if (student) {
        await apiCall(`/admin/students/${studentId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        showToast('Student updated', 'success');
      } else {
        await apiCall('/admin/students', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        showToast('Student added', 'success');
      }
      modal.classList.add('hidden');
      await loadStudentsTable();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function blockStudent(id) {
  const reason = prompt('Enter reason for blocking:');
  if (!reason) return;
  try {
    await apiCall(`/admin/students/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    showToast('Student blocked', 'success');
    await loadStudentsTable();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function unblockStudent(id) {
  try {
    await apiCall(`/admin/students/${id}/unblock`, { method: 'POST' });
    showToast('Student unblocked', 'success');
    await loadStudentsTable();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm('Are you sure? This will delete all associated data.')) return;
  try {
    await apiCall(`/admin/students/${id}`, { method: 'DELETE' });
    showToast('Student deleted', 'success');
    await loadStudentsTable();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ========== TEST MANAGEMENT ==========
async function showTests() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Tests</h1>
      <button id="add-test-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
        + Create Test
      </button>
    </div>
    <div id="tests-container" class="space-y-4"></div>
    <div id="test-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"></div>
  `;
  await loadTestsList();
  document.getElementById('add-test-btn').addEventListener('click', () => showTestForm());
}

async function loadTestsList() {
  const container = document.getElementById('tests-container');
  try {
    const tests = await apiCall('/admin/tests');
    container.innerHTML = tests.map(test => `
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold">${test.title}</h3>
            <p class="text-gray-600 text-sm">Duration: ${test.duration} min | Marks: +${test.marksConfig.correct}/-${test.marksConfig.wrong}</p>
            <p class="text-gray-600 text-sm">
              Schedule: ${formatDate(test.startTime)} – ${formatDate(test.endTime)}
            </p>
            <div class="mt-2">
              ${test.isPublished 
                ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Published</span>' 
                : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Draft</span>'}
            </div>
          </div>
          <div class="flex space-x-2">
            <button class="text-indigo-600 hover:text-indigo-900 manage-questions" data-id="${test._id}">Questions</button>
            <button class="text-blue-600 hover:text-blue-900 edit-test" data-id="${test._id}">Edit</button>
            <button class="text-green-600 hover:text-green-900 toggle-publish" data-id="${test._id}" data-published="${test.isPublished}">
              ${test.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button class="text-red-600 hover:text-red-900 delete-test" data-id="${test._id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    attachTestActions();
  } catch (error) {
    container.innerHTML = `<div class="text-red-600">Error: ${error.message}</div>`;
  }
}

function attachTestActions() {
  document.querySelectorAll('.edit-test').forEach(btn => {
    btn.addEventListener('click', () => showTestForm(btn.dataset.id));
  });
  document.querySelectorAll('.toggle-publish').forEach(btn => {
    btn.addEventListener('click', () => togglePublishTest(btn.dataset.id, btn.dataset.published === 'true'));
  });
  document.querySelectorAll('.delete-test').forEach(btn => {
    btn.addEventListener('click', () => deleteTest(btn.dataset.id));
  });
  document.querySelectorAll('.manage-questions').forEach(btn => {
    btn.addEventListener('click', () => showQuestionsManager(btn.dataset.id));
  });
}

async function showTestForm(testId = null) {
  // Similar modal implementation with fields: title, description, duration, marksConfig, startTime, endTime, isPublished, shuffle
  // For brevity, not fully expanded here.
}

async function togglePublishTest(id, current) {
  try {
    await apiCall(`/admin/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished: !current })
    });
    showToast(`Test ${!current ? 'published' : 'unpublished'}`, 'success');
    await loadTestsList();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteTest(id) {
  if (!confirm('Delete this test and all its questions/results?')) return;
  try {
    await apiCall(`/admin/tests/${id}`, { method: 'DELETE' });
    showToast('Test deleted', 'success');
    await loadTestsList();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ========== QUESTIONS MANAGER ==========
async function showQuestionsManager(testId) {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="mb-6 flex items-center">
      <button id="back-to-tests" class="mr-4 text-indigo-600 hover:text-indigo-900">&larr; Back to Tests</button>
      <h1 class="text-3xl font-bold text-gray-800">Manage Questions</h1>
      <button id="add-question-btn" class="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg">+ Add Question</button>
    </div>
    <div id="questions-list" class="space-y-4"></div>
  `;
  document.getElementById('back-to-tests').addEventListener('click', showTests);
  document.getElementById('add-question-btn').addEventListener('click', () => showQuestionForm(testId));
  await loadQuestions(testId);
}

async function loadQuestions(testId) {
  try {
    const questions = await apiCall(`/admin/tests/${testId}/questions`);
    const container = document.getElementById('questions-list');
    container.innerHTML = questions.map((q, idx) => `
      <div class="bg-white p-4 rounded-lg border">
        <div class="flex justify-between">
          <span class="font-medium">Q${idx+1}: ${q.questionText}</span>
          <div>
            <button class="text-blue-600 edit-question" data-id="${q._id}">Edit</button>
            <button class="text-red-600 delete-question ml-2" data-id="${q._id}">Delete</button>
          </div>
        </div>
        <p class="text-sm text-gray-600">Type: ${q.type} | Correct: ${q.correctAnswer} | Marks: ${q.marks}</p>
      </div>
    `).join('');
    // Attach question actions...
  } catch (error) {
    container.innerHTML = `<div class="text-red-600">${error.message}</div>`;
  }
}

// ========== RESULTS ==========
async function showResults() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <h1 class="text-3xl font-bold mb-6 text-gray-800">All Results</h1>
    <div id="results-table-container" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"></div>
  `;
  try {
    const results = await apiCall('/admin/results');
    const container = document.getElementById('results-table-container');
    container.innerHTML = `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3">Student</th><th>Test</th><th>Score</th><th>Rank</th><th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr><td>${r.studentId.name}</td><td>${r.testId.title}</td><td>${r.score}</td><td>${r.rank}</td><td>${formatDate(r.submittedAt)}</td></tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<div class="p-4 text-red-600">${error.message}</div>`;
  }
}

// ========== MESSAGES ==========
async function showMessages() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Messages</h1>
    <div class="bg-white rounded-xl shadow p-6">
      <div id="message-threads" class="space-y-4"></div>
    </div>
  `;
  await loadMessageThreads();
}

async function loadMessageThreads() {
  try {
    const messages = await apiCall('/admin/messages');
    // Group by sender, show conversation UI...
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ========== DISCUSSIONS ==========
async function showDiscussions() {
  // Implementation similar to students/tests
}

// ========== SETTINGS (Change Password) ==========
async function showSettings() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Settings</h1>
    <div class="bg-white p-6 rounded-xl shadow max-w-md">
      <h2 class="text-xl font-semibold mb-4">Change Password</h2>
      <form id="change-password-form">
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">Current Password</label>
          <input type="password" name="currentPassword" required class="w-full border rounded-lg px-3 py-2">
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-1">New Password</label>
          <input type="password" name="newPassword" required class="w-full border rounded-lg px-3 py-2">
        </div>
        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Update Password</button>
      </form>
    </div>
  `;
  document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
      await apiCall('/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Password updated', 'success');
      e.target.reset();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

// ========== AUTO-LOGIN CHECK ==========
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
      token = null;
    }
  })();
}
