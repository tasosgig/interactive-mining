var displayNotification = function(message, status, timeout) {
UIkit.notification({
    message: message,
    status: status,
    pos: 'top',
    timeout: timeout
});
}