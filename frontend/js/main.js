// frontend/js/main.js

const API_URL = 'http://localhost:3000/api';

const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');
const loginError = document.getElementById('login-error');
const aiRecommendBtn = document.getElementById('ai-recommend-btn');
const recommendationText = document.getElementById('recommendation-text');

const dashboardBtn = document.getElementById('dashboard-btn');
const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const studentNewAgreementBtn = document.getElementById('student-new-agreement-btn');
const adminManageBtn = document.getElementById('admin-manage-btn');
const adminAddCourseBtn = document.getElementById('admin-add-course-btn');
const adminCreateUserBtn = document.getElementById('admin-create-user-btn');
const adminAddUniversityBtn = document.getElementById('admin-add-university-btn');
const adminAddDegreeBtn = document.getElementById('admin-add-degree-btn');
const announcementsBtn = document.getElementById('announcements-btn');

const announcementsContent = document.getElementById('announcements-content');
const announcementForm = document.getElementById('announcement-form');
const announcementsList = document.getElementById('announcements-list');
const announcementTargetDegree = document.getElementById('announcement-target-degree');
const announcementTargetUniversity = document.getElementById('announcement-target-university');
const addCourseForm = document.getElementById('add-course-form');
const courseDegreeSelect = document.getElementById('course-degree');
const courseUniversitySelect = document.getElementById('course-university');
const adminManageContent = document.getElementById('admin-manage-content');
const adminSearchForm = document.getElementById('admin-search-form');
const adminSearchInput = document.getElementById('admin-search-input');
const adminSearchResults = document.getElementById('admin-search-results');
const adminCreateUserContent = document.getElementById('admin-create-user-content');
const adminCreateUserForm = document.getElementById('admin-create-user-form');
const userRoleSelect = document.getElementById('user-role-select');
const userDegreeWrapper = document.getElementById('user-degree-wrapper');
const userDegreeSelect = document.getElementById('user-degree-select');
const userUniversitySelect = document.getElementById('user-university-select');
const adminAddUniversityContent = document.getElementById('admin-add-university-content');
const adminAddUniversityForm = document.getElementById('admin-add-university-form');
const adminAddDegreeContent = document.getElementById('admin-add-degree-content');
const adminAddDegreeForm = document.getElementById('admin-add-degree-form');

const allContents = {
    dashboard: document.getElementById('dashboard-content'),
    newAgreement: document.getElementById('new-agreement-content'),
    announcements: announcementsContent,
    profile: document.getElementById('profile-content'),
    adminManage: adminManageContent,
    adminAddCourse: document.getElementById('admin-add-course-content'),
    adminCreateUser: adminCreateUserContent,
    adminAddUniversity: adminAddUniversityContent,
    adminAddDegree: adminAddDegreeContent
};

const mobileHeaderTitle = document.getElementById('mobile-header-title');
const agreementsContainer = document.getElementById('agreements-container');

const agreementForm = document.getElementById('agreement-form');
const originUniversitySelect = document.getElementById('origin-university');
const destinationUniversitySelect = document.getElementById('destination-university');
const agreementDurationSelect = document.getElementById('agreement-duration');
const userDegreeEl = document.getElementById('user-degree');
const coursePairingSection = document.getElementById('course-pairing-section');
const selectOriginCourse = document.getElementById('select-origin-course');
const selectDestinationCourse = document.getElementById('select-destination-course');
const addCoursePairBtn = document.getElementById('add-course-pair-btn');
const coursePairsList = document.getElementById('course-pairs-list');

let currentCoursePairs = [];
let userProfileData = {};

AOS.init();
feather.replace();

async function apiFetch(endpoint, options = {}) {
    options.headers = { 'Content-Type': 'application/json', ...options.headers };
    try {
        const response = await fetch(API_URL + endpoint, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'API request failed');
        }
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginError.classList.add('hidden');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const data = await apiFetch('/login', {
           method: 'POST',
           body: JSON.stringify({ username, password })
        });
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userRole', data.role);
        loginPage.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loadInitialData(data.role); 
    } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    userProfileData = {};
    currentCoursePairs = [];
    appContainer.classList.add('hidden');
    loginPage.classList.remove('hidden');
    document.getElementById('username').value = 'student';
    document.getElementById('password').value = 'pass123';
    loginError.classList.add('hidden');
    setupUIForRole(null);
});

mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('-translate-x-full'));
function navigateTo(section) {
    Object.values(allContents).forEach(content => content.classList.add('hidden'));
    if (allContents[section]) {
        allContents[section].classList.remove('hidden');
        let title = section.charAt(0).toUpperCase() + section.slice(1);
        if(section === 'adminManage') title = "Manage Agreements";
        mobileHeaderTitle.textContent = title;
    }
    if (window.innerWidth < 768) sidebar.classList.add('-translate-x-full');
}

dashboardBtn.addEventListener('click', () => navigateTo('dashboard'));
announcementsBtn.addEventListener('click', () => navigateTo('announcements'));
profileBtn.addEventListener('click', () => navigateTo('profile'));
studentNewAgreementBtn.addEventListener('click', () => navigateTo('newAgreement'));
adminManageBtn.addEventListener('click', () => navigateTo('adminManage'));
adminAddCourseBtn.addEventListener('click', () => navigateTo('adminAddCourse'));
adminCreateUserBtn.addEventListener('click', () => navigateTo('adminCreateUser'));
adminAddUniversityBtn.addEventListener('click', () => navigateTo('adminAddUniversity'));
adminAddDegreeBtn.addEventListener('click', () => navigateTo('adminAddDegree'));

async function loadInitialData(role) {
    if (!role) role = localStorage.getItem('userRole');
    setupUIForRole(role);
    await loadUserData();
    loadAnnouncements();
    if (role === 'student') {
        loadAgreements();
        loadUniversitiesForStudentForm();
    } else if (role === 'admin') {
        loadAdminSearchResults('');
        loadAdminCourseForm();
        loadAdminCreateUserForm();
        loadAnnouncementDropdowns();
        loadAdminStats();
    }
}

function setupUIForRole(role) {
    studentNewAgreementBtn.classList.add('hidden');
    adminManageBtn.classList.add('hidden');
    adminAddCourseBtn.classList.add('hidden');
    adminCreateUserBtn.classList.add('hidden');
    adminAddUniversityBtn.classList.add('hidden');
    adminAddDegreeBtn.classList.add('hidden');
    dashboardBtn.classList.add('hidden');
    announcementForm.classList.add('hidden');

    if (role === 'student') {
        dashboardBtn.classList.remove('hidden');
        studentNewAgreementBtn.classList.remove('hidden');
        navigateTo('dashboard');
    } else if (role === 'admin') {
        adminManageBtn.classList.remove('hidden');
        adminAddCourseBtn.classList.remove('hidden');
        adminCreateUserBtn.classList.remove('hidden');
        adminAddUniversityBtn.classList.remove('hidden');
        adminAddDegreeBtn.classList.remove('hidden');
        announcementForm.classList.remove('hidden');
        navigateTo('adminManage');
    }
    feather.replace();
}

async function loadUserData() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
        userProfileData = await apiFetch(`/profile/${userId}`);
        document.getElementById('profile-name').textContent = userProfileData.name;
        document.getElementById('profile-email').textContent = userProfileData.email;
        document.getElementById('profile-username').textContent = userProfileData.username;
        document.getElementById('profile-dni').textContent = userProfileData.dni;
        document.getElementById('profile-dob').textContent = userProfileData.dob;
        document.getElementById('profile-degree').textContent = userProfileData.degree ? userProfileData.degree.name : 'N/A';
        userDegreeEl.textContent = userProfileData.degree ? userProfileData.degree.name : 'N/A';
        document.getElementById('profile-university').textContent = userProfileData.university.name;
    } catch (error) { console.error('Error loading user data', error); }
}

async function loadAgreements() {
    agreementsContainer.innerHTML = '<p>Loading...</p>';
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
        const agreements = await apiFetch(`/agreements/${userId}`);
        agreementsContainer.innerHTML = '';
        if (agreements.length === 0) {
            agreementsContainer.innerHTML = '<p>No agreements found.</p>';
            return;
        }
        agreements.forEach(agg => {
            let statusColor = agg.status === 'Approved' ? 'green' : (agg.status === 'Rejected' ? 'red' : 'yellow');
            let coursesHtml = '<p class="text-sm text-gray-500">No courses.</p>';
            if (agg.courses_list && agg.courses_list.length > 0) {
                coursesHtml = '<ul class="text-sm text-gray-600 list-disc list-inside mt-2">';
                agg.courses_list.forEach(p => coursesHtml += `<li>${p.origin_name} → ${p.destination_name}</li>`);
                coursesHtml += '</ul>';
            }
            agreementsContainer.innerHTML += `
                <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-${statusColor}-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold text-lg">${agg.title}</h3>
                            <p class="text-gray-600 text-sm">${agg.originUni} → ${agg.destUni}</p>
                            <p class="text-sm font-medium text-indigo-600 mt-1">${agg.duration}</p>
                        </div>
                        <span class="bg-${statusColor}-100 text-${statusColor}-800 text-xs px-2 py-1 rounded-full">${agg.status}</span>
                    </div>
                    <div class="mt-4">${coursesHtml}<p class="text-xs text-gray-400 mt-2">Created: ${agg.created}</p></div>
                </div>`;
        });
    } catch (error) { agreementsContainer.innerHTML = '<p class="text-red-600">Error loading agreements.</p>'; }
}

async function loadUniversitiesForStudentForm() {
    try {
        const universities = await apiFetch('/universities');
        originUniversitySelect.innerHTML = '';
        destinationUniversitySelect.innerHTML = '<option value="">Select destination</option>';
        universities.forEach(uni => {
            if (uni.id === userProfileData.university.id) {
                originUniversitySelect.innerHTML += `<option value="${uni.id}" selected>${uni.name}</option>`;
                originUniversitySelect.disabled = true;
            } else {
                destinationUniversitySelect.innerHTML += `<option value="${uni.id}">${uni.name}</option>`;
            }
        });
    } catch (error) { console.error(error); }
}

async function loadCourseDropdowns() {
    const originUniId = userProfileData.university.id;
    const destUniId = destinationUniversitySelect.value;
    if (!destUniId) { coursePairingSection.classList.add('hidden'); return; }
    
    coursePairingSection.classList.remove('hidden');
    selectOriginCourse.innerHTML = '<option>Loading...</option>';
    selectDestinationCourse.innerHTML = '<option>Loading...</option>';
    
    try {
        const [originCourses, destCourses] = await Promise.all([
            apiFetch(`/courses?universityId=${originUniId}&degreeId=${userProfileData.degree.id}`),
            apiFetch(`/courses?universityId=${destUniId}&degreeId=${userProfileData.degree.id}`)
        ]);
        
        const formatOption = (c) => `<option value="${c.id}">${c.name} (${c.credits} ECTS, ${c.period})</option>`;
        
        selectOriginCourse.innerHTML = '<option value="">Select origin course</option>';
        if(originCourses.length) originCourses.forEach(c => selectOriginCourse.innerHTML += formatOption(c));
        
        selectDestinationCourse.innerHTML = '<option value="">Select destination course</option>';
        if(destCourses.length) destCourses.forEach(c => selectDestinationCourse.innerHTML += formatOption(c));
        
    } catch (error) { console.error(error); }
}

function addCoursePair() {
    const oId = selectOriginCourse.value;
    const dId = selectDestinationCourse.value;
    if (!oId || !dId) return alert('Select both courses');
    if (currentCoursePairs.some(p => p.originId === oId || p.destId === dId)) return alert('Duplicate course');
    
    currentCoursePairs.push({
        originId: oId, originText: selectOriginCourse.options[selectOriginCourse.selectedIndex].text,
        destId: dId, destText: selectDestinationCourse.options[selectDestinationCourse.selectedIndex].text
    });
    renderPairs();
    selectOriginCourse.value = '';
    selectDestinationCourse.value = '';
}

function renderPairs() {
    coursePairsList.innerHTML = '';
    if(currentCoursePairs.length === 0) coursePairsList.innerHTML = '<li>No pairs added.</li>';
    currentCoursePairs.forEach((p, i) => {
        coursePairsList.innerHTML += `
            <li class="flex justify-between p-2 bg-gray-50">
                <span>${p.originText} → ${p.destText}</span>
                <button type="button" onclick="removePair(${i})" class="text-red-500">X</button>
            </li>`;
    });
}
window.removePair = (i) => { currentCoursePairs.splice(i, 1); renderPairs(); };

destinationUniversitySelect.addEventListener('change', loadCourseDropdowns);
addCoursePairBtn.addEventListener('click', addCoursePair);

agreementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentCoursePairs.length === 0) return alert('Add course pairs');
    const formData = {
        userId: localStorage.getItem('userId'),
        originUniversity: originUniversitySelect.value,
        destinationUniversity: destinationUniversitySelect.value,
        duration: agreementDurationSelect.value,
        coursePairs: currentCoursePairs.map(p => ({ originId: p.originId, destId: p.destId }))
    };
    try {
        const res = await apiFetch('/agreements', { method: 'POST', body: JSON.stringify(formData) });
        alert('Agreement created! Email sent. Downloading PDF...');
        
        // Auto Download PDF
        const link = document.createElement('a');
        link.href = `${API_URL}/agreements/${res.agreementId}/download`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        agreementForm.reset();
        coursePairingSection.classList.add('hidden');
        currentCoursePairs = [];
        renderPairs();
        loadAgreements();
        navigateTo('dashboard');
    } catch (error) { alert(error.message); }
});

selectOriginCourse.addEventListener('change', () => {
    if (selectOriginCourse.value) {
        aiRecommendBtn.classList.remove('hidden');
        recommendationText.textContent = '';
    } else {
        aiRecommendBtn.classList.add('hidden');
        recommendationText.textContent = '';
    }
});

aiRecommendBtn.addEventListener('click', async () => {
    const originId = selectOriginCourse.value;
    const destUniId = destinationUniversitySelect.value;

    if (!originId || !destUniId) return;

    recommendationText.textContent = 'Analyzing...';
    
    try {
        const recommendations = await apiFetch('/recommendations', {
            method: 'POST',
            body: JSON.stringify({ originCourseId: originId, destUniId: destUniId })
        });

        if (recommendations.length > 0) {
            const bestMatch = recommendations[0];
            selectDestinationCourse.value = bestMatch.id;
            
            const percent = Math.round(bestMatch.score * 100);
            recommendationText.textContent = `Best match: ${percent}% similarity`;
            
            selectDestinationCourse.classList.add('ring-2', 'ring-green-500');
            setTimeout(() => selectDestinationCourse.classList.remove('ring-2', 'ring-green-500'), 1000);
        } else {
            recommendationText.textContent = 'No similar courses found.';
        }
    } catch (error) {
        console.error(error);
        recommendationText.textContent = 'Error in analysis.';
    }
});

async function loadAdminSearchResults(query) {
    adminSearchResults.innerHTML = '<p class="text-center p-6">Loading...</p>';
    try {
        const aggs = await apiFetch(`/admin/agreements/search?query=${encodeURIComponent(query)}`);
        if (aggs.length === 0) { adminSearchResults.innerHTML = '<p class="text-center p-6">No agreements found.</p>'; return; }
        
        let html = `<table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
        
        aggs.forEach(a => {
            let actions = `<button onclick="updateStatus(${a.id}, 'Approved')" class="text-green-600 hover:text-green-900 mr-2">Approve</button><button onclick="updateStatus(${a.id}, 'Rejected')" class="text-red-600 hover:text-red-900">Reject</button>`;
            if(a.status !== 'Draft') actions = '-';
            
            let courses = 'No courses';
            if(a.courses_list && a.courses_list.length) {
                courses = '<ul class="text-xs">';
                a.courses_list.forEach(p => courses += `<li>${p.origin_name} -> ${p.destination_name}</li>`);
                courses += '</ul>';
            }

            html += `<tr>
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${a.studentName}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${a.originUni} -> ${a.destUni}<br>
                    <span class="text-xs text-indigo-600">${a.duration}</span><br>
                    ${courses}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${a.status}</td>
                <td class="px-6 py-4 text-sm font-medium">${actions}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        adminSearchResults.innerHTML = html;
    } catch (e) { adminSearchResults.innerHTML = 'Error loading.'; }
}

window.updateStatus = async (id, status) => {
    try {
        await apiFetch(`/admin/agreements/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
        loadAdminSearchResults(adminSearchInput.value);
    } catch (e) { alert(e.message); }
};

adminSearchForm.addEventListener('submit', (e) => { e.preventDefault(); loadAdminSearchResults(adminSearchInput.value); });

async function loadAdminCourseForm() {
    const [d, u] = await Promise.all([apiFetch('/degrees'), apiFetch('/universities')]);
    courseDegreeSelect.innerHTML = d.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
    courseUniversitySelect.innerHTML = u.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
}
addCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await apiFetch('/admin/courses/new', { method: 'POST', body: JSON.stringify({
            name: document.getElementById('course-name').value,
            credits: document.getElementById('course-credits').value,
            period: document.getElementById('course-period').value,
            degree_id: courseDegreeSelect.value,
            university_id: courseUniversitySelect.value
        })});
        alert('Course added'); addCourseForm.reset();
    } catch (e) { alert(e.message); }
});

async function loadAdminCreateUserForm() {
    const [d, u] = await Promise.all([apiFetch('/degrees'), apiFetch('/universities')]);
    userDegreeSelect.innerHTML = d.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
    userUniversitySelect.innerHTML = u.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
}
userRoleSelect.addEventListener('change', () => {
    userDegreeWrapper.classList.toggle('hidden', userRoleSelect.value !== 'student');
});
adminCreateUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await apiFetch('/admin/users/new', { method: 'POST', body: JSON.stringify({
            name: document.getElementById('user-fullname').value,
            email: document.getElementById('user-email').value,
            dni: document.getElementById('user-dni').value,
            dob: document.getElementById('user-dob').value,
            username: document.getElementById('user-username').value,
            password: document.getElementById('user-password').value,
            role: userRoleSelect.value,
            university_id: userUniversitySelect.value,
            degree_id: userRoleSelect.value === 'student' ? userDegreeSelect.value : null
        })});
        alert('User created'); adminCreateUserForm.reset();
    } catch (e) { alert(e.message); }
});

async function loadAnnouncements() {
    announcementsList.innerHTML = '<p>Loading...</p>';
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
        const posts = await apiFetch(`/announcements?userId=${userId}`);
        announcementsList.innerHTML = '';
        const isAdmin = localStorage.getItem('userRole') === 'admin';
        
        posts.forEach(p => {
            let delBtn = isAdmin ? `<button onclick="deletePost(${p.id})" class="text-red-500 float-right">Delete</button>` : '';
            let img = p.image_url ? `<img src="${p.image_url}" class="w-full h-32 object-cover">` : '';
            announcementsList.innerHTML += `
                <div class="bg-white rounded shadow mb-4 overflow-hidden">
                    ${img}
                    <div class="p-4">
                        ${delBtn}
                        <h3 class="font-bold">${p.title}</h3>
                        <p class="text-sm text-gray-500">${p.authorName} - ${p.created_at}</p>
                        <p class="mt-2">${p.content}</p>
                    </div>
                </div>`;
        });
    } catch (e) { announcementsList.innerHTML = 'Error loading.'; }
}
window.deletePost = async (id) => {
    if(!confirm('Delete?')) return;
    await apiFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
    loadAnnouncements();
};

async function loadAnnouncementDropdowns() {
    const [d, u] = await Promise.all([apiFetch('/degrees'), apiFetch('/universities')]);
    announcementTargetDegree.innerHTML = '<option value="">Everyone</option>' + d.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
    announcementTargetUniversity.innerHTML = '<option value="">Everyone</option>' + u.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
}

announcementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await apiFetch('/admin/announcements/new', { method: 'POST', body: JSON.stringify({
            title: document.getElementById('announcement-title').value,
            content: document.getElementById('announcement-content').value,
            image_url: document.getElementById('announcement-image-url').value,
            user_id: localStorage.getItem('userId'),
            target_degree_id: announcementTargetDegree.value || null,
            target_university_id: announcementTargetUniversity.value || null
        })});
        alert('Posted'); announcementForm.reset(); loadAnnouncements();
    } catch (e) { alert(e.message); }
});

adminAddUniversityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await apiFetch('/admin/universities/new', { method: 'POST', body: JSON.stringify({ name: document.getElementById('university-name').value }) });
    alert('University added'); adminAddUniversityForm.reset(); loadAdminCourseForm(); loadAdminCreateUserForm();
});
adminAddDegreeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await apiFetch('/admin/degrees/new', { method: 'POST', body: JSON.stringify({ name: document.getElementById('degree-name').value }) });
    alert('Degree added'); adminAddDegreeForm.reset(); loadAdminCourseForm(); loadAdminCreateUserForm();
});


let statusChartInstance = null;
let destChartInstance = null;

async function loadAdminStats() {
    try {
        const stats = await apiFetch('/admin/stats');
        
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        if (statusChartInstance) statusChartInstance.destroy(); // Limpiar anterior si existe
        
        statusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Draft', 'Approved', 'Rejected'],
                datasets: [{
                    data: [
                        stats.statusCounts['Draft'] || 0,
                        stats.statusCounts['Approved'] || 0,
                        stats.statusCounts['Rejected'] || 0
                    ],
                    backgroundColor: ['#FCD34D', '#34D399', '#F87171'] // Amarillo, Verde, Rojo
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const ctxDest = document.getElementById('destChart').getContext('2d');
        if (destChartInstance) destChartInstance.destroy();

        destChartInstance = new Chart(ctxDest, {
            type: 'bar',
            data: {
                labels: stats.topDestinations.map(d => d.name),
                datasets: [{
                    label: 'Number of Agreements',
                    data: stats.topDestinations.map(d => d.count),
                    backgroundColor: '#6366F1' // Indigo
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}