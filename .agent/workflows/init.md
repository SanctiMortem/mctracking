---
description: Initialize session - load project context and show status
---

# /init — Session Initialization

> Preload project context so the agent is always aware of what exists.
> Run this at the start of every session.
>
> **TimeKast Factory** — 2026-03-25

---

## Phase 1: Essential Context (ALWAYS load)

> These docs give the agent awareness of the project structure, existing code, backlog state, and terminology.
> Without them, the agent will reinvent things that already exist.
>
> ⚠️ En proyectos nuevos algunos de estos archivos pueden no existir aún.
> Los fallbacks indican cómo crearlos. El workflow debe funcionar aunque falten todos.

// turbo

```bash
cat ./docs/planning/project-config.md 2>/dev/null || echo "⚠️ No project-config.md — se crea durante /discovery o manualmente"
```

// turbo

```bash
cat ./docs/reference/INVENTORY.md 2>/dev/null || echo "⚠️ No INVENTORY.md — run 'pnpm generate:inventory'"
```

// turbo

```bash
cat ./docs/reference/CODEBASE.md 2>/dev/null || echo "⚠️ No CODEBASE.md — run 'pnpm generate:codebase'"
```

// turbo

```bash
cat ./docs/backlog/BOARD.md 2>/dev/null || echo "⚠️ No BOARD.md — run 'pnpm update-board'"
```

// turbo

```bash
cat ./docs/planning/09_GLOSSARY.md 2>/dev/null || echo "⚠️ No 09_GLOSSARY.md — se crea con /docs (documento 09)"
```

---

## Phase 2: Project Status

// turbo

```bash
git branch --show-current 2>/dev/null || true
git status --short 2>/dev/null || true
```

// turbo

```bash
node -e "const p=require('./package.json'); console.log('version:', p.version || 'N/A'); console.log('factoryVersion:', p.factoryVersion || 'N/A'); console.log('agentKitVersion:', p.agentKitVersion || 'N/A'); console.log('ports:', JSON.stringify(p.ports || {}))" 2>/dev/null || echo "⚠️ No package.json or missing fields"
```

---

## Phase 3: Output Summary

> 🔴 **REGLA CRÍTICA:** Para la sección de Backlog Status, cita TEXTUALMENTE
> la tabla resumen de BOARD.md (las primeras ~25 líneas).
> **NUNCA interpretes, resumas, ni inventes datos del backlog.**
> Si BOARD.md no existe, dilo. No inventes números.

Present to user:

```markdown
## 🚀 Session Initialized

### 📋 Loaded Context

- [x/?] project-config.md
- [x/?] INVENTORY.md
- [x/?] CODEBASE.md
- [x/?] BOARD.md
- [x/?] 09_GLOSSARY.md

> Use [x] if loaded, [?] if missing with note on how to create it.

### 📊 Project Status

- **Project:** [name from project-config, or "Unknown — no project-config.md"]
- **Branch:** [current branch]
- **Uncommitted changes:** [list files or "none"]
- **Version:** [from package.json]
- **Factory Version:** [from package.json]
- **Agent Kit Version:** [from package.json]
- **Ports:** dev=[port], e2e=[port]

### 📋 Backlog Status

> Paste the BOARD.md summary table verbatim here.
> If BOARD.md does not exist, say: "No BOARD.md — run `pnpm update-board` to generate."

### 💡 Suggested Next

Based on project status:

- If issues in To Do → Suggest `/implement {ISSUE-ID}` for the highest priority one
- If uncommitted changes → "Review changes before proceeding"
- If all issues Done + clean state → "Ready for `/audit` then `/deploy`"
- If clean state + issues pending → "Ready for `/implement` or new work"
- If new project (no docs) → "Start with `/discovery` to create the project foundation"
```

---

## Phase 4: Available Actions

### 📍 ¿Dónde estás?

| Si tienes...         | Siguiente paso           | Workflow              |
| -------------------- | ------------------------ | --------------------- |
| Nada / idea inicial  | Entender el problema     | `/discovery`          |
| Discovery Brief      | Propuesta para cliente   | `/proposal`           |
| Propuesta aprobada   | Documentación técnica    | `/docs`               |
| Docs 02-14 completos | Especificación UI/UX     | `/design`             |
| Design 15 completo   | Crear issues del backlog | `/backlog`            |
| Issues en backlog    | Implementar código       | `/implement ISSUE-ID` |
| Código implementado  | Verificar calidad        | `/audit`              |
| Audit pasó           | Merge a main + deploy    | `/deploy`             |
| Bug o arreglo rápido | Fix sin issue formal     | `/start`              |

### 🛠️ Quick Actions

| Action             | Command               | Cuándo                      |
| ------------------ | --------------------- | --------------------------- |
| Implement feature  | `/implement ISSUE-ID` | Issue en backlog            |
| Quick fix / hotfix | `/start`              | Arreglos rápidos sin issue  |
| Debug issue        | `/debug`              | Investigación de bug        |
| Park idea          | `/park "idea"`        | Fuera de scope actual       |
| Quality review     | `/audit`              | Post-implement o pre-deploy |
| Deploy / Release   | `/deploy`             | Merge a main, auto-deploy   |
| Validate docs      | `/validate_docs`      | Post-pipeline step          |

### 🚀 Bootstrap Pipeline (proyectos nuevos)

```
/discovery → /proposal → /docs → /design → /backlog → /implement → /audit → /deploy
```

| Step | Workflow     | Output                | Prerequisito      |
| ---- | ------------ | --------------------- | ----------------- |
| 1    | `/discovery` | Discovery Brief       | Idea del usuario  |
| 2    | `/proposal`  | Propuesta cliente     | Discovery Brief   |
| 3    | `/docs`      | Docs técnicos (02-14) | Proposal aprobada |
| 4    | `/design`    | 15_DESIGN.md          | Docs completos    |
| 5    | `/backlog`   | Issues ejecutables    | Design completo   |
| 6    | `/implement` | Código + tests        | Issue ID          |
| 7    | `/audit`     | Quality review        | Post-implement    |
| 8    | `/deploy`    | Merge a main + deploy | Audit aprobado    |

---

## Stop Conditions

| Condición                   | Severidad | Acción                                                  |
| --------------------------- | --------- | ------------------------------------------------------- |
| project-config.md no existe | P1        | Preguntar al usuario o sugerir `/discovery`             |
| INVENTORY.md no existe      | P2        | Sugerir `pnpm generate:inventory`                       |
| BOARD.md no existe          | P2        | Solo si hay backlog — si no, completar pipeline primero |
| 09_GLOSSARY.md no existe    | P3        | Info — se crea con `/docs`                              |
| Branch diverge de main      | P2        | Advertir, sugerir merge/rebase                          |
| Git no inicializado         | P1        | Sugerir `git init`                                      |

---

> **Internal (agent-only):** Para routing de agentes y skills, consultar:
>
> - `.agent/registry/views/REGISTRY.md` — lista completa de agents y skills
> - `.agent/CONTENTS.md` — índice completo de workflows y skills
> - `.agent/registry/registry.yaml` — SSOT del registry
>
> Estos NO se muestran al usuario. Solo referenciar internamente si se necesita.

---

_TimeKast Factory — Session Initialization v2_
