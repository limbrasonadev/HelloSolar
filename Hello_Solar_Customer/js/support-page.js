// Customer-only page guard (shared session; see shared/hello-solar-shared.js)
if (!window.HSShared || !window.HSShared.session.isValid("customer")) {
    window.location.replace("login.html");
}
