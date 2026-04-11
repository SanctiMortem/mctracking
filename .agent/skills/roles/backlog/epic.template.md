# EPIC-{NAME}: {Título}

> **Milestone:** {version}
> **Status:** 📋 Planning
> **Issues:** {N} total (0 done)
> **Branch:** `epic/{name}` (crear al empezar)

---

## 🎯 Objetivo

{Descripción del epic y qué problema resuelve}

## User Stories

| ID     | Título   | Priority | Epic Link |
| ------ | -------- | -------- | --------- |
| US-XXX | {título} | —        | Este epic |

---

## 📋 Issues

| ID               | Título            | Depende de | Priority | Status | Effort | SP  |
| ---------------- | ----------------- | ---------- | -------- | ------ | ------ | --- |
| {PREFIX}-001     | {título}          | —          | P0       | 📋     | M      | 5   |
| {PREFIX}-002     | {título}          | 001        | P1       | 📋     | S      | 3   |
| **{PREFIX}-NNN** | **🧪 Epic Tests** | Todos      | **P1**   | 📋     | M      | 5   |

> 🔴 **REGLAS:**
>
> - Cada epic SIEMPRE termina con un issue de testing como **último número secuencial** (no 999).
> - Los IDs reflejan el **orden de implementación** (topological sort por dependencias).
> - Issue-N NUNCA depende de Issue-M donde M > N.

---

## 🔗 Dependencias

**Requiere:**

- [EPIC-XXX](./EPIC-XXX.md) — {razón}

**Bloquea:**

- [EPIC-YYY](./EPIC-YYY.md) — {razón}

---

## 📐 Scope

**Incluido:**

- {Feature 1}
- {Feature 2}

**Excluido:**

- {Feature para otro epic}
- {Out of scope}

---

## 📚 Referencias

- Design: [15_DESIGN.md](../../planning/15_DESIGN.md)
- Stories: [04_USER_STORIES.md](../../planning/04_USER_STORIES.md)
- Rules: [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md)

---

## ✅ QC Checklist (Al Completar Epic)

> 🔴 **OBLIGATORIO** — Verificar ANTES de cerrar el epic.

### QC-Epic Validation

- [ ] Todos los issues del epic están ✅ Done
- [ ] {PREFIX}-NNN (Epic Tests) completado
- [ ] Lint passa: `pnpm lint`
- [ ] Types passa: `pnpm typecheck`
- [ ] Tests del epic pasan: `pnpm test -- --grep "{epic-name}"`
- [ ] No hay TODOs sin issue asociado en código del epic
- [ ] Documentación actualizada (si aplica)

### Coverage Check

- [ ] Coverage mínimo 80% para lógica de negocio del epic
- [ ] Escenarios críticos tienen E2E tests

### Cross-Reference Validation

- [ ] Todos los AC de issues están marcados [x]
- [ ] Issues reflejan decisiones tomadas en bitácora
- [ ] No hay scope creep sin documentar

---

## 📈 Progreso

```
Total:     ████████████████████ 100% ({N} issues)
Done:      ░░░░░░░░░░░░░░░░░░░░   0% (0 issues)
Progress:  ░░░░░░░░░░░░░░░░░░░░   0% (0 issues)
```

---

_Creado: {{DATE}}_
_Última actualización: {{DATE}}_
