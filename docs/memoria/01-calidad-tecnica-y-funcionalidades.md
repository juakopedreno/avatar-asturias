# Memoria Tecnica

## 1. Calidad tecnica y funcionalidades

### 1.1. Descripcion general de la solucion propuesta

La solucion propuesta consiste en una plataforma integral para el diseno, creacion, personalizacion, puesta en marcha y explotacion de un avatar hiperrealista con inteligencia artificial orientado a la atencion turistica y ciudadana del Ayuntamiento de Torremolinos, en modalidad Software as a Service (SaaS). La propuesta se ha concebido como una solucion unificada, interoperable, escalable y segura, alineada con los requisitos funcionales, tecnicos y de seguridad establecidos en el Pliego de Prescripciones Tecnicas.

El sistema se articula sobre una arquitectura modular compuesta por un canal ciudadano de interaccion, un motor conversacional basado en inteligencia artificial, un sistema de recuperacion aumentada mediante fuentes documentales y estructuradas (RAG), un portal de administracion y operacion, y un conjunto de servicios transversales de seguridad, auditoria, analitica, exportacion y gobierno del dato. Esta aproximacion permite ofrecer una experiencia de uso natural, multilenguaje, trazable y mantenible, evitando dependencias rigidas con un unico proveedor y favoreciendo la evolucion futura del servicio.

La propuesta contempla expresamente el uso del avatar como asistente virtual institucional, identificandose siempre como sistema automatizado del Ayuntamiento y evitando cualquier atribucion de condicion humana o funcionarial. Asimismo, la solucion ha sido disenada para operar sobre infraestructura cloud de hiperescalares, con capacidad de adaptacion multicloud y con una estrategia de desacoplamiento entre interfaz publica, logica de negocio, proveedor de avatar, proveedor LLM y capa documental.

La plataforma propuesta cubre el ciclo completo de prestacion del servicio: configuracion inicial, entrenamiento basado en fuentes autorizadas, operacion diaria, mantenimiento de contenidos, trazabilidad de respuestas, control de accesos, monitorizacion, gestion de incidencias, exportacion de datos y evolucion funcional.

**Anadir captura de:** vista general del canal ciudadano con avatar hiperrealista en funcionamiento.  
**Descripcion de la captura:** interfaz publica del asistente virtual mostrando el avatar hiperrealista, area conversacional, selector de idioma, interaccion por texto y voz, y elementos de acceso a la informacion.

**Anadir captura de:** vista general del portal de administracion.  
**Descripcion de la captura:** panel de administracion con acceso a contenidos, fuentes, entrenamiento, auditoria, analitica y configuracion general de la solucion.

---

### 1.2. Avatar hiperrealista y experiencia conversacional

La solucion incorpora un avatar digital hiperrealista concebido para ofrecer una experiencia de comunicacion natural, expresiva y coherente con el contexto de uso. En el canal web, el avatar se presenta en formato visual de alta calidad, con reproduccion en tiempo real, sincronizacion con las respuestas generadas por el sistema y soporte de salida de audio. La arquitectura funcional deja preparada la extension a otros canales de despliegue, incluyendo kiosco interactivo y entornos inmersivos o dispositivos especializados, manteniendo el mismo nucleo conversacional y de gobierno.

La propuesta contempla la posibilidad de personalizacion del avatar conforme a la identidad institucional y a los criterios de diseno aprobados por el Ayuntamiento. Dicha personalizacion incluye apariencia, voz, comportamiento, tono comunicativo y configuracion funcional. Se preve ademas la presentacion de opciones de avatar ajustadas a la linea visual y de servicio requerida, con objeto de seleccionar la alternativa que mejor encaje con la imagen del municipio y con los objetivos del proyecto.

El sistema proporciona una experiencia conversacional natural tanto por texto como por voz. La respuesta del asistente se genera teniendo en cuenta el idioma de interaccion, el contexto de la consulta y las fuentes disponibles en el repositorio autorizado. Cuando la informacion disponible no alcanza un nivel adecuado de fiabilidad, el sistema declara expresamente la incertidumbre y deriva a canales oficiales, evitando la invencion de datos y reforzando la confianza del usuario final.

La solucion favorece una interaccion clara, amable y util para visitantes y residentes, y ha sido concebida para responder con especial calidad a consultas sobre playas, movilidad, eventos, cultura, gastronomia, alojamiento, servicios municipales, oficinas de turismo, puntos de interes y otra informacion definida en el pliego.

**Anadir captura de:** avatar respondiendo a una consulta turistica real.  
**Descripcion de la captura:** conversacion con una pregunta real sobre Torremolinos y respuesta generada por el asistente con comportamiento natural del avatar y cita de fuentes.

**Anadir captura de:** configuracion del proveedor avatar activo o parametros del avatar.  
**Descripcion de la captura:** pantalla o bloque de configuracion donde se visualiza el proveedor activo, parametros del avatar y opciones de voz/canal.

---

### 1.3. Inteligencia artificial, modelo conversacional y entrenamiento

La inteligencia artificial de la solucion se apoya en una arquitectura moderna de orquestacion entre modelo conversacional y recuperacion contextual de informacion mediante RAG, priorizando el uso de fuentes aprobadas por el Ayuntamiento. Esta decision permite reducir al minimo las respuestas genericas no fundamentadas y garantiza que la informacion ofrecida al usuario este vinculada a contenidos controlados, trazables y actualizables.

La solucion propuesta evita el reentrenamiento indiscriminado del modelo con datos municipales y basa su funcionamiento preferentemente en la recuperacion de informacion desde repositorios documentales y estructurados autorizados. De este modo, la actualizacion del conocimiento no depende de ciclos de entrenamiento complejos, sino de la incorporacion, revision y validacion de nuevas fuentes, lo que mejora la gobernanza del contenido y facilita la supervision municipal.

El sistema contempla el entrenamiento funcional en los ambitos tematicos exigidos en el pliego, entre ellos: municipio de Torremolinos, ubicacion, barrios y zonas, transporte, aparcamientos, clima, playas, servicios en playas, fiestas, eventos, rutas, actividades, gastronomia, restauracion, alojamiento, servicios medicos, bancos y cajeros, puntos de interes, webs y recursos, informacion municipal, dependencias, contactos, horarios y orientacion basica sobre tramites frecuentes.

Desde el punto de vista conversacional, la solucion incluye politicas de respuesta, control de ambito tematico, tratamiento educado de consultas improcedentes y mecanismos para limitar respuestas fuera de dominio. La personalizacion se realiza en tiempo real o por sesion, a partir de parametros de contexto como idioma, preferencias declaradas y criterios de busqueda, sin utilizar consultas de usuarios para entrenamiento de modelos.

Se contempla igualmente la evolucion futura del stack de inteligencia artificial, manteniendo una arquitectura desacoplada que permita sustituir el modelo LLM por otro equivalente sin impacto sobre la interfaz publica ni sobre la capa de administracion.

**Anadir captura de:** modulo de entrenamiento conversacional.  
**Descripcion de la captura:** pantalla de configuracion de tono, estilo, instrucciones del sistema, ambitos permitidos y ambitos bloqueados del asistente.

**Anadir captura de:** gestion de fuentes RAG.  
**Descripcion de la captura:** modulo de fuentes y trazabilidad con alta de fuentes, ingesta documental y control del conocimiento disponible para el asistente.

---

### 1.4. Transparencia, fuentes y trazabilidad de las respuestas

Uno de los ejes principales de la solucion es la trazabilidad de la informacion ofrecida al ciudadano. Cada respuesta del asistente se vincula, siempre que exista soporte documental fiable, a una o varias fuentes reconocidas del sistema. Esto permite aportar transparencia, verificabilidad y control institucional sobre el contenido facilitado.

La plataforma ha sido disenada para que la respuesta conversacional no sea un bloque opaco, sino una interaccion respaldada por fuentes identificables. A tal efecto, el sistema puede mostrar al usuario las referencias documentales o etiquetas de origen asociadas a la contestacion, y el portal de administracion permite supervisar las fuentes disponibles, su estado, fecha de sincronizacion y nivel de confianza.

En ausencia de fuente fiable, la solucion adopta una politica explicita de incertidumbre, comunicando que no dispone de suficiente respaldo documental en ese momento y proponiendo, cuando proceda, la derivacion a canales oficiales del Ayuntamiento u otras fuentes reconocidas. Este comportamiento es coherente con el pliego y con buenas practicas de IA responsable.

Adicionalmente, el sistema incorpora mecanismos de exportacion y auditoria de bloques de conocimiento, configuracion, metricas y logs en formatos estandar, lo que facilita la revision tecnica, la continuidad operativa y la trazabilidad ante procesos de supervision y control.

**Anadir captura de:** respuesta con fuentes visibles en el canal ciudadano.  
**Descripcion de la captura:** conversacion en la que la respuesta del asistente incluye indicacion de fuente o referencias documentales utilizadas.

**Anadir captura de:** panel de jobs de ingesta o panel de trazabilidad.  
**Descripcion de la captura:** vista administrativa donde se observan las ingestas realizadas, el numero de fragmentos generados y el estado de sincronizacion de las fuentes.

---

### 1.5. Interfaz de usuario y experiencia multicanal

La interfaz de usuario ha sido concebida con criterios de claridad, accesibilidad, adaptacion responsive y facilidad de uso. La propuesta contempla su utilizacion en escritorio, tableta, movil y canal tipo kiosco, con adaptacion visual al tamano y formato de pantalla, y con capacidad de configuracion especifica segun canal.

La interaccion se soporta por texto y por voz, en coherencia con lo previsto en el pliego. La solucion contempla entrada por texto, salida por voz del avatar y, en el canal ciudadano, captura de audio para transcripcion. Asimismo, se incorpora soporte multilenguaje en espanol, ingles, frances y aleman, incluyendo seleccion explicita de idioma y capacidades de autodeteccion en el flujo conversacional.

La interfaz administrativa se presenta en espanol y permite la gestion centralizada de contenidos, fuentes, entrenamiento, configuracion, usuarios, auditoria y analitica. Esta aproximacion facilita la autonomia progresiva del personal municipal y reduce la dependencia operativa del adjudicatario en tareas ordinarias de explotacion.

La solucion propuesta ha sido disenada para ofrecer una experiencia coherente entre canal ciudadano y backoffice, manteniendo identidad visual homogenea, navegacion clara y separacion entre experiencia publica y funciones de operacion interna.

**Anadir captura de:** selector de idioma e interaccion por voz.  
**Descripcion de la captura:** canal ciudadano mostrando el selector multilenguaje y el mecanismo de interaccion por audio.

**Anadir captura de:** vista responsive o adaptada a otro dispositivo.  
**Descripcion de la captura:** ejemplo de adaptacion de la interfaz a formato movil o a entorno tipo kiosco.

---

### 1.6. Arquitectura software, SaaS e interoperabilidad

La propuesta se presta en modalidad SaaS, incluyendo alojamiento, mantenimiento y operacion de la solucion durante la vigencia contractual. La arquitectura se ha disenado para ejecutarse sobre servicios cloud estandar, con separacion entre frontend, backend, almacenamiento estructurado, capa de conocimiento, proveedor de avatar y servicios auxiliares.

Desde el punto de vista tecnico, la solucion se basa en componentes de amplia presencia en el mercado, facilmente mantenibles y orientados a la interoperabilidad. La arquitectura favorece la sustitucion o evolucion de proveedores sin redisenar la solucion completa, reduciendo el riesgo de dependencia tecnologica y facilitando la continuidad del servicio.

La propuesta contempla capacidad de crecimiento vertical y horizontal, adaptacion a nuevos canales, soporte de dominios personalizados y posibilidad de integracion con infraestructuras cloud de Amazon, Google o Microsoft. Esta orientacion multicloud responde al requisito del pliego de mantener flexibilidad de despliegue y evolucion futura.

La plataforma tambien esta preparada para integrarse con repositorios documentales, fuentes web, APIs y otros sistemas que formen parte del ecosistema municipal o de terceros autorizados, manteniendo controles de seguridad, trazabilidad y gobierno del dato.

#### 1.6.1. Stack tecnologico y componentes tecnicos

Desde el punto de vista tecnico, la solucion se apoya sobre un stack moderno, ampliamente extendido en el mercado y orientado a la mantenibilidad, la escalabilidad y la interoperabilidad. La eleccion tecnologica responde a criterios de madurez, disponibilidad de profesionales especializados, compatibilidad con despliegues cloud y facilidad de evolucion a medio y largo plazo.

En la capa de interfaz de usuario, la propuesta se articula mediante una aplicacion web de arquitectura SPA basada en React, Vite y TypeScript, apoyada en Tailwind CSS y componentes reutilizables. Esta capa permite ofrecer una experiencia responsive, una navegacion fluida, una integracion eficiente con el canal conversacional y una presentacion visual flexible para el avatar hiperrealista, tanto en entorno ciudadano como en panel de administracion.

En la capa de servicios, la propuesta utiliza una arquitectura backend modular desarrollada sobre Node.js y NestJS, orientada a dominios de negocio y con separacion clara entre autenticacion, gestion de contenidos, fuentes, entrenamiento, analitica, auditoria, exportacion y orquestacion del avatar. Esta organizacion facilita la mantenibilidad del sistema, la trazabilidad funcional y la evolucion independiente de cada modulo.

La persistencia de datos se apoya en PostgreSQL como base de datos relacional, adecuada para garantizar consistencia, integridad y trazabilidad sobre usuarios, configuraciones, contenidos, fuentes, conversaciones, eventos de auditoria y metadatos operativos. Sobre esta base, se utiliza Prisma como capa ORM tipada y sistema de migraciones, lo que favorece el control de cambios, la evolucion segura del modelo de datos y la mantenibilidad del backend.

Para la capa de inteligencia artificial, la propuesta integra OpenAI como proveedor principal para capacidades de lenguaje y transcripcion, incluyendo generacion contextual de respuestas y STT multilenguaje mediante modelos tipo Whisper, asi como una arquitectura RAG basada en recuperacion de informacion desde fuentes aprobadas por el Ayuntamiento. Este planteamiento reduce al minimo el riesgo de respuestas alucinadas, mejora la trazabilidad y permite actualizar el conocimiento de forma mucho mas gobernable que un enfoque basado exclusivamente en reentrenamiento de modelos.

La solucion integra igualmente Anam como proveedor de avatar hiperrealista mediante una capa de adaptacion desacoplada, lo que permite evolucionar el servicio o sustituir proveedores equivalentes manteniendo estable la interfaz publica y la logica general de la plataforma. De forma complementaria, la propuesta contempla componentes auxiliares para STT multilenguaje, deteccion de idioma, salida de voz, analitica, auditoria y exportacion estructurada.

De manera resumida, el stack tecnologico propuesto se estructura en torno a los siguientes bloques:

- **Frontend ciudadano y backoffice**: aplicacion web basada en React, Vite y TypeScript, con componentes reutilizables y enfoque responsive.
- **Estilos y experiencia de usuario**: sistema de interfaz apoyado en Tailwind CSS y componentes UI orientados a rapidez de desarrollo, consistencia visual y mantenibilidad.
- **Backend y API**: servicios modulares desarrollados sobre Node.js y NestJS, con arquitectura preparada para escalado y separacion de responsabilidades.
- **Persistencia y gobierno del dato**: PostgreSQL como base relacional y Prisma como capa ORM y de migraciones.
- **IA conversacional y recuperacion de conocimiento**: integracion OpenAI para capacidades LLM y STT, junto con arquitectura RAG con ingesta de fuentes documentales, web y API.
- **Avatar y capa audiovisual**: proveedor de avatar hiperrealista Anam, integrado mediante adapter, con soporte de voz y reproduccion en tiempo real.
- **Seguridad y control**: autenticacion JWT, refresh token, MFA, RBAC, auditoria, retencion y exportacion estructurada.
- **Infraestructura y despliegue**: orientacion SaaS multicloud, con capacidad de evolucion sobre hiperescalares y desacoplamiento entre componentes.

Esta combinacion tecnologica aporta un equilibrio adecuado entre robustez, flexibilidad, seguridad y capacidad de crecimiento, permitiendo que la solucion cumpla los requisitos presentes del pliego y, al mismo tiempo, se mantenga preparada para futuras ampliaciones funcionales, tecnicas u operativas.

**Anadir captura de:** esquema del stack tecnologico por capas.  
**Descripcion de la captura:** diagrama simplificado con frontend, backend, base de datos, motor RAG, proveedor avatar, seguridad y modulos transversales.

**Anadir captura de:** vista tecnica de administracion o modulo backend relevante.  
**Descripcion de la captura:** evidencia del enfoque modular de la solucion, mostrando las principales areas funcionales del sistema o una vista representativa del panel de administracion.

**Anadir captura de:** esquema de arquitectura funcional.  
**Descripcion de la captura:** diagrama de arquitectura de alto nivel con separacion entre canal ciudadano, backend, repositorio de conocimiento, analitica, auditoria y proveedor de avatar.

**Anadir captura de:** exportacion o bundle de datos y configuracion.  
**Descripcion de la captura:** evidencia del mecanismo de exportacion estructurada de configuracion, conocimiento, metricas y logs en formato estandar.

---

### 1.7. Compatibilidad y adaptacion al entorno municipal

La solucion ha sido disenada con un criterio de maxima compatibilidad con navegadores y dispositivos de uso habitual en el contexto municipal y ciudadano. En particular, los componentes web estan orientados a su funcionamiento en entornos Chrome y Edge, con adaptacion responsive y optimizacion para equipos de gama media, de acuerdo con lo requerido en el pliego.

Desde el punto de vista de integracion, la arquitectura propuesta permite convivir con el resto del ecosistema del Ayuntamiento y adaptarse a procedimientos de interoperabilidad, copia de seguridad, explotacion y supervision. La solucion no impone una arquitectura cerrada ni dependencias incompatibles con la evolucion futura del entorno TIC municipal.

El enfoque adoptado facilita, ademas, la actualizacion de componentes, la sustitucion de servicios equivalentes y la continuidad del servicio en caso de evolucion tecnologica o cambio de proveedor.

**Anadir captura de:** prueba o vista de compatibilidad en navegador de escritorio.  
**Descripcion de la captura:** evidencia visual del funcionamiento del canal ciudadano o portal admin en navegador soportado.

---

### 1.8. Seguridad de la solucion y alineacion con ENS

La propuesta incorpora una estrategia de seguridad por capas que cubre autenticacion, autorizacion, proteccion de comunicaciones, trazabilidad, endurecimiento de servicios, control de acceso al backoffice, exportacion segura y minimizacion de datos. La solucion contempla roles diferenciados, autenticacion reforzada para perfiles sensibles y registros de auditoria para acciones administrativas relevantes.

El diseno funcional esta alineado con los principios del Esquema Nacional de Seguridad y con buenas practicas de hardening, control de acceso, monitorizacion y trazabilidad. La solucion preve mecanismos de proteccion frente a accesos no autorizados, validacion de entrada, restriccion por rol, gestion de sesiones y politicas de retencion de informacion.

En materia de proteccion de datos, la propuesta evita el uso de datos personales de usuarios para entrenamiento de modelos y limita la personalizacion a contexto de sesion, idioma, preferencias declaradas y parametros funcionales permitidos. Se contempla asimismo el gobierno del dato, la retencion configurable y el anonimizado o borrado en funcion de la politica definida.

La solucion incorpora igualmente un modelo de transparencia operacional, con registros de auditoria, exportacion estructurada y evidencias tecnicas orientadas a facilitar la supervision del servicio y su evolucion hacia un nivel mayor de madurez ENS.

**Anadir captura de:** modulo de auditoria y logs.  
**Descripcion de la captura:** pantalla del portal de administracion donde se visualizan eventos de auditoria, acciones de usuario y trazabilidad del sistema.

**Anadir captura de:** pantalla de login o MFA o control de acceso.  
**Descripcion de la captura:** evidencia de autenticacion de administrador y proteccion reforzada de acceso al backoffice.

---

### 1.9. Gestion de contenidos, administracion y gobierno de la plataforma

La solucion incorpora un portal de administracion concebido como backoffice editorial y operativo. Este portal permite altas, bajas y mantenimiento de contenidos, gestion de fuentes de conocimiento, control del entrenamiento conversacional, revision de auditoria, visualizacion de analitica y configuracion general del servicio.

La propuesta responde asi al requisito de disponer de un entorno de administracion que permita al Ayuntamiento mantener actualizada la base de conocimiento, incorporar nuevos recursos, retirar elementos obsoletos y supervisar el funcionamiento general del sistema. El modelo de administracion esta orientado a la autonomia progresiva del personal municipal, manteniendo al mismo tiempo mecanismos de seguridad y trazabilidad.

Se preve asimismo la evolucion del backoffice hacia flujos de validacion, revision editorial, versionado y explotacion avanzada, de forma compatible con el modelo de gobernanza y operacion que se acuerde con el Ayuntamiento durante la implantacion.

**Anadir captura de:** gestion de contenidos.  
**Descripcion de la captura:** pantalla del backoffice para alta, consulta o mantenimiento de contenidos multilingues del asistente.

**Anadir captura de:** configuracion general.  
**Descripcion de la captura:** pantalla de configuracion con branding, canales, privacidad, parametros de voz y otros ajustes generales del servicio.

---

### 1.10. Valor anadido de la solucion propuesta

Como valor anadido, la solucion propuesta incorpora una serie de caracteristicas diferenciales que refuerzan su alineacion con el objeto del contrato y mejoran la sostenibilidad tecnica del servicio a medio y largo plazo.

En primer lugar, la arquitectura desacoplada entre canal ciudadano, motor conversacional, proveedor de avatar y capa de conocimiento reduce el riesgo de dependencia tecnologica y facilita la evolucion futura del servicio sin necesidad de redisenos estructurales. Esta aproximacion permite sustituir componentes equivalentes manteniendo la continuidad funcional y la experiencia de usuario.

En segundo lugar, la plataforma incorpora una estrategia de gobierno del conocimiento basada en trazabilidad documental, exportacion estructurada, control administrativo y politicas de respuesta con incertidumbre cuando no existe fuente fiable. Este enfoque refuerza la confianza institucional y ciudadana en el sistema.

En tercer lugar, el modelo de administracion integra capacidades de configuracion, auditoria, analitica y mantenimiento de fuentes, permitiendo al Ayuntamiento disponer de mayor control operativo sobre el servicio y reduciendo la dependencia del adjudicatario para tareas ordinarias de explotacion.

Por ultimo, la solucion ha sido concebida con una clara orientacion a seguridad, interoperabilidad y escalabilidad, alineando el proyecto con principios ENS, buenas practicas de desarrollo y una estrategia de despliegue adaptable a distintos entornos cloud y canales de atencion.

**Anadir captura de:** mosaico resumen de la solucion.  
**Descripcion de la captura:** composicion visual con canal ciudadano, backoffice, gestion documental, auditoria y analitica, como resumen grafico de la solucion propuesta.

---

### 1.11. URL de demostracion

A efectos de valoracion tecnica, se facilitara acceso a un entorno de demostracion plenamente operativo que incluira tanto la parte de usuario final como el portal de administracion, con informacion real de prueba y funcionalidades suficientes para su evaluacion por parte del Ayuntamiento.

- **URL entorno ciudadano:** `[Anadir URL demo ciudadano]`
- **URL portal de administracion:** `[Anadir URL demo admin]`
- **Usuario de acceso:** `[Anadir usuario demo]`
- **Contrasena o mecanismo de acceso:** `[Anadir credenciales o procedimiento de acceso]`

---

### 1.12. Conclusion del apartado

En conjunto, la solucion propuesta ofrece una respuesta tecnicamente solida, funcionalmente completa y alineada con los requisitos del pliego. Su diseno combina avatar hiperrealista, inteligencia artificial con trazabilidad documental, administracion centralizada, multilenguaje, seguridad, capacidad de evolucion y orientacion SaaS. Todo ello se articula con una arquitectura moderna, mantenible e interoperable, apta para su implantacion en el entorno del Ayuntamiento de Torremolinos y preparada para evolucionar conforme a las necesidades del servicio.

La propuesta no se limita a una interfaz conversacional, sino que configura una plataforma completa de atencion digital con gobierno del conocimiento, control operativo y vocacion de continuidad. Esta aproximacion aporta valor funcional inmediato y, al mismo tiempo, establece una base tecnica robusta para el crecimiento futuro del sistema.

**Nota para adaptacion final:** en la version definitiva de la memoria se recomienda revisar este apartado para ajustar la redaccion a la solucion exacta finalmente ofertada, asi como completar todas las referencias a capturas, URLs de demostracion y datos operativos definitivos.
