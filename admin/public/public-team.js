(function(){
  const ADMIN_API = "http://localhost:8787/api/public/team";

  async function loadTeam(){
    const container = document.querySelector('#team');
    if (!container) return;
    try {
      const res  = await fetch(ADMIN_API, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return; // leave static HTML intact on error
      const data = await res.json();
      if (!Array.isArray(data.teams) || data.teams.length === 0) return; // keep static fallback

      // Replace static team members with API data
      container.replaceChildren();
      data.teams.forEach(t => {
        const article = document.createElement('article');

        const img = document.createElement('img');
        img.src = t.image || 'assets/img_0.jpeg';
        img.alt = t.name || '';
        img.loading = 'lazy';

        const h3 = document.createElement('h3');
        h3.textContent = t.name || '';

        const p = document.createElement('p');
        p.textContent = t.role || '';

        article.append(img, h3, p);
        container.append(article);
      });
    } catch {
      // Server not running — leave the static HTML in place, no console noise
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTeam);
  } else {
    loadTeam();
  }
})();
