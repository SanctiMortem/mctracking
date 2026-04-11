# TRACK-008: Spike — iPhone SE 4-player layout legibility

> **Issue ID:** TRACK-008
> **Priority:** P2
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/ui`
> **Agents:** `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Investigar y validar si el layout 4-player de SCR-008 es legible en iPhone SE (375pt × 667pt — la pantalla más pequeña del target de iOS). En un 2×2 grid, cada sección ocupa ~187×230pt. El spike debe determinar si el life counter, nombre de jugador y botones +/- son usables a ese tamaño, y proponer ajustes si no lo son.

## User Story

> Como **desarrollador**, quiero **confirmar la legibilidad del tracker de 4 jugadores en iPhone SE** para **no lanzar con UX inutilizable en dispositivos pequeños**.

**Informado por:** US-013, US-015

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-008 Match Tracker | [15_DESIGN.md#scr-008](../../planning/15_DESIGN.md) |
| DESIGN | §0.6 Responsive Grid | [15_DESIGN.md](../../planning/15_DESIGN.md) |

---

## ✅ Criterios de Aceptación (Spike Output)

- [ ] Prototipo o screenshot del layout 4p en iPhone SE (375pt) — puede ser estático (Figma, RN demo, o Simulator)
- [ ] Determinar si `display-lg` (72sp) cabe legiblemente en ~187pt de ancho
- [ ] Documentar el tamaño mínimo viable del life counter en ese viewport
- [ ] Si 72sp no cabe → propuesta concreta: reducir a 48sp (`display-sm`) o usar `adjustsFontSizeToFit`
- [ ] Verificar que los botones +/- (60×60pt target) son tocables sin solapamiento en la sección
- [ ] Actualizar TRACK-003 o TRACK-004 con la decisión tomada

## 🔧 Contexto Técnico

**Dimensiones clave:**
```
iPhone SE (3ª gen): 375pt × 667pt
4-player grid cell: ~187pt × ~230pt (después de safe area y header ~48pt)

display-lg: 72sp → muy ajustado en 187pt de ancho
display-sm: 48sp → más seguro, sigue siendo legible a distancia
```

**Opción A — Reducir tipografía condicionalmente:**
```typescript
const SCREEN_WIDTH = Dimensions.get('window').width;
const lifeFont = SCREEN_WIDTH < 400 ? 48 : 72; // display-sm vs display-lg
```

**Opción B — `adjustsFontSizeToFit`:**
```typescript
<Text adjustsFontSizeToFit numberOfLines={1} style={styles.lifeDisplay}>
  {lifeTotal}
</Text>
```

**Opción C — Mantener 72sp y aceptar truncamiento en SE (device raro en 2026)**

**Dependencias de Issues:**
- Bloqueado por: TRACK-003 (shell existe para probar)
- Informa a: TRACK-004 (puede cambiar el tamaño de tipografía del LifeCounter)

## ⚠️ Notas del Spike

- Este es un spike de investigación — el output es una decisión documentada, no código producción
- Si se usa el Simulator, documentar el resultado en Implementation Evidence
- iPhone SE es el dispositivo mínimo soportado (no iPad en MVP)

## 🧪 Tests Requeridos

- [ ] Ningún test automatizado — spike de validación visual

## 🚫 Out of Scope

- Layout en iPad → No-Goal NG-002
- Accesibilidad dinámica (Dynamic Type) → EPIC-05

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
