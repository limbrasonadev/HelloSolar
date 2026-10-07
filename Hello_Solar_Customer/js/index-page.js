// Automatic routing based on the customer session
if (window.HSShared && window.HSShared.session.isValid("customer")) {
    window.location.replace("mysystem.html");
} else {
    window.location.replace("login.html");
}
