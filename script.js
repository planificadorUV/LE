// =================== CONFIGURACIÓN DE FIREBASE ===================
const firebaseConfig = {
    apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
    authDomain: "planificadoruv.firebaseapp.com",
    projectId: "planificadoruv",
    storageBucket: "planificadoruv.firebasestorage.app",
    messagingSenderId: "289578190596",
    appId: "1:289578190596:web:d45140a8bd7aff44b13251"
};

// =================== VARIABLES GLOBALES ===================
let app, auth, db, googleProvider;
let plannerState = {};
let currentCareerId = null;
let unsubscribePlanner = null;
let draggedElementId = null;
let selectedSubjectId = null;
let isSaving = false;
let saveTimeout = null;
let touchMoveMode = false;
let selectedTouchElement = null;
let processedSiraData = null;
let currentActiveTab = 'pensum';
let eventListenersSetup = false;

// =================== SISTEMA DE NOTIFICACIONES ===================
function showNotification(message, type = 'info', duration = 3000) {
    console.log(`Notificación ${type}: ${message}`);
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `<i class="${icons[type]}"></i> <span>${message}</span>`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// =================== INICIALIZACIÓN FIREBASE ===================
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase no está disponible');
            showNotification('Error: Firebase no se pudo cargar', 'error');
            return false;
        }
        
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        
        console.log('Firebase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('Error inicializando Firebase:', error);
        showNotification('Error inicializando Firebase', 'error');
        return false;
    }
}

// =================== FUNCIONES DE AUTENTICACIÓN ===================
function setupAuthStateListener() {
    if (!auth) {
        console.error('Auth no está inicializado');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        console.log('=== CAMBIO DE ESTADO AUTH ===');
        console.log('Usuario:', user ? user.email : 'No logueado');
        
        const ui = {
            auth: document.getElementById('auth-container'),
            app: document.getElementById('app-container'),
            career: document.getElementById('career-selection-container'),
            loading: document.getElementById('loading-overlay')
        };
        
        if (ui.loading) ui.loading.classList.add('hidden');
        
        if (user) {
            console.log('Usuario autenticado:', user.email);
            ui.auth?.classList.add('hidden');
            showCareerSelection(user);
        } else {
            console.log('Usuario no autenticado - mostrando login');
            if (unsubscribePlanner) unsubscribePlanner();
            plannerState = {};
            currentCareerId = null;
            ui.auth?.classList.remove('hidden');
            ui.app?.classList.add('hidden');
            ui.career?.classList.add('hidden');
        }
    });
}

function loginWithGoogle() {
    console.log('Login con Google');
    const button = document.getElementById('google-login-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    }
    
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            console.log('Login exitoso:', result.user.email);
            showNotification('¡Bienvenido!', 'success');
        })
        .catch((error) => {
            console.error('Error en login:', error);
            showNotification('Error al iniciar sesión: ' + error.message, 'error');
        })
        .finally(() => {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fab fa-google"></i> Iniciar sesión con Google';
            }
        });
}

function loginWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('Login con email exitoso:', result.user.email);
            showNotification('¡Bienvenido!', 'success');
        })
        .catch((error) => {
            console.error('Error en login con email:', error);
            showNotification('Error al iniciar sesión: ' + error.message, 'error');
            throw error;
        });
}

function showCareerSelection(user) {
    console.log('=== MOSTRANDO SELECCIÓN DE CARRERA ===');
    const ui = {
        auth: document.getElementById('auth-container'),
        app: document.getElementById('app-container'),
        career: document.getElementById('career-selection-container'),
        loading: document.getElementById('loading-overlay')
    };
    
    ui.auth?.classList.add('hidden');
    ui.app?.classList.add('hidden');
    ui.loading?.classList.add('hidden');
    ui.career?.classList.remove('hidden');
    
    console.log('Selección de carrera mostrada');
}

// =================== FUNCIÓN GLOBAL PARA SELECCIONAR CARRERA ===================
function selectCareer(careerId) {
    console.log('=== SELECCIONANDO CARRERA ===');
    console.log('Career ID:', careerId);
    
    if (!auth || !auth.currentUser) {
        console.error('Usuario no autenticado');
        showNotification('Error: No hay usuario autenticado', 'error');
        return;
    }
    
    console.log('Usuario:', auth.currentUser.email);
    
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
    
    currentCareerId = careerId;
    loadPlannerData(auth.currentUser.uid, careerId);
}

// =================== LÓGICA DE DATOS ===================
function getActivePlan() {
    if (plannerState && plannerState.plans && plannerState.activePlanId) {
        return plannerState.plans[plannerState.activePlanId];
    }
    return null;
}

function getInitialStateForUser() {
    console.log('=== CREANDO ESTADO INICIAL ===');
    
    if (typeof PENSUM_DI === 'undefined') {
        console.error('PENSUM_DI no está definido');
        showNotification('Error: No se pudo cargar el pensum', 'error');
        return null;
    }
    
    console.log('PENSUM_DI tiene', PENSUM_DI.length, 'materias');
    
    const initialPlanId = 'plan_1';
    const initialState = {
        activePlanId: initialPlanId,
        plans: {
            [initialPlanId]: {
                name: 'Plan Principal',
                subjects: PENSUM_DI.map(subject => ({
                    ...subject,
                    completed: false,
                    location: 'bank',
                    equivalencies: []
                })),
                semesters: [
                    { id: 1, name: 'Semestre 1', collapsed: false },
                    { id: 2, name: 'Semestre 2', collapsed: false }
                ],
                customSubjects: []
            }
        }
    };
    
    console.log('Estado inicial creado');
    return initialState;
}

function loadPlannerData(userId, careerId) {
    console.log('=== CARGANDO DATOS ===');
    console.log('Usuario:', userId);
    console.log('Carrera:', careerId);
    
    if (!db) {
        console.error('Firestore no disponible');
        showNotification('Error: Base de datos no disponible', 'error');
        return;
    }
    
    const docRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    
    unsubscribePlanner = docRef.onSnapshot(doc => {
        console.log('=== SNAPSHOT FIRESTORE ===');
        console.log('Documento existe:', doc.exists);
        
        if (doc.exists) {
            const data = doc.data();
            console.log('Datos cargados desde Firebase:', data);
            
            if (data && data.plans) {
                plannerState = data;
                console.log('Estado establecido desde Firebase');
            } else {
                console.log('Datos en formato incorrecto, creando estado inicial');
                const initialState = getInitialStateForUser();
                if (initialState) {
                    plannerState = initialState;
                    savePlannerData();
                }
            }
        } else {
            console.log('Documento no existe, creando estado inicial');
            const initialState = getInitialStateForUser();
            if (initialState) {
                plannerState = initialState;
                savePlannerData();
            }
        }
        
        initializeAppUI(auth.currentUser);
    }, error => {
        console.error("Error cargando datos:", error);
        showNotification("Error cargando datos", 'error');
        
        const initialState = getInitialStateForUser();
        if (initialState) {
            plannerState = initialState;
            initializeAppUI(auth.currentUser);
        }
    });
}

function savePlannerData() {
    if (!auth.currentUser || !currentCareerId || isSaving) return;
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        isSaving = true;
        console.log('Guardando datos en Firebase...');
        
        const docRef = db.collection('users')
            .doc(auth.currentUser.uid)
            .collection('planners')
            .doc(currentCareerId);
            
        docRef.set(plannerState)
            .then(() => {
                console.log('Datos guardados en Firebase');
                showNotification('Cambios guardados exitosamente', 'success');
            })
            .catch(error => {
                console.error("Error guardando:", error);
                showNotification("Error guardando cambios", 'error');
            })
            .finally(() => {
                isSaving = false;
            });
    }, 1000);
}

// =================== INICIALIZACIÓN UI ===================
function initializeAppUI(user) {
    console.log('=== INICIALIZANDO UI ===');
    console.log('Usuario:', user.email);
    console.log('Estado del planificador:', plannerState);
    
    if (!plannerState || !plannerState.plans) {
        console.error('No hay datos del planificador');
        showNotification('Error: No se pudieron cargar los datos', 'error');
        return;
    }
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const careerContainer = document.getElementById('career-selection-container');
    const appContainer = document.getElementById('app-container');
    
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    if (careerContainer) careerContainer.classList.add('hidden');
    if (appContainer) {
        appContainer.classList.remove('hidden');
        console.log('Aplicación principal mostrada');
    }
    
    // Configurar avatar del usuario
    const avatar = document.getElementById('user-avatar');
    if (avatar && user) {
        if (user.photoURL) {
            avatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar de ${user.displayName || 'Usuario'}">`;
        } else {
            const initials = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            avatar.innerHTML = initials;
        }
    }
    
    render();
    
    if (!eventListenersSetup) {
        setupEventListeners();
        eventListenersSetup = true;
        console.log('Event listeners configurados');
    }
    
    showNotification('¡Aplicación cargada correctamente!', 'success');
    console.log('UI inicializada exitosamente');
}

// =================== CONFIGURACIÓN DE EVENT LISTENERS ===================
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Auth listeners
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
    }
    
    const emailForm = document.getElementById('email-login-form');
    if (emailForm) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            loginWithEmail(email, password);
        });
    }
    
    const toggleRegisterBtn = document.getElementById('toggle-register');
    if (toggleRegisterBtn) {
        toggleRegisterBtn.addEventListener('click', () => {
            showNotification('Función de registro por implementar', 'info');
        });
    }
    
    // Logout buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { auth.signOut(); });
    }
    
    const logoutAppBtn = document.getElementById('logout-app-btn');
    if (logoutAppBtn) {
        logoutAppBtn.addEventListener('click', () => { auth.signOut(); });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Zen mode toggle
    const zenToggle = document.getElementById('zen-mode-toggle');
    if (zenToggle) {
        zenToggle.addEventListener('click', toggleZenMode);
    }
    
    // Search functionality
    const searchInput = document.getElementById('subject-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => { render(); }, 300));
    }
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            render();
        });
    });
    
    // Semester controls
    const addSemesterBtn = document.getElementById('add-semester-btn');
    if (addSemesterBtn) {
        addSemesterBtn.addEventListener('click', addSemester);
    }
    
    const resetPlanBtn = document.getElementById('reset-plan-btn');
    if (resetPlanBtn) {
        resetPlanBtn.addEventListener('click', resetPlan);
    }
    
    // Modal functionality
    setupModalListeners();
    
    // Drag and drop
    setupDragAndDrop();
    
    console.log('Event listeners configurados exitosamente');
}

// =================== FUNCIONES AUXILIARES ===================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = body.dataset.theme;
    
    if (currentTheme === 'dark') {
        body.dataset.theme = 'light';
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        body.dataset.theme = 'dark';
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    localStorage.setItem('theme', body.dataset.theme);
}

function toggleZenMode() {
    document.body.classList.toggle('zen-mode');
    const zenToggle = document.getElementById('zen-mode-toggle');
    const isZen = document.body.classList.contains('zen-mode');
    zenToggle.innerHTML = isZen ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
}

// =================== FUNCIONES DE RENDERIZADO ===================
function render() {
    console.log('=== RENDERIZANDO APLICACIÓN ===');
    
    const appContainer = document.getElementById('app-container');
    if (!appContainer || appContainer.classList.contains('hidden')) {
        console.log('App container no visible');
        return;
    }
    
    const plan = getActivePlan();
    if (!plan) {
        console.error('No hay plan activo para renderizar');
        showNotification('Error: No hay plan activo', 'error');
        return;
    }
    
    console.log('Renderizando plan:', plan.name);
    
    try {
        renderPlanSlots();
        renderStatsBoard(plan);
        renderSubjectBank(plan);
        renderSemesters(plan);
        renderSubjectInfo();
        console.log('Renderizado completado exitosamente');
    } catch (error) {
        console.error('Error durante el renderizado:', error);
        showNotification('Error renderizando la aplicación', 'error');
    }
    
    savePlannerData();
}

function renderPlanSlots() {
    const activeButton = document.getElementById('active-plan-button');
    if (activeButton) {
        const plan = getActivePlan();
        activeButton.textContent = plan ? plan.name : 'Sin plan activo';
    }
}

function renderStatsBoard(plan) {
    const statsBoard = document.querySelector('.stats-board');
    if (!statsBoard || !plan) return;
    
    const completedSubjects = plan.subjects.filter(s => s.completed).length;
    const totalSubjects = plan.subjects.length;
    const progressPercentage = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;
    
    statsBoard.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${progressPercentage}%</div>
            <div class="stat-label">Progreso</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completedSubjects}/${totalSubjects}</div>
            <div class="stat-label">Materias</div>
        </div>
    `;
}

function renderSubjectBank(plan) {
    const bank = document.getElementById('subject-bank');
    if (!bank || !plan) return;
    
    const searchTerm = document.getElementById('subject-search')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
    
    let filteredSubjects = plan.subjects.filter(subject => {
        const matchesSearch = subject.name.toLowerCase().includes(searchTerm) ||
                            subject.code.toLowerCase().includes(searchTerm);
        
        switch (activeFilter) {
            case 'available':
                return matchesSearch && !subject.completed && subject.location === 'bank';
            case 'completed':
                return matchesSearch && subject.completed;
            default:
                return matchesSearch;
        }
    });
    
    bank.innerHTML = filteredSubjects.map(subject => `
        <div class="subject-card ${subject.completed ? 'completed' : ''}" 
             data-subject-id="${subject.id}"
             draggable="true">
            <div class="subject-header">
                <span class="subject-code">${subject.code}</span>
                <span class="subject-credits">${subject.credits} cr</span>
            </div>
            <div class="subject-name">${subject.name}</div>
        </div>
    `).join('');
}

function renderSemesters(plan) {
    const grid = document.getElementById('semesters-grid');
    if (!grid || !plan) return;
    
    grid.innerHTML = plan.semesters.map(semester => `
        <div class="semester-column" data-semester-id="${semester.id}">
            <div class="semester-header">
                <h4>${semester.name}</h4>
                <div class="semester-controls">
                    <button class="btn-icon" onclick="toggleSemester(${semester.id})">
                        <i class="fas fa-${semester.collapsed ? 'expand' : 'compress'}-alt"></i>
                    </button>
                    <button class="btn-icon" onclick="removeSemester(${semester.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="semester-subjects ${semester.collapsed ? 'collapsed' : ''}">
                ${renderSemesterSubjects(plan, semester.id)}
            </div>
        </div>
    `).join('');
}

function renderSemesterSubjects(plan, semesterId) {
    const semesterSubjects = plan.subjects.filter(s => 
        s.location === 'semester' && s.semesterId === semesterId
    );
    
    return semesterSubjects.map(subject => `
        <div class="subject-card" data-subject-id="${subject.id}">
            <div class="subject-header">
                <span class="subject-code">${subject.code}</span>
                <span class="subject-credits">${subject.credits} cr</span>
            </div>
            <div class="subject-name">${subject.name}</div>
        </div>
    `).join('');
}

function renderSubjectInfo() {
    const content = document.getElementById('subject-info-content');
    if (!content) return;
    
    if (selectedSubjectId) {
        const plan = getActivePlan();
        const subject = plan?.subjects.find(s => s.id === selectedSubjectId);
        
        if (subject) {
            content.innerHTML = `
                <div class="subject-detail">
                    <h4>${subject.name}</h4>
                    <p><strong>Código:</strong> ${subject.code}</p>
                    <p><strong>Créditos:</strong> ${subject.credits}</p>
                    <p><strong>Estado:</strong> ${subject.completed ? 'Completada' : 'Pendiente'}</p>
                    ${subject.prerequisites?.length ? `
                        <p><strong>Prerrequisitos:</strong></p>
                        <ul>
                            ${subject.prerequisites.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `;
        }
    } else {
        content.innerHTML = `
            <div class="placeholder-text">
                <p>Selecciona una materia para ver su información</p>
            </div>
        `;
    }
}

// =================== FUNCIONES DE INTERACCIÓN ===================
function addSemester() {
    const plan = getActivePlan();
    if (!plan) return;
    
    const newId = Math.max(...plan.semesters.map(s => s.id), 0) + 1;
    plan.semesters.push({
        id: newId,
        name: `Semestre ${newId}`,
        collapsed: false
    });
    
    render();
    showNotification('Semestre agregado exitosamente', 'success');
}

function resetPlan() {
    if (!confirm('¿Estás seguro de que quieres reiniciar el plan? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const initialState = getInitialStateForUser();
    if (initialState) {
        plannerState = initialState;
        render();
        showNotification('Plan reiniciado exitosamente', 'success');
    }
}

function toggleSemester(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const semester = plan.semesters.find(s => s.id === semesterId);
    if (semester) {
        semester.collapsed = !semester.collapsed;
        render();
    }
}

function removeSemester(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    if (plan.semesters.length <= 2) {
        showNotification('Debe haber al menos 2 semestres', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este semestre?')) {
        return;
    }
    
    // Mover materias de vuelta al banco
    plan.subjects.forEach(subject => {
        if (subject.location === 'semester' && subject.semesterId === semesterId) {
            subject.location = 'bank';
            delete subject.semesterId;
        }
    });
    
    // Eliminar el semestre
    plan.semesters = plan.semesters.filter(s => s.id !== semesterId);
    
    render();
    showNotification('Semestre eliminado exitosamente', 'success');
}

// =================== DRAG AND DROP ===================
function setupDragAndDrop() {
    // Esta función se llama después de cada render para configurar los eventos
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('click', handleSubjectClick);
    });
    
    document.querySelectorAll('.semester-column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedElementId = e.target.dataset.subjectId;
    e.dataTransfer.setData('text/plain', draggedElementId);
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    
    const semesterId = parseInt(e.currentTarget.dataset.semesterId);
    const subjectId = e.dataTransfer.getData('text/plain');
    
    moveSubjectToSemester(subjectId, semesterId);
}

function handleSubjectClick(e) {
    selectedSubjectId = e.currentTarget.dataset.subjectId;
    
    // Remover selección anterior
    document.querySelectorAll('.subject-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Agregar selección actual
    e.currentTarget.classList.add('selected');
    
    renderSubjectInfo();
}

function moveSubjectToSemester(subjectId, semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const subject = plan.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    subject.location = 'semester';
    subject.semesterId = semesterId;
    
    render();
    showNotification(`${subject.name} movida al semestre ${semesterId}`, 'success');
}

// =================== MODAL FUNCTIONALITY ===================
function setupModalListeners() {
    const modal = document.getElementById('equivalency-modal');
    const closeButtons = modal?.querySelectorAll('.modal-close, .modal-close-btn');
    
    closeButtons?.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('equivalency-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// =================== INICIALIZACIÓN ===================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando aplicación...');
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.dataset.theme = savedTheme;
    
    // Inicializar Firebase
    if (initializeFirebase()) {
        setupAuthStateListener();
    }
});

// Actualizar drag and drop después de cada render
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        setupDragAndDrop();
    });
    
    const targetNode = document.getElementById('app-container');
    if (targetNode) {
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }
});
