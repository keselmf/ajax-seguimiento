var GHPATH = '/ajax-seguimiento';
var CACHE = 'ajax-v4';
var SHELL_URL = GHPATH + '/index.html';

var URLS = [
  GHPATH + '/',
  SHELL_URL,
  GHPATH + '/manifest.json',
  GHPATH + '/icon-192.png',
  GHPATH + '/icon-512.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(
        URLS.map(function(url) {
          return fetch(url, {
            cache: 'reload'
          }).then(function(response) {
            if (!response || !response.ok) {
              throw new Error('No se pudo cachear: ' + url);
            }

            return cache.put(url, response.clone());
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(key) {
              return key !== CACHE;
            })
            .map(function(key) {
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Apps Script: siempre red, nunca caché.
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com')
  ) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      })
    );

    return;
  }

  // Navegación de la PWA.
  if (
    request.mode === 'navigate' ||
    url.pathname === GHPATH ||
    url.pathname === GHPATH + '/' ||
    url.pathname === SHELL_URL
  ) {
    var cachePromise = caches.open(CACHE);

    // Se crea durante el evento para que waitUntil sea válido.
    var networkUpdate = cachePromise.then(function(cache) {
      return fetch(SHELL_URL, {
        cache: 'no-store'
      }).then(function(response) {
        if (response && response.ok) {
          return cache
            .put(SHELL_URL, response.clone())
            .then(function() {
              return response;
            });
        }

        return response;
      });
    });

    event.waitUntil(
      networkUpdate.catch(function() {})
    );

    event.respondWith(
      cachePromise
        .then(function(cache) {
          return cache.match(SHELL_URL);
        })
        .then(function(cachedResponse) {
          // Mostrar el HTML almacenado inmediatamente.
          if (cachedResponse) {
            return cachedResponse;
          }

          // Primera apertura: esperar la red.
          return networkUpdate.catch(function() {
            return new Response('Sin conexión', {
              status: 503,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            });
          });
        })
    );

    return;
  }

  // Manifest, iconos y otros recursos.
  event.respondWith(
    fetch(request)
      .then(function(response) {
        if (response && response.ok) {
          var copy = response.clone();

          event.waitUntil(
            caches.open(CACHE).then(function(cache) {
              return cache.put(request, copy);
            })
          );
        }

        return response;
      })
      .catch(function() {
        return caches.match(request);
      })
  );
});
