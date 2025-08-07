// js/state.js

((App) => {
    let currentUser = null;
    let currentCareerId = 'DI-188';
    let pensumData = [];
    let plannerState = { semesters: [], completedSubjects: [] };
    let unsubscribePlanner = null;
    let saveTimeout = null;
    let isReady = false; // Nueva bandera para saber si el estado está listo.

    App.state = {
        // init ahora es responsable de obtener sus propios datos.
        init() {
            // VERIFICACIÓN CRÍTICA: Obtener los datos del pensum desde el scope global.
            if (typeof window.PENSUM_DI !== 'undefined' && Array.isArray(window.PENSUM_DI)) {
                pensumData = window.PENSUM_DI;
                isReady = true; // El estado está listo para ser usado.
                console.log(`State inicializado con ${pensumData.length} materias.`);
            } else {
                // Esto es un error fatal para la aplicación.
                console.error("FATAL STATE ERROR: window.PENSUM_DI no es un array válido. La aplicación no puede funcionar.");
                isReady = false;
                // La notificación de error se manejará en init.js
            }
        },

        isReady: () => isReady, // Función para que otros módulos pregunten si pueden continuar.

        getCurrentUser: () => currentUser,
        getCurrentCareerId: () => currentCareerId,
        getPensumData: () => pensumData,
        getPlannerState: () => plannerState,
        getUnsubscribePlanner: () => unsubscribePlanner,

        setCurrentUser: (user) => { currentUser = user; },
        setPlannerState: (newState) => {
            plannerState = {
                semesters: newState?.semesters || [],
                completedSubjects: newState?.completedSubjects || []
            };
        },
        setUnsubscribePlanner: (unsub) => { unsubscribePlanner = unsub; },
        
        setCompletedSubjects(subjectCodes) {
            const newCompleted = new Set(plannerState.completedSubjects);
            subjectCodes.forEach(code => newCompleted.add(code));
            plannerState.completedSubjects = Array.from(newCompleted);
            this.saveState();
        },

        initializeDefaultPlan() {
            this.setPlannerState(null);
            this.saveState();
        },
        
        findSubjectById: (id) => pensumData.find(s => s.id === id),

        saveState() {
            if (!currentUser || !isReady) return;
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    await App.firebase.saveUserPlan(currentUser.uid, currentCareerId, plannerState);
                    console.log("Plan guardado.");
                } catch (error) {
                    console.error("Error al guardar:", error);
                    App.ui.showNotification("Error al guardar el progreso.", "error");
                }
            }, 1500);
        }
    };
})(window.App);
