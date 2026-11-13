/* =====================================================================
   SERRE — service d'application installable (v55.9)
   ---------------------------------------------------------------------
   Rôle unique : rendre l'application installable sur téléphone et
   afficher l'écran de l'application même par mauvais réseau.

   Règles :
   - « réseau d'abord » : chaque fichier est demandé au serveur ; la copie
     locale ne sert que si le réseau ne répond pas. Une mise à jour
     publiée sur Netlify est donc prise dès l'ouverture suivante ;
   - seuls les fichiers de l'application (même adresse) sont gardés en
     copie. Les données (Supabase) et le service Render ne passent JAMAIS
     par ce cache : aucune donnée de dossier n'est stockée sur l'appareil.
   ===================================================================== */
const CACHE = "serre-app-v58.0";

self.addEventListener("install", e => { self.skipWaiting(); });

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          /* Supabase, Render… : non intercepté */
  if (url.pathname.startsWith("/supabase/") || url.pathname.startsWith("/serveur-render/") || url.pathname.startsWith("/docs/")) return;
  e.respondWith((async () => {
    try {
      const rep = await fetch(req);
      if (rep.ok && rep.type === "basic") {
        const copie = rep.clone();
        caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {});
      }
      return rep;
    } catch (err) {
      const enCache = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
      if (enCache) return enCache;
      if (req.mode === "navigate") { const accueil = await caches.match("./"); if (accueil) return accueil; }
      throw err;
    }
  })());
});
