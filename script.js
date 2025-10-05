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
    
    notification.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
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
function setupLoginEventListeners() {
    console.log('Configurando event listeners de login...');
    
    // Login con Google
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
        console.log('Google login button listener configurado');
    }

    // Login con email
    const emailForm = document.getElementById('email-login-form');
    if (emailForm) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showNotification('Por favor, completa todos los campos', 'error');
                return;
            }
            
            if (!email.endsWith('@correounivalle.edu.co')) {
                showNotification('Debes usar tu correo institucional (@correounivalle.edu.co)', 'error');
                return;
            }
            
            loginWithEmail(email, password);
        });
        console.log('Email login form listener configurado');
    }

    // Registro con email
    const registerForm = document.getElementById('email-register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showNotification('Por favor, completa todos los campos', 'error');
                return;
            }
            
            if (!email.endsWith('@correounivalle.edu.co')) {
                showNotification('Debes usar tu correo institucional (@correounivalle.edu.co)', 'error');
                return;
            }
            
            if (password.length < 8) {
                showNotification('La contraseña debe tener al menos 8 caracteres', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Las contraseñas no coinciden', 'error');
                return;
            }
            
            registerWithEmail(email, password, name);
        });
        console.log('Email register form listener configurado');
    }

    // Toggle entre login y registro
    const toggleRegister = document.getElementById('toggle-register');
    if (toggleRegister) {
        toggleRegister.addEventListener('click', toggleAuthMode);
        console.log('Toggle register button listener configurado');
    }
}

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
            showNotification('Error al iniciar sesión', 'error');
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
            let errorMessage = 'Error al iniciar sesión';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No existe una cuenta con este correo';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Correo electrónico inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Esta cuenta ha sido deshabilitada';
                    break;
                default:
                    errorMessage = 'Error al iniciar sesión: ' + error.message;
            }
            
            showNotification(errorMessage, 'error');
            throw error;
        });
}

function registerWithEmail(email, password, name, studentId) {
    console.log('Registrando usuario:', email);
    
    return auth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('Registro exitoso:', result.user.email);
            
            // Actualizar el perfil del usuario con el nombre
            return result.user.updateProfile({
                displayName: name
            }).then(() => {
                // Guardar información adicional en Firestore
                return db.collection('users').doc(result.user.uid).set({
                    email: email,
                    name: name,
                    studentId: studentId,
                    career: null, // Se seleccionará después
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(() => {
                showNotification('¡Cuenta creada exitosamente! Bienvenido ' + name, 'success');
                console.log('Información del usuario guardada en Firestore');
            });
        })
        .catch((error) => {
            console.error('Error en registro:', error);
            let errorMessage = 'Error al crear la cuenta';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Ya existe una cuenta con este correo electrónico';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Correo electrónico inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'El registro con email no está habilitado';
                    break;
                default:
                    errorMessage = 'Error al crear la cuenta: ' + error.message;
            }
            
            showNotification(errorMessage, 'error');
            throw error;
        });
}

let isRegisterMode = false;

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    
    const loginForm = document.getElementById('email-login-form');
    const registerForm = document.getElementById('email-register-form');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleButton = document.getElementById('toggle-register');
    const googleBtnText = document.getElementById('google-btn-text');
    
    if (isRegisterMode) {
        // Cambiar a modo registro
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        toggleText.innerHTML = '¿Ya tienes cuenta? <button id="toggle-register" class="link-button">Inicia sesión</button>';
        googleBtnText.textContent = 'Registrarse con Google';
        
        // Limpiar campos de login
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
        console.log('Cambiado a modo registro');
    } else {
        // Cambiar a modo login
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        toggleText.innerHTML = '¿No tienes cuenta? <button id="toggle-register" class="link-button">Regístrate</button>';
        googleBtnText.textContent = 'Iniciar sesión con Google';
        
        // Limpiar campos de registro
        document.getElementById('register-name').value = '';
        document.getElementById('register-student-id').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        
        console.log('Cambiado a modo login');
    }
    
    // Re-configurar el event listener del botón toggle
    const newToggleButton = document.getElementById('toggle-register');
    if (newToggleButton) {
        newToggleButton.addEventListener('click', toggleAuthMode);
    }
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

    const avatar = document.getElementById('user-avatar');
    if (avatar && user) {
        if (user.photoURL) {
            avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'Usuario'}">`;
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
            // Implementar toggle de registro si es necesario
            showNotification('Función de registro por implementar', 'info');
        });
    }

    // Logout buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }

    const logoutAppBtn = document.getElementById('logout-app-btn');
    if (logoutAppBtn) {
        logoutAppBtn.addEventListener('click', () => {
            auth.signOut();
        });
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
        searchInput.addEventListener('input', debounce(() => {
            render();
        }, 300));
    }

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            render();
        });
    });

    // Modal functionality
    setupModalListeners();

    console.log('Event listeners configurados exitosamente');
}

function setupModalListeners() {
    // Cerrar modales con click fuera
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Equivalency modal listeners
    const pensumSearch = document.getElementById('pensum-search');
    if (pensumSearch) {
        pensumSearch.addEventListener('input', debounce(searchPensumSubjects, 300));
    }
}

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
    
    // Guardar preferencia
    localStorage.setItem('theme', body.dataset.theme);
}

function toggleZenMode() {
    document.body.classList.toggle('zen-mode');
    const zenToggle = document.getElementById('zen-mode-toggle');
    const isZen = document.body.classList.contains('zen-mode');
    zenToggle.innerHTML = `<i class="fas fa-${isZen ? 'compress' : 'expand'}"></i>`;
}

// =================== RENDERIZADO ===================
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
        console.log('Renderizado completado exitosamente');
    } catch (error) {
        console.error('Error durante el renderizado:', error);
        showNotification('Error renderizando la aplicación', 'error');
    }
    
    savePlannerData();
}

function renderPlanSlots() {
    const activeButton = document.getElementById('active-plan-button');
    const slotsList = document.getElementById('plan-slots-list');
    
    if (!activeButton || !plannerState.plans) return;
    
    const activePlan = getActivePlan();
    if (!activePlan) return;

    activeButton.innerHTML = `${activePlan.name} <i class="fas fa-chevron-down"></i>`;

    if (slotsList) {
        const planIds = Object.keys(plannerState.plans);
        slotsList.innerHTML = planIds.map(planId => {
            const plan = plannerState.plans[planId];
            const isActive = planId === plannerState.activePlanId;
            
            return `
                <div class="plan-slot-item ${isActive ? 'active' : ''}" onclick="switchToPlan('${planId}')">
                    <span>${plan.name}</span>
                    <div class="plan-slot-actions">
                        <button onclick="event.stopPropagation(); renamePlan('${planId}')" title="Renombrar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!isActive ? `<button onclick="event.stopPropagation(); deletePlan('${planId}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            `;
        }).join('') + (planIds.length < 3 ? `
            <div class="plan-slot-item">
                <input type="text" class="new-plan-input" placeholder="Nombre del nuevo plan..." onkeypress="if(event.key==='Enter') createNewPlan(this.value)">
            </div>
        ` : '');
    }
}

function renderStatsBoard(plan) {
    const container = document.getElementById('stats-board');
    if (!container) {
        console.warn('Stats board container no encontrado');
        return;
    }

    const stats = calculateStats(plan);
    console.log('Stats calculadas:', stats);
    
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
                <span class="stat-title">Ciclo Básico (AB)</span>
                <span class="stat-value">${stats.categories.AB?.completed || 0}/${stats.categories.AB?.required || 49}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.categories.AB ? Math.round((stats.categories.AB.completed / stats.categories.AB.required) * 100) : 0}%"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">Ciclo Profesional (AP)</span>
                <span class="stat-value">${stats.categories.AP?.completed || 0}/${stats.categories.AP?.required || 57}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.categories.AP ? Math.round((stats.categories.AP.completed / stats.categories.AP.required) * 100) : 0}%"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">Electivas Profesionales (EP)</span>
                <span class="stat-value">${stats.categories.EP?.completed || 0}/${stats.categories.EP?.required || 17}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.categories.EP ? Math.round((stats.categories.EP.completed / stats.categories.EP.required) * 100) : 0}%"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">
                    Electivas Formación General (EC)
                    <i class="fas fa-info-circle fg-info-icon" title="Solo cuentan materias con componente COM en SIRA (AHU, EVS, etc.). Las marcadas como SIN son electivas complementarias de la carrera y NO cuentan como FG."></i>
                </span>
                <span class="stat-value">${stats.categories.EC?.completed || 0}/${stats.categories.EC?.required || 17}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.categories.EC ? Math.round((stats.categories.EC.completed / stats.categories.EC.required) * 100) : 0}%"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">Inglés</span>
                <span class="stat-value">${stats.englishCompleted}/${stats.englishTotal}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill english" style="width: ${stats.englishTotal > 0 ? (stats.englishCompleted / stats.englishTotal) * 100 : 0}%"></div>
            </div>
        </div>
    `;
}

function calculateStats(plan) {
    const subjects = plan.subjects || [];
    const completed = subjects.filter(s => s.completed);
    
    // Valores correctos para Diseño Industrial
    const DI_REQUIREMENTS = {
        total: 140,
        AB: 49,  // Área Básica (Ciclo Básico)
        AP: 57,  // Área Profesional (Ciclo Profesional) 
        EP: 17,  // Electivas Profesionales
        EC: 17   // Electivas Complementarias (Formación General)
    };
    
    // Calcular créditos por categoría
    const categoryStats = {};
    Object.keys(DI_REQUIREMENTS).forEach(category => {
        if (category === 'total') return;
        
        const categorySubjects = subjects.filter(s => s.type === category);
        const categoryCompleted = categorySubjects.filter(s => s.completed);
        
        categoryStats[category] = {
            completed: categoryCompleted.reduce((sum, s) => sum + (s.credits || 0), 0),
            required: DI_REQUIREMENTS[category],
            subjects: categorySubjects.length,
            completedSubjects: categoryCompleted.length
        };
    });
    
    const totalCompletedCredits = completed.reduce((sum, s) => sum + (s.credits || 0), 0);
    
    // Inglés (parte del área básica pero se muestra por separado)
    const englishSubjects = subjects.filter(s => s.category === 'english' || s.type === 'english' || s.name.toLowerCase().includes('inglés'));
    const englishCompleted = englishSubjects.filter(s => s.completed).length;
    
    return {
        totalSubjects: subjects.length,
        completedSubjects: completed.length,
        totalCredits: DI_REQUIREMENTS.total,
        completedCredits: totalCompletedCredits,
        completionPercentage: Math.round((totalCompletedCredits / DI_REQUIREMENTS.total) * 100),
        englishTotal: englishSubjects.length,
        englishCompleted,
        categories: categoryStats
    };
}

function renderSubjectBank(plan) {
    const container = document.getElementById('subject-bank');
    if (!container) {
        console.warn('Subject bank container no encontrado');
        return;
    }

    const searchTerm = document.getElementById('subject-search')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
    
    let subjects = plan.subjects.filter(s => s.location === 'bank');
    
    if (searchTerm) {
        subjects = subjects.filter(s => 
            s.name.toLowerCase().includes(searchTerm) || 
            s.id.toLowerCase().includes(searchTerm)
        );
    }
    
    if (activeFilter !== 'all') {
        subjects = subjects.filter(s => {
            switch (activeFilter) {
                case 'available':
                    return canTakeSubject(s, plan) && !s.completed;
                case 'completed':
                    return s.completed;
                case 'locked':
                    return !canTakeSubject(s, plan) && !s.completed;
                default:
                    return true;
            }
        });
    }
    
    console.log('Materias en el banco:', subjects.length);
    
    if (subjects.length === 0) {
        container.innerHTML = '<div class="no-results"><i class="fas fa-graduation-cap"></i><p>No hay materias que coincidan con los filtros</p></div>';
        return;
    }
    
    container.innerHTML = subjects.map(subject => createSubjectCardHTML(subject, plan)).join('');
}

function createSubjectCardHTML(subject, plan) {
    const canTake = canTakeSubject(subject, plan);
    
    let cardClass = 'subject-card';
    if (subject.completed) cardClass += ' completed';
    if (!canTake && !subject.completed) cardClass += ' locked';
    if (canTake && !subject.completed) cardClass += ' available';
    if (selectedSubjectId === subject.id) cardClass += ' selected';

    const statusIcon = subject.completed ? 
        '<i class="fas fa-check-circle subject-status completed"></i>' : 
        (!canTake ? '<i class="fas fa-lock lock-icon"></i>' : '');

    return `
        <div class="${cardClass}" 
             data-subject-id="${subject.id}"
             onclick="selectSubject('${subject.id}')"
             ${canTake && !subject.completed ? 'draggable="true"' : ''}
             ondragstart="dragStart(event)">
            
            <div class="subject-header">
                <span class="subject-code">${subject.id}</span>
                <span class="subject-credits">${subject.credits || 0} cr</span>
            </div>
            
            <div class="subject-name">${subject.name}</div>
            
            <div class="subject-type">${getTypeLabel(subject.type)}</div>
            
            ${statusIcon}
        </div>
    `;
}

function renderSemesters(plan) {
    const container = document.getElementById('semesters-grid');
    if (!container) {
        console.warn('Semesters grid container no encontrado');
        return;
    }

    container.innerHTML = '';

    plan.semesters.forEach(semester => {
        const column = document.createElement('div');
        column.className = 'semester-column';
        column.dataset.semesterId = semester.id;
        if (semester.collapsed) column.classList.add('collapsed');

        const subjects = plan.subjects.filter(s => s.location === `semester-${semester.id}`);
        const credits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);

        column.innerHTML = `
            <div class="semester-header" onclick="toggleSemesterCollapse(${semester.id})">
                <h3>${semester.name}</h3>
                <div class="semester-info">
                    <span class="semester-credits ${credits > 18 ? 'high-load' : ''}">${credits} cr</span>
                    <div class="semester-controls">
                        <button class="semester-control-btn" onclick="event.stopPropagation(); renameSemester(${semester.id})" title="Renombrar semestre">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="semester-control-btn" onclick="event.stopPropagation(); deleteSemester(${semester.id})" title="Eliminar semestre">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="semester-content">
                <div class="drop-zone ${subjects.length ? 'has-subjects' : ''}" 
                     ondrop="dropSubject(event, ${semester.id})" 
                     ondragover="allowDrop(event)"
                     data-semester-id="${semester.id}">
                    ${subjects.length ? 
                        subjects.map(s => createSemesterSubjectHTML(s)).join('') : 
                        '<span>Arrastra materias aquí</span>'
                    }
                </div>
            </div>
        `;

        container.appendChild(column);
    });
}

function createSemesterSubjectHTML(subject) {
    return `
        <div class="semester-subject ${subject.completed ? 'completed' : ''}" 
             data-subject-id="${subject.id}"
             draggable="true"
             ondragstart="dragStart(event)"
             onclick="selectSubject('${subject.id}')">
            
            <div class="subject-header">
                <span class="subject-code">${subject.id}</span>
                <span class="subject-credits">${subject.credits || 0} cr</span>
            </div>
            
            <div class="subject-name">${subject.name}</div>
            
            <div class="subject-type">${getTypeLabel(subject.type)}</div>
            
            ${subject.completed ? '<i class="fas fa-check-circle subject-status completed"></i>' : ''}
        </div>
    `;
}

// =================== FUNCIONES DE UTILIDAD ===================
function canTakeSubject(subject, plan) {
    if (!subject.prerequisites || subject.prerequisites.length === 0) {
        return true;
    }
    
    return subject.prerequisites.every(prereqId => {
        const prereq = plan.subjects.find(s => s.id === prereqId);
        return prereq && prereq.completed;
    });
}

function getTypeLabel(type) {
    const typeLabels = {
        'AB': 'Área Básica',
        'AP': 'Área Profesional', 
        'EP': 'Electiva Profesional',
        'EC': 'Electiva Formación General',
        'english': 'Inglés',
        'practicas': 'Prácticas',
        'proyecto': 'Proyecto de Grado'
    };
    return typeLabels[type] || type || 'Sin categoría';
}

// =================== FUNCIONES DE INTERACCIÓN ===================
function selectSubject(subjectId) {
    console.log('Seleccionando materia:', subjectId);
    selectedSubjectId = subjectId;
    renderSubjectInfo(subjectId);
    
    document.querySelectorAll('.subject-card, .semester-subject').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelectorAll(`[data-subject-id="${subjectId}"]`).forEach(card => {
        card.classList.add('selected');
    });
}

function renderSubjectInfo(subjectId) {
    const container = document.getElementById('subject-info');
    if (!container) return;

    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-hand-pointer"></i><p>Selecciona una materia para ver su información</p></div>';
        return;
    }

    const prerequisites = subject.prerequisites || [];
    const postrequisites = plan.subjects.filter(s => 
        s.prerequisites && s.prerequisites.includes(subject.id)
    );

    container.innerHTML = `
        <div class="subject-details">
            <h4>${subject.name}</h4>
            
            <div class="detail-row">
                <span class="detail-label">Código:</span>
                <span class="detail-value">${subject.id}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Créditos:</span>
                <span class="detail-value">${subject.credits || 0}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Tipo:</span>
                <span class="detail-value">${getTypeLabel(subject.type)}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Estado:</span>
                <span class="detail-value">${subject.completed ? '✅ Vista' : '⏳ Pendiente'}</span>
            </div>
            
            ${prerequisites.length > 0 ? `
                <div class="prerequisites-list">
                    <h5>Prerrequisitos:</h5>
                    ${prerequisites.map(prereqId => {
                        const prereq = plan.subjects.find(s => s.id === prereqId);
                        return prereq ? `<div class="prereq-item">${prereq.id} - ${prereq.name}</div>` : '';
                    }).join('')}
                </div>
            ` : ''}
            
            ${postrequisites.length > 0 ? `
                <div class="postrequisites-list">
                    <h5>Habilita:</h5>
                    ${postrequisites.map(postreq => 
                        `<div class="postreq-item">${postreq.id} - ${postreq.name}</div>`
                    ).join('')}
                </div>
            ` : ''}
            
            <div class="subject-actions">
                <button onclick="toggleSubjectCompleted('${subject.id}')" class="btn-secondary">
                    <i class="fas fa-${subject.completed ? 'times' : 'check'}"></i>
                    ${subject.completed ? 'Desmarcar' : 'Marcar como vista'}
                </button>
                
                ${subject.location !== 'bank' ? `
                    <button onclick="moveSubject('${subject.id}', 'bank')" class="btn-secondary">
                        <i class="fas fa-arrow-left"></i>
                        Mover al banco
                    </button>
                ` : ''}
                
                ${subject.isCustom ? `
                    <button onclick="deleteCustomSubject('${subject.id}')" class="btn-danger">
                        <i class="fas fa-trash"></i>
                        Eliminar
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function toggleSubjectCompleted(subjectId) {
    console.log('Toggling completed para:', subjectId);
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) {
        console.error('Materia no encontrada:', subjectId);
        return;
    }

    subject.completed = !subject.completed;
    
    if (!subject.completed && subject.location !== 'bank') {
        subject.location = 'bank';
    }
    
    render();
    renderSubjectInfo(subjectId);
    showNotification(
        `${subject.name} ${subject.completed ? 'marcada como vista' : 'desmarcada'}`, 
        'success'
    );
}

function moveSubject(subjectId, newLocation) {
    console.log('Moviendo materia:', subjectId, 'a:', newLocation);
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) return;

    subject.location = newLocation;
    render();
    showNotification(`${subject.name} movida exitosamente`, 'success');
}

// =================== DRAG AND DROP ===================
function dragStart(e) {
    draggedElementId = e.target.dataset.subjectId;
    e.target.classList.add('dragging');
    console.log('Drag started:', draggedElementId);
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dropSubject(e, semesterId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedElementId) return;
    
    console.log('Dropping subject:', draggedElementId, 'in semester:', semesterId);
    moveSubject(draggedElementId, `semester-${semesterId}`);
    draggedElementId = null;
    
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

// =================== FUNCIONES DE PLAN SLOTS ===================
function togglePlanSlots() {
    const slotsList = document.getElementById('plan-slots-list');
    if (slotsList) {
        slotsList.classList.toggle('hidden');
    }
}

function switchToPlan(planId) {
    plannerState.activePlanId = planId;
    render();
    togglePlanSlots();
    showNotification(`Cambiado a ${plannerState.plans[planId].name}`, 'success');
}

function createNewPlan(name) {
    if (!name || name.trim() === '') return;
    
    const planIds = Object.keys(plannerState.plans);
    if (planIds.length >= 3) {
        showNotification('Máximo 3 planes permitidos', 'error');
        return;
    }
    
    const newPlanId = `plan_${Date.now()}`;
    const basePlan = getActivePlan();
    
    plannerState.plans[newPlanId] = {
        name: name.trim(),
        subjects: basePlan.subjects.map(s => ({
            ...s,
            completed: false,
            location: 'bank'
        })),
        semesters: [
            { id: 1, name: 'Semestre 1', collapsed: false },
            { id: 2, name: 'Semestre 2', collapsed: false }
        ],
        customSubjects: []
    };
    
    plannerState.activePlanId = newPlanId;
    render();
    togglePlanSlots();
    showNotification(`Plan "${name}" creado exitosamente`, 'success');
}

function renamePlan(planId) {
    const currentName = plannerState.plans[planId].name;
    const newName = prompt('Nuevo nombre para el plan:', currentName);
    
    if (newName && newName.trim() !== '' && newName !== currentName) {
        plannerState.plans[planId].name = newName.trim();
        render();
        showNotification('Plan renombrado exitosamente', 'success');
    }
}

function deletePlan(planId) {
    if (Object.keys(plannerState.plans).length <= 1) {
        showNotification('Debe mantener al menos un plan', 'error');
        return;
    }
    
    const planName = plannerState.plans[planId].name;
    if (confirm(`¿Estás seguro de eliminar el plan "${planName}"?`)) {
        delete plannerState.plans[planId];
        
        if (plannerState.activePlanId === planId) {
            plannerState.activePlanId = Object.keys(plannerState.plans)[0];
        }
        
        render();
        togglePlanSlots();
        showNotification(`Plan "${planName}" eliminado`, 'success');
    }
}

// =================== FUNCIONES DE SEMESTRES ===================
function addSemester() {
    const plan = getActivePlan();
    if (!plan) return;
    
    const newId = Math.max(...plan.semesters.map(s => s.id)) + 1;
    plan.semesters.push({
        id: newId,
        name: `Semestre ${newId}`,
        collapsed: false
    });
    
    render();
    showNotification('Semestre añadido', 'success');
}

function toggleSemesterCollapse(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const semester = plan.semesters.find(s => s.id === semesterId);
    if (semester) {
        semester.collapsed = !semester.collapsed;
        render();
    }
}

function renameSemester(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const semester = plan.semesters.find(s => s.id === semesterId);
    if (!semester) return;
    
    const newName = prompt('Nuevo nombre para el semestre:', semester.name);
    if (newName && newName.trim() !== '' && newName !== semester.name) {
        semester.name = newName.trim();
        render();
        showNotification('Semestre renombrado exitosamente', 'success');
    }
}

function deleteSemester(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    if (plan.semesters.length <= 1) {
        showNotification('Debe mantener al menos un semestre', 'error');
        return;
    }
    
    const semester = plan.semesters.find(s => s.id === semesterId);
    if (!semester) return;
    
    const subjectsInSemester = plan.subjects.filter(s => s.location === `semester-${semesterId}`);
    
    if (subjectsInSemester.length > 0) {
        if (!confirm(`El semestre "${semester.name}" contiene ${subjectsInSemester.length} materia(s). ¿Deseas eliminar el semestre? Las materias se moverán al banco.`)) {
            return;
        }
        
        subjectsInSemester.forEach(subject => {
            subject.location = 'bank';
        });
    }
    
    plan.semesters = plan.semesters.filter(s => s.id !== semesterId);
    
    render();
    showNotification(`Semestre "${semester.name}" eliminado`, 'success');
}

function autoOrganizeSubjects() {
    const plan = getActivePlan();
    if (!plan) return;
    
    if (!confirm('¿Deseas reorganizar automáticamente las materias? Esto moverá todas las materias no completadas al banco y las organizará por prerrequisitos.')) {
        return;
    }
    
    plan.subjects.forEach(subject => {
        if (!subject.completed) {
            subject.location = 'bank';
        }
    });
    
    if (plan.semesters.length < 2) {
        plan.semesters = [
            { id: 1, name: 'Semestre 1', collapsed: false },
            { id: 2, name: 'Semestre 2', collapsed: false }
        ];
    }
    
    render();
    showNotification('Materias reorganizadas automáticamente', 'success');
}

// =================== FUNCIONES DE MODALES ===================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showImportModal() {
    showModal('import-modal');
    document.getElementById('sira-data').value = '';
    document.getElementById('import-preview').classList.add('hidden');
    document.getElementById('import-confirmed-btn').classList.add('hidden');
    processedSiraData = null;
}

function showEquivalencyModal() {
    showModal('equivalency-modal');
    switchEquivTab('pensum');
    document.getElementById('pensum-search').value = '';
    document.getElementById('pensum-results').innerHTML = '';
    clearExternalForm();
    populateEquivalencySelect();
}

function showCustomSubjectModal() {
    showModal('custom-subject-modal');
    document.getElementById('custom-code').value = '';
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-credits').value = '3';
    document.getElementById('custom-type').value = 'EP';
}

function switchEquivTab(tabName) {
    currentActiveTab = tabName;
    
    document.querySelectorAll('.equiv-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.getElementById('pensum-tab').classList.toggle('hidden', tabName !== 'pensum');
    document.getElementById('external-tab').classList.toggle('hidden', tabName !== 'external');
}

// =================== FUNCIONES DE IMPORTACIÓN SIRA ===================
function processSiraData() {
    const textarea = document.getElementById('sira-data');
    const data = textarea.value.trim();
    
    if (!data) {
        showNotification('Por favor, pega los datos de SIRA', 'error');
        return;
    }
    
    try {
        processedSiraData = parseSiraData(data);
        
        if (processedSiraData.length === 0) {
            showNotification('No se encontraron materias válidas en los datos', 'error');
            return;
        }
        
        const previewContainer = document.getElementById('preview-content');
        previewContainer.innerHTML = processedSiraData.map(item => `
            <div class="preview-item">
                <span class="preview-subject-code">${item.code}</span>
                <span class="preview-subject-name">${item.name}</span>
                <span class="preview-grade">${item.grade}</span>
            </div>
        `).join('');
        
        document.getElementById('import-preview').classList.remove('hidden');
        document.getElementById('import-confirmed-btn').classList.remove('hidden');
        
        showNotification(`${processedSiraData.length} materias encontradas`, 'success');
        
    } catch (error) {
        console.error('Error procesando datos SIRA:', error);
        showNotification('Error procesando los datos. Verifica el formato.', 'error');
    }
}

function parseSiraData(data) {
    const lines = data.split('\n').filter(line => line.trim());
    const results = [];
    
    for (const line of lines) {
        const patterns = [
            /(\w+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*$/,
            /(\w+)\s+(.+?)\s+\d+\s+(\d+(?:\.\d+)?)\s*$/,
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                const [, code, name, grade] = match;
                const gradeNum = parseFloat(grade);
                
                if (gradeNum >= 3.0) {
                    results.push({
                        code: code.trim(),
                        name: name.trim(),
                        grade: gradeNum
                    });
                }
                break;
            }
        }
    }
    
    return results;
}

function confirmSiraImport() {
    if (!processedSiraData || processedSiraData.length === 0) {
        showNotification('No hay datos para importar', 'error');
        return;
    }
    
    const plan = getActivePlan();
    if (!plan) return;
    
    let importedCount = 0;
    
    processedSiraData.forEach(siraItem => {
        const subject = plan.subjects.find(s => 
            s.id.toLowerCase() === siraItem.code.toLowerCase() ||
            s.name.toLowerCase().includes(siraItem.name.toLowerCase().substring(0, 10))
        );
        
        if (subject && !subject.completed) {
            subject.completed = true;
            subject.location = 'bank';
            importedCount++;
        }
    });
    
    if (importedCount > 0) {
        render();
        hideModal('import-modal');
        showNotification(`${importedCount} materias importadas exitosamente`, 'success');
    } else {
        showNotification('No se encontraron coincidencias con el pensum', 'error');
    }
}

// =================== FUNCIONES DE EQUIVALENCIAS ===================
function searchPensumSubjects() {
    const searchTerm = document.getElementById('pensum-search').value.toLowerCase();
    const resultsContainer = document.getElementById('pensum-results');
    
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    const plan = getActivePlan();
    if (!plan) return;
    
    const matches = plan.subjects.filter(s => 
        s.name.toLowerCase().includes(searchTerm) ||
        s.id.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results"><p>No se encontraron materias</p></div>';
        return;
    }
    
    resultsContainer.innerHTML = matches.map(subject => `
        <div class="search-result-item" onclick="selectPensumSubject('${subject.id}')">
            <div><strong>${subject.id}</strong> - ${subject.name}</div>
            <div style="font-size: 0.8em; color: var(--text-secondary);">${getTypeLabel(subject.type)} - ${subject.credits} créditos</div>
        </div>
    `).join('');
}

function selectPensumSubject(subjectId) {
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) return;
    
    if (subject.completed) {
        showNotification('Esta materia ya está marcada como vista', 'error');
        return;
    }
    
    subject.completed = true;
    subject.location = 'bank';
    
    render();
    hideModal('equivalency-modal');
    showNotification(`${subject.name} marcada como vista`, 'success');
}

function populateEquivalencySelect() {
    const select = document.getElementById('ext-equivalent');
    if (!select) return;
    
    const plan = getActivePlan();
    if (!plan) return;
    
    const incompletedSubjects = plan.subjects.filter(s => !s.completed);
    
    select.innerHTML = '<option value="">Selecciona una materia del pensum...</option>' +
        incompletedSubjects.map(s => 
            `<option value="${s.id}">${s.id} - ${s.name}</option>`
        ).join('');
}

function clearExternalForm() {
    document.getElementById('ext-code').value = '';
    document.getElementById('ext-name').value = '';
    document.getElementById('ext-institution').value = '';
    document.getElementById('ext-credits').value = '3';
    document.getElementById('ext-equivalent').value = '';
}

function addEquivalency() {
    if (currentActiveTab === 'pensum') {
        showNotification('Selecciona una materia de los resultados de búsqueda', 'error');
        return;
    }
    
    const code = document.getElementById('ext-code').value.trim();
    const name = document.getElementById('ext-name').value.trim();
    const institution = document.getElementById('ext-institution').value.trim();
    const credits = parseInt(document.getElementById('ext-credits').value) || 3;
    const equivalentId = document.getElementById('ext-equivalent').value;
    
    if (!code || !name || !institution) {
        showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    const plan = getActivePlan();
    if (!plan) return;
    
    if (equivalentId) {
        const equivalentSubject = plan.subjects.find(s => s.id === equivalentId);
        if (equivalentSubject) {
            equivalentSubject.completed = true;
            equivalentSubject.location = 'bank';
            equivalentSubject.equivalencies = equivalentSubject.equivalencies || [];
            equivalentSubject.equivalencies.push({
                code,
                name,
                institution,
                credits
            });
        }
    } else {
        createCustomSubjectFromEquivalency({
            id: code,
            name,
            credits,
            type: 'EC',
            isCustom: true,
            institution,
            completed: true,
            location: 'bank',
            equivalencies: []
        });
    }
    
    render();
    hideModal('equivalency-modal');
    showNotification('Equivalencia añadida exitosamente', 'success');
}

// =================== FUNCIONES DE MATERIAS PERSONALIZADAS ===================
function createCustomSubject() {
    const code = document.getElementById('custom-code').value.trim();
    const name = document.getElementById('custom-name').value.trim();
    const credits = parseInt(document.getElementById('custom-credits').value) || 3;
    const type = document.getElementById('custom-type').value;
    
    if (!code || !name) {
        showNotification('Por favor, completa el código y nombre', 'error');
        return;
    }
    
    const plan = getActivePlan();
    if (!plan) return;
    
    if (plan.subjects.find(s => s.id.toLowerCase() === code.toLowerCase())) {
        showNotification('Ya existe una materia con ese código', 'error');
        return;
    }
    
    const customSubject = {
        id: code,
        name,
        credits,
        type,
        isCustom: true,
        completed: false,
        location: 'bank',
        prerequisites: [],
        equivalencies: []
    };
    
    plan.subjects.push(customSubject);
    
    render();
    hideModal('custom-subject-modal');
    showNotification(`Materia "${name}" creada exitosamente`, 'success');
}

function createCustomSubjectFromEquivalency(subjectData) {
    const plan = getActivePlan();
    if (!plan) return;
    
    plan.subjects.push(subjectData);
}

function deleteCustomSubject(subjectId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const subject = plan.subjects.find(s => s.id === subjectId);
    if (!subject || !subject.isCustom) {
        showNotification('Solo se pueden eliminar materias personalizadas', 'error');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar "${subject.name}"?`)) {
        plan.subjects = plan.subjects.filter(s => s.id !== subjectId);
        
        if (selectedSubjectId === subjectId) {
            selectedSubjectId = null;
            document.getElementById('subject-info').innerHTML = '<div class="no-selection"><i class="fas fa-hand-pointer"></i><p>Selecciona una materia para ver su información</p></div>';
        }
        
        render();
        showNotification(`"${subject.name}" eliminada exitosamente`, 'success');
    }
}

// =================== FUNCIONES DE UTILIDAD ===================
function exportPlan() {
    const plan = getActivePlan();
    if (!plan) return;
    
    const exportData = {
        planName: plan.name,
        exportDate: new Date().toISOString(),
        semesters: plan.semesters.map(semester => ({
            name: semester.name,
            subjects: plan.subjects
                .filter(s => s.location === `semester-${semester.id}`)
                .map(s => ({
                    id: s.id,
                    name: s.name,
                    credits: s.credits,
                    type: getTypeLabel(s.type),
                    completed: s.completed
                }))
        })),
        stats: calculateStats(plan)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-academico-${plan.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Plan exportado exitosamente', 'success');
}

function resetPlan() {
    if (!confirm('¿Estás seguro de resetear el plan? Esto moverá todas las materias al banco y eliminará los semestres adicionales.')) {
        return;
    }
    
    const plan = getActivePlan();
    if (!plan) return;
    
    plan.subjects.forEach(subject => {
        if (!subject.isCustom) {
            subject.completed = false;
        }
        subject.location = 'bank';
    });
    
    plan.semesters = [
        { id: 1, name: 'Semestre 1', collapsed: false },
        { id: 2, name: 'Semestre 2', collapsed: false }
    ];
    
    selectedSubjectId = null;
    
    render();
    showNotification('Plan reseteado exitosamente', 'success');
}

// =================== FUNCIONES GLOBALES PARA HTML ===================
window.selectCareer = selectCareer;
window.selectSubject = selectSubject;
window.toggleSubjectCompleted = toggleSubjectCompleted;
window.moveSubject = moveSubject;
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.dropSubject = dropSubject;
window.togglePlanSlots = togglePlanSlots;
window.switchToPlan = switchToPlan;
window.createNewPlan = createNewPlan;
window.renamePlan = renamePlan;
window.deletePlan = deletePlan;
window.addSemester = addSemester;
window.toggleSemesterCollapse = toggleSemesterCollapse;
window.renameSemester = renameSemester;
window.deleteSemester = deleteSemester;
window.autoOrganizeSubjects = autoOrganizeSubjects;
window.showModal = showModal;
window.hideModal = hideModal;
window.showImportModal = showImportModal;
window.showEquivalencyModal = showEquivalencyModal;
window.showCustomSubjectModal = showCustomSubjectModal;
window.switchEquivTab = switchEquivTab;
window.processSiraData = processSiraData;
window.confirmSiraImport = confirmSiraImport;
window.searchPensumSubjects = searchPensumSubjects;
window.selectPensumSubject = selectPensumSubject;
window.addEquivalency = addEquivalency;
window.createCustomSubject = createCustomSubject;
window.deleteCustomSubject = deleteCustomSubject;
window.exportPlan = exportPlan;
window.resetPlan = resetPlan;

// =================== INICIALIZACIÓN ===================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INICIANDO APLICACIÓN ===');
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.dataset.theme = savedTheme;
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = `<i class="fas fa-${savedTheme === 'dark' ? 'moon' : 'sun'}"></i>`;
    }
    
    // Inicializar Firebase
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        
        console.log('Firebase inicializado correctamente');
        
        // Configurar listeners
        setupAuthStateListener();
        setupLoginEventListeners();
        
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error inicializando Firebase:', error);
        showNotification('Error inicializando la aplicación', 'error');
    }
});
