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

// Inline email-format validation on Step 1 — validate as the user types,
// 500ms debounce, with a "too early to judge" gate so we don't flash an
// error while they're mid-domain. Pairs with the existing server-side
// check (isValidEmail in lib/submit.ts) — the regex MUST stay in sync.
// Server still owns the final word; this is just snappier feedback so
// the user doesn't have to click Verify email to see the typo.
//
// Visible only in the "none" state (the typed input). Pending/verified
// states render the email as a hidden input, no validation needed.
//
// The "too early" gate: skip validation until the field has @ AND at
// least 4 chars after it (minimum plausible domain like x.co). Before
// that, hide any prior error — they're still composing.
export const EMAIL_VALIDATE_SCRIPT = `
(function() {
  // MIRROR of EMAIL_RE in src/lib/submit.ts — keep in sync.
  var EMAIL_RE = /^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,24}$/;
  var DEBOUNCE_MS = 300;
  var timer = null;

  function targets() {
    return {
      input: document.getElementById('submit-email'),
      err: document.getElementById('email-format-error'),
    };
  }
  function hide(err) {
    if (!err) return;
    err.setAttribute('hidden', '');
    err.hidden = true;
    err.style.display = 'none';
  }
  function show(err) {
    if (!err) return;
    // Triple-belt: remove [hidden] attribute, drop IDL property, force
    // display via inline !important so any CSS specificity fight loses.
    err.removeAttribute('hidden');
    err.hidden = false;
    err.setAttribute('style', 'display: flex !important');
  }
  // tooEarly — true while the value is still plausibly being composed (no @
  // yet, or fewer than 4 chars after the @). Gates the as-you-type check so
  // we don't flash "invalid" while the user is still typing. Bypassed on
  // blur: leaving the field means "this is my finished answer."
  function tooEarly(v) {
    var at = v.indexOf('@');
    return at < 1 || v.length - at < 4;
  }
  // force=true bypasses tooEarly — used on blur so a half-typed email like
  // "rahul" gets flagged once the user moves on.
  function check(force) {
    var t = targets();
    if (!t.input) return;
    var v = t.input.value.trim();
    if (!v) { hide(t.err); return; }
    if (!force && tooEarly(v)) { hide(t.err); return; }
    if (EMAIL_RE.test(v)) hide(t.err);
    else show(t.err);
  }
  function scheduleCheck() {
    clearTimeout(timer);
    timer = setTimeout(function() { check(false); }, DEBOUNCE_MS);
  }

  function attach() {
    document.addEventListener('input', function(e) {
      if (e.target && e.target.id === 'submit-email') scheduleCheck();
    });
    document.addEventListener('blur', function(e) {
      if (e.target && e.target.id === 'submit-email') check(true);
    }, true);
    // Initial pass — localStorage-restored values get validated immediately,
    // forced through tooEarly because the user isn't currently composing.
    check(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
`;

// Form persistence across refresh + tab-close: save the submit form's field
// values to localStorage as the user types, restore them on page load.
//
// Storage shape: `{v: 1, t: <epoch_ms>, d: {<name>: <value>, …}}` under key
// `rentlens_submit_v1`. Versioned so future schema changes can ignore stale
// payloads. TTL is 7 days; older entries are dropped on the next restore
// attempt so abandoned forms don't haunt the inbox forever.
//
// Saved: every named input across `form[data-submit-form]` EXCEPT:
//   - cf-turnstile-response (token expires; widget regenerates per page)
//   - code (the verification code on the inline pre-verify form — too
//     short-lived + too sensitive to persist)
//   - id (the pre-verification id in the inline form; cookie tracks the
//     authoritative session)
// Restored only into EMPTY fields — server-rendered values (Step 1 errors
// re-render, Step 3 helpContact pre-fill from step1.email) always win.
//
// Cleared when:
//   - The success page renders (detected via #submit-success-marker)
//   - The user clicks any [data-clear-saved-form] link (Start over buttons)
export const FORM_PERSIST_SCRIPT = `
(function() {
  var KEY = 'rentlens_submit_v1';
  var TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var SKIP_NAMES = {'cf-turnstile-response':1, 'code':1, 'id':1};
  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return null;
      if (typeof parsed.t === 'number' && (Date.now() - parsed.t) > TTL_MS) {
        localStorage.removeItem(KEY);
        return null;
      }
      return parsed.d || null;
    } catch (e) { return null; }
  }
  function writeStore(d) {
    try { localStorage.setItem(KEY, JSON.stringify({v: 1, t: Date.now(), d: d})); } catch (e) {}
  }
  function clearStore() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // Save: walk every form[data-submit-form] on the page, extract named
  // values (incl. hidden inputs like society_slug, mover_canonical),
  // shallow-merge into the existing store so restores stay sticky across
  // step transitions where some fields aren't visible.
  var saveTimer = null;
  function saveNow() {
    var forms = document.querySelectorAll('form[data-submit-form]');
    if (!forms.length) return;
    var d = readStore() || {};
    forms.forEach(function(form) {
      var els = form.elements;
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (!el.name || SKIP_NAMES[el.name]) continue;
        if (el.type === 'submit' || el.type === 'button') continue;
        if (el.type === 'checkbox') {
          d[el.name] = el.checked ? el.value || 'yes' : '';
        } else if (el.type === 'radio') {
          if (el.checked) d[el.name] = el.value;
        } else {
          d[el.name] = el.value;
        }
      }
    });
    writeStore(d);
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }

  // Restore: only overwrite EMPTY fields so server-rendered values always
  // win (422 re-renders, Step 3 pre-fill from step1.email, etc.).
  function restore() {
    var d = readStore();
    if (!d) return;
    document.querySelectorAll('form[data-submit-form]').forEach(function(form) {
      Object.keys(d).forEach(function(name) {
        var val = d[name];
        if (val == null) return;
        var els = form.querySelectorAll('[name="' + name + '"]');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.type === 'checkbox') {
            // Only set when not already in some state by server.
            if (!el.checked && val) el.checked = true;
          } else if (el.type === 'radio') {
            if (el.value === val && !el.checked) el.checked = true;
          } else {
            if (!el.value) el.value = val;
          }
        }
      });
    });
  }

  function attach() {
    if (document.getElementById('submit-success-marker')) {
      clearStore();
      return;
    }
    restore();
    document.addEventListener('input', scheduleSave);
    document.addEventListener('change', scheduleSave);
    document.addEventListener('click', function(e) {
      var t = e.target.closest ? e.target.closest('[data-clear-saved-form]') : null;
      if (t) clearStore();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
`;

// HTMX 4xx swap config: by default HTMX only swaps on 2xx responses and
// silently discards 4xx/5xx bodies (firing htmx:responseError instead).
// Several of our endpoints (POST /email/verify-now, POST /verify) return
// 422 / 429 / 410 / 423 with a meaningful error fragment in the body that
// SHOULD replace the targeted area. This global listener marks 4xx as
// swappable so users see those errors inline. 5xx still surfaces as an
// error event with no swap (those usually mean the server is broken;
// keeping the previous state intact is the safer default).
//
// Registered before htmx loads via DOMContentLoaded; safe to no-op when
// window.htmx is undefined (e.g. pages without the htmx script).
export const HTMX_4XX_SWAP_SCRIPT = `
(function() {
  function register() {
    if (!window.htmx) return false;
    document.body.addEventListener('htmx:beforeSwap', function(evt) {
      var s = evt.detail && evt.detail.xhr && evt.detail.xhr.status;
      if (s >= 400 && s < 500) {
        evt.detail.shouldSwap = true;
        evt.detail.isError = false;
      }
    });
    return true;
  }
  if (!register()) {
    document.addEventListener('DOMContentLoaded', register);
  }
})();
`;

// Step 1 soft-nudge: when the contributor clicks any submit button on the
// step-1 form with an email typed but verification not yet complete, pause
// the form submission and show the #email-nudge <dialog> modal. From there:
//   - "Verify first" closes the modal + clicks the inline "Verify email"
//     button (or scrolls to the code input if a pending form is already
//     present).
//   - "Continue without verifying" closes the modal, sets a bypass flag,
//     and re-clicks the original submit button — letting the form proceed
//     as if the nudge hadn't fired.
//   - ESC and click-on-backdrop dismiss the modal without bypass; the
//     user can click Continue again to re-trigger.
//
// State is read from #email-verify-state's data-state attribute (set by
// EmailVerifyBlock + HTMX swap responses). "verified" → no nudge. "pending"
// → no nudge (they're mid-verification; the linked-pre flow handles
// retroactive verify). "none" + non-empty email → nudge.
export const SUBMIT_NUDGE_SCRIPT = `
(function() {
  var bypass = false;
  function emailValue() {
    var v = '';
    var visible = document.getElementById('submit-email');
    if (visible && visible.value) v = visible.value;
    if (!v) {
      var hidden = document.querySelector('form[data-step1-form] input[type="hidden"][name="email"]');
      if (hidden) v = hidden.value;
    }
    return v.trim();
  }
  function state() {
    var el = document.getElementById('email-verify-state');
    return el ? (el.getAttribute('data-state') || 'none') : 'none';
  }
  function shouldNudge() {
    if (bypass) return false;
    return emailValue() !== '' && state() === 'none';
  }
  function nudgeEl() { return document.getElementById('email-nudge'); }

  // Capture-phase listener on submit clicks so we can preventDefault before
  // the form submission begins.
  document.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('[data-step1-submit]') : null;
    if (!btn) return;
    if (!shouldNudge()) return;
    e.preventDefault();
    e.stopPropagation();
    var n = nudgeEl();
    if (!n) return;
    n.dataset.pendingButton = btn.name || '__continue__';
    if (typeof n.showModal === 'function') {
      n.showModal();
    } else {
      // Fallback for browsers without <dialog> support (pre-Safari 15.4).
      n.setAttribute('open', '');
      n.style.display = 'block';
    }
  }, true);

  // Click-on-backdrop closes (default dialog behavior is no-close). We
  // detect this by comparing the click target to the dialog itself —
  // clicks inside the inner wrapper hit the wrapper, not the dialog.
  document.addEventListener('click', function(e) {
    var n = nudgeEl();
    if (n && e.target === n && typeof n.close === 'function') {
      n.close();
    }
  });

  // Nudge actions.
  document.addEventListener('click', function(e) {
    var verifyBtn = e.target.closest ? e.target.closest('[data-nudge-verify]') : null;
    if (verifyBtn) {
      e.preventDefault();
      var n = nudgeEl();
      if (n && typeof n.close === 'function') n.close();
      var inlineVerify = document.querySelector('#email-verify-status button[hx-post="/email/verify-now"]');
      if (inlineVerify) { inlineVerify.click(); return; }
      var codeInput = document.querySelector('#email-verify-status input[name="code"]');
      if (codeInput) { codeInput.focus(); codeInput.scrollIntoView({behavior: 'smooth', block: 'center'}); }
      return;
    }
    var continueBtn = e.target.closest ? e.target.closest('[data-nudge-continue]') : null;
    if (continueBtn) {
      e.preventDefault();
      var n = nudgeEl();
      if (!n) return;
      bypass = true;
      if (typeof n.close === 'function') n.close();
      var which = n.dataset.pendingButton || '__continue__';
      var selector = which === 'skip_step2'
        ? 'form[data-step1-form] button[name="skip_step2"]'
        : 'form[data-step1-form] button[type="submit"]:not([name="skip_step2"])';
      var target = document.querySelector(selector);
      if (target) target.click();
    }
  });
})();
`;
