// Global client scripts, ported verbatim from the Go repo's base.templ.
// Framework-agnostic plain JS (no build step) — injected once per page via
// the Layout. Each is a no-op on pages without its target markup, so loading
// them globally is safe. See base.templ for the original prose docs.

// Toggles filter-pill active state within a [data-filter] row, gathers active
// values across all rows, and fires an HTMX GET /featured into #featured-cards.
export const PILL_FILTER_SCRIPT = `
window.rentlensPillClick = function(pill) {
  var row = pill.closest('[data-filter]');
  if (!row) return;
  row.querySelectorAll('button.pill').forEach(function(b) {
    b.classList.remove('is-active', 'bg-ink', 'text-parchment');
    b.classList.add('text-ink-mute');
  });
  pill.classList.add('is-active', 'bg-ink', 'text-parchment');
  pill.classList.remove('text-ink-mute');
  var params = new URLSearchParams();
  document.querySelectorAll('[data-filter]').forEach(function(r) {
    var key = r.dataset.filter;
    var active = r.querySelector('button.pill.is-active');
    if (active && active.dataset.value && active.dataset.value !== '*') {
      params.set(key, active.dataset.value);
    }
  });
  if (window.htmx) {
    window.htmx.ajax('GET', '/featured?' + params.toString(), {target: '#featured-cards', swap: 'innerHTML'});
  }
};
`;

// Autocomplete-dropdown behaviour for any [data-pick] picker: click to pick,
// outside-click to close, arrow-key navigation, Escape to close + refocus.
export const PICKER_SCRIPT = `
(function() {
  function setVal(id, val) {
    if (!id) return;
    var el = document.getElementById(id);
    if (el) el.value = val == null ? '' : val;
  }
  function clearResults(el) {
    if (el) el.innerHTML = '';
  }
  function rowsOf(results) {
    return results ? Array.prototype.slice.call(results.querySelectorAll('[data-pick]')) : [];
  }
  document.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('[data-pick]') : null;
    if (btn) {
      e.preventDefault();
      setVal(btn.dataset.targetName, btn.dataset.name || '');
      setVal(btn.dataset.targetSlug, btn.dataset.slug || '');
      setVal(btn.dataset.targetCanonical, btn.dataset.canonical || '');
      // Locality auto-fill: only when the picked row has a non-empty locality
      // (seed-era rows with locality='' don't clobber user-typed area; and
      // the AddNewAffordance "Add new society" row carries no data-locality
      // so this is a no-op there).
      if (btn.dataset.targetLocality && btn.dataset.locality) {
        setVal(btn.dataset.targetLocality, btn.dataset.locality);
      }
      if (btn.dataset.targetResults) {
        clearResults(document.getElementById(btn.dataset.targetResults));
      }
      if (btn.dataset.targetName) {
        var nameEl = document.getElementById(btn.dataset.targetName);
        if (nameEl) {
          nameEl.focus();
          var swallow = function(ev) {
            document.removeEventListener('keyup', swallow, true);
            ev.stopPropagation();
          };
          document.addEventListener('keyup', swallow, true);
          setTimeout(function() {
            document.removeEventListener('keyup', swallow, true);
          }, 200);
        }
      }
      return;
    }
    var results = document.querySelectorAll('[data-picker-input]');
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (!r.innerHTML.trim()) continue;
      if (r.contains(e.target)) continue;
      var input = document.getElementById(r.dataset.pickerInput);
      if (input && input === e.target) continue;
      clearResults(r);
    }
  });
  document.addEventListener('keydown', function(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' && t.id) {
      var results = document.querySelector('[data-picker-input="' + t.id + '"]');
      if (!results) return;
      if (e.key === 'ArrowDown') {
        var first = results.querySelector('[data-pick]');
        if (first) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'Escape') {
        clearResults(results);
      }
      return;
    }
    var row = t.closest ? t.closest('[data-pick]') : null;
    if (!row) return;
    var resultsEl = row.dataset.targetResults
      ? document.getElementById(row.dataset.targetResults)
      : row.closest('[data-picker-input]');
    var rows = rowsOf(resultsEl);
    var idx = rows.indexOf(row);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx > -1 && idx < rows.length - 1) rows[idx + 1].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        rows[idx - 1].focus();
      } else {
        var inp = document.getElementById(row.dataset.targetName);
        if (inp) inp.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearResults(resultsEl);
      var inpEl = document.getElementById(row.dataset.targetName);
      if (inpEl) inpEl.focus();
    }
  });
})();
`;

// Reveals a [data-show-when="<targetId>=<value>"] wrapper only when the named
// control holds the given value (submit form's locality "Other" reveal).
export const CONDITIONAL_REVEAL_SCRIPT = `
(function() {
  var targets = document.querySelectorAll('[data-show-when]');
  if (!targets.length) return;
  targets.forEach(function(wrap) {
    var spec = wrap.getAttribute('data-show-when');
    var eq = spec.indexOf('=');
    if (eq < 0) return;
    var sourceId = spec.slice(0, eq);
    var matchValue = spec.slice(eq + 1);
    var source = document.getElementById(sourceId);
    if (!source) return;
    var update = function() {
      if (source.value === matchValue) {
        wrap.classList.remove('hidden');
      } else {
        wrap.classList.add('hidden');
      }
    };
    source.addEventListener('change', update);
    source.addEventListener('input', update);
    update();
  });
})();
`;

// Hides server-rendered field errors (.text-danger) once the user begins
// correcting the nearby input.
export const FORM_ERROR_CLEAR_SCRIPT = `
(function() {
  function clearNearbyError(target) {
    if (!target || ['INPUT','TEXTAREA','SELECT'].indexOf(target.tagName) === -1) return;
    var el = target.parentElement;
    var hops = 0;
    while (el && el.tagName !== 'FORM' && el.tagName !== 'BODY' && hops < 6) {
      var errs = el.querySelectorAll(':scope > .text-danger');
      if (errs.length > 0) {
        errs.forEach(function(e) { e.style.display = 'none'; });
        return;
      }
      el = el.parentElement;
      hops++;
    }
  }
  document.addEventListener('input',  function(e) { clearNearbyError(e.target); });
  document.addEventListener('change', function(e) { clearNearbyError(e.target); });
})();
`;
