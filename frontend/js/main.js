const API_URL = 'http://localhost:3000/api';

// Elements
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

// Buttons
const btns = {
    dashboard: document.getElementById('dashboard-btn'),
    studentNewAgreement: document.getElementById('student-new-agreement-btn'),
    adminManage: document.getElementById('admin-manage-btn'),
    adminAddUni: document.getElementById('admin-add-university-btn'),
    adminAddDeg: document.getElementById('admin-add-degree-btn'),
    adminAddCourse: document.getElementById('admin-add-course-btn'),
    adminCreateUser: document.getElementById('admin-create-user-btn'),
    announcements: document.getElementById('announcements-btn'),
    profile: document.getElementById('profile-btn'),
    logout: document.getElementById('logout-btn')
};

// Sections
const contents = {
    dashboard: document.getElementById('dashboard-content'),
    newAgreement: document.getElementById('new-agreement-content'),
    announcements: document.getElementById('announcements-content'),
    profile: document.getElementById('profile-content'),
    adminManage: document.getElementById('admin-manage-content'),
    adminAddUni: document.getElementById('admin-add-university-content'),
    adminAddDeg: document.getElementById('admin-add-degree-content'),
    adminAddCourse: document.getElementById('admin-add-course-content'),
    adminCreateUser: document.getElementById('admin-create-user-content')
};

// Forms
const agreementForm = document.getElementById('agreement-form');
const originUniSelect = document.getElementById('origin-university');
const destUniSelect = document.getElementById('destination-university');
const agreementDurationSelect = document.getElementById('agreement-duration');
const coursePairDiv = document.getElementById('course-pairing-section');
const originCourseSel = document.getElementById('select-origin-course');
const destCourseSel = document.getElementById('select-destination-course');
const addPairBtn = document.getElementById('add-course-pair-btn');
const pairList = document.getElementById('course-pairs-list');
const aiRecommendBtn = document.getElementById('ai-recommend-btn');
const recommendationText = document.getElementById('recommendation-text');

// Admin Inputs
const adminSearchForm = document.getElementById('admin-search-form');
const adminSearchInput = document.getElementById('admin-search-input');
const adminSearchResults = document.getElementById('admin-search-results');
const announcementForm = document.getElementById('announcement-form');
const announcementsList = document.getElementById('announcements-list');

// State
let currentPairs = [];
let currentUser = {};
let statusChartInstance = null;
let destChartInstance = null;

// Init
AOS.init();
feather.replace();

async function apiFetch(url, options = {}) {
    options.headers = { 'Content-Type': 'application/json', ...options.headers };
    try {
        const res = await fetch(API_URL + url, options);
        if (!res.ok) throw new Error((await res.json()).message || 'API Error');
        if (res.status === 204) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
}

// Auth
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const data = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ username: user, password: pass }) });
        
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userRole', data.role);
        
        loginPage.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initApp(data.role);
    } catch (err) {
        document.getElementById('login-error').classList.remove('hidden');
        document.getElementById('login-error').textContent = err.message;
    }
});

btns.logout.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// Navigation
mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('-translate-x-full'));

function navigate(key) {
    Object.values(contents).forEach(el => el.classList.add('hidden'));
    if (contents[key]) contents[key].classList.remove('hidden');
}

function initApp(role) {
    if (role === 'student') {
        btns.studentNewAgreement.classList.remove('hidden');
        navigate('dashboard');
        loadStudentDashboard();
    } else if (role === 'admin') {
        btns.adminManage.classList.remove('hidden');
        btns.adminAddUni.classList.remove('hidden');
        btns.adminAddDeg.classList.remove('hidden');
        btns.adminAddCourse.classList.remove('hidden');
        btns.adminCreateUser.classList.remove('hidden');
        announcementForm.classList.remove('hidden');
        navigate('adminManage');
        loadAdminDashboard('');
        loadAdminDropdowns();
        loadAdminStats();
    }
    loadProfile();
    loadAnnouncements();

    btns.dashboard.onclick = () => role === 'student' ? navigate('dashboard') : navigate('adminManage');
    btns.studentNewAgreement.onclick = () => { navigate('newAgreement'); loadNewAgreementForm(); };
    btns.adminManage.onclick = () => navigate('adminManage');
    btns.adminAddUni.onclick = () => navigate('adminAddUni');
    btns.adminAddDeg.onclick = () => navigate('adminAddDeg');
    btns.adminAddCourse.onclick = () => navigate('adminAddCourse');
    btns.adminCreateUser.onclick = () => navigate('adminCreateUser');
    btns.announcements.onclick = () => navigate('announcements');
    btns.profile.onclick = () => navigate('profile');
}

async function loadProfile() {
    const uid = localStorage.getItem('userId');
    currentUser = await apiFetch(`/profile/${uid}`);
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-university').textContent = currentUser.university.name;
    document.getElementById('profile-degree').textContent = currentUser.degree ? currentUser.degree.name : 'N/A';
}

// Student Dashboard
async function loadStudentDashboard() {
    const container = document.getElementById('agreements-container');
    container.innerHTML = 'Loading...';
    const data = await apiFetch(`/agreements/${localStorage.getItem('userId')}`);
    container.innerHTML = '';
    data.forEach(agg => {
        const color = agg.status === 'Approved' ? 'green' : (agg.status === 'Rejected' ? 'red' : 'yellow');
        let coursesHtml = '<ul class="text-sm text-gray-600 list-disc list-inside mt-2">';
        agg.courses_list.forEach(p => coursesHtml += `<li>${p.origin_name} -> ${p.destination_name}</li>`);
        coursesHtml += '</ul>';
        
        container.innerHTML += `
            <div class="bg-white p-4 rounded shadow border-l-4 border-${color}-500">
                <h3 class="font-bold">To: ${agg.destUni}</h3>
                <p class="text-sm">${agg.duration} - ${agg.status}</p>
                ${coursesHtml}
                <a href="${API_URL}/agreements/${agg.id}/download" target="_blank" class="text-indigo-600 text-sm underline mt-2 block">Download PDF</a>
            </div>`;
    });
}

// New Agreement Logic
async function loadNewAgreementForm() {
    currentPairs = [];
    renderPairs();
    const unis = await apiFetch('/universities');
    
    originUniSelect.innerHTML = `<option value="${currentUser.university.id}">${currentUser.university.name}</option>`;
    destUniSelect.innerHTML = '<option value="">Select...</option>';
    unis.forEach(u => {
        if(u.id !== currentUser.university.id) 
            destUniSelect.innerHTML += `<option value="${u.id}">${u.name}</option>`;
    });
    coursePairDiv.classList.add('hidden');
}

destUniSelect.addEventListener('change', async () => {
    if(!destUniSelect.value) return;
    coursePairDiv.classList.remove('hidden');
    
    const [origC, destC] = await Promise.all([
        apiFetch(`/courses?universityId=${currentUser.university.id}&degreeId=${currentUser.degree.id}`),
        apiFetch(`/courses?universityId=${destUniSelect.value}&degreeId=${currentUser.degree.id}`)
    ]);

    originCourseSel.innerHTML = '<option value="">Select Origin</option>';
    origC.forEach(c => originCourseSel.innerHTML += `<option value="${c.id}">${c.name} (${c.credits} ECTS)</option>`);

    destCourseSel.innerHTML = '<option value="">Select Dest</option>';
    destC.forEach(c => destCourseSel.innerHTML += `<option value="${c.id}">${c.name} (${c.credits} ECTS)</option>`);
});

// AI Logic
originCourseSel.addEventListener('change', () => {
    if (originCourseSel.value) {
        aiRecommendBtn.classList.remove('hidden');
        recommendationText.textContent = '';
    } else {
        aiRecommendBtn.classList.add('hidden');
    }
});

aiRecommendBtn.addEventListener('click', async () => {
    const originId = originCourseSel.value;
    const destUniId = destUniSelect.value;
    const myDegreeId = currentUser.degree.id;

    if (!originId || !destUniId) return;
    recommendationText.textContent = 'Analyzing...';
    try {
        const recs = await apiFetch('/recommendations', { 
            method: 'POST', 
            body: JSON.stringify({ originCourseId: originId, destUniId: destUniId, degreeId: myDegreeId }) 
        });
        if (recs.length > 0) {
            destCourseSel.value = recs[0].id;
            recommendationText.textContent = `Best match: ${Math.round(recs[0].score * 100)}%`;
        } else { recommendationText.textContent = 'No match found.'; }
    } catch (e) { recommendationText.textContent = 'Error.'; }
});

addPairBtn.onclick = () => {
    const oId = originCourseSel.value;
    const dId = destCourseSel.value;
    if(!oId || !dId) return alert('Select both courses');
    
    currentPairs.push({
        originId: oId, 
        originName: originCourseSel.options[originCourseSel.selectedIndex].text,
        destId: dId,
        destName: destCourseSel.options[destCourseSel.selectedIndex].text
    });
    renderPairs();
};

function renderPairs() {
    pairList.innerHTML = '';
    currentPairs.forEach((p, i) => {
        pairList.innerHTML += `<li>${p.originName} <-> ${p.destName} <button onclick="removePair(${i})" class="text-red-500 ml-2">x</button></li>`;
    });
}
window.removePair = (i) => { currentPairs.splice(i, 1); renderPairs(); };

agreementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(currentPairs.length === 0) return alert('Add courses first');
    try {
        const res = await apiFetch('/agreements', {
            method: 'POST',
            body: JSON.stringify({
                userId: localStorage.getItem('userId'),
                originUniversity: currentUser.university.id,
                destinationUniversity: destUniSelect.value,
                duration: agreementDurationSelect.value,
                coursePairs: currentPairs.map(p => ({ originId: p.originId, destId: p.destId }))
            })
        });
        // Auto Download
        const a = document.createElement('a');
        a.href = `${API_URL}/agreements/${res.agreementId}/download`;
        a.target = '_blank';
        a.click();
        
        alert('Agreement Created! Check email.');
        agreementForm.reset();
        currentPairs = [];
        navigate('dashboard');
        loadStudentDashboard();
    } catch(err) { alert(err.message); }
});

// Admin Dashboard
async function loadAdminDashboard(query) {
    const container = document.getElementById('admin-search-results');
    container.innerHTML = 'Loading...';
    try {
        const aggs = await apiFetch(`/admin/agreements/search?query=${encodeURIComponent(query)}`);
        if (aggs.length === 0) { container.innerHTML = '<p class="text-center p-6">No agreements found.</p>'; return; }
        
        let html = '<table class="w-full text-left"><thead><tr class="bg-gray-100"><th>Student</th><th>Details</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        aggs.forEach(a => {
            let actions = `<button onclick="setStatus(${a.id}, 'Approved')" class="text-green-600 mr-2">Approve</button><button onclick="setStatus(${a.id}, 'Rejected')" class="text-red-600">Reject</button>`;
            if(a.status !== 'Draft') actions = '-';
            let courses = '<ul class="text-xs">';
            a.courses_list.forEach(p => courses += `<li>${p.origin_name} -> ${p.destination_name}</li>`);
            courses += '</ul>';

            html += `<tr>
                <td class="p-2 font-bold">${a.studentName}</td>
                <td class="p-2 text-sm">${a.originUni} -> ${a.destUni}<br><span class="text-xs text-indigo-600">${a.duration}</span><br>${courses}</td>
                <td class="p-2">${a.status}</td>
                <td class="p-2">${actions}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) { container.innerHTML = 'Error loading.'; }
}

adminSearchForm.addEventListener('submit', (e) => { e.preventDefault(); loadAdminDashboard(adminSearchInput.value); });

window.setStatus = async (id, status) => {
    await apiFetch(`/admin/agreements/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    loadAdminDashboard('');
};

// Admin Creation Forms & Dropdowns
async function loadAdminDropdowns() {
    const [d, u] = await Promise.all([apiFetch('/degrees'), apiFetch('/universities')]);
    const pop = (id, data) => document.getElementById(id).innerHTML = `<option value="">Select</option>` + data.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
    
    pop('course-uni-select', u); pop('course-degree-select', d);
    pop('user-uni', u); pop('user-degree', d);
    pop('announcement-target-university', u); pop('announcement-target-degree', d);
}

document.getElementById('admin-add-university-form').onsubmit = async (e) => {
    e.preventDefault();
    await apiFetch('/admin/universities/new', { method: 'POST', body: JSON.stringify({ name: document.getElementById('university-name').value }) });
    alert('University added'); e.target.reset(); loadAdminDropdowns();
};

document.getElementById('admin-add-degree-form').onsubmit = async (e) => {
    e.preventDefault();
    await apiFetch('/admin/degrees/new', { method: 'POST', body: JSON.stringify({ name: document.getElementById('degree-name').value }) });
    alert('Degree added'); e.target.reset(); loadAdminDropdowns();
};

document.getElementById('add-course-form').onsubmit = async (e) => {
    e.preventDefault();
    await apiFetch('/admin/courses/new', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('course-name').value,
        credits: document.getElementById('course-credits').value,
        period: document.getElementById('course-period').value,
        degree_id: courseDegreeSelect.value,
        university_id: courseUniversitySelect.value
    })});
    alert('Course added'); e.target.reset();
};

document.getElementById('admin-create-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const role = document.getElementById('user-role-select').value;
    await apiFetch('/admin/users/new', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('user-fullname').value,
        email: document.getElementById('user-email').value,
        dni: document.getElementById('user-dni').value,
        dob: document.getElementById('user-dob').value,
        username: document.getElementById('user-username').value,
        password: document.getElementById('user-password').value,
        role: role,
        university_id: userUniversitySelect.value,
        degree_id: role === 'student' ? userDegreeSelect.value : null
    })});
    alert('User Created'); e.target.reset();
};

document.getElementById('user-role-select').addEventListener('change', (e) => {
    document.getElementById('user-degree-wrapper').classList.toggle('hidden', e.target.value !== 'student');
});

// Announcements
async function loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    list.innerHTML = 'Loading...';
    const uid = localStorage.getItem('userId');
    if(!uid) return;
    
    try {
        const posts = await apiFetch(`/announcements?userId=${uid}`);
        list.innerHTML = '';
        const isAdmin = localStorage.getItem('userRole') === 'admin';
        
        posts.forEach(p => {
            let del = isAdmin ? `<button onclick="delPost(${p.id})" class="text-red-500 float-right text-sm">Delete</button>` : '';
            let img = p.image_url ? `<img src="${p.image_url}" class="w-full h-32 object-cover mb-2">` : '';
            list.innerHTML += `<div class="bg-white p-4 rounded shadow border mb-4">${img}<h3 class="font-bold">${p.title}</h3><p class="text-sm text-gray-500">${p.created_at}</p><p class="mt-2">${p.content}</p>${del}</div>`;
        });
    } catch(e) { list.innerHTML = 'Error loading news.'; }
}

announcementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await apiFetch('/admin/announcements/new', { method: 'POST', body: JSON.stringify({
        title: document.getElementById('announcement-title').value,
        content: document.getElementById('announcement-content').value,
        image_url: document.getElementById('announcement-image-url').value,
        user_id: localStorage.getItem('userId'),
        target_university_id: document.getElementById('announcement-target-university').value || null,
        target_degree_id: document.getElementById('announcement-target-degree').value || null
    })});
    alert('Posted'); e.target.reset(); loadAnnouncements();
});

window.delPost = async (id) => {
    if(confirm('Delete?')) { await apiFetch(`/admin/announcements/${id}`, { method: 'DELETE' }); loadAnnouncements(); }
};

// Statistics
async function loadAdminStats() {
    try {
        const stats = await apiFetch('/admin/stats');
        const ctxS = document.getElementById('statusChart').getContext('2d');
        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(ctxS, { type: 'doughnut', data: { labels: ['Draft','Approved','Rejected'], datasets: [{ data: [stats.statusCounts['Draft']||0, stats.statusCounts['Approved']||0, stats.statusCounts['Rejected']||0], backgroundColor: ['#FCD34D','#34D399','#F87171'] }] } });

        const ctxD = document.getElementById('destChart').getContext('2d');
        if (destChartInstance) destChartInstance.destroy();
        destChartInstance = new Chart(ctxD, { type: 'bar', data: { labels: stats.topDestinations.map(d=>d.name), datasets: [{ label: 'Agreements', data: stats.topDestinations.map(d=>d.count), backgroundColor: '#6366F1' }] } });
    } catch (e) { console.error(e); }
}