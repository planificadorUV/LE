// js/main.js

// Objeto global para el namespace de la aplicación
const App = window.App || {};

/**
 * El evento DOMContentLoaded asegura que todo el HTML ha sido cargado
 * antes de ejecutar cualquier script.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado. Inicializando aplicación...');

    // Inicializar todos los módulos
    App.firebase.init();
    App.state.init(window.PENSUM_DI); // Pasar el pensum al estado
    App.ui.init();
    App.validation.init(App.state.getPensumData());
    App.dragDrop.init();

    // Configurar el observador de autenticación.
    // Este es el controlador principal del flujo de la aplicación.
    App.firebase.onAuthStateChanged(user => {
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (user) {
            // Usuario ha iniciado sesión
            console.log('Usuario autenticado:', user.uid);
            loadingOverlay.classList.remove('hidden');
            
            App.state.setCurrentUser(user);
            App.ui.showAppUI();
            App.ui.updateUserInfo(user);

            // Cargar los datos del plan del usuario
            App.firebase.loadUserPlan(user.uid, App.state.getCurrentCareerId())
                .then(planData => {
                    App.state.setPlannerState(planData);
                    App.ui.renderFullUI();
                    loadingOverlay.classList.add('hidden');
                });
        } else {
            // Usuario no ha iniciado sesión
            console.log('No hay usuario autenticado.');
            App.state.setCurrentUser(null);
            App.ui.showLoginUI();
            if (App.state.getUnsubscribePlanner()) {
                App.state.getUnsubscribePlanner()(); // Detener escucha de datos
            }
            loadingOverlay.classList.add('hidden');
        }
    });
});
