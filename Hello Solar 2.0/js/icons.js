/*
 * Hello Solar — icon helper (vanilla JS, no library).
 * Swaps any <i data-lucide="name" class="..."></i> for an inline SVG, so markup that
 * JavaScript inserts later still gets its icons. Icon artwork: Lucide (ISC license).
 */
(function () {
    var ICONS = {
        "arrow-right": "<path d=\"M5 12h14\" /><path d=\"m12 5 7 7-7 7\" />",
        "check": "<path d=\"M20 6 9 17l-5-5\" />",
        "check-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m16 9-5.5 5.5L8 12\" />",
        "check-square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /><path d=\"m16 9-5.5 5.5L8 12\" />",
        "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /><path d=\"M12 11h4\" /><path d=\"M12 16h4\" /><path d=\"M8 11h.01\" /><path d=\"M8 16h.01\" />",
        "mail": "<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\" /><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />",
        "map-pin": "<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /><circle cx=\"12\" cy=\"10\" r=\"3\" />",
        "phone-call": "<path d=\"M13 2a9 9 0 0 1 9 9\" /><path d=\"M13 6a5 5 0 0 1 5 5\" /><path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\" />",
        "sparkles": "<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /><path d=\"M20 2v4\" /><path d=\"M22 4h-4\" /><circle cx=\"4\" cy=\"20\" r=\"2\" />",
        "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v2\" /><path d=\"M12 20v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"m17.66 17.66 1.41 1.41\" /><path d=\"M2 12h2\" /><path d=\"M20 12h2\" /><path d=\"m6.34 17.66-1.41 1.41\" /><path d=\"m19.07 4.93-1.41 1.41\" />",
        "x": "<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />"
    };
    var ALIASES = { 'check-circle': 'circle-check', 'check-square': 'square-check' };
    var SVG_NS = 'http://www.w3.org/2000/svg';

    function createIcons() {
        document.querySelectorAll('[data-lucide]').forEach(function (el) {
            var name = el.getAttribute('data-lucide');
            var body = ICONS[name] || ICONS[ALIASES[name]];
            if (!body) return;
            var svg = document.createElementNS(SVG_NS, 'svg');
            var attrs = { xmlns: SVG_NS, width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
                stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round',
                'stroke-linejoin': 'round', 'aria-hidden': 'true' };
            Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
            Array.prototype.forEach.call(el.attributes, function (a) {
                if (a.name !== 'data-lucide' && a.name !== 'class') svg.setAttribute(a.name, a.value);
            });
            svg.setAttribute('class', ('lucide lucide-' + name + ' ' + (el.getAttribute('class') || '')).trim());
            svg.innerHTML = body;
            el.parentNode.replaceChild(svg, el);
        });
    }

    // Same call signature the pages already use: lucide.createIcons()
    window.lucide = { createIcons: createIcons };
})();
