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
let touchMoveMode = false;
let selectedTouchElement = null;

// =================== SISTEMA DE NOTIFICACIONES ===================
function showNotification(message, type = 'info', duration = 3000) {
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

// =================== AUTENTICACIÓN ===================
// Corregido: Estado de autenticación más robusto
auth.onAuthStateChanged(user => {
    console.log('Estado de autenticación cambiado:', user ? user.email : 'No logueado');
    
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

// Corregido: Login con Google más robusto
function loginWithGoogle() {
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

// Corregido: Login con email más robusto
function loginWithEmail(email, password) {
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

// Corregido: Selección de carrera más clara
function showCareerSelection(user) {
    console.log('Mostrando selección de carrera para:', user.email);
    
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

// Corregido: Carga de carrera más robusta
function loadCareer(careerId) {
    console.log('Cargando carrera:', careerId);
    
    if (!auth.currentUser) {
        console.error('No hay usuario autenticado');
        showNotification('Error: No hay usuario autenticado', 'error');
        return;
    }

    currentCareerId = careerId;
    
    // Show loading
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    // Load planner data
    loadPlannerData(auth.currentUser.uid, careerId);
}

// =================== LÓGICA DE DATOS Y PLANES ===================
function getActivePlan() {
    if (plannerState && plannerState.plans && plannerState.activePlanId) {
        return plannerState.plans[plannerState.activePlanId];
    }
    return null;
}

function getInitialStateForUser() {
    const initialPlanId = 'plan_1';
    return {
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
}

function loadPlannerData(userId, careerId) {
    console.log('Cargando datos para usuario:', userId, 'carrera:', careerId);
    
    const docRef = db.collection('users').doc(userId).collection('planners').doc(careerId);
    
    unsubscribePlanner = docRef.onSnapshot(doc => {
        console.log('Snapshot recibido:', doc.exists);
        
        if (doc.exists && doc.data().plans) {
            plannerState = doc.data();
            console.log('Estado cargado:', plannerState);
        } else {
            console.log('Creando estado inicial');
            plannerState = getInitialStateForUser();
            // Save initial state
            savePlannerData();
        }
        
        initializeAppUI(auth.currentUser);
    }, error => {
        console.error("Error al cargar datos:", error);
        showNotification("No se pudieron cargar tus datos.", 'error');
        
        // Initialize with default state on error
        plannerState = getInitialStateForUser();
        initializeAppUI(auth.currentUser);
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
    console.log('Inicializando UI para:', user.email);
    
    // Hide loading and career selection
    document.getElementById('loading-overlay')?.classList.add('hidden');
    document.getElementById('career-selection-container')?.classList.add('hidden');
    
    // Show main app
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.remove('hidden');
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
    
    // Setup event listeners
    setupEventListeners();
    
    showNotification('¡Datos cargados exitosamente!', 'success');
    console.log('UI inicializada correctamente');
}

function render() {
    if (document.getElementById('app-container')?.classList.contains('hidden')) return;

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

function renderPlanSlots() {
    const dropdown = document.getElementById('plan-slots-list');
    const activeButton = document.getElementById('active-plan-button');
    
    if (!dropdown || !activeButton) return;
    
    const activePlan = getActivePlan();
    if (!activePlan) return;

    activeButton.innerHTML = `${activePlan.name} <i class="fas fa-chevron-down"></i>`;

    dropdown.innerHTML = '';

    // Add existing plans
    for (const planId in plannerState.plans) {
        const plan = plannerState.plans[planId];
        const item = document.createElement('div');
        item.className = 'plan-slot-item';
        item.dataset.planId = planId;

        item.innerHTML = `
            <span>${plan.name}</span>
            <div class="plan-slot-actions">
                <button onclick="renamePlan('${planId}')" title="Renombrar">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="duplicatePlan('${planId}')" title="Duplicar">
                    <i class="fas fa-copy"></i>
                </button>
                ${Object.keys(plannerState.plans).length > 1 ? 
                    `<button onclick="deletePlan('${planId}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>` : 
                    ''
                }
            </div>
        `;

        dropdown.appendChild(item);
    }

    // Add new plan option if less than 3 plans
    if (Object.keys(plannerState.plans).length < 3) {
        const newPlanItem = document.createElement('div');
        newPlanItem.className = 'plan-slot-item';
        newPlanItem.innerHTML = `
            <input type="text" class="new-plan-input" placeholder="Nombre del nuevo plan..." 
                   onkeypress="if(event.key==='Enter') createNewPlan(this.value)">
        `;
        dropdown.appendChild(newPlanItem);
    }
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
                <span class="stat-title">Inglés</span>
                <span class="stat-value">${stats.englishCompleted}/4</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill english" style="width: ${(stats.englishCompleted / 4) * 100}%"></div>
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
    
    const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
    const completedCredits = completed.reduce((sum, s) => sum + s.credits, 0);
    
    const englishSubjects = subjects.filter(s => s.category === 'english');
    const englishCompleted = englishSubjects.filter(s => s.completed).length;
    
    return {
        totalSubjects: subjects.length,
        completedSubjects: completed.length,
        totalCredits,
        completedCredits,
        completionPercentage: totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0,
        englishCompleted
    };
}

function renderSubjectBank(plan) {
    const container = document.getElementById('subject-bank');
    if (!container) return;

    const subjects = plan.subjects.filter(s => s.location === 'bank');
    const searchTerm = document.getElementById('subject-search')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';

    let filteredSubjects = subjects;

    // Apply search filter
    if (searchTerm) {
        filteredSubjects = filteredSubjects.filter(s => 
            s.name.toLowerCase().includes(searchTerm) ||
            s.id.toLowerCase().includes(searchTerm)
        );
    }

    // Apply category filter
    if (activeFilter !== 'all') {
        filteredSubjects = filteredSubjects.filter(s => {
            switch (activeFilter) {
                case 'available': return canTakeSubject(s, plan) && !s.completed;
                case 'completed': return s.completed;
                case 'locked': return !canTakeSubject(s, plan) && !s.completed;
                default: return true;
            }
        });
    }

    // Sort subjects
    filteredSubjects.sort((a, b) => {
        // Completed subjects last
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // Available subjects first
        const aCanTake = canTakeSubject(a, plan);
        const bCanTake = canTakeSubject(b, plan);
        if (aCanTake !== bCanTake) {
            return aCanTake ? -1 : 1;
        }
        // Then by name
        return a.name.localeCompare(b.name);
    });

    container.innerHTML = filteredSubjects.length ? 
        filteredSubjects.map(subject => createSubjectCardHTML(subject, plan)).join('') :
        '<div class="no-results"><i class="fas fa-search"></i><p>No se encontraron materias</p></div>';
}

function createSubjectCardHTML(subject, plan) {
    const canTake = canTakeSubject(subject, plan);
    const isSelected = selectedSubjectId === subject.id;
    
    let cardClass = 'subject-card';
    if (subject.completed) cardClass += ' completed';
    if (!canTake && !subject.completed) cardClass += ' locked';
    if (canTake && !subject.completed) cardClass += ' available';
    if (isSelected) cardClass += ' selected';

    const statusIcon = subject.completed ? '<i class="fas fa-check-circle subject-status completed"></i>' : 
                      (!canTake ? '<i class="fas fa-lock lock-icon"></i>' : '');

    return `
        <div class="${cardClass}" 
             data-subject-id="${subject.id}"
             onclick="selectSubject('${subject.id}')"
             ${canTake && !subject.completed ? 'draggable="true"' : ''}
             onmouseenter="highlightPrerequisites('${subject.id}')"
             onmouseleave="clearHighlights()">
            
            <div class="subject-header">
                <span class="subject-code">${subject.id}</span>
                <span class="subject-credits">${subject.credits} cr</span>
            </div>
            
            <div class="subject-name">${subject.name}</div>
            
            <div class="subject-type">${getTypeLabel(subject.type)} ${subject.category === 'english' ? '• Inglés' : ''}</div>
            
            ${statusIcon}
        </div>
    `;
}

function renderSemesters(plan) {
    const container = document.getElementById('semesters-grid');
    if (!container) return;

    container.innerHTML = '';

    plan.semesters.sort((a, b) => a.id - b.id).forEach(semester => {
        const column = document.createElement('div');
        column.className = `semester-column ${semester.collapsed ? 'collapsed' : ''}`;
        column.dataset.semesterId = semester.id;

        const subjects = plan.subjects.filter(s => s.location === `semester-${semester.id}`);
        const credits = subjects.reduce((sum, s) => sum + s.credits, 0);
        const highLoad = credits > 18;

        column.innerHTML = `
            <div class="semester-header" onclick="toggleSemesterCollapse(${semester.id})">
                <h3>${semester.name}</h3>
                <div class="semester-info">
                    <span class="semester-credits ${highLoad ? 'high-load' : ''}">${credits} cr</span>
                    <div class="semester-controls">
                        <button class="semester-control-btn" onclick="event.stopPropagation(); renameSemester(${semester.id})" title="Renombrar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="semester-control-btn" onclick="event.stopPropagation(); deleteSemester(${semester.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="semester-control-btn" title="${semester.collapsed ? 'Expandir' : 'Contraer'}">
                            <i class="fas fa-chevron-${semester.collapsed ? 'down' : 'up'}"></i>
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
                <span class="subject-credits">${subject.credits} cr</span>
            </div>
            
            <div class="subject-name">${subject.name}</div>
            
            <div class="subject-type">${getTypeLabel(subject.type)}</div>
            
            ${subject.completed ? '<i class="fas fa-check-circle subject-status completed"></i>' : ''}
        </div>
    `;
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    // Auth event listeners
    setupAuthEventListeners();
    
    // Career selection
    setupCareerEventListeners();
    
    // App event listeners
    setupAppEventListeners();
    
    // Modal event listeners  
    setupModalEventListeners();
    
    // Touch event listeners for mobile
    setupTouchEventListeners();
}

function setupAuthEventListeners() {
    // Google login
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
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
    }

    // Toggle register (placeholder for future)
    const toggleRegister = document.getElementById('toggle-register');
    if (toggleRegister) {
        toggleRegister.addEventListener('click', () => {
            showNotification('Registro próximamente disponible', 'info');
        });
    }
}

function setupCareerEventListeners() {
    // Career selection buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.career-select-btn')) {
            const careerId = e.target.closest('.career-select-btn').dataset.career;
            if (careerId) {
                loadCareer(careerId);
            }
        }
    });

    // Logout from career selection
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
}

function setupAppEventListeners() {
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

    // Logout from app
    const logoutAppBtn = document.getElementById('logout-app-btn');
    if (logoutAppBtn) {
        logoutAppBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                auth.signOut();
            }
        });
    }

    // Plan slots dropdown
    const activePlanBtn = document.getElementById('active-plan-button');
    const planSlotsList = document.getElementById('plan-slots-list');
    
    if (activePlanBtn && planSlotsList) {
        activePlanBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            planSlotsList.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.plan-slots-container')) {
                planSlotsList.classList.add('hidden');
            }
        });

        planSlotsList.addEventListener('click', (e) => {
            if (e.target.closest('.plan-slot-item') && !e.target.closest('button') && !e.target.closest('input')) {
                const planId = e.target.closest('.plan-slot-item').dataset.planId;
                if (planId) {
                    switchToPlan(planId);
                    planSlotsList.classList.add('hidden');
                }
            }
        });
    }

    // Search functionality
    const searchInput = document.getElementById('subject-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            render();
        }, 300));
    }

    // Filter tabs
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tab')) {
            document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            render();
        }
    });

    // Action buttons
    const addSemesterBtn = document.getElementById('add-semester-btn');
    if (addSemesterBtn) {
        addSemesterBtn.addEventListener('click', addSemester);
    }

    const autoOrganizeBtn = document.getElementById('auto-organize-btn');
    if (autoOrganizeBtn) {
        autoOrganizeBtn.addEventListener('click', autoOrganize);
    }

    const exportBtn = document.getElementById('export-plan-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPlan);
    }

    const resetBtn = document.getElementById('reset-plan-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetPlan);
    }

    const contactBtn = document.getElementById('contact-btn');
    if (contactBtn) {
        contactBtn.addEventListener('click', contactDirection);
    }

    const importSiraBtn = document.getElementById('import-sira-btn');
    if (importSiraBtn) {
        importSiraBtn.addEventListener('click', () => openModal('import-modal'));
    }

    const addEquivalencyBtn = document.getElementById('add-equivalency-btn');
    if (addEquivalencyBtn) {
        addEquivalencyBtn.addEventListener('click', () => openModal('equivalency-modal'));
    }
}

function setupModalEventListeners() {
    // Close modal buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close-btn')) {
            closeModal(e.target.closest('.modal-overlay').id);
        }
        
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.id);
        }
    });

    // Import SIRA functionality
    const processSiraBtn = document.getElementById('process-sira-btn');
    if (processSiraBtn) {
        processSiraBtn.addEventListener('click', processSiraData);
    }

    const importConfirmedBtn = document.getElementById('import-confirmed-btn');
    if (importConfirmedBtn) {
        importConfirmedBtn.addEventListener('click', confirmSiraImport);
    }

    // Equivalency tabs
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('equiv-tab')) {
            const tabId = e.target.dataset.tab;
            switchEquivalencyTab(tabId);
        }
    });

    // Equivalency functionality
    const addEquivBtn = document.getElementById('add-equivalency-confirmed-btn');
    if (addEquivBtn) {
        addEquivBtn.addEventListener('click', addEquivalency);
    }

    // Pensum search
    const pensumSearch = document.getElementById('pensum-search');
    if (pensumSearch) {
        pensumSearch.addEventListener('input', debounce(searchPensumSubjects, 300));
    }

    // Custom subject functionality
    const createCustomBtn = document.getElementById('create-custom-subject-btn');
    if (createCustomBtn) {
        createCustomBtn.addEventListener('click', createCustomSubject);
    }
}

function setupTouchEventListeners() {
    // Touch support for mobile drag and drop
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

// =================== DRAG AND DROP ===================
function dragStart(e) {
    draggedElementId = e.target.dataset.subjectId;
    e.target.classList.add('dragging');
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function dropSubject(e, semesterId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedElementId) return;
    
    moveSubject(draggedElementId, `semester-${semesterId}`);
    draggedElementId = null;
    
    // Remove dragging class
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

// =================== TOUCH SUPPORT ===================
function handleTouchStart(e) {
    const subjectCard = e.target.closest('.subject-card, .semester-subject');
    if (subjectCard && subjectCard.getAttribute('draggable') === 'true') {
        selectedTouchElement = subjectCard;
        touchMoveMode = true;
        
        subjectCard.classList.add('touch-move-mode');
        showNotification('Toca el semestre donde quieres mover la materia', 'info', 2000);
        
        // Highlight drop zones
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.add('touch-target');
        });
        
        e.preventDefault();
    }
}

function handleTouchMove(e) {
    if (touchMoveMode) {
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    if (!touchMoveMode || !selectedTouchElement) return;
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elementBelow?.closest('.drop-zone');
    
    if (dropZone) {
        const semesterId = dropZone.dataset.semesterId;
        const subjectId = selectedTouchElement.dataset.subjectId;
        
        if (semesterId && subjectId) {
            moveSubject(subjectId, `semester-${semesterId}`);
        }
    }
    
    // Clean up
    selectedTouchElement?.classList.remove('touch-move-mode');
    document.querySelectorAll('.touch-target').forEach(zone => {
        zone.classList.remove('touch-target');
    });
    
    touchMoveMode = false;
    selectedTouchElement = null;
}

// =================== SUBJECT MANAGEMENT ===================
function selectSubject(subjectId) {
    selectedSubjectId = subjectId;
    renderSubjectInfo(subjectId);
    render();
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

    const prerequisites = getSubjectPrerequisites(subject);
    const postrequisites = getSubjectPostrequisites(subject, plan);

    container.innerHTML = `
        <div class="subject-details">
            <h4>${subject.name}</h4>
            
            <div class="detail-row">
                <span class="detail-label">Código:</span>
                <span class="detail-value">${subject.id}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Créditos:</span>
                <span class="detail-value">${subject.credits}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Tipo:</span>
                <span class="detail-value">${getTypeLabel(subject.type)}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Estado:</span>
                <span class="detail-value">${subject.completed ? '✅ Vista' : '⏳ Pendiente'}</span>
            </div>
            
            ${subject.location !== 'bank' ? `
                <div class="detail-row">
                    <span class="detail-label">Ubicación:</span>
                    <span class="detail-value">${getSemesterName(subject.location, plan)}</span>
                </div>
            ` : ''}
            
            ${prerequisites.length > 0 ? `
                <div class="prerequisites-list">
                    <h5><i class="fas fa-arrow-left" style="color: var(--prereq-color)"></i> Prerrequisitos:</h5>
                    ${prerequisites.map(p => `
                        <div class="prereq-item">${p.name} (${p.id})</div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${postrequisites.length > 0 ? `
                <div class="postrequisites-list">
                    <h5><i class="fas fa-arrow-right" style="color: var(--postreq-color)"></i> La requieren:</h5>
                    ${postrequisites.map(p => `
                        <div class="postreq-item">${p.name} (${p.id})</div>
                    `).join('')}
                </div>
            ` : ''}
            
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

function moveSubject(subjectId, newLocation) {
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) return;

    subject.location = newLocation;
    render();
    showNotification(`${subject.name} movida exitosamente`, 'success');
}

function toggleSubjectCompleted(subjectId) {
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) return;

    subject.completed = !subject.completed;
    
    // If marking as incomplete, also move to bank
    if (!subject.completed && subject.location !== 'bank') {
        subject.location = 'bank';
    }
    
    render();
    renderSubjectInfo(subjectId); // Update info panel
    showNotification(
        `${subject.name} ${subject.completed ? 'marcada como vista' : 'desmarcada'}`, 
        'success'
    );
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

function getSubjectPrerequisites(subject) {
    if (!subject.prerequisites) return [];
    
    return subject.prerequisites.map(prereqId => {
        return PENSUM_DI.find(s => s.id === prereqId);
    }).filter(Boolean);
}

function getSubjectPostrequisites(subject, plan) {
    return plan.subjects.filter(s => 
        s.prerequisites && s.prerequisites.includes(subject.id)
    );
}

function highlightPrerequisites(subjectId) {
    const plan = getActivePlan();
    const subject = plan.subjects.find(s => s.id === subjectId);
    
    if (!subject) return;

    // Clear previous highlights
    clearHighlights();

    // Highlight prerequisites
    if (subject.prerequisites) {
        subject.prerequisites.forEach(prereqId => {
            const card = document.querySelector(`[data-subject-id="${prereqId}"]`);
            if (card) card.classList.add('prereq-highlight');
        });
    }

    // Highlight postrequisites
    const postrequisites = getSubjectPostrequisites(subject, plan);
    postrequisites.forEach(postreq => {
        const card = document.querySelector(`[data-subject-id="${postreq.id}"]`);
        if (card) card.classList.add('postreq-highlight');
    });
}

function clearHighlights() {
    document.querySelectorAll('.prereq-highlight, .postreq-highlight')
        .forEach(card => {
            card.classList.remove('prereq-highlight', 'postreq-highlight');
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

function getSemesterName(location, plan) {
    if (location === 'bank') return 'Banco de materias';
    
    const semesterId = location.replace('semester-', '');
    const semester = plan.semesters.find(s => s.id == semesterId);
    return semester ? semester.name : location;
}

//
