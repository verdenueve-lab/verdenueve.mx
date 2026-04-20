/* ═══════════════════════════════════════════
   VERDE NUEVE — JS global con Supabase
   ═══════════════════════════════════════════ */

// ── CONFIGURACIÓN SUPABASE ───────────────────
const VN_CONFIG = {
  url: 'https://pqqnxuvbrdvijvicyord.supabase.co',
  key: 'sb_publishable_Y3CmtZy4geYKq_8aMvT4nw_6sZ-t2io'
};

// ── API HELPER ───────────────────────────────
async function sbFetch(endpoint, options = {}) {
  const url = `${VN_CONFIG.url}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': VN_CONFIG.key,
      'Authorization': `Bearer ${VN_CONFIG.key}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

// ── INYECTAR CONTENIDO DE TEXTO ──────────────
// Elementos con data-vn="section.key" reciben el texto de Supabase
// El texto HTML original permanece intacto si Supabase falla
async function loadPageContent(page) {
  try {
    const rows = await sbFetch(
      `site_content?page=in.(${page},global)&select=section,key,value`
    );
    if (!rows || !rows.length) return;
    rows.forEach(({ section, key, value }) => {
      if (!value) return;
      document.querySelectorAll(`[data-vn="${section}.${key}"]`).forEach(el => {
        // Preservar elementos <em> hijos si los hay
        const em = el.querySelector('em');
        if (em) {
          // Split value at the em text if possible
          el.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = value; });
        } else {
          el.textContent = value;
        }
      });
    });
  } catch (e) {
    // Silencioso — el contenido HTML estático permanece
    console.warn('VN content load error:', e.message);
  }
}

// ── INYECTAR PRECIOS DE PRODUCTOS EN TIENDA ──
// Elementos con data-product="Nombre" reciben precio actualizado
async function loadProductPrices() {
  const priceEls = document.querySelectorAll('[data-product]');
  if (!priceEls.length) return;
  try {
    const products = await sbFetch('products?active=eq.true&select=name_es,price,uso_es,uso_en');
    if (!products) return;
    const priceMap = {};
    products.forEach(p => { priceMap[p.name_es] = p; });

    priceEls.forEach(nameEl => {
      const name = nameEl.dataset.product;
      const product = priceMap[name];
      if (!product) return;
      // Update price in nearby pc-price div
      const card = nameEl.closest('.prod-card, .prod-card-wide');
      if (!card) return;
      const priceEl = card.querySelector('.pc-price');
      if (priceEl && product.price) priceEl.textContent = `$${Math.round(product.price)}`;
      // Update uso text
      const lang = document.body.classList.contains('lang-en') ? 'en' : 'es';
      const usoEls = card.querySelectorAll('.pc-uso');
      usoEls.forEach(el => {
        if (el.classList.contains('es') && product.uso_es) el.textContent = product.uso_es;
        if (el.classList.contains('en') && product.uso_en) el.textContent = product.uso_en;
      });
    });
  } catch (e) {
    console.warn('VN product prices error:', e.message);
  }
}

// ── IDIOMA ──────────────────────────────────
function setLang(lang) {
  document.body.className = document.body.className
    .replace(/lang-\w+/, '')
    .trim() + ' lang-' + lang;
  document.querySelectorAll('.lang-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  localStorage.setItem('vn-lang', lang);
}

// Restaurar idioma guardado
(function () {
  const saved = localStorage.getItem('vn-lang') || 'es';
  document.body.classList.add('lang-' + saved);
})();

// ── NAV SCROLL SHADOW ────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('nav')?.classList.toggle('scrolled', window.scrollY > 30);
});

// ── HAMBURGER (mobile) ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.nav-burger');
  const links  = document.querySelector('.nav-links');
  burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    links?.classList.toggle('open');
  });

  // Marcar enlace activo
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href')?.split('/').pop();
    if (href === page) a.classList.add('active');
  });

  // Restaurar botones de idioma
  const saved = localStorage.getItem('vn-lang') || 'es';
  document.querySelectorAll('.lang-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === saved);
  });

  // ── DETECTAR PÁGINA Y CARGAR CONTENIDO ──────
  const pageMap = {
    'index.html': 'home',
    '':           'home',
    'spa-hotel.html':    'spa',
    'jardin.html':       'jardin',
    'experiencias.html': 'experiencias',
    'tienda.html':       'tienda'
  };
  const currentPage = pageMap[page] || 'home';

  // Cargar textos y precios en paralelo
  Promise.all([
    loadPageContent(currentPage),
    loadProductPrices()
  ]);
});

// ── SCROLL REVEAL (fade-up) ──────────────────
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  }),
  { threshold: 0.12 }
);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});
