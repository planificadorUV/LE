// js/firebase.js

const App = window.App || {};

App.firebase = (() => {
    const firebaseConfig = {
        apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
        authDomain: "planificadoruv.firebaseapp.com",
        projectId: "planificadoruv",
        storageBucket: "planificadoruv.appspot.com",
        messagingSenderId: "289578190596",
        appId: "1:289578190596:web:d45140a8bd7aff44b13251"
    };

    let app, auth, db, googleProvider;

    function init() {
        try {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            googleProvider = new firebase.auth.GoogleAuthProvider();
            console.log("Firebase inicializado correctamente.");
        } catch (error) {
            console.error("Error inicializando Firebase:", error);
            App.ui.showNotification("Error crítico al conectar con el servidor.", "error");
        }
    }

    function onAuthStateChanged(callback) {
        auth.onAuthStateChanged(callback);
    }

    function signInWithGoogle() {
        auth.signInWithPopup(googleProvider).catch(error => {
            console.error("Error en el inicio de sesión con Google:", error);
            App.ui.showNotification(`Error de autenticación: ${error.message}`, 'error');
        });
    }

    function signOut() {
        auth.signOut().catch(error => {
            console.error("Error al cerrar sesión:", error);
        });
    }

    function saveUserPlan(userId, careerId, planState) {
        if (!userId) return Promise.reject("ID de usuario no válido.");
        const planDocRef = db.collection('users').doc(userId).collection('plans').doc(careerId);
        return planDocRef.set(planState, { merge: true });
    }

    function loadUserPlan(userId, careerId) {
        const planDocRef = db.collection('users').doc(userId).collection('plans').doc(careerId);
        
        // Detener cualquier escucha anterior
        if (App.state.getUnsubscribePlanner()) {
            App.state.getUnsubscribePlanner()();
        }

        // Crear una nueva escucha en tiempo real
        const unsubscribe = planDocRef.onSnapshot(doc => {
            if (doc.exists) {
                App.state.setPlannerState(doc.data());
            } else {
                App.state.initializeDefaultPlan();
            }
            App.ui.renderFullUI();
            document.getElementById('loading-overlay').classList.add('hidden');
        }, error => {
            console.error("Error al cargar el plan:", error);
            App.ui.showNotification("Error de conexión con la base de datos.", "error");
        });
        
        App.state.setUnsubscribePlanner(unsubscribe);
        // Devolvemos una promesa que se resuelve para la carga inicial
        return planDocRef.get().then(doc => doc.exists ? doc.data() : null);
    }

    return {
        init,
        onAuthStateChanged,
        signInWithGoogle,
        signOut,
        saveUserPlan,
        loadUserPlan
    };
})();
