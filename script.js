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
let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let plannerState = {};
let currentCareerId = null;
let unsubscribePlanner = null;
let selectedSubjectId = null;
let isSaving = false;
let saveTimeout = null;
let eventListenersSetup = false;

// =================== UTILIDADES ===================
function showNotification(message, type = 'info', duration = 4000) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Remover notificación existente
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type]} ${type}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Ocultar después del tiempo especificado
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
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

// =================== INICIALIZACIÓN DE FIREBASE ===================
function initializeFirebase() {
    try {
        console.log('Inicializando Firebase...');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK no está disponible');
        }
        
        // Inicializar Firebase con la configuración
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        
        console.log('✅ Firebase inicializado correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        showNotification('Error inicializando Firebase: ' + error.message, 'error');
        return false;
    }
}

// =================== AUTENTICACIÓN ===================
function setupAuthStateListener() {
    console.log('Configurando listener de autenticación...');
    
    if (!auth) {
        console.error('Auth no está disponible');
        showNotification('Error: Sistema de autenticación no disponible', 'error');
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        console.log('=== CAMBIO DE ESTADO DE AUTENTICACIÓN ===');
        console.log('Usuario:', user ? `${user.email} (${user.uid})` : 'No autenticado');
        
        hideLoadingOverlay();
        
        if (user) {
            handleUserAuthenticated(user);
        } else {
            handleUserNotAuthenticated();
        }
    });
}

function handleUserAuthenticated(user) {
    console.log('Usuario autenticado:', user.email);
    hideAuthContainer();
    showCareerSelection();
    updateUserAvatar(user);
}

function handleUserNotAuthenticated() {
    console.log('Usuario no autenticado');
    cleanupUserSession();
    showAuthContainer();
    hideCareerSelection();
    hideAppContainer();
}

function updateUserAvatar(user) {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;
    
    if (user.photoURL) {
        avatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar">`;
    } else {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        avatar.textContent = initial;
    }
}

function cleanupUserSession() {
    if (unsubscribePlanner) {
        unsubscribePlanner();
        unsubscribePlanner = null;
    }
    plannerState = {};
    currentCareerId = null;
    selectedSubjectId = null;
}

// =================== MANEJO DE ELEMENTOS UI ===================
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showAuthContainer() {
    const container = document.getElementById('auth-container');
    if (container) container.classList.remove('hidden');
}

function hideAuthContainer() {
    const container = document.getElementById('auth-container');
    if (container) container.classList.add('hidden');
}

function showCareerSelection() {
    const container = document.getElementById('career-selection-container');
    if (container) container.classList.remove('hidden');
}

function hideCareerSelection() {
    const container = document.getElementById('career-selection-container');
    if (container) container.classList.add('hidden');
}

function showAppContainer() {
    const container = document.getElementById('app-container');
    if (container) container.classList.remove('hidden');
}

function hideAppContainer() {
    const container = document.getElementById('app-container');
    if (container) container.classList.add('hidden');
}

// =================== FUNCIONES DE LOGIN ===================
function loginWithGoogle() {
    console.log('Intentando login con Google...');
    
    if (!auth || !googleProvider) {
        showNotification('Error: Autenticación no disponible', 'error');
        return;
    }
    
    const button = document.getElementById('google-login-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    }
    
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            console.log('✅ Login exitoso con Google:', result.user.email);
            showNotification('¡Bienvenido! Has iniciado sesión correctamente', 'success');
        })
        .catch((error) => {
            console.error('❌ Error en login con Google:', error);
            let errorMessage = 'Error al iniciar sesión';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Ventana de inicio de sesión cerrada';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Error de conexión. Verifica tu internet';
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
    console.log('Intentando login con email:', email);
    
    if (!auth) {
        showNotification('Error: Autenticación no disponible', 'error');
        return Promise.reject('Auth not available');
    }
    
    return auth.signInWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('✅ Login exitoso con email:', result.user.email);
            showNotification('¡Bienvenido! Has iniciado sesión correctamente', 'success');
            return result;
        })
        .catch((error) => {
            console.error('❌ Error en login con email:', error);
            
            let errorMessage = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'Usuario no encontrado';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Contraseña incorrecta';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido';
            }
            
            showNotification(errorMessage, 'error');
            throw error;
        });
}

function logout() {
    console.log('Cerrando sesión...');
    
    if (!auth) {
        console.error('Auth no disponible para logout');
        return;
    }
    
    auth.signOut()
        .then(() => {
            console.log('✅ Sesión cerrada correctamente');
            showNotification('Has cerrado sesión correctamente', 'info');
        })
        .catch((error) => {
            console.error('❌ Error cerrando sesión:', error);
            showNotification('Error cerrando sesión', 'error');
        });
}

// =================== SELECCIÓN DE CARRERA ===================
function selectCareer(careerId) {
    console.log('=== SELECCIONANDO CARRERA ===');
    console.log('Career ID:', careerId);
    
    if (!auth || !auth.currentUser) {
        console.error('No hay usuario autenticado');
        showNotification('Error: No hay usuario autenticado', 'error');
        return;
    }
    
    console.log('Usuario actual:', auth.currentUser.email);
    
    showLoadingOverlay();
    currentCareerId = careerId;
    
    // Cargar datos del planificador
    loadPlannerData(auth.currentUser.uid, careerId);
}

// =================== GESTIÓN DE DATOS ===================
function getActivePlan() {
    if (plannerState && plannerState.plans && plannerState.activePlanId) {
        return plannerState.plans[plannerState.activePlanId];
    }
    return null;
}

function createInitialState() {
    console.log('Creando estado inicial...');
    
    if (typeof PENSUM_DI === 'undefined') {
        console.error('PENSUM_DI no está definido - revisar pensum-di.js');
        showNotification('Error: No se pudo cargar la información del pensum', 'error');
        return null;
    }
    
    console.log(`Pensum cargado con ${PENSUM_DI.length} materias`);
    
    const initialPlanId = 'plan_1';
    const state = {
        activePlanId: initialPlanId,
        plans: {
            [initialPlanId]: {
                name: 'Plan Principal',
                subjects: PENSUM_DI.map(subject => ({
                    ...subject,
                    completed: false,
                    location: 'bank',
                    semesterId: null,
                    equivalencies: []
                })),
                semesters: [
                    { id: 1, name: 'Semestre 1', collapsed: false },
                    { id: 2, name: 'Semestre 2', collapsed: false },
                    { id: 3, name: 'Semestre 3', collapsed: false },
                    { id: 4, name: 'Semestre 4', collapsed: false }
                ],
                customSubjects: []
            }
        },
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    console.log('Estado inicial creado');
    return state;
}

function loadPlannerData(userId, careerId) {
    console.log('=== CARGANDO DATOS DEL PLANIFICADOR ===');
    console.log('Usuario ID:', userId);
    console.log('Career ID:', careerId);
    
    if (!db) {
        console.error('Firestore no está disponible');
        showNotification('Error: Base de datos no disponible', 'error');
        hideLoadingOverlay();
        return;
    }
    
    const docRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    
    unsubscribePlanner = docRef.onSnapshot((doc) => {
        console.log('=== SNAPSHOT DE FIRESTORE ===');
        console.log('Documento existe:', doc.exists);
        
        try {
            if (doc.exists) {
                const data = doc.data();
                console.log('Datos cargados desde Firestore');
                
                if (data && data.plans && data.activePlanId) {
                    plannerState = data;
                    console.log('Estado establecido desde Firestore');
                } else {
                    console.warn('Datos en formato incorrecto, creando estado inicial');
                    const initialState = createInitialState();
                    if (initialState) {
                        plannerState = initialState;
                        savePlannerData(); // Guardar el estado inicial
                    }
                }
            } else {
                console.log('Documento no existe, creando estado inicial');
                const initialState = createInitialState();
                if (initialState) {
                    plannerState = initialState;
                    savePlannerData(); // Guardar el estado inicial
                }
            }
            
            // Inicializar la UI de la aplicación
            initializeApp();
            
        } catch (error) {
            console.error('Error procesando datos:', error);
            showNotification('Error procesando datos del usuario', 'error');
            
            // Crear estado inicial como respaldo
            const initialState = createInitialState();
            if (initialState) {
                plannerState = initialState;
                initializeApp();
            }
        }
        
    }, (error) => {
        console.error('Error en el listener de Firestore:', error);
        showNotification('Error conectando con la base de datos', 'error');
        
        // Crear estado inicial como respaldo
        const initialState = createInitialState();
        if (initialState) {
            plannerState = initialState;
            initializeApp();
        }
    });
}

function savePlannerData() {
    if (!auth.currentUser || !currentCareerId || isSaving || !plannerState) {
        return;
    }
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (isSaving) return;
        
        isSaving = true;
        console.log('Guardando datos en Firestore...');
        
        // Actualizar timestamp de modificación
        plannerState.lastModified = new Date().toISOString();
        
        const docRef = db.collection('users')
            .doc(auth.currentUser.uid)
            .collection('planners')
            .doc(currentCareerId);
        
        docRef.set(plannerState)
            .then(() => {
                console.log('✅ Datos guardados exitosamente');
                showNotification('Cambios guardados', 'success', 2000);
            })
            .catch((error) => {
                console.error('❌ Error guardando datos:', error);
                showNotification('Error guardando cambios', 'error');
            })
            .finally(() => {
                isSaving = false;
            });
    }, 1500); // Debounce de 1.5 segundos
}

// =================== INICIALIZACIÓN DE LA APP ===================
function initializeApp() {
    console.log('=== INICIALIZANDO APLICACIÓN ===');
    
    if (!plannerState || !plannerState.plans) {
        console.error('Estado del planificador no válido');
        showNotification('Error: No se pudieron cargar los datos', 'error');
        return;
    }
    
    console.log('Estado del planificador:', plannerState);
    
    // Ocultar containers de auth/career y mostrar app
    hideLoadingOverlay();
    hideAuthContainer();
    hideCareerSelection();
    showAppContainer();
    
    // Renderizar la aplicación
    renderApp();
    
    // Configurar event listeners (solo una vez)
    if (!eventListenersSetup) {
        setupEventListeners();
        eventListenersSetup = true;
        console.log('Event listeners configurados');
    }
    
    showNotification('¡Aplicación cargada exitosamente!', 'success');
    console.log('✅ Aplicación inicializada correctamente');
}

// =================== RENDERIZADO ===================
function renderApp() {
    console.log('Renderizando aplicación...');
    
    const plan = getActivePlan();
    if (!plan) {
        console.error('No hay plan activo para renderizar');
        showNotification('Error: No hay plan activo', 'error');
        return;
    }
    
    try {
        renderStatsBoard(plan);
        renderSubjectBank(plan);
        renderSemesters(plan);
        renderSubjectInfo();
        console.log('✅ Renderizado completado');
    } catch (error) {
        console.error('❌ Error durante el renderizado:', error);
        showNotification('Error renderizando la aplicación', 'error');
    }
    
    // Guardar cambios después del renderizado
    savePlannerData();
}

function renderStatsBoard(plan) {
    const statsBoard = document.querySelector('.stats-board');
    if (!statsBoard || !plan) return;
    
    const completedSubjects = plan.subjects.filter(s => s.completed).length;
    const totalSubjects = plan.subjects.length;
    const progressPercentage = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;
    
    // Calcular créditos completados
    const completedCredits = plan.subjects
        .filter(s => s.completed)
        .reduce((sum, s) => sum + (s.credits || 0), 0);
    
    const totalCredits = plan.subjects
        .reduce((sum, s) => sum + (s.credits || 0), 0);
    
    statsBoard.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${progressPercentage}%</div>
            <div class="stat-label">Progreso</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completedSubjects}/${totalSubjects}</div>
            <div class="stat-label">Materias</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completedCredits}/${totalCredits}</div>
            <div class="stat-label">Créditos</div>
        </div>
    `;
}

function renderSubjectBank(plan) {
    const bank = document.getElementById('subject-bank');
    if (!bank || !plan) return;
    
    const searchTerm = document.getElementById('subject-search')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
    
    let filteredSubjects = plan.subjects.filter(subject => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            subject.name.toLowerCase().includes(searchTerm) ||
            subject.code.toLowerCase().includes(searchTerm);
        
        // Filtro por estado
        switch (activeFilter) {
            case 'available':
                return matchesSearch && !subject.completed && subject.location === 'bank';
            case 'completed':
                return matchesSearch && subject.completed;
            default:
                return matchesSearch;
        }
    });
    
    if (filteredSubjects.length === 0) {
        bank.innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-search"></i>
                <p>No se encontraron materias</p>
            </div>
        `;
        return;
    }
    
    bank.innerHTML = filteredSubjects
        .filter(subject => subject.location === 'bank') // Solo mostrar materias en el banco
        .map(subject => `
            <div class="subject-card ${subject.completed ? 'completed' : ''} ${selectedSubjectId === subject.id ? 'selected' : ''}" 
                 data-subject-id="${subject.id}"
                 draggable="true"
                 tabindex="0">
                <div class="subject-header">
                    <span class="subject-code">${subject.code}</span>
                    <span class="subject-credits">${subject.credits || 0} cr</span>
                </div>
                <div class="subject-name">${subject.name}</div>
            </div>
        `).join('');
    
    // Configurar eventos para las tarjetas de materias
    setupSubjectCardEvents();
}

function renderSemesters(plan) {
    const grid = document.getElementById('semesters-grid');
    if (!grid || !plan) return;
    
    grid.innerHTML = plan.semesters.map(semester => {
        const semesterSubjects = plan.subjects.filter(s => 
            s.location === 'semester' && s.semesterId === semester.id
        );
        
        const totalCredits = semesterSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);
        
        return `
            <div class="semester-column" 
                 data-semester-id="${semester.id}"
                 ondrop="handleSemesterDrop(event)" 
                 ondragover="handleSemesterDragOver(event)">
                <div class="semester-header">
                    <div>
                        <h4>${semester.name}</h4>
                        <small class="semester-credits">${totalCredits} créditos</small>
                    </div>
                    <div class="semester-controls">
                        <button class="btn-icon" onclick="toggleSemester(${semester.id})" title="Colapsar/Expandir">
                            <i class="fas fa-${semester.collapsed ? 'chevron-down' : 'chevron-up'}"></i>
                        </button>
                        ${plan.semesters.length > 2 ? `
                            <button class="btn-icon" onclick="removeSemester(${semester.id})" title="Eliminar semestre">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="semester-subjects ${semester.collapsed ? 'collapsed' : ''}">
                    ${semesterSubjects.map(subject => `
                        <div class="subject-card ${subject.completed ? 'completed' : ''} ${selectedSubjectId === subject.id ? 'selected' : ''}" 
                             data-subject-id="${subject.id}"
                             draggable="true"
                             tabindex="0">
                            <div class="subject-header">
                                <span class="subject-code">${subject.code}</span>
                                <span class="subject-credits">${subject.credits || 0} cr</span>
                            </div>
                            <div class="subject-name">${subject.name}</div>
                        </div>
                    `).join('') || '<div class="placeholder-text"><p>Arrastra materias aquí</p></div>'}
                </div>
            </div>
        `;
    }).join('');
    
    // Configurar eventos para las tarjetas de materias en semestres
    setupSubjectCardEvents();
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
                    <p><strong>Créditos:</strong> ${subject.credits || 0}</p>
                    <p><strong>Estado:</strong> ${subject.completed ? '✅ Completada' : '⏳ Pendiente'}</p>
                    <p><strong>Ubicación:</strong> ${subject.location === 'bank' ? 'Banco de materias' : `Semestre ${subject.semesterId}`}</p>
                    ${subject.prerequisites?.length ? `
                        <p><strong>Prerrequisitos:</strong></p>
                        <ul>
                            ${subject.prerequisites.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${subject.description ? `
                        <p><strong>Descripción:</strong></p>
                        <p>${subject.description}</p>
                    ` : ''}
                </div>
            `;
        }
    } else {
        content.innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-mouse-pointer"></i>
                <p>Selecciona una materia para ver su información detallada</p>
            </div>
        `;
    }
}

// =================== EVENTOS DE INTERACCIÓN ===================
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Auth eventos
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
    }
    
    const emailForm = document.getElementById('email-login-form');
    if (emailForm) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;
            if (email && password) {
                loginWithEmail(email, password);
            }
        });
    }
    
    // Logout eventos
    const logoutBtns = document.querySelectorAll('#logout-btn, #logout-app-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', logout);
    });
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Zen mode
    const zenToggle = document.getElementById('zen-mode-toggle');
    if (zenToggle) {
        zenToggle.addEventListener('click', toggleZenMode);
    }
    
    // Search
    const searchInput = document.getElementById('subject-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderApp();
        }, 300));
    }
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderApp();
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
    
    console.log('✅ Event listeners configurados');
}

function setupSubjectCardEvents() {
    document.querySelectorAll('.subject-card').forEach(card => {
        // Click event para seleccionar materia
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const subjectId = card.dataset.subjectId;
            
            // Remover selección anterior
            document.querySelectorAll('.subject-card').forEach(c => {
                c.classList.remove('selected');
            });
            
            // Seleccionar nueva materia
            card.classList.add('selected');
            selectedSubjectId = subjectId;
            
            renderSubjectInfo();
        });
        
        // Drag events
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.subjectId);
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
    });
}

// =================== FUNCIONES DE SEMESTRES ===================
function addSemester() {
    const plan = getActivePlan();
    if (!plan) return;
    
    const newId = Math.max(...plan.semesters.map(s => s.id), 0) + 1;
    const newSemester = {
        id: newId,
        name: `Semestre ${newId}`,
        collapsed: false
    };
    
    plan.semesters.push(newSemester);
    renderApp();
    showNotification(`Semestre ${newId} agregado exitosamente`, 'success');
}

function removeSemester(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    if (plan.semesters.length <= 2) {
        showNotification('Debe haber al menos 2 semestres', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar este semestre? Las materias volverán al banco.')) {
        return;
    }
    
    // Mover materias de vuelta al banco
    plan.subjects.forEach(subject => {
        if (subject.location === 'semester' && subject.semesterId === semesterId) {
            subject.location = 'bank';
            subject.semesterId = null;
        }
    });
    
    // Eliminar semestre
    plan.semesters = plan.semesters.filter(s => s.id !== semesterId);
    
    renderApp();
    showNotification('Semestre eliminado. Las materias han vuelto al banco.', 'success');
}

function toggleSemester(semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const semester = plan.semesters.find(s => s.id === semesterId);
    if (semester) {
        semester.collapsed = !semester.collapsed;
        renderApp();
    }
}

function resetPlan() {
    if (!confirm('¿Estás seguro de reiniciar el plan? Esta acción eliminará todo tu progreso.')) {
        return;
    }
    
    const initialState = createInitialState();
    if (initialState) {
        plannerState = initialState;
        selectedSubjectId = null;
        renderApp();
        showNotification('Plan reiniciado exitosamente', 'success');
    }
}

// =================== DRAG AND DROP ===================
function handleSemesterDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleSemesterDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const subjectId = event.dataTransfer.getData('text/plain');
    const semesterId = parseInt(event.currentTarget.dataset.semesterId);
    
    moveSubjectToSemester(subjectId, semesterId);
}

function moveSubjectToSemester(subjectId, semesterId) {
    const plan = getActivePlan();
    if (!plan) return;
    
    const subject = plan.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const previousLocation = subject.location;
    const previousSemesterId = subject.semesterId;
    
    // Actualizar ubicación de la materia
    subject.location = 'semester';
    subject.semesterId = semesterId;
    
    renderApp();
    
    const semester = plan.semesters.find(s => s.id === semesterId);
    const semesterName = semester ? semester.name : `Semestre ${semesterId}`;
    
    if (previousLocation === 'bank') {
        showNotification(`${subject.name} movida a ${semesterName}`, 'success');
    } else {
        const previousSemester = plan.semesters.find(s => s.id === previousSemesterId);
        const previousName = previousSemester ? previousSemester.name : `Semestre ${previousSemesterId}`;
        showNotification(`${subject.name} movida de ${previousName} a ${semesterName}`, 'success');
    }
}

// =================== FUNCIONES DE TEMA ===================
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
    
    localStorage.setItem('planificador-theme', body.dataset.theme);
}

function toggleZenMode() {
    document.body.classList.toggle('zen-mode');
    const zenToggle = document.getElementById('zen-mode-toggle');
    const isZen = document.body.classList.contains('zen-mode');
    zenToggle.innerHTML = isZen ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
}

// =================== INICIALIZACIÓN GLOBAL ===================
function initializeApplication() {
    console.log('=== INICIALIZACIÓN GLOBAL DE LA APLICACIÓN ===');
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('planificador-theme') || 'dark';
    document.body.dataset.theme = savedTheme;
    
    // Actualizar icono del tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }
    
    // Mostrar overlay de carga inicialmente
    showLoadingOverlay();
    
    // Inicializar Firebase
    if (initializeFirebase()) {
        setupAuthStateListener();
        console.log('✅ Aplicación inicializada correctamente');
    } else {
        console.error('❌ Error en la inicialización de la aplicación');
        hideLoadingOverlay();
        showNotification('Error inicializando la aplicación. Recarga la página.', 'error');
    }
}

// =================== EVENT LISTENERS GLOBALES ===================
document.addEventListener('DOMContentLoaded', initializeApplication);

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', event.error);
    showNotification('Ha ocurrido un error inesperado', 'error');
});

// Manejar promesas rechazadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada:', event.reason);
    if (event.reason?.code !== 'auth/popup-closed-by-user') {
        showNotification('Error de conexión detectado', 'error');
    }
});

// Hacer las funciones globales disponibles
window.selectCareer = selectCareer;
window.toggleSemester = toggleSemester;
window.removeSemester = removeSemester;
window.handleSemesterDragOver = handleSemesterDragOver;
window.handleSemesterDrop = handleSemesterDrop;

console.log('✅ Script principal cargado correctamente');
