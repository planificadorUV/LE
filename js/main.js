// js/main.js

// Objeto global para el namespace de la aplicación
const App = window.App |

| {};

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar los módulos principales
    App.firebase.init();
    App.state.init();
    App.ui.init();

    // Configurar el observador del estado de autenticación.
    // Este es el controlador principal del flujo de la aplicación.
    App.firebase.onAuthStateChanged(user => {
        if (user) {
            // Usuario ha iniciado sesión
            App.state.setCurrentUser(user);
            App.ui.updateAuthUI(user);
            App.ui.showApp();

            // Cargar el plan del usuario desde Firebase
            App.firebase.loadUserPlan(user.uid).then(plan => {
                // Establecer el plan cargado o uno por defecto si no existe
                App.state.setPlan(plan);
                
                // Inicializar el motor de validación con el pensum
                App.validation.init(App.state.getPensum());
                
                // Renderizar toda la interfaz de usuario con los datos cargados
                App.ui.renderFullUI();
            });
        } else {
            // Usuario no ha iniciado sesión o ha cerrado sesión
            App.state.setCurrentUser(null);
            App.ui.updateAuthUI(null);
            App.ui.showLogin();
        }
    });

    // Configurar listener para el botón de login principal
    const loginButton = document.getElementById('login-button');
    loginButton.addEventListener('click', App.firebase.signIn);
});
