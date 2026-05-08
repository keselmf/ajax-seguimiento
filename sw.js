var GHPATH = '/ajax-seguimiento';
var CACHE = 'ajax-v2';

var URLS = [
  GHPATH + '/',
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

  // Nunca cachear HTML ni Apps Script
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com')
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(function(){
          return caches.match(GHPATH + '/');
        })
    );
    return;
  }

  // Para iconos/manifest: red primero, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(function(response){
        var copy = response.clone();
        caches.open(CACHE).then(function(c){
          c.put(e.request, copy);
        });
        return response;
      })
      .catch(function(){
        return caches.match(e.request);
      })
  );
});
