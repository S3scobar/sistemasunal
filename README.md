# Ingeniería de Sistemas e Informática · UNAL Medellín

Sitio web del programa de Ingeniería de Sistemas e Informática de la Facultad de Minas, Universidad Nacional de Colombia, Sede Medellín. Usa la paleta y el estilo de la web de la Semana de Sistemas.

## Módulos (páginas separadas)

| Página | Contenido |
| --- | --- |
| `index.html` | Información del programa (160 créditos, acreditación y renovación, descripción), perfil del egresado, grupos estudiantiles y semilleros |
| `malla.html` | Malla curricular interactiva (clic en una asignatura: prerrequisitos, créditos y componente) y catálogo de asignaturas por componente, con paginación |
| `intercampus.html` | Rutas intercampus (Robledo ➔ El Volador, El Volador ➔ Robledo, Río ➔ El Volador), cálculo de próxima salida en tiempo real, guía explicativa y láminas oficiales |
| `info.html` | Información general y guía estudiantil (P.A.P.A., bolsa de créditos, horas de corresponsabilidad, citas SIA, simulador interactivo y preguntas frecuentes) |
| `avance.html` | Mi avance: se pega la historia académica del SIA (Ctrl+A, Ctrl+C), se procesa solo en el navegador y muestra nivel/XP, graduación estimada según tu ritmo, avance por componente y logros (se agregan en `data/logros.json`) |
| `convenios.html` | Convenios de la UNAL (Coursera, MATLAB, Microsoft 365) y beneficios para estudiantes (Autodesk, GitHub, JetBrains, Spotify): lista desplegable con quién puede usarlos, qué incluyen y cómo activarlos paso a paso |

Cada página carga solo los datos que necesita, y las secciones largas del inicio se cargan cuando la persona se acerca a ellas.

## Arquitectura de datos

Los datos viven en `data/` como JSON, separados del código y de la base de datos de la Semana de Sistemas:

```
data/
  programa.json          ficha del programa (160 créditos) y acreditación
  perfil.json            perfil del egresado
  grupos.json            grupos estudiantiles y semilleros
  intercampus.json       rutas, franjas horarias 2026-2S y conexiones intercampus
  convenios/
    indice.json          tipos y ficha corta de cada convenio (se pide al abrir la página)
    <id>.json            detalle y pasos de cada uno (se pide solo cuando se abre)
  info.json              guía estudiantil, PAPA, bolsa, corresponsabilidad, FAQs y glosario
  malla/
    componentes.json     componentes y agrupaciones (créditos exigidos)
    plan.json            qué va en cada semestre (códigos o casillas de optativa / libre elección)
    asignaturas.json     catálogo: créditos, agrupación y prerrequisitos (por código)
```

Cada asignatura se guarda una sola vez y las demás partes la referencian por código. Lo que depende de otras tablas (por ejemplo, «es prerrequisito de») se calcula en el navegador, así no hay datos duplicados que se desactualicen.

Fuente de la malla: *Programa Curricular – Ingeniería de Sistemas e Informática*, Vicedecanatura Académica, Facultad de Minas (2026-2).

## Ver el sitio en local

Los datos se piden con `fetch`, así que hay que servir la carpeta (no basta con abrir el HTML con doble clic):

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Para publicarlo, sirve cualquier hosting estático (por ejemplo GitHub Pages desde la rama `main`).

## Estructura

```
index.html · malla.html · intercampus.html · avance.html · info.html
css/   base.css (común) · inicio.css · malla.css · intercampus.css · info.css
js/    comun.js (datos, barra y pie) · inicio.js · malla.js · intercampus.js · info.js
img/
data/
```

---

Estilo basado en la web de la Semana de Sistemas, hecha por Santiago Escobar Arias y Jerónimo Hoyos Botero.
