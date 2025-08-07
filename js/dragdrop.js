// js/dragDrop.js

const App = window.App |

| {};

App.dragDrop = (() => {
    let draggedElement = null;

    function initDragAndDrop() {
        const draggableCards = document.querySelectorAll('.subject-card');
        const dropZones = document.querySelectorAll('.drop-zone');

        draggableCards.forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });
    }

    function handleDragStart(e) {
        // Solo permitir arrastrar si no está bloqueada
        if (e.target.dataset.status === 'locked') {
            e.preventDefault();
            return;
        }
        draggedElement = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
        e.dataTransfer.setData('text/plain', e.target.dataset.subjectId);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        draggedElement = null;
        // Limpiar todos los highlights de las zonas de dropeo
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over-valid', 'drag-over-invalid');
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        const dropZone = e.currentTarget;
        const subjectId = draggedElement.dataset.subjectId;
        const targetSemesterIndex = dropZone.dataset.semesterIndex;

        // No se valida si se mueve al banco de materias
        if (dropZone.id === 'subject-bank') {
            dropZone.classList.add('drag-over-valid');
            return;
        }
        
        const validationResult = App.validation.validateMove(subjectId, parseInt(targetSemesterIndex), App.state.getPlan());

        if (validationResult.isValid) {
            dropZone.classList.add('drag-over-valid');
            dropZone.classList.remove('drag-over-invalid');
        } else {
            dropZone.classList.add('drag-over-invalid');
            dropZone.classList.remove('drag-over-valid');
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over-valid', 'drag-over-invalid');
    }

    function handleDrop(e) {
        e.preventDefault();
        const dropZone = e.currentTarget;
        dropZone.classList.remove('drag-over-valid', 'drag-over-invalid');

        const subjectId = e.dataTransfer.getData('text/plain');
        const fromSemester = draggedElement.closest('.semester-column') 
           ? draggedElement.closest('.semester-column').dataset.semesterIndex 
            : 'bank';
        
        const toSemester = dropZone.id === 'subject-bank'? 'bank' : dropZone.dataset.semesterIndex;

        // Si el destino es el mismo que el origen, no hacer nada
        if (fromSemester === toSemester) return;

        // Validar de nuevo antes de soltar
        if (toSemester!== 'bank') {
            const validationResult = App.validation.validateMove(subjectId, parseInt(toSemester), App.state.getPlan());
            if (!validationResult.isValid) {
                alert(`No se puede mover la materia. Razón: ${validationResult.details}`);
                return;
            }
        }

        // Actualizar el estado
        App.state.moveSubject(subjectId, fromSemester, toSemester);

        // Re-renderizar la UI para reflejar el cambio
        App.ui.renderFullUI();
    }

    return {
        initDragAndDrop
    };
})();
