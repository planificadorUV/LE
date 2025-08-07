// js/state.js

const App = window.App || {};

App.state = (() => {
    let currentUser = null;
    let currentCareerId = 'DI-188';
    let pensumData = [];
    let plannerState = {
        semesters: [],
        completedSubjects: []
    };
    let unsubscribePlanner = null; // Para la escucha en tiempo real
    let isSaving = false;
    let saveTimeout = null;

    function init(pensum) {
        pensumData = pensum;
    }

    // --- Getters ---
    const getCurrentUser = () => currentUser;
    const getCurrentCareerId = () => currentCareerId;
    const getPensumData = () => pensumData;
    const getPlannerState = () => plannerState;
    const getUnsubscribePlanner = () => unsubscribePlanner;

    // --- Setters ---
    const setCurrentUser = (user) => { currentUser = user; };
    const setPlannerState = (newState) => {
        if (newState) {
            plannerState = {
                semesters: newState.semesters || [],
                completedSubjects: newState.completedSubjects || []
            };
        } else {
            initializeDefaultPlan();
        }
    };
    const setUnsubscribePlanner = (unsub) => { unsubscribePlanner = unsub; };

    function initializeDefaultPlan() {
        plannerState = {
            semesters: Array.from({ length: 10 }, (_, i) => ({
                id: `sem-${i + 1}`,
                name: `Semestre ${i + 1}`,
                subjects: []
            })),
            completedSubjects: []
        };
        saveState();
    }
    
    function findSubjectById(id) {
        return pensumData.find(s => s.id === id);
    }

    function saveState() {
        if (!currentUser || isSaving) return;

        clearTimeout(saveTimeout);
        isSaving = true;

        saveTimeout = setTimeout(async () => {
            try {
                await App.firebase.saveUserPlan(currentUser.uid, currentCareerId, plannerState);
                console.log("Plan guardado.");
            } catch (error) {
                console.error("Error al guardar:", error);
                App.ui.showNotification("Error al guardar el progreso.", "error");
            } finally {
                isSaving = false;
            }
        }, 1500); // Debounce de 1.5s
    }

    return {
        init,
        getCurrentUser,
        getCurrentCareerId,
        getPensumData,
        getPlannerState,
        getUnsubscribePlanner,
        setCurrentUser,
        setPlannerState,
        setUnsubscribePlanner,
        initializeDefaultPlan,
        findSubjectById,
        saveState
    };
})();
