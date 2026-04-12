# PLAT-009: i18n — Translation Strings Completas (EN + ES)

> **Issue ID:** PLAT-009
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Completar los archivos de traducción EN y ES con todos los strings de la app. El skeleton de i18n fue configurado en SETUP-006 — este issue popula todos los namespaces con el contenido real para cada pantalla y componente de EPIC-01 a EPIC-05.

## User Story

> Como **P-002** (usuario autenticado), quiero **usar la app en español o inglés** para **interactuar en mi idioma preferido**.

**Implementa:** US-041

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| BUSINESS_RULES | BR-I18N-01 (detección auto), BR-I18N-02 (MTG terms siempre en EN), BR-I18N-03 (nombres no traducir) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-041 | [04_USER_STORIES.md#us-041](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [x] Archivos: `locales/en.json`, `locales/es.json` (flat JSON, single namespace per locale)
- [x] TODOS los strings de la UI en inglés y español — sin strings hardcodeados en componentes
- [x] Términos MTG nunca traducidos (BR-I18N-02): "Commander Damage", "Infect", "Scoop", "Commander", "Deck", "Partner", "Combo", "Mill", "WUBRG"
- [x] Nombres de commanders y decks nunca traducidos (BR-I18N-03)
- [x] Idioma automático: si dispositivo en `es-*` → español; si no soportado → inglés fallback (BR-I18N-01)
- [x] Cambio de idioma en runtime funcional (PLAT-008)

## 🔧 Contexto Técnico

**Estructura de archivos:**
```
locales/
├── en/
│   ├── common.json    — App name, error messages, actions (Cancel, Save, etc.)
│   ├── auth.json      — SCR-001 copy
│   ├── tracker.json   — SCR-008/019: life, poison, commander damage labels
│   ├── match.json     — Setup, close, results, history labels
│   ├── stats.json     — Stats dashboard, player profile labels
│   ├── groups.json    — Groups screen
│   └── settings.json  — Settings labels
└── es/
    ├── common.json
    ├── auth.json
    ├── tracker.json
    ├── match.json
    ├── stats.json
    ├── groups.json
    └── settings.json
```

**Regla de MTG terms (BR-I18N-02):**
```json
// ✅ Correcto — MTG term en inglés aunque la UI esté en español
{
  "tracker.commanderDamage": "Commander Damage",
  "tracker.poisonCounter": "Poison Counter"
}

// ✅ Correcto — UI label traducible
{
  "tracker.lifeTotal": "Life Total",        // EN
  "tracker.lifeTotal": "Total de Vida"      // ES — "Life Total" en MTG, pero "Total de Vida" en UI label está OK
}
// NOTA: Verificar con el owner si "Total de Vida" o mantener "Life Total" — consultar BR-I18N-02
```

**Interpolaciones:**
```json
// EN: "Gabriel: -5 life"
"tracker.lifeChangeEvent": "{{player}}: {{delta}} life"

// ES: "Gabriel: -5 de vida"
"tracker.lifeChangeEvent": "{{player}}: {{delta}} de vida"
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-006 (i18n skeleton)
- Bloquea a: todas las screens que usan strings

---

## ⚠️ Edge Cases

- Plural forms en español ("1 partida" vs "2 partidas"): usar `i18next-intervalplural-postprocessor` o `count` interpolation
- Strings con format complejo (dates, durations): usar `dayjs` + i18next locale plugin
- Términos MTG en un contexto de UI traducible: "Commander Damage" siempre en inglés, pero "Daño de Commander" NO se usa — solo "Commander Damage" independientemente del idioma (BR-I18N-02)

## 🧪 Tests Requeridos

- [x] Unit: todas las keys de EN tienen equivalente en ES (key coverage check) — `__tests__/unit/i18n/locales.test.ts`
- [x] Unit: términos MTG en BR-I18N-02 son idénticos en EN y ES (no traducidos)

## 🚫 Out of Scope

- Traducciones a otros idiomas (FR, PT) → Fase 2
- Localización de formatos de número/moneda → fuera del scope MVP

---

## SK Leverage

No aplica — contenido nuevo.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-12 | Flat JSON en `locales/en.json` y `locales/es.json` en lugar de archivos por namespace | El skeleton SETUP-006 ya usaba un único archivo; mantener consistencia evita refactoring |
| 2026-04-12 | Pluralización explícita con ternario (`data.total_players === 1 ? t('stats.activePlayer') : t('stats.activePlayers')`) | Evita usar API `count` de i18next que requiere claves con sufijo `_plural` y renombrar existentes |
| 2026-04-12 | Arrays de opciones con etiquetas traducibles (ENTITY_TYPE_TABS, SCOPE_TABS, WIN_CONDITIONS, RESULT_OPTIONS, WIN_CONDITION_OPTIONS) movidos dentro del componente | Los hooks sólo pueden llamarse dentro de componentes React; las constantes de módulo no pueden usar `t()` |

---

## Commits

- `062a7c4` feat(platform): implement PLAT-009 — i18n EN+ES strings complete (EPIC-05)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-12_
