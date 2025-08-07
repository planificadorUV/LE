// js/dragDrop.js

((App) => {
    let draggedElementId = null;

    App.dragDrop = {
        init() {
            const mainContainer = document.getElementById('main-content');
            mainContainer.addEventListener('dragstart', this.handleDragStart);
            mainContainer.addEventListener('dragover', this.handleDragOver);
            mainContainer.addEventListener('dragleave', this.handleDragLeave);
            mainContainer.addEventListener('drop', this.handleDrop);
        },

        handleDragStart(e) {
            if (e.target.classList.contains('subject-card')) {
                if (e.target.classList.contains('locked')) {
                    e.preventDefault();
                    return;
                }
                draggedElementId = e.target.id;
                e.dataTransfer.setData('text/plain', draggedElementId);
                setTimeout(() => e.target.classList.add('dragging'), 0);
            }
        },

        handleDragOver(e) {
            e.preventDefault();
            const dropZone = e.target.closest('.semester-body, .pensum-container');
            if (dropZone) dropZone.classList.add('drag-over');
        },
        
        handleDragLeave(e) {
            const dropZone = e.target.closest('.semester-body, .pensum-container');
            if (dropZone) dropZone.classList.remove('drag-over');
        },

        handleDrop(e) {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const draggedElement = document.getElementById(draggedId);
            if (!draggedElement) return;

            draggedElement.classList.remove('dragging');
            const dropZone = e.target.closest('.semester-body, .pensum-container');
            if (dropZone) {
                dropZone.classList.remove('drag-over');
                const subjectId = draggedElement.dataset.subjectId;
                const sourceId = draggedElement.closest('.semester-column')?.id || 'bank';
                const targetId = dropZone.closest('.semester-column')?.id || 'bank';

                if (sourceId === targetId) return;

                if (targetId !== 'bank') {
                    const validation = App.validation.canMoveToSemester(subjectId, targetId);
                    if (!validation.isValid) {
                        App.ui.showNotification(validation.reason, 'error');
                        return;
                    }
                }
                
                this.moveSubjectInState(subjectId, sourceId, targetId);
                App.state.saveState();
                App.ui.renderFullUI();
            }
        },

        moveSubjectInState(subjectId, sourceId, targetId) {
            const { semesters } = App.state.getPlannerState();
            if (sourceId !== 'bank') {
                const sourceSemester = semesters.find(s => s.id === sourceId);
                if (sourceSemester) sourceSemester.subjects = sourceSemester.subjects.filter(id => id !== subjectId);
            }
            if (targetId !== 'bank') {
                const targetSemester = semesters.find(s => s.id === targetId);
                if (targetSemester && !targetSemester.subjects.includes(subjectId)) targetSemester.subjects.push(subjectId);
            }
        }
    };
})(window.App);
