# Estudio Técnico — Laboratorio 2 (Fases 1–9)

Documento de estudio y preparación para la defensa técnica. Cada fase del `PlanProyecto.md` tiene su propia sección aquí: qué se construyó, por qué se tomó cada decisión de diseño, y las preguntas de defensa asociadas — incluidos los bugs reales que se encontraron y corrigieron en el camino (no solo lo que salió bien a la primera).

---

# Estudio Técnico — Fase 1: Infraestructura Base

---

## ¿Qué se construyó en esta fase?

La capa de infraestructura que todas las secciones de la aplicación van a usar: la pantalla de login rediseñada con layout dividido, la navegación entre las 5 secciones, el módulo de autenticación JWT contra la API real de worldcup26.ir, y el modal de sesión expirada.

---

## 1. Estructura HTML (`index.html`)

### ¿Cómo está organizado el HTML?

El archivo tiene tres bloques principales:

```
#login-screen   → pantalla inicial de autenticación (layout 60/40)
#session-modal  → modal que aparece cuando el token expira durante el uso
#app-screen     → shell de la aplicación (navegación + 5 secciones)
```

### ¿Cómo está construida la pantalla de login?

El `#login-screen` usa `display: flex` con dos paneles:

```
.login-panel-left  (60%) → imagen de fondo + overlay oscuro + logo + hero copy
.login-panel-right (40%) → fondo claro + formulario centrado
```

**Panel izquierdo:** usa `background-image: url('../img/login-bg.jpg')` con `background-size: cover`. Un pseudo-elemento `::after` con `position: absolute` superpone un degradado oscuro (`rgba(10,20,35,.78 → .48)`) para que el texto blanco sea legible sobre la imagen.


**Panel derecho:** fondo `#F3F4F6` (gris muy claro). Contiene `.login-form-wrapper` con `max-width: 440px` centrado verticalmente con `align-items: center` en el flex del panel.

### ¿Por qué tres bloques separados y no páginas distintas?

Porque la aplicación es un **SPA (Single Page Application)**: no recarga la página al cambiar de sección. Cambiar de pantalla significa mostrar/ocultar divs con JavaScript, no navegar entre archivos HTML distintos. Esto es clave para cumplir la prohibición de `window.location.reload()`.

### ¿Cómo funciona el toggle de mostrar/ocultar contraseña?

```html
<div class="input-wrapper">
  <input type="password" id="password" ...>
  <button type="button" class="btn-toggle-pw">
    <svg class="icon-eye">...</svg>
    <svg class="icon-eye-off">...</svg>
  </button>
</div>
```

El `<button>` tiene `type="button"` para que no dispare el submit del formulario al hacer clic. El JS en `setupPasswordToggle()` cambia `input.type` entre `password` y `text`, y alterna la clase `.active` en el botón para mostrar/ocultar cada SVG con CSS.

### ¿Cómo funciona el atributo `data-section`?

```html
<button class="nav-btn" data-section="ruta-campeon">La Ruta del Campeón</button>
```

`data-section` es un atributo de datos personalizado de HTML5. En JavaScript se accede con `btn.dataset.section` y devuelve el string `"ruta-campeon"`. Esto conecta el botón de navegación con el `id` de la sección correspondiente, sin hardcodear la lógica en el JS.

### ¿Cómo se vuelve al login desde dentro de la app?

```html
<header>
  <div class="header-top">
    <h1>Mundial 2026 — Analítica</h1>
    <button id="logout-btn" class="btn-logout">Cerrar sesión</button>
  </div>
  <nav>...</nav>
</header>
```

El `#app-screen` no tenía forma de volver al login sin borrar `localStorage` manualmente desde las DevTools. Se agregó `#logout-btn` dentro de un nuevo contenedor `.header-top` (flex, `justify-content: space-between`) para no romper el layout existente del `<h1>` y el `<nav>`. El botón vive fuera de `<nav>` porque no es una sección de la app, es una acción de sesión.

### ¿Por qué los scripts van al final del `<body>`?

Porque los scripts necesitan que el DOM exista para manipularlo. Si estuvieran en el `<head>`, al ejecutarse no encontrarían los elementos. El orden también importa: `auth.js` va antes que `main.js` porque `main.js` llama a `login()` e `isAuthenticated()` definidas en `auth.js`.

---

## 2. Estilos (`css/`)

> **Nota (actualizada en la Fase 8):** esta sección describía originalmente un único archivo `css/styles.css` con una paleta oscura fija por defecto. Ambas cosas cambiaron a lo largo del proyecto: el CSS se dividió en una estructura modular (más fácil de mantener a medida que se agregaron 5 secciones distintas), y el tema oscuro pasó de ser el único disponible a ser un *toggle* opcional sobre un tema claro por defecto (Fase 8, sección de este documento dedicada al panel de accesibilidad). Lo que sigue describe el CSS **tal como existe ahora**.

### ¿Por qué `css/styles.css` se dividió en varios archivos?

```
css/
├── main.css        ← solo @imports, en el orden en que deben cargar
├── utilities.css    ← .hidden, .sr-only, foco visible, animación .section
├── base/            ← variables.css, reset.css
├── layout/          ← app-shell.css, sidebar.css
├── components/      ← piezas reutilizadas por 2+ secciones (forms, buttons, modal, card, status, search, timeline, badge, hero, accessibility-panel)
├── pages/           ← login.css
└── sections/        ← una hoja por subproyecto (ruta-campeon, rastreador-goleadas, el-muro, analitica-estadios, radar-empates)
```

Un solo archivo `styles.css` funcionaba bien mientras solo existía la infraestructura de la Fase 1. A partir de la Fase 3, con cinco secciones que comparten algunos componentes (`.rc-hero-*`, `.badge`, `.chip`) pero cada una también necesita sus propias clases (`.em-card`, `.rg-summary-card`, `.ae-row`), un único archivo habría crecido a varios miles de líneas sin ninguna forma de saber, sin buscar, si una clase era compartida o exclusiva de una sección. Separar por `base/ → layout/ → components/ → pages/ → sections/` en `main.css` dice, con solo leer los `@import`, en qué orden se resuelven las capas y qué tan específico es cada archivo — de lo general (variables) a lo particular (una sección).

```css
/* css/main.css — el archivo completo es solo esto */
@import './base/variables.css';
@import './base/reset.css';
@import './utilities.css';
@import './layout/app-shell.css';
@import './layout/sidebar.css';
@import './components/forms.css';
/* ...resto de components/... */
@import './pages/login.css';
@import './sections/ruta-campeon.css';
/* ...resto de sections/... */
```

### ¿Qué son las variables CSS (`:root`) y por qué el tema por defecto es claro, no oscuro?

```css
/* css/base/variables.css */
:root {
  --bg-primary:    #F5F7FC;
  --bg-secondary:  #FFFFFF;
  --bg-card:       #FFFFFF;
  --color-primary: #3D5AFE;
  --color-accent:  #E31C3D;
  --color-success: #12875A;
  --color-error:   #C4213A;
  --text-primary:  #10131A;
  --text-secondary:#545B6B;
  --text-muted:    #667085;
  --border-color:  #E4E7F0;
}

[data-theme="dark"] {
  --bg-primary:    #12141C;
  --bg-secondary:  #181B24;
  --bg-card:       #1E212C;
  /* ...el resto de la paleta oscura, ver Fase 8 más abajo */
}
```

Las variables CSS (custom properties) permiten definir un valor una sola vez y reutilizarlo en todo el proyecto con `var(--nombre)` — nativas del navegador, sin preprocesador. El tema claro es el que vive directamente en `:root` (aplica siempre que no haya nada más); el oscuro vive en un selector de atributo `[data-theme="dark"]` que solo se activa cuando `js/ui/accessibility.js` le agrega ese atributo al `<html>` — por decisión explícita del usuario o por `prefers-color-scheme`, nunca por defecto sin que nadie lo haya pedido. La Fase 8 de este documento explica en detalle por qué varias de estas variables (`--color-primary`, `--color-accent`, ...) **no** cambian entre temas, y por qué existe un segundo grupo de variables (`--text-*-strong`) que sí.

### ¿Por qué el panel derecho del login tiene colores fijos en hexadecimal, en vez de las variables del sistema?

```css
/* css/pages/login.css */
#login-screen {
  --status-error-bg:     rgba(248, 81, 73, 0.08);
  --status-error-border: rgba(196, 33, 58, 0.35);
  --status-error-fg:     #C4213A;
}
.login-panel-right { background: #F3F4F6; }
```

El panel derecho usa un fondo claro fijo (`#F3F4F6`) para crear contraste visual con el panel izquierdo oscuro de la imagen — un patrón común en apps premium (ej. Notion, Linear) — y ese contraste **no** debe depender de si el usuario activó el tema oscuro en el resto de la app: el login es la única pantalla que mantiene siempre la misma apariencia. Por eso los campos del formulario usan colores hexadecimales fijos (`.login-panel-right .form-group input`) en vez de `var(--bg-card)` o similares, y por eso `#login-screen` "re-pinea" las pocas variables que sí llegan a usarse ahí (el color del mensaje de error) a sus valores claros fijos — sin ese re-pineo, esas variables heredarían el valor de `[data-theme="dark"]` desde el `<html>` aunque el panel de login nunca debería verse oscuro (ver Fase 8, sección 6).

### ¿Qué hace `.hidden { display: none !important; }`?

La clase `.hidden` es la única forma en que la aplicación muestra y oculta elementos. El `!important` garantiza que no sea sobrescrita accidentalmente por otras reglas CSS. En JavaScript se usa `classList.add('hidden')` y `classList.remove('hidden')`.

### ¿Cuáles son las clases de estado y para qué sirven?

| Clase | Cuándo se usa | Colores desde |
|---|---|---|
| `.loading` | Mientras se espera respuesta de la API | `--text-secondary`, `--color-primary` |
| `.error` | Cuando una petición falla y no hay datos de respaldo | `--status-error-bg/border/fg` |
| `.offline` | Cuando se muestran datos de `localStorage` o hay un fallback puntual (ej. "Estadio no disponible") | `--status-offline-bg/border/fg` |
| `.countdown` | Durante el backoff de un error 429 (muestra segundos restantes) | `--status-warning-bg/border/fg` |

Estas clases se agregan/quitan dinámicamente con JavaScript. Nunca se usa `alert()` para comunicar estos estados. Los tres pares `--status-*` (agregados en la Fase 8) reemplazaron valores `rgba(...)` sueltos que estaban escritos directamente en cada regla — agruparlos como variables permitió definir, en un solo lugar, valores distintos para tema claro y oscuro sin tocar `status.css` en absoluto (ver Fase 8, sección 4, incluye un bug de contraste real que tenía `.countdown` en el valor original).

### ¿Por qué `.btn-logout` reutiliza el mismo patrón visual que `.nav-btn`?

```css
/* css/layout/sidebar.css */
.btn-logout {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: var(--tap-target-min);
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition), border-color var(--transition), background var(--transition);
}
.btn-logout:hover {
  color: var(--text-accent-strong);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
```

Fondo transparente, borde sutil y texto secundario que se aclaran en `:hover` — el mismo lenguaje visual que `.nav-btn`. Se le da su propia clase (en vez de reutilizar `.nav-btn`) porque no participa en la navegación entre secciones ni necesita un estado `.active`. `min-height: var(--tap-target-min)` (44px) se agregó en la Fase 8 como parte de la auditoría de área táctil; el botón de accesibilidad del sidebar (`.btn-a11y-trigger`, también Fase 8) reutiliza esta misma clase base y solo sobreescribe el color de `:hover`.

### ¿Qué hace `animation: fadeIn` en `.section`?

Cada vez que una sección se vuelve visible, aparece con una animación sutil de 200ms. Esto da feedback visual al usuario de que cambió de sección sin ser intrusivo. La animación se dispara automáticamente cuando el elemento pasa de `display: none` a visible. Vive en `utilities.css`, junto a una regla `@media (prefers-reduced-motion: reduce)` que la desactiva para usuarios que configuraron su sistema operativo para minimizar el movimiento en pantalla.

---

## 3. Autenticación (`js/api/auth.js`)

### ¿Qué hace cada función?

```javascript
login(email, password)   // POST /auth/authenticate → guarda token en localStorage
getToken()               // lee el token de localStorage
clearToken()             // elimina el token (se llama cuando la API responde 401)
isAuthenticated()        // retorna true si existe un token guardado
```

### ¿Cuál es el endpoint correcto de login?

`POST /auth/authenticate` (sobre `https://worldcup26.ir` en producción, o sobre `/api` en desarrollo local vía el proxy de Vite — ver sección 6) con cuerpo `{ email, password }`.

> **Nota importante:** el endpoint es `/auth/authenticate`, no `/auth/login`. El campo es `email`, no `username`. El error más común al integrar esta API es usar el endpoint o el campo incorrecto — ambos causan un 404 o 401 que parece un error de credenciales.

### ¿Por qué `API_BASE` es `/api` y no la URL completa de `worldcup26.ir`?

```javascript
const API_BASE = '/api';
```

Porque en desarrollo local, `fetch()` va al mismo origen (`http://localhost:5173`) y es el proxy de Vite quien reenvía la petición a `https://worldcup26.ir` por detrás (ver sección 6). Usar una ruta relativa en vez de la URL absoluta es lo que permite que el navegador nunca vea la petición como "cross-origin" — así se evita el bloqueo de CORS sin tocar el backend.

### ¿Por qué no hay formulario de registro ni de "olvidé mi contraseña"?

Porque la especificación del laboratorio no define un endpoint de registro ni de recuperación de contraseña — solo `/auth/authenticate` sobre credenciales ya existentes. Los enlaces `<a href="#">` de "¿Olvidaste tu contraseña?" y "Regístrate" que estaban en el HTML no tenían JS ni endpoint detrás, así que se eliminaron: dejarlos habría invitado preguntas de defensa sobre funcionalidad que nunca estuvo pensada para existir.

### ¿Por qué se guarda el token en `localStorage` y no en una variable?

Una variable JavaScript vive en la pestaña del navegador. Si el usuario cierra y vuelve a abrir la app, la variable desaparece. `localStorage` persiste entre sesiones. La clave `'wc26_token'` es una constante para evitar errores de escritura al leerla/escribirla desde distintas partes del código.

### ¿Qué pasa si el servidor responde con un error en el login?

```javascript
if (!response.ok) {
  let message = `Error de autenticación (${response.status})`;
  try {
    const body = await response.json();
    if (body.message) message = body.message;
  } catch (_) {}
  throw new Error(message);
}
```

`response.ok` es `true` solo para status 200–299. Si el servidor devuelve 401 o 400, se intenta leer el mensaje del cuerpo de la respuesta. Si el cuerpo no es JSON válido, el `try/catch` lo ignora y se usa un mensaje genérico. El error se lanza (`throw`) para que quien llamó a `login()` lo capture en su `try/catch`.

### ¿Por qué `isAuthenticated()` usa `Boolean(getToken())` y no `getToken() !== null`?

`localStorage.getItem()` retorna `null` si la clave no existe, pero también podría retornar una cadena vacía `""`. `Boolean(null)` y `Boolean("")` son ambos `false`, mientras que `Boolean("algún-token")` es `true`. Es más robusto que comparar solo contra `null`.

### ¿Por qué `login()` usa `async/await` y no `.then()`?

El laboratorio prohíbe `.then()` y `.catch()` en todo el código. `async/await` es más legible: el código se lee de forma secuencial aunque sea asíncrono. El manejo de errores con `try/catch` es equivalente al `.catch()` pero en sintaxis moderna.

---

## 4. Modal de sesión expirada (`js/ui/modal.js`)

### ¿Cuándo se muestra este modal?

NO al cargar la app (para eso está `#login-screen`). Se muestra **durante el uso de la app**, cuando una petición a la API devuelve un error 401 — el token venció mientras el usuario estaba navegando.

### ¿Por qué es un modal y no una redirección?

Porque `window.location.reload()` (prohibido) destruye todo el estado: datos cargados en pantalla, peticiones en vuelo, secciones ya inicializadas. Con el modal, el usuario reautentica y continúa sin perder lo que ya estaba visible.

### ¿Qué hace `hideExpiredSessionModal()`?

```javascript
function hideExpiredSessionModal() {
  document.getElementById('session-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('reauth-error').textContent = '';
  document.getElementById('reauth-error').classList.add('hidden');
  document.getElementById('reauth-email').value = '';
  document.getElementById('reauth-password').value = '';
}
```

Además de ocultar el modal, limpia los campos y borra mensajes de error anteriores. Si el usuario falla la reauth y luego la intenta de nuevo, no debería ver el error previo.

---

## 5. Orquestador principal (`js/main.js`)

### ¿Qué pasa cuando la página carga?

```javascript
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    showApp();
  } else {
    showLoginScreen();
  }
  setupNavigation();
  setupLoginForm();
  setupReauthForm();
  setupPasswordToggle();
  setupLogout();
});
```

`DOMContentLoaded` se dispara cuando el HTML terminó de parsearse. Se revisa si ya hay un token en `localStorage`: si existe, se muestra la app directamente; si no, se muestra el login. Los cinco `setup*` registran los event listeners.

### ¿Cómo funciona `setupLogout()`?

```javascript
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearToken();
    showLoginScreen();
  });
}
```

Reutiliza dos funciones que ya existían: `clearToken()` (de `auth.js`, borra el token de `localStorage`) y `showLoginScreen()` (ya usada por `isAuthenticated()` al arrancar). No hace falta código nuevo para el cambio de pantalla — solo conectar el botón a lo que ya estaba definido. Al no recargar la página, ninguna otra sección pierde su estado en memoria hasta que el usuario decide volver a entrar.

### ¿Cómo funciona `setupPasswordToggle()`?

```javascript
function setupPasswordToggle() {
  const btn   = document.querySelector('.btn-toggle-pw');
  const input = document.getElementById('password');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.setAttribute('aria-label', hidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
    btn.classList.toggle('active', hidden);
  });
}
```

Lee el estado actual del input: si es `password` (oculto), lo cambia a `text` (visible), y viceversa. La clase `.active` en el botón controla qué SVG se muestra (ojo abierto / ojo cerrado) mediante CSS.

### ¿Cómo funciona `activateSection()`?

```javascript
function activateSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById(sectionId);
  const btn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
  if (section) section.classList.remove('hidden');
  if (btn) btn.classList.add('active');

  initSection(sectionId);
}
```

1. Oculta TODAS las secciones
2. Quita `active` de TODOS los botones
3. Muestra solo la sección pedida y marca su botón como activo
4. Llama a `initSection()` para cargar los datos (Fases 3–7)

### ¿Cómo maneja el formulario de login los errores sin `alert()`?

```javascript
try {
  await login(email, password);
  showApp();
} catch (err) {
  errorEl.textContent = err.message;
  errorEl.classList.remove('hidden');
} finally {
  submitBtn.disabled = false;
  submitBtn.textContent = 'Ingresar';
}
```

- El error se muestra en `#login-error`, un `<div>` ya en el HTML con `class="error-msg hidden"`
- `finally` siempre restaura el botón (sea éxito o error)
- Si `login()` lanza, el `catch` lo captura; si tiene éxito, `showApp()` transiciona la UI

---

## 6. Desarrollo local — proxy de Vite (CORS)

### ¿Cuál es el problema?

La API de `worldcup26.ir` no incluye el header `Access-Control-Allow-Origin` para orígenes de desarrollo (`localhost`, `file://`). Eso no es un bug del servidor en sí — simplemente esa API no fue configurada para aceptar peticiones desde un navegador en un origen distinto al suyo. Herramientas como Postman no se ven afectadas porque **CORS es una restricción que solo aplican los navegadores**, no los servidores ni los clientes HTTP; Postman recibe el JWT sin problema, pero el mismo `fetch()` desde el navegador queda bloqueado antes de que el JS pueda leer la respuesta.

Como no se tiene acceso para modificar el backend, la solución no puede depender de agregar headers ahí. Tiene que resolverse del lado del cliente.

### ¿Cómo se resuelve sin tocar el backend?

Con un **proxy de desarrollo**, usando la función nativa de Vite (`server.proxy` en `vite.config.js`):

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://worldcup26.ir',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
});
```

El navegador nunca llama directamente a `worldcup26.ir`. Llama a `/api/...` sobre su propio origen (`http://localhost:5173`), donde no aplica CORS porque no es una petición cross-origin. Vite recibe esa petición internamente y la reenvía él mismo, servidor-a-servidor, hacia `worldcup26.ir` — igual que hace Postman — y devuelve la respuesta al navegador como si viniera de su propio servidor.

### ¿Por qué no usar una extensión o flag de Chrome para deshabilitar CORS?

Es una salida rápida pero frágil: solo funciona en la máquina y el navegador donde se activó, hay que recordar desactivarla, y no refleja cómo se comportaría la app para cualquier otro usuario o evaluador. El proxy de Vite, en cambio, es parte del proyecto (`vite.config.js`), corre para cualquiera que clone el repo y ejecute `npm run dev`, y no requiere tocar la configuración del navegador.

### ¿Este proxy sirve también en producción?

No. `server.proxy` solo existe mientras corre `vite dev`; no forma parte del build (`vite build`) ni de un despliegue estático. Si el proyecto se despliega a un hosting estático (GitHub Pages, Netlify, etc.), esta solución dejaría de aplicar y se necesitaría un backend propio (o una función serverless) que cumpla el mismo rol de intermediario. Para efectos de este laboratorio, alcanza con resolverlo en desarrollo.

### ¿Qué se agregó al proyecto para esto?

```
package.json     → agrega Vite como devDependency y los scripts dev/build/preview
vite.config.js   → configuración del proxy /api → https://worldcup26.ir
.gitignore       → excluye node_modules/ y dist/
```

El resto del proyecto no cambió de arquitectura: los scripts siguen siendo `<script src="...">` clásicos (no se migró a módulos ES), Vite los sirve igual como archivos estáticos. El único cambio de código fue `API_BASE` en `js/api/auth.js` (ver sección 3).

---

## 7. Preguntas de defensa relacionadas con Fase 1

**¿Por qué no se usa `window.location.reload()` para resolver un error 401?**
> Porque `reload()` destruye el estado de la aplicación: borra datos ya cargados en memoria y obliga al usuario a empezar de cero. El modal de sesión expirada mantiene la UI intacta y permite reautenticarse sin perder el contexto.

**¿Qué pasa si el usuario cierra la pestaña con sesión activa y la vuelve a abrir?**
> `isAuthenticated()` lee el token de `localStorage`, que persiste entre sesiones. La app lo detecta en `DOMContentLoaded` y muestra directamente el `#app-screen` sin pedir login de nuevo. El token puede haber expirado en el servidor aunque esté en `localStorage` — eso se detecta en la primera petición cuando la API responde 401.

**¿Por qué los scripts están al final del `<body>` y no en el `<head>`?**
> Para garantizar que el DOM esté completamente construido antes de que el JS intente manipularlo. Cargar scripts al final evita bloquear el renderizado inicial del HTML.

**¿Qué es un SPA y por qué este proyecto lo es?**
> Single Page Application: una aplicación que carga una sola página HTML y cambia el contenido visible manipulando el DOM con JavaScript, sin recargar la página al navegar. Este proyecto lo implementa ocultando/mostrando secciones con `classList.add('hidden')` / `classList.remove('hidden')`.

**¿Por qué el botón del toggle de contraseña tiene `type="button"`?**
> Porque dentro de un `<form>`, un botón sin `type` explícito tiene comportamiento `type="submit"` por defecto. Al hacer clic dispararía el submit del formulario en lugar de solo cambiar la visibilidad de la contraseña. `type="button"` anula ese comportamiento.

**¿Por qué el endpoint de login es `/auth/authenticate` y no `/auth/login`?**
> Porque así lo define la API de worldcup26.ir. El campo del cuerpo es `email`, no `username`. Usar el endpoint o el campo incorrecto resulta en un error que parece de credenciales pero en realidad es un error de integración.

**¿Qué ocurre si `setupPasswordToggle()` no encuentra el botón en el DOM?**
> La guardia `if (!btn || !input) return;` previene que el código falle con un `TypeError`. Esto puede ocurrir si el login-screen está oculto o si el HTML cambia. La función simplemente no registra el listener y el campo de contraseña funciona normalmente (sin toggle).

**¿Por qué Postman podía autenticar contra `worldcup26.ir` pero el navegador lo bloqueaba?**
> Porque CORS es una restricción exclusiva de los navegadores, no del servidor ni de clientes HTTP como Postman. El servidor sí procesaba la petición y devolvía el JWT correctamente en ambos casos; lo que el navegador bloqueaba era la lectura de esa respuesta por parte del JavaScript, al no encontrar el header `Access-Control-Allow-Origin` para el origen de desarrollo.

**¿Por qué se resolvió con un proxy de Vite y no pidiendo que el backend agregue el header CORS?**
> Porque `worldcup26.ir` es una API externa sobre la que no se tiene control ni acceso para modificar su configuración. La solución tuvo que aplicarse del lado del cliente: el proxy de Vite hace que el navegador llame a su propio origen (`localhost:5173`), y es Vite quien reenvía la petición al backend real por fuera del navegador, donde CORS no aplica.

**¿Por qué se agregó un botón de "Cerrar sesión" si el laboratorio no lo pedía explícitamente?**
> Porque sin él, la única forma de volver a `#login-screen` una vez autenticado era borrar `localStorage` manualmente desde las DevTools del navegador — útil para pruebas puntuales, pero no una función real de la app. Cualquier aplicación con autenticación necesita una salida de sesión visible para el usuario; `setupLogout()` solo conecta un botón a `clearToken()` y `showLoginScreen()`, dos funciones que ya existían para otros flujos.

---

# Estudio Técnico — Fase 2: Fetcher con Resiliencia Completa

---

## ¿Qué se construyó en esta fase?

El núcleo de resiliencia que las 5 secciones (Fases 3–7) van a compartir: el fetcher con timeout, JWT y reintentos (`fetcher.js`), el countdown visual para 429 (`countdown.js`), el caché en `localStorage` y los banners de datos degradados (`offline.js`), y las 4 funciones de acceso a la API (`endpoints.js`). Ningún subproyecto todavía consume estos módulos — esta fase entrega la infraestructura, no la UI final.

---

## 1. `fetchWithTimeout()` — la base de todas las peticiones

```javascript
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

### ¿Por qué `AbortController` y no simplemente esperar la respuesta del servidor?

Sin límite de espera, un servidor colgado (sin responder, sin cerrar la conexión) dejaría la petición pendiente indefinidamente y la UI atascada en `.loading` para siempre. `AbortController` permite cancelar la petición desde el cliente después de `timeoutMs` (8 s por defecto): `controller.abort()` hace que la promesa de `fetch()` se rechace con un `AbortError`, que se trata igual que un error de red.

### ¿Por qué el `clearTimeout(timer)` está en un `finally` y no después del `return`?

Porque si `fetch()` lanza una excepción (red caída, abort), el código nunca llega a la línea después del `await` dentro del `try` — saltaría directo al bloque que maneja el error, dejando el `setTimeout` activo innecesariamente. `finally` se ejecuta siempre, haya éxito o excepción, así que el timer se limpia en ambos casos sin duplicar la lógica de limpieza.

---

## 2. `fetchWithAuth()` — JWT y sesión expirada

```javascript
async function fetchWithAuth(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` };
  const response = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);

  if (response.status === 401) {
    clearToken();
    await waitForReauth();
    return fetchWithAuth(url, options, timeoutMs);
  }

  return response;
}
```

### ¿Cómo se adjunta el JWT a cada petición?

`getToken()` (de `auth.js`, Fase 1) lee el token de `localStorage` en cada llamada — nunca se guarda en una variable de módulo que pudiera quedar desactualizada. El header `Authorization: Bearer <token>` se agrega siempre, incluso en el primer request de una sección recién activada.

### ¿Qué pasa exactamente cuando la API responde 401?

1. `clearToken()` borra el token inválido de `localStorage` de inmediato.
2. `await waitForReauth()` **pausa esta función** (no el resto de la app) hasta que el usuario se reautentique.
3. Cuando la reautenticación se completa, la función se llama a sí misma de nuevo (`return fetchWithAuth(url, options, timeoutMs)`) — con el token nuevo ya en `localStorage`, así que este segundo intento sale con el header correcto.

La petición original nunca se pierde ni el usuario tiene que repetir la acción que la disparó: solo ve el modal, reautentica, y el dato que estaba esperando llega solo.

### ¿Qué es `waitForReauth()` y por qué existe como función separada?

```javascript
let sessionRecovery = null;

function waitForReauth() {
  if (!sessionRecovery) {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    sessionRecovery = { promise, resolve };
    showExpiredSessionModal();
  }
  return sessionRecovery.promise;
}

function notifySessionRestored() {
  if (sessionRecovery) {
    sessionRecovery.resolve();
    sessionRecovery = null;
  }
}
```

Como varias secciones pueden tener peticiones en vuelo al mismo tiempo (por ejemplo, "La Ruta del Campeón" cruzando `teams`, `games` y `stadiums` en paralelo), es posible que **varias** devuelvan 401 casi simultáneamente. Sin coordinación, cada una mostraría su propio modal — parpadeo visual y confusión.

`sessionRecovery` es una variable de módulo que actúa como candado: la primera petición que ve el 401 crea la promesa compartida y muestra el modal una sola vez; cualquier otra petición que llegue mientras el modal sigue abierto recibe la **misma promesa** (`sessionRecovery.promise`) en lugar de disparar un segundo modal. Cuando el usuario reautentica con éxito, `notifySessionRestored()` resuelve esa promesa compartida — y **todas** las peticiones que estaban esperando (`await waitForReauth()`) se reanudan a la vez, cada una reintentando su propia URL original.

### ¿Cómo se conecta esto con el modal de sesión expirada?

`main.js` (Fase 1) ya tenía el formulario de reautenticación. Se le agregó una sola línea:

```javascript
try {
  await login(email, password);
  hideExpiredSessionModal();
  notifySessionRestored();   // ← nuevo: libera todas las peticiones en espera
} catch (err) {
  showModalError(err.message);
}
```

`notifySessionRestored()` se llama **después** de que `login()` guardó el token nuevo en `localStorage` y **después** de ocultar el modal — así, cuando las peticiones pendientes despiertan y llaman a `getToken()` de nuevo, ya encuentran el token fresco.

---

## 3. `fetchWithRetry()` — backoff exponencial y cadena de respaldo

```javascript
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

async function fetchWithRetry(url, cacheKey, options = {}) {
  const { countdownContainerId, ...fetchOptions } = options;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    let response;
    try {
      response = await fetchWithAuth(url, fetchOptions);
    } catch (error) {
      return loadFallback(cacheKey);
    }

    if (response.ok) {
      const data = await response.json();
      saveToCache(cacheKey, data);
      hideAllBanners();
      return { data, source: 'api' };
    }

    if (response.status === 429 || response.status === 500) {
      const waitMs = RETRY_DELAYS_MS[attempt];
      if (response.status === 429) {
        await waitWithCountdown(waitMs / 1000, countdownContainerId);
      } else {
        await sleep(waitMs);
      }
      continue;
    }

    return loadFallback(cacheKey);
  }

  return loadFallback(cacheKey);
}
```

### ¿Por qué `fetchWithRetry()` es una función distinta de `fetchWithAuth()` y no todo junto?

Cada una tiene una responsabilidad distinta: `fetchWithAuth()` resuelve **quién soy** (JWT, sesión), `fetchWithRetry()` resuelve **qué tan insistente soy si el servidor falla** (backoff, caché, seed). Separarlas evita que la lógica de reintentos tenga que preocuparse por tokens, y viceversa. Además, cualquier código que solo necesite "un fetch autenticado sin reintentos" puede llamar a `fetchWithAuth()` directamente.

### ¿Por qué el `catch` alrededor de `fetchWithAuth()` no reintenta?

```javascript
try {
  response = await fetchWithAuth(url, fetchOptions);
} catch (error) {
  return loadFallback(cacheKey);
}
```

Ese `catch` solo se dispara cuando `fetch()` lanza una **excepción** — `TypeError` (sin internet, DNS, CORS) o `AbortError` (timeout de 8 s vencido). En ambos casos no hubo respuesta HTTP del servidor: no hay un status 429/500 al que aplicarle backoff, porque no está claro que exista un servidor disponible para reintentar. La especificación del laboratorio es explícita en esto: red caída va directo al plan de respaldo (caché → seed → error), sin esperar.

### ¿Por qué 429 y 500 sí se reintentan y con la misma lista de esperas?

Ambos son errores donde el servidor **sí respondió** — solo que no pudo (o no quiso) procesar la petición en ese momento. 429 significa "estás pidiendo demasiado, espera"; 500 significa "fallé internamente, tal vez fue temporal". En ambos casos reintentar con una espera creciente (1 s → 2 s → 4 s → 8 s) tiene sentido: le da tiempo al servidor de recuperarse o al límite de tasa de resetearse, sin bombardearlo con reintentos inmediatos.

### ¿Por qué el `for` tiene `attempt < RETRY_DELAYS_MS.length` (4 intentos) en vez de una condición separada para "reintentos agotados"?

`RETRY_DELAYS_MS` tiene 4 valores porque el enunciado pide exactamente 4 esperas (1s, 2s, 4s, 8s). Usar `RETRY_DELAYS_MS.length` como límite del bucle acopla el número de intentos a esa misma lista — si mañana se necesitaran 5 reintentos, bastaría con agregar un valor al arreglo, sin tocar la lógica del bucle. Cuando el `for` termina sin haber retornado (todos los intentos fallaron), cae al `return loadFallback(cacheKey)` final.

### ¿Qué significa la desestructuración `const { countdownContainerId, ...fetchOptions } = options;`?

`options` es el único parámetro "extra" que reciben las funciones de `endpoints.js`. Puede traer tanto opciones reales de `fetch()` (headers, method, body) como `countdownContainerId`, que **no** es una opción de `fetch()` — es el `id` del elemento del DOM donde debe pintarse el countdown de un 429. Esta línea separa ambas cosas: `countdownContainerId` se extrae para uso interno del fetcher, y el resto (`fetchOptions`) es lo único que se le pasa a `fetchWithAuth()` → `fetchWithTimeout()` → `fetch()`, para no filtrarle a la Fetch API nativa una propiedad que no reconoce.

### ¿Qué pasa si llega un status HTTP que no es 200-299, 401, 429 ni 500 (ej. 403, 404)?

```javascript
return loadFallback(cacheKey);
```

No hay reintento posible para un error que no es de sesión ni transitorio — un 404 va a seguir siendo 404 sin importar cuántas veces se reintente. En vez de fallar en seco, el fetcher aplica la misma cadena de respaldo que usaría para un error de red: caché reciente si existe, o datos semilla si no.

### ¿Cómo interactúa `fetchWithRetry()` con los banners de `offline.js`?

Solo en el camino feliz: `hideAllBanners()` se llama cuando una petición **finalmente** tiene éxito (`response.ok`), para limpiar cualquier banner de "datos guardados" o "datos de demostración" que hubiera quedado visible de un intento anterior. Los banners de "mostrar como offline/seed" los activa `loadFallback()` (ver sección 5), no `fetchWithRetry()` directamente.

---

## 4. `countdown.js` — feedback visual durante el 429

```javascript
function renderCountdown(seconds, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return Promise.resolve();

  clearCountdown(containerId);

  return new Promise(resolve => {
    let remaining = seconds;
    const paint = () => {
      container.innerHTML = `<div class="countdown">Límite de peticiones alcanzado. Reintentando en ${remaining}s…</div>`;
    };
    paint();

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        delete countdownTimers[containerId];
        container.innerHTML = '';
        resolve();
        return;
      }
      paint();
    }, 1000);

    countdownTimers[containerId] = timer;
  });
}
```

### ¿Por qué `renderCountdown()` retorna una `Promise`?

Porque `fetchWithRetry()` necesita **esperar** a que el countdown termine antes de reintentar la petición — no solo mostrar el número en pantalla. Al retornar una `Promise` que se resuelve cuando `remaining` llega a 0, `fetchWithRetry()` puede hacer `await waitWithCountdown(...)` y el flujo asíncrono queda sincronizado con lo que el usuario ve: el reintento ocurre exactamente cuando el countdown visual llega a "0s".

### ¿Por qué existe `waitWithCountdown()` en `fetcher.js` en vez de llamar a `renderCountdown()` directamente?

```javascript
async function waitWithCountdown(seconds, containerId) {
  if (containerId && document.getElementById(containerId)) {
    await renderCountdown(seconds, containerId);
  } else {
    await sleep(seconds * 1000);
  }
}
```

`fetchWithRetry()` no siempre sabe si quien lo llamó le pasó un `countdownContainerId` — las secciones de las Fases 3-7 todavía no existen. Si no hay contenedor (o el `id` no corresponde a ningún elemento del DOM), `renderCountdown()` no puede pintar nada, pero el **tiempo de espera del backoff sigue siendo obligatorio** (así lo exige la sección 4 del plan). `waitWithCountdown()` decide entre las dos formas de esperar sin que `fetchWithRetry()` tenga que conocer ese detalle.

### ¿Qué es `countdownTimers` y por qué es un objeto a nivel de módulo?

```javascript
const countdownTimers = {};
```

Guarda el `id` del `setInterval` activo por cada `containerId`. Sirve para dos cosas: (1) `clearCountdown()` puede cancelar un countdown específico sin afectar otros que corran en paralelo en otra sección, y (2) si `renderCountdown()` se llama de nuevo sobre el mismo `containerId` antes de que el anterior termine, primero lo cancela (`clearCountdown(containerId)` al inicio de la función) para que no queden dos `setInterval` compitiendo por el mismo `<div>`.

### ¿Por qué el mensaje se repinta completo en cada tick (`paint()`) en vez de solo actualizar el número?

Es una decisión deliberada de simplicidad: reescribir todo el `innerHTML` del contenedor evita tener que mantener una referencia aparte al nodo de texto del número y sincronizarla manualmente. Como el contenedor de countdown es pequeño y se actualiza una vez por segundo, el costo de reconstruir ese fragmento de DOM es insignificante.

---

## 5. `offline.js` — caché en `localStorage` y banners

```javascript
const CACHE_PREFIX = 'wc26_cache_';

function saveToCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch (_) {}
}

function readFromCache(key) {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw).data;
  } catch (_) {
    return null;
  }
}
```

### ¿Por qué se guarda `{ data, savedAt }` y no solo `data` directamente?

`savedAt` (timestamp de `Date.now()`) no se usa todavía en esta fase, pero deja preparado el terreno para mostrar "datos de hace X minutos" en el banner de offline sin tener que cambiar el formato de lo que ya está guardado en `localStorage`. Guardar solo `data` habría significado, más adelante, tener que decidir entre romper la compatibilidad con lo ya cacheado o inventar un formato mixto.

### ¿Por qué `saveToCache()` tiene un `try/catch` vacío?

`localStorage.setItem()` puede lanzar una excepción real (`QuotaExceededError`) si el almacenamiento está lleno, o si el navegador lo bloquea (modo incógnito con configuración estricta, por ejemplo). Guardar en caché es una optimización, no una operación crítica: si falla, la app debe seguir funcionando con los datos que ya tiene en memoria — no tiene sentido interrumpir el flujo principal por un error de caché.

### ¿Qué hace `loadFallback()` y dónde vive?

```javascript
async function loadFallback(cacheKey) {
  const cached = readFromCache(cacheKey);
  if (cached) {
    showOfflineBanner();
    return { data: cached, source: 'cache' };
  }

  const seed = await loadSeed(cacheKey);
  if (seed) {
    showSeedBanner();
    return { data: seed, source: 'seed' };
  }

  return { data: null, source: 'none' };
}
```

Vive en `fetcher.js` (no en `offline.js`) porque orquesta la jerarquía completa de fuentes de datos del plan (sección 5 de `PlanProyecto.md`): primero caché de `localStorage`, después datos semilla (`data/seed-*.json`), y si ninguno existe, retorna `source: 'none'` para que la sección que llamó muestre su propio mensaje de "sin datos disponibles" sin pantalla en blanco. `offline.js` solo aporta las piezas reutilizables (`readFromCache`, `showOfflineBanner`, `showSeedBanner`); no conoce la jerarquía de prioridades entre ellas.

### ¿Qué es `source` en el objeto que retorna `fetchWithRetry()`?

Toda llamada a `getTeams()`, `getGames()`, etc. retorna `{ data, source }`, donde `source` es uno de `'api'`, `'cache'`, `'seed'` o `'none'`. Las secciones (Fases 3-7) van a usar este campo para decidir si necesitan mostrar algún indicador adicional más allá del banner global — por ejemplo, deshabilitar un botón de "actualizar" si `source !== 'api'`.

### ¿Por qué los banners son un solo `#banner-offline` / `#banner-seed` globales y no uno por sección?

Así está definido el HTML de la Fase 1 (`index.html`): un único banner fijo debajo del `<nav>`, visible para toda la app. Simplifica la UI — el usuario ve un solo mensaje de "algo no está actualizado" en vez de un banner repetido en cada una de las 5 secciones. El costo de esa simplicidad es que el banner refleja el estado de la **última** petición que lo activó, no necesariamente el de la sección que el usuario está viendo en ese momento; es una limitación conocida y aceptable para el alcance del laboratorio.

---

## 6. `endpoints.js` — abstracción de la API

```javascript
function getTeams(options = {}) {
  return fetchWithRetry(`${API_BASE}/get/teams`, 'teams', options);
}
function getGames(options = {}) {
  return fetchWithRetry(`${API_BASE}/get/games`, 'games', options);
}
function getStadiums(options = {}) {
  return fetchWithRetry(`${API_BASE}/get/stadiums`, 'stadiums', options);
}
function getGroups(options = {}) {
  return fetchWithRetry(`${API_BASE}/get/groups`, 'groups', options);
}
```

### ¿Por qué estas 4 funciones son casi idénticas y no se generaron con un helper genérico (ej. `makeEndpoint(path, cacheKey)`)?

Se evaluó, pero 4 líneas explícitas son más fáciles de leer y de depurar durante la defensa que una fábrica de funciones — cualquiera que abra el archivo ve de inmediato qué URL y qué `cacheKey` corresponde a cada endpoint, sin tener que rastrear cómo se construyó dinámicamente. Con solo 4 endpoints fijos (nunca va a haber un quinto), la abstracción no paga su propio costo de indirección.

### ¿Por qué reutilizan `API_BASE`, definida en `auth.js`?

`API_BASE = '/api'` (Fase 1, sección 3 de este documento) ya resuelve el problema de CORS vía el proxy de Vite. Como todos los scripts comparten el mismo scope global de `<script>` clásicos, `endpoints.js` puede usar `API_BASE` sin declararla de nuevo ni importarla — el orden de carga en `index.html` (`auth.js` antes que `endpoints.js`) garantiza que ya existe cuando se necesita.

### ¿Por qué cada función acepta un `options = {}` en vez de no recibir parámetros, como sugiere la sección 8.4 del plan?

El plan original las describe sin argumentos porque a ese nivel de diseño no hacía falta especificar el mecanismo del countdown. En la implementación, `options` es el canal por el que una sección (Fase 3+) puede pasar `{ countdownContainerId: 'algun-id' }` para que un 429 en ese endpoint específico pinte su cuenta regresiva en el lugar correcto de esa sección. Si una sección no lo necesita, simplemente no pasa nada y `options` queda como objeto vacío — el comportamiento por defecto (esperar sin UI de countdown) no cambia.

---

## 7. Preguntas de defensa relacionadas con Fase 2

**¿Qué pasa si dos secciones distintas piden `getTeams()` casi al mismo tiempo y ambas reciben 401?**
> La primera en llegar crea la promesa compartida en `waitForReauth()` y muestra el modal una sola vez. La segunda ve que `sessionRecovery` ya existe y recibe la misma promesa sin disparar un segundo modal. Cuando el usuario reautentica, `notifySessionRestored()` resuelve esa promesa una vez y ambas peticiones — cada una con su propia URL — se reintentan automáticamente con el token nuevo.

**¿Por qué un error de red (`TypeError`) no entra en el backoff de 1s→2s→4s→8s?**
> Porque el backoff existe para darle tiempo a un servidor que sí respondió pero está sobrecargado (429) o falló temporalmente (500) a recuperarse. Si `fetch()` lanza una excepción, no hubo respuesta del servidor — podría no haber conexión a internet en absoluto. Insistir con esperas crecientes no cambia esa condición; el plan exige ir directo al respaldo (caché → seed → error).

**¿Qué pasa si `localStorage` tiene datos cacheados de una versión vieja de la API y a la vez existe un archivo seed más reciente?**
> `loadFallback()` siempre prioriza el caché de `localStorage` sobre el seed, sin comparar fechas. La jerarquía del plan es fija: API real → caché → seed → error. El caché representa la última respuesta real que la app SÍ obtuvo de la API, aunque no sea la más reciente; el seed es un último recurso para cuando nunca hubo ninguna petición exitosa.

**¿Por qué `fetchWithRetry()` recibe un `cacheKey` como string (`'teams'`, `'games'`, ...) en vez de derivarlo de la URL?**
> Porque la URL completa (`/api/get/teams`) es un detalle de implementación que podría cambiar (ej. versión de la API, base URL distinta), mientras que la clave de caché debe ser estable para que `localStorage` y los archivos `seed-teams.json` sigan encontrándose correctamente sin importar esos cambios. Pasarlo explícito también hace evidente, con solo leer la llamada, qué caché está en juego.

**¿Qué pasa si el 429 llega en el último intento (`attempt === 3`, el de 8 s)?**
> Se espera igual el countdown completo de 8 s — el `for` no distingue el último intento de los anteriores. Al terminar esa espera, el `continue` hace que el bucle intente una vez más, pero como `attempt` ya llegó a `RETRY_DELAYS_MS.length - 1`, esa es la última vuelta: si también falla, el `for` termina sin retornar y cae al `loadFallback(cacheKey)` final.

**¿Dónde se define qué mensaje ve el usuario durante un 429 vs. un 500?**
> Solo el 429 pinta un countdown visible (`waitWithCountdown` → `renderCountdown`), porque el plan lo exige explícitamente para ese código de estado ("countdown visible" en la sección 4 de `PlanProyecto.md`). El 500 espera el mismo tiempo (`sleep(waitMs)`) pero en silencio — no hay una razón funcional para mostrarle al usuario un número exacto de segundos cuando la causa es una falla interna del servidor y no un límite de tasa que el usuario pueda entender o predecir.

**¿Qué pasa si `notifySessionRestored()` se llama sin que haya ninguna petición esperando (`sessionRecovery` es `null`)?**
> El `if (sessionRecovery)` lo protege: si no hay nada pendiente, la función no hace nada. Esto puede pasar si el usuario abre el modal manualmente sin que ninguna petición haya fallado (no ocurre en el flujo actual, pero la guarda evita un `TypeError` si en el futuro se agrega otro disparador para el modal).

---

# Estudio Técnico — Fase 3: La Ruta del Campeón (2.1)

---

## ¿Qué se construyó en esta fase?

El primer subproyecto real, consumiendo el fetcher de la Fase 2 por primera vez: un selector de los 48 equipos, un itinerario de tarjetas con los partidos de cada equipo cruzados contra sus estadios, y el conteo de ciudades distintas. Es también la fase donde se descubrió el schema real de la API — hasta este punto solo se había integrado el login.

---

## 1. El schema real de la API (descubierto con `curl`, no documentado en el enunciado)

### ¿Cómo se conoció la forma exacta de los datos sin credenciales de prueba?

`GET /get/teams`, `/get/games`, `/get/stadiums` y `/get/groups` resultaron responder con `curl` **sin ningún header de `Authorization`** — el servidor no exige el JWT del lado suyo para esos endpoints, aunque el laboratorio sí lo exige del lado del cliente (y `fetchWithAuth()` lo adjunta siempre, sin excepción, independientemente de que el servidor lo valide o no). Eso permitió inspeccionar la forma real de la respuesta antes de escribir una sola línea de `rutaCampeon.js`, en vez de asumir los tipos que sugiere la redacción del enunciado.

### ¿Qué diferencias hay entre lo que sugiere el enunciado y lo que realmente devuelve la API?

| Campo | Lo que sugiere el enunciado | Lo que devuelve la API |
|---|---|---|
| `finished` | booleano (`finished: true`) | **string** `"TRUE"` / `"FALSE"` |
| `home_score`, `away_score` | numérico | **string** numérico (`"2"`) |
| `ga` (goles en contra, en `/get/groups`) | numérico | **string** numérico (`"0"`) |
| `id`, `team_id`, `home_team_id`, `away_team_id`, `stadium_id` | — | todos **string**, nunca number |

Esto importa porque `g.finished === true` **nunca** sería verdadero contra esta API real — siempre hay que comparar contra el string `'TRUE'`. Y las restas entre scores (`home_score - away_score`) exigen `Number(...)` primero, porque JavaScript sí puede restar strings numéricos por coerción implícita (`"7" - "1" === 6` funciona), pero comparar (`"10" > "9"`) como string daría un resultado incorrecto por orden lexicográfico, no numérico.

### ¿Por qué los ids son strings y no importa para las comparaciones?

Como **todos** los ids relacionados (`team.id`, `game.home_team_id`, `game.away_team_id`, `stadium.id`, `game.stadium_id`) son consistentemente strings en toda la API, comparar con `===` entre ellos funciona sin conversión — el problema solo aparece si se mezclara un id-string contra un número literal (ej. `team.id === 2` en vez de `team.id === '2'`).

---

## 2. Arquitectura de `rutaCampeon.js`

### ¿Por qué el estado vive en un objeto de módulo (`rutaCampeonState`) y no en variables sueltas?

```javascript
const rutaCampeonState = {
  built: false,
  teams: null,
  games: null,
  stadiums: null,
  stadiumsUnavailable: false,
  selectedTeamId: '',
};
```

Como los scripts son clásicos (no módulos ES), cualquier variable declarada con `const`/`let` a nivel de archivo vive en el scope global compartido por **todos** los `<script>` cargados. Usar un único objeto con un nombre único por sección (`rutaCampeonState`, y más adelante `rastreadorGoleadasState`, `elMuroState`) evita colisiones de nombres entre archivos de `sections/` que de otro modo pisarían variables sueltas con el mismo nombre (ej. dos secciones declarando cada una su propio `let teams`).

### ¿Por qué `initRutaCampeon()` tiene una guarda `if (rutaCampeonState.built) return;`?

```javascript
function initRutaCampeon() {
  if (rutaCampeonState.built) return;
  rutaCampeonState.built = true;
  ...
}
```

`main.js` llama a `initSection(sectionId)` **cada vez** que el usuario hace clic en un botón de navegación, incluso si ya visitó esa sección antes. Sin esta guarda, cada clic dispararía peticiones nuevas a `teams`, `games` y `stadiums` — rompiendo el requisito de "lazy loading" (cargar los datos de una sección solo la primera vez que se activa, no en cada visita) y generando tráfico de red innecesario. La sección construye su DOM y pide sus datos **una sola vez**; después de eso, cambiar de sección solo oculta/muestra el `<div>` ya armado.

### ¿Por qué `getTeams()`, `getGames()` y `getStadiums()` se llaman sin `await` entre ellas, una detrás de otra?

```javascript
buildRutaCampeonShell();
loadRutaCampeonTeams();
loadRutaCampeonGames();
loadRutaCampeonStadiums();
```

Cada `loadRutaCampeon*()` es una función `async` que se invoca aquí **sin** `await`. Eso significa que las tres arrancan casi al mismo tiempo (en paralelo), no una después de que la anterior termine. Es la misma idea que la arquitectura general del plan exige ("no hay dependencia de orden entre peticiones cruzadas"): cada una actualiza su propio pedazo de estado y llama a `renderRutaCampeonItinerary()` cuando termina, sin importar en qué orden lleguen las tres respuestas.

### ¿Cómo sabe `renderRutaCampeonItinerary()` si todavía está esperando datos?

La función se reinvoca **cada vez** que `teams`, `games` o `stadiums` cambian de estado (llega, falla, o el usuario cambia de equipo en el selector). Dentro, revisa el estado actual del objeto compartido:

```javascript
if (!rutaCampeonState.games) {
  container.innerHTML = '<p class="loading">Cargando partidos…</p>';
  return;
}
```

No hay banderas de "loading" separadas por endpoint — el propio valor (`null` = todavía no llegó) sirve como señal. Es el mismo patrón para `stadium`: si `findStadiumById()` no encuentra nada, la tarjeta consulta `rutaCampeonState.stadiumsUnavailable` para distinguir "todavía no llegó" (`"Cargando estadio…"`) de "llegó y falló definitivamente" (`"Estadio no disponible"`).

---

## 3. El Reto de Resiliencia de 2.1

### ¿Cómo se garantiza que las tarjetas no desaparezcan si `/get/stadiums` falla?

`loadRutaCampeonGames()` y `loadRutaCampeonStadiums()` son fetches **completamente independientes**. Las tarjetas se construyen en `renderRutaCampeonItinerary()` a partir de `rutaCampeonState.games` (ya en memoria) sin esperar a que `stadiums` resuelva. Cuando `stadiums` finalmente falla (después de agotar los 4 reintentos de `fetchWithRetry`), lo único que cambia es el campo interno de cada tarjeta:

```javascript
const stadium = findStadiumById(game.stadium_id);
let stadiumHtml;
if (stadium) {
  stadiumHtml = `${stadium.name_en} — ${stadium.city_en}, ...`;
} else if (rutaCampeonState.stadiumsUnavailable) {
  stadiumHtml = '<span class="offline">Estadio no disponible</span>';
} else {
  stadiumHtml = 'Cargando estadio…';
}
```

Verificado en navegador (Playwright + Chromium headless) forzando `/api/get/stadiums` a devolver 500 siempre: las 4 tarjetas del itinerario permanecieron visibles durante los ~15 s de backoff (1s→2s→4s→8s), pasando de "Cargando estadio…" a "Estadio no disponible" sin que ninguna tarjeta desapareciera ni se disparara ningún error de consola.

### ¿Por qué "los partidos ya obtenidos no se vuelven a pedir" se cumple automáticamente?

Porque `games` se pide **una sola vez** por sección (guardado en `rutaCampeonState.games`), y cambiar de equipo en el selector solo vuelve a **filtrar** ese arreglo ya en memoria — nunca dispara un nuevo `fetch()`. No hace falta código extra para evitar refetch: es una consecuencia directa de que el estado vive en memoria y el filtrado es puramente local.

---

## 4. Ciudades distintas con `Set`

```javascript
const cities = new Set();
// ...dentro del map de cada partido:
if (stadium) {
  cities.add(stadium.city_en);
  ...
}
// ...
summary.textContent = `Ciudades distintas a visitar: ${cities.size}`;
```

Un `Set` descarta automáticamente valores repetidos. Como varios partidos de un mismo equipo pueden jugarse en la misma ciudad (fase de grupos, por ejemplo), simplemente agregar `city_en` de cada partido a un `Set` y leer `.size` al final da el conteo de ciudades **distintas** sin necesidad de llevar un arreglo auxiliar y filtrar duplicados a mano.

### ¿Por qué el contador de ciudades queda oculto (`summary.classList.add('hidden')`) mientras `stadiums` no ha llegado?

Porque el número sería **incorrecto** si se calculara antes de tiempo: si `stadiums` todavía no resolvió, `cities` se construiría vacío o parcial (solo con los estadios que ya se hubieran cruzado, si los hubiera). Mostrar "Ciudades distintas a visitar: 0" mientras la petición sigue en curso confundiría al usuario haciéndole pensar que el equipo no viaja a ninguna parte. Ocultar el resumen hasta tener `rutaCampeonState.stadiums` completo evita ese falso negativo.

---

## 5. El gap del countdown en 429 (encontrado en revisión, no en la implementación inicial)

### ¿Cuál era el problema?

La primera versión de `rutaCampeon.js` solo le pasaba `countdownContainerId` a `getStadiums()`, no a `getTeams()` ni a `getGames()`:

```javascript
// ANTES — incompleto
await getStadiums({ countdownContainerId: 'rc-stadiums-countdown' });
await getTeams();   // sin countdownContainerId
await getGames();   // sin countdownContainerId
```

`waitWithCountdown()` (Fase 2, sección 4 de este documento) hace `sleep()` silencioso cuando no recibe un `containerId` válido. Eso significa que, si el profesor forzaba un 429 sobre `/get/teams` o `/get/games` durante la defensa (no solo sobre `/get/stadiums`, que es el único endpoint mencionado en el Reto de Resiliencia específico de 2.1), el reintento ocurriría **sin countdown visible** — un incumplimiento directo del requisito obligatorio de la sección 4 de `PlanProyecto.md` ("Para 429: countdown visible en UI"), que aplica a **toda** petición, no solo a la del reto de resiliencia de cada subproyecto.

### ¿Cómo se corrigió?

Agregando un contenedor de countdown dedicado por cada endpoint que la sección consume:

```html
<div id="rc-teams-countdown"></div>
<div id="rc-games-countdown"></div>
<div id="rc-stadiums-countdown"></div>
```

```javascript
await getTeams({ countdownContainerId: 'rc-teams-countdown' });
await getGames({ countdownContainerId: 'rc-games-countdown' });
await getStadiums({ countdownContainerId: 'rc-stadiums-countdown' });
```

Verificado forzando un 429 en `/api/get/teams`: el countdown "Reintentando en 1s…" apareció en `#rc-teams-countdown`, y el selector se pobló correctamente en cuanto el segundo intento tuvo éxito. Este patrón — **un contenedor de countdown por cada llamada a `getX()`, sin excepción** — se aplicó desde el inicio en las Fases 4 y 5, no solo como corrección tardía en 2.1.

---

## 6. Preguntas de defensa relacionadas con Fase 3

**¿Por qué `finished` se compara con `=== 'TRUE'` y no con `=== true`?**
> Porque la API real de `worldcup26.ir` devuelve ese campo como el string `"TRUE"` / `"FALSE"`, no como booleano — se confirmó inspeccionando la respuesta real con `curl` antes de escribir el filtro. Comparar contra `true` nunca sería verdadero contra esta API, aunque el enunciado del laboratorio lo redacte como si fuera booleano.

**¿Qué pasa si el usuario selecciona un equipo antes de que `/get/games` haya respondido?**
> `renderRutaCampeonItinerary()` revisa `rutaCampeonState.games` al inicio; si todavía es `null`, muestra "Cargando partidos…" y no intenta filtrar nada. En cuanto `loadRutaCampeonGames()` resuelve, vuelve a llamar a `renderRutaCampeonItinerary()`, que esta vez sí encuentra los datos y renderiza el itinerario del equipo ya seleccionado — sin que el usuario tenga que volver a interactuar con el selector.

**¿Por qué el conteo de ciudades usa `city_en` y no `city_fa` o el nombre del estadio?**
> Porque el enunciado pide explícitamente "ciudades distintas (`city_en`)" — varios estadios pueden compartir la misma ciudad (ej. dos estadios distintos en la misma área metropolitana), así que contar por nombre de estadio sobrestimaría el número de ciudades visitadas.

---

# Estudio Técnico — Fase 4: Rastreador de Goleadas (2.2)

---

## ¿Qué se construyó en esta fase?

Un ranking de partidos terminados con diferencia de gol ≥ 3, ordenado de mayor a menor goleada, con nombre y bandera reales de cada equipo — y su degradación controlada a ids crudos cuando `/get/teams` falla.

---

## 1. El cálculo: filtrar, mapear, filtrar de nuevo, ordenar

```javascript
const blowouts = rastreadorGoleadasState.games
  .filter(g => g.finished === 'TRUE')
  .map(g => ({ game: g, diff: Math.abs(Number(g.home_score) - Number(g.away_score)) }))
  .filter(entry => entry.diff >= 3)
  .sort((a, b) => b.diff - a.diff);
```

### ¿Por qué hay dos `.filter()` separados en vez de combinar todo en uno?

El primero (`finished === 'TRUE'`) descarta partidos que ni siquiera tienen un resultado válido que comparar. El segundo (`diff >= 3`) filtra sobre un valor que **todavía no existe** hasta después del `.map()` — no se puede filtrar por `diff` antes de calcularlo. Separar los pasos (filtrar → calcular → filtrar → ordenar) también hace que cada línea sea trivial de leer y de explicar una por una, en vez de una única expresión condicional densa mezclando `finished`, la resta y el umbral de 3 goles.

### ¿Por qué `Number(g.home_score) - Number(g.away_score)` y no `g.home_score - g.away_score` directo?

Como se documentó en la Fase 3, `home_score` y `away_score` llegan como strings (`"7"`, `"1"`). JavaScript coacciona strings numéricos en una resta (`"7" - "1"` sí da `6`), así que **funcionaría por accidente** sin el `Number()` explícito — pero dejarlo implícito sería frágil y confuso de explicar en la defensa ("¿por qué esto funciona si son strings?"). `Number(...)` hace la conversión explícita y a propósito, dejando claro que se sabe que el dato de origen es un string.

---

## 2. El Reto de Resiliencia: ids como respaldo temporal

### ¿Cómo se decide entre mostrar el nombre real o el id crudo?

```javascript
function renderRastreadorTeamLabel(teamId) {
  const team = findRastreadorTeamById(teamId);
  if (team) {
    return `<span class="rg-team"><img class="rg-flag" src="${team.flag}" alt="${team.name_en}">${team.name_en}</span>`;
  }
  return `<span class="rg-team rg-team-fallback">Equipo #${teamId}</span>`;
}
```

`findRastreadorTeamById()` busca en `rastreadorGoleadasState.teams`, que es `null` mientras la petición no ha resuelto **o** ha fallado definitivamente. En cualquiera de esos dos casos, `team` es `undefined` y la función cae al `return` con el id crudo — no hace falta una bandera separada de "fallback": la ausencia del dato es, por sí sola, la señal de degradar. Esto es exactamente lo que pide el Reto de Resiliencia de 2.2: mostrar ids como respaldo temporal, nunca bloquear la lista completa por la falta de un solo endpoint.

### ¿Por qué `games` y `teams` se piden con `getGames()`/`getTeams()` completamente independientes, y no encadenados (`await getGames(); await getTeams();`)?

Encadenarlos significaría que si `teams` tardara (por un backoff largo), la lista de goleadas ni siquiera empezaría a renderizarse aunque `games` ya hubiera llegado hace rato. Al lanzarlos en paralelo (sin `await` entre ellos, mismo patrón que en Fase 3), la lista aparece en cuanto `games` está listo — con ids si `teams` aún no llegó — y se "auto-corrige" sola en cuanto `teams` resuelve, sin que el usuario perciba ningún bloqueo.

### ¿Cómo se verificó que los nombres reemplazan a los ids sin recargar la página?

Con Playwright: se interceptó `/api/get/teams` para fallar dos veces (500) y tener éxito en el tercer intento. La lista de 22 goleadas apareció de inmediato con `"Equipo #17"`, `"Equipo #18"`, etc.; ~3 segundos después (1s + 2s de backoff), la misma lista — mismas 22 filas, mismo orden — mostró `"Germany"`, `"Curaçao"` con sus banderas, sin ningún parpadeo de la lista completa ni recarga de la página.

---

## 3. Preguntas de defensa relacionadas con Fase 4

**¿Por qué el reto de resiliencia de 2.2 no necesita un `try/catch` explícito como El Muro (Fase 5)?**
> Porque acá la degradación depende de un solo endpoint compartido por **todas** las filas (`/get/teams`), no de un cálculo independiente por cada fila. Un solo chequeo (`if (team) ... else ...`) alcanza para las 22 filas a la vez — no hace falta aislar fallos fila por fila porque no hay ninguna operación que pueda fallar de forma distinta para un equipo puntual.

**¿Qué pasa si dos partidos tienen exactamente la misma diferencia de goles?**
> `Array.prototype.sort()` en JavaScript moderno es estable: dos elementos con el mismo valor de comparación (`b.diff - a.diff === 0`) conservan su orden relativo original, es decir, el orden en que `/get/games` los devolvió. El enunciado no exige ningún criterio de desempate adicional.

**¿Por qué se muestra el marcador exacto (`7 - 1`) y no solo la diferencia?**
> El enunciado pide calcular y filtrar por la diferencia, pero mostrar solo un número aislado ("6") sin el marcador real le quitaría contexto al usuario — "6 de diferencia" es más claro y verificable si se ve junto al resultado real del partido.

---

# Estudio Técnico — Fase 5: El Muro (2.3)

---

## ¿Qué se construyó en esta fase?

El ranking de los 5 equipos con menos goles en contra (mejor defensa) entre los 12 grupos, cruzando tres colecciones distintas (`/get/groups`, `/get/teams`, `/get/games`), con el próximo partido pendiente de cada uno de los 5.

---

## 1. Aplanar 12 grupos en 48 registros

```javascript
function computeElMuroTopFive() {
  const entries = [];
  elMuroState.groups.forEach(group => {
    group.teams.forEach(t => entries.push({ teamId: t.team_id, ga: Number(t.ga) }));
  });
  entries.sort((a, b) => a.ga - b.ga);
  return entries.slice(0, 5);
}
```

### ¿Por qué hace falta un `forEach` anidado en vez de un solo `.map()`?

`/get/groups` devuelve un arreglo de 12 grupos, cada uno con su propio arreglo `teams` de 4 equipos (`group.teams`). No es una lista plana de 48 elementos — es una lista de 12 listas de 4. El `forEach` externo recorre los grupos; el interno extrae los 4 equipos de cada uno y los empuja a un único arreglo `entries` acumulado fuera del bucle. Es la forma más directa de "aplanar" esa estructura sin usar `Array.prototype.flat()` (que también hubiera funcionado, pero habría requerido un `.map()` intermedio para quedarse solo con `{teamId, ga}` de cada equipo, sin ganar claridad).

### ¿Por qué `Number(t.ga)` y no comparar los strings directamente en el `sort`?

Igual que con los scores en la Fase 4: `ga` llega como string (`"0"`, `"1"`, `"10"`, ...). Ordenar strings numéricos con `sort()` sin convertir daría un resultado por orden **lexicográfico**, no numérico — por ejemplo, `"10"` ordenaría antes que `"2"` porque `'1' < '2'` como caracteres. `Number(t.ga)` se aplica **al momento de construir cada entrada** (no dentro del comparador del `sort`), así el resto del código (mostrar el valor, comparar en el `sort`) ya trabaja con números reales.

---

## 2. El Reto de Resiliencia: fallos por equipo sin un endpoint por equipo

### ¿Por qué el reto dice "si la búsqueda falla para uno solo de los 5" si no existe un endpoint que se pida una vez por equipo?

Esta es la decisión de diseño más importante de la fase, y vale explicarla con cuidado en la defensa: la API **no tiene** un endpoint como `/get/next-match/:teamId` — solo existe `/get/games`, una única colección compartida por los 5 equipos del ranking. Un fallo de red aislado que afecte a un solo equipo y no a los otros 4 **no puede ocurrir** de forma natural con un único `fetch()` compartido: o `games` llega para todos, o falla para todos por igual.

Por eso el reto de resiliencia se modeló como una garantía de **aislamiento de errores en el cálculo**, no de red: cada fila del ranking calcula su propio "próximo rival" dentro de un `try/catch` independiente:

```javascript
function renderElMuroRow(entry, rank) {
  try {
    const team = findElMuroTeamById(entry.teamId);
    // ...
    return `<div class="card em-row">...${findElMuroNextMatchHtml(entry.teamId)}...</div>`;
  } catch (error) {
    return `
      <div class="card em-row">
        <div class="em-rank">#${rank}</div>
        <div class="em-next"><span class="offline">Próximo rival no disponible</span></div>
      </div>
    `;
  }
}
```

Si un dato puntual llegara corrupto o inesperado para un equipo específico (por ejemplo, un cruce que lanza una excepción al procesar justo esa fila), el `catch` de **esa** fila la degrada a "Próximo rival no disponible" sin tocar el `try` de las otras cuatro, que ni se enteran de que hubo un error en la fila vecina — cada `renderElMuroRow()` es una llamada de función independiente.

### ¿Y qué pasa si `/get/games` falla por completo (no solo para un equipo)?

Ese es el otro camino de degradación, más simple: `elMuroState.gamesUnavailable` se activa una sola vez cuando `loadElMuroGames()` agota los reintentos, y `findElMuroNextMatchHtml()` lo consulta al inicio:

```javascript
function findElMuroNextMatchHtml(teamId) {
  if (elMuroState.gamesUnavailable) {
    return '<span class="offline">Próximo rival no disponible</span>';
  }
  if (!elMuroState.games) {
    return 'Buscando próximo partido…';
  }
  // ...
}
```

En ese caso, los 5 muestran "Próximo rival no disponible" **a la vez** — comportamiento correcto porque la causa real (la única fuente de partidos cayó) también es compartida por los 5. Se verificó forzando `/api/get/games` a devolver 500 siempre: el ranking (nombres, banderas, goles en contra) permaneció íntegro durante y después de los ~15 s de backoff; solo el campo de próximo rival se degradó, en las 5 filas, sin que ninguna desapareciera.

### ¿Por qué el ranking en sí (nombre, bandera, GC) no tiene el mismo `try/catch` que el próximo rival?

Porque si `/get/groups` falla, no hay ranking que construir en absoluto — no hay 5 filas parciales posibles, ya que el Top 5 completo depende de tener los 48 registros de goles en contra. Por eso ese caso se maneja **antes**, a nivel de sección completa (`elMuroState.groupsUnavailable` → mensaje de error único reemplazando toda la lista), no fila por fila. El `try/catch` por fila solo tiene sentido para el paso que sí puede fallar de forma parcial: la búsqueda del próximo partido, que depende de una fuente distinta (`games`) a la que sí puede llegar sin problema aunque `groups` también hubiera fallado.

---

## 3. Cómo se identificó el "próximo partido" de cada equipo

```javascript
const upcoming = elMuroState.games
  .filter(g => (g.home_team_id === teamId || g.away_team_id === teamId) && g.finished === 'FALSE')
  .sort((a, b) => new Date(a.local_date) - new Date(b.local_date));

const next = upcoming[0];
```

Filtra todos los partidos (de grupos **y** de eliminación directa — `/get/games` no distingue fase en este filtro) donde el equipo participa como local o visitante y todavía no se jugó, los ordena cronológicamente, y toma el primero. Verificado contra los datos reales: España, con 0 goles en contra, mostró correctamente su semifinal pendiente contra Francia (14 de julio de 2026); los otros 4 equipos del Top 5 mostraron "Sin partidos pendientes" porque, a la fecha de la verificación (13 de julio de 2026), ya estaban eliminados del torneo — comportamiento esperado de los datos reales, no un error del cálculo.

---

## 4. Preguntas de defensa relacionadas con Fase 5

**¿Por qué se necesitan tres fetches (`groups`, `teams`, `games`) para un solo subproyecto?**
> Cada uno aporta un dato que ninguno de los otros dos tiene: `groups` da el ranking crudo por goles en contra (`team_id` + `ga`), `teams` traduce esos ids a nombre y bandera, y `games` es la única fuente que sabe qué partidos están pendientes. El enunciado pide explícitamente cruzar las tres colecciones — es el "cruce de datos" central de El Muro.

**¿Qué pasa si dos equipos tienen exactamente el mismo `ga` en la frontera del Top 5 (por ejemplo, puesto 5 y 6 empatados)?**
> El `sort()` es estable, así que el orden entre empatados depende del orden en que `/get/groups` los devolvió originalmente (no hay criterio de desempate adicional en el enunciado). Se confirmó con los datos reales: cuatro equipos empatados en `ga = 1` compiten por los puestos 3, 4 y 5 — solo tres de los cuatro entran al Top 5, en el orden que trae la API.

**¿Por qué `findElMuroNextMatchHtml()` distingue "Buscando próximo partido…" de "Sin partidos pendientes" de "Próximo rival no disponible"?**
> Son tres estados distintos que no deben confundirse: el primero es "todavía no llegó el dato" (`!elMuroState.games`), el segundo es "el dato llegó bien pero ese equipo no tiene partidos futuros en la data" (ya fue eliminado o el torneo terminó para él), y el tercero es "el dato nunca llegó y ya no va a llegar" (`gamesUnavailable`, reintentos agotados). Tratarlos igual le daría al usuario información falsa sobre por qué no ve un próximo partido.

---

# Estudio Técnico — Fase 6: Analítica de Estadios (2.4)

---

## ¿Qué se construyó en esta fase?

Una agregación (no un cruce 1-a-1 como las fases anteriores): por cada uno de los 16 estadios, contar cuántos partidos alberga y calcular su "asistencia potencial" (`capacity × partidos`), ordenados de mayor a menor. La gráfica de barras la exige el enunciado explícitamente "sin librerías" — se resolvió con SVG generado a mano desde JavaScript, no con Canvas ni con una librería de charts.

---

## 1. Contar partidos por estadio sin una nueva estructura de datos

```javascript
function computeAnaliticaEstadiosStats() {
  const games = analiticaEstadiosState.games;
  const stats = analiticaEstadiosState.stadiums.map(stadium => {
    const matches = games ? games.filter(g => g.stadium_id === stadium.id).length : null;
    const potential = matches !== null ? stadium.capacity * matches : null;
    return { stadium, matches, potential };
  });

  stats.sort((a, b) => games
    ? b.potential - a.potential
    : b.stadium.capacity - a.stadium.capacity);

  return stats;
}
```

### ¿Por qué `matches` puede ser `null` y no simplemente `0` mientras `games` no ha llegado?

Porque `0` y "todavía no sé" son estados semánticamente distintos y el Reto de Resiliencia de 2.4 depende de distinguirlos: un estadio con `matches: 0` significa "ya sé que no alberga ningún partido" (dato completo), mientras que `matches: null` significa "no puedo calcular esto todavía". Si se usara `0` para ambos casos, la gráfica mostraría "0 partidos" en las 16 barras mientras `/get/games` sigue en vuelo — información falsa, no un estado de carga.

### ¿Por qué el criterio de orden cambia según si `games` ya llegó?

```javascript
stats.sort((a, b) => games
  ? b.potential - a.potential
  : b.stadium.capacity - a.stadium.capacity);
```

Antes de que `games` resuelva, `potential` es `null` para las 16 filas — no hay nada por lo cual ordenar por asistencia potencial todavía. En vez de dejar el orden "como sea" (el orden en que `/get/stadiums` los devolvió) mientras se espera, se usa un criterio provisional razonable (capacidad) para que la gráfica no se vea vacía ni desordenada al azar durante la carga. En cuanto `games` llega, el siguiente render recalcula y reordena por el criterio real (`potential`), reemplazando el orden provisional sin que el usuario tenga que hacer nada.

---

## 2. La gráfica de barras: SVG generado con JavaScript, no Canvas ni una librería

```javascript
function renderAeSvgBar(percent, modifierClass) {
  const width = 200;
  const height = 10;
  const fillWidth = Math.max(2, Math.round((Math.min(100, Math.max(0, percent)) / 100) * width));
  return `
    <svg class="ae-bar-svg ${modifierClass}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
      <rect class="ae-bar-track" x="0" y="0" width="${width}" height="${height}" rx="${height / 2}"></rect>
      <rect class="ae-bar-fill" x="0" y="0" width="${fillWidth}" height="${height}" rx="${height / 2}"></rect>
    </svg>
  `;
}
```

### ¿Por qué SVG y no Canvas, si el stack tecnológico permite ambos?

Con Canvas, dibujar una barra significa llamar a `ctx.fillRect(...)` sobre un `<canvas>` que es una superficie de píxeles opaca para el DOM — no queda ningún elemento inspeccionable, no hereda las variables CSS del tema (claro/oscuro) automáticamente, y si la ventana cambia de tamaño o el usuario activa el modo oscuro, hay que volver a dibujar todo manualmente en JavaScript. Con SVG, cada barra es un `<rect>` real: se puede inspeccionar en DevTools como cualquier otro elemento, y el color de relleno se controla con una clase CSS (`.ae-bar-fill { fill: var(--color-primary); }`) que cambia sola cuando cambia `--color-primary` en `[data-theme="dark"]`, sin que `renderAeSvgBar()` sepa nada de temas.

### ¿Por qué cada barra es un `<svg>` pequeño e independiente en vez de un único `<svg>` grande con las 16 filas dentro?

Se evaluó, pero un único SVG grande obligaría a calcular manualmente la posición `y` de cada fila y las coordenadas de cada texto dentro del sistema de coordenadas del SVG — duplicando el trabajo de layout que el flujo normal de HTML (flexbox) ya hace gratis. Con un `<svg>` pequeño por barra, el nombre del estadio, las etiquetas y los números siguen siendo HTML normal (`<span>`), y el SVG solo se encarga de la parte que realmente necesita dibujo vectorial: la barra en sí. Es el mismo principio de "SVG para lo visual, HTML para el contenido accesible" que usan los patrones de gráficos accesibles.

### ¿Por qué las barras llevan `role="img" aria-hidden="true"` en vez de un `<title>` describiendo el valor?

El número real (`94 000`, `9 partidos`) ya está en un `<span class="ae-metric-value">` de texto plano justo al lado, que un lector de pantalla sí anuncia. La barra SVG es una redundancia puramente visual de ese mismo número — así que se oculta de la lectura (`aria-hidden="true"`) para no hacer que el lector de pantalla anuncie el mismo dato dos veces (una vez como número, otra como "gráfico, valor 94000").

---

## 3. El Reto de Resiliencia de 2.4: verificado con Playwright, no solo revisado en código

### ¿Qué pasa exactamente si `/get/games` falla después de que `/get/stadiums` ya se cargó?

```javascript
function renderAeGamesNotice() {
  if (analiticaEstadiosState.gamesUnavailable) {
    return `<div class="ae-notice offline" role="status">No se pudieron cargar los partidos. Mostrando solo la capacidad de los estadios.<button ...>Reintentar</button></div>`;
  }
  if (!analiticaEstadiosState.games) {
    return '<div class="ae-notice loading" role="status">Esperando datos de partidos…</div>';
  }
  return '';
}
```

Se verificó con Playwright bloqueando `/api/get/games` **y** su archivo semilla (`data/seed-games.json`) — el peor caso posible, donde ni siquiera el plan de respaldo de último recurso (sección 5 de `PlanProyecto.md`) tiene datos que ofrecer. Resultado medido: las 16 barras de capacidad permanecieron dibujadas, cada fila cayó a `"esperando datos de partidos…"` en el campo de partidos, la asistencia potencial mostró `—` en vez de un número inventado, y apareció el aviso con botón "Reintentar" — sin que ninguna barra ya dibujada desapareciera.

### ¿Por qué esto funciona sin código especial de "recuperación parcial"?

Porque `computeAnaliticaEstadiosStats()` ya maneja `games === null` (todavía no llegó) de la misma forma que `analiticaEstadiosState.gamesUnavailable === true` (falló definitivamente) en cuanto a **qué se dibuja**: en ambos casos `matches` es `null` y el render cae al mismo texto de "esperando/no disponible" por fila. La única diferencia visible entre "cargando" y "falló" es el aviso superior (`renderAeGamesNotice()`), que sí distingue los dos casos para ofrecer un botón de reintentar solo cuando tiene sentido (no mientras la petición sigue en vuelo).

### ¿Qué pasa si `/get/stadiums` es el que falla, en vez de `/get/games`?

Ahí no hay nada que degradar parcialmente: sin estadios no hay filas que dibujar, así que la sección completa cae a un estado de error (`renderAeStadiumsErrorState()`, el mismo bloque `.rc-state-error` que reutilizan las demás secciones) con un botón de reintentar. Es la misma asimetría que en El Muro (Fase 5): el dato que define la lista completa (`stadiums`, igual que `groups` en El Muro) no tiene degradación parcial posible; el dato secundario que solo enriquece cada fila (`games`, igual que el próximo rival en El Muro) sí la tiene.

---

## 4. Preguntas de defensa relacionadas con Fase 6

**¿Por qué la asistencia potencial es `capacity × partidos` y no solo la capacidad del estadio?**
> Porque un estadio grande que alberga pocos partidos no necesariamente "recibe" más público total que uno mediano que alberga muchos. `capacity × partidos` aproxima cuántos asistentes totales pasarán por ese estadio a lo largo del torneo — es la métrica que el enunciado pide para ordenar, no la capacidad aislada.

**¿Por qué no se usa un `<canvas>` si es más común en tutoriales de gráficas?**
> El stack tecnológico del plan permite explícitamente "Canvas API o SVG manual". Se eligió SVG porque cada barra queda como un elemento del DOM real: inspeccionable, con clases CSS que heredan el tema claro/oscuro automáticamente, sin tener que reescribir la lógica de dibujo cada vez que cambia una variable de color o el tamaño de la ventana.

**Si `capacity` viniera como string igual que `home_score` en fases anteriores, ¿el cálculo se rompería?**
> No en este caso: a diferencia de `home_score`/`ga`, el campo `capacity` de `/get/stadiums` sí llega como número real en la API. La evidencia no fue solo asumida: `stadium.capacity.toLocaleString('es-CR')` renderizó `"94 000"` (con separador de miles) contra la API real — si `capacity` fuera un string, `toLocaleString()` heredado de `Object.prototype` no habría insertado ese separador, solo habría devuelto el string tal cual. La lección de la Fase 3 (nunca asumir el tipo del enunciado) se aplicó igual: se confirmó el tipo real observando el resultado renderizado, en vez de agregar una conversión "por si acaso".

---

# Estudio Técnico — Fase 7: Radar de Empates (2.5)

---

## ¿Qué se construyó en esta fase?

Una matriz visual de los partidos terminados en empate, agrupados por los 12 grupos de fase de grupos (A–L), con contador de empates por grupo y filtro para aislar un grupo a la vez. Es el subproyecto con el filtrado condicional más simple de los cinco (una sola condición compuesta), pero el que más se apoya en agrupar sobre una lista fija de categorías conocidas de antemano.

---

## 1. Filtrar empates y agrupar por una lista fija de códigos, no por los valores que aparezcan en los datos

```javascript
function computeRadarGroups() {
  const ties = radarEmpatesState.games.filter(g =>
    g.finished === 'TRUE' && Number(g.home_score) === Number(g.away_score) && GROUP_STAGE_CODES.includes(g.group));

  return GROUP_STAGE_CODES.map(code => ({
    code,
    ties: ties.filter(g => g.group === code),
  }));
}
```

### ¿Por qué `Number(g.home_score) === Number(g.away_score)` y no comparar los strings directamente?

Mismo motivo que en la Fase 4: los marcadores llegan como strings numéricos (`"1"`, `"0"`). La comparación de igualdad `===` entre dos strings numéricos iguales sí funcionaría por casualidad (`"1" === "1"` es `true`), pero dejarlo implícito sería inconsistente con el resto del código, que siempre convierte explícitamente antes de comparar o restar valores numéricos de la API. `Number(...)` en ambos lados deja la intención clara sin depender de que los dos valores tengan exactamente el mismo formato de string.

### ¿Por qué se recorre `GROUP_STAGE_CODES` (una constante de `shared.js`) para construir los 12 grupos, en vez de agrupar dinámicamente por los valores de `g.group` que aparezcan en `games`?

```javascript
const GROUP_STAGE_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
```

Agrupar dinámicamente (por ejemplo, con un `Map` que solo registra los códigos que efectivamente aparecen en algún empate) tiene un defecto: un grupo sin ningún empate simplemente **no existiría** en el resultado, y la matriz lo omitiría por completo — el usuario nunca sabría si ese grupo no tiene empates o si la sección simplemente no lo cargó. Al recorrer siempre los 12 códigos fijos de `GROUP_STAGE_CODES` (la misma constante que ya usan `getPhaseLabel()` en Rastreador de Goleadas y `findElMuroGroupForTeam()` en El Muro), cada uno de los 12 grupos **siempre** aparece en la matriz, con `ties: []` si no tiene empates — que se renderiza como "Sin empates en este grupo", una afirmación positiva y verificada, no un silencio ambiguo.

### ¿Por qué el filtro de empates incluye `GROUP_STAGE_CODES.includes(g.group)` si ya se sabe que `finished === 'TRUE'`?

`/get/games` mezcla partidos de fase de grupos (`group` es una letra A–L) con partidos de eliminación directa (`group` es un código como `R32`, `QF`, `FINAL` — ver `KNOCKOUT_STAGE_LABELS` en `shared.js`). Un empate en fase de eliminación directa no tiene sentido en el contexto de "Radar de Empates" (esos partidos se definen por penales o tiempo extra, no quedan como empate en el marcador final del dataset) y, sobre todo, no pertenece a ninguno de los 12 grupos que la matriz dibuja. Filtrar por `GROUP_STAGE_CODES.includes(g.group)` antes de agrupar evita que un partido de eliminación directa con marcador empatado intente agruparse bajo un código que no es A–L y se pierda silenciosamente.

---

## 2. Por qué no hace falta un `try/catch` por celda, a diferencia de El Muro

### ¿No es este el mismo patrón de "aislar fallos por fila" que el Reto de Resiliencia de El Muro (Fase 5)?

Es parecido pero no idéntico. En El Muro, el próximo rival de cada equipo requiere un cálculo no trivial (filtrar, ordenar por fecha, resolver el nombre del rival) que sí puede fallar de forma impredecible con datos puntuales corruptos. En Radar de Empates, cada celda de la matriz (`renderRadarTieCell()`) solo necesita leer campos que **ya se validaron** al construir la lista de empates (`game.home_score`, `game.away_score`, `game.group`) más una búsqueda segura de equipo (`findById`, que retorna `undefined` en vez de lanzar si no encuentra nada). No hay una operación arriesgada equivalente a "ordenar por fecha y tomar el primero" que justifique un `try/catch` por celda — el fallback de equipo (nombre desde `game.home_team_name_en` si `findRadarTeamById()` no encuentra el equipo) ya cubre el único punto real de degradación posible.

### ¿Cómo se cumple entonces el Reto de Resiliencia de 2.5 ("countdown visible por 429, grupos ya dibujados permanecen")?

Sin código adicional específico de la sección: `renderRadarEmpates()` construye los 12 grupos **después** de que `games` (y `teams`) resuelven, a partir del `fetchWithRetry()` genérico de la Fase 2 — el mismo que ya maneja el countdown de 429 para cualquier endpoint. Como toda la matriz depende de una sola petición de `games` (no de 12 peticiones, una por grupo), "los grupos ya dibujados permanecen visibles" se cumple trivialmente: mientras el countdown de `#rd-games-countdown` corre, la matriz completa del render anterior sigue en el DOM sin tocarse — no hay nada que borrar hasta que la nueva respuesta (exitosa o fallida) esté lista.

---

## 3. Preguntas de defensa relacionadas con Fase 7

**¿Por qué el filtro por grupo (chips "Grupo A", "Grupo B", ...) no vuelve a pedir datos al servidor?**
> Porque `applyRadarFilter()` filtra el arreglo `groups` que ya está completo en memoria (calculado una sola vez por `computeRadarGroups()` a partir de `radarEmpatesState.games`). Cambiar el filtro solo cambia qué subconjunto de esos 12 grupos ya calculados se pasa a `renderRadarGroupCard()` — es el mismo patrón de "filtrar en memoria, no volver a pedir" que usan los chips de Rastreador de Goleadas y El Muro.

**¿Qué pasa si un partido tiene `group: null` o un código que no es A–L ni una fase de eliminación reconocida?**
> `GROUP_STAGE_CODES.includes(g.group)` lo excluye del cálculo de empates sin lanzar ningún error — simplemente no cuenta para ningún grupo de la matriz. `getPhaseLabel()` (compartida con Rastreador de Goleadas) maneja ese mismo caso por separado con `if (!groupCode) return 'Fase eliminatoria';`, pero Radar de Empates no necesita esa función porque no muestra partidos de eliminación directa en absoluto.

**¿Por qué la matriz agrupa por `group` y no por fase (grupos vs. eliminación)?**
> Porque el enunciado de 2.5 pide explícitamente "agrupar por `group` (A a L)" — los empates de eliminación directa quedan fuera del alcance del subproyecto por definición del enunciado, no por una limitación técnica del código.

---

# Estudio Técnico — Fase 8: Accesibilidad e Inclusividad

---

## ¿Qué se construyó en esta fase?

El panel de accesibilidad (modo oscuro/claro + tamaño de texto, con persistencia y sin parpadeo), y una auditoría real — no solo una revisión de código — de contraste de color y área táctil en toda la app ya construida en las Fases 1–7. La auditoría encontró y corrigió varios problemas reales preexistentes: dos pares de color que no llegaban a 4.5:1, doce imágenes de banderas con `alt=""`, y un botón por debajo de 44×44 px. Se cierra con una auditoría de Lighthouse en 100/100.

---

## 1. El panel de accesibilidad: un solo panel, dos disparadores

```html
<button class="btn-logout btn-a11y-trigger a11y-trigger" aria-label="Abrir panel de accesibilidad" aria-haspopup="dialog">...</button>  <!-- en el sidebar -->
<button class="btn-drawer-toggle a11y-trigger topbar-a11y-btn" aria-label="Abrir panel de accesibilidad" aria-haspopup="dialog">...</button>  <!-- en el topbar móvil -->
```

### ¿Por qué hay dos botones distintos que abren el mismo panel?

El enunciado exige que el panel sea "accesible desde cualquier sección, ícono fijo en el header". El sidebar (donde vive el primer botón) solo es visible en pantallas de escritorio/tablet; en móvil se convierte en un drawer oculto por defecto (Fase 1). Si el único disparador viviera dentro del sidebar, un usuario en móvil tendría que abrir el drawer primero para llegar a la configuración de accesibilidad — una barrera extra, irónica en una función pensada para reducir barreras. El segundo botón vive en `.topbar` (visible solo en móvil, mismo breakpoint que oculta el sidebar) para que el panel quede alcanzable con un solo toque en cualquier tamaño de pantalla. Ambos comparten la clase `a11y-trigger`, así que `setupAccessibilityPanel()` solo necesita un `querySelectorAll('.a11y-trigger')` para conectar los dos sin duplicar lógica.

### ¿Por qué el panel es un `<div role="dialog" aria-modal="true">` con foco atrapado, en vez de un simple menú desplegable?

Porque contiene controles que cambian el estado global de la app (tema, tamaño de texto) y no una lista de opciones de navegación — el patrón de diseño correcto para eso es un diálogo modal, con las mismas garantías de teclado que ya tenía el modal de sesión expirada (Fase 1): el foco no debe "escaparse" hacia el contenido de atrás mientras el diálogo está abierto.

```javascript
function trapA11yFocus(event) {
  const panel = document.getElementById('a11y-panel');
  const focusable = Array.from(panel.querySelectorAll('button'));
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
```

Verificado con Playwright pulsando `Tab` siete veces seguidas desde que el panel se abre: la secuencia de foco fue `light → dark → normal → large → xlarge → a11y-close → light` — el séptimo `Tab` volvió al primer botón en vez de escaparse hacia la navegación del sidebar detrás del overlay. `Escape` cierra el panel y devuelve el foco al botón que lo abrió (`a11yLastFocused`), para que un usuario de teclado no "pierda el lugar" en la página al cerrar.

---

## 2. Modo oscuro sin parpadeo (FOUC)

### ¿Qué es el FOUC y por qué es un problema aquí?

FOUC (*Flash of Unstyled/Incorrect Content*) es el parpadeo que se ve cuando una página se pinta primero con un estilo por defecto y, una fracción de segundo después, JavaScript cambia ese estilo al que realmente correspondía. Si el tema oscuro se aplicara solo desde `js/ui/accessibility.js` (cargado al final del `<body>`, después de que el HTML y el CSS ya se parsearon y hay una primera pintura), un usuario con "Oscuro" guardado vería la página en claro durante una fracción de segundo antes de que cambiara a oscuro — visualmente molesto y, en la práctica, una señal de que la preferencia "no se aplicó de verdad" antes del render.

### ¿Cómo se evita?

```html
<head>
  <script>
    (function () {
      try {
        var theme = localStorage.getItem('wc26_theme');
        if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

        var fontScale = localStorage.getItem('wc26_font_scale');
        if (fontScale && fontScale !== 'normal') document.documentElement.setAttribute('data-font-scale', fontScale);
      } catch (_) {}
    })();
  </script>
  <link rel="stylesheet" href="css/main.css">
</head>
```

Este script vive **inline**, antes del `<link>` del CSS externo, en vez de en un archivo `.js` aparte. Un script inline es síncrono y bloquea el parseo del HTML hasta que termina de ejecutarse — para cuando el navegador llega a leer `css/main.css` y a calcular los estilos computados, el atributo `data-theme="dark"` ya está en el `<html>`, así que la primera pintura de la página **ya nace** en el tema correcto. Se verificó con Playwright interceptando la navegación justo después del "commit" (el punto donde el navegador empieza a procesar la respuesta): `document.documentElement.getAttribute('data-theme')` ya devolvía `"dark"` en ese instante, antes de que el resto del `<body>` siquiera existiera.

### ¿Por qué no se usa `prefers-color-scheme` directamente en CSS con una media query, en vez de JavaScript?

Porque el enunciado exige que la preferencia manual del usuario (guardada en `localStorage`) tenga **prioridad** sobre la preferencia del sistema operativo — un usuario que eligió "Claro" a propósito no debería volver a oscuro solo porque su sistema operativo cambia de tema. Una media query CSS pura no puede consultar `localStorage`; solo JavaScript puede decidir "si hay preferencia guardada, úsala; si no, cae a `prefers-color-scheme` como valor por defecto" — que es exactamente lo que hace el script inline.

---

## 3. Por qué el modo oscuro no es solo invertir los colores

### ¿Qué problema real tenía "solo invertir"?

Varias variables de color de la Fase 1 (`--color-primary`, `--color-accent`, `--color-success`, ...) cumplen **dos roles** distintos en el CSS existente:

1. Como **fondo sólido** con texto blanco encima (botones, badges destacados, el gradiente de `.rg-summary-card`) — ese contraste (blanco sobre azul saturado) no depende del tema de la página, es fijo.
2. Como **texto directo** sobre el fondo de la página o de una tarjeta (`.rc-hero-eyebrow`, `.sidebar-brand`, `.em-metric-value.em-metric-elite`) — ese contraste sí depende del tema, porque el fondo detrás del texto cambia.

Si se hubiera invertido `--color-primary` a un azul más claro para que el modo oscuro se viera "bien" como fondo de botón, el mismo azul-claro usado como texto (rol 2) habría quedado con contraste insuficiente contra el fondo oscuro de la página en unos casos, o el botón (rol 1) habría perdido contraste con el texto blanco en otros — los dos roles necesitan valores distintos, y no pueden resolverse cambiando una sola variable.

### ¿Cómo se resolvió sin tocar los ~15 archivos CSS que ya usaban esas variables?

Se agregó un **segundo grupo de variables**, una por cada color que se usa en el rol 2 (texto directo sobre superficie):

```css
:root {
  /* rol 1: fondo con texto blanco — NO cambia entre temas */
  --color-accent: #E31C3D;

  /* rol 2: texto directo sobre superficie — SÍ cambia entre temas */
  --text-accent-strong: var(--color-accent);   /* claro: mismo valor que color-accent */
}

[data-theme="dark"] {
  --text-accent-strong: #FF6B85;   /* oscuro: versión más clara, verificada en contraste */
}
```

Solo los ~6 selectores CSS que usaban una variable de marca como `color:` directo sobre el fondo de página (`rc-hero-eyebrow`, `sidebar-brand`, `topbar-title`, `nav-btn.active .nav-icon`, `btn-logout:hover`, `em-metric-value.em-metric-elite`, `em-next-match-empty`) se cambiaron para apuntar a la variable "-strong" en vez de la variable de marca original. Los ~40 selectores restantes que usan esas mismas variables como fondo de botón/badge/gradiente no se tocaron — siguen funcionando exactamente igual en ambos temas, porque su contraste (blanco sobre color saturado) nunca dependió del tema.

### ¿Cómo se verificó que los valores del modo oscuro realmente pasan 4.5:1, y no solo "se ven bien"?

Con un script de Node que implementa la fórmula de luminancia relativa de WCAG 2.1 (la misma que usa Lighthouse internamente) y calcula la razón de contraste exacta entre cada par color-de-texto/color-de-fondo antes de escribirlos en el CSS — no a ojo. Por ejemplo, `--text-accent-strong` en modo oscuro (`#FF6B85`) se probó contra los tres fondos donde realmente aparece (`--bg-primary`, `--bg-secondary`, `--bg-card` oscuros) y dio 6.73:1, 6.30:1 y 5.88:1 respectivamente — los tres por encima del mínimo de 4.5:1, con margen.

---

## 4. Bugs de contraste y accesibilidad reales encontrados en código ya existente (no nuevos de esta fase)

Al construir el modo oscuro hubo que revisar cada variable de color una por una, y esa revisión encontró tres problemas que ya existían desde fases anteriores, en modo claro, antes de que existiera ningún modo oscuro:

### `--text-muted` no pasaba AA en modo claro

```css
/* antes */
--text-muted: #8A90A2;   /* 2.97:1 contra --bg-primary — FALLA (mínimo 4.5:1) */

/* después */
--text-muted: #667085;   /* 4.64:1 contra --bg-primary — PASA */
```

`--text-muted` se usa en texto pequeño (0.75rem–0.875rem) en las cinco secciones: etiquetas de métricas, subtítulos, estado de búsqueda. El valor original medía 2.97:1 contra `--bg-primary` — muy por debajo del 4.5:1 que exige WCAG 2.1 AA para texto normal. Al no ser un color decorativo sino texto real con información (nombres de ciudad, etiquetas de conteo), esto era un incumplimiento real de la sección 7.1 del plan, presente desde la Fase 1, que solo se detectó al auditar sistemáticamente cada variable para el modo oscuro.

### El texto de `.countdown` (aviso de 429) tampoco pasaba AA

```css
/* antes */
--color-warning: #9A6700;   /* 4.21:1 contra la caja de countdown — FALLA */

/* después */
--color-warning: #8A5D00;   /* 4.98:1 contra la caja de countdown — PASA */
```

Un caso más sutil: el color en sí no se compara contra un fondo sólido, sino contra la **composición** de un texto ámbar sobre una caja semitransparente (`rgba(210, 153, 34, 0.1)`) sobre el fondo de página. Ese contraste compuesto (4.21:1) solo se descubre calculándolo explícitamente — no es obvio a simple vista que un ámbar oscuro sobre una caja ámbar clara esté tan cerca del límite. Es precisamente el componente que un usuario ve durante un 429, uno de los escenarios que el laboratorio evalúa explícitamente.

### Doce banderas con `alt=""` en las cuatro secciones de datos

```javascript
// antes (elMuro.js, radarEmpates.js, rastreadorGoleadas.js, rutaCampeon.js — 12 ocurrencias)
`<img class="rc-crest" src="${team.flag}" alt="">`

// después
`<img class="rc-crest" src="${team.flag}" alt="Bandera de ${team.name_en}">`
```

La sección 7.1 del propio `PlanProyecto.md` es explícita: *"nunca `alt=""` en contenido informativo"*. Una bandera de equipo dentro de una tarjeta de partido **es** contenido informativo (identifica de qué selección se trata), no decorativo — un `alt=""` le dice a un lector de pantalla que la ignore por completo, dejando al usuario sin saber qué equipo es cada bandera. El patrón se había copiado igual en las cuatro secciones de datos (Fases 3–5 y 7) porque todas reutilizan el mismo fragmento visual (`rc-crest`) sin que nadie hubiera revisado el atributo `alt` hasta esta auditoría.

### `.btn-toggle-pw` (mostrar/ocultar contraseña) medía ~26×26 px, no 44×44

```css
/* antes */
.btn-toggle-pw { padding: 4px; }   /* ícono 18px + 4px de padding = ~26×26 px de área táctil */

/* después */
.btn-toggle-pw { width: var(--tap-target-min); height: var(--tap-target-min); }   /* 44×44 px */
```

Al agrandar el área táctil del botón, su posición absoluta (`right: 12px` → `right: 4px`) y el `padding-right` del input de contraseña (`16px` → `52px`) tuvieron que ajustarse juntos, para que el texto escrito no quedara oculto detrás del botón ahora más ancho.

### ¿Por qué corregir bugs de fases anteriores en la fase de accesibilidad, en vez de dejarlos para cuando se detectaran?

Porque **se detectaron durante** esta fase — la auditoría sistemática de contraste (calcular la razón exacta de cada variable, no solo mirarla) es justamente el trabajo que corresponde a la Fase 8, y encontró estos cuatro casos como efecto directo de ese proceso. Dejarlos sin corregir habría significado entregar un modo oscuro construido sobre una base de contraste que ya fallaba en el tema claro existente.

---

## 5. El ajuste de tamaño de texto: una sola variable, cero rupturas de layout

```css
:root { --font-scale: 1; }
:root[data-font-scale="large"]  { --font-scale: 1.15; }
:root[data-font-scale="xlarge"] { --font-scale: 1.3; }

html { font-size: calc(100% * var(--font-scale)); }
```

### ¿Por qué escalar el `font-size` del `<html>` en vez de agregar una clase que agrande cada `font-size` individual?

Porque **toda** la tipografía y el espaciado de la app ya estaban en `rem` desde la Fase 1 (nunca en `px` fijos) — eso significa que "1rem" siempre representa una fracción del `font-size` del elemento raíz. Al cambiar ese único valor raíz con `calc(100% * var(--font-scale))`, cada `font-size`, cada `padding`, cada `gap` expresado en `rem` en cualquiera de las ~20 hojas de CSS del proyecto escala junto, en la misma proporción, sin tocar ni una sola de esas reglas individualmente. Si el proyecto hubiera usado `px` fijos en algún lugar, ese elemento se habría quedado con el tamaño original mientras todo lo demás crecía — layout roto. Verificado en el navegador con el nivel "Muy grande" (`--font-scale: 1.3`) activo en las cinco secciones: ningún texto se corta, ningún botón se desborda de su tarjeta.

### ¿Por qué los tres niveles usan nombres (`normal`/`large`/`xlarge`) en vez de guardar el número de escala directamente en `localStorage`?

Guardar el nombre del nivel (no el número `1.15`) desacopla la preferencia persistida del valor exacto de escala — si más adelante se ajustara `large` de `1.15` a `1.2` para afinar el diseño, un usuario que ya tenía "Grande" guardado seguiría viendo el nivel correcto (los tres botones del panel siguen mostrando cuál está activo comparando nombres, `--font-scale` no vive en el objeto `localStorage` en absoluto), sin tener que migrar datos guardados con el valor numérico viejo.

---

## 6. Por qué el login mantiene su propio tema fijo, sin importar la preferencia oscura/clara

```css
/* login.css */
#login-screen {
  --status-error-bg:     rgba(248, 81, 73, 0.08);
  --status-error-border: rgba(196, 33, 58, 0.35);
  --status-error-fg:     #C4213A;
}
```

### ¿Por qué hace falta "re-pinear" variables dentro de `#login-screen`?

Las variables CSS son heredadas: cualquier variable definida en `[data-theme="dark"]` (que apunta al `<html>`) se propaga hacia abajo a **todo** el DOM, incluido `#login-screen`, aunque ese panel use su propia paleta de colores fija en hexadecimal (`#F3F4F6`, decisión de diseño documentada desde la Fase 1: contraste visual entre el panel oscuro de la izquierda y el panel claro del formulario). El único lugar donde `#login-screen` sí consume una variable del sistema de temas es `.error-msg` (compartida con el mensaje de error del modal de reautenticación) — sin este re-pineo, un usuario que hubiera guardado "Oscuro" y luego cerrara sesión vería el mensaje de error del login con fondo oscuro flotando sobre el panel claro fijo, una mezcla visual inconsistente con el resto de esa pantalla.

### ¿Se verificó esto en el navegador, o es solo una deducción de cómo funciona la herencia de CSS?

Se verificó con Playwright: se guardó `wc26_theme: 'dark'` en `localStorage` antes de navegar (simulando un usuario que cerró sesión con el tema oscuro activo) y se leyó el color de fondo computado de `.login-panel-right` — dio `rgb(243, 244, 246)`, el mismo `#F3F4F6` fijo de siempre, confirmando que el panel de login ignora `data-theme="dark"` en el `<html>` que lo envuelve.

---

## 7. Verificación con Lighthouse: 100/100, no una estimación

### ¿Cómo se corrió Lighthouse si la mayoría de la app está detrás de un login?

Con la CLI de Lighthouse apuntando a un Chrome ya abierto vía su puerto de depuración remota (`--port`), en vez de dejar que Lighthouse abra su propio Chrome limpio. Aun así, Lighthouse **resetea el `localStorage` y las cookies antes de auditar** por diseño (para medir siempre una "primera visita" consistente) — así que, en la práctica, la auditoría real terminó corriendo contra `#login-screen`, no contra el `#app-screen` autenticado. Eso no invalida el resultado: el login es la primera pantalla real que ve cualquier usuario o evaluador, y también es HTML completo con formularios, landmarks y contraste propios que sí deben cumplir AA.

### ¿Qué encontró la primera corrida, y qué se corrigió?

La primera corrida dio 98/100 con un solo hallazgo: `landmark-one-main` — el documento no tenía ningún elemento con el landmark `<main>` mientras `#login-screen` estaba visible (el `<main>` real vive dentro de `#app-screen`, oculto en ese momento). Se agregó `role="main"` a `#login-screen` — como el otro `<main>` siempre está `display: none` mientras el login es visible (y viceversa), nunca coexisten dos landmarks `main` expuestos al árbol de accesibilidad al mismo tiempo. Segunda corrida: **100/100**, cero hallazgos.

---

## 8. Preguntas de defensa relacionadas con Fase 8

**¿Por qué el foco se mueve al botón de cerrar (`×`) al abrir el panel, y no se queda en el botón que lo abrió?**
> Es el patrón estándar de diálogos modales accesibles: mover el foco *dentro* del contenido nuevo que acaba de aparecer le confirma a un usuario de teclado o lector de pantalla que algo cambió y dónde está ahora. Dejar el foco en el botón disparador (que queda visualmente detrás del overlay) confundiría al usuario sobre qué parte de la pantalla está activa.

**¿Qué pasaría si se hubiera usado una clase (`.dark-mode`) en vez de un atributo (`data-theme="dark"`) para activar el tema oscuro?**
> Funcionalmente sería casi equivalente (`[data-theme="dark"]` y `.dark-mode` son selectores CSS válidos por igual), pero `data-*` es semánticamente el mecanismo pensado para "estado o configuración" en HTML5, mientras que las clases se asocian más a estilos estructurales. Se eligió `data-theme` porque dejaba espacio, sin ambigüedad, para un tercer valor futuro (`data-theme="auto"`, por ejemplo) sin inventar una segunda clase.

**¿Por qué el `<script>` anti-FOUC no reutiliza las funciones de `js/ui/accessibility.js`?**
> Porque en el momento en que ese script se ejecuta (antes del `<link>` del CSS, en el `<head>`), ninguno de los `<script src="...">` del final del `<body>` se ha cargado todavía — `accessibility.js` ni siquiera existe en memoria en ese punto. El script inline tiene que ser completamente autocontenido (su propia lectura de `localStorage`, su propio `matchMedia`) precisamente porque corre antes que todo lo demás.

**¿No sería más simple una sola variable de color por tema, en vez de dos grupos (`--color-*` y `--text-*-strong`)?**
> Sería más simple, pero matemáticamente no puede pasar las dos pruebas de contraste a la vez: un color que sirve como fondo de botón con texto blanco necesita ser lo bastante *oscuro* como para que ese blanco tenga 4.5:1 de contraste; el mismo color usado como texto sobre una página oscura necesita ser lo bastante *claro* como para tener 4.5:1 contra ese fondo oscuro. Son requisitos de luminancia opuestos — de ahí que se necesiten dos variables, no una.

---

# Estudio Técnico — Fase 9: Pruebas y Defensa

---

## ¿Qué se hizo en esta fase?

Una auditoría final de todo lo construido en las Fases 1–8: un grep literal de las tres prohibiciones absolutas del plan sobre el código completo, y la simulación real (no revisión de código, ejecución real contra un navegador) de los cuatro escenarios de error obligatorios (401, 429, 500, red caída) más los cinco retos de resiliencia específicos de cada subproyecto. El grep encontró una violación real que había pasado inadvertida desde la Fase 2.

---

## 1. El bug real: `.then()/.catch()` en `endpoints.js`

### ¿Dónde estaba y por qué no se había detectado antes?

```javascript
// antes — withEndpointCache() en endpoints.js
function withEndpointCache(cacheKey, fetcher) {
  if (!endpointCache[cacheKey]) {
    endpointCache[cacheKey] = fetcher().then(result => {
      if (!result.data) delete endpointCache[cacheKey];
      return result;
    }).catch(error => {
      delete endpointCache[cacheKey];
      throw error;
    });
  }
  return endpointCache[cacheKey];
}
```

`withEndpointCache()` es una capa que se agregó **después** de la Fase 2 (memoiza la promesa de cada `getTeams()`/`getGames()`/etc. por `cacheKey`, para que si tres secciones piden `teams` casi al mismo tiempo, solo se dispare una petición de red real, no tres). Al construirla, se resolvió con el patrón más directo para envolver una promesa ya existente — encadenar `.then()/.catch()` — sin caer en que esa capa nueva también está sujeta a la prohibición absoluta del plan, la misma que `fetcher.js` y `auth.js` sí habían respetado desde el principio. Quedó fuera del radar hasta que la Fase 9 corrió un grep literal sobre **todo** `js/`, no solo sobre los archivos que se tocaron más recientemente.

### ¿Cómo se corrigió sin cambiar el comportamiento (memoización + limpieza en fallo)?

```javascript
// después
function withEndpointCache(cacheKey, fetcher) {
  if (!endpointCache[cacheKey]) {
    endpointCache[cacheKey] = (async () => {
      try {
        const result = await fetcher();
        if (!result.data) delete endpointCache[cacheKey];
        return result;
      } catch (error) {
        delete endpointCache[cacheKey];
        throw error;
      }
    })();
  }
  return endpointCache[cacheKey];
}
```

Una función `async` autoinvocada (`(async () => { ... })()`) sigue devolviendo una `Promise` de inmediato, de forma síncrona — exactamente lo que `endpointCache[cacheKey]` necesita guardar para que la memoización siga funcionando igual (varias llamadas casi simultáneas a `getTeams()` siguen compartiendo la misma promesa en vuelo). Lo único que cambió es la sintaxis interna: `try/catch` en vez de `.then()/.catch()`, con la misma lógica exacta de "si no hay dato, borrar del caché para permitir un reintento futuro" en ambas ramas.

### ¿Por qué esta capa necesitaba memoización en primer lugar, si `fetchWithRetry()` (Fase 2) ya cachea en `localStorage`?

Son dos cachés con propósitos distintos y vidas distintas. El caché de `localStorage` (Fase 2, `offline.js`) persiste entre recargas de página y sirve como **plan de respaldo** cuando la API falla. `withEndpointCache()` es un caché **en memoria**, vive solo mientras la pestaña está abierta, y resuelve un problema distinto: cuando dos o tres secciones llaman a `getTeams()` en la misma fracción de segundo (por ejemplo, El Muro pide `teams` al mismo tiempo que Rastreador de Goleadas si el usuario navegó rápido entre ambas), sin esta capa se dispararían dos peticiones HTTP idénticas en paralelo — tráfico de red duplicado e innecesario — en vez de que la segunda llamada simplemente reciba la misma promesa que la primera ya puso en vuelo.

---

## 2. Metodología: Playwright con interceptación de red, no solo DevTools manual

### ¿Por qué usar Playwright para esto si el plan describe las pruebas como pasos manuales en DevTools?

`PlanProyecto.md` (sección 13) describe la simulación manual en DevTools porque es la forma en que **un evaluador humano**, en vivo durante la defensa, va a reproducir estos escenarios — y esa sigue siendo la referencia real para el día de la defensa. Para esta fase, en cambio, se necesitaba una verificación **repetible y medible**: Playwright permite interceptar una URL específica (`page.route('**/get/games', ...)`) y decidir programáticamente qué responder (401, 429, 500, o abortar la conexión para simular red caída), además de medir con precisión cuánto tiempo pasa entre reintentos — algo que a mano, cronómetro en mano en el Network tab, es mucho más propenso a error humano. Ambos caminos verifican exactamente el mismo comportamiento del lado del cliente; Playwright solo automatiza la parte de "provocar" el error de forma controlada.

### ¿Qué se verificó exactamente, con qué resultado medido?

| Escenario | Cómo se forzó | Resultado medido |
|---|---|---|
| 401 | `/get/teams` responde 401 una vez | Modal aparece, token se borra de `localStorage`, **0** navegaciones de página, UI ya renderizada persiste, reautenticación (mockeada) reintenta la petición original sola y puebla 8 equipos |
| 429 | `/get/stadiums` responde 429 dos veces, éxito al tercer intento | Countdown "Reintentando en 1s…" visible, reintentos a 1027 ms y 2009 ms de distancia, countdown se limpia solo al llegar el éxito |
| 500 | `/get/games` responde 500 siempre | 4 peticiones totales, distancias de 1025 ms / 2004 ms / 4008 ms entre ellas, banner de caché aparece después (~15 s totales, incluida la espera de 8 s tras el último intento fallido) |
| Red caída (`TypeError`) | `/get/teams` aborta la conexión | Banner de caché aparece en 632 ms — **sin** ningún reintento, confirmando que el backoff no se aplica cuando no hay respuesta HTTP en absoluto |
| Reto 2.1 | `/get/stadiums` cae, sin caché ni seed | Las 4 tarjetas de itinerario persisten, las 4 muestran "Estadio no disponible" |
| Reto 2.2 | `/get/teams` cae, sin caché ni seed | Las 22 tarjetas de goleadas persisten con nombres de respaldo del payload de `games` (ej. "Germany"), no con ids crudos |
| Reto 2.4 | `/get/games` cae, sin caché ni seed | Las 16 barras de capacidad persisten, cada fila cae a "esperando datos de partidos…" |

### Corrección a la descripción del Reto 2.2 en `PlanProyecto.md`

El plan original describía el fallback de 2.2 como "mostrando los ids como respaldo temporal". La implementación real (Fase 4) usa `game.home_team_name_en`/`game.away_team_name_en` — campos que ya vienen incluidos en el payload de `/get/games` — en vez de un id numérico crudo. Es un mejor resultado para el usuario (un nombre es más útil que un número), descubierto porque la API real trae esa redundancia de datos que el enunciado original no anticipaba. Se corrigió la redacción del plan para que coincida con lo que la app realmente hace — importante para no contradecirse a mitad de la defensa si un evaluador compara el plan escrito contra el comportamiento en pantalla.

---

## 3. Preguntas de defensa relacionadas con Fase 9

**Si el grep de `.then(`/`.catch(` hubiera encontrado el bug en un archivo de una sección (no en `endpoints.js`), ¿el arreglo habría sido distinto?**
> No en el enfoque — cualquier `.then()/.catch()` se puede reescribir como una función `async` con `try/catch` conservando el mismo orden de ejecución. Lo que sí cambia caso por caso es si la promesa necesita seguir siendo reutilizable después (como en `withEndpointCache`, que la guarda para memoización) o si es un uso de una sola vez — eso determina si hace falta envolverla en una IIFE `async` o si basta con marcar la función contenedora como `async` directamente.

**¿Por qué el escenario de red caída (632 ms) fue tan rápido comparado con el 500 (~15 s)?**
> Porque son rutas de código distintas dentro de `fetchWithRetry()`: un `TypeError` se captura en el primer `catch` y va **directo** a `loadFallback()` sin pasar por el bucle de reintentos en absoluto (`no se reintenta, va directo a paso 2`, como documenta el árbol de decisión de la sección 5 del plan). Un 500 sí entra al bucle y agota las 4 esperas exponenciales (incluida la de 8 s final) antes de llegar a ese mismo `loadFallback()` — por diseño, no por accidente: un servidor que respondió con 500 podría recuperarse si se le da tiempo; una conexión inexistente no.

**¿Qué garantiza que estas pruebas automatizadas reflejan lo que un evaluador vería reproduciendo los mismos pasos a mano en DevTools?**
> Ambas rutas ejercitan el mismo código de producción (`fetcher.js`, `endpoints.js`, cada `sections/*.js`) sin ningún atajo de prueba — Playwright solo controla qué responde la red (con `page.route()`), igual que "Block request URL" o editar una respuesta en el Network tab de DevTools controla la misma variable desde la interfaz del navegador. La diferencia es quién dispara el escenario (un script vs. un clic humano), no qué código se ejecuta después.
