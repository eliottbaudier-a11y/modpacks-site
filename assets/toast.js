/* =========================================================================
   toast.js — petites notifications discrètes, temporaires, auto-disparaissantes.
   window.toast(message, type) — type: 'ok' (défaut) ou 'warn'.
   ========================================================================= */
window.toast = (function () {
  var stack = null;
  function ensureStack() {
    if (stack && stack.isConnected) return stack;
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
    return stack;
  }
  return function toast(message, type) {
    if (!message) return;
    var s = ensureStack();
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'warn' ? ' warn' : '');
    el.textContent = message;
    s.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    var dur = type === 'warn' ? 4200 : 2800;
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 260);
    }, dur);
  };
})();
