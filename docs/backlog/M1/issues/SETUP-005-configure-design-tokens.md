# SETUP-005: Configure design tokens "The Mystic Archive"

> **Issue ID:** SETUP-005
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/ui`
> **Agents:** `design-system-lead`, `design-engineer`
> **Owner:** Gabriel Asse
>
> **Blocked By:** ADR-001 (styling strategy must be decided first)

---

## 🎯 Objetivo

Implementar el sistema de design tokens "The Mystic Archive" — la paleta de colores WUBRG, tipografía, espaciado, shadows y motion profile definidos en `15_DESIGN.md §0`. Este issue establece el lenguaje visual del proyecto que todos los componentes posteriores usarán.

La implementación concreta depende de ADR-001: si StyleSheet nativo → `styles/tokens.ts` como módulo TypeScript; si NativeWind → `tailwind.config.js` con extensiones de tema.

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **un sistema de tokens de diseño centralizado** para **que todos los componentes de la app usen los mismos colores, tipografía y espaciado sin duplicar valores**.

**Implementa:** — (Design system infrastructure, §0 Visual Direction)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | §0.3 Paleta de Colores | [15_DESIGN.md#§03-paleta-de-colores](../../planning/15_DESIGN.md) |
| DESIGN | §0.4 Typography | [15_DESIGN.md#§04-typography](../../planning/15_DESIGN.md) |
| DESIGN | §0.5 Componentes Clave | [15_DESIGN.md#§05-componentes-clave](../../planning/15_DESIGN.md) |
| DESIGN | §0.6 Motion Profile | [15_DESIGN.md#§06-motion-profile](../../planning/15_DESIGN.md) |

---

## ✅ Criterios de Aceptación

- [ ] Todos los colores WUBRG y colores de interfaz definidos en el sistema de tokens
- [ ] Escala tipográfica completa (`display-lg`, `display-sm`, `body-lg`, `body-sm`, `caption`) con tamaños correctos
- [ ] Escala de espaciado definida (4/8/12/16/24/32/48px)
- [ ] Shadows y elevation tokens definidos
- [ ] Motion tokens: duraciones de transición (fast/normal/slow)
- [ ] Un componente de prueba `components/debug/TokenPreview.tsx` que renderiza la paleta completa
- [ ] Todos los colores son modo oscuro (dark-only en MVP)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Tokens están disponibles para los componentes
  Dado que `styles/tokens.ts` (o tailwind.config.js) está configurado
  Cuando un componente importa los tokens y aplica el color "surface-primary"
  Entonces el componente renderiza con el color correcto del design system
  Y no hay valores hardcodeados (#hex) en el componente

Escenario: Paleta WUBRG accesible
  Dado que los tokens están configurados
  Cuando importo `colors.white`, `colors.blue`, `colors.black`, `colors.red`, `colors.green`
  Entonces obtengo los valores hex correctos del Design System "The Mystic Archive"

Escenario: TokenPreview renderiza sin errores
  Dado que `components/debug/TokenPreview.tsx` existe
  Cuando navego a él durante desarrollo
  Entonces veo la paleta completa de colores, tipografía y espaciado
```

## 🔧 Contexto Técnico

**Colores a definir (de 15_DESIGN §0.3):**
- WUBRG: White (`#F9FAF4`), Blue (`#0E68AB`), Black (`#150B00`), Red (`#D3202A`), Green (`#00733E`), Colorless (`#BEB9B2`)
- Superficies: background, surface-primary, surface-secondary, border
- Texto: text-primary, text-secondary, text-muted
- Estado: success, warning, error, info
- Life total: color por rangos (high/medium/low/critical)

**Tipografía (de 15_DESIGN §0.4):**
- `display-lg`: 72sp (life total principal)
- `display-sm`: 48sp (vida compacta)
- `heading-xl`, `heading-lg`, `heading-md`
- `body-lg`, `body-sm`, `caption`
- `label`

**Archivos a crear:**

Si StyleSheet nativo (recomendado por ADR-001):
- `styles/tokens.ts` — colores, tipografía, spacing, shadows, motion
- `styles/index.ts` — re-export conveniente

Si NativeWind:
- `tailwind.config.js` — extensión de tema con tokens WUBRG
- `global.css` — estilos base Tailwind

**Dependencias de Issues:**
- Bloqueado por: SETUP-001, ADR-001
- Bloquea a: Todos los issues UI (DATA-005 en adelante)

## ⚠️ Edge Cases

- Los tamaños de fuente grandes (`display-lg: 72sp`) pueden necesitar ajuste en pantallas pequeñas (iPhone SE) — marcar como TODO para TRACK-008 (spike)
- Dark-only: no crear variables light, simplificar el token set

## 🧪 Tests Requeridos

- [ ] Unit: cada token exportado tiene un valor definido (no `undefined`)
- [ ] Visual: `TokenPreview.tsx` renderiza correctamente en simulador

## 🚫 Out of Scope

- Implementar componentes del design system (buttons, inputs, etc.) → issues individuales por componente
- Modo light (no está en MVP)
- Animaciones complejas (implementar con Reanimated en issues específicos)

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto). Design system custom "The Mystic Archive".

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | Pendiente ADR-001 | Styling strategy define el formato de los tokens |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
