// =================== CONFIGURACIÓN DE FIREBASE ===================
const firebaseConfig = {
    apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
    authDomain: "planificadoruv.firebaseapp.com",
    projectId: "planificadoruv",
    storageBucket: "planificadoruv.firebasestorage.app",
    messagingSenderId: "289578190596",
    appId: "1:289578190596:web:d45140a8bd7aff44b13251"
};

// =================== INICIALIZACIÓN ===================
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// =================== ESTADO DE LA APLICACIÓN ===================
let plannerState = {};
let currentCareerId = null;
let unsubscribePlanner = null;
let draggedElementId = null;
let selectedSubjectId = null;
let isSaving = false;
let saveTimeout = null;

// =================== SISTEMA DE NOTIFICACIONES ===================
function showNotification(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%)';
    }, 10);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, 20px)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// =================== AUTENTICACIÓN ===================
auth.onAuthStateChanged(user => {
    const ui = {
        auth: document.getElementById('auth-container'),
        app: document.getElementById('app-container'),
        career: document.getElementById('career-selection-container'),
        loading: document.getElementById('loading-overlay')
    };
    if (user) {
        ui.auth.classList.add('hidden');
        showCareerSelection(user);
    } else {
        if (unsubscribePlanner) unsubscribePlanner();
        ui.auth.classList.remove('hidden');
        ui.app.classList.add('hidden');
        ui.career.classList.add('hidden');
        if (ui.loading) ui.loading.classList.add('hidden');
    }
});

// =================== LÓGICA DE DATOS Y PLANES ===================
function getActivePlan() {
    if (plannerState && plannerState.plans && plannerState.activePlanId) {
        return plannerState.plans[plannerState.activePlanId];
    }
    return null;
}

function loadPlannerData(userId, careerId) {
    const docRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    unsubscribePlanner = docRef.onSnapshot(doc => {
        if (doc.exists && doc.data().plans) {
            plannerState = doc.data();
        } else {
            plannerState = getInitialStateForUser();
        }
        initializeAppUI(auth.currentUser);
    }, error => {
        console.error("Error al cargar datos:", error);
        showNotification("No se pudieron cargar tus datos.", 'error');
    });
}

function savePlannerData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (!auth.currentUser || !currentCareerId || isSaving) return;
        isSaving = true;
        const docRef = db.collection('users').doc(auth.currentUser.uid).collection('planners').doc(currentCareerId);
        docRef.set(plannerState)
            .catch(error => console.error("Error al guardar:", error))
            .finally(() => { isSaving = false; });
    }, 1500);
}

// =================== INICIALIZACIÓN Y RENDERIZADO ===================
function initializeAppUI(user) {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('career-selection-container').classList.add('hidden');
    
    const avatar = document.getElementById('user-avatar');
    if (avatar) {
        avatar.innerHTML = user.photoURL 
            ? `<img src="${user.photoURL}" alt="Avatar">`
            : `<span class="avatar-fallback">${(user.displayName || 'U').charAt(0)}</span>`;
    }
    render();
}

function render() {
    if (document.getElementById('app-container').classList.contains('hidden')) return;
    const plan = getActivePlan();
    if (!plan) return;

    renderPlanSlots();
    renderStatsBoard(plan);
    renderSubjectBank(plan);
    renderSemesters(plan);
    setupAllEventListeners();
    savePlannerData();
}

function renderPlanSlots() {
    const dropdown = document.getElementById('plan-slots-list');
    const activeButton = document.getElementById('active-plan-button');
    const activePlan = getActivePlan();
    
    activeButton.textContent = activePlan.name;
    dropdown.innerHTML = '';

    for (const planId in plannerState.plans) {
        const plan = plannerState.plans[planId];
        const item = document.createElement('div');
        item.className = 'plan-slot-item';
        item.dataset.planId = planId;
        item.innerHTML = `
            <span class="plan-name">${plan.name}</span>
            <div class="plan-slot-actions">
                <button class="rename-plan-btn" title="Renombrar">✏️</button>
                ${Object.keys(plannerState.plans).length > 1 ? `<button class="delete-plan-btn" title="Eliminar">🗑️</button>` : ''}
            </div>
        `;
        item.querySelector('.plan-name').addEventListener('click', () => loadPlan(planId));
        dropdown.appendChild(item);
    }
    
    const newItem = document.createElement('div');
    newItem.className = 'plan-slot-item';
    newItem.innerHTML = `<input type="text" class="new-plan-input" placeholder="+ Guardar como nuevo plan...">`;
    dropdown.appendChild(newItem);
}

function renderStatsBoard(plan) {
    const container = document.querySelector('.stats-board');
    if (!container) return;
    
    const categories = {
        'AB': { label: 'Área Básica', total: 49, current: 0 },
        'AP': { label: 'Área Profesional', total: 57, current: 0 },
        'EC': { label: 'Formación General', total: 17, current: 0 },
        'EP': { label: 'Electiva Profesional', total: 17, current: 0 },
        'english': { label: 'Requisito de Inglés', total: 8, current: 0 }
    };

    const allCompleted = [...plan.subjects.filter(s => s.completed), ...(plan.equivalencies || [])];
    
    allCompleted.forEach(s => {
        const category = s.category || s.type;
        if (categories[category]) categories[category].current += s.credits;
    });

    let totalCredits = allCompleted.reduce((sum, s) => sum + s.credits, 0);
    const totalRequired = 140;

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">CRÉDITOS TOTALES APROBADOS</div>
            <div class="stat-value">${totalCredits} / ${totalRequired}</div>
            <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${(totalCredits/totalRequired)*100}%"></div></div>
        </div>
        ${Object.entries(categories).map(([key, cat]) => `
        <div class="stat-card">
            <div class="stat-label">${cat.label} <span title="${key === 'english' ? 'Requisito obligatorio de grado (Ac. 009 de 1997 C.S.)' : `${cat.total} créditos requeridos`}" style="cursor:help;color:var(--info-blue);">ⓘ</span></div>
            <div class="stat-value">${cat.current} / ${cat.total}</div>
            <div class="progress-bar-container"><div class="progress-bar-fill ${key}" style="width:${cat.total > 0 ? (cat.current/cat.total)*100 : 0}%"></div></div>
        </div>`).join('')}
    `;
}

function renderSubjectBank(plan) {
    const container = document.getElementById('subject-bank');
    if (!container) return;
    const completedPrereqs = new Set(plan.subjects.filter(s => s.completed).map(s => s.id));
    const subjects = plan.subjects.filter(s => s.location === 'bank').sort((a, b) => a.name.localeCompare(b.name));
    
    container.innerHTML = subjects.length > 0 
        ? subjects.map(s => {
            const isAvailable = s.prerequisites.every(p => completedPrereqs.has(p));
            return createSubjectCard(s, !isAvailable).outerHTML;
        }).join('')
        : '<p style="text-align:center;color:var(--text-secondary);padding:1rem;">¡Felicitaciones! Has asignado todas las materias.</p>';
}

function renderSemesters(plan) {
    const container = document.getElementById('semesters-grid');
    if (!container) return;
    container.innerHTML = '';
    plan.semesters.sort((a, b) => a.id - b.id).forEach(semester => {
        const column = document.createElement('div');
        column.className = `semester-column ${semester.collapsed ? 'collapsed' : ''}`;
        column.dataset.semesterId = semester.id;
        const subjects = plan.subjects.filter(s => s.location === `semester-${semester.id}`);
        const credits = subjects.reduce((sum, s) => sum + s.credits, 0);
        
        column.innerHTML = `
            <div class="semester-header">
                <h3>${semester.name} (<span class="semester-credits ${credits > 18 ? 'high-load' : ''}">${credits}C</span>)</h3>
                <div class="semester-actions">
                    <button class="semester-control-btn toggle-semester-btn" title="Expandir/Contraer">${semester.collapsed?'🔽':'🔼'}</button>
                    <button class="semester-control-btn delete-semester-btn" title="Eliminar Semestre">🗑️</button>
                </div>
            </div>
            <div class="semester-content">${subjects.map(s => createSubjectCard(s, false).outerHTML).join('') || '<div class="drop-zone">Arrastra materias aquí</div>'}</div>`;
        container.appendChild(column);
    });
}

function createSubjectCard(subject, isLocked) {
    const card = document.createElement('div');
    card.id = `subject-${subject.id}`;
    card.dataset.id = subject.id;
    card.className = `subject-card ${subject.completed ? 'completed' : ''} ${isLocked ? 'locked' : ''}`;
    card.draggable = !isLocked;
    card.innerHTML = `
        <div class="subject-name">${subject.name}</div>
        <div class="subject-details">
            <span class="subject-code">${subject.id}</span>
            <span class="subject-credits">${subject.credits}C</span>
        </div>
        ${isLocked ? '<span class="lock-icon" title="Prerrequisitos no cumplidos">🔒</span>' : ''}
    `;
    return card;
}

// =================== MANEJO DE EVENTOS ===================
function setupAllEventListeners() {
    if (!window.listenersAttached) {
        document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);
        document.getElementById('logout-btn-main').addEventListener('click', () => auth.signOut());
        document.getElementById('logout-btn-career').addEventListener('click', () => auth.signOut());
        document.getElementById('career-list').addEventListener('click', handleCareerSelection);
        document.getElementById('import-sira-btn').addEventListener('click', () => openModal('sira-modal'));
        document.getElementById('process-sira-btn').addEventListener('click', processSiraInput);
        document.getElementById('add-equivalency-btn').addEventListener('click', openEquivalencyModal);
        document.getElementById('add-custom-subject-btn').addEventListener('click', () => openModal('custom-subject-modal'));
        document.getElementById('custom-subject-form').addEventListener('submit', handleAddCustomSubject);
        document.getElementById('add-semester-btn').addEventListener('click', addSemester);
        document.getElementById('reset-data-btn').addEventListener('click', resetCurrentPlan);
        document.getElementById('collapse-all-btn').addEventListener('click', () => toggleAllSemesters(true));
        document.getElementById('expand-all-btn').addEventListener('click', () => toggleAllSemesters(false));
        document.getElementById('focus-mode-btn').addEventListener('click', toggleFocusMode);
        document.getElementById('active-plan-button').addEventListener('click', () => {
            document.getElementById('plan-slots-list').classList.toggle('hidden');
        });
        document.body.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close-btn')) closeAllModals(); });
        window.listenersAttached = true;
    }
    setupDynamicListeners();
}

function setupDynamicListeners() {
    document.querySelectorAll('.subject-card').forEach(c => {
        c.addEventListener('dragstart', handleDragStart);
        c.addEventListener('dragend', handleDragEnd);
        c.addEventListener('click', handleSubjectClick);
        c.addEventListener('mouseenter', e => highlightPrereqs(e.currentTarget.dataset.id, true));
        c.addEventListener('mouseleave', e => highlightPrereqs(e.currentTarget.dataset.id, false));
    });
    document.querySelectorAll('.semester-content, #subject-bank').forEach(z => { z.addEventListener('dragover', handleDragOver); z.addEventListener('drop', handleDrop); z.addEventListener('click', handleDropZoneClick); });
    document.querySelectorAll('.delete-semester-btn').forEach(b => b.onclick = (e) => deleteSemester(e.target.closest('.semester-column').dataset.semesterId));
    document.querySelectorAll('.toggle-semester-btn').forEach(b => b.onclick = (e) => toggleSemester(e.target.closest('.semester-column').dataset.semesterId));
    document.querySelectorAll('.new-plan-input').forEach(input => { input.onkeydown = (e) => { if (e.key === 'Enter') saveNewPlan(e.target.value); }; });
    document.querySelectorAll('.rename-plan-btn').forEach(b => b.onclick = (e) => renamePlan(e.target.closest('.plan-slot-item').dataset.planId));
    document.querySelectorAll('.delete-plan-btn').forEach(b => b.onclick = (e) => deletePlan(e.target.closest('.plan-slot-item').dataset.planId));
}

// =================== LÓGICA DE INTERACCIÓN INTELIGENTE ===================
function highlightPrereqs(subjectId, show) {
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    subject.prerequisites.forEach(prereqId => { document.getElementById(`subject-${prereqId}`)?.classList.toggle('prereq-highlight', show); });
    plan.subjects.forEach(s => { if (s.prerequisites.includes(subjectId)) { document.getElementById(`subject-${s.id}`)?.classList.toggle('postreq-highlight', show); } });
}

function toggleFocusMode() {
    document.getElementById('main-body').classList.toggle('zen-mode');
}

// =================== LÓGICA DE GESTIÓN DE PLANES ===================
function loadPlan(planId) {
    plannerState.activePlanId = planId;
    document.getElementById('plan-slots-list').classList.add('hidden');
    render();
}

function saveNewPlan(name) {
    if (!name.trim()) return;
    const newPlanId = `plan_${Date.now()}`;
    plannerState.plans[newPlanId] = JSON.parse(JSON.stringify(getActivePlan()));
    plannerState.plans[newPlanId].name = name.trim();
    plannerState.activePlanId = newPlanId;
    render();
}

function renamePlan(planId) {
    const newName = prompt("Introduce el nuevo nombre para el plan:", plannerState.plans[planId].name);
    if (newName && newName.trim()) {
        plannerState.plans[planId].name = newName.trim();
        render();
    }
}

function deletePlan(planId) {
    if (Object.keys(plannerState.plans).length <= 1) {
        showNotification("No puedes eliminar el único plan existente.", "warning");
        return;
    }
    if (confirm(`¿Estás seguro de eliminar el plan "${plannerState.plans[planId].name}"?`)) {
        delete plannerState.plans[planId];
        plannerState.activePlanId = Object.keys(plannerState.plans)[0];
        render();
    }
}

// =================== ACCIONES DEL USUARIO ===================
function addSemester() {
    const plan = getActivePlan();
    const nextId = (Math.max(0, ...plan.semesters.map(s => s.id)) || 0) + 1;
    plan.semesters.push({ id: nextId, name: `Semestre ${nextId}`, collapsed: false, color: '#374151' });
    render();
}

function deleteSemester(semesterId) {
    const plan = getActivePlan();
    plan.subjects.forEach(s => { if (s.location === `semester-${semesterId}`) { s.location = 'bank'; s.completed = false; } });
    plan.semesters = plan.semesters.filter(s => s.id != semesterId);
    render();
}

function toggleSemester(semesterId) {
    const sem = getActivePlan().semesters.find(s => s.id == semesterId);
    if (sem) { sem.collapsed = !sem.collapsed; render(); }
}

function toggleAllSemesters(collapse) { getActivePlan().semesters.forEach(s => s.collapsed = collapse); render(); }

function toggleSubjectCompleted(subjectId) {
    const subject = getActivePlan().subjects.find(s => s.id === subjectId);
    if (subject) {
        if (subject.location === 'bank') { showNotification('Mueve la materia a un semestre para marcarla.', 'warning'); return; }
        subject.completed = !subject.completed;
        render();
    }
}

function resetCurrentPlan() {
    if (confirm('¿Seguro? Esto reiniciará el plan actual a su estado original.')) {
        const activePlan = getActivePlan();
        const newPlanData = getInitialStateForPlan();
        activePlan.subjects = newPlanData.subjects;
        activePlan.semesters = newPlanData.semesters;
        activePlan.equivalencies = newPlanData.equivalencies;
        showNotification(`Plan "${activePlan.name}" reiniciado.`, 'success');
        render();
    }
}

function processSiraInput() {
    const plan = getActivePlan();
    const text = document.getElementById('sira-input').value;
    let count = 0;
    text.split('\n').forEach(line => {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length < 3) return;
        const code = parts[0];
        const name = parts[1].toLowerCase().trim();
        const grade = parseFloat(parts[parts.length - 1]);
        if (grade >= 3.0 && !line.toLowerCase().includes('cancelada')) {
            const subject = plan.subjects.find(s => s.id === code || s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase().substring(0, 20)));
            if (subject && !subject.completed) {
                subject.completed = true;
                if (subject.location === 'bank') subject.location = 'semester-1';
                count++;
            }
        }
    });
    showNotification(count > 0 ? `${count} materias importadas.` : 'No se encontraron materias nuevas para importar.', count > 0 ? 'success' : 'warning');
    if (count > 0) { closeAllModals(); render(); }
}

function handleAddCustomSubject(e) {
    e.preventDefault();
    const plan = getActivePlan();
    const name = document.getElementById('custom-name').value;
    const credits = parseInt(document.getElementById('custom-credits').value);
    const type = document.getElementById('custom-type').value;
    const code = document.getElementById('custom-code').value || `CUSTOM-${Date.now()}`;
    plan.subjects.push({ id: code, name, credits, type, location: 'bank', completed: false, isCustom: true, prerequisites: [] });
    showNotification(`'${name}' añadida al banco.`, 'success');
    closeAllModals();
    e.target.reset();
    render();
}

function openEquivalencyModal() {
    // Implement logic for equivalency modal
    openModal('equivalency-modal');
}

// =================== DATOS INICIALES Y UTILIDADES ===================
function getInitialStateForUser() {
    return {
        plans: { 'default': getInitialStateForPlan() },
        activePlanId: 'default'
    };
}

function getInitialStateForPlan() {
    return {
        name: "Plan Principal",
        subjects: PENSUM_DI.map(s => ({ ...s, location: 'bank', completed: false })),
        semesters: [{ id: 1, name: 'Semestre 1', collapsed: false, color: '#374151' }],
        equivalencies: []
    };
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }
function signInWithGoogle() { auth.signInWithPopup(googleProvider).catch(err => showNotification(err.message, 'error')); }
function showCareerSelection(user) {
    document.getElementById('career-selection-container').classList.remove('hidden');
    const msg = document.getElementById('welcome-message-career');
    if(msg) msg.textContent = `¡Bienvenid@, ${user.displayName || 'Usuario'}!`;
}
function handleCareerSelection(e) {
    const btn = e.target.closest('.career-select-btn');
    if (btn) {
        currentCareerId = btn.dataset.careerId;
        document.getElementById('loading-overlay').classList.remove('hidden');
        loadPlannerData(auth.currentUser.uid, currentCareerId);
    }
}

// =================== LÓGICA DE INTERACCIÓN (Click, Drag & Drop) ===================
function handleSubjectClick(e) {
    const subjectId = e.currentTarget.dataset.id;
    if (e.detail === 2) { toggleSubjectCompleted(subjectId); return; }
    selectedSubjectId = (selectedSubjectId === subjectId) ? null : subjectId;
    render();
}
function handleDropZoneClick(e) {
    if (selectedSubjectId) {
        const subject = getActivePlan().subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;
        const semesterColumn = e.target.closest('.semester-column');
        const newLocation = semesterColumn ? `semester-${semesterColumn.dataset.semesterId}` : (e.target.closest('#subject-bank') ? 'bank' : null);
        if (newLocation) {
            moveSubject(subject, newLocation);
            selectedSubjectId = null;
            render();
        }
    }
}
function handleDragStart(e) { e.dataTransfer.setData('text/plain', e.target.dataset.id); e.currentTarget.classList.add('dragging'); }
function handleDragEnd(e) { e.currentTarget.classList.remove('dragging'); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e) {
    e.preventDefault();
    const subjectId = e.dataTransfer.getData('text/plain');
    const subject = getActivePlan().subjects.find(s => s.id === subjectId);
    if (!subject) return;
    const semesterColumn = e.target.closest('.semester-column');
    const newLocation = semesterColumn ? `semester-${semesterColumn.dataset.semesterId}` : (e.target.closest('#subject-bank') ? 'bank' : null);
    if (newLocation) { moveSubject(subject, newLocation); render(); }
}
function moveSubject(subject, newLocation) {
    const plan = getActivePlan();
    subject.location = newLocation;
    if (newLocation === 'bank' && subject.completed) {
        subject.completed = false;
        showNotification(`'${subject.name}' devuelta al banco y desmarcada.`, 'info');
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = savedTheme;
    if(themeToggle) {
        themeToggle.checked = savedTheme === 'light';
        themeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'light' : 'dark';
            document.documentElement.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        });
    }
});
