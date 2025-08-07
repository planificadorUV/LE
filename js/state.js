// js/state.js

((App) => {
    let currentUser = null;
    let currentCareerId = 'DI-188';
    let pensumData = [];
    let plannerState = { semesters: [], completedSubjects: [] };
    let unsubscribePlanner = null;
    let saveTimeout = null;

    App.state = {
        init(pensum) {
            pensumData = pensum;
        },

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
            if (!currentUser) return;
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
