// js/firebase.js

const App = window.App |

| {};

App.firebase = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyDnGsR3zwxDS22OFBoyR0FPntSRnDTXkno",
    authDomain: "planificadoruv.firebaseapp.com",
    projectId: "planificadoruv",
    storageBucket: "planificadoruv.appspot.com",
    messagingSenderId: "289578190596",
    appId: "1:289578190596:web:d45140a8bd7aff44b13251"
    };

    let app;
    let auth;
    let database;

    function init() {
        // Inicializar Firebase si aún no se ha hecho
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        auth = firebase.auth();
        database = firebase.database();
    }

    function onAuthStateChanged(callback) {
        auth.onAuthStateChanged(callback);
    }

    function signIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Error durante el inicio de sesión con Google:", error);
            alert("Hubo un problema al iniciar sesión. Por favor, inténtelo de nuevo.");
        });
    }

    function signOut() {
        auth.signOut().catch(error => {
            console.error("Error al cerrar sesión:", error);
        });
    }

    function saveUserPlan(userId, plan) {
        if (!userId) {
            console.error("No se puede guardar el plan: ID de usuario no válido.");
            return Promise.reject("ID de usuario no válido.");
        }
        // Guarda el plan del usuario en la ruta /users/{userId}/plan
        return database.ref(`users/${userId}/plan`).set(plan);
    }

    function loadUserPlan(userId) {
        if (!userId) {
            console.error("No se puede cargar el plan: ID de usuario no válido.");
            return Promise.resolve(null);
        }
        // Carga el plan del usuario desde la ruta /users/{userId}/plan
        return database.ref(`users/${userId}/plan`).get()
           .then(snapshot => snapshot.exists()? snapshot.val() : null)
           .catch(error => {
                console.error("Error al cargar el plan del usuario:", error);
                return null;
            });
    }

    return {
        init,
        onAuthStateChanged,
        signIn,
        signOut,
        saveUserPlan,
        loadUserPlan
    };
})();
