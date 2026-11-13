/* SƆBUNU - service worker
   Réseau d'abord : les mises à jour du site arrivent tout de suite ; le cache ne sert que sans connexion.
   Les données (Firebase) ne passent JAMAIS par ici : elles restent toujours en direct.
   Quand vous modifiez le site, changez simplement le numéro de VERSION ci-dessous. */
const VERSION = 'sobunu-v5';
const FICHIERS = [
  'index.html', 'accueil.html', 'a-propos.html', 'contact.html', 'connexion.html', 'inscription.html', 'profil.html',
  'transporteur.html', 'acheteur.html', 'moderateur.html', 'admin.html',
  'app.js', 'manifest.json', 'logo.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'
];
/* Seuls ces sites externes sont mis en cache (bibliothèques QR et polices) */
const EXTERNES = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(() => {}))))   // un fichier absent n'empêche pas l'installation
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const memeSite = url.origin === self.location.origin;
  if (!memeSite && !EXTERNES.includes(url.hostname)) return;   // Firebase et le reste : réseau direct, sans cache

  e.respondWith(
    fetch(req)
      .then(rep => {
        if (rep && (rep.ok || rep.type === 'opaque')) {
          const copie = rep.clone();
          caches.open(VERSION).then(c => c.put(req, copie)).catch(() => {});
        }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('accueil.html') : undefined)))
  );
});
