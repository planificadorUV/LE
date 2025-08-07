// js/state.js

const App = window.App |

| {};

App.state = (() => {
    let currentUser = null;
    let pensum =;
    let userPlan = {
        semesters: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}] // 10 semestres por defecto
    };

    function init() {
        // Cargar el pensum desde el archivo global
        if (window.PENSUM_DI && window.PENSUM_DI.materias) {
            pensum = window.PENSUM_DI.materias;
        } else {
            console.error("El pensum no se pudo cargar.");
        }
    }

    function setCurrentUser(user) {
        currentUser = user;
    }

    function getCurrentUser() {
        return currentUser;
    }

    function getPensum() {
        return pensum;
    }

    function getPlan() {
        return userPlan;
    }

    function setPlan(plan) {
        if (plan && plan.semesters) {
            userPlan = plan;
        } else {
            // Si no hay plan, se resetea al por defecto
            userPlan = { semesters: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}] };
        }
    }
    
    function addSemester() {
        userPlan.semesters.push({});
        // Guardar el plan después de añadir un semestre
        if (currentUser) {
            App.firebase.saveUserPlan(currentUser.uid, userPlan);
        }
    }

    function moveSubject(subjectId, fromSemester, toSemester) {
        // Mover del banco de materias (fromSemester = 'bank')
        if (fromSemester === 'bank') {
            if (!userPlan.semesters) {
                userPlan.semesters = {};
            }
            userPlan.semesters[subjectId] = true;
        } 
        // Mover al banco de materias (toSemester = 'bank')
        else if (toSemester === 'bank') {
            if (userPlan.semesters) {
                delete userPlan.semesters[subjectId];
            }
        } 
        // Mover entre semestres
        else {
            if (userPlan.semesters) {
                delete userPlan.semesters[subjectId];
            }
            if (!userPlan.semesters) {
                userPlan.semesters = {};
            }
            userPlan.semesters[subjectId] = true;
        }

        // Guardar el plan después de cada movimiento
        if (currentUser) {
            App.firebase.saveUserPlan(currentUser.uid, userPlan);
        }
    }

    return {
        init,
        setCurrentUser,
        getCurrentUser,
        getPensum,
        getPlan,
        setPlan,
        addSemester,
        moveSubject
    };
})();
