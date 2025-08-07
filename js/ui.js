// js/ui.js

const App = window.App |

| {};

App.ui = (() => {
    const elements = {};

    function init() {
        // Cache de elementos del DOM
        elements.appContainer = document.getElementById('app-container');
        elements.loginModal = document.getElementById('login-modal');
        elements.authContainer = document.getElementById('auth-container');
        elements.subjectBank = document.getElementById('subject-bank');
        elements.semestersGrid = document.getElementById('semesters-grid');
        elements.subjectCardTemplate = document.getElementById('subject-card-template');
        elements.addSemesterButton = document.getElementById('add-semester-button');
        elements.searchBox = document.getElementById('search-box');

        // Listeners de eventos
        elements.addSemesterButton.addEventListener('click', handleAddSemester);
        elements.searchBox.addEventListener('input', handleSearch);
    }

    function handleAddSemester() {
        App.state.addSemester();
        renderFullUI();
    }
    
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const allCards = document.querySelectorAll('#subject-bank.subject-card');
        allCards.forEach(card => {
            const name = card.querySelector('.subject-name').textContent.toLowerCase();
            const code = card.querySelector('.subject-code').textContent.toLowerCase();
            if (name.includes(searchTerm) |

| code.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function showApp() {
        elements.appContainer.classList.remove('hidden');
        elements.loginModal.classList.add('hidden');
    }

    function showLogin() {
        elements.appContainer.classList.add('hidden');
        elements.loginModal.classList.remove('hidden');
    }

    function updateAuthUI(user) {
        elements.authContainer.innerHTML = '';
        if (user) {
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <img src="${user.photoURL}" alt="Foto de perfil de ${user.displayName}">
                <span>${user.displayName}</span>
                <button id="logout-button">Cerrar Sesión</button>
            `;
            elements.authContainer.appendChild(userInfo);
            document.getElementById('logout-button').addEventListener('click', App.firebase.signOut);
        } else {
            // No se muestra nada si no hay usuario, el modal se encarga de la acción.
        }
    }

    function createSubjectCard(subject) {
        const card = elements.subjectCardTemplate.content.cloneNode(true).firstElementChild;
        card.dataset.subjectId = subject.id;
        card.querySelector('.subject-code').textContent = subject.id;
        card.querySelector('.subject-name').textContent = subject.nombre;
        card.querySelector('.subject-credits').textContent = `${subject.creditos} créditos`;

        // Determinar y aplicar el estado visual (disponible/bloqueado)
        const status = App.validation.getSubjectStatus(subject.id, App.state.getPlan());
        card.dataset.status = status;
        
        const statusIconContainer = card.querySelector('.status-icons');
        if (status === 'locked') {
            const lockIcon = document.createElement('img');
            lockIcon.src = 'assets/lock-icon.svg'; // Asegúrate de tener este icono
            lockIcon.alt = 'Bloqueada';
            lockIcon.title = 'Prerrequisitos no cumplidos';
            statusIconContainer.appendChild(lockIcon);
        }

        return card;
    }

    function renderSemesters() {
        const plan = App.state.getPlan();
        elements.semestersGrid.innerHTML = '';

        plan.semesters.forEach((semester, index) => {
            const semesterColumn = document.createElement('div');
            semesterColumn.className = 'semester-column';
            semesterColumn.dataset.semesterIndex = index;

            let totalCredits = 0;
            const semesterBody = document.createElement('div');
            semesterBody.className = 'semester-body drop-zone';
            semesterBody.dataset.semesterIndex = index;

            if (semester) {
                Object.keys(semester).forEach(subjectId => {
                    const subject = App.state.getPensum().find(s => s.id === subjectId);
                    if (subject) {
                        semesterBody.appendChild(createSubjectCard(subject));
                        totalCredits += subject.creditos;
                    }
                });
            }
            
            semesterColumn.innerHTML = `
                <div class="semester-header">
                    <h3>Semestre ${index + 1}</h3>
                    <span class="credits-counter">${totalCredits} créditos</span>
                </div>
            `;
            semesterColumn.appendChild(semesterBody);
            elements.semestersGrid.appendChild(semesterColumn);
        });
    }

    function renderSubjectBank() {
        const pensum = App.state.getPensum();
        const plan = App.state.getPlan();
        const plannedSubjects = new Set();

        plan.semesters.forEach(semester => {
            if (semester) {
                Object.keys(semester).forEach(id => plannedSubjects.add(id));
            }
        });

        elements.subjectBank.innerHTML = '';
        pensum.forEach(subject => {
            if (!plannedSubjects.has(subject.id)) {
                elements.subjectBank.appendChild(createSubjectCard(subject));
            }
        });
    }

    function renderFullUI() {
        renderSubjectBank();
        renderSemesters();
        App.dragDrop.initDragAndDrop(); // Reinicializar listeners de drag & drop
    }

    return {
        init,
        showApp,
        showLogin,
        updateAuthUI,
        renderFullUI
    };
})();
