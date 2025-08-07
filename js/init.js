// js/init.js
// Este archivo DEBE cargarse al final de todos los demás módulos de App.
// Se encarga de arrancar la aplicación cuando el DOM está listo.

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado. Inicializando aplicación...');

    // Inicializar todos los módulos en el orden correcto
    App.firebase.init();
    App.state.init(window.PENSUM_DI);
    App.validation.init(App.state.getPensumData());
    App.organizer.init();
    App.ui.init();
    App.dragDrop.init();

    // Configurar el observador de autenticación, que controla el flujo principal
    App.firebase.onAuthStateChanged(user => {
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (user) {
            console.log('Usuario autenticado:', user.uid);
            loadingOverlay.classList.remove('hidden');
            
            App.state.setCurrentUser(user);
            App.ui.showAppUI();
            App.ui.updateUserInfo(user);

            // Escuchar cambios en el plan del usuario en tiempo real
            App.firebase.listenToUserPlan(user.uid, App.state.getCurrentCareerId());
        } else {
            console.log('No hay usuario autenticado.');
            App.state.setCurrentUser(null);
            App.ui.showLoginUI();
            // Detener la escucha de datos si el usuario cierra sesión
            if (App.state.getUnsubscribePlanner()) {
                App.state.getUnsubscribePlanner()();
            }
            loadingOverlay.classList.add('hidden');
        }
    });
});
