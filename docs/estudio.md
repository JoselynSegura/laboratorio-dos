# Estudio Técnico — Fase 1: Infraestructura Base

---

## ¿Qué se construyó en esta fase?

La capa de infraestructura que todas las secciones de la aplicación van a usar: la pantalla de login, la navegación entre las 5 secciones, el módulo de autenticación JWT y el modal de sesión expirada.

---

## 1. Estructura HTML (`index.html`)

### ¿Cómo está organizado el HTML?

El archivo tiene tres bloques principales:

```
#login-screen   → pantalla inicial de autenticación
#session-modal  → modal que aparece cuando el token expira durante el uso
#app-screen     → shell de la aplicación (navegación + 5 secciones)
```

### ¿Por qué tres bloques separados y no páginas distintas?

Porque la aplicación es un **SPA (Single Page Application)**: no recarga la página al cambiar de sección. Cambiar de pantalla significa mostrar/ocultar divs con JavaScript, no navegar entre archivos HTML distintos. Esto es clave para cumplir la prohibición de `window.location.reload()`.

### ¿Cómo funciona el atributo `data-section`?

```html
<button class="nav-btn" data-section="ruta-campeon">La Ruta del Campeón</button>
```

`data-section` es un atributo de datos personalizado de HTML5. En JavaScript se accede con `btn.dataset.section` y devuelve el string `"ruta-campeon"`. Esto conecta el botón de navegación con el `id` de la sección correspondiente, sin hardcodear la lógica en el JS.

### ¿Por qué los scripts van al final del `<body>`?

Porque los scripts necesitan que el DOM exista para manipularlo. Si estuvieran en el `<head>`, al ejecutarse no encontrarían los elementos (el `<body>` todavía no se habría parseado). El orden de los `<script>` también importa: `auth.js` va antes que `main.js` porque `main.js` llama a `login()` y `isAuthenticated()` que están definidas en `auth.js`.

---

## 2. Estilos (`css/styles.css`)

### ¿Qué son las variables CSS (`:root`)?

```css
:root {
  --color-primary: #58a6ff;
  --spacing-md: 16px;
}
```

Las variables CSS (custom properties) permiten definir valores una sola vez y reutilizarlos en todo el archivo con `var(--nombre)`. Si se necesita cambiar el color primario, se cambia en un solo lugar. Son nativas del navegador, no requieren preprocesadores como Sass.

### ¿Qué hace `.hidden { display: none !important; }`?

La clase `.hidden` es la única forma en que la aplicación muestra y oculta elementos. El `!important` garantiza que no sea sobrescrita accidentalmente por otras reglas de CSS. En JavaScript se usa `classList.add('hidden')` y `classList.remove('hidden')`.

### ¿Cuáles son las clases de estado y para qué sirven?

| Clase | Cuándo se usa |
|---|---|
| `.loading` | Mientras se espera respuesta de la API |
| `.error` | Cuando una petición falla y no hay datos de respaldo |
| `.offline` | Cuando se muestran datos de `localStorage` |
| `.countdown` | Durante el backoff de un error 429 (muestra segundos restantes) |

Estas clases se agregan/quitan dinámicamente con JavaScript según el estado de cada petición. Nunca se usa `alert()` para comunicar estos estados.

### ¿Qué hace `animation: fadeIn` en `.section`?

Cada vez que una sección se vuelve visible, aparece con una animación sutil de 200ms. Esto le da feedback visual al usuario de que cambió de sección sin ser intrusivo. La animación se dispara automáticamente cuando el elemento pasa de `display: none` a visible.

---

## 3. Autenticación (`js/api/auth.js`)

### ¿Qué hace cada función?

```javascript
login(username, password)  // POST /auth/login → guarda token en localStorage
getToken()                 // lee el token de localStorage
clearToken()               // elimina el token de localStorage (se llama en 401)
isAuthenticated()          // retorna true si existe un token guardado
```

### ¿Por qué se guarda el token en `localStorage` y no en una variable?

Una variable JavaScript vive en la pestaña del navegador. Si el usuario cierra y vuelve a abrir la app, la variable desaparece y tendría que hacer login de nuevo. `localStorage` persiste entre sesiones. La clave `'wc26_token'` es una constante para evitar errores de escritura al leerla/escribirla desde distintas partes del código.

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

`response.ok` es `true` solo para status 200–299. Si el servidor devuelve 401 (credenciales incorrectas) o 400, `response.ok` es `false`. Se intenta leer el mensaje del cuerpo de la respuesta; si el cuerpo no es JSON válido, el `try/catch` lo ignora y se usa un mensaje genérico. El error se lanza (`throw`) para que quien llamó a `login()` lo capture en su propio `try/catch`.

### ¿Por qué `isAuthenticated()` usa `Boolean(getToken())` y no `getToken() !== null`?

`localStorage.getItem()` retorna `null` si la clave no existe, pero también podría retornar una cadena vacía `""` si alguien guardó un valor vacío. `Boolean(null)` y `Boolean("")` ambos son `false`, mientras que `Boolean("algún-token")` es `true`. Es más robusto que comparar solo contra `null`.

### ¿Por qué `login()` usa `async/await` y no `.then()`?

El laboratorio prohíbe `.then()` y `.catch()` en todo el código. Además, `async/await` es más legible: el código se lee de forma secuencial aunque sea asíncrono. El manejo de errores con `try/catch` es equivalente al `.catch()` pero en la sintaxis moderna.

---

## 4. Modal de sesión expirada (`js/ui/modal.js`)

### ¿Cuándo se muestra este modal?

NO al cargar la app (para eso está `#login-screen`). Se muestra **durante el uso de la app**, cuando una petición a la API devuelve un error 401. Esto significa que el token venció mientras el usuario estaba usando la aplicación.

### ¿Por qué es un modal y no una redirección?

Porque `window.location.reload()` (prohibido) destruye todo el estado de la app: los datos ya cargados en pantalla desaparecen. Con el modal, el usuario puede reautenticarse y continuar usando la app sin perder los datos que ya estaban visibles. La interfaz sobrevive a la expiración del token.

### ¿Qué hace `hideExpiredSessionModal()`?

```javascript
function hideExpiredSessionModal() {
  document.getElementById('session-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('reauth-error').textContent = '';
  document.getElementById('reauth-error').classList.add('hidden');
  document.getElementById('reauth-username').value = '';
  document.getElementById('reauth-password').value = '';
}
```

Además de ocultar el modal, limpia los campos del formulario y borra mensajes de error anteriores. Esto es importante para la UX: si el usuario falla la reauth y luego la renueva, no debería ver el error anterior.

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
});
```

`DOMContentLoaded` se dispara cuando el HTML terminó de parsearse (antes de que carguen imágenes u otros recursos). Se revisa si ya hay un token en `localStorage`: si existe, se muestra la app directamente; si no, se muestra el login. Los tres `setup*` registran los event listeners.

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
2. Quita la clase `active` de TODOS los botones
3. Muestra solo la sección pedida
4. Marca como `active` solo su botón
5. Llama a `initSection()` para inicializar el contenido (Fases 3–7)

Este patrón garantiza que solo una sección esté visible a la vez, sin importar desde dónde se llame.

### ¿Por qué `initSection()` usa `typeof ... !== 'undefined'`?

```javascript
'ruta-campeon': typeof initRutaCampeon !== 'undefined' ? initRutaCampeon : null,
```

En Phase 1, `initRutaCampeon` existe como función vacía en el archivo stub. En fases futuras podría no estar definida si hay un error de carga. El `typeof` es una guardia defensiva: si la función no existe en el scope global, no lanza un `ReferenceError`, simplemente asigna `null` y no la llama.

### ¿Cómo maneja el formulario de login los errores sin `alert()`?

```javascript
try {
  await login(username, password);
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
- El bloque `finally` siempre se ejecuta (sea éxito o error) y restaura el botón
- Si `login()` lanza, el `catch` lo captura; si tiene éxito, `showApp()` transiciona la UI

---

## 6. Preguntas de defensa relacionadas con Fase 1

**¿Por qué no se usa `window.location.reload()` para resolver un error 401?**
> Porque `reload()` destruye el estado de la aplicación: borra datos ya cargados en memoria y obliga al usuario a empezar de cero. El modal de sesión expirada mantiene la UI intacta y permite reautenticarse sin perder el contexto.

**¿Qué pasa si el usuario cierra la pestaña con sesión activa y la vuelve a abrir?**
> `isAuthenticated()` lee el token de `localStorage`, que persiste entre sesiones. La app lo detecta en `DOMContentLoaded` y muestra directamente el `#app-screen` sin pedir login de nuevo. El token puede haber expirado en el servidor aunque esté en `localStorage` — eso se detecta en la primera petición cuando la API responde 401.

**¿Por qué los scripts están al final del `<body>` y no en el `<head>`?**
> Para garantizar que el DOM esté completamente construido antes de que el JS intente manipularlo. Aunque `DOMContentLoaded` también serviría como guardia, cargar scripts al final es la práctica estándar y evita bloquear el renderizado inicial del HTML.

**¿Qué es un SPA y por qué este proyecto lo es?**
> Single Page Application: una aplicación que carga una sola página HTML y cambia el contenido visible manipulando el DOM con JavaScript, sin recargar la página al navegar. Este proyecto lo implementa ocultando/mostrando secciones con `classList.add('hidden')` / `classList.remove('hidden')`.
