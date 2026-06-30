**Universidad Técnica Nacional**

**Carrera de Ingeniería del Software**

**ISW-521: Programación en Ambiente Web I**

**Profesor:** Lic. Bryan Miguel Chaves Salas

**Modalidad:** Individual

**Valor:** 100 puntos

**Porcentaje: 15%**

**Catálogo de Proyectos - Categoría A: Cruce de Datos y Analítica (todos obligatorios)**

# 1. Introducción y Reglas del Proyecto

## 1.1 Tecnologías Obligatorias

Este laboratorio exige construir una aplicación JavaScript interactiva.
No es un ejercicio de maquetado: requiere manipulación avanzada del DOM,
manejo de eventos, consumo de la API REST pública del Mundial 2026
(https://worldcup26.ir) mediante Fetch, uso exclusivo de async/await en
cada llamada asíncrona, y manejo explícito de errores HTTP. Una
aplicación que solo muestra datos cuando todo funciona correctamente no
cumple el alcance del laboratorio.

## 1.2 El Mito del \"Happy Path\"

Un laboratorio que solo funciona en el \"camino feliz\", es decir,
cuando la API responde sin errores y la red nunca falla, obtiene una
nota drásticamente reducida, sin importar qué tan completa o vistosa sea
la funcionalidad visible. El manejo de errores no es un detalle
adicional: es el núcleo de la evaluación de este proyecto. Una interfaz
perfecta que se rompe ante un error 401, 429 o 500 no demuestra dominio
del curso.

## 1.3 Uso de Inteligencia Artificial

El uso de herramientas de inteligencia artificial está permitido como
apoyo durante el desarrollo. Sin embargo, la defensa técnica evalúa la
comprensión genuina del código entregado, sin distinción de su origen.
Un código generado por IA que el estudiante no pueda explicar ni
defender con criterio propio no sobrevive la defensa, sin importar si la
aplicación funciona correctamente.

## 1.4 Política de Calificación

**Regla estricta:** si el estudiante no supera la defensa oral y
técnica, la nota máxima del laboratorio se reduce automáticamente al
50%, independientemente de si la interfaz es perfecta o si la calidad
del código entregado es excelente. La defensa no es un trámite posterior
a la entrega: es parte integral de la calificación.

## 1.5 Arquitectura Base de Resiliencia (obligatoria)

Todo proyecto de este catálogo debe implementar, sin excepción, los
siguientes cinco puntos:

1.  **Autenticación JWT.** El token se obtiene autenticándose contra la
    API y se envía en cada petición como Authorization: Bearer
    \<token\>. Ninguna llamada a un endpoint de datos puede omitir este
    encabezado.

2.  **\`async/await\` exclusivo.** Toda llamada a fetch se resuelve con
    async/await. No se acepta .then() ni .catch() en ninguna parte del
    código entregado.

3.  **Manejo del error 401 sin recargar la página.** Si la API responde
    401, la interfaz debe limpiar el token guardado y mostrar una
    pantalla o modal de \"sesión expirada\" con opción de
    reautenticarse, sin invocar window.location.reload() ni
    equivalentes.

4.  **Backoff exponencial para errores 500 y 429.** Ante un error de
    servidor (500) o de límite de tasa (429), el cliente reintenta
    automáticamente con espera creciente (por ejemplo 1s, 2s, 4s, 8s).
    En el caso específico del 429, la interfaz debe mostrar un
    **countdown visible** (cuenta atrás en segundos) que indique cuándo
    ocurrirá el siguiente reintento automático.

5.  **Modo offline con \`localStorage\`.** La última respuesta exitosa
    de cada endpoint se guarda en localStorage. Si una petición nueva
    falla y existe una copia cacheada, la interfaz debe mostrar esos
    datos junto con un indicador visible de que son datos no
    actualizados.

## 1.6 Prohibiciones Absolutas

Ningún proyecto se aprueba si el código entregado contiene:

- alert(), en cualquier punto del flujo, incluyendo el manejo de
  errores.

- .then() o .catch(), incluso si conviven con async/await en otra parte
  del archivo.

- window.location.reload() (o equivalente) como mecanismo para resolver
  un error de sesión o de red.

# 2. Proyectos de la Categoría A: Cruce de Datos y Analítica

Esta categoría agrupa proyectos centrados en cruzar múltiples
colecciones de la API (equipos, partidos, grupos y estadios) para
construir vistas derivadas que no existen como tales en ningún endpoint
individual. La dificultad principal no está en el DOM, sino en la lógica
de cálculo y cruce de datos.

**IMPORTANTE (aclaración del profesor):** los cinco subproyectos (2.1
a 2.5) son obligatorios. El laboratorio no consiste en elegir uno del
catálogo, sino en implementar la totalidad de ellos como secciones
independientes de una misma aplicación.

### 2.1. La Ruta del Campeón

**Objetivo Técnico:** practicar el cruce de tres colecciones distintas
(equipos, partidos y estadios) para construir una vista derivada que no
existe como tal en la API.

**Endpoints a Consumir:** GET /get/teams, GET /get/games, GET
/get/stadiums.

**Funcionalidades Exigidas:**

- Un selector poblado con los 48 equipos obtenidos de /get/teams.

- Al elegir un equipo, filtrar en /get/games todos los partidos donde su
  id coincida con home_team_id o away_team_id, ordenados por local_date.

- Por cada partido filtrado, cruzar el campo stadium_id contra
  /get/stadiums para mostrar ciudad, país y aforo del recinto.

- Renderizar el resultado como un itinerario de tarjetas (una por
  partido), no como una tabla plana.

- Calcular y mostrar el número de ciudades distintas (city_en) que ese
  equipo visitaría según los partidos encontrados.

**El Reto de Resiliencia:** si la petición a /get/stadiums falla después
de que el itinerario ya se renderizó con los partidos, las tarjetas
existentes no deben desaparecer. El campo de estadio en cada tarjeta
afectada debe mostrar \"Estadio no disponible\" y solo esa petición
entra en backoff exponencial; los partidos ya obtenidos no se vuelven a
pedir.

### 2.2. Rastreador de Goleadas

**Objetivo Técnico:** practicar filtrado y ordenamiento sobre un
conjunto de datos numérico, separando la lógica de cálculo de la lógica
de presentación.

**Endpoints a Consumir:** GET /get/games, GET /get/teams.

**Funcionalidades Exigidas:**

- Tomar únicamente los partidos con finished: true.

- Calcular la diferencia absoluta entre home_score y away_score para
  cada uno.

- Filtrar los partidos con diferencia mayor o igual a 3 goles.

- Ordenar la lista de mayor a menor diferencia.

- Cruzar home_team_id y away_team_id contra /get/teams para mostrar
  nombre real y bandera, nunca el id crudo.

- Mostrar en la cabecera el total de goleadas encontradas.

**El Reto de Resiliencia:** si /get/teams falla pero /get/games
respondió correctamente, la lista de goleadas debe renderizarse igual,
mostrando los ids de los equipos como respaldo temporal en lugar de
bloquear toda la vista. La petición de equipos se reintenta en segundo
plano con backoff, sin que el usuario tenga que recargar la página para
ver los nombres reales una vez se recupere.

### 2.3. El Muro

**Objetivo Técnico:** practicar la combinación de datos agregados
(/get/groups) con datos de detalle (/get/games) para construir un
ranking compuesto.

**Endpoints a Consumir:** GET /get/groups, GET /get/teams, GET
/get/games.

**Funcionalidades Exigidas:**

- Recorrer los 12 grupos de /get/groups y extraer, de cada equipo dentro
  de teams, el team_id y su valor ga (goles en contra).

- Unificar esos 48 registros en un solo arreglo y ordenarlo de forma
  ascendente por ga.

- Tomar los 5 primeros y cruzarlos contra /get/teams para mostrar nombre
  y bandera.

- Para cada uno de esos 5 equipos, buscar en /get/games su próximo
  partido con finished: false, ordenado por local_date, y mostrar contra
  qué equipo juega.

**El Reto de Resiliencia:** la búsqueda del próximo rival se evalúa
equipo por equipo. Si esa búsqueda falla para uno solo de los 5 equipos
del ranking, ese registro muestra \"Próximo rival no disponible\"
mientras los otros 4 siguen mostrando su dato completo con normalidad.

### 2.4. Analítica de Estadios

**Objetivo Técnico:** practicar agregación de datos (conteos y sumas)
cruzando un catálogo fijo de recintos contra un catálogo dinámico de
partidos.

**Endpoints a Consumir:** GET /get/stadiums, GET /get/games.

**Funcionalidades Exigidas:**

- Por cada uno de los 16 estadios, contar cuántos registros de
  /get/games tienen ese stadium_id.

- Calcular una \"asistencia potencial total\" multiplicando capacity por
  el número de partidos albergados ahí.

- Ordenar los estadios de mayor a menor asistencia potencial.

- Renderizar una gráfica de barras comparando capacidad contra partidos
  albergados por estadio.

**El Reto de Resiliencia:** si los estadios se cargaron primero y la
petición de partidos falla después, la gráfica debe entrar en un estado
de \"esperando datos de partidos\" sin destruir las barras de estadios
ya dibujadas. Solo la petición de partidos entra en backoff exponencial.

### 2.5. Radar de Empates

**Objetivo Técnico:** practicar filtrado condicional combinado con
agrupación visual de resultados.

**Endpoints a Consumir:** GET /get/games, GET /get/teams.

**Funcionalidades Exigidas:**

- Filtrar partidos donde home_score === away_score y finished === true.

- Agrupar el resultado por group (A a L).

- Renderizar una matriz visual donde cada celda representa un empate,
  mostrando los dos equipos cruzados contra /get/teams.

- Mostrar un contador de empates por grupo.

**El Reto de Resiliencia:** si llega un 429 mientras se está
construyendo la matriz grupo por grupo, el backoff exponencial se activa
solo para la petición pendiente, mostrando el countdown correspondiente,
mientras los grupos ya dibujados permanecen visibles. La interfaz debe
informar visualmente (sin alert()) que está reintentando.

# 3. Guía de Defensa Técnica

Antes de calificar el laboratorio, el profesor realiza una defensa oral
y técnica en vivo, individual, frente al computador del estudiante. La
defensa se compone de dos partes y se aplica sobre el proyecto entregado
de esta categoría.

## 3.1 Preguntas Teóricas

El profesor puede preguntar, entre otras:

- ¿Qué pasa exactamente si la API devuelve un error 500 al pedir
  /get/games en este proyecto?

- ¿Por qué se usó async/await y no .then/.catch en la función que cruza
  los datos?

- ¿Qué ocurre en la interfaz si el token JWT expira mientras se está
  consultando un cruce de datos?

- ¿Por qué no se usa window.location.reload() para resolver un error de
  sesión?

- ¿Qué pasaría si dos peticiones del cruce de datos llegan en un orden
  distinto al esperado?

## 3.2 Pruebas Prácticas en DevTools

El profesor exige que el estudiante demuestre en vivo, usando las
herramientas de desarrollador del navegador:

- **Pestaña Console:** la captura del error correspondiente (401, 429
  o 500) sin que la aplicación se rompa visualmente ni quede en blanco.

- **Pestaña Network:** el estado de la petición fallida (código de
  estado, encabezados, cuerpo de la respuesta) y, si aplica, los
  reintentos generados por el backoff exponencial, incluyendo los
  tiempos de espera entre cada uno.

El estudiante que no pueda reproducir estas pruebas en vivo, o que no
pueda explicar por qué su código responde de esa manera, no aprueba la
defensa, independientemente de la calidad visual del proyecto entregado.

# 4. Rúbrica de Evaluación de Cumplimiento del Proyecto (50 puntos)

  -------------------------------------------------------------------------------------
  **Rubro**         **Excelente (10 pts)**      **Regular (5 pts)** **Insuficiente (0
                                                                    pts)**
  ----------------- --------------------------- ------------------- -------------------
  **1.              Implementa de manera        Implementa la       Faltan
  Funcionalidades   completa y correcta todas   mayoría de las      funcionalidades
  Exigidas del      las funcionalidades         funcionalidades     centrales en uno
  Proyecto          exigidas para los cinco     exigidas, pero con  o más de los cinco
  (cruce de datos y subproyectos del catálogo   omisiones puntuales subproyectos, los
  analítica)**      (La Ruta del Campeón,       (un cálculo         endpoints exigidos
                    Rastreador de Goleadas, El  incompleto, un      no se consumen
                    Muro, Analítica de          cruce de datos que  correctamente, o la
                    Estadios y Radar de         muestra ids en      lógica de cruce de
                    Empates), incluyendo el     lugar de nombres, o datos es incorrecta
                    consumo correcto de los     un ordenamiento     de forma evidente.
                    endpoints indicados y el    incorrecto) que no  
                    cruce de datos entre las    impiden usar la     
                    colecciones                 aplicación.         
                    correspondientes (equipos,                      
                    partidos, grupos o                              
                    estadios) según lo descrito                     
                    en cada Objetivo Técnico.                         

  **2.              Todas las llamadas a la API Existe uso de       El código usa
  Implementación    usan async/await sin ningún async/await pero    predominantemente
  Asíncrona         rastro de .then/.catch; las mezclado con        .then/.catch, o las
  Estricta          funciones de fetch están    .then/.catch en     llamadas a la API
  (async/await) y   separadas de la lógica de   alguna parte del    no incluyen el
  estructura del    presentación, y cada        código, o falta el  token JWT.
  Fetch**           llamada incluye el          encabezado JWT en   
                    encabezado Authorization    alguna llamada.     
                    con el token JWT.                               

  **3. Manejo de    Ante un 401, la aplicación  El 401 se maneja de El 401 se resuelve
  Sesión (401) y    limpia el token, muestra    forma incompleta    recargando la
  Límite de Tasa    una pantalla o modal de     (sin opción clara   página, o el 429 no
  (429)**           sesión expirada y permite   de                  se maneja de
                    reautenticarse, sin usar    reautenticación), o ninguna forma
                    window.location.reload().   el 429 se maneja    visible.
                    Ante un 429, se muestra un  sin countdown       
                    countdown visible con el    visible para el     
                    tiempo restante antes del   usuario.            
                    siguiente reintento                             
                    automático.                                     

  **4. Resiliencia  Ante un error 500, la       Implementa el       Un error 500 deja
  General (500,     aplicación reintenta        backoff exponencial la interfaz en
  Offline, Backoff) automáticamente con backoff o el modo offline,  blanco sin
  y Reto de         exponencial y, si existe    pero no ambos, o    reintentos ni datos
  Resiliencia del   copia cacheada en           resuelve el Reto de de respaldo, y el
  Proyecto          localStorage, la muestra    Resiliencia del     Reto de Resiliencia
  Elegido**         con un indicador de datos   subproyecto elegido del subproyecto
                    no actualizados; además     solo de forma       elegido no se
                    resuelve correctamente el   parcial.            atiende.
                    Reto de Resiliencia                             
                    descrito en la sección 2                        
                    para el subproyecto elegido                     
                    (por ejemplo, conservar el                      
                    itinerario o el ranking ya                      
                    construido cuando solo uno                      
                    de los recursos cruzados                        
                    falla).                                         

  **5.              El código entregado no      Cumple la mayoría   El código incurre
  Prohibiciones     contiene alert() en ningún  de las              de forma evidente
  Absolutas y       punto del flujo, no mezcla  prohibiciones, pero en una o más
  Organización del  .then()/.catch() con        presenta una        prohibiciones
  Código**          async/await en ninguna      infracción aislada  absolutas: alert()
                    parte, y no recurre a       (por ejemplo, un    en el flujo,
                    window.location.reload()    alert() de          .then()/.catch()
                    (ni equivalente) para       depuración olvidado presente, o
                    resolver un error de sesión o una mezcla        reload() usado como
                    o de red; la lógica de      puntual de .then()  solución de un
                    fetch se mantiene separada  en un archivo       error de sesión o
                    con claridad de la lógica   secundario), o la   de red.
                    de presentación.            separación entre    
                                                fetch y             
                                                presentación es     
                                                poco clara en       
                                                alguna vista.       
  -------------------------------------------------------------------------------------

**Total Rúbrica de Cumplimiento del Proyecto: 50 puntos.**

# 5. Rúbrica de Evaluación de Defensa Técnica (50 puntos)

  -----------------------------------------------------------------------------------
  **Rubro**        **Excelente (10 pts)**     **Regular (5 pts)** **Insuficiente (0
                                                                  pts)**
  ---------------- -------------------------- ------------------- -------------------
  **1. Comprensión Responde con precisión y   Responde            Confunde conceptos
  General del      sin vacilación a las       correctamente la    básicos del manejo
  Manejo de        preguntas teóricas         mayoría de estas    de errores (por
  Errores**        generales sobre el manejo  preguntas           ejemplo, no
                   de errores 401, 429 y 500, generales, pero con distingue un 401 de
                   y explica por qué el       imprecisiones o     un 429), o responde
                   laboratorio exige          vacilaciones que el con conjeturas sin
                   async/await en lugar de    profesor debe       fundamento técnico.
                   .then/.catch y por qué no  corregir o aclarar. 
                   se permite                                     
                   window.location.reload()                       
                   para resolver un error de                      
                   sesión.                                        

  **2. Dominio     Explica con precisión qué  Explica el          No logra explicar
  Técnico del      ocurre si el token JWT     comportamiento      cómo su aplicación
  Cruce de Datos y expira mientras se está    general del cruce   cruza los datos
  Manejo de        ejecutando un cruce de     de datos            entre colecciones,
  Concurrencia**   datos entre colecciones, y implementado, pero  ni el efecto de un
                   cómo su código garantiza   con dudas sobre el  token expirado o de
                   un resultado correcto sin  efecto de un token  un orden de llegada
                   importar el orden en que   expirado a mitad    distinto de las
                   llegan las peticiones      del cruce o sobre   peticiones.
                   cruzadas (condiciones de   qué pasa si las     
                   carrera).                  peticiones llegan   
                                              en un orden         
                                              distinto al         
                                              esperado.           

  **3. Prueba      Reproduce en vivo, sin     Reproduce el error  No logra reproducir
  Práctica en      ayuda, el error solicitado después de varios   el error en la
  DevTools:        por el profesor (401, 429  intentos o con      pestaña Console, o
  Pestaña          o 500) en la pestaña       ayuda del profesor, la aplicación se
  Console**        Console, mostrando que la  o la captura en     rompe visualmente
                   aplicación captura el      Console es parcial  al hacerlo.
                   error sin romperse         o incompleta.       
                   visualmente ni quedar en                       
                   blanco.                                        

  **4. Prueba      Identifica y explica con   Identifica el       No logra ubicar ni
  Práctica en      precisión el estado de la  estado de la        explicar la
  DevTools:        petición fallida en        petición fallida,   petición fallida en
  Pestaña          Network (código de estado, pero no logra       la pestaña Network.
  Network**        encabezados, cuerpo de la  mostrar o explicar  
                   respuesta) y muestra en    con claridad los    
                   vivo los reintentos        reintentos del      
                   generados por el backoff   backoff             
                   exponencial, incluyendo    exponencial.        
                   los tiempos de espera                          
                   entre cada uno.                                

  **5. Defensa con Explica con criterio       Explica el código   No puede explicar
  Criterio Propio  propio cualquier parte del con dudas           ni defender con
  del Código       código entregado,          relevantes en       criterio propio el
  (propio o        incluidas las secciones    partes puntuales,   código entregado,
  generado con     generadas con apoyo de IA, en especial en      sin importar si fue
  apoyo de IA)**   justificando las           secciones generadas escrito por el
                   decisiones de diseño y     con apoyo de IA,    estudiante o
                   respondiendo con seguridad que el profesor     generado con IA.
                   a las preguntas de         debe aclarar.       
                   seguimiento del profesor.                      
  -----------------------------------------------------------------------------------

**Total Rúbrica de Defensa Técnica: 50 puntos.**

**Nota sobre la calificación total:** el laboratorio tiene un valor
total de 100 puntos, compuestos por 50 puntos de la Rúbrica de
Cumplimiento del Proyecto y 50 puntos de la Rúbrica de Defensa Técnica.
Si el estudiante no supera la defensa oral y técnica, es decir, si
obtiene menos de 25 de los 50 puntos de la Rúbrica de Defensa Técnica,
la nota máxima total del laboratorio se reduce automáticamente al 50%
(50 de 100 puntos), independientemente del puntaje obtenido en la
Rúbrica de Cumplimiento del Proyecto.
