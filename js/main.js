// js/main.js

// Declara el objeto App UNA SOLA VEZ en el script principal.
const App = window.App || {};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado. Inicializando aplicación...');

    // Inicializar todos los módulos
    App.firebase.init();
    App.state.init(window.PENSUM_DI);
    App.ui.init();
    App.validation.init(App.state.getPensumData());
    App.organizer.init();
    App.dragDrop.init();

    // Configurar el observador de autenticación
    App.firebase.onAuthStateChanged(user => {
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (user) {
            console.log('Usuario autenticado:', user.uid);
            loadingOverlay.classList.remove('hidden');
            
            App.state.setCurrentUser(user);
            App.ui.showAppUI();
            App.ui.updateUserInfo(user);

            // Cargar los datos del plan del usuario
            App.firebase.listenToUserPlan(user.uid, App.state.getCurrentCareerId());
        } else {
            console.log('No hay usuario autenticado.');
            App.state.setCurrentUser(null);
            App.ui.showLoginUI();
            if (App.state.getUnsubscribePlanner()) {
                App.state.getUnsubscribePlanner()();
            }
            loadingOverlay.classList.add('hidden');
        }
    });
});
