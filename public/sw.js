const CACHE='bibu-trip-v1';
const CORE=[
  '/',
  '/index.html',
  '/styles.css',
  '/data.js',
  '/app.js',
  '/firebase-config.js',
  '/cloud-sync.js',
  '/manifest.webmanifest',
  '/assets/bibu-icon.svg',
  '/assets/bibu-poster.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok&&new URL(event.request.url).origin===self.location.origin){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/index.html')))
  );
});
