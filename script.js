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

// =================== LÓGICA DE DATOS ===================
function loadPlannerData(userId, careerId) {
    const docRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    unsubscribePlanner = docRef.onSnapshot(doc => {
        plannerState = (doc.exists && doc.data().subjects) ? doc.data() : getInitialState();
        if (!plannerState.homologations) plannerState.homologations = [];
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
    
    document.getElementById('user-name-display').textContent = user.displayName || 'Usuario';
    const avatar = document.getElementById('user-avatar');
    if (avatar) {
        avatar.innerHTML = user.photoURL 
            ? `<img src="${user.photoURL}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
            : `<span class="avatar-fallback">${(user.displayName || 'U').charAt(0)}</span>`;
    }
    render();
}

function render() {
    if (document.getElementById('app-container').classList.contains('hidden')) return;
    renderStatsBoard();
    renderSubjectBank();
    renderSemesters();
    renderHomologations();
    setupAllEventListeners();
    savePlannerData();
}

function renderStatsBoard() {
    const container = document.querySelector('.stats-board');
    if (!container) return;

    const categories = {
        'AB': { label: 'Área Básica', total: 49, current: 0 },
        'AP': { label: 'Área Profesional', total: 57, current: 0 },
        'EC': { label: 'Formación General', total: 17, current: 0 },
        'EP': { label: 'Electiva Profesional', total: 17, current: 0 },
        'english': { label: 'Requisito de Inglés', total: 8, current: 0 }
    };

    plannerState.subjects.filter(s => s.completed).forEach(s => {
        const category = s.category || s.type;
        if (categories[category]) categories[category].current += s.credits;
    });
    
    (plannerState.homologations || []).forEach(h => {
        if (categories[h.type]) categories[h.type].current += h.credits;
    });

    let totalCredits = Object.values(categories).reduce((sum, cat) => sum + cat.current, 0);
    const totalRequired = 140;

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">CRÉDITOS TOTALES APROBADOS</div>
            <div class="stat-value">${totalCredits} / ${totalRequired}</div>
            <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${(totalCredits/totalRequired)*100}%"></div></div>
        </div>
        ${Object.entries(categories).map(([key, cat]) => `
        <div class="stat-card">
            <div class="stat-label">${cat.label} <span class="info-icon" title="${key === 'english' ? 'Requisito obligatorio de grado (Ac. 009 de 1997 C.S.)' : `${cat.total} créditos requeridos`}">ⓘ</span></div>
            <div class="stat-value">${cat.current} / ${cat.total}</div>
            <div class="progress-bar-container"><div class="progress-bar-fill ${key}" style="width:${cat.total > 0 ? (cat.current/cat.total)*100 : 0}%"></div></div>
        </div>`).join('')}
    `;
}

function renderSubjectBank() {
    const container = document.getElementById('subject-bank');
    if (!container) return;
    const subjects = plannerState.subjects.filter(s => s.location === 'bank').sort((a, b) => a.name.localeCompare(b.name));
    container.innerHTML = subjects.length > 0 
        ? subjects.map(s => createSubjectCard(s).outerHTML).join('')
        : '<p class="empty-state" style="text-align:center;color:var(--text-secondary);padding:1rem;">¡Felicitaciones! Has asignado todas las materias.</p>';
}

function renderSemesters() {
    const container = document.getElementById('semesters-grid');
    if (!container) return;
    container.innerHTML = '';
    plannerState.semesters.sort((a, b) => a.id - b.id).forEach(semester => {
        const column = document.createElement('div');
        column.className = `semester-column ${semester.collapsed ? 'collapsed' : ''}`;
        column.dataset.semesterId = semester.id;
        const subjects = plannerState.subjects.filter(s => s.location === `semester-${semester.id}`);
        const credits = subjects.reduce((sum, s) => sum + s.credits, 0);
        column.innerHTML = `
            <div class="semester-header" style="background-color:${semester.color||'var(--bg-tertiary)'};">
                <h3>${semester.name} (${credits}C)</h3>
                <input type="color" class="color-picker" value="${semester.color||'#374151'}" title="Cambiar color">
                <div class="semester-actions">
                    <button class="semester-control-btn toggle-semester-btn" title="Expandir/Contraer">${semester.collapsed?'🔽':'🔼'}</button>
                    <button class="semester-control-btn delete-semester-btn" title="Eliminar Semestre">🗑️</button>
                </div>
            </div>
            <div class="semester-content">${subjects.length > 0 ? subjects.map(s => createSubjectCard(s).outerHTML).join('') : '<div class="drop-zone">Arrastra o toca para añadir materias</div>'}</div>`;
        container.appendChild(column);
    });
}

function renderHomologations() {
    const container = document.getElementById('homologations-list');
    if (!container) return;
    container.innerHTML = (plannerState.homologations || []).length > 0
        ? plannerState.homologations.map(h => `
            <div class="homologation-item" data-id="${h.id}">
                <div class="homologation-info">
                    <span class="name">${h.name}</span>
                    <span class="details">${h.credits} créditos (${h.type})</span>
                </div>
                <button class="delete-homologation-btn" title="Eliminar">✖</button>
            </div>`).join('')
        : '<p class="empty-state" style="text-align:center;color:var(--text-secondary);padding:1rem;">No hay homologaciones externas.</p>';
}

function createSubjectCard(subject) {
    const card = document.createElement('div');
    card.id = `subject-${subject.id}`;
    card.dataset.id = subject.id;
    card.className = `subject-card ${subject.completed ? 'completed' : ''} ${selectedSubjectId === subject.id ? 'selected-for-move' : ''}`;
    card.draggable = true;
    card.innerHTML = `<div class="subject-name">${subject.name}</div><div class="subject-details"><span class="subject-code">${subject.id}</span><span class="subject-credits">${subject.credits}C</span></div>`;
    return card;
}

// =================== MANEJO DE EVENTOS ===================
function setupAllEventListeners() {
    if (!window.listenersAttached) {
        // One-time setup
        document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);
        document.getElementById('logout-btn-main').addEventListener('click', () => auth.signOut());
        document.getElementById('career-list').addEventListener('click', handleCareerSelection);
        document.getElementById('import-sira-btn').addEventListener('click', () => openModal('sira-modal'));
        document.getElementById('process-sira-btn').addEventListener('click', processSiraInput);
        document.getElementById('add-homologation-btn').addEventListener('click', () => openModal('homologation-modal'));
        document.getElementById('homologation-form').addEventListener('submit', handleAddHomologation);
        document.getElementById('contact-program-btn').addEventListener('click', showContactInfo);
        document.getElementById('add-semester-btn').addEventListener('click', addSemester);
        document.getElementById('reset-data-btn').addEventListener('click', resetPlanner);
        document.getElementById('collapse-all-btn').addEventListener('click', () => toggleAllSemesters(true));
        document.getElementById('expand-all-btn').addEventListener('click', () => toggleAllSemesters(false));
        document.body.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close-btn')) closeAllModals(); });
        window.listenersAttached = true;
    }
    setupDynamicListeners();
}

function setupDynamicListeners() {
    document.querySelectorAll('.subject-card').forEach(c => { c.addEventListener('dragstart', handleDragStart); c.addEventListener('dragend', handleDragEnd); c.addEventListener('click', handleSubjectClick); });
    document.querySelectorAll('.semester-content, #subject-bank').forEach(z => { z.addEventListener('dragover', handleDragOver); z.addEventListener('drop', handleDrop); z.addEventListener('click', handleDropZoneClick); });
    document.querySelectorAll('.delete-semester-btn').forEach(b => b.onclick = (e) => deleteSemester(e.target.closest('.semester-column').dataset.semesterId));
    document.querySelectorAll('.toggle-semester-btn').forEach(b => b.onclick = (e) => toggleSemester(e.target.closest('.semester-column').dataset.semesterId));
    document.querySelectorAll('.color-picker').forEach(p => p.onchange = (e) => {
        const sem = plannerState.semesters.find(s => s.id == e.target.closest('.semester-column').dataset.semesterId);
        if (sem) { sem.color = e.target.value; render(); }
    });
    document.querySelectorAll('.delete-homologation-btn').forEach(b => b.onclick = (e) => deleteHomologation(e.target.closest('.homologation-item').dataset.id));
}

// =================== LÓGICA DE INTERACCIÓN ===================
function handleSubjectClick(e) {
    const subjectId = e.currentTarget.dataset.id;
    if (e.detail === 2) { toggleSubjectCompleted(subjectId); return; }
    selectedSubjectId = (selectedSubjectId === subjectId) ? null : subjectId;
    render();
}
function handleDropZoneClick(e) {
    if (selectedSubjectId) {
        const subject = plannerState.subjects.find(s => s.id === selectedSubjectId);
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
    const subject = plannerState.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    const semesterColumn = e.target.closest('.semester-column');
    const newLocation = semesterColumn ? `semester-${semesterColumn.dataset.semesterId}` : (e.target.closest('#subject-bank') ? 'bank' : null);
    if (newLocation) { moveSubject(subject, newLocation); render(); }
}
function moveSubject(subject, newLocation) {
    subject.location = newLocation;
    if (newLocation === 'bank' && subject.completed) {
        subject.completed = false;
        showNotification(`'${subject.name}' devuelta al banco y desmarcada.`, 'info');
    }
}

// =================== ACCIONES DEL USUARIO ===================
function addSemester() {
    const nextId = (Math.max(0, ...plannerState.semesters.map(s => s.id)) || 0) + 1;
    plannerState.semesters.push({ id: nextId, name: `Semestre ${nextId}`, collapsed: false, color: '#374151' });
    render();
}
function deleteSemester(semesterId) {
    if (confirm('¿Seguro que quieres eliminar este semestre? Las materias volverán al banco.')) {
        plannerState.subjects.forEach(s => { if (s.location === `semester-${semesterId}`) { s.location = 'bank'; s.completed = false; } });
        plannerState.semesters = plannerState.semesters.filter(s => s.id != semesterId);
        showNotification('Semestre eliminado.', 'success');
        render();
    }
}
function toggleSemester(semesterId) {
    const sem = plannerState.semesters.find(s => s.id == semesterId);
    if (sem) { sem.collapsed = !sem.collapsed; render(); }
}
function toggleAllSemesters(collapse) { plannerState.semesters.forEach(s => s.collapsed = collapse); render(); }
function toggleSubjectCompleted(subjectId) {
    const subject = plannerState.subjects.find(s => s.id === subjectId);
    if (subject) {
        if (subject.location === 'bank') { showNotification('Mueve la materia a un semestre para marcarla.', 'warning'); return; }
        subject.completed = !subject.completed;
        render();
    }
}
function resetPlanner() {
    if (confirm('¿Seguro? Esta acción reiniciará todo tu plan y no se puede deshacer.')) {
        plannerState = getInitialState();
        showNotification('Planificador reiniciado.', 'success');
        render();
    }
}
function processSiraInput() {
    const text = document.getElementById('sira-input').value;
    let count = 0;
    text.split('\n').forEach(line => {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length < 3) return;
        const code = parts[0];
        const name = parts[1].toLowerCase().trim();
        const grade = parseFloat(parts[parts.length - 1]);
        if (grade >= 3.0 && !line.toLowerCase().includes('cancelada')) {
            const subject = plannerState.subjects.find(s => s.id === code || s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase().substring(0, 20)));
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
function handleAddHomologation(e) {
    e.preventDefault();
    const name = document.getElementById('homol-name').value;
    const credits = parseInt(document.getElementById('homol-credits').value);
    const type = document.getElementById('homol-type').value;
    plannerState.homologations.push({ id: `homol-${Date.now()}`, name, credits, type });
    showNotification(`Homologación '${name}' añadida.`, 'success');
    closeAllModals();
    e.target.reset();
    render();
}
function deleteHomologation(homologationId) {
    plannerState.homologations = plannerState.homologations.filter(h => h.id !== homologationId);
    showNotification('Homologación eliminada.', 'success');
    render();
}
function showContactInfo() {
    const email = "fai.direccion.disenoindustrial@correounivalle.edu.co";
    navigator.clipboard.writeText(email).then(() => showNotification(`Correo copiado: ${email}`, 'success'));
}

// =================== DATOS INICIALES Y UTILIDADES ===================
function getInitialState() {
    return {
        subjects: [
            { id: '204025C', name: 'INGLÉS CON FINES GENERALES Y ACADÉM. I', credits: 2, type: 'AB', category: 'english', prerequisites: [] },
            { id: '204026C', name: 'INGLÉS FINES GENERALES Y ACADÉMICOS II', credits: 2, type: 'AB', category: 'english', prerequisites: ['204025C'] },
            { id: '204027C', name: 'INGLÉS CON FINES GENERALES Y ACADÉM. III', credits: 2, type: 'AB', category: 'english', prerequisites: ['204026C'] },
            { id: '204028C', name: 'INGLÉS FINES GENERALES Y ACADÉMICOS IV', credits: 2, type: 'AB', category: 'english', prerequisites: ['204027C'] },
            { id: '506026C', name: 'ESCRITURA, EXPRESIÓN Y COMUNICACIÓN', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507048C', name: 'PRODUCCIÓN INTERSUBJETIVA DEL ESPACIO FÍSICO Y SOCIAL', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507031C', name: 'DISEÑO MUNDO', credits: 3, type: 'AB', prerequisites: [] },
            { id: '507044C', name: 'DISEÑO PARA LA PAZ SOSTENIBLE', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507026C', name: 'SEMINARIO DE INVESTIGACIÓN', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507046C', name: 'FUNDAMENTOS SOCIALES Y CULTURALES DEL DISEÑO', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507055C', name: 'PERCEPCIÓN VISUAL', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507017C', name: 'MÉTODOS DE DISEÑO', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507025C', name: 'PROYECTO - SER HUMANO', credits: 7, type: 'AP', prerequisites: [] },
            { id: '507008C', name: 'CREACIÓN DE LA FORMA', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507024C', name: 'PROYECTOS - RELACIONES Y VÍNCULOS', credits: 4, type: 'AP', prerequisites: [] },
            { id: '507053C', name: 'ESTUDIOS VISUALES', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507021C', name: 'PROYECTOS - ESTRUCTURAS Y AUTONOMÍAS', credits: 4, type: 'AP', prerequisites: [] },
            { id: '507010C', name: 'GEOMETRÍA', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507012C', name: 'INTRODUCCIÓN MATERIALES Y PROCESOS', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507013C', name: 'MATEMÁTICAS', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507047C', name: 'HERRAMIENTAS DIGITALES - REPRESENTACIÓN', credits: 2, type: 'AP', prerequisites: [] },
            { id: '507009C', name: 'FÍSICA PARA EL DISEÑO', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507014C', name: 'MATERIALES Y PROCESOS - METALES', credits: 3, type: 'AP', prerequisites: [] },
            { id: '507011C', name: 'HERRAMIENTAS DIGITALES - PROGRAMACIÓN', credits: 2, type: 'AP', prerequisites: [] },
            { id: '507015C', name: 'MATERIALES Y PROCESOS - NUEVOS MATERIALES', credits: 3, type: 'AP', prerequisites: [] },
            { id: '507023C', name: 'PROYECTO - PRODUCTO', credits: 7, type: 'AP', prerequisites: [] },
            { id: '507059C', name: 'HERRAMIENTAS DIGITALES - COMPROBACIÓN', credits: 2, type: 'AP', prerequisites: [] },
            { id: '507095C', name: 'PROYECTO FINAL DESARROLLO', credits: 4, type: 'AP', prerequisites: ['507096C'] },
            { id: '507111C', name: 'DISEÑO COLONIAL Y MODERNIDAD D.I.', credits: 2, type: 'AB', prerequisites: [] },
            { id: '507115C', name: 'PROYECTO - GESTIÓN', credits: 7, type: 'AP', prerequisites: [] },
            { id: '507016C', name: 'MATERIALES Y PROCESOS - POLIMEROS', credits: 3, type: 'AP', prerequisites: [] },
            { id: '507020C', name: 'PROYECTO - ENTORNO', credits: 7, type: 'AP', prerequisites: [] },
            { id: '507035C', name: 'DISIDENCIAS Y RESISTENCIAS', credits: 3, type: 'AB', prerequisites: [] },
            { id: '507060C', name: 'HERRAMIENTAS DIGITALES - CREACIÓN VISUALIZACIÓN', credits: 2, type: 'AP', prerequisites: [] },
            { id: '507019C', name: 'PROYECTO - BIOSFERA', credits: 7, type: 'AP', prerequisites: [] },
            { id: '507036C', name: 'ESTUDIOS CRÍTICOS DEL DISEÑO', credits: 3, type: 'AB', prerequisites: [] },
            { id: '507058C', name: 'HERRAMIENTAS DIGITALES - SIMULACIÓN', credits: 2, type: 'AP', prerequisites: [] },
            { id: '507096C', name: 'PROYECTO FINAL FORMULACIÓN', credits: 3, type: 'AP', prerequisites: ['507012C'] },
            { id: '507092C', name: 'BIOMIMESIS', credits: 2, type: 'EP', prerequisites: [] },
            { id: '507082C', name: 'COLOR', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507057C', name: 'CREACIÓN CON MADERA', credits: 2, type: 'EP', prerequisites: [] },
            { id: '507083C', name: 'CRÍTICA DE LAS MERCANCÍAS Y EL CONSUMO', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507062C', name: 'DIBUJO TÉCNICO PARA DISEÑO INDUSTRIAL', credits: 2, type: 'EP', prerequisites: [] },
            { id: '507090C', name: 'DISEÑO DE APLICACIONES MÓVILES', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507093C', name: 'DISEÑO Y PROTOTIPADO DE SISTEMAS ROBÓTICOS', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507061C', name: 'ESTRATEGIAS DE ECODISEÑO', credits: 2, type: 'EP', prerequisites: [] },
            { id: '507084C', name: 'ESTUDIOS CRÍTICOS SOBRE LOS RESIDUOS', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507094C', name: 'PRÁCTICAS ESCRITURALES', credits: 2, type: 'EP', prerequisites: [] },
            { id: '507109C', name: 'SOSTENIBILIDAD EN LA INDUSTRIA TEXTIL', credits: 2, type: 'EP', prerequisites: [] },
            { id: '507105C', name: 'MORFOLOGÍA EXPERIMENTAL EN EL DISEÑO INDUSTRIAL', credits: 4, type: 'EP', prerequisites: [] },
            { id: '507106C', name: 'PROCESOS DE FABRICACION ADITIVA - IMPRESION TRIDIMENSIONAL (3D)', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507110C', name: 'TÉCNICAS DE PROTOTIPADO RÁPIDO', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507108C', name: 'EL GÉNERO EN LOS OBJETOS', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507113C', name: 'MARKETING DE PRODUCTO', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507112C', name: 'ELEMENTOS PARA DISEÑO DE INTERIORES', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507114C', name: 'PRÁCTICAS ESCRITURALES', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507051C', name: 'PRÁCTICA EN INVESTIGACIÓN-CREACIÓN', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507118C', name: 'PRODUCCIÓN DE PLATAFORMAS CULTURALES PARA ARTE Y DISEÑO', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507122C', name: 'DISEÑO INDUSTRIAL CONTEMPORÁNEO', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507121C', name: 'REUSO Y RECICLAJE CREATIVO', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507120C', name: 'MODELOS EN REPETICIÓN', credits: 3, type: 'EP', prerequisites: [] },
            { id: '507119C', name: 'DISEÑO + ARTE CONTEMPORÁNEO', credits: 3, type: 'EP', prerequisites: [] },
        ].map(s => ({ ...s, location: 'bank', completed: false })),
        semesters: [{ id: 1, name: 'Semestre 1', collapsed: false, color: '#374151' }],
        homologations: []
    };
}

// Utilities
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
