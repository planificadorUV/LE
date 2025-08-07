// js/validation.js

const App = window.App |

| {};

App.validation = (() => {
    let adjacencyList = new Map();
    let inDegrees = new Map();
    let allSubjects = new Map();

    function init(subjects) {
        // Construir el mapa de todas las materias para fácil acceso
        subjects.forEach(subject => allSubjects.set(subject.id, subject));

        // Inicializar la lista de adyacencia y los grados de entrada
        adjacencyList.clear();
        inDegrees.clear();
        allSubjects.forEach(subject => {
            adjacencyList.set(subject.id,);
            inDegrees.set(subject.id, 0);
        });

        // Construir el grafo de dependencias (prerrequisitos)
        // Un prerrequisito significa que A debe tomarse antes que B.
        // Esto se traduce en un arco dirigido B -> A.
        allSubjects.forEach(subject => {
            if (subject.prerrequisitos) {
                subject.prerrequisitos.forEach(prereqId => {
                    if (adjacencyList.has(prereqId)) {
                        adjacencyList.get(prereqId).push(subject.id);
                        inDegrees.set(subject.id, (inDegrees.get(subject.id) |

| 0) + 1);
                    }
                });
            }
        });
    }

    /**
     * Valida si una materia puede ser movida a un semestre específico.
     * @param {string} subjectId - El ID de la materia a validar.
     * @param {number} targetSemesterIndex - El índice del semestre de destino.
     * @param {object} currentPlan - El plan de carrera actual del usuario.
     * @returns {object} - Un objeto con el resultado de la validación.
     */
    function validateMove(subjectId, targetSemesterIndex, currentPlan) {
        const subject = allSubjects.get(subjectId);
        if (!subject) {
            return { isValid: false, reason: 'Materia no encontrada.' };
        }

        const prerequisites = subject.prerrequisitos ||;
        if (prerequisites.length === 0) {
            return { isValid: true, reason: 'Sin prerrequisitos.' };
        }

        // Crear un conjunto de todas las materias aprobadas en semestres anteriores.
        const approvedSubjects = new Set();
        for (let i = 0; i < targetSemesterIndex; i++) {
            const semester = currentPlan.semesters[i];
            if (semester) {
                Object.keys(semester).forEach(id => approvedSubjects.add(id));
            }
        }

        // Verificar si todos los prerrequisitos están en el conjunto de materias aprobadas.
        const missingPrerequisites =;
        for (const prereqId of prerequisites) {
            if (!approvedSubjects.has(prereqId)) {
                missingPrerequisites.push(prereqId);
            }
        }

        if (missingPrerequisites.length > 0) {
            const missingNames = missingPrerequisites.map(id => allSubjects.get(id)?.nombre |

| id).join(', ');
            return {
                isValid: false,
                reason: 'PREREQUISITE_MISSING',
                details: `Faltan los siguientes prerrequisitos: ${missingNames}`
            };
        }

        // Aquí se podrían añadir validaciones de correquisitos si fuera necesario.

        return { isValid: true, reason: 'Todos los prerrequisitos cumplidos.' };
    }
    
    /**
     * Determina el estado de una materia (disponible o bloqueada) basado en el plan actual.
     * @param {string} subjectId - El ID de la materia.
     * @param {object} currentPlan - El plan de carrera actual del usuario.
     * @returns {string} - 'available' o 'locked'.
     */
    function getSubjectStatus(subjectId, currentPlan) {
        const subject = allSubjects.get(subjectId);
        if (!subject ||!subject.prerrequisitos |

| subject.prerrequisitos.length === 0) {
            return 'available';
        }

        // Simula la validación para el "peor caso" (semestre 0) para ver si está desbloqueada por defecto.
        const validationResult = validateMove(subjectId, 0, currentPlan);
        
        // Si es válida en el semestre 0, significa que no tiene prerrequisitos o ya están cumplidos (caso base).
        // Si no, se comprueba contra todos los semestres posibles.
        const approvedSubjects = new Set();
        currentPlan.semesters.forEach(semester => {
            if (semester) {
                Object.keys(semester).forEach(id => approvedSubjects.add(id));
            }
        });

        for (const prereqId of subject.prerrequisitos) {
            if (!approvedSubjects.has(prereqId)) {
                return 'locked'; // Si falta al menos un prerrequisito, está bloqueada.
            }
        }

        return 'available';
    }


    return {
        init,
        validateMove,
        getSubjectStatus
    };
})();
