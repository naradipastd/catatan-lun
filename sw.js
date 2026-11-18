try{importScripts('config.js')}catch(e){}
const CACHE='lun-v1';
const FILES=['./','index.html','manifest.json','config.js','icon-180.png','icon-192.png','icon-512.png'];
const W=((self.LUN_CONFIG||{}).worker||'').replace(/\/$/,'');

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});

// Offline: ambil dari jaringan dulu, kalau gagal pakai cache
self.addEventListener('fetch',e=>{const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res})
    .catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))});

async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

// Push tanpa payload: ambil isi notifikasi dari Worker
self.addEventListener('push',e=>{e.waitUntil((async()=>{
  let title='Catatan Lun',body='Ada kegiatan yang perlu dilakukan sekarang.';
  try{const sub=await self.registration.pushManager.getSubscription();
    if(sub&&W){const r=await fetch(W+'/pending?h='+await sha(sub.endpoint));
      if(r.ok){const d=await r.json();title=d.title||title;body=d.body||body}}}catch(_){}
  await self.registration.showNotification(title,{body,icon:'icon-180.png',badge:'icon-180.png',tag:'lun-due',renotify:true,requireInteraction:true,vibrate:[300,100,300,100,500]});
})())});

self.addEventListener('notificationclick',e=>{e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
    for(const c of l){if('focus' in c)return c.focus()}
    return self.clients.openWindow('./')}))});
