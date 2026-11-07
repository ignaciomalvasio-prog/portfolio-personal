// Mini runtime: carga los rangos del sheet desde el script de Google y dibuja la página.
(() => {
  const loaders = {}, calcs = [], draws = new Map(), onData = [];
  let store = {}, params = {}, status = 'loading';
  const CFG = 'pp-config', CACHE = 'pp-cache';
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const $ = (id) => document.getElementById(id);

  const runAll = () => {
    for (const fn of onData) { try { fn(); } catch (e) { console.error(e); } }
    for (const [name, def] of draws) drawOne(name, def);
  };
  const drawOne = (name, def) => {
    document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
      if (el.closest('[hidden]')) return;
      try { def(el); } catch (e) { console.error(name, e); }
    });
  };

  const build = (payload) => {
    const ranges = (payload && payload.ranges) || {};
    store = {};
    for (const id of Object.keys(ranges)) {
      try {
        const out = loaders[id] ? loaders[id]({answer: ranges[id], args: {}}) : ranges[id];
        const rows = Array.isArray(out) ? out : (out.rows || out.data || []);
        store[id] = {status: 'ok', data: rows, columns: out.columns || Object.keys(rows[0] || {}), meta: []};
      } catch (e) { store[id] = {status: 'error', data: [], message: String(e)}; }
    }
    for (const c of calcs) {
      try {
        const ins = c.inputs.map((i) => (store[i] && store[i].status === 'ok' ? store[i].data : null));
        if (ins.some((x) => x == null)) { store[c.id] = {status: 'error', data: []}; continue; }
        const out = c.fn(...ins);
        store[c.id] = {status: 'ok', data: Array.isArray(out) ? out : [out], meta: []};
      } catch (e) { store[c.id] = {status: 'error', data: [], message: String(e)}; }
    }
    status = 'ok';
  };

  const fmtAt = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-AR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}); };

  const load = async () => {
    const cfg = get(CFG);
    if (!cfg) return showSetup();
    const btn = $('refresh'); btn.disabled = true; btn.textContent = 'Actualizando…';
    $('err').hidden = true;
    try {
      const r = await fetch(cfg.url + (cfg.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(cfg.key), {redirect: 'follow'});
      const j = await r.json();
      if (j.error === 'clave') { localStorage.removeItem(CFG); showSetup('La clave no coincide con la del script.'); return; }
      if (!j.ranges) throw new Error('respuesta sin datos');
      put(CACHE, j);
      build(j);
      $('updated').textContent = 'Actualizado ' + fmtAt(j.at);
      runAll();
    } catch (e) {
      const c = get(CACHE);
      $('err').textContent = 'No pude leer el sheet ahora' + (c ? '; muestro lo último guardado.' : '.') + ' Revisá la conexión y tocá Actualizar.';
      $('err').hidden = false;
    } finally { btn.disabled = false; btn.textContent = 'Actualizar'; }
  };

  const showSetup = (msg) => {
    $('setup').hidden = false; $('bar').hidden = true; $('dash-root').hidden = true;
    if (msg) { $('err').textContent = msg; $('err').hidden = false; }
  };

  window.dash = {
    data: (id) => store[id] || {status: status === 'ok' ? 'missing' : 'loading', data: [], meta: []},
    loader: (id, def) => { loaders[id] = def.fn; },
    calc: (id, def) => { calcs.push({id, inputs: def.inputs, fn: def.fn}); },
    draw: (name, fn) => { if (fn) draws.set(name, fn); else if (draws.has(name)) drawOne(name, draws.get(name)); },
    onData: (fn) => { onData.push(fn); },
    params: () => ({...params}),
    setParams: (p) => { params = {...params, ...p}; runAll(); },
    resetParams: () => { params = {}; runAll(); },
    refresh: () => load(),
    setLink: (name) => { try { history.replaceState(null, '', '#' + name); } catch (e) {} },
    colors: ['#2F7BEA', '#D4A64A', '#13A89E', '#8B5CF6', '#E39B1B', '#E2557A', '#2FA35B', '#64748B'],
    start: () => {
      $('setup').addEventListener('submit', (e) => {
        e.preventDefault();
        put(CFG, {url: $('cfg-url').value.trim(), key: $('cfg-key').value});
        $('setup').hidden = true; boot();
      });
      $('refresh').addEventListener('click', load);
      let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(runAll, 200); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && get(CFG)) load(); });
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
      boot();
    }
  };
  const boot = () => {
    if (!get(CFG)) return showSetup();
    $('bar').hidden = false; $('dash-root').hidden = false;
    const c = get(CACHE);
    if (c) { build(c); $('updated').textContent = 'Guardado ' + fmtAt(c.at); }
    runAll();
    load();
  };
})();
