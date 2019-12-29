$(function(){
    if ('serviceWorker' in navigator) {
        console.log("serviceWorker.register: " + window.location.pathname);
        navigator.serviceWorker.register(window.location.pathname + 'sw.js')
        .then(
        function (registration) {
                if (typeof registration.update == 'function') {
                        registration.update();
                }
        })
        .catch(function (error) {
            console.log("Error Log: " + error);
        });
    }
});