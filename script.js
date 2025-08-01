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

// =================== INICIALIZACIÓN SEGURA ===================
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
    
    notification.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// =================== FUNCIÓN GLOBAL PARA SELECCIONAR CARRERA ===================
function selectCareer(careerId) {
    console.log('=== INICIANDO SELECCIÓN DE CARRERA ===');
    console.log('Career ID:', careerId);
    
    if (!auth || !auth.currentUser) {
        console.error('Firebase Auth no está disponible o usuario no autenticado');
        showNotification('Error: No hay usuario autenticado', 'error');
        return;
    }

    console.log('Usuario autenticado:', auth.currentUser.email);

    // Show loading
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        console.log('Mostrando overlay de carga');
    }

    // Set current career
    currentCareerId = careerId;
    console.log('Career ID establecido:', currentCareerId);
    
    // Load planner data
    loadPlannerData(auth.currentUser.uid, careerId);
}

// Hacer la función disponible globalmente
window.selectCareer = selectCareer;

// =================== AUTENTICACIÓN ===================
function setupAuthStateListener() {
    if (!auth) {
        console.error('Auth no está inicializado');
        return;
    }

    auth.onAuthStateChanged(user => {
        console.log('=== CAMBIO DE ESTADO DE AUTENTICACIÓN ===');
        console.log('Usuario:', user ? user.email : 'No logueado');
        
        const ui = {
            auth: document.getElementById('auth-container'),
            app: document.getElementById('app-container'),
            career: document.getElementById('career-selection-container'),
            loading: document.getElementById('loading-overlay')
        };

        // Ocultar loading inicialmente
        if (ui.loading) ui.loading.classList.add('hidden');

        if (user) {
            console.log('Usuario autenticado:', user.email);
            ui.auth?.classList.add('hidden');
            showCareerSelection(user);
        } else {
            console.log('Usuario no autenticado');
            if (unsubscribePlanner) unsubscribePlanner();
            
            // Reset state
            plannerState = {};
            currentCareerId = null;
            
            // Show auth UI
            ui.auth?.classList.remove('hidden');
            ui.app?.classList.add('hidden');
            ui.career?.classList.add('hidden');
        }
    });
}

function loginWithGoogle() {
    console.log('Iniciando login con Google');
    const button = document.getElementById('google-login-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    }

    auth.signInWithPopup(googleProvider)
        .then((result) => {
            console.log('Login exitoso:', result.user.email);
            showNotification('¡Bienvenido! Iniciando sesión...', 'success');
        })
        .catch((error) => {
            console.error('Error en login:', error);
            let errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Login cancelado por el usuario.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Popup bloqueado. Por favor permite popups para este sitio.';
            }
            
            showNotification(errorMessage, 'error');
        })
        .finally(() => {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fab fa-google"></i> Iniciar sesión con Google';
            }
        });
}

function loginWithEmail(email, password) {
    console.log('Iniciando login con email:', email);
    return auth.signInWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('Login con email exitoso:', result.user.email);
            showNotification('¡Bienvenido! Iniciando sesión...', 'success');
        })
        .catch((error) => {
            console.error('Error en login con email:', error);
            let errorMessage = 'Error al iniciar sesión.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No se encontró una cuenta con este email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Contraseña incorrecta.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos fallidos. Inténtalo más tarde.';
            }
            
            showNotification(errorMessage, 'error');
            throw error;
        });
}

function showCareerSelection(user) {
    console.log('=== MOSTRANDO SELECCIÓN DE CARRERA ===');
    console.log('Usuario:', user.email);
    
    const ui = {
        auth: document.getElementById('auth-container'),
        app: document.getElementById('app-container'),
        career: document.getElementById('career-selection-container'),
        loading: document.getElementById('loading-overlay')
    };

    // Hide all containers first
    ui.auth?.classList.add('hidden');
    ui.app?.classList.add('hidden');
    ui.loading?.classList.add('hidden');

    // Show career selection
    ui.career?.classList.remove('hidden');

    console.log('UI de selección de carrera mostrada');
}

// =================== LÓGICA DE DATOS Y PLANES ===================
function getActivePlan() {
    if (plannerState && plannerState.plans && plannerState.activePlanId) {
        return plannerState.plans[plannerState.activePlanId];
    }
    return null;
}

function getInitialStateForUser() {
    console.log('=== CREANDO ESTADO INICIAL ===');
    
    // Verificar que PENSUM_DI esté disponible
    if (typeof PENSUM_DI === 'undefined') {
        console.error('PENSUM_DI no está definido. Verificar que pensum-di.js se cargue correctamente.');
        showNotification('Error: No se pudo cargar el pensum', 'error');
        return null;
    }
    
    console.log('PENSUM_DI cargado correctamente, materias:', PENSUM_DI.length);
    
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
    
    console.log('Estado inicial creado exitosamente');
    return initialState;
}

function loadPlannerData(userId, careerId) {
    console.log('=== CARGANDO DATOS DEL PLANIFICADOR ===');
    console.log('Usuario:', userId);
    console.log('Carrera:', careerId);
    
    if (!db) {
        console.error('Firestore no está inicializado');
        showNotification('Error: Base de datos no disponible', 'error');
        return;
    }
    
    const docRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    
    unsubscribePlanner = docRef.onSnapshot(doc => {
        console.log('=== SNAPSHOT RECIBIDO ===');
        console.log('Documento existe:', doc.exists);
        
        if (doc.exists && doc.data().plans) {
            plannerState = doc.data();
            console.log('Estado cargado desde Firestore');
        } else {
            console.log('Creando estado inicial');
            const initialState = getInitialStateForUser();
            
            if (!initialState) {
                console.error('No se pudo crear el estado inicial');
                return;
            }
            
            plannerState = initialState;
            // Save initial state
            savePlannerData();
        }
        
        // Inicializar la UI
        initializeAppUI(auth.currentUser);
    }, error => {
        console.error("Error al cargar datos:", error);
        showNotification("No se pudieron cargar tus datos.", 'error');
        
        // Initialize with default state on error
        const initialState = getInitialStateForUser();
        if (initialState) {
            plannerState = initialState;
            initializeAppUI(auth.currentUser);
        }
    });
}

function savePlannerData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (!auth.currentUser || !currentCareerId || isSaving) return;

        isSaving = true;
        console.log('Guardando datos...');

        const docRef = db.collection('users')
            .doc(auth.currentUser.uid)
            .collection('planners')
            .doc(currentCareerId);

        docRef.set(plannerState)
            .then(() => {
                console.log('Datos guardados exitosamente');
            })
            .catch(error => {
                console.error("Error al guardar:", error);
                showNotification("Error al guardar cambios", 'error');
            })
            .finally(() => {
                isSaving = false;
            });
    }, 1500);
}

// =================== INICIALIZACIÓN Y RENDERIZADO ===================
function initializeAppUI(user) {
    console.log('=== INICIALIZANDO UI DE LA APLICACIÓN ===');
    console.log('Usuario:', user.email);
    
    // Hide loading and career selection
    const loadingOverlay = document.getElementById('loading-overlay');
    const careerContainer = document.getElementById('career-selection-container');
    const appContainer = document.getElementById('app-container');
    
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        console.log('Overlay de carga ocultado');
    }
    
    if (careerContainer) {
        careerContainer.classList.add('hidden');
        console.log('Selección de carrera ocultada');
    }
    
    // Show main app
    if (appContainer) {
        appContainer.classList.remove('hidden');
        console.log('Aplicación principal mostrada');
    }

    // Set user info
    const avatar = document.getElementById('user-avatar');
    if (avatar && user) {
        if (user.photoURL) {
            avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'Usuario'}">`;
        } else {
            const initials = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            avatar.innerHTML = initials;
        }
    }

    // Initial render
    render();
    
    // Setup event listeners (solo si no se han configurado ya)
    if (!window.eventListenersSetup) {
        setupEventListeners();
        window.eventListenersSetup = true;
    }
    
    showNotification('¡Datos cargados exitosamente!', 'success');
    console.log('UI inicializada correctamente');
}

function render() {
    const appContainer = document.getElementById('app-container');
    if (!appContainer || appContainer.classList.contains('hidden')) {
        console.log('App container oculto, no renderizando');
        return;
    }

    const plan = getActivePlan();
    if (!plan) {
        console.warn('No hay plan activo');
        return;
    }

    console.log('Renderizando plan:', plan.name);

    renderPlanSlots();
    renderStatsBoard(plan);
    renderSubjectBank(plan);
    renderSemesters(plan);
    
    savePlannerData();
}

// =================== RENDERIZADO BÁSICO ===================
function renderPlanSlots() {
    const activeButton = document.getElementById('active-plan-button');
    if (!activeButton) return;
    
    const activePlan = getActivePlan();
    if (!activePlan) return;

    activeButton.innerHTML = `${activePlan.name} <i class="fas fa-chevron-down"></i>`;
}

function renderStatsBoard(plan) {
    const container = document.getElementById('stats-board');
    if (!container) return;

    const stats = calculateStats(plan);
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">Progreso Total</span>
                <span class="stat-value">${stats.completedCredits}/${stats.totalCredits}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill completed" style="width: ${stats.completionPercentage}%"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">Materias Vistas</span>
                <span class="stat-value">${stats.completedSubjects}/${stats.totalSubjects}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${(stats.completedSubjects / stats.totalSubjects) * 100}%"></div>
            </div>
        </div>
    `;
}

function calculateStats(plan) {
    const subjects = plan.subjects || [];
    const completed = subjects.filter(s => s.completed);
    
    const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
    const completedCredits = completed.reduce((sum, s) => sum + s.credits, 0);
    
    return {
        totalSubjects: subjects.length,
        completedSubjects: completed.length,
        totalCredits,
        completedCredits,
        completionPercentage: totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0
    };
}

function renderSubjectBank(plan) {
    const container = document.getElementById('subject-bank');
    if (!container) return;

    const subjects = plan.subjects.filter(s => s.location === 'bank');
    
    container.innerHTML = subjects.length ? 
        subjects.map(subject => createSubjectCardHTML(subject, plan)).join('') :
        '<div class="no-results"><i class="fas fa-search"></i><p>No hay materias en el banco</p></div>';
}

function createSubjectCardHTML(subject, plan) {
    return `
        <div class="subject-card" data-subject-id="${subject.id}">
            <div class="subject-header">
                <span class="subject-code">${subject.id}</span>
                <span class="subject-credits">${subject.credits} cr</span>
            </div>
            <div class="subject-name">${subject.name}</div>
            <div class="subject-type">${getTypeLabel(subject.type)}</div>
        </div>
    `;
}

function renderSemesters(plan) {
    const container = document.getElementById('semesters-grid');
    if (!container) return;

    container.innerHTML = '';

    plan.semesters.forEach(semester => {
        const column = document.createElement('div');
        column.className = 'semester-column';
        column.innerHTML = `
            <div class="semester-header">
                <h3>${semester.name}</h3>
            </div>
            <div class="semester-content">
                <div class="drop-zone">
                    <span>Arrastra materias aquí</span>
                </div>
            </div>
        `;
        container.appendChild(column);
    });
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    console.log('=== CONFIGURANDO EVENT LISTENERS ===');
    
    // Auth event listeners
    setupAuthEventListeners();
    
    // Career selection
    setupCareerEventListeners();
    
    // App event listeners
    setupAppEventListeners();
}

function setupAuthEventListeners() {
    // Google login
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
        console.log('Event listener configurado para Google login');
    }

    // Email form
    const emailForm = document.getElementById('email-login-form');
    if (emailForm) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const submitBtn = emailForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
            
            loginWithEmail(email, password)
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar sesión';
                });
        });
        console.log('Event listener configurado para email login');
    }
}

function setupCareerEventListeners() {
    // Logout from career selection
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
        console.log('Event listener configurado para logout desde career selection');
    }
}

function setupAppEventListeners() {
    // Logout from app
    const logoutAppBtn = document.getElementById('logout-app-btn');
    if (logoutAppBtn) {
        logoutAppBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                auth.signOut();
            }
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// =================== HELPER FUNCTIONS ===================
function getTypeLabel(type) {
    const labels = {
        'AB': 'Área Básica',
        'AP': 'Área Profesional',
        'EP': 'Electiva Profesional',
        'EL': 'Electiva Libre'
    };
    return labels[type] || type;
}

// =================== FUNCIONES PLACEHOLDER ===================
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// =================== INICIALIZACIÓN PRINCIPAL ===================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INICIANDO APLICACIÓN ===');
    console.log('DOM cargado');
    
    // Inicializar Firebase
    if (!initializeFirebase()) {
        return;
    }
    
    // Verificar que el pensum esté disponible
    if (typeof PENSUM_DI === 'undefined') {
        console.error('PENSUM_DI no está disponible');
        showNotification('Error: Pensum no se pudo cargar. Verifica que el archivo pensums/pensum-di.js esté disponible.', 'error');
        return;
    }
    
    console.log('PENSUM_DI cargado:', PENSUM_DI.length, 'materias');
    
    // Configurar listener de autenticación
    setupAuthStateListener();
    
    console.log('=== APLICACIÓN INICIALIZADA CORRECTAMENTE ===');
});
