// js/firebase.js

// Añade funcionalidades al objeto App global, no lo redeclara.
((App) => {
    const firebaseConfig = {
        apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
        authDomain: "planificadoruv.firebaseapp.com",
        projectId: "planificadoruv",
        storageBucket: "planificadoruv.appspot.com",
        messagingSenderId: "289578190596",
        appId: "1:289578190596:web:d45140a8bd7aff44b13251"
    };

    let app, auth, db, googleProvider;

    App.firebase = {
        init() {
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
        },

        onAuthStateChanged(callback) {
            auth.onAuthStateChanged(callback);
        },

        signInWithGoogle() {
            auth.signInWithPopup(googleProvider).catch(error => {
                console.error("Error en el inicio de sesión con Google:", error);
                App.ui.showNotification(`Error de autenticación: ${error.message}`, 'error');
            });
        },

        signOut() {
            auth.signOut().catch(error => {
                console.error("Error al cerrar sesión:", error);
            });
        },

        saveUserPlan(userId, careerId, planState) {
            if (!userId) return Promise.reject("ID de usuario no válido.");
            const planDocRef = db.collection('users').doc(userId).collection('plans').doc(careerId);
            return planDocRef.set(planState, { merge: true });
        },

        listenToUserPlan(userId, careerId) {
            const planDocRef = db.collection('users').doc(userId).collection('plans').doc(careerId);
            
            if (App.state.getUnsubscribePlanner()) {
                App.state.getUnsubscribePlanner()();
            }

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
        }
    };
})(window.App);
