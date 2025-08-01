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

    // Show loading
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }

    // Set current career
    currentCareerId = careerId;
    
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
        
        // Inicializar UI
        initializeAppUI(auth.currentUser);
    }, error => {
        console.error("Error cargando datos:", error);
        showNotification("Error cargando datos", 'error');
        
        // Fallback con estado inicial
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
    
    // Verificar que tengamos datos
    if (!plannerState || !plannerState.plans) {
        console.error('No hay datos del planificador');
        showNotification('Error: No se pudieron cargar los datos', 'error');
        return;
    }
    
    // Ocultar pantallas de carga y selección
    const loadingOverlay = document.getElementById('loading-overlay');
    const careerContainer = document.getElementById('career-selection-container');
    const appContainer = document.getElementById('app-container');
    
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    if (careerContainer) careerContainer.classList.add('hidden');
    
    // Mostrar aplicación principal
    if (appContainer) {
        appContainer.classList.remove('hidden');
        console.log('Aplicación principal mostrada');
    }

    // Configurar info de usuario
    const avatar = document.getElementById('user-avatar');
    if (avatar && user) {
        if (user.photoURL) {
            avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'Usuario'}">`;
        } else {
            const initials = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            avatar.innerHTML = initials;
        }
    }

    // Renderizar contenido
    render();
    
    // Configurar event listeners
    if (!window.eventListenersSetup) {
        setupEventListeners();
        window.eventListenersSetup = true;
        console.log('Event listeners configurados');
    }
    
    showNotification('¡Aplicación cargada correctamente!', 'success');
    console.log('UI inicializada exitosamente');
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
    console.log('Materias en el plan:', plan.subjects.length);

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
    
    // Guardar cambios
    savePlannerData();
}

function renderPlanSlots() {
    const activeButton = document.getElementById('active-plan-button');
    if (!activeButton) return;
    
    const activePlan = getActivePlan();
    if (!activePlan) return;

    activeButton.innerHTML = `${activePlan.name} <i class="fas fa-chevron-down"></i>`;
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
                <span class="stat-title">Materias Vistas</span>
                <span class="stat-value">${stats.completedSubjects}/${stats.totalSubjects}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${(stats.completedSubjects / stats.totalSubjects) * 100}%"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-title">Semestres</span>
                <span class="stat-value">${plan.semesters.length}</span>
            </div>
        </div>
    `;
}

function calculateStats(plan) {
    const subjects = plan.subjects || [];
    const completed = subjects.filter(s => s.completed);
    
    const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
    const completedCredits = completed.reduce((sum, s) => sum + (s.credits || 0), 0);
    
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
    if (!container) {
        console.warn('Subject bank container no encontrado');
        return;
    }

    const subjects = plan.subjects.filter(s => s.location === 'bank');
    console.log('Materias en el banco:', subjects.length);
    
    if (subjects.length === 0) {
        container.innerHTML = '<div class="no-results"><i class="fas fa-graduation-cap"></i><p>No hay materias en el banco</p></div>';
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

    const statusIcon = subject.completed ? 
        '<i class="fas fa-check-circle subject-status completed"></i>' : 
        (!canTake ? '<i class="fas fa-lock lock-icon"></i>' : '');

    return `
        <div class="${cardClass}" 
             data-subject-id="${subject.id}"
             onclick="selectSubject('${subject.id}')"
             ${canTake && !subject.completed ? 'draggable="true"' : ''}>
            
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

        const subjects = plan.subjects.filter(s => s.location === `semester-${semester.id}`);
        const credits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);

        column.innerHTML = `
            <div class="semester-header" onclick="toggleSemesterCollapse(${semester.id})">
                <h3>${semester.name}</h3>
                <div class="semester-info">
                    <span class="semester-credits">${credits} cr</span>
                    <div class="semester-controls">
                        <button class="semester-control-btn" onclick="event.stopPropagation(); addSemester()" title="Añadir semestre">
                            <i class="fas fa-plus"></i>
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

// =================== FUNCIONES DE INTERACCIÓN ===================
function selectSubject(subjectId) {
    console.log('Seleccionando materia:', subjectId);
    selectedSubjectId = subjectId;
    renderSubjectInfo(subjectId);
    
    // Actualizar selección visual
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
            
            <div class="subject-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
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
    
    // Si se desmarca, mover al banco
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

// Hacer funciones disponibles globalmente
window.selectSubject = selectSubject;
window.toggleSubjectCompleted = toggleSubjectCompleted;
window.moveSubject = moveSubject;

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

// Hacer funciones de drag and drop globales
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.dropSubject = dropSubject;

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    console.log('=== CONFIGURANDO EVENT LISTENERS ===');
    
    setupAuthEventListeners();
    setupCareerEventListeners();
    setupAppEventListeners();
}

function setupAuthEventListeners() {
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn && !googleBtn.hasAttribute('data-listener')) {
        googleBtn.addEventListener('click', loginWithGoogle);
        googleBtn.setAttribute('data-listener', 'true');
        console.log('Google login configurado');
    }

    const emailForm = document.getElementById('email-login-form');
    if (emailForm && !emailForm.hasAttribute('data-listener')) {
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
        emailForm.setAttribute('data-listener', 'true');
        console.log('Email login configurado');
    }
}

function setupCareerEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !logoutBtn.hasAttribute('data-listener')) {
        logoutBtn.addEventListener('click', () => {
            console.log('Logout desde career selection');
            auth.signOut();
        });
        logoutBtn.setAttribute('data-listener', 'true');
        console.log('Logout career configurado');
    }
}

function setupAppEventListeners() {
    const logoutAppBtn = document.getElementById('logout-app-btn');
    if (logoutAppBtn && !logoutAppBtn.hasAttribute('data-listener')) {
        logoutAppBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                auth.signOut();
            }
        });
        logoutAppBtn.setAttribute('data-listener', 'true');
        console.log('Logout app configurado');
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && !themeToggle.hasAttribute('data-listener')) {
        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.setAttribute('data-listener', 'true');
        console.log('Theme toggle configurado');
    }

    const zenToggle = document.getElementById('zen-mode-toggle');
    if (zenToggle && !zenToggle.hasAttribute('data-listener')) {
        zenToggle.addEventListener('click', toggleZenMode);
        zenToggle.setAttribute('data-listener', 'true');
        console.log('Zen mode toggle configurado');
    }

    // Search functionality
    const searchInput = document.getElementById('subject-search');
    if (searchInput && !searchInput.hasAttribute('data-listener')) {
        searchInput.addEventListener('input', debounce(() => {
            render();
        }, 300));
        searchInput.setAttribute('data-listener', 'true');
        console.log('Search configurado');
    }

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        if (!tab.hasAttribute('data-listener')) {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                render();
            });
            tab.setAttribute('data-listener', 'true');
        }
    });

    console.log('Event listeners configurados exitosamente');
}

// =================== HELPER FUNCTIONS ===================
function canTakeSubject(subject, plan) {
    if (subject.completed) return true;
    if (!subject.prerequisites || subject.prerequisites.length === 0) return true;
    
    return subject.prerequisites.every(prereqId => {
        const prereq = plan.subjects.find(s => s.id === prereqId);
        return prereq && prereq.completed;
    });
}

function getTypeLabel(type) {
    const labels = {
        'AB': 'Área Básica',
        'AP': 'Área Profesional',
        'EP': 'Electiva Profesional',
        'EL': 'Electiva Libre'
    };
    return labels[type] || type;
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

// =================== FUNCIONES BÁSICAS ===================
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    console.log('Tema cambiado a:', newTheme);
}

function toggleZenMode() {
    document.body.classList.toggle('zen-mode');
    const icon = document.querySelector('#zen-mode-toggle i');
    if (icon) {
        const isZen = document.body.classList.contains('zen-mode');
        icon.className = isZen ? 'fas fa-compress' : 'fas fa-expand';
    }
    console.log('Zen mode:', document.body.classList.contains('zen-mode') ? 'activado' : 'desactivado');
}

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

// Hacer funciones globales
window.addSemester = addSemester;
window.toggleSemesterCollapse = toggleSemesterCollapse;
window.toggleTheme = toggleTheme;
window.toggleZenMode = toggleZenMode;

// =================== INICIALIZACIÓN PRINCIPAL ===================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INICIANDO APLICACIÓN ===');
    
    // Inicializar Firebase
    if (!initializeFirebase()) {
        return;
    }
    
    // Verificar pensum
    if (typeof PENSUM_DI === 'undefined') {
        console.error('PENSUM_DI no disponible');
        showNotification('Error: Pensum no se pudo cargar. Verifica pensums/pensum-di.js', 'error');
        return;
    }
    
    console.log('PENSUM_DI cargado:', PENSUM_DI.length, 'materias');
    
    // Configurar autenticación
    setupAuthStateListener();
    
    console.log('=== APLICACIÓN INICIALIZADA ===');
});
