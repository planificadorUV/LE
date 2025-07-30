// =================== CONFIGURACIÓN DE FIREBASE ===================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
  authDomain: "planificadoruv.firebaseapp.com",
  projectId: "planificadoruv",
  storageBucket: "planificadoruv.firebasestorage.app",
  messagingSenderId: "289578190596",
  appId: "1:289578190596:web:d45140a8bd7aff44b13251",
  measurementId: "G-WQVMB3XP2W"
};

// =================== INICIALIZACIÓN DE SERVICIOS ===================
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// =================== ELEMENTOS DEL DOM ===================
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const careerSelectionContainer = document.getElementById('career-selection-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleAuthModeLink = document.getElementById('toggle-auth-mode');
const googleSignInBtn = document.getElementById('google-signin-btn');
const authError = document.getElementById('auth-error');
const logoutBtnMain = document.getElementById('logout-btn-main');
const logoutBtnCareer = document.getElementById('logout-btn-career');

// =================== ESTADO DE LA APLICACIÓN ===================
let plannerState = {};
let currentCareerId = null;
let unsubscribePlanner = null;
let draggedElementId = null;

// =================== CONTROLADOR PRINCIPAL DE AUTENTICACIÓN ===================
auth.onAuthStateChanged(user => {
    if (user) {
        authContainer.classList.add('hidden');
        showCareerSelection(user);
    } else {
        if (unsubscribePlanner) unsubscribePlanner();
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        careerSelectionContainer.classList.add('hidden');
        loadingOverlay.classList.add('hidden');
    }
});

// =================== FUNCIONES DE AUTENTICACIÓN ===================
toggleAuthModeLink.addEventListener('click', e => {
    e.preventDefault();
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
    const isLogin = loginForm.classList.contains('hidden');
    toggleAuthModeLink.textContent = isLogin ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate';
    authError.textContent = '';
});

registerForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return userCredential.user.updateProfile({ displayName: name });
        })
        .catch(error => { authError.textContent = error.message; });
});

loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => { authError.textContent = error.message; });
});

googleSignInBtn.addEventListener('click', () => {
    auth.signInWithPopup(googleProvider)
        .catch(error => { authError.textContent = error.message; });
});

logoutBtnMain.addEventListener('click', () => auth.signOut());
logoutBtnCareer.addEventListener('click', () => auth.signOut());

// =================== LÓGICA DE SELECCIÓN DE CARRERA Y CARGA DE DATOS ===================
function showCareerSelection(user) {
    document.getElementById('welcome-message-career').textContent = `¡Bienvenid@, ${user.displayName || 'Usuario'}!`;
    careerSelectionContainer.classList.remove('hidden');
}

document.getElementById('career-list').addEventListener('click', e => {
    if (e.target.matches('.career-select-btn')) {
        currentCareerId = e.target.dataset.careerId;
        careerSelectionContainer.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');
        loadPlannerData(auth.currentUser.uid, currentCareerId);
    }
});

function loadPlannerData(userId, careerId) {
    const plannerDocRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    
    unsubscribePlanner = plannerDocRef.onSnapshot(doc => {
        if (doc.exists) {
            plannerState = doc.data();
            if (!plannerState.equivalencies) plannerState.equivalencies = [];
            if (!plannerState.semesters) plannerState.semesters = [];
        } else {
            plannerState = getInitialState();
            plannerDocRef.set(plannerState);
        }
        initializeAppUI(auth.currentUser);
    }, error => {
        console.error("Error al cargar datos: ", error);
        alert("No se pudieron cargar tus datos. Inténtalo de nuevo.");
    });
}

function savePlannerData() {
    if (!auth.currentUser || !currentCareerId) return;
    const plannerDocRef = db.collection('users').doc(auth.currentUser.uid).collection('planners').doc(currentCareerId);
    return plannerDocRef.set(plannerState, { merge: true });
}

// =================== INICIALIZACIÓN DE LA INTERFAZ DE LA APP ===================
function initializeAppUI(user) {
    document.getElementById('welcome-message-main').textContent = `¡Bienvenid@, ${user.displayName || 'Usuario'}!`;
    loadPersonalization(user);
    render();
    loadingOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

// =================== DATOS INICIALES DE LA CARRERA ===================
const predefinedProfElectives = [
    { id: "507092C", name: "BIOMIMESIS", credits: 2 }, { id: "507082C", name: "COLOR", credits: 3 },
    { id: "507057C", name: "CREACIÓN CON MADERA", credits: 2 }, { id: "507083C", name: "CRÍTICA DE LAS MERCANCÍAS Y EL CONSUMO", credits: 3 },
    { id: "507062C", name: "DIBUJO TÉCNICO PARA DISEÑO INDUSTRIAL", credits: 2 }, { id: "507090C", name: "DISEÑO DE APLICACIONES MÓVILES", credits: 3 },
    { id: "507093C", name: "DISEÑO Y PROTOTIPADO DE SISTEMAS ROBÓTICOS", credits: 3 }, { id: "507061C", name: "ESTRATEGIAS DE ECODISEÑO", credits: 2 },
    { id: "507084C", name: "ESTUDIOS CRÍTICOS SOBRE LOS RESIDUOS", credits: 3 }, { id: "507094C", name: "PRÁCTICAS ESCRITURALES", credits: 2 },
    { id: "507109C", name: "SOSTENIBILIDAD EN LA INDUSTRIA TEXTIL", credits: 3 }, { id: "507105C", name: "MORFOLOGÍA EXPERIMENTAL EN EL DISEÑO INDUSTRIAL", credits: 3 },
    { id: "507106C", name: "PROCESOS DE FABRICACIÓN ADITIVA - IMPRESIÓN TRIDIMENSIONAL (3D)", credits: 3 }, { id: "507110C", name: "TÉCNICAS DE PROTOTIPADO RÁPIDO", credits: 3 },
    { id: "507108C", name: "EL GÉNERO EN LOS OBJETOS", credits: 3 }, { id: "507113C", name: "MARKETING DE PRODUCTO", credits: 3 },
    { id: "507112C", name: "ELEMENTOS PARA DISEÑO DE INTERIORES", credits: 3 }, { id: "507114C", name: "PRÁCTICAS ESCRITURALES", credits: 3 },
    { id: "507051C", name: "PRÁCTICA EN INVESTIGACIÓN-CREACIÓN", credits: 3 }, { id: "507118C", name: "PRODUCCIÓN DE PLATAFORMAS CULTURALES PARA ARTE Y DISEÑO", credits: 3 },
    { id: "507122C", name: "DISEÑO INDUSTRIAL CONTEMPORÁNEO", credits: 3 }, { id: "507121C", name: "REUSO Y RECICLAJE CREATIVO", credits: 3 },
    { id: "507120C", name: "MODELOS EN REPETICIÓN", credits: 3 }, { id: "507119C", name: "DISEÑO + ARTE CONTEMPORÁNEO", credits: 3 },
];
const predefinedFGElectives = [
    { id: "417016C", name: "ESTRATEGIAS PARA EL APRENDIZAJE AUTÓNOMO", credits: 3 }, { id: "417017C", name: "APROPIACIÓN DIGITAL Y APRENDIZAJE SIGNIFICATIVO", credits: 3 },
    { id: "106030C", name: "HUMANITAS, CIENCIA, AGRICULTURA Y CAMBIO CLIMÁTICO", credits: 3 }, { id: "801127C", name: "CONFLUENCIA DE REALIDADES: NATURALEZA Y SOCIEDAD", credits: 3 },
    { id: "415007C", name: "FORMACIÓN CIUDADANA Y CONSTITUCIÓN POLÍTICA DE COLOMBIA", credits: 3 }, { id: "304035C", name: "GÉNERO, PLURALIDAD Y DIVERSIDAD", credits: 3 },
    { id: "204133C", name: "COMPRENSIÓN Y PRODUCCIÓN DE TEXTOS ACADÉMICOS GENERALES", credits: 2 }, { id: "603032C", name: "HABILIDADES PARA LA VIDA", credits: 3 },
    { id: "404032C", name: "DEPORTE FORMATIVO", credits: 3 }, { id: "402051C", name: "VIDA UNIVERSITARIA I: ENCUENTROS CON LA UNIVERSIDAD", credits: 3 },
    { id: "507098C", name: "EMPRENDIMIENTO, CULTURA Y CIUDAD", credits: 3 },
];

function getInitialState() {
    const initialSubjects = [
        // Ciclo Básico (AB)
        { id: '506026C', name: 'ESCRITURA, EXPRESIÓN Y COMUNICACIÓN', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507048C', name: 'PRODUCCIÓN INTERSUBJETIVA DEL ESPACIO FÍSICO Y SOCIAL', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507031C', name: 'DISEÑO MUNDO', credits: 3, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507044C', name: 'DISEÑO PARA LA PAZ SOSTENIBLE', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507026C', name: 'SEMINARIO DE INVESTIGACIÓN', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507046C', name: 'FUNDAMENTOS SOCIALES Y CULTURALES DEL DISEÑO', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507055C', name: 'PERCEPCIÓN VISUAL', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '5070170', name: 'MÉTODOS DE DISEÑO', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507025C', name: 'PROYECTO - SER HUMANO', credits: 7, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507008C', name: 'CREACIÓN DE LA FORMA', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507024C', name: 'PROYECTOS - RELACIONES Y VÍNCULOS', credits: 4, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507053C', name: 'ESTUDIOS VISUALES', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507021C', name: 'PROYECTOS - ESTRUCTURAS Y AUTONOMÍAS', credits: 4, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507010C', name: 'GEOMETRÍA', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507012C', name: 'INTRODUCCIÓN MATERIALES Y PROCESOS', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507013C', name: 'MATEMÁTICAS', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507047C', name: 'HERRAMIENTAS DIGITALES - REPRESENTACIÓN', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507009C', name: 'FÍSICA PARA EL DISEÑO', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507014C', name: 'MATERIALES Y PROCESOS - METALES', credits: 3, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        // Inglés como materias requeridas del Ciclo Básico
        { id: '100001C', name: 'INGLÉS I', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: [] },
        { id: '100002C', name: 'INGLÉS II', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: ['100001C'] },
        { id: '100003C', name: 'INGLÉS III', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: ['100002C'] },
        { id: '100004C', name: 'INGLÉS IV', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: ['100003C'] },

        // Ciclo Profesional (AP)
        { id: '507011C', name: 'HERRAMIENTAS DIGITALES - PROGRAMACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507015C', name: 'MATERIALES Y PROCESOS - NUEVOS MATERIALES', credits: 3, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507023C', name: 'PROYECTO - PRODUCTO', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507059C', name: 'HERRAMIENTAS DIGITALES - COMPROBACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507095C', name: 'PROYECTO FINAL DESARROLLO', credits: 4, cycle: 'Profesional', area: 'Diseño', prerequisites: ['507096C'] },
        { id: '507111C', name: 'DISEÑO COLONIAL Y MODERNIDAD D.I.', credits: 2, cycle: 'Profesional', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507115C', name: 'PROYECTO - GESTIÓN', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507016C', name: 'MATERIALES Y PROCESOS - POLIMEROS', credits: 3, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507020C', name: 'PROYECTO - ENTORNO', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507035C', name: 'DISIDENCIAS Y RESISTENCIAS', credits: 3, cycle: 'Profesional', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507060C', name: 'HERRAMIENTAS DIGITALES - CREACIÓN VISUALIZACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507019C', name: 'PROYECTO - BIOSFERA', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507036C', name: 'ESTUDIOS CRÍTICOS DEL DISEÑO', credits: 3, cycle: 'Profesional', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507058C', name: 'HERRAMIENTAS DIGITALES - SIMULACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507096C', name: 'PROYECTO FINAL FORMULACIÓN', credits: 3, cycle: 'Profesional', area: 'Diseño', prerequisites: ['507012C'] }
    ].map(s => ({ ...s, location: 'bank', completed: false }));

    return {
        subjects: initialSubjects,
        semesters: [],
        equivalencies: [],
        nextSemesterId: 1,
        nextElectiveId: 1,
    };
}

// =================== LÓGICA DE RENDERIZADO ===================
function render() {
    if (!appContainer.classList.contains('hidden')) {
        renderStatsBoard();
        renderSubjectBank();
        renderSemesters();
        renderEquivalencies();
        updateStats();
        savePlannerData();
    }
}

function createSubjectCard(subject) {
    const card = document.createElement('div');
    card.id = `subject-${subject.id}`;
    card.dataset.id = subject.id;
    card.className = 'subject-card p-3 rounded-lg flex flex-col items-start relative';
    card.draggable = true;
    
    const prereqsMet = subject.prerequisites.every(pId => plannerState.subjects.find(s => s.id === pId)?.completed);
    const isLocked = !prereqsMet && !subject.completed;

    card.innerHTML = `
        <div class="w-full flex justify-between items-start">
            <div class="flex-grow">
                <p class="subject-name text-sm font-medium pr-2">${subject.name}</p>
                <p class="subject-code text-xs text-secondary">${subject.id}</p>
            </div>
            <span class="credits-badge text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">${subject.credits} C</span>
        </div>
        ${subject.completed ? '<div class="absolute inset-0 bg-green-500 opacity-20 pointer-events-none"></div><span class="absolute top-1 right-1 text-lg pointer-events-none">✔️</span>' : ''}
    `;
    
    if (subject.completed) card.classList.add('completed');
    if (isLocked) card.classList.add('locked');
    
    card.addEventListener('click', () => toggleSubjectComplete(subject.id));
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    return card;
}

function renderSemesters() {
    const grid = document.getElementById('semesters-grid');
    grid.innerHTML = '';
    plannerState.semesters.forEach(semester => {
        const semesterCol = document.createElement('div');
        semesterCol.id = `semester-${semester.id}`;
        semesterCol.className = 'semester-column';
        semesterCol.dataset.id = semester.id;
        if (semester.collapsed) semesterCol.classList.add('collapsed');
        
        const subjectsInSemester = plannerState.subjects.filter(s => s.location === semester.id);
        const creditsInSemester = subjectsInSemester.reduce((sum, s) => sum + s.credits, 0);

        semesterCol.innerHTML = `
            <div class="semester-header">
                <h3>Semestre ${semester.id}</h3>
                <span class="semester-credits font-bold">${creditsInSemester} Créditos</span>
                <button class="semester-toggle-btn p-1 rounded hover:bg-tertiary">${semester.collapsed ? '▶' : '▼'}</button>
            </div>
            <div class="semester-content"></div>
        `;
        
        const contentEl = semesterCol.querySelector('.semester-content');
        subjectsInSemester.forEach(s => contentEl.appendChild(createSubjectCard(s)));
        
        semesterCol.addEventListener('dragover', handleDragOver);
        semesterCol.addEventListener('drop', handleDrop);
        semesterCol.querySelector('.semester-toggle-btn').addEventListener('click', () => {
            const sem = plannerState.semesters.find(s => s.id === semester.id);
            sem.collapsed = !sem.collapsed;
            render();
        });
        grid.appendChild(semesterCol);
    });
}

function renderSubjectBank() {
    const bankContent = document.getElementById('bank-content');
    bankContent.innerHTML = '';
    const bankSubjects = plannerState.subjects.filter(s => s.location === 'bank');
    
    const bankContainer = document.createElement('div');
    bankContainer.id = 'bank-drop-area';
    bankContainer.className = 'space-y-2';
    bankContainer.addEventListener('dragover', handleDragOver);
    bankContainer.addEventListener('drop', handleDrop);
    
    bankSubjects.forEach(s => bankContainer.appendChild(createSubjectCard(s)));
    bankContent.appendChild(bankContainer);
}

function renderStatsBoard() {
    const container = document.querySelector('.stats-board');
    if (!container.innerHTML) {
        const stats = [
            { id: 'total-credits', label: 'CRÉDITOS TOTALES', total: 152 },
            { id: 'basic-cycle-credits', label: 'CICLO BÁSICO', total: 61 }, // 49 + 12 de inglés
            { id: 'professional-cycle-credits', label: 'CICLO PROFESIONAL', total: 57 },
            { id: 'fg-credits', label: 'FORMACIÓN GENERAL', total: 17 },
            { id: 'prof-electives-credits', label: 'ELECTIVAS PROFESIONALES', total: 17 }
        ];
        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'text-center bg-secondary p-4 rounded-lg';
            card.innerHTML = `<h3 class="text-xs font-semibold text-secondary uppercase">${stat.label}</h3><p id="${stat.id}" class="text-xl font-bold">0 / ${stat.total}</p><div class="progress-bar-container mt-2"><div id="${stat.id}-bar" class="progress-bar-fill"></div></div>`;
            container.appendChild(card);
        });
    }
}

function updateStats() {
    const completedSubjects = plannerState.subjects.filter(s => s.completed);
    const completedEquivalencies = plannerState.equivalencies.reduce((sum, eq) => sum + eq.credits, 0);
    const basicCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Básico').reduce((sum, s) => sum + s.credits, 0);
    const profCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Profesional').reduce((sum, s) => sum + s.credits, 0);
    const fgCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'fg').reduce((sum, s) => sum + s.credits, 0);
    const profElectivesCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'prof').reduce((sum, s) => sum + s.credits, 0);
    const totalCredits = basicCredits + profCredits + fgCredits + profElectivesCredits + completedEquivalencies;

    const updateStat = (id, current, total) => {
        const numEl = document.getElementById(id);
        const barEl = document.getElementById(`${id}-bar`);
        if(numEl && barEl) {
            numEl.textContent = `${current} / ${total}`;
            barEl.style.width = total > 0 ? `${Math.min((current / total) * 100, 100)}%` : '0%';
        }
    };
    updateStat('total-credits', totalCredits, 152);
    updateStat('basic-cycle-credits', basicCredits, 61);
    updateStat('professional-cycle-credits', profCredits, 57);
    updateStat('fg-credits', fgCredits, 17);
    updateStat('prof-electives-credits', profElectivesCredits, 17);
}

// =================== MANEJADORES DE EVENTOS ===================

document.getElementById('add-semester-btn').addEventListener('click', () => {
    plannerState.semesters.push({ id: plannerState.nextSemesterId++, collapsed: false });
    render();
});

document.getElementById('reset-button').addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres reiniciar todo tu progreso para esta carrera? Esta acción no se puede deshacer.')) {
        plannerState = getInitialState();
        render();
    }
});

function toggleSubjectComplete(subjectId) {
    const subject = plannerState.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    if (subject.location === 'bank') {
        alert('Debes arrastrar la materia a un semestre para poder marcarla como cursada.');
        return;
    }
    if (subject.completed) {
        const dependents = plannerState.subjects.filter(s => s.prerequisites.includes(subjectId) && s.completed);
        if (dependents.length > 0) {
            alert(`No puedes desmarcar esta materia. Las siguientes materias dependen de ella: ${dependents.map(d => d.name).join(', ')}`);
            return;
        }
        subject.completed = false;
    } else {
        const prereqsMet = subject.prerequisites.every(pId => plannerState.subjects.find(s => s.id === pId)?.completed);
        if (!prereqsMet) {
            alert('Debes completar los prerrequisitos primero.');
            return;
        }
        subject.completed = true;
    }
    render();
}

// --- Drag and Drop ---
function handleDragStart(e) { draggedElementId = e.target.dataset.id; e.target.classList.add('dragging'); }
function handleDragEnd(e) { if(e.target) e.target.classList.remove('dragging'); draggedElementId = null; }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.semester-column, #bank-drop-area');
    if (!dropTarget || !draggedElementId) return;
    const subject = plannerState.subjects.find(s => s.id === draggedElementId);
    if (!subject) return;
    
    if (dropTarget.id.startsWith('semester-')) {
        subject.location = parseInt(dropTarget.dataset.id);
    } else if (dropTarget.id === 'bank-drop-area') {
        subject.location = 'bank';
        subject.completed = false;
    }
    render();
}

// --- Lógica de Equivalencias ---
const equivalenciesModal = document.getElementById('equivalencies-modal');
document.getElementById('open-equivalencies-modal-btn').addEventListener('click', () => equivalenciesModal.classList.remove('hidden'));
document.getElementById('close-equivalencies-modal-btn').addEventListener('click', () => equivalenciesModal.classList.add('hidden'));

document.getElementById('add-equivalence-form').addEventListener('submit', e => {
    e.preventDefault();
    const nameInput = document.getElementById('equivalence-name');
    const creditsInput = document.getElementById('equivalence-credits');
    
    if (!plannerState.equivalencies) plannerState.equivalencies = [];
    plannerState.equivalencies.push({
        id: `equiv-${Date.now()}`,
        name: nameInput.value,
        credits: parseInt(creditsInput.value)
    });
    
    nameInput.value = '';
    creditsInput.value = '';
    render();
});

function renderEquivalencies() {
    const list = document.getElementById('equivalencies-list');
    list.innerHTML = '';
    if (!plannerState.equivalencies) return;
    plannerState.equivalencies.forEach(eq => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-2 bg-tertiary rounded-md';
        item.innerHTML = `
            <p>${eq.name} (${eq.credits} C)</p>
            <button data-id="${eq.id}" class="delete-equivalence-btn text-red-500 font-bold">&times;</button>
        `;
        item.querySelector('.delete-equivalence-btn').addEventListener('click', (e) => {
            const idToDelete = e.target.dataset.id;
            plannerState.equivalencies = plannerState.equivalencies.filter(item => item.id !== idToDelete);
            render();
        });
        list.appendChild(item);
    });
}

// --- Lógica de Modales (PDF, Electivas, Tema, Personalización) ---
const openModal = (modal) => modal.classList.remove('hidden');
const closeModal = (modal) => modal.classList.add('hidden');

// PDF Modal
const pdfModal = document.getElementById('pdf-modal');
document.getElementById('open-pdf-modal-btn').addEventListener('click', () => openModal(pdfModal));
document.getElementById('close-pdf-modal-btn').addEventListener('click', () => closeModal(pdfModal));
document.getElementById('pdf-info-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const studentName = document.getElementById('student-name').value;
    const studentId = document.getElementById('student-id').value;
    closeModal(pdfModal);
    generatePDF(studentName, studentId);
});

// Electives Modal
const electiveModal = document.getElementById('elective-modal');
const openFgElectiveBtn = document.getElementById('open-fg-elective-modal-btn');
const openProfElectiveBtn = document.getElementById('open-prof-elective-modal-btn');
let currentElectiveType = 'fg';

const populateCatalog = (type) => {
    const list = type === 'fg' ? predefinedFGElectives : predefinedProfElectives;
    const catalogList = document.getElementById('elective-catalog-list');
    const searchInput = document.getElementById('elective-search');
    catalogList.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    list.filter(e => e.name.toLowerCase().includes(searchTerm) || e.id.toLowerCase().includes(searchTerm))
        .forEach(elective => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-2 bg-tertiary rounded-md';
        item.innerHTML = `<div><p class="font-semibold">${elective.name}</p><p class="text-xs text-secondary">${elective.id} - ${elective.credits} créditos</p></div><button class="btn-primary text-sm px-3 py-1 rounded-md">Añadir</button>`;
        item.querySelector('button').addEventListener('click', () => {
            addElective({ name: elective.name, credits: elective.credits, id: elective.id }, currentElectiveType);
            closeModal(electiveModal);
        });
        catalogList.appendChild(item);
    });
};

openFgElectiveBtn.addEventListener('click', () => {
    currentElectiveType = 'fg';
    document.getElementById('elective-modal-title').textContent = 'Seleccionar Electiva de Formación General';
    populateCatalog('fg');
    openModal(electiveModal);
});
openProfElectiveBtn.addEventListener('click', () => {
    currentElectiveType = 'prof';
    document.getElementById('elective-modal-title').textContent = 'Seleccionar Electiva Profesional';
    populateCatalog('prof');
    openModal(electiveModal);
});
document.getElementById('close-elective-modal-btn').addEventListener('click', () => closeModal(electiveModal));
document.getElementById('elective-search').addEventListener('input', () => populateCatalog(currentElectiveType));
document.getElementById('add-custom-elective-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('custom-elective-name').value;
    const credits = parseInt(document.getElementById('custom-elective-credits').value);
    addElective({ name, credits, id: `custom-${Date.now()}` }, currentElectiveType);
    closeModal(electiveModal);
    e.target.reset();
});

function addElective(electiveData, type) {
    const newElective = {
        id: electiveData.id || `custom-${plannerState.nextElectiveId++}`,
        name: electiveData.name,
        credits: electiveData.credits,
        cycle: 'Electiva', area: type === 'fg' ? 'Formación General' : 'Electiva Profesional',
        prerequisites: [], location: 'bank', completed: false,
        isElective: true, electiveType: type
    };
    plannerState.subjects.push(newElective);
    render();
}

// Modal Tabs
document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const parent = tab.closest('.modal-content');
        parent.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.id.replace('tab-', 'content-');
        parent.querySelectorAll('.modal-tab-content').forEach(c => {
            c.classList.remove('active');
            if (c.id === target) c.classList.add('active');
        });
    });
});

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const setAppTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('univalleTheme', theme);
    themeToggle.checked = theme === 'light';
};
themeToggle.addEventListener('change', () => setAppTheme(themeToggle.checked ? 'light' : 'dark'));

// Personalization
const profilePicContainer = document.getElementById('profile-pic-container');
const profilePicUpload = document.getElementById('profile-pic-upload');
profilePicContainer.addEventListener('click', () => profilePicUpload.click());
profilePicUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            localStorage.setItem(`userProfilePic_${auth.currentUser.uid}`, dataUrl);
            document.getElementById('profile-pic').src = dataUrl;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

function loadPersonalization(user) {
    const savedPic = localStorage.getItem(`userProfilePic_${user.uid}`);
    if (savedPic) {
        document.getElementById('profile-pic').src = savedPic;
    } else {
        document.getElementById('profile-pic').src = user.photoURL || `https://placehold.co/100x100/2a2a2a/e5e5e5?text=${(user.displayName || 'U').charAt(0)}`;
    }
    const savedTheme = localStorage.getItem('univalleTheme') || 'dark';
    setAppTheme(savedTheme);
}

// PDF Generation
function generatePDF(studentName, studentId) {
    document.getElementById('loading-text').textContent = 'Generando PDF...';
    openModal(loadingOverlay);
    const reportElement = document.createElement('div');
    reportElement.style.padding = '20px';
    reportElement.style.fontFamily = 'Arial, sans-serif';
    reportElement.style.color = '#333';
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    let html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; margin: 0;">Reporte de Progreso Académico</h1>
            <p style="font-size: 16px; margin: 5px 0;">Diseño Industrial - Universidad del Valle</p>
        </div>
        <div style="margin-bottom: 20px;">
            <p><strong>Estudiante:</strong> ${studentName}</p>
            <p><strong>Código:</strong> ${studentId}</p>
            <p><strong>Fecha:</strong> ${date}</p>
        </div>
    `;

    const completedSubjects = plannerState.subjects.filter(s => s.completed);
    const completedEquivalencies = plannerState.equivalencies.reduce((sum, eq) => sum + eq.credits, 0);
    const basicCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Básico').reduce((sum, s) => sum + s.credits, 0);
    const profCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Profesional').reduce((sum, s) => sum + s.credits, 0);
    const fgCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'fg').reduce((sum, s) => sum + s.credits, 0);
    const profElectivesCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'prof').reduce((sum, s) => sum + s.credits, 0);
    const totalCredits = basicCredits + profCredits + fgCredits + profElectivesCredits + completedEquivalencies;

    html += `
        <h2 style="font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 15px;">Resumen de Créditos</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
            <tr style="background-color: #eee;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Componente</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Créditos Cursados / Totales</th>
            </tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Ciclo Básico</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${basicCredits} / 61</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Ciclo Profesional</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${profCredits} / 57</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Formación General</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fgCredits} / 17</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Electivas Profesionales</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${profElectivesCredits} / 17</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Equivalencias</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${completedEquivalencies}</td></tr>
            <tr style="background-color: #eee; font-weight: bold;"><td style="padding: 8px; border: 1px solid #ddd;">TOTAL APROBADO</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${totalCredits} / 152</td></tr>
        </table>
    `;

    html += `<h2 style="font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 15px;">Plan de Carrera</h2>`;
    plannerState.semesters.forEach(semester => {
        html += `<h3 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px;">Semestre ${semester.id}</h3>`;
        const subjectsInSemester = plannerState.subjects.filter(s => s.location === semester.id);
        if (subjectsInSemester.length > 0) {
            html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;
            subjectsInSemester.forEach(subject => {
                html += `<tr>
                    <td style="padding: 5px; border-bottom: 1px solid #eee;">${subject.name}</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${subject.credits} C</td>
                    <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${subject.completed ? '<strong>Cursada</strong>' : 'Pendiente'}</td>
                </tr>`;
            });
            html += `</table>`;
        } else {
            html += `<p style="font-size: 12px;">No hay materias planeadas.</p>`;
        }
    });

    reportElement.innerHTML = html;
    const opt = {
        margin: 10, filename: `Reporte_Progreso_${studentName.replace(/\s/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(reportElement).set(opt).save().then(() => closeModal(loadingOverlay));
}
