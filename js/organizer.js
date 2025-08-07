// js/organizer.js

const App = window.App || {};

App.organizer = (() => {

    /**
     * Parsea el texto del historial de SIRA para extraer los códigos de las materias aprobadas.
     * @param {string} siraText - El texto copiado del historial de SIRA.
     * @returns {string[]} - Un array de códigos de materias aprobadas.
     */
    function parseSiraHistory(siraText) {
        const pensumData = App.state.getPensumData();
        const subjectCodes = new Set(pensumData.map(s => s.id));
        const approvedCodes = new Set();
        
        // Expresión regular para encontrar códigos de materia (ej: 750011C, 506026C)
        const codeRegex = /[0-9]{6,7}[A-Z]/g;
        const matches = siraText.match(codeRegex);

        if (matches) {
            matches.forEach(code => {
                if (subjectCodes.has(code)) {
                    approvedCodes.add(code);
                }
            });
        }
        
        return Array.from(approvedCodes);
    }

    /**
     * Organiza automáticamente las materias no planificadas en los semestres.
     * Utiliza el motor de validación para colocar las materias disponibles
     * en los primeros semestres posibles.
     */
    function autoOrganizePlan() {
        const { semesters, completedSubjects } = App.state.getPlannerState();
        const pensumData = App.state.getPensumData();
        
        // 1. Obtener todas las materias que no están ni completadas ni en el plan
        const subjectsInPlan = new Set(semesters.flatMap(sem => sem.subjects));
        const completedSet = new Set(completedSubjects);
        const subjectsToOrganize = pensumData.filter(
            s => !subjectsInPlan.has(s.id) && !completedSet.has(s.id)
        );

        // 2. Iterar sobre las materias a organizar y colocarlas
        subjectsToOrganize.forEach(subject => {
            for (let i = 0; i < semesters.length; i++) {
                const semesterId = semesters[i].id;
                // Usar el motor de validación para ver si se puede colocar aquí
                const validation = App.validation.canMoveToSemester(subject.id, semesterId);
                if (validation.isValid) {
                    semesters[i].subjects.push(subject.id);
                    break; // Salir del bucle de semestres y pasar a la siguiente materia
                }
            }
        });
        
        App.state.saveState();
        App.ui.renderFullUI();
        App.ui.showNotification("Plan organizado automáticamente.", "success");
    }

    return {
        parseSiraHistory,
        autoOrganizePlan
    };
})();
