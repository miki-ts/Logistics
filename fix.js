const fs = require('fs');

let css = fs.readFileSync('styles.css', 'utf8');

// Task 2: White space in hero
css = css.replace(/min-height:\s*740px;/g, 'min-height: 550px;');
css = css.replace(/min-height:\s*610px;/g, 'min-height: 550px;');
css = css.replace(/height:\s*600px;\s*object-fit:\s*contain;\s*bottom:\s*300px;/g, 'height: 330px; object-fit: contain; bottom: 12px;');

// Task 3: Hero page images responsive mobile behind text
css = css.replace(/\.hero-truck,\s*\.hero-ship\s*\{\s*display:\s*none;\s*\}/g, '.hero-truck, .hero-ship { display: block; opacity: 0.15; z-index: 0; }');
css = css.replace(/\.hero-copy\s*\{/g, '.hero-copy { position: relative; z-index: 10; ');

// Task 4: About text to the right, image not behind
css = css.replace(/\.about-art\s*\{\s*position:\s*absolute;/, '.about-art { position: relative;');
css = css.replace(/\.about\s*\{\s*min-height:\s*560px;\s*display:\s*grid;\s*grid-template-columns:\s*1fr\s*1fr;\s*align-items:\s*center;\s*gap:\s*45px;\s*\}/, '.about { min-height: 560px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 45px; }');
// The duplicate .about in line 848 (min-height: 480px) is fine because we changed position:absolute above.
// But we need to ensure about-copy is on the right. grid-template-columns: 1fr 1fr does that. 
// However, about-art was absolute, so let's make sure it's relative.
css = css.replace(/\.about-art\s*\{\s*position:\s*absolute;\s*width:\s*270px;\s*height:\s*600px;\s*object-fit:\s*contain;\s*\}/, '.about-art { position: relative; width: 100%; height: auto; display: flex; align-items: center; justify-content: center; } .about-art img { width: min(100%, 450px); height: 360px; object-fit: contain; }');

// Task 5: Mobile responsiveness of Global Partners container
if(!css.includes('container-drop-responsive')) {
    css += `
/* container-drop-responsive */
@media (max-width: 800px) {
  .container-drop {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .container-drop img {
    margin: 0 auto !important;
    display: block !important;
    max-width: 100% !important;
    height: auto !important;
  }
}
`;
}

// Task 7: CTA text color to white
if(!css.includes('cta-white-text')) {
    css += `
/* cta-white-text */
.quote-card, .quote-card h2, .quote-card p,
.cta, .cta h2, .cta p {
  color: #ffffff !important;
}
`;
}

// Task 4 (Cards spin):
// Right now, .globe-wrap spins. But the cards don't spin.
// We can make .why-layout spin, and counter-spin the cards.
// But .why-layout has max-width: 850px. It would be an ellipse if spun, which distorts.
// Instead, we will spin a new wrapper around the cards, OR spin the cards using transform-origin.
// Wait, CSS orbit animation using transform: rotate() translateX() rotate() is better.
// Let's just create an orbit animation for the cards.
css = css.replace(/\.why-card\.left\s*\{[\s\S]*?\}/g, '.why-card.left { left: 0; }');
css = css.replace(/\.why-card\.right\s*\{[\s\S]*?\}/g, '.why-card.right { right: 0; }');

// It's much easier to just put a wrapper around the globe and cards in index.html, give it width/height, border-radius 50%, and spin that wrapper. And counter-spin the cards.
fs.writeFileSync('styles.css', css);

let html = fs.readFileSync('index.html', 'utf8');

// Wrap globe-wrap and why-cards in a spinning container
if(!html.includes('orbit-container')) {
    html = html.replace('<div class="globe-wrap">', '');
    html = html.replace('<img alt="Global logistics network globe" src="assets/globe.avif"/></div>', '<div class="globe-wrap"><img alt="Global logistics network globe" src="assets/globe.avif"/></div>');
    // Actually the easiest way to animate them spinning:
    // We replace the why-layout content.
    let newWhy = `
<div class="why-layout">
  <div class="orbit-container">
    <div class="globe-wrap"><img alt="Global logistics network globe" src="assets/globe.avif"/></div>
    <article class="why-card left top"><h3>Global Logistics<br/>Network</h3><p>Strong partnerships with airlines, shipping lines, and international agents connecting Ethiopia to global markets.</p></article>
    <article class="why-card left bottom"><h3>Flexible Gateway<br/>Options</h3><p>Cargo solutions through strategic ports including Djibouti, Mombasa, and Berbera.</p></article>
    <article class="why-card right top"><h3>Specialized Cargo<br/>Handling</h3><p>Professional handling of DG cargo, live animals, diplomatic cargo, and sensitive shipments.</p></article>
    <article class="why-card right bottom"><h3>Reliable Support</h3><p>Dedicated coordination ensuring smooth cargo movement from start to finish.</p></article>
  </div>
</div>`;
    let oldWhyRegex = /<div class="why-layout">[\s\S]*?<\/div>\s*<\/section>/;
    html = html.replace(oldWhyRegex, newWhy + '\n</section>');
    fs.writeFileSync('index.html', html);
}

// Now add the orbit CSS
let orbitCss = `
.orbit-container {
  position: absolute;
  top: 50%; left: 50%;
  width: 600px; height: 600px;
  margin-top: -300px; margin-left: -300px;
  animation: orbit-spin 22s linear infinite;
  border-radius: 50%;
}
.orbit-container:has(.why-card:hover) {
  animation-play-state: paused;
}
.orbit-container:has(.why-card:hover) .why-card {
  animation-play-state: paused;
}
.orbit-container .globe-wrap {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  transform: none; /* globe doesn't need its own spin anymore, container spins */
  animation: none;
}
.orbit-container .why-card {
  animation: counter-spin 22s linear infinite;
}
.orbit-container .why-card.left.top { top: 60px; left: -40px; transform: none; }
.orbit-container .why-card.left.bottom { bottom: 60px; left: -40px; transform: none; }
.orbit-container .why-card.right.top { top: 60px; right: -40px; transform: none; }
.orbit-container .why-card.right.bottom { bottom: 60px; right: -40px; transform: none; }

@keyframes orbit-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes counter-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

@media(max-width: 800px) {
  .orbit-container {
    width: 250px; height: 250px;
    margin-top: -125px; margin-left: -125px;
  }
  .orbit-container .why-card {
    width: 140px;
    padding: 10px;
  }
  .orbit-container .why-card.left.top { top: 0px; left: -20px; }
  .orbit-container .why-card.left.bottom { bottom: 0px; left: -20px; }
  .orbit-container .why-card.right.top { top: 0px; right: -20px; }
  .orbit-container .why-card.right.bottom { bottom: 0px; right: -20px; }
}
`;
if(!css.includes('.orbit-container')) {
    fs.appendFileSync('styles.css', orbitCss);
}

