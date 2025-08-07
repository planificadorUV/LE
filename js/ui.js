// js/ui.js

((App) => {
    const elements = {};

    App.ui = {
        init() {
            const ids = ['loginScreen', 'mainContent', 'loginBtn', 'logoutBtn', 'userName', 'userPhoto', 'themeToggle', 'pensumContainer', 'semesterGrid', 'completedCredits', 'totalCredits', 'progressBar', 'addSemesterBtn', 'resetPlanBtn', 'searchBar', 'notificationContainer', 'subjectModal', 'exportPlanBtn', 'siraImportBtn', 'siraModal', 'processSiraBtn', 'autoOrganizeBtn'];
            ids.forEach(id => elements[id] = document.getElementById(id));
            this.setupEventListeners();
        },

        setupEventListeners() {
            elements.loginBtn.addEventListener('click', App.firebase.signInWithGoogle);
            elements.logoutBtn.addEventListener('click', App.firebase.signOut);
            elements.themeToggle.addEventListener('click', this.toggleTheme);
            elements.addSemesterBtn.addEventListener('click', this.addSemester);
            elements.resetPlanBtn.addEventListener('click', this.resetPlan);
            elements.searchBar.addEventListener('input', this.filterSubjects);
            elements.exportPlanBtn.addEventListener('click', this.exportPlanToPDF);
            elements.siraImportBtn.addEventListener('click', () => this.showModal('sira-modal'));
            elements.processSiraBtn.addEventListener('click', this.processSiraInput);
            elements.autoOrganizeBtn.addEventListener('click', App.organizer.autoOrganizePlan);
            elements.siraModal.querySelector('.modal-close').addEventListener('click', () => this.closeModal('sira-modal'));
            elements.subjectModal.querySelector('.modal-close').addEventListener('click', () => this.closeModal('subject-modal'));
        },
        
        renderFullUI() {
            this.renderPensumBank();
            this.renderSemesterGrid();
            this.updateCreditCounterAndProgress();
        },

        renderPensumBank() {
            const { semesters, completedSubjects } = App.state.getPlannerState();
            const pensumData = App.state.getPensumData();
            const subjectsInPlan = new Set(semesters.flatMap(sem => sem.subjects));
            const completedSet = new Set(completedSubjects);

            elements.pensumContainer.innerHTML = '';
            pensumData.forEach(subject => {
                if (!subjectsInPlan.has(subject.id) && !completedSet.has(subject.id)) {
                    elements.pensumContainer.appendChild(this.createSubjectCard(subject, 'bank'));
                }
            });
        },

        renderSemesterGrid() {
            const { semesters } = App.state.getPlannerState();
            elements.semesterGrid.innerHTML = '';
            semesters.forEach(semester => {
                elements.semesterGrid.appendChild(this.createSemesterColumn(semester));
            });
        },

        createSubjectCard(subject, location) {
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
                if (!e.target.classList.contains('complete-checkbox')) this.showSubjectModal(subject.id);
            });
            card.querySelector('.complete-checkbox').addEventListener('change', (e) => {
                this.toggleSubjectCompleted(subject.id, e.target.checked);
            });

            return card;
        },

        createSemesterColumn(semester) {
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
                    subjectsContainer.appendChild(this.createSubjectCard(subjectData, semester.id));
                }
            });

            column.innerHTML = `<div class="semester-header"><h3 class="semester-title">${semester.name}</h3><span class="semester-credits">${totalCredits} CR</span></div>`;
            column.appendChild(subjectsContainer);
            return column;
        },

        updateCreditCounterAndProgress() {
            const { completedSubjects } = App.state.getPlannerState();
            const pensumData = App.state.getPensumData();
            const completed = completedSubjects.reduce((sum, id) => sum + (App.state.findSubjectById(id)?.credits || 0), 0);
            const total = pensumData.reduce((sum, s) => sum + s.credits, 0);
            
            elements.completedCredits.textContent = completed;
            elements.totalCredits.textContent = total;
            elements.progressBar.style.width = total > 0 ? `${(completed / total) * 100}%` : '0%';
        },

        showLoginUI: () => {
            elements.loginScreen.classList.remove('hidden');
            elements.mainContent.classList.add('hidden');
        },
        showAppUI: () => {
            elements.loginScreen.classList.add('hidden');
            elements.mainContent.classList.remove('hidden');
        },
        updateUserInfo(user) {
            elements.userName.textContent = user.displayName;
            elements.userPhoto.src = user.photoURL;
        },
        toggleTheme() {
            const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
            elements.themeToggle.innerHTML = `<i class="fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
        },
        addSemester() {
            const { semesters } = App.state.getPlannerState();
            semesters.push({ id: `sem-${Date.now()}`, name: `Semestre ${semesters.length + 1}`, subjects: [] });
            App.state.saveState();
            App.ui.renderSemesterGrid();
        },
        resetPlan() {
            if (confirm("¿Estás seguro de que quieres reiniciar tu plan?")) App.state.initializeDefaultPlan();
        },
        filterSubjects(event) {
            const query = event.target.value.toLowerCase().trim();
            document.querySelectorAll('#pensum-container .subject-card').forEach(card => {
                const name = card.querySelector('.subject-name').textContent.toLowerCase();
                const code = card.querySelector('.subject-details').textContent.toLowerCase();
                card.style.display = (name.includes(query) || code.includes(query)) ? '' : 'none';
            });
        },
        toggleSubjectCompleted(subjectId, isCompleted) {
            const { completedSubjects } = App.state.getPlannerState();
            const index = completedSubjects.indexOf(subjectId);
            if (isCompleted && index === -1) completedSubjects.push(subjectId);
            else if (!isCompleted && index > -1) completedSubjects.splice(index, 1);
            App.state.saveState();
            this.renderFullUI();
        },
        processSiraInput() {
            const siraText = document.getElementById('sira-input').value;
            const approvedCodes = App.organizer.parseSiraHistory(siraText);
            
            if (approvedCodes.length > 0) {
                App.state.setCompletedSubjects(approvedCodes);
                App.ui.showNotification(`${approvedCodes.length} materias importadas.`, 'success');
            } else {
                App.ui.showNotification('No se encontraron materias válidas.', 'error');
            }
            App.ui.closeModal('sira-modal');
        },
        showNotification(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            elements.notificationContainer.appendChild(notification);
            setTimeout(() => notification.remove(), duration);
        },
        showSubjectModal(subjectId) {
            const subject = App.state.findSubjectById(subjectId);
            if (!subject) return;
            const prerequisites = (subject.prerequisites || []).map(id => App.state.findSubjectById(id)?.name || id).join(', ') || 'Ninguno';
            const modalBody = elements.subjectModal.querySelector('.modal-body');
            elements.subjectModal.querySelector('.modal-title').textContent = subject.name;
            modalBody.innerHTML = `<p><strong>Código:</strong> ${subject.id}</p><p><strong>Créditos:</strong> ${subject.credits}</p><p><strong>Prerrequisitos:</strong> ${prerequisites}</p>`;
            this.showModal('subject-modal');
        },
        showModal: (modalId) => document.getElementById(modalId).classList.remove('hidden'),
        closeModal: (modalId) => document.getElementById(modalId).classList.add('hidden'),
        
        async exportPlanToPDF() {
            this.showNotification("Generando PDF...", "info");
            const { jsPDF } = window.jspdf;
            const grid = document.getElementById('semester-grid');
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            try {
                const canvas = await html2canvas(grid, { scale: 2, backgroundColor: document.body.dataset.theme === 'dark' ? '#111827' : '#f9fafb' });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                doc.text(`Plan de Estudios - ${App.state.getCurrentUser().displayName}`, 10, 10);
                doc.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
                doc.save(`plan-de-estudios.pdf`);
            } catch (error) {
                console.error("Error al generar PDF:", error);
                this.showNotification("No se pudo generar el PDF.", "error");
            }
        }
    };
})(window.App);
