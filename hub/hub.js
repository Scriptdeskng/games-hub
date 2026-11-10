// Naija Games hub: language toggle (English / Pidgin) and the hub-only service worker.
// Cards are rendered into index.html at build time (English); this script only swaps text.
(function () {
  'use strict';
  var KEY = 'naija-hub:lang';
  var root = document.documentElement;
  var dataEl = document.getElementById('hub-data');
  var data = dataEl ? JSON.parse(dataEl.textContent || '{}') : null;
  root.classList.remove('no-js');
  if (!data) return;

  var store = {
    get: function () {
      try {
        return window.localStorage.getItem(KEY);
      } catch {
        return null;
      }
    },
    set: function (v) {
      try {
        window.localStorage.setItem(KEY, v);
      } catch {
        /* private mode: the choice just lasts for this visit */
      }
    },
  };
  var ok = function (l) {
    return l === 'en' || l === 'pcm' ? l : null;
  };
  var chosen = ok(new URLSearchParams(window.location.search).get('lang')) || ok(store.get());
  var lang = chosen || 'en';

  function fill(s, vars) {
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k];
    });
  }
  function apply(l) {
    lang = l;
    var s = data.strings[l];
    root.lang = l;
    document.querySelectorAll('[data-t]').forEach(function (el) {
      el.textContent = s[el.getAttribute('data-t')];
    });
    document.querySelectorAll('.card').forEach(function (card) {
      var g = data.games[card.getAttribute('data-slug')];
      var title = g.title[l];
      card.querySelector('.name').textContent = title;
      card.querySelector('.desc').textContent = g.description[l];
      card.querySelector('.cat').textContent = s['hub.cat.' + g.category];
      var img = card.querySelector('.thumb');
      img.alt = fill(s['hub.thumbAlt'], { title: title });
      var play = card.querySelector('.play');
      play.setAttribute('aria-label', fill(s['hub.playAria'], { title: title }));
      // Only pass ?lang= once the visitor picked a language here, so a game keeps its own setting otherwise.
      play.href = './' + card.getAttribute('data-slug') + '/' + (chosen ? '?lang=' + l : '');
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l));
    });
  }
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      chosen = b.getAttribute('data-lang');
      store.set(chosen);
      apply(chosen);
    });
  });
  apply(lang);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* offline support is optional */
      });
    });
  }
})();
