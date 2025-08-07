// js/dragDrop.js

const App = window.App || {};

App.dragDrop = (() => {
    let draggedElementId = null;

    function init() {
        // Los listeners se añadirán dinámicamente a los elementos cuando se rendericen,
        // pero podemos configurar listeners en los contenedores estáticos.
        const mainContainer = document.getElementById('main-content');
        mainContainer.addEventListener('dragstart', handleDragStart);
        
        const semesterGrid = document.getElementById('semester-grid');
        semesterGrid.addEventListener('dragover', handleDragOver);
        semesterGrid.addEventListener('dragleave', handleDragLeave);
        semesterGrid.addEventListener('drop', handleDrop);

        const pensumContainer = document.getElementById('pensum-container');
        pensumContainer.addEventListener('dragover', handleDragOver);
        pensumContainer.addEventListener('dragleave', handleDragLeave);
        pensumContainer.addEventListener('drop', handleDrop);
    }

    function handleDragStart(e) {
        if (e.target.classList.contains('subject-card')) {
            // No permitir arrastrar materias bloqueadas
            if (e.target.classList.contains('locked')) {
                e.preventDefault();
                return;
            }
            draggedElementId = e.target.id;
            e.dataTransfer.setData('text/plain', draggedElementId);
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        const dropZone = e.target.closest('.semester-body, .pensum-container');
        if (!dropZone) return;

        const subjectId = document.getElementById(draggedElementId)?.dataset.subjectId;
        if (!subjectId) return;
        
        // Si se mueve al banco, siempre es válido
        if (dropZone.id === 'pensum-container') {
            dropZone.classList.add('drag-over-valid');
            return;
        }

        const targetSemesterId = dropZone.closest('.semester-column')?.id;
        if (targetSemesterId) {
            const validation = App.validation.canMoveToSemester(subjectId, targetSemesterId);
            if (validation.isValid) {
                dropZone.classList.add('drag-over-valid');
                dropZone.classList.remove('drag-over-invalid');
            } else {
                dropZone.classList.add('drag-over-invalid');
                dropZone.classList.remove('drag-over-valid');
            }
        }
    }
    
    function handleDragLeave(e) {
        const dropZone = e.target.closest('.semester-body, .pensum-container');
        if (dropZone) {
            dropZone.classList.remove('drag-over-valid', 'drag-over-invalid');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedElement = document.getElementById(draggedId);
        if (!draggedElement) return;

        draggedElement.classList.remove('dragging');
        const dropZone = e.target.closest('.semester-body, .pensum-container');
        if (!dropZone) return;
        
        dropZone.classList.remove('drag-over-valid', 'drag-over-invalid');

        const subjectId = draggedElement.dataset.subjectId;
        const sourceId = draggedElement.closest('.semester-column')?.id || 'bank';
        const targetId = dropZone.closest('.semester-column')?.id || 'bank';

        if (sourceId === targetId) return;

        // Validar de nuevo antes de soltar
        if (targetId !== 'bank') {
            const validation = App.validation.canMoveToSemester(subjectId, targetId);
            if (!validation.isValid) {
                App.ui.showNotification(validation.reason, 'error');
                return;
            }
        }
        
        moveSubjectInState(subjectId, sourceId, targetId);
        App.state.saveState();
        App.ui.renderFullUI();
    }

    function moveSubjectInState(subjectId, sourceId, targetId) {
        const { semesters } = App.state.getPlannerState();

        // Quitar de la fuente
        if (sourceId !== 'bank') {
            const sourceSemester = semesters.find(s => s.id === sourceId);
            if (sourceSemester) {
                sourceSemester.subjects = sourceSemester.subjects.filter(id => id !== subjectId);
            }
        }

        // Añadir al destino
        if (targetId !== 'bank') {
            const targetSemester = semesters.find(s => s.id === targetId);
            if (targetSemester && !targetSemester.subjects.includes(subjectId)) {
                targetSemester.subjects.push(subjectId);
            }
        }
    }

    return { init };
})();
