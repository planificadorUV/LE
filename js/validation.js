// js/validation.js

((App) => {
    let allSubjectsMap = new Map();

    App.validation = {
        init() {
            const subjects = App.state.getPensumData();

            // La barrera de seguridad ahora es más robusta.
            if (subjects && Array.isArray(subjects) && subjects.length > 0) {
                subjects.forEach(subject => allSubjectsMap.set(subject.id, subject));
            } else {
                console.warn("Advertencia de Validación: No se inicializó el mapa de materias porque el pensum está vacío o no es válido.");
            }
        },

        getSubjectStatus(subjectId) {
            const { completedSubjects } = App.state.getPlannerState();
            const subject = allSubjectsMap.get(subjectId);

            if (!subject?.prerequisites?.length) return 'available';

            const completedSet = new Set(completedSubjects);
            for (const prereqId of subject.prerequisites) {
                if (!completedSet.has(prereqId)) return 'locked';
            }
            return 'available';
        },

        canMoveToSemester(subjectId, targetSemesterId) {
            const { semesters, completedSubjects } = App.state.getPlannerState();
            const subject = allSubjectsMap.get(subjectId);

            if (!subject?.prerequisites?.length) return { isValid: true };

            const targetSemesterIndex = semesters.findIndex(s => s.id === targetSemesterId);
            if (targetSemesterIndex === -1) return { isValid: false, reason: "Semestre no válido." };
            
            const subjectsInPreviousSemesters = new Set(completedSubjects);
            for (let i = 0; i < targetSemesterIndex; i++) {
                semesters[i].subjects.forEach(id => subjectsInPreviousSemesters.add(id));
            }

            const missingPrereqs = subject.prerequisites.filter(prereqId => !subjectsInPreviousSemesters.has(prereqId));

            if (missingPrereqs.length > 0) {
                const missingNames = missingPrereqs.map(id => allSubjectsMap.get(id)?.name || id).join(', ');
                return { isValid: false, reason: `Faltan prerrequisitos: ${missingNames}` };
            }
            return { isValid: true };
        }
    };
})(window.App);
