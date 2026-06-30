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
| `POST /auth/login` | Toda la app (autenticación) |
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

## 6. Stack Tecnológico

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

> **Sin npm, sin React, sin jQuery, sin Chart.js.** Vanilla JS puro.

---

## 7. Estructura de Archivos Recomendada

```
laboratorio-dos/
├── index.html                  ← Shell principal con navegación entre las 5 secciones
├── css/
│   └── styles.css              ← Layout, estados: .offline, .error, .loading, .expired
├── data/                       ← Datos semilla (último recurso si API y localStorage fallan)
│   ├── seed-teams.json         ← Copia real de GET /get/teams
│   ├── seed-games.json         ← Copia real de GET /get/games
│   ├── seed-stadiums.json      ← Copia real de GET /get/stadiums
│   └── seed-groups.json        ← Copia real de GET /get/groups
├── js/
│   ├── api/
│   │   ├── auth.js             ← login(), getToken(), clearToken(), isAuthenticated()
│   │   ├── fetcher.js          ← fetchWithAuth(), fetchWithRetry() — núcleo de resiliencia
│   │   └── endpoints.js        ← getTeams(), getGames(), getStadiums(), getGroups()
│   ├── ui/
│   │   ├── modal.js            ← showExpiredSession(), hideModal()
│   │   ├── countdown.js        ← renderCountdown(seconds, containerId)
│   │   └── offline.js          ← showOfflineBanner(), showSeedBanner(), hideAllBanners()
│   ├── sections/
│   │   ├── rutaCampeon.js      ← Lógica + UI del subproyecto 2.1
│   │   ├── rastreadorGoleadas.js ← Lógica + UI del subproyecto 2.2
│   │   ├── elMuro.js           ← Lógica + UI del subproyecto 2.3
│   │   ├── analiticaEstadios.js ← Lógica + UI del subproyecto 2.4
│   │   └── radarEmpates.js     ← Lógica + UI del subproyecto 2.5
│   └── main.js                 ← Orquestador: inicialización, navegación, eventos globales
└── docs/
    ├── Instrucciones.md
    └── PlanProyecto.md
```

---

## 8. Diseño de Módulos Clave Compartidos

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
login(user, pass)    → POST /auth/login → guarda token en localStorage
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

## 9. Navegación entre Secciones

La aplicación usa una navegación tipo pestaña o menú lateral. Al cambiar de sección:
- Se oculta la sección activa y se muestra la seleccionada
- Cada sección inicializa sus datos de forma independiente (lazy loading)
- El estado de error o backoff de una sección no afecta a las demás
- El modal de sesión expirada es global y aplica a todas las secciones

```html
<!-- Estructura de navegación sugerida -->
<nav>
  <button data-section="ruta-campeon">La Ruta del Campeón</button>
  <button data-section="rastreador-goleadas">Rastreador de Goleadas</button>
  <button data-section="el-muro">El Muro</button>
  <button data-section="analitica-estadios">Analítica de Estadios</button>
  <button data-section="radar-empates">Radar de Empates</button>
</nav>
```

---

## 10. Plan de Implementación (Fases)

### Fase 1 — Infraestructura base (Día 1)
- [ ] Crear estructura de carpetas y archivos
- [ ] `index.html` con shell de navegación de 5 secciones y modal de sesión
- [ ] `styles.css`: layout, paleta, clases de estado (`.offline`, `.error`, `.loading`, `.expired`, `.countdown`)
- [ ] `auth.js` completo: login, token, clearToken
- [ ] Formulario de login + modal de sesión expirada

### Fase 2 — Fetcher con resiliencia completa (Día 2)
- [ ] `fetchWithAuth()`: adjuntar JWT, detectar 401
- [ ] `fetchWithRetry()`: backoff exponencial para 429 y 500
- [ ] `countdown.js`: countdown visual con `setInterval`
- [ ] `offline.js`: guardar/leer localStorage, mostrar banner de datos no actualizados
- [ ] `endpoints.js`: las 4 funciones de acceso a la API

### Fase 3 — Subproyecto 2.1 La Ruta del Campeón (Día 3)
- [ ] Selector de 48 equipos poblado desde `getTeams()`
- [ ] Filtrado de partidos por equipo y ordenamiento por `local_date`
- [ ] Cruce con stadiums por tarjeta de forma independiente
- [ ] Contador de ciudades distintas con `Set`
- [ ] Reto de resiliencia: tarjetas persistentes si stadiums falla

### Fase 4 — Subproyecto 2.2 Rastreador de Goleadas (Día 3-4)
- [ ] Filtrado de partidos `finished: true`
- [ ] Cálculo de diferencia de goles y filtro ≥ 3
- [ ] Ordenamiento de mayor a menor diferencia
- [ ] Cruce con teams → nombres y banderas
- [ ] Reto de resiliencia: renderizar con ids si teams falla, reemplazar nombres cuando se recupere

### Fase 5 — Subproyecto 2.3 El Muro (Día 4)
- [ ] Recorrido de 12 grupos y extracción de `team_id` + `ga`
- [ ] Unificación en arreglo único, ordenamiento ascendente por `ga`
- [ ] Top 5 cruzado con teams → nombre y bandera
- [ ] Próximo partido `finished: false` para cada uno de los 5
- [ ] Reto de resiliencia: "Próximo rival no disponible" solo en el equipo que falla

### Fase 6 — Subproyecto 2.4 Analítica de Estadios (Día 4-5)
- [ ] Conteo de partidos por `stadium_id`
- [ ] Cálculo de asistencia potencial (`capacity × partidos`)
- [ ] Ordenamiento y renderizado de gráfica de barras (Canvas API o SVG)
- [ ] Reto de resiliencia: barras de estadios persisten si la petición de games falla

### Fase 7 — Subproyecto 2.5 Radar de Empates (Día 5)
- [ ] Filtrado de empates (`home_score === away_score && finished === true`)
- [ ] Agrupación por `group` (A–L)
- [ ] Matriz visual con equipos cruzados de teams
- [ ] Contador de empates por grupo
- [ ] Reto de resiliencia: countdown visible por 429, grupos ya dibujados permanecen

### Fase 8 — Pruebas y defensa (Día 6)
- [ ] Simular 401: borrar/modificar token en DevTools → verificar modal sin reload
- [ ] Simular 429: interceptar respuesta → verificar countdown + reintentos en Network
- [ ] Simular 500: bloquear request → verificar backoff + localStorage fallback
- [ ] Simular offline: DevTools → Network → Offline → verificar banner de datos no actualizados
- [ ] Probar reto de resiliencia de cada uno de los 5 subproyectos
- [ ] Verificar cero `alert()`, cero `.then()/.catch()`, cero `reload()` en todo el código
- [ ] Preparar respuestas de defensa (sección 11)

---

## 11. Preparación para la Defensa Técnica

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

### Pruebas en DevTools a practicar

| Prueba | Cómo simularla | Qué debe verse |
|---|---|---|
| Error 401 | DevTools → Application → Storage → borrar o corromper token | Modal "Sesión expirada", sin reload, sin pantalla en blanco |
| Error 429 | DevTools → Network → bloquear/interceptar request | Countdown visible, reintentos con espera creciente en Network tab |
| Error 500 | DevTools → Network → Block request URL | Backoff en Network, datos de localStorage con banner offline si existen |
| Modo offline | DevTools → Network → "No throttling" → Offline | Datos cacheados visibles con indicador de "datos no actualizados" |
| Reto 2.1 | Bloquear /get/stadiums después de que itinerario renderizó | Tarjetas de partidos permanecen, campo de estadio muestra "no disponible" |
| Reto 2.2 | Bloquear /get/teams después de obtener games | Lista de goleadas visible con ids en lugar de nombres |
| Reto 2.3 | Bloquear próximo partido de uno de los 5 equipos | Solo ese registro muestra "Próximo rival no disponible" |
| Reto 2.4 | Bloquear /get/games después de obtener estadios | Barras de estadios permanecen en estado de espera |
| Reto 2.5 | Forzar 429 durante construcción de matriz | Grupos ya dibujados permanecen, countdown visible |
| Timeout / alta latencia | DevTools → Network → "Slow 3G" o "Custom" con latencia muy alta | Petición se cancela a los 8 s, mensaje "Sin conexión", datos de caché visibles |
| Red caída (TypeError) | DevTools → Network → Offline (antes de cargar) | `fetch` lanza excepción, mensaje "Sin conexión" en UI, sin pantalla en blanco |
| API caída + localStorage vacío | Offline + borrar localStorage desde DevTools → Application | App carga desde seed JSON con banner "datos de demostración" |
| API caída + localStorage con caché | Offline con datos previos en localStorage | App muestra caché con banner "datos no actualizados" (prioridad sobre seed) |

---

## 12. Aspectos Críticos a No Olvidar

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

---

## 13. Criterios de Éxito por Rubro (rúbrica)

| Rubro | Indicador de éxito |
|---|---|
| Funcionalidades de los 5 subproyectos (10 pts) | Todos los cruces de datos funcionan, cálculos correctos, sin ids crudos en UI |
| async/await + JWT (10 pts) | Grep del código → cero `.then`, cero `.catch`, JWT en todos los headers |
| 401 + 429 (10 pts) | Modal de sesión sin reload, countdown visible y funcional para 429 |
| 500 + Offline + Reto de resiliencia (10 pts) | Backoff activo, localStorage fallback, datos parciales sobreviven fallo parcial |
| Prohibiciones + organización (10 pts) | Grep de `alert(`, `.then(`, `reload(` retorna cero resultados; api/ y sections/ separados |

---

## 14. Recursos y Referencias

- API del Mundial 2026: `https://worldcup26.ir`
- MDN — Fetch API: `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API`
- MDN — async/await: `https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises`
- MDN — localStorage: `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`
- MDN — Canvas API: `https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API`
- MDN — Set: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set`
- MDN — Authorization header: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization`
