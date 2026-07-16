# Plan de Proyecto — Laboratorio 2
**ISW-521: Programación en Ambiente Web I**
**Estudiante:** Joselyn Segura | **Valor:** 100 pts (15% de la nota)

---

## 1. Alcance del Proyecto

Los **cinco subproyectos** de la Categoría A son obligatorios. La aplicación final debe implementarlos como secciones navegables dentro de una misma interfaz, compartiendo la capa de autenticación, el fetcher con resiliencia y el acceso a localStorage.

| # | Subproyecto | Endpoints |
|---|---|---|
| 2.1 | La Ruta del Campeón | `/get/teams`, `/get/games`, `/get/stadiums` |
| 2.2 | Rastreador de Goleadas | `/get/games`, `/get/teams` |
| 2.3 | El Muro | `/get/groups`, `/get/teams`, `/get/games` |
| 2.4 | Analítica de Estadios | `/get/stadiums`, `/get/games` |
| 2.5 | Radar de Empates | `/get/games`, `/get/teams` |

**Base URL:** `https://worldcup26.ir`

---

## 2. Endpoints Únicos a Consumir

| Endpoint | Usado en |
|---|---|
| `POST /auth/authenticate` | Toda la app (autenticación) |
| `GET /get/teams` | 2.1, 2.2, 2.3, 2.5 |
| `GET /get/games` | 2.1, 2.2, 2.3, 2.4, 2.5 |
| `GET /get/stadiums` | 2.1, 2.4 |
| `GET /get/groups` | 2.3 |

Todos los datos se cachean en `localStorage` por endpoint para el modo offline.

---

## 3. Funcionalidades por Subproyecto

### 3.1 — La Ruta del Campeón

**Objetivo:** cruzar teams + games + stadiums para construir un itinerario.

- Selector poblado con los 48 equipos desde `/get/teams`
- Al elegir equipo: filtrar `/get/games` por `home_team_id` o `away_team_id`, ordenados por `local_date`
- Cruzar cada partido con `/get/stadiums` vía `stadium_id` → ciudad, país, aforo
- Renderizar como itinerario de tarjetas (una por partido), no tabla plana
- Calcular ciudades distintas (`city_en`) que el equipo visitaría usando `Set`

**Reto de resiliencia:** si `/get/stadiums` falla después de que el itinerario ya se renderizó con partidos, las tarjetas no desaparecen; el campo de estadio afectado muestra "Estadio no disponible" y solo esa petición entra en backoff. Los partidos ya obtenidos no se vuelven a pedir.

---

### 3.2 — Rastreador de Goleadas

**Objetivo:** filtrado y ordenamiento numérico separando lógica de cálculo de presentación.

- Tomar únicamente partidos con `finished: true`
- Calcular diferencia absoluta entre `home_score` y `away_score`
- Filtrar partidos con diferencia ≥ 3 goles
- Ordenar de mayor a menor diferencia
- Cruzar `home_team_id` y `away_team_id` con `/get/teams` → nombre y bandera (nunca el id crudo)
- Mostrar en cabecera el total de goleadas encontradas

**Reto de resiliencia:** si `/get/teams` falla pero `/get/games` respondió correctamente, la lista se renderiza igual mostrando los ids como respaldo temporal. La petición de teams se reintenta en segundo plano con backoff; al recuperarse, los nombres reales reemplazan los ids sin recargar la página.

---

### 3.3 — El Muro

**Objetivo:** combinar datos agregados de `/get/groups` con detalle de `/get/games` para construir un ranking compuesto.

- Recorrer los 12 grupos de `/get/groups` y extraer de cada equipo su `team_id` y valor `ga` (goles en contra)
- Unificar los 48 registros en un arreglo y ordenar ascendente por `ga`
- Tomar los 5 primeros y cruzarlos con `/get/teams` → nombre y bandera
- Para cada uno de los 5: buscar en `/get/games` su próximo partido con `finished: false`, ordenado por `local_date`, y mostrar el rival

**Reto de resiliencia:** si la búsqueda del próximo rival falla para uno solo de los 5 equipos del ranking, ese registro muestra "Próximo rival no disponible" mientras los otros 4 siguen mostrando su dato completo.

---

### 3.4 — Analítica de Estadios

**Objetivo:** agregación de datos (conteos y sumas) cruzando estadios contra partidos.

- Por cada uno de los 16 estadios, contar cuántos registros de `/get/games` tienen ese `stadium_id`
- Calcular "asistencia potencial total" = `capacity × partidos_albergados`
- Ordenar estadios de mayor a menor asistencia potencial
- Renderizar gráfica de barras comparando capacidad vs partidos albergados por estadio

**Reto de resiliencia:** si los estadios se cargaron primero y la petición de partidos falla después, la gráfica entra en estado "esperando datos de partidos" sin destruir las barras de estadios ya dibujadas. Solo la petición de partidos entra en backoff exponencial.

---

### 3.5 — Radar de Empates

**Objetivo:** filtrado condicional combinado con agrupación visual.

- Filtrar partidos donde `home_score === away_score` y `finished === true`
- Agrupar por `group` (A a L)
- Renderizar matriz visual donde cada celda representa un empate con los dos equipos cruzados contra `/get/teams`
- Mostrar contador de empates por grupo

**Reto de resiliencia:** si llega un 429 mientras se construye la matriz grupo por grupo, el backoff exponencial se activa solo para la petición pendiente mostrando countdown. Los grupos ya dibujados permanecen visibles. La interfaz informa visualmente (sin `alert()`) que está reintentando.

---

## 4. Arquitectura Base de Resiliencia (Obligatoria — aplica a los 5 subproyectos)

| Requisito | Implementación |
|---|---|
| Autenticación JWT | Token obtenido en login, enviado en cada fetch como `Authorization: Bearer <token>` |
| `async/await` exclusivo | Cero `.then()` / `.catch()` en todo el código |
| Error 401 sin reload | Limpiar token → mostrar modal "Sesión expirada" → opción reautenticarse |
| Backoff exponencial (429 y 500) | Reintentos: 1 s → 2 s → 4 s → 8 s. Para 429: countdown visible en UI |
| Modo offline con `localStorage` | Guardar última respuesta exitosa por endpoint. Si falla → mostrar datos cacheados con indicador visible |
| Timeout de petición (`AbortController`) | Cada fetch tiene un límite de espera (ej. 8 s). Si el servidor no responde a tiempo, la petición se cancela y se trata como fallo de red |
| Errores de red (`TypeError`) | Si `fetch()` lanza una excepción (sin internet, DNS, CORS), se captura en `try/catch`, se muestra mensaje específico "Sin conexión" y se activa el modo offline desde `localStorage` |
| Distinción de tipo de fallo | El fetcher clasifica el error antes de actuar: `401` → sesión, `429` → rate limit + countdown, `500` → backoff servidor, `TypeError`/timeout → fallo de red + offline inmediato |

---

## 5. Plan de Respaldo ante Fallo Total de la API

### Problema que cubre
El modo offline con `localStorage` solo funciona si la app ya hizo al menos una petición exitosa previa. Si la API está completamente caída en la primera visita del usuario, `localStorage` está vacío y no hay nada que mostrar.

### Solución: datos semilla locales (último recurso)

Se incluyen archivos JSON estáticos en el proyecto con una copia real de los datos de la API. El fetcher los usa únicamente cuando:
- Todos los reintentos del backoff fallaron, **Y**
- `localStorage` no tiene caché previa del endpoint

```
data/
├── seed-teams.json      ← copia de GET /get/teams
├── seed-games.json      ← copia de GET /get/games
├── seed-stadiums.json   ← copia de GET /get/stadiums
└── seed-groups.json     ← copia de GET /get/groups
```

### Jerarquía completa de fuentes de datos

```
1. API real (fetch exitoso)           → guardar en localStorage + mostrar
2. localStorage (caché previa)        → mostrar con banner "datos no actualizados"
3. Datos semilla locales (seed JSON)  → mostrar con banner "datos de demostración"
4. Sin ninguna fuente disponible      → mensaje de error claro en UI, sin pantalla en blanco
```

### Cómo se obtienen los archivos seed
Antes de entregar el laboratorio, hacer una petición exitosa a cada endpoint y guardar la respuesta como archivo JSON en `data/`. Estos archivos son estáticos y no cambian durante la ejecución.

### Árbol de decisión del fetcher (completo)

```
fetchWithRetry(url, cacheKey)
  │
  ├─ fetch() con AbortController (timeout 8 s)
  │    │
  │    ├─ Éxito (response.ok)
  │    │    └─ guardar en localStorage → retornar datos
  │    │
  │    ├─ status 401  → clearToken() + modal sesión
  │    │
  │    ├─ status 429  → countdown visible + backoff
  │    │
  │    ├─ status 500  → backoff exponencial
  │    │
  │    └─ TypeError / AbortError (red / timeout)
  │         └─ no reintentar → ir directo a paso 2
  │
  ├─ Todos los reintentos agotados
  │    │
  │    ├─ localStorage tiene caché?
  │    │    └─ Sí → retornar caché + banner "datos no actualizados"
  │    │
  │    └─ localStorage vacío?
  │         └─ cargar seed JSON local + banner "datos de demostración"
  │
  └─ Seed también falla (archivo no existe)?
       └─ mostrar mensaje de error específico en UI, nunca pantalla en blanco
```

### Indicadores visuales por tipo de fuente

| Fuente | Banner en UI |
|---|---|
| API real | (sin banner — datos frescos) |
| localStorage | "Mostrando datos guardados — sin conexión" |
| Seed local | "Mostrando datos de demostración — API no disponible" |
| Sin fuente | "No hay datos disponibles en este momento. Intenta más tarde." |

---

## 6. Prohibiciones Absolutas

```
❌ alert()                    → nunca, ni en errores
❌ .then() / .catch()         → ni mezclado con async/await
❌ window.location.reload()   → ni como solución a errores de sesión o red
```

---

## 7. Accesibilidad e Inclusividad

**Objetivo:** cumplir como mínimo con WCAG 2.1 nivel AA para que la aplicación sea usable por personas con distintas capacidades, dispositivos (mouse, teclado, touch) y preferencias visuales. Esta sección queda documentada como requisito de diseño; su implementación en código se aborda en una fase posterior.

### 7.1 Principios de inclusividad

- HTML semántico (`<nav>`, `<main>`, `<header>`, `<button>`, `<section>`) en vez de `<div>` genéricos; usar roles ARIA solo cuando el HTML semántico no cubra el caso
- Todo elemento interactivo debe ser operable por teclado (`Tab`, `Enter`, `Espacio`), sin depender exclusivamente de mouse o touch
- Atributos `alt` descriptivos en banderas de equipos (ej. `alt="Bandera de Brasil"`), nunca `alt=""` en contenido informativo ni nombres de archivo como texto alternativo
- `aria-label` o `aria-labelledby` en botones que solo muestran íconos (ej. cerrar modal, abrir panel de accesibilidad)
- `aria-live="polite"` en banners de estado (offline, countdown, sesión expirada) para que un lector de pantalla anuncie el cambio sin interrumpir la lectura actual
- `<html lang="es">` declarado y textos de UI sin jerga técnica innecesaria
- Contraste de color mínimo 4.5:1 en texto normal y 3:1 en texto grande (WCAG 1.4.3), verificado también en modo oscuro
- Formulario de login con `<label>` asociado a cada `<input>` (`for`/`id`) y errores anunciados al usuario, no comunicados solo con color

### 7.2 Área táctil de botones (tap targets)

- Todos los botones e interactivos (nav de secciones, selector de equipos, reintentar, cerrar modal, panel de accesibilidad) deben tener un área táctil mínima de **44×44 px** (WCAG 2.5.5, Apple HIG, Material Design)
- Separación mínima de 8 px entre botones adyacentes para evitar toques accidentales en móvil
- Estados `:hover`, `:focus` y `:active` visualmente diferenciados; nunca `outline: none` sin un reemplazo visual equivalente
- Foco de teclado siempre visible (`:focus-visible`) y con orden lógico de tabulación

### 7.3 Panel de accesibilidad en la UI

Un panel o menú de accesibilidad, accesible desde cualquier sección (ícono fijo en el header, con `aria-label="Accesibilidad"`), que ofrezca:

| Control | Comportamiento |
|---|---|
| Modo oscuro / modo claro | Toggle que cambia variables CSS de color (`--bg`, `--text`, `--surface`). Valor inicial según `prefers-color-scheme`; preferencia manual del usuario persiste en `localStorage` y tiene prioridad |
| Ajuste de tamaño de texto | Control con al menos 3 niveles (normal / grande / muy grande) que escala una variable CSS raíz (ej. `--font-scale`) usando `rem`, sin romper el layout ni truncar contenido |
| Persistencia de preferencias | Tema y tamaño de texto se guardan en `localStorage` y se aplican antes del primer render para evitar parpadeo (FOUC) |

Lineamientos técnicos para cuando se implemente:
- Variables CSS centralizadas (`:root { --bg: ...; --text: ...; }`) para que cambiar de tema no duplique reglas
- Tipografía y espaciados en `rem`/`em`, nunca `px` fijos, para que el escalado de texto no rompa el diseño
- El modo oscuro debe mantener el mismo contraste mínimo que el modo claro, no solo invertir colores
- El panel de accesibilidad en sí debe cumplir los mismos requisitos de tap target y navegación por teclado que el resto de la app

### 7.4 Checklist de accesibilidad (a validar antes de la entrega)

- [x] Navegación completa de la app usando solo teclado
- [x] Contraste de texto verificado (DevTools → Lighthouse → Accessibility, o WebAIM Contrast Checker)
- [x] Todas las imágenes/banderas tienen `alt` descriptivo
- [x] Todos los botones tienen mínimo 44×44 px de área táctil
- [x] Modo oscuro y modo claro disponibles y persistentes
- [x] Ajuste de tamaño de texto disponible y persistente
- [x] Foco visible en todos los elementos interactivos
- [x] Auditoría Lighthouse (Accessibility) ≥ 90 puntos — **100/100**

---

## 8. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Lenguaje | JavaScript ES2022+ | Obligatorio según instrucciones |
| Asincronismo | `async/await` + `fetch` nativo | Exigido explícitamente |
| Persistencia offline | `localStorage` | Exigido explícitamente |
| HTML | HTML5 semántico | Estructura base |
| CSS | CSS3 + Variables CSS | Estilos sin dependencias externas |
| Gráfica (2.4) | Canvas API o SVG manual | Sin librerías externas |
| Sin frameworks | Vanilla JS puro | El laboratorio evalúa DOM manipulation directa |
| Dev tools | Chrome DevTools (Console + Network) | Requerido para la defensa |
| Servidor de desarrollo | Vite (`npm run dev`, `server.proxy`) | La API de `worldcup26.ir` no envía `Access-Control-Allow-Origin` para `localhost`; el proxy de Vite reenvía `/api/*` al backend real servidor-a-servidor, evitando el bloqueo de CORS sin tocar el backend (ver `docs/estudio.md` §6) |

> **Sin React, sin jQuery, sin Chart.js.** Vanilla JS puro: los scripts siguen siendo `<script src="...">` clásicos, no módulos ES, y Vite no se usa como bundler ni framework. El único paquete de npm del proyecto es Vite, y su único rol es servir los archivos estáticos y hacer de proxy CORS en desarrollo — `server.proxy` no existe en `vite build`, así que no aplica en producción.

---

## 9. Estructura de Archivos

> Actualizado para reflejar el árbol real del repo (no solo el diseño original) — ver `docs/estudio.md` para el porqué de cada decisión de reorganización, en particular el paso de `css/styles.css` a la estructura modular.

```
laboratorio-dos/
├── package.json                 ← devDependency: vite; scripts dev/build/preview
├── vite.config.js               ← server.proxy: /api → https://worldcup26.ir (evita CORS en dev)
├── index.html                   ← Shell principal: login, modal de sesión, panel de accesibilidad, navegación de 5 secciones
├── img/
│   └── login-bg.jpg             ← Fondo del panel izquierdo del login
├── css/
│   ├── main.css                 ← Solo @imports, en el orden en que deben cargar: base → utilities → layout → components → pages → sections
│   ├── utilities.css            ← .hidden, .sr-only, foco visible global, animación .section
│   ├── base/
│   │   ├── variables.css        ← :root (tema claro) + [data-theme="dark"] + [data-font-scale] — única fuente de verdad de color/espaciado
│   │   └── reset.css            ← box-sizing, body base, font-size raíz escalado por --font-scale
│   ├── layout/
│   │   ├── app-shell.css        ← #app-screen, topbar (móvil), banners globales, main
│   │   └── sidebar.css          ← sidebar de navegación (completo / rail / drawer según breakpoint)
│   ├── components/               ← piezas reutilizadas por 2+ secciones o pantallas
│   │   ├── forms.css             ← inputs, .error-msg
│   │   ├── buttons.css           ← .btn-login, #reauth-btn
│   │   ├── modal.css             ← .modal, .modal-overlay (sesión expirada + panel de accesibilidad)
│   │   ├── card.css               ← .card, hover compartido de .rg-card/.em-card
│   │   ├── status.css             ← .loading, .offline, .countdown, .rc-state, skeletons
│   │   ├── search.css             ← selector de equipos (2.1)
│   │   ├── timeline.css           ← itinerario de partidos (2.1)
│   │   ├── badge.css              ← .badge, .chip
│   │   ├── hero.css                ← encabezado de cada sección (.rc-hero-*)
│   │   └── accessibility-panel.css ← panel de accesibilidad (Fase 8)
│   ├── pages/
│   │   └── login.css             ← #login-screen, tema claro fijo (no hereda data-theme)
│   └── sections/                 ← una hoja por subproyecto, solo lo específico de esa sección
│       ├── ruta-campeon.css        (2.1)
│       ├── rastreador-goleadas.css (2.2)
│       ├── el-muro.css             (2.3)
│       ├── analitica-estadios.css  (2.4)
│       └── radar-empates.css       (2.5)
├── public/                      ← servido tal cual por Vite en la raíz del sitio (dev y build)
│   └── data/                    ← datos semilla (último recurso si API y localStorage fallan)
│       ├── seed-teams.json      ← copia de GET /get/teams
│       ├── seed-games.json      ← copia de GET /get/games
│       ├── seed-stadiums.json   ← copia de GET /get/stadiums
│       └── seed-groups.json     ← copia de GET /get/groups
├── js/
│   ├── api/
│   │   ├── auth.js              ← login(), getToken(), clearToken(), isAuthenticated()
│   │   ├── fetcher.js           ← fetchWithAuth(), fetchWithRetry() — núcleo de resiliencia
│   │   └── endpoints.js         ← getTeams/getGames/getStadiums/getGroups + withEndpointCache() (memoización en memoria)
│   ├── ui/
│   │   ├── modal.js             ← showExpiredSessionModal(), hideExpiredSessionModal(), showModalError()
│   │   ├── countdown.js         ← renderCountdown(seconds, containerId)
│   │   ├── offline.js           ← saveToCache/readFromCache, showOfflineBanner(), showSeedBanner(), hideAllBanners()
│   │   ├── sidebar.js           ← drawer off-canvas en móvil (abrir/cerrar, overlay, Escape)
│   │   └── accessibility.js     ← panel de accesibilidad: tema, tamaño de texto, focus trap (Fase 8)
│   ├── sections/
│   │   ├── shared.js              ← helpers comunes: findById, formatMatchDate, getPhaseLabel, renderStateBlock
│   │   ├── rutaCampeon.js         ← 2.1
│   │   ├── rastreadorGoleadas.js  ← 2.2
│   │   ├── elMuro.js              ← 2.3
│   │   ├── analiticaEstadios.js   ← 2.4
│   │   └── radarEmpates.js        ← 2.5
│   └── main.js                  ← Orquestador: inicialización, navegación, eventos globales
└── docs/
    ├── Instrucciones.md
    ├── PlanProyecto.md
    └── estudio.md                ← estudio técnico fase por fase + preguntas de defensa
```

### ¿Por qué `data/` pasó a vivir dentro de `public/data/`?

Vite solo sirve como archivos estáticos, sin procesar, lo que está dentro de `public/` — tanto en `vite dev` como en `vite build`. El fetcher pide los seed con una ruta relativa a la raíz del sitio (`fetch('data/seed-${cacheKey}.json')`), así que esos archivos tienen que estar en `public/data/`, no en un `data/` suelto en la raíz del repo, para que esa ruta resuelva igual en desarrollo y en producción.

---

## 10. Diseño de Módulos Clave Compartidos

### 8.1 `fetcher.js` — Núcleo de resiliencia

Responsabilidades:
1. Adjuntar JWT en cada petición
2. Aplicar timeout con `AbortController` (límite configurable, ej. 8 s)
3. Detectar 401 → disparar flujo de sesión expirada
4. Detectar 429 / 500 → backoff exponencial con reintentos
5. Capturar `TypeError` y errores de abort → clasificar como fallo de red
6. Guardar respuesta exitosa en `localStorage` con clave por endpoint
7. Si falla y hay caché → retornar caché + marcar como offline

```
Árbol de decisión del fetcher:

try { fetch() con AbortController }
catch (TypeError o AbortError)
  → "Sin conexión / Timeout"
  → mostrar caché offline si existe
  → NO entra en backoff (no hay servidor que reintentar)

response.status 401  → clearToken() + modal sesión expirada
response.status 429  → backoff + countdown visible
response.status 500  → backoff exponencial
response.ok === true → guardar en localStorage + retornar datos
```

```
Backoff (para 429 y 500 solamente):
  intento 0 → falla → espera 1 000 ms
  intento 1 → falla → espera 2 000 ms
  intento 2 → falla → espera 4 000 ms
  intento 3 → falla → espera 8 000 ms → usar caché o error final
```

```javascript
// Patrón de timeout con AbortController
async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error; // TypeError (red) o AbortError (timeout) — ambos se tratan igual
  }
}
```

### 8.2 `auth.js` — Autenticación

```
login(email, pass)   → POST /auth/authenticate → guarda token en localStorage
getToken()           → retorna token actual
clearToken()         → elimina token (se llama en 401)
isAuthenticated()    → boolean
```

### 8.3 Flujo de error 401 (compartido)

```
fetch() → response.status === 401
  → clearToken()
  → showExpiredSessionModal()
  → [usuario clic "Reautenticarse"]
  → login() → nuevo token
  → reintentar petición original automáticamente
```

### 8.4 `endpoints.js` — Abstracción de la API

```
getTeams()     → GET /get/teams    (cacheKey: 'teams')
getGames()     → GET /get/games    (cacheKey: 'games')
getStadiums()  → GET /get/stadiums (cacheKey: 'stadiums')
getGroups()    → GET /get/groups   (cacheKey: 'groups')
```

Cada función llama internamente a `fetchWithAuth()` y gestiona el modo offline de forma transparente.

---

## 11. Navegación entre Secciones

La aplicación usa una navegación tipo pestaña o menú lateral. Al cambiar de sección:
- Se oculta la sección activa y se muestra la seleccionada
- Cada sección inicializa sus datos de forma independiente (lazy loading)
- El estado de error o backoff de una sección no afecta a las demás
- El modal de sesión expirada es global y aplica a todas las secciones
- Cada botón de sección cumple los requisitos de [accesibilidad e inclusividad](#7-accesibilidad-e-inclusividad): mínimo 44×44 px de área táctil, foco visible al navegar con teclado, y `aria-current="page"` en la sección activa para lectores de pantalla

```html
<!-- Estructura de navegación sugerida -->
<nav aria-label="Secciones del proyecto">
  <button data-section="ruta-campeon" aria-current="page">La Ruta del Campeón</button>
  <button data-section="rastreador-goleadas">Rastreador de Goleadas</button>
  <button data-section="el-muro">El Muro</button>
  <button data-section="analitica-estadios">Analítica de Estadios</button>
  <button data-section="radar-empates">Radar de Empates</button>
</nav>
```

---

## 12. Plan de Implementación (Fases)

### Fase 1 — Infraestructura base (Día 1)
- [x] Crear estructura de carpetas y archivos
- [x] `index.html` con shell de navegación de 5 secciones y modal de sesión
- [x] `styles.css`: layout, paleta, clases de estado (`.offline`, `.error`, `.loading`, `.expired`, `.countdown`)
- [x] `auth.js` completo: login, token, clearToken
- [x] Formulario de login + modal de sesión expirada

### Fase 2 — Fetcher con resiliencia completa (Día 2)
- [x] `fetchWithAuth()`: adjuntar JWT, detectar 401
- [x] `fetchWithRetry()`: backoff exponencial para 429 y 500
- [x] `countdown.js`: countdown visual con `setInterval`
- [x] `offline.js`: guardar/leer localStorage, mostrar banner de datos no actualizados
- [x] `endpoints.js`: las 4 funciones de acceso a la API

### Fase 3 — Subproyecto 2.1 La Ruta del Campeón (Día 3)
- [x] Selector de 48 equipos poblado desde `getTeams()`
- [x] Filtrado de partidos por equipo y ordenamiento por `local_date`
- [x] Cruce con stadiums por tarjeta de forma independiente
- [x] Contador de ciudades distintas con `Set`
- [x] Reto de resiliencia: tarjetas persistentes si stadiums falla

### Fase 4 — Subproyecto 2.2 Rastreador de Goleadas (Día 3-4)
- [x] Filtrado de partidos `finished: true`
- [x] Cálculo de diferencia de goles y filtro ≥ 3
- [x] Ordenamiento de mayor a menor diferencia
- [x] Cruce con teams → nombres y banderas
- [x] Reto de resiliencia: renderizar con ids si teams falla, reemplazar nombres cuando se recupere

### Fase 5 — Subproyecto 2.3 El Muro (Día 4)
- [x] Recorrido de 12 grupos y extracción de `team_id` + `ga`
- [x] Unificación en arreglo único, ordenamiento ascendente por `ga`
- [x] Top 5 cruzado con teams → nombre y bandera
- [x] Próximo partido `finished: false` para cada uno de los 5
- [x] Reto de resiliencia: "Próximo rival no disponible" solo en el equipo que falla

### Fase 6 — Subproyecto 2.4 Analítica de Estadios (Día 4-5)
- [x] Conteo de partidos por `stadium_id`
- [x] Cálculo de asistencia potencial (`capacity × partidos`)
- [x] Ordenamiento y renderizado de gráfica de barras (Canvas API o SVG)
- [x] Reto de resiliencia: barras de estadios persisten si la petición de games falla

### Fase 7 — Subproyecto 2.5 Radar de Empates (Día 5)
- [x] Filtrado de empates (`home_score === away_score && finished === true`)
- [x] Agrupación por `group` (A–L)
- [x] Matriz visual con equipos cruzados de teams
- [x] Contador de empates por grupo
- [x] Reto de resiliencia: countdown visible por 429, grupos ya dibujados permanecen

### Fase 8 — Accesibilidad e Inclusividad (Día 5-6)
- [x] Panel de accesibilidad en el header, accesible por teclado y con `aria-label`
- [x] Toggle de modo oscuro / modo claro con variables CSS y persistencia en `localStorage`
- [x] Control de ajuste de tamaño de texto (mínimo 3 niveles) con persistencia
- [x] Verificar tap targets ≥ 44×44 px en todos los botones (nav, selectores, modal, panel)
- [x] Verificar contraste AA en modo claro y modo oscuro
- [x] Verificar navegación completa por teclado y foco visible en las 5 secciones
- [x] Auditoría Lighthouse (Accessibility) ≥ 90 puntos — **100/100** obtenido

### Fase 9 — Pruebas y defensa (Día 6)
- [x] Simular 401: borrar/modificar token en DevTools → verificar modal sin reload
- [x] Simular 429: interceptar respuesta → verificar countdown + reintentos en Network
- [x] Simular 500: bloquear request → verificar backoff + localStorage fallback
- [x] Simular offline: DevTools → Network → Offline → verificar banner de datos no actualizados
- [x] Probar reto de resiliencia de cada uno de los 5 subproyectos
- [x] Verificar cero `alert()`, cero `.then()/.catch()`, cero `reload()` en todo el código — se encontró y corrigió un `.then()/.catch()` real en `endpoints.js`
- [x] Preparar respuestas de defensa (sección 13)

---

## 13. Preparación para la Defensa Técnica

### Preguntas teóricas clave

**¿Qué pasa si la API devuelve 500 al pedir /get/games?**
> `fetchWithRetry` detecta el status 500, espera 1 s y reintenta hasta 4 veces con espera exponencial. Si todos los reintentos fallan, muestra datos cacheados de `localStorage` con indicador de offline. Si no hay caché, muestra error en UI sin romper la página ni quedar en blanco.

**¿Por qué async/await y no .then/.catch?**
> `async/await` permite escribir código asíncrono con apariencia síncrona, facilita el manejo de errores con bloques `try/catch` estándar, mejora la legibilidad y evita el anidamiento de callbacks. El laboratorio lo exige porque es el modelo asíncrono moderno de JavaScript.

**¿Qué ocurre si el token JWT expira mientras se cruzan datos entre colecciones?**
> En un cruce de datos se hacen múltiples fetch encadenados o independientes. Si alguno retorna 401, `fetchWithAuth` llama a `clearToken()` y muestra el modal de sesión expirada. Los datos ya cargados permanecen en pantalla. Al reautenticarse, solo se reintenta la petición que falló.

**¿Por qué no usar window.location.reload()?**
> `reload()` destruye el estado actual de la aplicación: borra datos ya cargados en memoria, cancela peticiones pendientes y obliga al usuario a empezar de cero. El laboratorio exige manejar la sesión expirada sin perder ese estado, demostrando control real del DOM y del flujo asíncrono.

**¿Qué pasa si las peticiones cruzadas llegan en orden distinto al esperado?**
> Cada elemento de UI actualiza su propio contenedor identificado por ID. No hay dependencia de orden entre peticiones paralelas o cuasi-paralelas. El resultado final es siempre correcto porque cada dato actualiza solo su celda correspondiente.

**¿Por qué en el Reto de Resiliencia de cada subproyecto no se borran los datos ya mostrados?**
> Porque el fallo es parcial: uno de los recursos cruzados falla, no la vista completa. Borrar todo implicaría perder datos ya válidos. La resiliencia correcta consiste en degradar solo la parte afectada y reintentar en segundo plano.

**`endpoints.js` memoiza cada petición en una promesa (`withEndpointCache`) — ¿por qué no usa `.then()/.catch()` si está envolviendo una promesa?**
> Porque la prohibición es absoluta: cero `.then`/`.catch` en todo el código, incluida la capa de caché. `withEndpointCache` guarda una IIFE `async` (`(async () => { try { ... } catch { ... } })()`) en `endpointCache[cacheKey]` — sigue devolviendo una promesa reutilizable por las tres+ secciones que piden el mismo endpoint casi al mismo tiempo, pero el cuerpo interno usa `try/catch` igual que el resto del proyecto.

**2.4 pide una "gráfica de barras" — ¿por qué SVG manual y no Canvas ni una librería?**
> El stack tecnológico permite Canvas *o* SVG manual, ambos sin librerías. Se eligió SVG (`renderAeSvgBar()` genera `<svg><rect>` por cada barra con JS) porque cada barra sigue siendo un elemento del DOM: se puede inspeccionar en DevTools, hereda las variables de color del tema (claro/oscuro) sin lógica de repintado, y no exige gestionar un `<canvas>` que se re-dibuja a mano en cada resize.

**El Reto de Resiliencia de 2.4 dice "esperando datos de partidos" — ¿cómo se distingue eso de "0 partidos"?**
> `computeAnaliticaEstadiosStats()` calcula `matches` como `null` mientras `games` no ha llegado (no como `0`). El render distingue los tres estados por separado: `null` → "esperando datos de partidos…", `gamesUnavailable === true` → aviso con botón reintentar, y solo un valor numérico real (incluido `0`) se muestra como "0 partidos". Verificado con Playwright bloqueando `/get/games` y su seed: las 16 barras de capacidad persisten y cada fila cae al estado de espera sin perder lo ya dibujado.

**¿Por qué el modo oscuro no es solo invertir los colores?**
> Varias variables de color (`--color-primary`, `--color-accent`, etc.) se usan como fondo sólido con texto blanco encima (botones, gradientes) — esas *no* cambian entre temas porque su contraste ya es válido en ambos. Pero un puñado de sitios usa esos mismos colores como texto directo sobre el fondo de página (`.rc-hero-eyebrow`, `.sidebar-brand`) — para esos se creó un segundo grupo de variables (`--text-accent-strong`, `--text-primary-strong`, `--text-success-strong`) que sí cambian en `[data-theme="dark"]`, verificadas en ≥4.5:1 contra el fondo oscuro real. Invertir todo a ciegas habría dejado texto oscuro sobre fondo oscuro en varios componentes.

**¿Cómo se evita el parpadeo (FOUC) al aplicar el tema guardado?**
> Un `<script>` inline al inicio de `<head>` en `index.html` —antes del `<link>` del CSS— lee `localStorage` de forma síncrona y aplica `data-theme`/`data-font-scale` al `<html>` antes de que el navegador pinte la página. Si ese código viviera en `js/ui/accessibility.js` (cargado al final del `<body>`), el usuario vería un flash del tema por defecto antes del cambio.

### Pruebas en DevTools a practicar

| Prueba | Cómo simularla | Qué debe verse |
|---|---|---|
| Error 401 | DevTools → Application → Storage → borrar o corromper token | Modal "Sesión expirada", sin reload, sin pantalla en blanco |
| Error 429 | DevTools → Network → bloquear/interceptar request | Countdown visible, reintentos con espera creciente en Network tab |
| Error 500 | DevTools → Network → Block request URL | Backoff en Network, datos de localStorage con banner offline si existen |
| Modo offline | DevTools → Network → "No throttling" → Offline | Datos cacheados visibles con indicador de "datos no actualizados" |
| Reto 2.1 | Bloquear /get/stadiums después de que itinerario renderizó | Tarjetas de partidos permanecen, campo de estadio muestra "no disponible" |
| Reto 2.2 | Bloquear /get/teams después de obtener games | Lista de goleadas visible con nombres de respaldo (`home_team_name_en`/`away_team_name_en`, ya vienen en el payload de games) en vez de un id crudo |
| Reto 2.3 | Corromper el dato de un equipo puntual del Top 5 (no un fetch — el próximo rival se calcula localmente sobre `games` ya cargado) | El `try/catch` de `renderElMuroCard` aísla solo esa tarjeta con "Próximo rival no disponible"; las otras 4 no se ven afectadas |
| Reto 2.4 | Bloquear /get/games (y su seed) después de obtener estadios | Las 16 barras de capacidad permanecen, cada fila cae a "esperando datos de partidos…", aviso con botón reintentar |
| Reto 2.5 | Forzar 429 durante construcción de matriz | Grupos ya dibujados permanecen, countdown visible |
| Timeout / alta latencia | DevTools → Network → "Slow 3G" o "Custom" con latencia muy alta | Petición se cancela a los 8 s, mensaje "Sin conexión", datos de caché visibles |
| Red caída (TypeError) | DevTools → Network → Offline (antes de cargar) | `fetch` lanza excepción, mensaje "Sin conexión" en UI, sin pantalla en blanco |
| API caída + localStorage vacío | Offline + borrar localStorage desde DevTools → Application | App carga desde seed JSON con banner "datos de demostración" |
| API caída + localStorage con caché | Offline con datos previos en localStorage | App muestra caché con banner "datos no actualizados" (prioridad sobre seed) |
| Panel de accesibilidad | Abrir con teclado (Tab hasta "Accesibilidad", Enter), cambiar tema y tamaño de texto | Foco entra al botón cerrar, `Tab` no se escapa del panel, `Escape` cierra y devuelve el foco al botón que lo abrió |
| Persistencia de tema | Elegir "Oscuro", recargar la página (F5) | El tema oscuro se aplica antes del primer pintado, sin parpadeo al claro |
| Login con tema oscuro guardado | Cerrar sesión con "Oscuro" activo, ver `#login-screen` | El panel de login se mantiene siempre en su tema claro fijo, no hereda `data-theme="dark"` |

---

## 14. Aspectos Críticos a No Olvidar

1. **JWT en cada fetch** — sin excepción, incluyendo el primer request de cada sección
2. **Cache key por endpoint** — `'teams'`, `'games'`, `'stadiums'`, `'groups'` en `localStorage`
3. **Reto de resiliencia independiente por sección** — el fallo en una sección no debe afectar las otras
4. **Countdown con `setInterval`** — decrementar y mostrar segundos reales antes del reintento 429
5. **Sin `alert()`** — todos los mensajes van al DOM (elementos `<p>`, `<div>`, banners)
6. **Ciudades distintas (2.1)** — usar `new Set(partidos.map(p => p.city_en)).size`
7. **Gráfica sin librerías (2.4)** — Canvas 2D API o SVG generado dinámicamente con JS
8. **Separación datos/presentación** — `api/` solo retorna datos; `sections/` maneja el DOM
9. **Lazy loading por sección** — cargar datos de una sección solo cuando el usuario la activa
10. **Estado de carga visible** — mostrar spinner o mensaje "Cargando..." mientras llegan los datos
11. **`AbortController` en cada fetch** — nunca dejar una petición colgada indefinidamente; timeout de 8 s por defecto
12. **Distinguir `TypeError` de error HTTP** — red caída / timeout → modo offline inmediato sin backoff; 500/429 → backoff con reintentos
13. **Mensaje de error específico por tipo** — "Sin conexión", "Servidor no disponible", "Sesión expirada", "Límite de peticiones" son textos distintos en la UI
14. **Accesibilidad no es opcional** — tap targets de 44×44 px, contraste AA, foco visible y navegación por teclado en los 5 subproyectos, no solo en la pantalla principal (ver [sección 7](#7-accesibilidad-e-inclusividad))
15. **Preferencias de tema y texto persistentes** — modo oscuro/claro y tamaño de texto se leen de `localStorage` antes del primer render para evitar parpadeo

---

## 15. Criterios de Éxito por Rubro (rúbrica)

| Rubro | Indicador de éxito |
|---|---|
| Funcionalidades de los 5 subproyectos (10 pts) | Todos los cruces de datos funcionan, cálculos correctos, sin ids crudos en UI |
| async/await + JWT (10 pts) | Grep del código → cero `.then`, cero `.catch`, JWT en todos los headers |
| 401 + 429 (10 pts) | Modal de sesión sin reload, countdown visible y funcional para 429 |
| 500 + Offline + Reto de resiliencia (10 pts) | Backoff activo, localStorage fallback, datos parciales sobreviven fallo parcial |
| Prohibiciones + organización (10 pts) | Grep de `alert(`, `.then(`, `reload(` retorna cero resultados; api/ y sections/ separados |

---

## 16. Recursos y Referencias

- API del Mundial 2026: `https://worldcup26.ir`
- MDN — Fetch API: `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API`
- MDN — async/await: `https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises`
- MDN — localStorage: `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`
- MDN — Canvas API: `https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API`
- MDN — Set: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set`
- MDN — Authorization header: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization`
- WCAG 2.1 (guía de accesibilidad): `https://www.w3.org/WAI/WCAG21/quickref/`
- WCAG 2.5.5 Target Size (tap targets): `https://www.w3.org/WAI/WCAG21/Understanding/target-size.html`
- WebAIM — Contrast Checker: `https://webaim.org/resources/contrastchecker/`
- MDN — `prefers-color-scheme`: `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme`
- MDN — ARIA `aria-live`: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live`
