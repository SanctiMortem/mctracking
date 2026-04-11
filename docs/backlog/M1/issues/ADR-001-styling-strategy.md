# ADR-001: Decidir estrategia de styling (NativeWind vs StyleSheet nativo)

> **Issue ID:** ADR-001
> **Priority:** P0
> **Effort:** XS
> **Story Points:** 1
> **Status:** 📋 Backlog
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `project/architecture`
> **Agents:** `architect`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Decidir la estrategia de styling para el Design System "The Mystic Archive" antes de iniciar cualquier implementación de UI. Esta decisión afecta todos los epics posteriores: cómo se expresan los design tokens, cómo se nombran los estilos en los componentes, y si hay una dependencia de NativeWind en el proyecto.

La decisión debe tomarse en base al stack confirmado (React Native + Expo), la complejidad de los tokens WUBRG, y la preferencia de mantenimiento a largo plazo del proyecto.

## User Story

> Como **Gabriel Asse** (Product Owner + único desarrollador), quiero **una decisión documentada sobre la herramienta de styling** para **comenzar a implementar UI sin cambiar de enfoque a mitad del proyecto**.

**Implementa:** — (Decisión arquitectural, §7 Architecture)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| ARCHITECTURE | OQ-03 Styling | [07_ARCHITECTURE.md#oq-03](../../planning/07_ARCHITECTURE.md#open-questions) |
| DESIGN | §0 Visual Direction | [15_DESIGN.md#§0-visual-direction](../../planning/15_DESIGN.md) |
| DISCOVERY | §8 Stack | [00_DISCOVERY_BRIEF.md#§8](../../planning/00_DISCOVERY_BRIEF.md) |

---

## Contexto

El Design System "The Mystic Archive" requiere tokens de color (WUBRG palette), tipografía, espaciado y motion. En React Native existen dos enfoques principales para expresar estos tokens:

### A) NativeWind (Tailwind CSS para React Native)

- Usa clases Tailwind: `className="bg-purple-900 text-white text-2xl"`
- Pros: DX rápida, tokens configurables en `tailwind.config.js`, ecosistema amplio, consistencia con web si se agrega web target
- Cons: Requiere configuración adicional en Expo (babel plugin), overhead de runtime de clases, puede complicar animaciones nativas, menor control fino sobre StyleSheet.absoluteFill y layouts nativos complejos
- Compatibilidad: ✅ Expo SDK 50+ con `nativewind` v4

### B) StyleSheet nativo (`StyleSheet.create` + design tokens en TS)

- Usa `StyleSheet.create({...})` con tokens importados de `styles/tokens.ts`
- Pros: Zero overhead, 100% nativo, control total, no hay dependencia adicional, mejor soporte para Reanimated / Gesture Handler, más predecible en layouts 4-player
- Cons: Más verboso, no hay utilidades de clase, tokens se aplican manualmente

### Consideración crítica: Tracker 4-player

El Match Tracker (SCR-008) requiere layouts complejos con 4 secciones rotables. StyleSheet nativo tiene mejor interop con `react-native-reanimated` y `react-native-gesture-handler` que NativeWind para transformaciones de layout.

## Opciones

### Opción A: NativeWind v4
- Pros: DX rápida, fácil onboarding, tokens en Tailwind config
- Cons: Dependencia extra, posibles problemas con layouts complejos del tracker, overhead

### Opción B: StyleSheet nativo + tokens TypeScript (RECOMENDADO)
- Pros: Zero deps extra, máximo control, mejor interop con Reanimated/Gesture Handler, más mantenible para 1 dev, el tracker 4-player lo requiere
- Cons: Más verboso

## ✅ Criterios de Aceptación

- [ ] Decisión documentada en este ADR con opción seleccionada
- [ ] `styles/tokens.ts` creado como estructura propuesta (durante SETUP-005)
- [ ] SETUP-004 y SETUP-005 actualizados para reflejar la decisión
- [ ] Si NativeWind: `tailwind.config.js` con tokens WUBRG definido en SETUP-005
- [ ] Si StyleSheet: `styles/tokens.ts` con colores, tipografía, spacing en SETUP-005

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Decisión tomada y documentada
  Dado que ADR-001 está en estado "Pendiente"
  Cuando Gabriel Asse revisa las opciones y selecciona una
  Entonces el campo "Decisión" de este ADR se actualiza con la opción elegida
  Y SETUP-005 se implementa con la estrategia seleccionada

Escenario: Verificación de consistencia
  Dado que la decisión de styling está tomada
  Cuando se implementan los primeros componentes en SETUP-004 y SETUP-005
  Entonces todos los componentes usan el mismo sistema de styling
  Y no hay mezcla de NativeWind + StyleSheet.create en el mismo componente
```

## 🔧 Contexto Técnico

**Decisión bloquea:**
- `SETUP-004` — Expo Router shell (afecta cómo se aplican estilos al tab bar)
- `SETUP-005` — Design tokens (estructura de `styles/tokens.ts` o `tailwind.config.js`)
- Todos los issues UI de EPIC-01 en adelante

**Archivos a crear (post-decisión, en SETUP-005):**
- `styles/tokens.ts` — Si StyleSheet nativo: colores, tipografía, spacing, shadows
- `tailwind.config.js` — Solo si NativeWind: tokens WUBRG como extensión de Tailwind
- `babel.config.js` — Si NativeWind: agregar `nativewind/babel` preset

**Recomendación del Architect:**
StyleSheet nativo (Opción B) — el tracker 4-player con rotación de secciones y animaciones nativas (react-native-reanimated) es el componente más complejo del proyecto y se beneficia directamente del control total que ofrece StyleSheet nativo sobre NativeWind.

## ⚠️ Edge Cases

- Si se elige NativeWind y luego el tracker tiene problemas de layout → migración costosa mid-project
- Si se elige StyleSheet y hay un dev adicional con experiencia en Tailwind → onboarding más lento

## 🧪 Tests Requeridos

- [ ] No aplica — es una decisión de arquitectura, no código

## 🚫 Out of Scope

- Implementar los tokens (eso es SETUP-005)
- Evaluar otras opciones como Tamagui o Gluestack UI

## Decisión

**Pendiente** — Resolver antes de iniciar SETUP-004 y SETUP-005.

## Afecta a

- SETUP-004 (Expo Router shell)
- SETUP-005 (Design tokens)
- Todos los issues UI de EPIC-01 en adelante

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto).

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | Pendiente | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
