// js/ui.js

const App = window.App || {};

App.ui = (() => {
    const elements = {};

    function init() {
        // Cache de elementos del DOM
        elements.loginScreen = document.getElementById('login-screen');
        elements.mainContent = document.getElementById('main-content');
        elements.loginBtn = document.getElementById('login-btn');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.userName = document.getElementById('user-name');
        elements.userPhoto = document.getElementById('user-photo');
        elements.themeToggle = document.getElementById('theme-toggle');
        elements.pensumContainer = document.getElementById('pensum-container');
        elements.semesterGrid = document.getElementById('semester-grid');
        elements.completedCredits = document.getElementById('completed-credits');
        elements.totalCredits = document.getElementById('total-credits');
        elements.progressBar = document.getElementById('progress-bar');
        elements.addSemesterBtn = document.getElementById('add-semester-btn');
        elements.resetPlanBtn = document.getElementById('reset-plan-btn');
        elements.searchBar = document.getElementById('search-bar');
        elements.notificationContainer = document.getElementById('notification-container');
        elements.subjectModal = document.getElementById('subject-modal');
        elements.exportPlanBtn = document.getElementById('export-plan-btn');
        elements.siraImportBtn = document.getElementById('sira-import-btn');
        elements.siraModal = document.getElementById('sira-modal');
        elements.processSiraBtn = document.getElementById('process-sira-btn');
        elements.autoOrganizeBtn = document.getElementById('auto-organize-btn');

        setupEventListeners();
    }

    function setupEventListeners() {
        elements.loginBtn.addEventListener('click', App.firebase.signInWithGoogle);
        elements.logoutBtn.addEventListener('click', App.firebase.signOut);
        elements.themeToggle.addEventListener('click', toggleTheme);
        elements.addSemesterBtn.addEventListener('click', addSemester);
        elements.resetPlanBtn.addEventListener('click', resetPlan);
        elements.searchBar.addEventListener('input', filterSubjects);
        elements.exportPlanBtn.addEventListener('click', exportPlanToPDF);
        elements.siraImportBtn.addEventListener('click', () => showModal('sira-modal'));
        elements.processSiraBtn.addEventListener('click', processSiraInput);
        elements.autoOrganizeBtn.addEventListener('click', App.organizer.autoOrganizePlan);
    }
    
    function renderFullUI() {
        renderPensumBank();
        renderSemesterGrid();
        updateCreditCounterAndProgress();
    }

    function renderPensumBank() {
        const { semesters, completedSubjects } = App.state.getPlannerState();
        const pensumData = App.state.getPensumData();
        const subjectsInPlan = new Set(semesters.flatMap(sem => sem.subjects));
        const completedSet = new Set(completedSubjects);

        elements.pensumContainer.innerHTML = '';
        pensumData.forEach(subject => {
            if (!subjectsInPlan.has(subject.id) && !completedSet.has(subject.id)) {
                elements.pensumContainer.appendChild(createSubjectCard(subject, 'bank'));
            }
        });
    }

    function renderSemesterGrid() {
        const { semesters } = App.state.getPlannerState();
        elements.semesterGrid.innerHTML = '';
        semesters.forEach(semester => {
            elements.semesterGrid.appendChild(createSemesterColumn(semester));
        });
    }

    function createSubjectCard(subject, location) {
        const card = document.createElement('div');
        card.id = `${location}-${subject.id}`;
        card.className = 'subject-card';
        card.draggable = true;
        card.dataset.subjectId = subject.id;
        card.dataset.area = subject.type;

        const { completedSubjects } = App.state.getPlannerState();
        const isCompleted = completedSubjects.includes(subject.id);
        if (isCompleted) card.classList.add('completed');
        
        const status = App.validation.getSubjectStatus(subject.id);
        if (status === 'locked' && !isCompleted) card.classList.add('locked');

        card.innerHTML = `
            <div class="subject-info">
                <div class="subject-name">${subject.name}</div>
                <div class="subject-details">${subject.id}</div>
            </div>
            <div class="subject-actions">
                <span class="subject-credits">${subject.credits} CR</span>
                <input type="checkbox" class="complete-checkbox" ${isCompleted ? 'checked' : ''} title="Marcar como aprobada">
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('complete-checkbox')) showSubjectModal(subject.id);
        });
        card.querySelector('.complete-checkbox').addEventListener('change', (e) => {
            toggleSubjectCompleted(subject.id, e.target.checked);
        });

        return card;
    }

    function createSemesterColumn(semester) {
        const column = document.createElement('div');
        column.className = 'semester-column';
        column.id = semester.id;

        const subjectsContainer = document.createElement('div');
        subjectsContainer.className = 'semester-body';
        let totalCredits = 0;

        semester.subjects.forEach(subjectId => {
            const subjectData = App.state.findSubjectById(subjectId);
            if (subjectData) {
                totalCredits += subjectData.credits;
                subjectsContainer.appendChild(createSubjectCard(subjectData, semester.id));
            }
        });

        column.innerHTML = `
            <div class="semester-header">
                <h3 class="semester-title">${semester.name}</h3>
                <span class="semester-credits">${totalCredits} CR</span>
            </div>
        `;
        column.appendChild(subjectsContainer);
        return column;
    }

    function updateCreditCounterAndProgress() {
        const { completedSubjects } = App.state.getPlannerState();
        const pensumData = App.state.getPensumData();
        
        let completed = 0;
        completedSubjects.forEach(id => {
            const subject = App.state.findSubjectById(id);
            if (subject) completed += subject.credits;
        });
        
        const total = pensumData.reduce((sum, s) => sum + s.credits, 0);
        elements.completedCredits.textContent = completed;
        elements.totalCredits.textContent = total;

        const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
        elements.progressBar.style.width = `${progressPercentage}%`;
    }

    const showLoginUI = () => {
        elements.loginScreen.classList.remove('hidden');
        elements.mainContent.classList.add('hidden');
    };
    const showAppUI = () => {
        elements.loginScreen.classList.add('hidden');
        elements.mainContent.classList.remove('hidden');
    };
    
    function updateUserInfo(user) {
        elements.userName.textContent = user.displayName;
        elements.userPhoto.src = user.photoURL;
    }
    
    function toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        elements.themeToggle.innerHTML = `<i class="fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
    }

    function addSemester() {
        const { semesters } = App.state.getPlannerState();
        const newSemesterNum = semesters.length + 1;
        semesters.push({
            id: `sem-${Date.now()}`,
            name: `Semestre ${newSemesterNum}`,
            subjects: []
        });
        App.state.saveState();
        renderSemesterGrid();
    }

    function resetPlan() {
        if (confirm("¿Estás seguro de que quieres reiniciar tu plan?")) {
            App.state.initializeDefaultPlan();
        }
    }

    function filterSubjects(event) {
        const query = event.target.value.toLowerCase().trim();
        document.querySelectorAll('#pensum-container .subject-card').forEach(card => {
            const name = card.querySelector('.subject-name').textContent.toLowerCase();
            const code = card.querySelector('.subject-details').textContent.toLowerCase();
            card.style.display = (name.includes(query) || code.includes(query)) ? '' : 'none';
        });
    }

    function toggleSubjectCompleted(subjectId, isCompleted) {
        const { completedSubjects } = App.state.getPlannerState();
        const index = completedSubjects.indexOf(subjectId);
        if (isCompleted && index === -1) {
            completedSubjects.push(subjectId);
        } else if (!isCompleted && index > -1) {
            completedSubjects.splice(index, 1);
        }
        App.state.saveState();
        renderFullUI();
    }
    
    function processSiraInput() {
        const siraText = document.getElementById('sira-input').value;
        const approvedCodes = App.organizer.parseSiraHistory(siraText);
        
        if (approvedCodes.length > 0) {
            App.state.setCompletedSubjects(approvedCodes);
            showNotification(`${approvedCodes.length} materias importadas y marcadas como aprobadas.`, 'success');
        } else {
            showNotification('No se encontraron materias válidas en el texto proporcionado.', 'error');
        }
        closeModal('sira-modal');
        renderFullUI();
    }

    function showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        elements.notificationContainer.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    }

    function showSubjectModal(subjectId) {
        const subject = App.state.findSubjectById(subjectId);
        if (!subject) return;
        const prerequisites = (subject.prerequisites || []).map(id => App.state.findSubjectById(id)?.name || id).join(', ') || 'Ninguno';
        elements.subjectModal.querySelector('.modal-content').innerHTML = `
            <div class="modal-header"><h3 class="modal-title">${subject.name}</h3><button class="modal-close" onclick="App.ui.closeModal('subject-modal')">&times;</button></div>
            <div class="modal-body"><p><strong>Código:</strong> ${subject.id}</p><p><strong>Créditos:</strong> ${subject.credits}</p><p><strong>Prerrequisitos:</strong> ${prerequisites}</p></div>`;
        showModal('subject-modal');
    }

    const showModal = (modalId) => document.getElementById(modalId).classList.remove('hidden');
    const closeModal = (modalId) => document.getElementById(modalId).classList.add('hidden');
    
    async function exportPlanToPDF() { /* ...código sin cambios... */ }

    return { init, renderFullUI, showLoginUI, showAppUI, updateUserInfo, showNotification, showModal, closeModal };
})();
```

### 5. `js/state.js` (Actualizado)

He añadido una función para actualizar las materias completadas, que será usada por la importación de SIRA.


```javascript
// js/state.js

const App = window.App || {};

App.state = (() => {
    let currentUser = null;
    let currentCareerId = 'DI-188';
    let pensumData = [];
    let plannerState = {
        semesters: [],
        completedSubjects: []
    };
    let unsubscribePlanner = null;
    let isSaving = false;
    let saveTimeout = null;

    function init(pensum) {
        pensumData = pensum;
    }

    // --- Getters ---
    const getCurrentUser = () => currentUser;
    const getCurrentCareerId = () => currentCareerId;
    const getPensumData = () => pensumData;
    const getPlannerState = () => plannerState;
    const getUnsubscribePlanner = () => unsubscribePlanner;

    // --- Setters ---
    const setCurrentUser = (user) => { currentUser = user; };
    const setPlannerState = (newState) => {
        if (newState) {
            plannerState = {
                semesters: newState.semesters || [],
                completedSubjects: newState.completedSubjects || []
            };
        } else {
            initializeDefaultPlan();
        }
    };
    const setUnsubscribePlanner = (unsub) => { unsubscribePlanner = unsub; };
    
    /**
     * Actualiza la lista de materias completadas.
     * @param {string[]} subjectCodes - Array de códigos de materias.
     */
    function setCompletedSubjects(subjectCodes) {
        // Usar un Set para evitar duplicados y mejorar rendimiento
        const newCompleted = new Set(plannerState.completedSubjects);
        subjectCodes.forEach(code => newCompleted.add(code));
        plannerState.completedSubjects = Array.from(newCompleted);
        saveState();
    }

    function initializeDefaultPlan() {
        plannerState = {
            semesters: Array.from({ length: 10 }, (_, i) => ({
                id: `sem-${i + 1}`,
                name: `Semestre ${i + 1}`,
                subjects: []
            })),
            completedSubjects: []
        };
        saveState();
    }
    
    function findSubjectById(id) {
        return pensumData.find(s => s.id === id);
    }

    function saveState() {
        if (!currentUser) return;

        clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(async () => {
            try {
                await App.firebase.saveUserPlan(currentUser.uid, currentCareerId, plannerState);
                console.log("Plan guardado.");
            } catch (error) {
                console.error("Error al guardar:", error);
                App.ui.showNotification("Error al guardar el progreso.", "error");
            }
        }, 1500);
    }

    return {
        init,
        getCurrentUser,
        getCurrentCareerId,
        getPensumData,
        getPlannerState,
        getUnsubscribePlanner,
        setCurrentUser,
        setPlannerState,
        setUnsubscribePlanner,
        setCompletedSubjects, // Exportar la nueva función
        initializeDefaultPlan,
        findSubjectById,
        saveState
    };
})();
