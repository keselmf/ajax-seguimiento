var GHPATH = '/ajax-seguimiento';
var CACHE = 'ajax-v1';
var URLS = [
  GHPATH + '/',
  GHPATH + '/index.html',
  GHPATH + '/manifest.json',
  GHPATH + '/icon-192.png',
  GHPATH + '/icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(URLS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  e.respondWith(fetch(e.request).catch(function(){ return caches.match(e.request); }));
});
