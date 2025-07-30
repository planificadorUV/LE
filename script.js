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

// Verificar que Firebase esté cargado
if (typeof firebase === 'undefined') {
    console.error('Firebase no está cargado. Verifica los scripts en el HTML.');
    alert('Error: Firebase no pudo cargar. Revisa la conexión a internet.');
} else {
    console.log('Firebase cargado correctamente');
}

// =================== INICIALIZACIÓN ===================
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

// =================== TEMA ===================
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

function applyTheme(isDark) {
    if (isDark) {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme') || 'dark';
const isDarkMode = savedTheme === 'dark';
if (themeToggle) {
    themeToggle.checked = !isDarkMode;
    applyTheme(isDarkMode);

    themeToggle.addEventListener('change', (e) => {
        applyTheme(!e.target.checked);
    });
}

// =================== AUTENTICACIÓN ===================
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

// Event listeners para autenticación
if (toggleAuthModeLink) {
    toggleAuthModeLink.addEventListener('click', e => {
        e.preventDefault();
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
        const isLogin = loginForm.classList.contains('hidden');
        toggleAuthModeLink.textContent = isLogin ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate';
        authError.textContent = '';
    });
}

if (registerForm) {
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
}

if (loginForm) {
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                authError.textContent = getSpanishErrorMessage(error.message);
            });
    });
}

if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
            .catch(error => {
                authError.textContent = getSpanishErrorMessage(error.message);
            });
    });
}

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

if (logoutBtnMain) {
    logoutBtnMain.addEventListener('click', () => auth.signOut());
}

if (logoutBtnCareer) {
    logoutBtnCareer.addEventListener('click', () => auth.signOut());
}

// =================== WELCOME MESSAGE TOGGLE ===================
document.addEventListener('DOMContentLoaded', () => {
    const toggleWelcomeBtn = document.getElementById('toggle-welcome-btn');
    
    if (toggleWelcomeBtn) {
        toggleWelcomeBtn.addEventListener('click', () => {
            toggleWelcomeBtn.classList.toggle('collapsed');
        });
    }
    
    // Bank toggle
    const toggleBankBtn = document.getElementById('toggle-bank-btn');
    const leftPanel = document.getElementById('left-panel');
    
    if (toggleBankBtn && leftPanel) {
        toggleBankBtn.addEventListener('click', () => {
            leftPanel.classList.toggle('collapsed');
        });
    }
});

// =================== SELECCIÓN DE CARRERA ===================
function showCareerSelection(user) {
    const welcomeMsg = document.getElementById('welcome-message-career');
    if (welcomeMsg) {
        welcomeMsg.textContent = `¡Bienvenid@, ${user.displayName || 'Usuario'}!`;
    }
    careerSelectionContainer.classList.remove('hidden');
}

const careerList = document.getElementById('career-list');
if (careerList) {
    careerList.addEventListener('click', e => {
        const btn = e.target.closest('.career-select-btn');
        if (btn) {
            currentCareerId = btn.dataset.careerId;
            careerSelectionContainer.classList.add('hidden');
            loadingOverlay.classList.remove('hidden');
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.textContent = 'Cargando tu plan de carrera...';
            }
            loadPlannerData(auth.currentUser.uid, currentCareerId);
        }
    });
}

// =================== CARGA Y GUARDADO DE DATOS ===================
function loadPlannerData(userId, careerId) {
    const plannerDocRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    
    unsubscribePlanner = plannerDocRef.onSnapshot(doc => {
        if (doc.exists) {
            plannerState = doc.data();
            if (!plannerState.equivalencies) plannerState.equivalencies = [];
            if (!plannerState.semesters) plannerState.semesters = [];
            if (!plannerState.nextSemesterId) plannerState.nextSemesterId = 1;
            if (!plannerState.nextElectiveId) plannerState.nextElectiveId = 1;
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

// =================== DATOS INICIALES ===================
function getInitialState() {
    const initialSubjects = [
        // Inglés corregido
        { id: '204025C', name: 'INGLÉS CON FINES GENERALES Y ACADÉM. I', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: [] },
        { id: '204026C', name: 'INGLÉS FINES GENERALES Y ACADÉMICOS II', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: ['204025C'] },
        { id: '204027C', name: 'INGLÉS CON FINES GENERALES Y ACADÉM. III', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: ['204026C'] },
        { id: '204028C', name: 'INGLÉS FINES GENERALES Y ACADÉMICOS IV', credits: 3, cycle: 'Básico', area: 'Formación General', prerequisites: ['204027C'] },
        
        // Ciclo Básico
        { id: '506026C', name: 'ESCRITURA, EXPRESIÓN Y COMUNICACIÓN', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507048C', name: 'PRODUCCIÓN INTERSUBJETIVA DEL ESPACIO FÍSICO Y SOCIAL', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507031C', name: 'DISEÑO MUNDO', credits: 3, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507044C', name: 'DISEÑO PARA LA PAZ SOSTENIBLE', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507026C', name: 'SEMINARIO DE INVESTIGACIÓN', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507046C', name: 'FUNDAMENTOS SOCIALES Y CULTURALES DEL DISEÑO', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507055C', name: 'PERCEPCIÓN VISUAL', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507017C', name: 'MÉTODOS DE DISEÑO', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
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
        
        // Ciclo Profesional
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

// =================== INICIALIZACIÓN DE LA APP ===================
function initializeAppUI(user) {
    const welcomeMsg = document.getElementById('welcome-message-main');
    if (welcomeMsg) {
        welcomeMsg.textContent = `¡Bienvenid@, ${user.displayName || 'Usuario'}!`;
    }
    
    // Crear semestre inicial si no existe
    if (plannerState.semesters.length === 0) {
        plannerState.semesters.push({ 
            id: 1, 
            name: 'Semestre 1',
            collapsed: false,
            color: '#ffdd53'
        });
        plannerState.nextSemesterId = 2;
    }
    
    render();
    loadingOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    setupEventListeners();
    renderEquivalencyModal();
    setupModalTabs();
}

// =================== RENDERIZADO PRINCIPAL ===================
function render() {
    if (!appContainer.classList.contains('hidden')) {
        renderStatsBoard();
        renderSubjectBank();
        renderSemesters();
        renderEquivalencies();
        updateStats();
        
        // Auto-guardar después de renderizar
        setTimeout(() => {
            savePlannerData();
        }, 100);
    }
}

// =================== RENDERIZADO DE COMPONENTES ===================
function renderStatsBoard() {
    const container = document.querySelector('.stats-board');
    if (!container) return;
    
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
                <div class="stat-value" id="${stat.id}-value">0</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="${stat.id}-progress"></div>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function renderSubjectBank() {
    const bankContainer = document.getElementById('subject-bank');
    if (!bankContainer) return;
    
    bankContainer.innerHTML = '';
    
    const bankSubjects = plannerState.subjects.filter(s => s.location === 'bank');
    
    if (bankSubjects.length === 0) {
        bankContainer.innerHTML = '<p class="text-center text-gray-500">Todas las materias han sido asignadas</p>';
    } else {
        bankSubjects.forEach(s => bankContainer.appendChild(createSubjectCard(s)));
    }
}

function renderSemesters() {
    const container = document.getElementById('semesters-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    plannerState.semesters.forEach(semester => {
        container.appendChild(renderSemesterWithColorPicker(semester));
    });
    
    setupDragAndDrop();
}

function renderSemesterWithColorPicker(semester) {
    const semesterColumn = document.createElement('div');
    semesterColumn.className = `semester-column ${semester.collapsed ? 'collapsed' : ''}`;
    semesterColumn.dataset.semesterId = semester.id;
    
    const semesterSubjects = plannerState.subjects.filter(s => s.location === `semester-${semester.id}`);
    const totalCredits = semesterSubjects.reduce((sum, s) => sum + s.credits, 0);
    
    semesterColumn.innerHTML = `
        <div class="semester-header" style="border-left: 4px solid ${semester.color || '#ffdd53'}">
            <input type="color" class="color-picker" value="${semester.color || '#ffdd53'}" 
                   title="Cambiar color del semestre">
            <h3>${semester.name || `Semestre ${semester.id}`}</h3>
            <div class="semester-credits">${totalCredits}C</div>
            <button class="semester-toggle-btn" title="Colapsar/Expandir">
                ${semester.collapsed ? '▶' : '▼'}
            </button>
        </div>
        <div class="semester-content">
            ${semesterSubjects.length === 0 ? 
                '<div class="drop-zone">Arrastra materias aquí</div>' : 
                semesterSubjects.map(s => createSubjectCard(s).outerHTML).join('')
            }
        </div>
    `;
    
    // Event listener para color picker
    const colorPicker = semesterColumn.querySelector('.color-picker');
    colorPicker.addEventListener('change', (e) => {
        const semesterIndex = plannerState.semesters.findIndex(s => s.id === semester.id);
        if (semesterIndex !== -1) {
            plannerState.semesters[semesterIndex].color = e.target.value;
            semesterColumn.querySelector('.semester-header').style.borderLeftColor = e.target.value;
            savePlannerData();
        }
    });
    
    // Toggle collapse
    const toggleBtn = semesterColumn.querySelector('.semester-toggle-btn');
    toggleBtn.addEventListener('click', () => {
        const semesterIndex = plannerState.semesters.findIndex(s => s.id === semester.id);
        if (semesterIndex !== -1) {
            plannerState.semesters[semesterIndex].collapsed = !plannerState.semesters[semesterIndex].collapsed;
            render();
        }
    });
    
    return semesterColumn;
}

function renderEquivalencies() {
    const container = document.getElementById('equivalencies-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (plannerState.equivalencies.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No hay equivalencias registradas</p>';
        return;
    }
    
    plannerState.equivalencies.forEach(eq => {
        const item = document.createElement('div');
        item.className = 'equivalency-item';
        item.innerHTML = `
            <div class="equivalency-info">
                <h4>${eq.name}</h4>
                <div class="equivalency-details">${eq.credits} créditos - ${eq.type}</div>
            </div>
            <button class="remove-equivalency-btn" onclick="removeEquivalency('${eq.id}')">
                Eliminar
            </button>
        `;
        container.appendChild(item);
    });
}

// =================== CREACIÓN DE ELEMENTOS ===================
function createSubjectCard(subject) {
    const card = document.createElement('div');
    card.id = `subject-${subject.id}`;
    card.dataset.id = subject.id;
    card.className = 'subject-card';
    card.draggable = true;
    
    const prereqsMet = subject.prerequisites.every(pId => 
        plannerState.subjects.find(s => s.id === pId)?.completed
    );
    const isLocked = !prereqsMet && !subject.completed;
    
    if (isLocked) card.classList.add('locked');
    if (subject.completed) card.classList.add('completed');
    
    card.innerHTML = `
        <div class="subject-name">${subject.name}</div>
        <div class="subject-code">${subject.id}</div>
        <div class="credits-badge">${subject.credits}C</div>
    `;
    
    return card;
}

// =================== DRAG AND DROP ===================
function setupDragAndDrop() {
    const draggables = document.querySelectorAll('.subject-card[draggable="true"]');
    const dropZones = document.querySelectorAll('.semester-content, .subject-bank');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', handleDragStart);
        draggable.addEventListener('dragend', handleDragEnd);
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedElementId = e.target.dataset.id;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedElementId = null;
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    const dropZone = e.target.closest('.semester-content, .subject-bank');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const dropZone = e.target.closest('.semester-content, .subject-bank');
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target.closest('.semester-content, .subject-bank');
    if (!dropZone || !draggedElementId) return;
    
    dropZone.classList.remove('drag-over');
    
    const subject = plannerState.subjects.find(s => s.id === draggedElementId);
    if (!subject) return;
    
    let newLocation;
    
    if (dropZone.classList.contains('subject-bank')) {
        newLocation = 'bank';
    } else {
        const semesterColumn = dropZone.closest('.semester-column');
        if (semesterColumn) {
            newLocation = `semester-${semesterColumn.dataset.semesterId}`;
        }
    }
    
    if (newLocation && subject.location !== newLocation) {
        subject.location = newLocation;
        render();
    }
}

// =================== ESTADÍSTICAS ===================
function updateStats() {
    const completedSubjects = plannerState.subjects.filter(s => s.completed);
    const totalCredits = completedSubjects.reduce((sum, s) => sum + s.credits, 0);
    
    const basicCredits = completedSubjects
        .filter(s => s.cycle === 'Básico')
        .reduce((sum, s) => sum + s.credits, 0);
    
    const profCredits = completedSubjects
        .filter(s => s.cycle === 'Profesional')
        .reduce((sum, s) => sum + s.credits, 0);
    
    const fgCredits = completedSubjects
        .filter(s => s.area === 'Formación General')
        .reduce((sum, s) => sum + s.credits, 0);
    
    const equivalencyCredits = plannerState.equivalencies
        .reduce((sum, eq) => sum + eq.credits, 0);
    
    updateStatCard('total-credits', totalCredits + equivalencyCredits, 152);
    updateStatCard('basic-cycle-credits', basicCredits, 61);
    updateStatCard('professional-cycle-credits', profCredits, 57);
    updateStatCard('fg-credits', fgCredits, 17);
    updateStatCard('prof-electives-credits', 0, 17); // Implementar lógica de electivas
}

function updateStatCard(id, current, total) {
    const valueElement = document.getElementById(`${id}-value`);
    const progressElement = document.getElementById(`${id}-progress`);
    
    if (valueElement) {
        valueElement.textContent = `${current}/${total}`;
    }
    
    if (progressElement) {
        const percentage = Math.min((current / total) * 100, 100);
        progressElement.style.width = `${percentage}%`;
    }
}

// =================== IMPORTAR SIRA ===================
function processSiraData(siraText) {
    const lines = siraText.split('\n');
    const processedSubjects = [];
    const semesterData = {};
    
    let currentPeriod = null;
    
    lines.forEach(line => {
        // Detectar período
        if (line.includes('PERIODO:')) {
            const periodMatch = line.match(/PERIODO:\s*(.+)/);
            if (periodMatch) {
                currentPeriod = periodMatch[1].trim();
                if (!semesterData[currentPeriod]) {
                    semesterData[currentPeriod] = [];
                }
            }
        }
        
        // Detectar materias
        const subjectMatch = line.match(/^(\d{6}C|\d{7}C)\s*\d*\s*\d*\s*(.+?)\s+[A-Z]+\s+[A-Z]+\s+(\d+)\s+([\d.]+)/);
        
        if (subjectMatch && currentPeriod) {
            const [, code, name, credits, grade] = subjectMatch;
            const cleanName = name.replace(/\s+/g, ' ').trim();
            const numericGrade = parseFloat(grade);
            
            if (numericGrade >= 3.0) {
                const existingSubject = plannerState.subjects.find(s => s.id === code);
                
                if (existingSubject) {
                    existingSubject.completed = true;
                    processedSubjects.push({
                        id: code,
                        name: cleanName,
                        credits: parseInt(credits),
                        period: currentPeriod,
                        grade: numericGrade
                    });
                    
                    semesterData[currentPeriod].push(existingSubject);
                }
            }
        }
    });
    
    // Crear semestres automáticamente
    Object.keys(semesterData).forEach((period, index) => {
        if (semesterData[period].length > 0) {
            const semesterId = plannerState.nextSemesterId++;
            const newSemester = {
                id: semesterId,
                name: `Semestre ${semesterId} (${period})`,
                collapsed: false,
                color: '#ffdd53'
            };
            
            plannerState.semesters.push(newSemester);
            
            semesterData[period].forEach(subject => {
                subject.location = `semester-${semesterId}`;
            });
        }
    });
    
    return processedSubjects;
}

// =================== EQUIVALENCIAS ===================
function renderEquivalencyModal() {
    const searchInput = document.getElementById('search-subject');
    const searchResults = document.getElementById('search-results');
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            searchResults.innerHTML = '';
            
            if (query.length < 2) {
                searchResults.classList.remove('show');
                return;
            }
            
            const matches = plannerState.subjects.filter(subject => 
                subject.name.toLowerCase().includes(query) || 
                subject.id.toLowerCase().includes(query)
            ).slice(0, 10);
            
            if (matches.length > 0) {
                matches.forEach(subject => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.innerHTML = `
                        <div>
                            <strong>${subject.name}</strong><br>
                            <small>${subject.id} - ${subject.credits} créditos - ${subject.cycle}</small>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        document.getElementById('equiv-name').value = subject.name;
                        document.getElementById('equiv-credits').value = subject.credits;
                        document.getElementById('equiv-type').value = subject.cycle === 'Básico' ? 'AB' : 'AP';
                        searchResults.classList.remove('show');
                        searchInput.value = '';
                    });
                    searchResults.appendChild(item);
                });
                searchResults.classList.add('show');
            } else {
                searchResults.classList.remove('show');
            }
        });
    }
}

function removeEquivalency(id) {
    plannerState.equivalencies = plannerState.equivalencies.filter(eq => eq.id !== id);
    render();
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    // Agregar semestre
    const addSemesterBtn = document.getElementById('add-semester-btn');
    if (addSemesterBtn) {
        addSemesterBtn.addEventListener('click', () => {
            const newSemester = {
                id: plannerState.nextSemesterId++,
                name: `Semestre ${plannerState.nextSemesterId - 1}`,
                collapsed: false,
                color: '#ffdd53'
            };
            plannerState.semesters.push(newSemester);
            render();
        });
    }
    
    // Importar SIRA
    const importSiraBtn = document.getElementById('import-sira-btn');
    if (importSiraBtn) {
        importSiraBtn.addEventListener('click', () => {
            document.getElementById('sira-modal').classList.remove('hidden');
        });
    }
    
    // Procesar SIRA
    const processSiraBtn = document.getElementById('process-sira-btn');
    if (processSiraBtn) {
        processSiraBtn.addEventListener('click', () => {
            const siraInput = document.getElementById('sira-input');
            const siraText = siraInput.value.trim();
            
            if (!siraText) {
                alert('Por favor, pega los datos del SIRA');
                return;
            }
            
            try {
                const processed = processSiraData(siraText);
                
                if (processed.length > 0) {
                    render();
                    document.getElementById('sira-modal').classList.add('hidden');
                    alert(`Se procesaron ${processed.length} materias aprobadas`);
                } else {
                    alert('No se encontraron materias aprobadas en los datos proporcionados');
                }
            } catch (error) {
                console.error('Error al procesar SIRA:', error);
                alert('Error al procesar los datos del SIRA. Verifica el formato.');
            }
        });
    }
    
    // Equivalencias
    const addEquivalencyBtn = document.getElementById('add-equivalency-btn');
    if (addEquivalencyBtn) {
        addEquivalencyBtn.addEventListener('click', () => {
            document.getElementById('equivalency-modal').classList.remove('hidden');
        });
    }
    
    const addEquivalencySubmit = document.getElementById('add-equivalency-submit');
    if (addEquivalencySubmit) {
        addEquivalencySubmit.addEventListener('click', () => {
            const name = document.getElementById('equiv-name').value.trim();
            const credits = parseInt(document.getElementById('equiv-credits').value);
            const type = document.getElementById('equiv-type').value;
            
            if (!name || !credits || !type) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            const equivalency = {
                id: `equiv-${Date.now()}`,
                name,
                credits,
                type,
                completed: true
            };
            
            plannerState.equivalencies.push(equivalency);
            
            // Limpiar formulario
            document.getElementById('equiv-name').value = '';
            document.getElementById('equiv-credits').value = '';
            document.getElementById('equiv-type').value = '';
            
            render();
            document.getElementById('equivalency-modal').classList.add('hidden');
        });
    }
    
    // Contraer/Expandir semestres
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', () => {
            plannerState.semesters.forEach(s => s.collapsed = true);
            render();
        });
    }
    
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => {
            plannerState.semesters.forEach(s => s.collapsed = false);
            render();
        });
    }
    
    // Cerrar modales
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('hidden');
        }
        
        if (e.target.classList.contains('modal-close-btn')) {
            e.target.closest('.modal-overlay').classList.add('hidden');
        }
    });
}

function setupModalTabs() {
    const modalTabs = document.querySelectorAll('.modal-tab');
    const modalTabContents = document.querySelectorAll('.modal-tab-content');
    
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            modalTabs.forEach(t => t.classList.remove('active'));
            modalTabContents.forEach(content => content.classList.remove('active'));
            
            tab.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Función global para remover equivalencias (llamada desde HTML)
window.removeEquivalency = removeEquivalency;
