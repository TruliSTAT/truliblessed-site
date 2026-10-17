/* Founding Families age screen (P-3): neutral birth month + birth year, no default, kid years included.
   COPPA: birth month/year are never submitted or stored. The selects have no name attribute and are disabled
   before the mailto opens. No cookies, localStorage or sessionStorage (block lasts for the page view).
   Under 18 (conservative: the birth month counts as not yet passed) -> neutral message, form removed. */
(function () {
  var d = new Date(), Y = d.getFullYear(), M = d.getMonth() + 1;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.querySelectorAll('form[data-founding]').forEach(function (f) {
    var ys = f.querySelector('select[data-birth-year]'), ms = f.querySelector('select[data-birth-month]');
    if (!ys || !ms) return;
    MONTHS.forEach(function (n, i) { var o = document.createElement('option'); o.value = i + 1; o.textContent = n; ms.appendChild(o); });
    for (var y = Y; y >= 1920; y--) { var o = document.createElement('option'); o.value = o.textContent = y; ys.appendChild(o); }
    f.addEventListener('submit', function (e) {
      var by = parseInt(ys.value, 10), bm = parseInt(ms.value, 10);
      if (!by || !bm) { e.preventDefault(); (by ? ms : ys).focus(); return; }
      var age = Y - by - (M <= bm ? 1 : 0);
      if (age < 18) {
        e.preventDefault();
        f.querySelectorAll('input,button,select').forEach(function (el) { if (el.tagName !== 'BUTTON') el.value = ''; el.disabled = true; });
        f.innerHTML = ''; f.hidden = true; f.style.display = 'none';
        var m = document.createElement('p'); m.className = 'founding-block'; m.setAttribute('role', 'status'); m.tabIndex = -1;
        m.textContent = 'Sorry, we can\u2019t take this sign-up.';
        f.parentNode.insertBefore(m, f.nextSibling); m.focus();
        return;
      }
      ys.disabled = true; ms.disabled = true;   // a disabled control is never submitted
    });
  });
})();
