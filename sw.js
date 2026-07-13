var GHPATH = '/ajax-seguimiento';
var CACHE = 'ajax-v3';
var URLS = [
  GHPATH + '/',
  GHPATH + '/index.html',
  GHPATH + '/manifest.json',
  GHPATH + '/icon-192.png',
  GHPATH + '/icon-512.png'
];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(URLS);
    })
  );
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys
          .filter(function(k){ return k !== CACHE; })
          .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);

  // Apps Script: siempre red, nunca cache
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com')
  ) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // HTML: stale-while-revalidate (cache instantaneo + actualiza en background)
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname === GHPATH + '/'
  ) {
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(e.request).then(function(cached){
          var fetchPromise = fetch(e.request, { cache: 'no-store' }).then(function(response){
            c.put(e.request, response.clone());
            return response;
          }).catch(function(){ return cached; });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Iconos/manifest: red primero, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(function(response){
        var copy = response.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return response;
      })
      .catch(function(){
        return caches.match(e.request);
      })
  );
});
