// =================== CONFIGURACIÓN DE FIREBASE ===================
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
        .catch(error => { 
            authError.textContent = getSpanishErrorMessage(error.message);
        });
});

loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => { 
            authError.textContent = getSpanishErrorMessage(error.message);
        });
});

googleSignInBtn.addEventListener('click', () => {
    auth.signInWithPopup(googleProvider)
        .catch(error => { 
            authError.textContent = getSpanishErrorMessage(error.message);
        });
});

function getSpanishErrorMessage(errorMessage) {
    const errorMap = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
    };
    
    for (const [key, value] of Object.entries(errorMap)) {
        if (errorMessage.includes(key)) return value;
    }
    return 'Error de autenticación. Inténtalo de nuevo.';
}

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
        document.getElementById('loading-text').textContent = 'Cargando tu plan de carrera...';
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
        loadingOverlay.classList.add('hidden');
    });
}

function savePlannerData() {
    if (!auth.currentUser || !currentCareerId) return;
    const plannerDocRef = db.collection('users').doc(auth.currentUser.uid).collection('planners').doc(currentCareerId);
    return plannerDocRef.set(plannerState, { merge: true }).catch(error => {
        console.error("Error al guardar:", error);
    });
}

// =================== INICIALIZACIÓN DE LA INTERFAZ DE LA APP ===================
function initializeAppUI(user) {
    document.getElementById('welcome-message-main').textContent = `¡Bienvenid@, ${user.displayName || 'Usuario'}!`;
    loadPersonalization(user);
    
    // Crear semestre inicial si no existe
    if (plannerState.semesters.length === 0) {
        plannerState.semesters.push({ id: 1, collapsed: false });
        plannerState.nextSemesterId = 2;
    }
    
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
    card.className = 'subject-card';
    card.draggable = true;
    
    const prereqsMet = subject.prerequisites.every(pId => plannerState.subjects.find(s => s.id === pId)?.completed);
    const isLocked = !prereqsMet && !subject.completed;

    card.innerHTML = `
        <div class="w-full flex justify-between items-start">
            <div class="flex-grow min-w-0 pr-2">
                <p class="subject-name">${subject.name}</p>
                <p class="subject-code">${subject.id}</p>
            </div>
            <span class="credits-badge">${subject.credits}C</span>
        </div>
        ${subject.completed ? '<div class="absolute inset-0 bg-green-500/10 pointer-events-none rounded-lg"></div><span class="absolute top-2 right-8 text-green-500 text-lg pointer-events-none">✓</span>' : ''}
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
                <span class="semester-credits">${creditsInSemester}C</span>
                <button class="semester-toggle-btn">${semester.collapsed ? '▶' : '▼'}</button>
            </div>
            <div class="semester-content"></div>
        `;
        
        const contentEl = semesterCol.querySelector('.semester-content');
        subjectsInSemester.forEach(s => contentEl.appendChild(createSubjectCard(s)));
        
        // Drag and drop events
        semesterCol.addEventListener('dragover', handleDragOver);
        semesterCol.addEventListener('drop', handleDrop);
        
        // Toggle button
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
    bankContainer.className = 'space-y-2 min-h-[200px] p-2 border-2 border-dashed border-slate-600 rounded-lg';
    bankContainer.addEventListener('dragover', handleDragOver);
    bankContainer.addEventListener('drop', handleDrop);
    
    if (bankSubjects.length === 0) {
        bankContainer.innerHTML = '<p class="text-center text-slate-400 py-8">Todas las materias han sido asignadas</p>';
    } else {
        bankSubjects.forEach(s => bankContainer.appendChild(createSubjectCard(s)));
    }
    
    bankContent.appendChild(bankContainer);
}

function renderStatsBoard() {
    const container = document.querySelector('.stats-board');
    if (!container.innerHTML) {
        const stats = [
            { id: 'total-credits', label: 'CRÉDITOS TOTALES', total: 152 },
            { id: 'basic-cycle-credits', label: 'CICLO BÁSICO', total: 61 },
            { id: 'professional-cycle-credits', label: 'CICLO PROFESIONAL', total: 57 },
            { id: 'fg-credits', label: 'FORMACIÓN GENERAL', total: 17 },
            { id: 'prof-electives-credits', label: 'ELECTIVAS PROFESIONALES', total: 17 }
        ];
        
        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div class="stat-label">${stat.label}</div>
                <div id="${stat.id}" class="stat-value">0 / ${stat.total}</div>
                <div class="progress-bar-container">
                    <div id="${stat.id}-bar" class="progress-bar-fill"></div>
                </div>
            `;
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
    if (!plannerState.nextSemesterId) plannerState.nextSemesterId = plannerState.semesters.length + 1;
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
function handleDragStart(e) { 
    draggedElementId = e.target.dataset.id; 
    e.target.classList.add('dragging'); 
}

function handleDragEnd(e) { 
    if(e.target) e.target.classList.remove('dragging'); 
    draggedElementId = null; 
}

function handleDragOver(e) { 
    e.preventDefault(); 
}

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
    if (!plannerState.equivalencies || plannerState.equivalencies.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 py-4">No hay equivalencias registradas</p>';
        return;
    }
    
    plannerState.equivalencies.forEach(eq => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-3 bg-slate-700 rounded-lg';
        item.innerHTML = `
            <div>
                <p class="font-medium">${eq.name}</p>
                <p class="text-sm text-slate-400">${eq.credits} créditos</p>
            </div>
            <button data-id="${eq.id}" class="delete-equivalence-btn text-red-400 hover:text-red-300 font-bold text-xl">&times;</button>
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
    
    const filteredList = list.filter(e => 
        e.name.toLowerCase().includes(searchTerm) || 
        e.id.toLowerCase().includes(searchTerm)
    );
    
    if (filteredList.length === 0) {
        catalogList.innerHTML = '<p class="text-center text-slate-400 py-4">No se encontraron electivas</p>';
        return;
    }
    
    filteredList.forEach(elective => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors';
        item.innerHTML = `
            <div>
                <p class="font-semibold">${elective.name}</p>
                <p class="text-sm text-slate-400">${elective.id} - ${elective.credits} créditos</p>
            </div>
            <button class="btn-primary text-sm px-3 py-1">Añadir</button>
        `;
        item.querySelector('button').addEventListener('click', () => {
            addElective({ name: elective.name, credits: elective.credits, id: elective.id }, currentElectiveType);
            closeModal(electiveModal);
        });
        catalogList.appendChild(item);
    });
};

openFgElectiveBtn.addEventListener('click', () => {
    currentElectiveType = 'fg';
    document.getElementById('elective-modal-title').textContent = '📚 Electiva de Formación General';
    populateCatalog('fg');
    openModal(electiveModal);
});

openProfElectiveBtn.addEventListener('click', () => {
    currentElectiveType = 'prof';
    document.getElementById('elective-modal-title').textContent = '🎓 Electiva Profesional';
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
        cycle: 'Electiva', 
        area: type === 'fg' ? 'Formación General' : 'Electiva Profesional',
        prerequisites: [], 
        location: 'bank', 
        completed: false,
        isElective: true, 
        electiveType: type
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
    if (typeof(Storage) !== "undefined") {
        localStorage.setItem('univalleTheme', theme);
    }
    themeToggle.checked = theme === 'light';
};

themeToggle.addEventListener('change', () => {
    setAppTheme(themeToggle.checked ? 'light' : 'dark');
});

// Personalization
const profilePicContainer = document.getElementById('profile-pic-container');
const profilePicUpload = document.getElementById('profile-pic-upload');

profilePicContainer.addEventListener('click', () => profilePicUpload.click());

profilePicUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            if (typeof(Storage) !== "undefined" && auth.currentUser) {
                localStorage.setItem(`userProfilePic_${auth.currentUser.uid}`, dataUrl);
            }
            document.getElementById('profile-pic').src = dataUrl;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

function loadPersonalization(user) {
    // Load profile picture
    if (typeof(Storage) !== "undefined") {
        const savedPic = localStorage.getItem(`userProfilePic_${user.uid}`);
        if (savedPic) {
            document.getElementById('profile-pic').src = savedPic;
        } else {
            const fallbackSrc = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Usuario')}&background=3b82f6&color=fff&size=100`;
            document.getElementById('profile-pic').src = fallbackSrc;
        }
        
        // Load theme
        const savedTheme = localStorage.getItem('univalleTheme') || 'dark';
        setAppTheme(savedTheme);
    }
}

// PDF Generation
function generatePDF(studentName, studentId) {
    document.getElementById('loading-text').textContent = 'Generando PDF...';
    openModal(loadingOverlay);
    
    const reportElement = document.createElement('div');
    reportElement.style.cssText = `
        padding: 20px;
        font-family: 'Inter', Arial, sans-serif;
        color: #333;
        background: white;
        max-width: 800px;
        margin: 0 auto;
    `;
    
    const date = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let html = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px;">
            <h1 style="font-size: 28px; margin: 0; color: #1e293b; font-weight: 700;">Reporte de Progreso Académico</h1>
            <p style="font-size: 18px; margin: 10px 0; color: #3b82f6; font-weight: 600;">Diseño Industrial - Universidad del Valle</p>
        </div>
        <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p style="margin: 5px 0; font-size: 16px;"><strong>Estudiante:</strong> ${studentName}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Código:</strong> ${studentId}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Fecha:</strong> ${date}</p>
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
        <h2 style="font-size: 22px; color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 20px;">📊 Resumen de Créditos</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <thead>
                <tr style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Componente</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Créditos Cursados / Totales</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Progreso</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background: #f8fafc;"><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Ciclo Básico</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${basicCredits} / 61</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Math.round((basicCredits/61)*100)}%</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Ciclo Profesional</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${profCredits} / 57</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Math.round((profCredits/57)*100)}%</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Formación General</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${fgCredits} / 17</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Math.round((fgCredits/17)*100)}%</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Electivas Profesionales</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${profElectivesCredits} / 17</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Math.round((profElectivesCredits/17)*100)}%</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Equivalencias</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${completedEquivalencies}</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">-</td></tr>
                <tr style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-weight: 700;"><td style="padding: 12px;">TOTAL APROBADO</td><td style="padding: 12px; text-align: right;">${totalCredits} / 152</td><td style="padding: 12px; text-align: right;">${Math.round((totalCredits/152)*100)}%</td></tr>
            </tbody>
        </table>
    `;

    html += `<h2 style="font-size: 22px; color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 20px;">📅 Plan de Carrera</h2>`;
    
    plannerState.semesters.forEach(semester => {
        const subjectsInSemester = plannerState.subjects.filter(s => s.location === semester.id);
        const semesterCredits = subjectsInSemester.reduce((sum, s) => sum + s.credits, 0);
        
        html += `<h3 style="font-size: 18px; margin-top: 25px; margin-bottom: 12px; color: #1e293b; background: #f1f5f9; padding: 10px; border-radius: 6px;">📚 Semestre ${semester.id} (${semesterCredits} créditos)</h3>`;
        
        if (subjectsInSemester.length > 0) {
            html += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px;">`;
            subjectsInSemester.forEach(subject => {
                const statusColor = subject.completed ? '#22c55e' : '#6b7280';
                const statusText = subject.completed ? '✅ Cursada' : '⏳ Pendiente';
                html += `<tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px; font-weight: 500;">${subject.name}</td>
                    <td style="padding: 8px; text-align: center; color: #6b7280; font-size: 11px;">${subject.id}</td>
                    <td style="padding: 8px; text-align: center; font-weight: 600;">${subject.credits}C</td>
                    <td style="padding: 8px; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
                </tr>`;
            });
            html += `</table>`;
        } else {
            html += `<p style="font-size: 14px; color: #6b7280; font-style: italic; padding: 10px; background: #f9fafb; border-radius: 6px;">No hay materias planeadas para este semestre.</p>`;
        }
    });

    // Add equivalencies if any
    if (plannerState.equivalencies && plannerState.equivalencies.length > 0) {
        html += `<h2 style="font-size: 22px; color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin: 30px 0 20px 0;">⚖️ Materias por Equivalencia</h2>`;
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 13px;">`;
        plannerState.equivalencies.forEach(eq => {
            html += `<tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; font-weight: 500;">${eq.name}</td>
                <td style="padding: 8px; text-align: center; font-weight: 600;">${eq.credits}C</td>
                <td style="padding: 8px; text-align: center; color: #22c55e; font-weight: 600;">✅ Homologada</td>
            </tr>`;
        });
        html += `</table>`;
    }

    html += `
        <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="font-size: 12px; color: #6b7280; margin: 0; text-align: center;">
                Reporte generado por el Planificador de Carrera - Univalle<br>
                Desarrollado por la Representación de Diseño Industrial y Legión Estudiantil
            </p>
        </div>
    `;

    reportElement.innerHTML = html;
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `Reporte_Progreso_${studentName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(reportElement).set(opt).save().then(() => {
        closeModal(loadingOverlay);
    }).catch(error => {
        console.error('Error generating PDF:', error);
        closeModal(loadingOverlay);
        alert('Error al generar el PDF. Inténtalo de nuevo.');
    });
}

// =================== INICIALIZACIÓN CUANDO EL DOM ESTÁ LISTO ===================
document.addEventListener('DOMContentLoaded', function() {
    // Set initial logo size
    const legionLogo = document.getElementById('legion-logo');
    const headerLogo = document.getElementById('header-logo');
    
    if (legionLogo) {
        legionLogo.style.width = '100px';
        legionLogo.style.height = '100px';
    }
    
    if (headerLogo) {
        headerLogo.style.width = '48px';
        headerLogo.style.height = '48px';
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('hidden');
        }
    });
    
    // Prevent modal content clicks from closing modal
    document.querySelectorAll('.modal-content').forEach(modal => {
        modal.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    // Handle escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
});

// =================== FUNCIÓN AUXILIAR PARA DEBUGGING ===================
window.debugPlanner = function() {
    console.log('Current planner state:', plannerState);
    console.log('Current user:', auth.currentUser);
    console.log('Current career ID:', currentCareerId);
};
