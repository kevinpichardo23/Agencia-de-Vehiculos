"use strict";
const API = "http://localhost:3000/vehiculos";

const D = {
  form:         document.getElementById("vehiculoForm"),
  modoEdicion:  document.getElementById("modoEdicion"),
  fleetGrid:    document.getElementById("fleetGrid"),
  emptyState:   document.getElementById("emptyState"),
  emptyMsg:     document.getElementById("emptyMsg"),
  buscador:     document.getElementById("buscador"),
  formTitle:    document.getElementById("formTitle"),
  formEyebrow:  document.getElementById("formEyebrow"),
  btnGuardar:   document.getElementById("btnGuardar"),
  btnLimpiar:   document.getElementById("btnLimpiar"),
  sideNavLabel: document.getElementById("sideNavLabel"),
  odoValor:     document.getElementById("odoValor"),
  odoModelos:   document.getElementById("odoModelos"),
  odoUnidades:  document.getElementById("odoUnidades"),
  odoBar:       document.getElementById("odoBar"),
  sstatTotal:   document.getElementById("sstatTotal"),
  sstatStock:   document.getElementById("sstatStock"),
  sstatMarca:   document.getElementById("sstatMarca"),
  liveTotal:    document.getElementById("liveTotal"),
  modalWrap:    document.getElementById("modalWrap"),
  btnConfirmar: document.getElementById("btnConfirmarModal"),
  btnCancelar:  document.getElementById("btnCancelarModal"),
  toastStack:   document.getElementById("toastStack"),
};

const inputs = {
  codigo:      document.getElementById("codigo"),
  marca:       document.getElementById("marca"),
  modelo:      document.getElementById("modelo"),
  anio:        document.getElementById("anio"),
  color:       document.getElementById("color"),
  combustible: document.getElementById("combustible"),
  precio:      document.getElementById("precio"),
  cantidad:    document.getElementById("cantidad"),
  descripcion: document.getElementById("descripcion"),
};

let codigoAEliminar = null;

const fmtUSD  = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtUSD2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/* ============================================================
   BASE DE DATOS (API REST)
   ============================================================ */
const db = {
  async obtener() {
    const res = await fetch(API);
    return res.ok ? res.json() : [];
  },

  async agregar(v) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v)
    });
    return res.ok;
  },

  async actualizar(orig, v) {
    const todos = await this.obtener();
    const reg   = todos.find(x => x.codigo === orig);
    if (!reg) return false;
    const res = await fetch(`${API}/${reg.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v)
    });
    return res.ok;
  },

  async eliminar(cod) {
    const todos = await this.obtener();
    const reg   = todos.find(x => x.codigo === cod);
    if (!reg) return false;
    const res = await fetch(`${API}/${reg.id}`, { method: "DELETE" });
    return res.ok;
  },

  async existe(cod, exc = "") {
    const todos = await this.obtener();
    return todos.some(v => v.codigo.toLowerCase() === cod.toLowerCase() && v.codigo !== exc);
  }
};

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
function switchView(nombre) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("view--active"));
  document.getElementById("view-" + nombre).classList.add("view--active");
  document.querySelectorAll(".sidenav__item").forEach(b => b.classList.remove("sidenav__item--active"));
  document.querySelector(`.sidenav__item[data-view="${nombre}"]`).classList.add("sidenav__item--active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".sidenav__item").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

/* ============================================================
   ODÓMETRO
   ============================================================ */
let odoMax = 0;

async function actualizarOdometro() {
  const veh = await db.obtener();
  const modelos  = veh.length;
  const unidades = veh.reduce((a, v) => a + v.cantidad, 0);
  const valor    = veh.reduce((a, v) => a + v.precio * v.cantidad, 0);

  D.odoValor.textContent    = fmtUSD.format(valor);
  D.odoModelos.textContent  = modelos;
  D.odoUnidades.textContent = unidades;

  if (valor > odoMax) odoMax = valor;
  D.odoBar.style.width = odoMax > 0 ? ((valor / odoMax) * 100).toFixed(1) + "%" : "0%";

  D.sstatTotal.textContent = modelos;
  D.sstatStock.textContent = unidades;

  if (veh.length > 0) {
    const marcaCount = {};
    veh.forEach(v => { marcaCount[v.marca] = (marcaCount[v.marca] || 0) + v.cantidad; });
    D.sstatMarca.textContent = Object.entries(marcaCount).sort((a,b) => b[1]-a[1])[0][0];
  } else {
    D.sstatMarca.textContent = "—";
  }
}

/* ============================================================
   COLOR DE ACENTO POR COMBUSTIBLE
   ============================================================ */
function accentColor(comb) {
  const map = {
    "Gasolina":  "#F59E0B",
    "Diésel":    "#10B981",
    "Híbrido":   "#3B82F6",
    "Eléctrico": "#8B5CF6"
  };
  return map[comb] || "#E8440A";
}

/* ============================================================
   BADGE CLASS
   ============================================================ */
function badgeClass(comb) {
  const map = { "Gasolina":"gasolina", "Diésel":"diesel", "Híbrido":"hibrido", "Eléctrico":"electrico" };
  return "fcard__badge fcard__badge--" + (map[comb] || "gasolina");
}

/* ============================================================
   DETECCIÓN DE TIPO DE VEHÍCULO POR MODELO
   Detecta: sedan, suv, pickup, hatchback, sportivo, van, camion, minivan, coupe, convertible
   ============================================================ */
function detectarTipo(marca, modelo) {
  const texto = (marca + " " + modelo).toLowerCase();

  // SUV / Crossover
  if (/\b(suv|rav4|crv|cr-v|hrv|hr-v|tucson|santa\s*fe|sportage|pilot|highlander|pathfinder|rogue|xtrail|x-trail|forester|outback|4runner|fortuner|everest|explorer|edge|equinox|traverse|cx5|cx-5|cx50|terrain|escape|tiguan|q5|x5|x3|glc|gle|gls|gla|glb|q3|q7|q8|compass|wrangler|cherokee|durango|sequoia|land|land\s*cruiser|fj|prado|discovery|defender|tahoe|yukon|suburban|armada|xterra|ridgeline|sorento|telluride)\b/.test(texto)) {
    return "suv";
  }

  // Pickup / Truck
  if (/\b(pickup|pick-up|hilux|ranger|f-150|f150|f-250|silverado|sierra|tacoma|tundra|frontier|titan|colorado|canyon|ram|l200|b-series|d-max|navara|np300|np-300|triton|rodeo|wolf|strada)\b/.test(texto)) {
    return "pickup";
  }

  // Hatchback
  if (/\b(hatchback|hatch|yaris|fit|jazz|march|tiida|versa\s*note|fabia|golf|polo|swift|clio|205|208|312|fiesta|focus\s*hb|ka|spark|beat|sonic|i10|i20|veloster|accent\s*hb|rio\s*hb|city\s*hb|baleno|ignis|celerio|kwid)\b/.test(texto)) {
    return "hatchback";
  }

  // Deportivo / Sport / Coupe
  if (/\b(sport|deportivo|coupe|coup[eé]|mustang|camaro|challenger|corvette|supra|86|brz|wrx|sti|370z|240z|350z|gt|gti|rs|type-r|type\s*r|amg|m3|m5|m4|m2|m8|tts|tt|r8|gtr|gt-r|nsx|s2000|rx8|rx-8|genesis\s*coupe|tiburon|veloster|celica)\b/.test(texto)) {
    return "deportivo";
  }

  // Convertible / Cabriolet
  if (/\b(convertible|cabrio|cabriolet|roadster|spider|spyder)\b/.test(texto)) {
    return "convertible";
  }

  // Van / Minivan
  if (/\b(van|minivan|sienna|odyssey|carnival|sedona|mpv|transit|transporter|hiace|caravan|town\s*&\s*country|pacifica|staria)\b/.test(texto)) {
    return "van";
  }

  // Camión / Truck grande
  if (/\b(camion|cami[oó]n|truck|box|cargo|furgon|sprinter)\b/.test(texto)) {
    return "camion";
  }

  // Sedán por defecto (modelos conocidos)
  return "sedan";
}

/* ============================================================
   SVG SILUETAS POR TIPO DE VEHÍCULO
   ============================================================ */
function getSilueta(marca, modelo, combustible) {
  const tipo = detectarTipo(marca, modelo);
  const c    = accentColor(combustible);
  const f    = c;   // color de relleno
  const fo   = "0.07";  // fill-opacity base

  const baseAttrs = `class="fcard__silhouette" viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg"`;

  switch (tipo) {

    case "sedan":
      return `<svg ${baseAttrs}>
        <!-- Carrocería sedan: techo plano-inclinado, 4 puertas -->
        <path d="M30 62 L48 28 L90 18 L190 18 L232 28 L250 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <path d="M90 18 L96 44 L184 44 L190 18" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <!-- Línea de ventanas -->
        <line x1="100" y1="18" x2="100" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="140" y1="18" x2="140" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="180" y1="18" x2="180" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <!-- Ruedas -->
        <circle cx="74"  cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="74"  cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="74"  cy="62" r="2"  fill="${c}" opacity=".5"/>
        <circle cx="206" cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="206" cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="206" cy="62" r="2"  fill="${c}" opacity=".5"/>
        <!-- Piso -->
        <line x1="20" y1="62" x2="260" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <!-- Faros -->
        <rect x="30" y="50" width="12" height="7" rx="2" fill="${c}" fill-opacity=".4"/>
        <rect x="238" y="50" width="12" height="7" rx="2" fill="${c}" fill-opacity=".25"/>
      </svg>`;

    case "suv":
      return `<svg ${baseAttrs}>
        <!-- Carrocería SUV: alta, techo plano largo -->
        <path d="M28 64 L42 24 L80 12 L200 12 L240 24 L252 64 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <path d="M80 12 L84 42 L196 42 L200 12" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <!-- Línea de ventanas 3 columnas -->
        <line x1="116" y1="12" x2="116" y2="42" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="152" y1="12" x2="152" y2="42" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="188" y1="12" x2="188" y2="42" stroke="${c}" stroke-width="1" opacity=".3"/>
        <!-- Ruedas más grandes -->
        <circle cx="74"  cy="64" r="18" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="74"  cy="64" r="8"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="74"  cy="64" r="2.5" fill="${c}" opacity=".5"/>
        <circle cx="206" cy="64" r="18" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="206" cy="64" r="8"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="206" cy="64" r="2.5" fill="${c}" opacity=".5"/>
        <!-- Piso con altura extra -->
        <line x1="20" y1="64" x2="260" y2="64" stroke="${c}" stroke-width="1" opacity=".15"/>
        <!-- Rack techo -->
        <line x1="86" y1="10" x2="198" y2="10" stroke="${c}" stroke-width="1.5" opacity=".3"/>
        <!-- Faros -->
        <rect x="28" y="50" width="14" height="9" rx="2" fill="${c}" fill-opacity=".4"/>
        <rect x="238" y="50" width="14" height="9" rx="2" fill="${c}" fill-opacity=".25"/>
      </svg>`;

    case "pickup":
      return `<svg ${baseAttrs}>
        <!-- Cabina + tolva pickup -->
        <!-- Cabina -->
        <path d="M30 62 L44 26 L80 16 L136 16 L136 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <!-- Ventana cabina -->
        <path d="M80 16 L84 40 L132 40 L136 16" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <!-- Tolva (cama) -->
        <path d="M136 36 L136 62 L252 62 L248 36 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <!-- Barandal tolva -->
        <line x1="136" y1="36" x2="248" y2="36" stroke="${c}" stroke-width="1.8"/>
        <line x1="194" y1="36" x2="194" y2="62" stroke="${c}" stroke-width="1" opacity=".3"/>
        <!-- Ruedas pickup grandes -->
        <circle cx="74"  cy="62" r="18" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="74"  cy="62" r="8"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="74"  cy="62" r="2.5" fill="${c}" opacity=".5"/>
        <circle cx="210" cy="62" r="18" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="210" cy="62" r="8"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="210" cy="62" r="2.5" fill="${c}" opacity=".5"/>
        <!-- Piso -->
        <line x1="20" y1="62" x2="265" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <!-- Faros -->
        <rect x="30" y="48" width="12" height="9" rx="2" fill="${c}" fill-opacity=".4"/>
      </svg>`;

    case "hatchback":
      return `<svg ${baseAttrs}>
        <!-- Hatchback: techo caído pronunciado al trasero -->
        <path d="M32 62 L50 30 L88 18 L180 18 L220 32 L248 52 L248 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <!-- Techo inclinado más pronunciado atrás -->
        <path d="M88 18 L92 44 L178 44 L180 18" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <!-- División ventanas -->
        <line x1="128" y1="18" x2="128" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="168" y1="18" x2="175" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <!-- Ruedas más compactas -->
        <circle cx="76"  cy="62" r="15" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="76"  cy="62" r="6"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="76"  cy="62" r="2"  fill="${c}" opacity=".5"/>
        <circle cx="200" cy="62" r="15" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="200" cy="62" r="6"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="200" cy="62" r="2"  fill="${c}" opacity=".5"/>
        <line x1="20" y1="62" x2="260" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <!-- Faros -->
        <rect x="32" y="50" width="11" height="6" rx="2" fill="${c}" fill-opacity=".4"/>
        <rect x="240" y="48" width="10" height="6" rx="2" fill="${c}" fill-opacity=".25"/>
      </svg>`;

    case "deportivo":
      return `<svg ${baseAttrs}>
        <!-- Deportivo: bajo, techo bajo, perfil agresivo -->
        <path d="M26 62 L52 38 L90 22 L180 20 L228 34 L254 54 L254 62 Z" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="${fo}"/>
        <!-- Techo bajo y aerodinámico -->
        <path d="M90 22 L96 44 L176 44 L180 20" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <!-- Solo 2 ventanas (coupé) -->
        <line x1="138" y1="22" x2="138" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <!-- Alerón trasero -->
        <line x1="218" y1="32" x2="250" y2="32" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
        <line x1="238" y1="32" x2="238" y2="38" stroke="${c}" stroke-width="1.5"/>
        <!-- Ruedas deportivas -->
        <circle cx="78"  cy="62" r="16" stroke="${c}" stroke-width="2.5" fill="${f}" fill-opacity="0.08"/>
        <circle cx="78"  cy="62" r="7"  stroke="${c}" stroke-width="1.5" fill="${f}" fill-opacity="0.15"/>
        <circle cx="78"  cy="62" r="2.5" fill="${c}" opacity=".7"/>
        <circle cx="204" cy="62" r="16" stroke="${c}" stroke-width="2.5" fill="${f}" fill-opacity="0.08"/>
        <circle cx="204" cy="62" r="7"  stroke="${c}" stroke-width="1.5" fill="${f}" fill-opacity="0.15"/>
        <circle cx="204" cy="62" r="2.5" fill="${c}" opacity=".7"/>
        <line x1="20" y1="62" x2="268" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <!-- Faros delgados deportivos -->
        <rect x="26" y="54" width="14" height="5" rx="2" fill="${c}" fill-opacity=".5"/>
        <rect x="244" y="52" width="10" height="5" rx="2" fill="${c}" fill-opacity=".3"/>
        <!-- Toma de aire -->
        <rect x="50" y="56" width="20" height="5" rx="2" stroke="${c}" stroke-width="1" fill="${c}" fill-opacity=".1"/>
      </svg>`;

    case "convertible":
      return `<svg ${baseAttrs}>
        <!-- Convertible: sin techo o techo muy bajo -->
        <path d="M30 62 L52 44 L92 32 L180 32 L228 44 L250 58 L250 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <!-- Parabrisas bajo -->
        <path d="M92 32 L96 50 L176 50 L180 32" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.08"/>
        <!-- Zona pasajeros abierta (sin techo) -->
        <path d="M96 32 L100 26 L170 26 L174 32" stroke="${c}" stroke-width="1" fill="${f}" fill-opacity="0.05" stroke-dasharray="3 2"/>
        <!-- Detalle interior -->
        <line x1="138" y1="26" x2="138" y2="32" stroke="${c}" stroke-width="1" opacity=".3"/>
        <!-- Alerón pequeño -->
        <line x1="216" y1="38" x2="244" y2="38" stroke="${c}" stroke-width="1.5"/>
        <!-- Ruedas -->
        <circle cx="78"  cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="78"  cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="78"  cy="62" r="2"  fill="${c}" opacity=".6"/>
        <circle cx="202" cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="202" cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="202" cy="62" r="2"  fill="${c}" opacity=".6"/>
        <line x1="20" y1="62" x2="264" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <rect x="30" y="52" width="13" height="6" rx="2" fill="${c}" fill-opacity=".4"/>
      </svg>`;

    case "van":
      return `<svg ${baseAttrs}>
        <!-- Van/Minivan: caja alta y larga -->
        <path d="M26 62 L34 18 L240 18 L252 28 L252 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <!-- Línea de ventanas laterales múltiples -->
        <line x1="34" y1="18" x2="34" y2="62" stroke="${c}" stroke-width="1.5" opacity=".3"/>
        <path d="M38 18 L38 42 L240 42 L240 18" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.08"/>
        <line x1="90" y1="18" x2="90" y2="42" stroke="${c}" stroke-width="1" opacity=".25"/>
        <line x1="140" y1="18" x2="140" y2="42" stroke="${c}" stroke-width="1" opacity=".25"/>
        <line x1="190" y1="18" x2="190" y2="42" stroke="${c}" stroke-width="1" opacity=".25"/>
        <line x1="240" y1="18" x2="240" y2="42" stroke="${c}" stroke-width="1.2" opacity=".3"/>
        <!-- Ruedas -->
        <circle cx="70"  cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="70"  cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="70"  cy="62" r="2"  fill="${c}" opacity=".5"/>
        <circle cx="210" cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="210" cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="210" cy="62" r="2"  fill="${c}" opacity=".5"/>
        <line x1="18" y1="62" x2="264" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <!-- Faros -->
        <rect x="26" y="48" width="10" height="8" rx="2" fill="${c}" fill-opacity=".4"/>
        <rect x="242" y="48" width="10" height="8" rx="2" fill="${c}" fill-opacity=".25"/>
      </svg>`;

    case "camion":
      return `<svg ${baseAttrs}>
        <!-- Camión/Caja: cabina separada + caja de carga -->
        <!-- Cabina -->
        <path d="M26 62 L30 26 L68 16 L102 16 L108 30 L108 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <path d="M38 16 L40 40 L100 40 L102 16" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <!-- Caja -->
        <path d="M110 16 L110 62 L256 62 L256 16 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <!-- Detalles caja -->
        <line x1="156" y1="16" x2="156" y2="62" stroke="${c}" stroke-width="1" opacity=".2"/>
        <line x1="202" y1="16" x2="202" y2="62" stroke="${c}" stroke-width="1" opacity=".2"/>
        <!-- Ruedas camión (doble trasera) -->
        <circle cx="68"  cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="68"  cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="68"  cy="62" r="2"  fill="${c}" opacity=".5"/>
        <circle cx="214" cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="214" cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="214" cy="62" r="2"  fill="${c}" opacity=".5"/>
        <circle cx="240" cy="62" r="14" stroke="${c}" stroke-width="1.5" fill="${f}" fill-opacity="0.06"/>
        <circle cx="240" cy="62" r="6"  stroke="${c}" stroke-width="1" fill="${f}" fill-opacity="0.1"/>
        <line x1="18" y1="62" x2="268" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <rect x="26" y="46" width="10" height="8" rx="2" fill="${c}" fill-opacity=".4"/>
      </svg>`;

    default: // sedan genérico
      return `<svg ${baseAttrs}>
        <path d="M30 62 L48 28 L90 18 L190 18 L232 28 L250 62 Z" stroke="${c}" stroke-width="1.8" fill="${f}" fill-opacity="${fo}"/>
        <path d="M90 18 L96 44 L184 44 L190 18" stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.1"/>
        <line x1="100" y1="18" x2="100" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="140" y1="18" x2="140" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <line x1="180" y1="18" x2="180" y2="44" stroke="${c}" stroke-width="1" opacity=".3"/>
        <circle cx="74"  cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="74"  cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="74"  cy="62" r="2"  fill="${c}" opacity=".5"/>
        <circle cx="206" cy="62" r="16" stroke="${c}" stroke-width="2" fill="${f}" fill-opacity="0.08"/>
        <circle cx="206" cy="62" r="7"  stroke="${c}" stroke-width="1.2" fill="${f}" fill-opacity="0.15"/>
        <circle cx="206" cy="62" r="2"  fill="${c}" opacity=".5"/>
        <line x1="20" y1="62" x2="260" y2="62" stroke="${c}" stroke-width="1" opacity=".15"/>
        <rect x="30" y="50" width="12" height="7" rx="2" fill="${c}" fill-opacity=".4"/>
        <rect x="238" y="50" width="12" height="7" rx="2" fill="${c}" fill-opacity=".25"/>
      </svg>`;
  }
}

/* ============================================================
   RENDER DE TARJETAS
   ============================================================ */
async function renderFleet(filtro = "") {
  const veh   = await db.obtener();
  const term  = filtro.toLowerCase().trim();
  const lista = term
    ? veh.filter(v => v.codigo.toLowerCase().includes(term) || v.marca.toLowerCase().includes(term) || v.modelo.toLowerCase().includes(term))
    : veh;

  D.fleetGrid.innerHTML = "";

  if (lista.length === 0) {
    D.emptyState.classList.add("empty--active");
    D.emptyMsg.textContent = veh.length === 0 ? "El showroom está vacío." : "Sin resultados para esa búsqueda.";
    return;
  }

  D.emptyState.classList.remove("empty--active");

  lista.forEach((v, idx) => {
    const card = document.createElement("div");
    card.className = "fcard";
    card.style.animationDelay = (idx * 0.04) + "s";

    const tipo       = detectarTipo(v.marca, v.modelo);
    const cardAccent = accentColor(v.combustible);
    const totalLote  = v.precio * v.cantidad;

    // Etiqueta del tipo para la UI
    const tipoLabel = {
      sedan: "Sedán", suv: "SUV", pickup: "Pickup",
      hatchback: "Hatchback", deportivo: "Deportivo",
      convertible: "Convertible", van: "Van/Minivan", camion: "Camión"
    }[tipo] || "Sedán";

    card.style.setProperty("--card-accent", cardAccent);

    card.innerHTML = `
      <div class="fcard__header">
        <span class="${badgeClass(v.combustible)}">${esc(v.combustible)}</span>
        <span style="position:absolute;top:12px;left:12px;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:600;letter-spacing:.1em;color:${cardAccent};opacity:.7;text-transform:uppercase;">${tipoLabel}</span>
        ${getSilueta(v.marca, v.modelo, v.combustible)}
        <div class="fcard__brand">${esc(v.marca)}</div>
        <div class="fcard__model">${esc(v.modelo)} · ${v.anio}</div>
      </div>
      <div class="fcard__body">
        <div class="fcard__row">
          <span class="fcard__row-label">Código</span>
          <span class="fcard__row-val">${esc(v.codigo)}</span>
        </div>
        <div class="fcard__row">
          <span class="fcard__row-label">Color</span>
          <span class="fcard__row-val">${esc(v.color)}</span>
        </div>
        <div class="fcard__row">
          <span class="fcard__row-label">Stock</span>
          <span class="fcard__row-val">${v.cantidad} unid.</span>
        </div>
        <div class="fcard__row">
          <span class="fcard__row-label">Valor lote</span>
          <span class="fcard__row-val">${fmtUSD.format(totalLote)}</span>
        </div>
        <div class="fcard__price">
          <div class="fcard__price-label">Precio unitario</div>
          <div class="fcard__price-val">${fmtUSD.format(v.precio)}</div>
          <div class="fcard__price-sub">${esc(v.descripcion).substring(0, 60)}${v.descripcion.length > 60 ? "…" : ""}</div>
        </div>
      </div>
      <div class="fcard__footer">
        <button class="btn-action btn-action--edit" data-action="edit" data-cod="${esc(v.codigo)}">Editar</button>
        <button class="btn-action btn-action--delete" data-action="delete" data-cod="${esc(v.codigo)}">Eliminar</button>
      </div>
    `;
    D.fleetGrid.appendChild(card);
  });

  actualizarOdometro();
}

/* Delegación de eventos */
D.fleetGrid.addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const cod = btn.dataset.cod;
  if (btn.dataset.action === "edit")   await cargarParaEditar(cod);
  if (btn.dataset.action === "delete") abrirModal(cod);
});

D.buscador.addEventListener("input", async e => await renderFleet(e.target.value));

/* ============================================================
   CÁLCULO EN VIVO
   ============================================================ */
function calcularLive() {
  const p = parseFloat(inputs.precio.value)  || 0;
  const q = parseInt(inputs.cantidad.value)  || 0;
  const total = p * q;
  D.liveTotal.textContent = fmtUSD.format(total);
  D.liveTotal.style.color = total > 0 ? "var(--acc)" : "var(--muted)";
}

inputs.precio.addEventListener("input", calcularLive);
inputs.cantidad.addEventListener("input", calcularLive);

/* ============================================================
   VALIDACIÓN
   ============================================================ */
function markField(campo, msg) {
  inputs[campo].classList.add("cfield__input--invalid");
  document.getElementById("error-" + campo).textContent = msg;
}

function clearField(campo) {
  inputs[campo].classList.remove("cfield__input--invalid");
  document.getElementById("error-" + campo).textContent = "";
}

function clearAll() { Object.keys(inputs).forEach(clearField); }

async function validar() {
  clearAll();
  let ok = true;
  const anioNow = new Date().getFullYear();
  const cod = inputs.codigo.value.trim();
  const codOrig = D.modoEdicion.value;

  if (!cod)                                       { markField("codigo", "Campo requerido."); ok = false; }
  else if (await db.existe(cod, codOrig))          { markField("codigo", "Código ya registrado."); ok = false; }
  if (!inputs.marca.value)               { markField("marca", "Selecciona una marca."); ok = false; }
  if (!inputs.modelo.value.trim())       { markField("modelo", "Campo requerido."); ok = false; }

  const anio = parseInt(inputs.anio.value);
  if (isNaN(anio))                       { markField("anio", "Año inválido."); ok = false; }
  else if (anio < 2000 || anio > anioNow + 1) { markField("anio", `Entre 2000 y ${anioNow + 1}.`); ok = false; }

  if (!inputs.color.value.trim())        { markField("color", "Campo requerido."); ok = false; }
  if (!inputs.combustible.value)         { markField("combustible", "Selecciona motorización."); ok = false; }

  const precio = parseFloat(inputs.precio.value);
  if (isNaN(precio) || precio <= 0)      { markField("precio", "Debe ser mayor a 0."); ok = false; }

  const cant = parseInt(inputs.cantidad.value);
  if (isNaN(cant) || cant < 0)           { markField("cantidad", "No puede ser negativo."); ok = false; }

  if (!inputs.descripcion.value.trim())  { markField("descripcion", "Añade una descripción."); ok = false; }

  return ok ? {
    codigo:      cod,
    marca:       inputs.marca.value,
    modelo:      inputs.modelo.value.trim(),
    anio,
    color:       inputs.color.value.trim(),
    combustible: inputs.combustible.value,
    precio,
    cantidad:    cant,
    descripcion: inputs.descripcion.value.trim()
  } : null;
}

/* ============================================================
   SUBMIT
   ============================================================ */
D.form.addEventListener("submit", async e => {
  e.preventDefault();
  const veh = await validar();
  if (!veh) { toast("Revisa los campos marcados.", "error"); return; }

  const orig = D.modoEdicion.value;
  if (orig) {
    await db.actualizar(orig, veh);
    toast("Vehículo actualizado.");
  } else {
    await db.agregar(veh);
    toast("Vehículo registrado en flota.");
  }

  resetForm();
  await renderFleet(D.buscador.value);
  await actualizarOdometro();
  switchView("inventario");
});

/* ============================================================
   RESET
   ============================================================ */
function resetForm() {
  D.form.reset();
  D.modoEdicion.value = "";
  inputs.codigo.disabled = false;
  D.formTitle.innerHTML    = "Configurar <em>Registro</em>";
  D.formEyebrow.textContent = "Nuevo Vehículo";
  D.btnGuardar.textContent  = "+ Registrar vehículo";
  D.sideNavLabel.textContent = "Registrar";
  D.liveTotal.textContent    = "$0";
  D.liveTotal.style.color    = "var(--muted)";
  clearAll();
}

D.btnLimpiar.addEventListener("click", resetForm);

/* ============================================================
   CARGAR PARA EDITAR
   ============================================================ */
async function cargarParaEditar(cod) {
  const todos = await db.obtener();
  const v = todos.find(x => x.codigo === cod);
  if (!v) return;

  Object.keys(inputs).forEach(k => { inputs[k].value = v[k]; });
  inputs.codigo.disabled = false;
  D.modoEdicion.value = v.codigo;
  D.formTitle.innerHTML    = `Editando <em>${esc(v.marca)} ${esc(v.modelo)}</em>`;
  D.formEyebrow.textContent = "Modificar Registro";
  D.btnGuardar.textContent  = "Guardar cambios";
  D.sideNavLabel.textContent = "Editar";
  calcularLive();
  switchView("registrar");
}

/* ============================================================
   MODAL
   ============================================================ */
function abrirModal(cod) {
  codigoAEliminar = cod;
  D.modalWrap.classList.add("modal-wrap--active");
}

function cerrarModal() {
  D.modalWrap.classList.remove("modal-wrap--active");
  codigoAEliminar = null;
}

D.btnCancelar.addEventListener("click", cerrarModal);
D.modalWrap.addEventListener("click", e => { if (e.target === D.modalWrap) cerrarModal(); });

D.btnConfirmar.addEventListener("click", async () => {
  if (!codigoAEliminar) return;
  if (D.modoEdicion.value === codigoAEliminar) resetForm();
  await db.eliminar(codigoAEliminar);
  toast("Vehículo retirado de flota.");
  await renderFleet(D.buscador.value);
  await actualizarOdometro();
  cerrarModal();
});

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, tipo = "success") {
  const t = document.createElement("div");
  t.className = `toast toast--${tipo}`;
  t.innerHTML = `<span class="toast__dot"></span><span>${msg}</span>`;
  D.toastStack.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add("toast--show")); });
  setTimeout(() => {
    t.classList.remove("toast--show");
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  await renderFleet();
  await actualizarOdometro();
});