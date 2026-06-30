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

### ¿Por qué los scripts van al final del `<body>`?

Porque los scripts necesitan que el DOM exista para manipularlo. Si estuvieran en el `<head>`, al ejecutarse no encontrarían los elementos. El orden también importa: `auth.js` va antes que `main.js` porque `main.js` llama a `login()` e `isAuthenticated()` definidas en `auth.js`.

---

## 2. Estilos (`css/styles.css`)

### ¿Qué son las variables CSS (`:root`)?

```css
:root {
  --bg-primary:    #141414;
  --bg-secondary:  #222222;
  --bg-card:       #2A2A2A;
  --color-primary: #0078FF;
  --color-accent:  #E53935;
  --color-success: #00B86B;
  --color-error:   #E53935;
  --color-seed:    #C026D3;
  --text-primary:  #FFFFFF;
  --text-secondary:#D6D6D6;
  --border-color:  #3A3A3A;
}
```

Las variables CSS (custom properties) permiten definir valores una sola vez y reutilizarlos en todo el archivo con `var(--nombre)`. Son nativas del navegador, no requieren preprocesadores como Sass.

### ¿Por qué el panel derecho del login tiene colores distintos al resto de la app?

El resto de la app usa el tema oscuro (variables `--bg-*`). El panel derecho del login usa un fondo claro (`#F3F4F6`) para crear contraste visual con el panel izquierdo oscuro — es un patrón común en apps premium (ej. Notion, Linear). Las variables de color del sistema no aplican directamente aquí; los campos del formulario se sobreescriben con selectores específicos como `.login-panel-right .form-group input`.

### ¿Qué hace `.hidden { display: none !important; }`?

La clase `.hidden` es la única forma en que la aplicación muestra y oculta elementos. El `!important` garantiza que no sea sobrescrita accidentalmente por otras reglas CSS. En JavaScript se usa `classList.add('hidden')` y `classList.remove('hidden')`.

### ¿Cuáles son las clases de estado y para qué sirven?

| Clase | Cuándo se usa |
|---|---|
| `.loading` | Mientras se espera respuesta de la API |
| `.error` | Cuando una petición falla y no hay datos de respaldo |
| `.offline` | Cuando se muestran datos de `localStorage` |
| `.countdown` | Durante el backoff de un error 429 (muestra segundos restantes) |

Estas clases se agregan/quitan dinámicamente con JavaScript. Nunca se usa `alert()` para comunicar estos estados.

### ¿Qué hace `animation: fadeIn` en `.section`?

Cada vez que una sección se vuelve visible, aparece con una animación sutil de 200ms. Esto da feedback visual al usuario de que cambió de sección sin ser intrusivo. La animación se dispara automáticamente cuando el elemento pasa de `display: none` a visible.

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

`POST https://worldcup26.ir/auth/authenticate` con cuerpo `{ email, password }`.

> **Nota importante:** el endpoint es `/auth/authenticate`, no `/auth/login`. El campo es `email`, no `username`. El error más común al integrar esta API es usar el endpoint o el campo incorrecto — ambos causan un 404 o 401 que parece un error de credenciales.

### ¿Cómo se registra un usuario nuevo?

`POST https://worldcup26.ir/auth/register` con cuerpo `{ name, email, password }`. El registro es un paso previo al primer login. El token devuelto por el registro también es válido (84 días).

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
});
```

`DOMContentLoaded` se dispara cuando el HTML terminó de parsearse. Se revisa si ya hay un token en `localStorage`: si existe, se muestra la app directamente; si no, se muestra el login. Los cuatro `setup*` registran los event listeners.

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

## 6. Nota de desarrollo local — CORS

La API de `worldcup26.ir` no incluye el header `Access-Control-Allow-Origin` para orígenes `localhost`. Esto no afecta la entrega ni la defensa (el profesor usa un entorno con la API accessible), pero sí bloquea los fetch del navegador en desarrollo local.

**Solución para trabajar localmente:** abrir Chrome con CORS deshabilitado:

```
chrome --disable-web-security --user-data-dir="C:\Temp\dev-profile" http://localhost:8080
```

O usar una extensión como "Allow CORS" activada solo mientras se desarrolla.

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
