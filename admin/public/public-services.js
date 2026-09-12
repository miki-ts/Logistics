(function(){
  const ADMIN_API = "http://localhost:8787/api/public/services";

  async function loadServices(){
    const main = document.querySelector('#services');
    if (!main) return;
    try {
      const res  = await fetch(ADMIN_API, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return; // keep static HTML intact
      const data = await res.json();
      if (!Array.isArray(data.services) || data.services.length === 0) return; // keep static fallback

      // Remove static .service sections, then inject API ones
      main.querySelectorAll('section.service').forEach(el => el.remove());

      data.services.forEach((s, index) => {
        if (typeof s === 'string') return; // skip plain strings

        const section = document.createElement('section');
        section.className = 'service' + (index % 2 !== 0 ? ' reverse' : '');

        const copy = document.createElement('div');
        copy.className = 'copy';

        const h2 = document.createElement('h2');
        h2.innerHTML = s.title || s.name; // allow green spans added by admin

        const p = document.createElement('p');
        p.textContent = s.description || '';

        copy.append(h2, p);

        const photo = document.createElement('div');
        photo.className = 'photo';

        const img = document.createElement('img');
        img.src = s.image || 'assets/air.jpg';
        img.alt = s.title || s.name || '';
        img.loading = 'lazy';

        photo.append(img);
        section.append(copy, photo);
        main.append(section);
      });
    } catch {
      // Admin server offline — static content remains
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadServices);
  } else {
    loadServices();
  }
})();
