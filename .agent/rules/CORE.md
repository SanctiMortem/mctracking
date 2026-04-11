---
trigger: always_on
---

# CORE — TimeKast Factory Rules

> Reglas operativas del sistema. Siempre activas, máxima prioridad.
> Un solo archivo = menos contexto, más señal.

---

## 1. Agent Protocol

> **OBLIGATORIO antes de cualquier respuesta con código o diseño.**

1. **Detectar dominio** del request (keywords EN/ES)
2. **Matchear** contra `registry.yaml` §agents → `keywords_any` + `keywords_es`
3. **Cargar** el agent `.md` + skills del frontmatter
4. **Anunciar** antes de responder:

```markdown
🤖 Aplicando conocimiento de `@{agent-name}`...
🧰 Skills: `{skill-1}`, `{skill-2}`
```

**Reglas:**

- Scoring completo definido en `registry.yaml` §routing_policy (SSOT)
- Algoritmo de selección en skill `intelligent-routing`
- Si el usuario menciona `@agent` explícitamente → usarlo
- Si la tarea es multi-dominio → `orchestrator` o max 2 agents
- Máx 3 agents, máx 5 skills por tarea
- Leer agent → Entender principios → Aplicar → Codear. Nunca saltar pasos.

---

## 2. Request Classifier

**Antes de actuar, clasificar:**

| Tipo              | Triggers                                  | Acción                                    |
| ----------------- | ----------------------------------------- | ----------------------------------------- |
| **PREGUNTA**      | "qué es", "cómo funciona", "explica"      | Respuesta directa, agent si es técnica    |
| **SURVEY/INTEL**  | "analiza", "lista archivos", "overview"   | Explorar + responder, agent según dominio |
| **CODE SIMPLE**   | "fix", "agrega", "cambia" (1 archivo)     | Editar inline con agent                   |
| **CODE COMPLEJO** | "build", "crea", "implementa", "refactor" | Plan obligatorio + agent                  |
| **DESIGN/UI**     | "diseña", "UI", "página", "dashboard"     | Plan obligatorio + agent de diseño        |
| **SLASH CMD**     | /workflow                                 | Ejecutar workflow correspondiente         |

---

## 3. Pre-Flight Check

> **OBLIGATORIO para requests complejos, features nuevas, o ambigüedad.**

| Tipo de Request         | Estrategia     | Acción                                                                  |
| ----------------------- | -------------- | ----------------------------------------------------------------------- |
| **Feature / Build**     | Deep Discovery | Preguntar mínimo 3 preguntas estratégicas                               |
| **Code Edit / Bug Fix** | Context Check  | Confirmar entendimiento + preguntar sobre impacto                       |
| **Vago / Simple**       | Clarificación  | Preguntar propósito, usuarios afectados, alcance                        |
| **Orquestación**        | Gatekeeper     | **STOP** — no invocar subagentes hasta que el usuario confirme el plan  |
| **"Procede" directo**   | Trust          | Proceder. Solo preguntar si hay un riesgo genuino que el usuario no vio |

**Protocolo:**

1. Si falta información crítica o hay riesgo real → PREGUNTAR
2. Si el usuario da una lista de respuestas → no saltar el gate, preguntar sobre trade-offs o edge cases
3. NO escribir código ni invocar tools hasta que el usuario apruebe
4. Detalle completo en skill `brainstorming`

---

## 4. Jerarquía de Autoridad

> En caso de conflicto, el nivel superior manda.

| Nivel | Documento                | Propósito                                 |
| ----- | ------------------------ | ----------------------------------------- |
| 1     | `rules/CORE.md`          | Reglas operativas (este archivo)          |
| 2     | `registry/registry.yaml` | SSOT de agents, skills, combos, fallbacks |
| 3     | `skills/domains/*`       | Reglas por stack (ui, db, api, security)  |
| 4     | `skills/roles/*`         | Comportamientos por flujo                 |
| 5     | `workflows/*`            | Flujos de trabajo ejecutables             |
| 6     | `docs/planning/*`        | Documentación del proyecto                |
| 7     | `docs/backlog/*`         | Issues y epics                            |

### Prioridad de Skills

| Tier | Path       | SSOT Para            | Prioridad |
| ---- | ---------- | -------------------- | --------- |
| P1   | `domains/` | CÓMO en ESTE stack   | Mayor     |
| P2   | `roles/`   | QUÉ hacer, CUÁNDO    | Media     |
| P3   | (kit root) | POR QUÉ (principios) | Menor     |

> `domains/` son la autoridad técnica del stack. Si `domains/ui/` dice "usar clases de Tailwind"
> y un role o kit skill sugiere otra práctica → `domains/ui/` GANA.
> Skills project-specific en `domains/` también son P1.

### SSOT Chain

```
Discovery → Proposal → Docs → Design → Backlog → Code
```

| Fase      | Documento                             | SSOT para                |
| --------- | ------------------------------------- | ------------------------ |
| Discovery | `docs/planning/00_DISCOVERY_BRIEF.md` | Requisitos, scope        |
| Proposal  | `docs/planning/01_PROPOSAL.md`        | Oferta al cliente        |
| Docs      | `docs/planning/02-14_*.md`            | Personas, US, BR, Data   |
| Design    | `docs/planning/15_DESIGN.md`          | Pantallas, flujos, comps |
| Backlog   | `docs/backlog/*/issues/*.md`          | Issues ejecutables       |
| Code      | `lib/db/schema/*.ts`                  | Schema de DB             |

> **Skills y workflows NUNCA redefinen reglas.** Solo ejecutan lo que dicen las rules.

---

## 5. Hard Limits

> ⚠️ **Violación de cualquiera = fallo crítico.**

### 5.1 🔴 NUNCA ejecutar db:push sin consentimiento

```
⭐ PREFERIDO: pnpm db:generate → pnpm db:migrate (seguro, reversible)
❌ PROHIBIDO: pnpm db:push sin aprobación
✅ SI es necesario: mostrar --dry-run → ESPERAR confirmación
```

### 5.2 🔴 NUNCA hacer merge a main sin autorización

```
❌ PROHIBIDO: git merge/push a main sin confirmación explícita
✅ OBLIGATORIO: Mostrar qué se mergea → ESPERAR autorización → Ejecutar
```

### 5.3 🔴 NUNCA usar heredocs en terminal

```
❌ PROHIBIDO: cat << 'EOF' > file.md (cualquier variante)
✅ OBLIGATORIO: Usar write_to_file / replace_file_content tools
✅ ALTERNATIVA: echo "una línea" > file (solo 1 línea)
```

### 5.4 🔴 NUNCA ejecutar workflows de memoria

```
❌ PROHIBIDO: Ejecutar pasos de workflow sin leer el archivo
✅ OBLIGATORIO: Leer el .md principal en esta sesión con cat
✅ OBLIGATORIO: // turbo en phases = auto-ejecutable
```

### 5.5 🔴 NUNCA instalar dependencias sin autorización

```
❌ PROHIBIDO: npm install / pnpm add sin aprobación explícita del usuario
✅ OBLIGATORIO: Proponer la dependencia + justificación → ESPERAR confirmación
```

### 5.6 🔴 NUNCA modificar archivos sin cargar agente

> Aplica a TODA respuesta que use tools de edición de archivos o ejecución de código.
> Única excepción: `/init` (solo lee contexto, no modifica).

```
❌ PROHIBIDO: Editar archivos sin haber anunciado el agente activo
✅ OBLIGATORIO:
   1. Detectar dominio del request (keywords EN/ES)
   2. Matchear contra registry.yaml + project.yaml
   3. Cargar el agent .md + skills (cat/view_file)
   4. Mostrar el bloque de anuncio ANTES de cualquier tool de edición:

      🤖 Aplicando conocimiento de `@{agent-name}`...
      🧰 Skills: `{skill-1}`, `{skill-2}`

   5. Si no hay match claro → usar fallback del registry
   6. Si project.yaml define agents project-specific → incluirlos en el matching
```

---

## 6. Reglas Operativas

### 6.1 Consultar INVENTORY antes de crear

```
❌ PROHIBIDO: Crear componente/hook/action sin verificar si existe
✅ OBLIGATORIO:
   1. Consultar docs/reference/INVENTORY.md
   2. Si existe algo similar → reutilizar o extender
   3. Si es nuevo → agregarlo al inventario después de crear
```

### 6.2 NUNCA inventar schemas de DB

```
❌ PROHIBIDO: Crear tablas/columnas que no están en los docs
✅ OBLIGATORIO: Consultar docs/planning/ antes de cualquier cambio DB
```

### 6.3 NUNCA hardcodear valores

```
❌ PROHIBIDO: Valores mágicos en código (URLs, colores, tamaños, textos)
✅ OBLIGATORIO: Usar constantes, config files, o CSS variables
```

### 6.4 NUNCA marcar completo sin verificar

```
❌ PROHIBIDO: Decir "feature completa" sin verificar
✅ OBLIGATORIO: Confirmar que pre-commit pasó o ejecutar manualmente
```

### 6.5 Commits deben referenciar issues

```
✅ OBLIGATORIO: Usar ID del issue (ej: feat(auth): AUTH-001 - ...)
✅ OBLIGATORIO: Actualizar /docs si afecta comportamiento documentado
```

### 6.6 NUNCA inventar business rules

```
❌ PROHIBIDO: Asumir reglas de negocio que no están en docs/planning/
✅ OBLIGATORIO: Si algo no está documentado → preguntar al usuario
```

### 6.7 Filtros en cascada por defecto

> Aplica a tablas client-side con 2+ filtros.

```
❌ PROHIBIDO: Hardcodear opciones de filtro estáticas cuando hay 2+ filtros
✅ OBLIGATORIO: Cada filtro calcula opciones del subconjunto filtrado por los OTROS
   Solo desactivar si el issue lo especifica EXPLÍCITAMENTE
   Ver docs/reference/crud-scaffold.md § Layer 6 → Cascading Filters
```

---

## 7. File Dependency Awareness

**Antes de modificar CUALQUIER archivo:**

1. Consultar `CODEBASE.md` → File Dependencies
2. Identificar archivos dependientes
3. Actualizar TODOS los archivos afectados juntos

---

## 8. Idioma

1. **Usuario en español** → Responder en español
2. **Código, comentarios, variables** → Siempre en inglés

---

## 9. Final Checklist

**Trigger:** Cuando el usuario dice "final checks", "checklist", "auditoría" o similar.

**Usar `/audit` workflow** — selecciona nivel de review (R0-R4) según scope y riesgo.

| Herramienta      | Cuándo                   |
| ---------------- | ------------------------ |
| `pnpm lint`      | Cada cambio de código    |
| `pnpm typecheck` | Cada cambio de código    |
| `pnpm test`      | Después de cambio lógico |
| `pnpm test:e2e`  | Antes de deploy          |
| `/audit`         | Auditoría completa       |

---

## 10. Reglas de Oro

1. **Skills y workflows NUNCA redefinen reglas** — solo ejecutan lo que dicen las rules
2. **Ante la duda, escalar al usuario** — nunca asumir, siempre preguntar

---

_TimeKast Factory — Core Rules_
