// =================== CONFIGURACIÓN DE FIREBASE ===================
const firebaseConfig = {
    apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
    authDomain: "planificadoruv.firebaseapp.com",
    projectId: "planificadoruv",
    storageBucket: "planificadoruv.appspot.com",
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
let currentActiveTab = 'pensum';
let eventListenersSetup = false;

// Áreas académicas
const ACADEMIC_AREAS = {
    FG: { name: "Formación General", color: "#5e81ac" },
    AB: { name: "Área Básica", color: "#8b5cf6" },
    AP: { name: "Área Profesional", color: "#0ea5e9" },
    ES: { name: "Electivas Complementarias", color: "#ec4899" }
};

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
            showNotification('Error al iniciar sesión', 'error');
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
    
   // Clasificar materias por áreas
const classifiedSubjects = PENSUM_DI.map(subject => {
    let area = 'AB'; // Por defecto Área Básica
    
    // Clasificación basada en el tipo de materia
    if (subject.type === 'EP') {
        area = 'EP'; // Electivas Profesionales
    } else if (subject.type === 'FG') {
        area = 'FG'; // Formación General
    } else if (subject.type === 'AP') {
        area = 'AP'; // Componente Profesional
    }
    // Las materias de inglés (category: 'english') mantienen 'AB' por defecto
    
    return {
        ...subject,
        area: area,
        completed: false,
        location: 'bank',
        equivalencies: []
        };
    });
    
    const initialPlanId = 'plan_1';
    const initialState = {
        activePlanId: initialPlanId,
        plans: {
            [initialPlanId]: {
                name: 'Plan Principal',
                subjects: classifiedSubjects,
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

    // Area tabs
    document.querySelectorAll('.area-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.area-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            render();
        });
    });

    console.log('Event listeners configurados exitosamente');
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
        renderEquivalencies(plan);
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
        <div class="stat-card fg">
            <div class="stat-header">
                <span class="stat-title">FG <i class="fas fa-graduation-cap"></i></span>
                <span class="stat-value">${stats.fg.completed}/${stats.fg.total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.fg.percentage}%"></div>
                <div class="progress-label">Formación General</div>
            </div>
        </div>
        
        <div class="stat-card ab">
            <div class="stat-header">
                <span class="stat-title">AB <i class="fas fa-cube"></i></span>
                <span class="stat-value">${stats.ab.completed}/${stats.ab.total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.ab.percentage}%"></div>
                <div class="progress-label">Área Básica</div>
            </div>
        </div>
        
        <div class="stat-card ap">
            <div class="stat-header">
                <span class="stat-title">AP <i class="fas fa-briefcase"></i></span>
                <span class="stat-value">${stats.ap.completed}/${stats.ap.total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.ap.percentage}%"></div>
                <div class="progress-label">Área Profesional</div>
            </div>
        </div>
        
        <div class="stat-card es">
            <div class="stat-header">
                <span class="stat-title">ES <i class="fas fa-list"></i></span>
                <span class="stat-value">${stats.es.completed}/${stats.es.total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${stats.es.percentage}%"></div>
                <div class="progress-label">Electivas</div>
            </div>
        </div>
    `;
}

function calculateStats(plan) {
    const subjects = plan.subjects || [];
    
    // Inicializar estadísticas por área
    const stats = {
        fg: { completed: 0, total: 0, percentage: 0 },
        ab: { completed: 0, total: 0, percentage: 0 },
        ap: { completed: 0, total: 0, percentage: 0 },
        es: { completed: 0, total: 0, percentage: 0 }
    };
    
    // Calcular créditos por área
    subjects.forEach(subject => {
        const credits = subject.credits || 0;
        const area = subject.area || 'ab';
        
        if (stats[area]) {
            stats[area].total += credits;
            if (subject.completed) {
                stats[area].completed += credits;
            }
        }
    });
    
    // Calcular porcentajes
    Object.keys(stats).forEach(area => {
        if (stats[area].total > 0) {
            stats[area].percentage = Math.round((stats[area].completed / stats[area].total) * 100);
        }
    });
    
    return stats;
}

function renderSubjectBank(plan) {
    const container = document.getElementById('subject-bank');
    if (!container) {
        console.warn('Subject bank container no encontrado');
        return;
    }

    const searchTerm = document.getElementById('subject-search')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
    const activeArea = document.querySelector('.area-tab.active')?.dataset.area || 'all';
    
    let subjects = plan.subjects.filter(s => s.location === 'bank');
    
    // Filtrar por área
    if (activeArea !== 'all') {
        subjects = subjects.filter(s => s.area === activeArea);
    }
    
    // Filtrar por búsqueda (solo para electivas)
    if (searchTerm && activeArea === 'ES') {
        subjects = subjects.filter(s => 
            s.name.toLowerCase().includes(searchTerm) || 
            s.id.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtrar por estado
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
    
    // Agrupar por tipo dentro del área
    const groupedSubjects = {};
    subjects.forEach(subject => {
        const type = subject.type || 'general';
        if (!groupedSubjects[type]) {
            groupedSubjects[type] = [];
        }
        groupedSubjects[type].push(subject);
    });
    
    // Generar HTML
    let html = '';
    Object.keys(groupedSubjects).forEach(type => {
        html += `<div class="subject-group">
                    <h4 class="group-title">${getTypeLabel(type)}</h4>
                    <div class="subject-group-content">
                        ${groupedSubjects[type].map(subject => createSubjectCardHTML(subject, plan)).join('')}
                    </div>
                 </div>`;
    });
    
    container.innerHTML = html;
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
            
            <span class="subject-area ${subject.area}">${subject.area}</span>
            
            <div class="quick-complete" onclick="event.stopPropagation(); toggleSubjectCompleted('${subject.id}')">
                <i class="fas fa-${subject.completed ? 'undo' : 'check'}"></i>
            </div>
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

function renderEquivalencies(plan) {
    const container = document.getElementById('equivalency-container');
    if (!container) return;
    
    const equivalencies = plan.subjects.filter(s => s.equivalencies && s.equivalencies.length > 0);
    
    if (equivalencies.length === 0) {
        container.innerHTML = '<p class="no-equivalencies">No hay equivalencias registradas</p>';
        return;
    }
    
    container.innerHTML = equivalencies.map(subject => {
        return subject.equivalencies.map(equiv => `
            <div class="equivalency-item">
                <div class="subject-header">
                    <span class="subject-code">${equiv.code}</span>
                    <span class="subject-credits">${equiv.credits} cr</span>
                </div>
                <div class="subject-name">${equiv.name}</div>
                <div class="subject-type">${equiv.institution}</div>
                <span class="equivalency-badge">Equivalencia</span>
            </div>
        `).join('');
    }).join('');
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
            
            <span class="subject-area ${subject.area}">${subject.area}</span>
            
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
        'EL': 'Electiva Libre',
        'FG': 'Formación General',
        'english': 'Inglés',
        'deporte': 'Deporte Formativo',
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
                <span class="detail-label">Área:</span>
                <span class="detail-value">${ACADEMIC_AREAS[subject.area]?.name || 'Sin área'}</span>
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
    if (selectedSubjectId === subjectId) {
        renderSubjectInfo(subjectId);
    }
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

// =================== EXPORTACIÓN A PDF ===================
function exportPlanToPDF() {
    const plan = getActivePlan();
    if (!plan) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const title = `Plan Académico - ${plan.name}`;
    
    // Título
    doc.setFontSize(20);
    doc.text(title, 105, 20, { align: 'center' });
    
    // Fecha de exportación
    doc.setFontSize(12);
    const exportDate = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Exportado: ${exportDate}`, 105, 30, { align: 'center' });
    
    // Estadísticas
    doc.setFontSize(14);
    doc.text('Progreso Académico', 20, 40);
    
    const stats = calculateStats(plan);
    let yPos = 50;
    
    Object.keys(stats).forEach(area => {
        const areaData = ACADEMIC_AREAS[area];
        if (areaData) {
            const stat = stats[area];
            doc.setFillColor(areaData.color.replace('#', ''));
            doc.rect(20, yPos, (stat.percentage / 100) * 100, 8, 'F');
            doc.setFontSize(12);
            doc.text(`${areaData.name}: ${stat.completed}/${stat.total} créditos (${stat.percentage}%)`, 20, yPos - 2);
            yPos += 15;
        }
    });
    
    // Semestres
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Distribución por Semestres', 20, yPos);
    yPos += 10;
    
    plan.semesters.forEach((semester, index) => {
        const subjects = plan.subjects.filter(s => s.location === `semester-${semester.id}`);
        const credits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
        
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`${semester.name} - ${credits} créditos`, 20, yPos);
        doc.setFont(undefined, 'normal');
        
        yPos += 7;
        
        subjects.forEach(subject => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            
            const status = subject.completed ? '✓' : '◯';
            doc.text(`${status} ${subject.id} - ${subject.name} (${subject.credits} cr)`, 25, yPos);
            yPos += 7;
        });
        
        yPos += 5;
    });
    
    // Equivalencias
    const equivalencies = plan.subjects.filter(s => s.equivalencies && s.equivalencies.length > 0);
    if (equivalencies.length > 0) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Equivalencias Registradas', 20, yPos);
        yPos += 10;
        
        equivalencies.forEach(subject => {
            subject.equivalencies.forEach(equiv => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFontSize(12);
                doc.text(`≡ ${equiv.code} - ${equiv.name} (${equiv.institution})`, 20, yPos);
                yPos += 7;
            });
        });
    }
    
    // Guardar PDF
    doc.save(`plan-academico-${plan.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    showNotification('Plan exportado a PDF exitosamente', 'success');
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
window.exportPlanToPDF = exportPlanToPDF;

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
    if (initializeFirebase()) {
        setupAuthStateListener();
        console.log('Aplicación inicializada correctamente');
    } else {
        showNotification('Error inicializando la aplicación', 'error');
    }
});
