# Chisap CRM · Demo interactiva

CRM de captación de franquiciados para **Chisap Fiesta**, con dos lados que comparten los mismos datos:

| Lado | Página | Qué muestra |
|---|---|---|
| 🙋 **Cliente** | [`landing.html`](https://emilianocobe.github.io/chisap-crm/landing.html) | Landing + wizard gamificado de 8 pasos que califica el perfil del candidato |
| 🎧 **Colaborador** | [`app.html`](https://emilianocobe.github.io/chisap-crm/app.html) | Backoffice: pipeline kanban, scoring editable, dashboard, gamificación |

**Demo online:** https://emilianocobe.github.io/chisap-crm/

## El truco de la demo

Completá el wizard como candidato → tu lead aparece **primero en el pipeline** del backoffice, etiquetado como "TU LEAD". Los datos viven en `localStorage` del navegador; se reinician desde ⚙️ Configuración.

## Qué implementa (basado en research de Pipedrive, Attio, HubSpot y Linear)

- **Pipeline kanban** con drag & drop, zonas de soltar Firmado/Perdido, alerta de leads "enfriándose" (SLA), punto de actividad por tarjeta y menú "Mover a" accesible por teclado.
- **Filosofía "next activity"**: al mover un lead, el CRM pide la próxima acción.
- **Scoring 100 % editable**: puntos por respuesta con steppers, umbrales de temperatura con sliders e **impacto en vivo** sobre toda la base antes de guardar.
- **Dashboard**: leads del mes, meta de firmas con barra, embudo, serie semanal, temperatura, orígenes y lista accionable de leads fríos.
- **Gamificación con significado**: XP, niveles, 8 logros, racha, ranking de equipo que premia actividad (no solo cierre) y confetti **solo** al firmar.
- **Wizard de alta conversión**: una pregunta por pantalla, autoavance, progreso dotado (arranca en 12 %), datos de contacto al final, microcopy de confianza y celebración final con score.
- **Detalles AAA**: command palette (Ctrl K), atajos tipo Linear (G+D, G+P, N, ?), toasts con Deshacer, empty states con personalidad, tooltips, `prefers-reduced-motion`, focus visible.

## Stack

HTML + CSS + JS vanilla, sin build ni dependencias. `assets/store.js` es la capa de datos (seed de 28 leads + motor de scoring), `assets/charts.js` el motor de gráficos SVG.

---
Demo desarrollada por [ecobe.digital](https://ecobe.digital) para Chisap S.A.
