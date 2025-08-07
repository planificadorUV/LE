// js/validation.js

const App = window.App || {};

App.validation = (() => {
    let allSubjectsMap = new Map();

    function init(subjects) {
        subjects.forEach(subject => allSubjectsMap.set(subject.id, subject));
    }

    function getSubjectStatus(subjectId) {
        const { completedSubjects } = App.state.getPlannerState();
        const subject = allSubjectsMap.get(subjectId);

        if (!subject || !subject.prerequisites || subject.prerequisites.length === 0) {
            return 'available';
        }

        const completedSet = new Set(completedSubjects);
        for (const prereqId of subject.prerequisites) {
            if (!completedSet.has(prereqId)) {
                return 'locked'; // Si falta al menos un prerrequisito, está bloqueada.
            }
        }
        return 'available';
    }

    function canMoveToSemester(subjectId, targetSemesterId) {
        const { semesters, completedSubjects } = App.state.getPlannerState();
        const subject = allSubjectsMap.get(subjectId);

        if (!subject || !subject.prerequisites || subject.prerequisites.length === 0) {
            return { isValid: true };
        }

        const targetSemesterIndex = semesters.findIndex(s => s.id === targetSemesterId);
        if (targetSemesterIndex === -1) {
            return { isValid: false, reason: "Semestre de destino no válido." };
        }
        
        const subjectsInPreviousSemesters = new Set(completedSubjects);
        for (let i = 0; i < targetSemesterIndex; i++) {
            semesters[i].subjects.forEach(id => subjectsInPreviousSemesters.add(id));
        }

        const missingPrereqs = subject.prerequisites.filter(prereqId => !subjectsInPreviousSemesters.has(prereqId));

        if (missingPrereqs.length > 0) {
            const missingNames = missingPrereqs.map(id => allSubjectsMap.get(id)?.name || id).join(', ');
            return {
                isValid: false,
                reason: `Faltan prerrequisitos: ${missingNames}`
            };
        }

        return { isValid: true };
    }

    return {
        init,
        getSubjectStatus,
        canMoveToSemester
    };
})();
