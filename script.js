// =================== CONFIGURACIÓN FIREBASE ===================
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
let eventListenersSetup = false;

// =================== INICIALIZACIÓN ===================
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.dataset.theme = savedTheme;
    
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        setupAuthStateListener();
        setupEventListeners();
    } catch (error) {
        console.error('Error Firebase:', error);
    }
});

function setupAuthStateListener() {
    auth.onAuthStateChanged(user => {
        const ui = {
            auth: document.getElementById('auth-container'),
            app: document.getElementById('app-container'),
            career: document.getElementById('career-selection-container'),
            loading: document.getElementById('loading-overlay')
        };
        
        if(ui.loading) ui.loading.classList.add('hidden');

        if (user) {
            ui.auth?.classList.add('hidden');
            if(!currentCareerId) {
                ui.career?.classList.remove('hidden');
            }
        } else {
            ui.auth?.classList.remove('hidden');
            ui.app?.classList.add('hidden');
            ui.career?.classList.add('hidden');
        }
    });
}

// =================== RENDERIZADO (LA PARTE QUE FALLABA) ===================

function renderStatsBoard(plan) {
    // 1. Buscamos el contenedor padre. Si no existe, no hacemos nada.
    const topSection = document.querySelector('.stats-section-top');
    if (!topSection) {
        console.warn("No se encontró '.stats-section-top'");
        return;
    }

    // 2. Calculamos las estadísticas
    const stats = calculateStats(plan);

    // 3. INYECCIÓN DIRECTA: Esto borra el "Cargando..." y pone el dashboard nuevo
    topSection.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-chart-pie" style="color: #3b82f6;"></i> Tu Progreso</h3>
            <div class="total-credits-display">
                <strong>${stats.completedCredits}</strong> / ${stats.totalCredits} créditos
            </div>
        </div>
        
        <div class="progress-summary-bar">
            <div class="progress-summary-bar-fill" style="width: ${stats.completionPercentage}%"></div>
        </div>

        <div class="stats-board-horizontal">
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title" style="color: var(--type-ab)">Ciclo Básico (AB)</span>
                    <span class="stat-value">${stats.categories.AB?.completed || 0}/${stats.categories.AB?.required || 49}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill type-ab" style="width: ${stats.categories.AB ? Math.round((stats.categories.AB.completed / stats.categories.AB.required) * 100) : 0}%"></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title" style="color: var(--type-ap)">Profesional (AP)</span>
                    <span class="stat-value">${stats.categories.AP?.completed || 0}/${stats.categories.AP?.required || 57}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill type-ap" style="width: ${stats.categories.AP ? Math.round((stats.categories.AP.completed / stats.categories.AP.required) * 100) : 0}%"></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title" style="color: var(--type-ep)">Elect. Prof. (EP)</span>
                    <span class="stat-value">${stats.categories.EP?.completed || 0}/${stats.categories.EP?.required || 17}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill type-ep" style="width: ${stats.categories.EP ? Math.round((stats.categories.EP.completed / stats.categories.EP.required) * 100) : 0}%"></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title" style="color: var(--type-ec)">Form. Gral. (EC)</span>
                    <span class="stat-value">${stats.categories.EC?.completed || 0}/${stats.categories.EC?.required || 17}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill type-ec" style="width: ${stats.categories.EC ? Math.round((stats.categories.EC.completed / stats.categories.EC.required) * 100) : 0}%"></div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title"><i class="fas fa-language"></i> Inglés (4 Niveles)</span>
                    <span class="stat-value">${stats.englishCompleted}/${stats.englishTotal}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill extra" style="width: ${stats.englishTotal > 0 ? Math.round((stats.englishCompleted / stats.englishTotal) * 100) : 0}%"></div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title"><i class="fas fa-running"></i> Deporte</span>
                    <span class="stat-value">${stats.sportsCompleted}/${stats.sportsTotal}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill extra" style="width: ${stats.sportsCompleted >= stats.sportsTotal ? 100 : 0}%"></div>
                </div>
            </div>
        </div>
    `;
}

function calculateStats(plan) {
    const subjects = plan.subjects || [];
    const completed = subjects.filter(s => s.completed);
    
    // Configuración Diseño Industrial
    const DI_REQUIREMENTS = { total: 140, AB: 49, AP: 57, EP: 17, EC: 17 };
    
    const normalizeCode = (v) => String(v || '').trim().toUpperCase();
    const getCode = (s) => normalizeCode(s?.id);

    // Códigos que NO suman al total académico estándar
    const englishCodes = new Set(['204025C', '204026C', '204027C', '204028C']);
    const sportsCodes = new Set(['404032C', '404002C', '404010C']);
    
    const categoryStats = {};
    
    Object.keys(DI_REQUIREMENTS).forEach(cat => {
        if (cat === 'total') return;
        let sub = subjects.filter(s => s.type === cat);
        let comp = sub.filter(s => s.completed);
        
        // Exclusiones
        if (cat === 'AB') {
            sub = sub.filter(s => !englishCodes.has(getCode(s)));
            comp = comp.filter(s => !englishCodes.has(getCode(s)));
        }
        if (cat === 'EC') {
            sub = sub.filter(s => !sportsCodes.has(getCode(s)));
            comp = comp.filter(s => !sportsCodes.has(getCode(s)));
        }
        
        categoryStats[cat] = {
            completed: comp.reduce((sum, s) => sum + (s.credits || 0), 0),
            required: DI_REQUIREMENTS[cat]
        };
    });
    
    // Cálculo total limpio
    const totalComp = completed.filter(s => !englishCodes.has(getCode(s)) && !sportsCodes.has(getCode(s)))
                              .reduce((sum, s) => sum + (s.credits || 0), 0);
    
    return {
        totalCredits: DI_REQUIREMENTS.total,
        completedCredits: totalComp,
        completionPercentage: Math.min(100, Math.round((totalComp / DI_REQUIREMENTS.total) * 100)),
        categories: categoryStats,
        englishTotal: 4,
        englishCompleted: subjects.filter(s => englishCodes.has(getCode(s)) && s.completed).length,
        sportsTotal: 1,
        sportsCompleted: subjects.filter(s => sportsCodes.has(getCode(s)) && s.completed).length >= 1 ? 1 : 0
    };
}

// =================== AUTH & CARGA DE DATOS ===================
function loginWithGoogle() {
    const btn = document.getElementById('google-login-btn');
    if(btn) btn.innerHTML = 'Cargando...';
    auth.signInWithPopup(googleProvider).catch(err => alert(err.message));
}

function selectCareer(careerId) {
    currentCareerId = careerId;
    loadPlannerData(auth.currentUser.uid, careerId);
}

function loadPlannerData(userId, careerId) {
    db.collection('users').doc(userId).collection('planners').doc(careerId)
        .onSnapshot(doc => {
            if (doc.exists) {
                plannerState = doc.data();
            } else {
                plannerState = getInitialState();
                savePlannerData();
            }
            initializeAppUI();
        });
}

function getInitialState() {
    // Carga segura de pensum + electivas
    let allSubjects = (typeof PENSUM_DI !== 'undefined' ? PENSUM_DI : []).map(s => ({...s, completed: false, location: 'bank'}));
    if (typeof ELECTIVAS_FG !== 'undefined') {
        allSubjects = [...allSubjects, ...ELECTIVAS_FG.map(s => ({...s, completed: false, location: 'bank'}))];
    }
    
    return {
        activePlanId: 'plan_1',
        plans: {
            'plan_1': {
                name: 'Plan Principal',
                subjects: allSubjects,
                semesters: [ { id: 1, name: 'Semestre 1' }, { id: 2, name: 'Semestre 2' } ]
            }
        }
    };
}

function initializeAppUI() {
    document.getElementById('career-selection-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    render();
}

function render() {
    const plan = plannerState.plans[plannerState.activePlanId];
    if (!plan) return;
    renderStatsBoard(plan);
    renderSubjectBank(plan);
    renderSemesters(plan);
}

// =================== BANCO Y SEMESTRES ===================
function renderSubjectBank(plan) {
    const container = document.getElementById('subject-bank');
    if (!container) return;
    
    const search = document.getElementById('subject-search')?.value.toLowerCase() || '';
    const bankSubjects = plan.subjects.filter(s => s.location === 'bank' && s.name.toLowerCase().includes(search));
    
    // Renderizado simple
    container.innerHTML = bankSubjects.map(s => `
        <div class="subject-card type-${s.type} ${s.completed ? 'completed' : ''}" 
             draggable="true" ondragstart="dragStart(event)" 
             data-subject-id="${s.id}" onclick="toggleSubjectCompleted('${s.id}')">
            <div class="subject-header"><span>${s.id}</span><span>${s.credits} cr</span></div>
            <div class="subject-name">${s.name}</div>
        </div>
    `).join('');
}

function renderSemesters(plan) {
    const container = document.getElementById('semesters-grid');
    if (!container) return;
    
    container.innerHTML = plan.semesters.map(sem => {
        const subjects = plan.subjects.filter(s => s.location === `semester-${sem.id}`);
        const cr = subjects.reduce((sum, s) => sum + (s.credits||0), 0);
        return `
            <div class="semester-column">
                <div class="semester-header"><strong>${sem.name}</strong><span>${cr} cr</span></div>
                <div class="semester-content drop-zone" ondrop="dropSubject(event, ${sem.id})" ondragover="allowDrop(event)">
                    ${subjects.map(s => `
                        <div class="semester-subject type-${s.type} ${s.completed ? 'completed' : ''}" draggable="true" ondragstart="dragStart(event)" data-subject-id="${s.id}">
                             <div class="subject-header"><span>${s.id}</span><span>${s.credits} cr</span></div>
                             <div>${s.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('') + `<button class="btn-secondary" onclick="addSemester()">+ Semestre</button>`;
}

// =================== ACCIONES (Drag & Drop, Guardado) ===================
function dragStart(e) { draggedElementId = e.target.dataset.subjectId; }
function allowDrop(e) { e.preventDefault(); }
function dropSubject(e, semId) {
    e.preventDefault();
    const plan = plannerState.plans[plannerState.activePlanId];
    const sub = plan.subjects.find(s => s.id === draggedElementId);
    if(sub) { sub.location = `semester-${semId}`; savePlannerData(); }
}

function toggleSubjectCompleted(id) {
    const plan = plannerState.plans[plannerState.activePlanId];
    const sub = plan.subjects.find(s => s.id === id);
    if(sub) { sub.completed = !sub.completed; savePlannerData(); }
}

function addSemester() {
    const plan = plannerState.plans[plannerState.activePlanId];
    plan.semesters.push({ id: plan.semesters.length + 1, name: `Semestre ${plan.semesters.length + 1}` });
    savePlannerData();
}

function savePlannerData() {
    if(isSaving) return;
    isSaving = true;
    db.collection('users').doc(auth.currentUser.uid).collection('planners').doc(currentCareerId)
        .set(plannerState).then(() => { render(); isSaving = false; });
}

function setupEventListeners() {
    document.getElementById('google-login-btn')?.addEventListener('click', loginWithGoogle);
    document.getElementById('subject-search')?.addEventListener('input', render);
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const t = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = t; localStorage.setItem('theme', t);
    });
}
