# Phase 5: Quality Check (Evaluate Evidence)

> **Carga:** Automática después de Phase 4.
> **Propósito:** Evaluar evidencia de Phase 4 contra el contrato del issue.
> **Output:** 🧪 QC Report (MANDATORY)
>
> 🔴 **Phase 5 no re-ejecuta validaciones.** Evalúa lo que Phase 4 ya corrió.

---

## 6 Core Checks (SIEMPRE)

### Check 1: Issue Compliance (AC) — 🤖 Agent evaluates

Para cada Acceptance Criteria del issue:

```markdown
| AC  | Description  | Covered | Evidence    |
| --- | ------------ | ------- | ----------- |
| 1   | [from issue] | ✅/🔴   | file.ts:L45 |
| 2   | [from issue] | ✅/🔴   | test.ts:L12 |
```

**Verdict:** ✅ All covered / 🔴 Missing AC#

---

### Check 2: Tests Exist — 🤖 Automated (file check)

// turbo

```bash
git diff --name-only | grep -E "\\.test\\.(ts|tsx)$" || echo "⚠️ No test files in changes"
```

**Rules:**

- Nuevo endpoint/action → DEBE tener test
- Nuevo componente → Al menos smoke test
- Bug fix → Test de regresión
- **Docs/Workflow changes → N/A**

---

### Check 3: Lint/Types — 🤖 Automated (from Phase 4 evidence)

> Usa resultados de Phase 4.2. No re-ejecutar aquí.

---

### Check 4: Duplication — 👤 Human judgment (INVENTORY as reference)

// turbo

```bash
head -30 ./docs/reference/INVENTORY.md 2>/dev/null || echo "No INVENTORY.md"
```

**Agente verifica:**

- ¿Componente similar ya existe?
- ¿Hook duplicado?
- ¿Server action duplicada?

> **Si duplicación detectada:** 🛑 STOP — Confirmar intencional

---

### Check 5: Scope Creep — 👤 Human judgment (AC + Out of Scope comparison)

Comparar cambios vs AC del issue + Out of Scope del plan:

- ¿Implementó features no solicitadas?
- ¿Agregó dependencias no necesarias?
- ¿Refactorizó código fuera de scope?

> **Si scope creep:** 🛑 STOP — Reportar y confirmar

---

### Check 6: JSDoc — 🤖 Semi-auto (exports without JSDoc = warning)

// turbo

```bash
for file in $(git diff --name-only | grep -E "\.(ts|tsx)$" 2>/dev/null); do
  if [ -f "$file" ]; then
    EXPORTS=$(grep -c "^export" "$file" 2>/dev/null || echo 0)
    JSDOCS=$(grep -c "^\s*/\*\*" "$file" 2>/dev/null || echo 0)
    echo "  $file: $EXPORTS exports, $JSDOCS JSDoc blocks"
  fi
done || echo "No TS files in changes"
```

**Rules:**

- Funciones exportadas → DEBEN tener JSDoc
- Types/Interfaces exportadas → DEBEN tener JSDoc
- **Workflow/Docs → N/A**

---

## 2 Conditional Checks (SOLO SI APLICA)

### Breaking Changes (if lib/ or types/ modified) — 🤖 Automated

```bash
git diff lib/ types/ 2>/dev/null | grep -E "^[-+]export" || echo "N/A"
```

> **Si breaking change:** 🛑 STOP — Documentar migración

---

### Migration Check (if schema/ modified) — 🤖 Automated

```bash
if git diff --name-only | grep -q "lib/db/schema"; then
  echo "⚠️ Schema changed - checking for migration..."
  ls -la lib/db/migrations/*.sql 2>/dev/null | tail -3 || echo "No migrations found"
fi
```

---

## Output: QC Report (MANDATORY)

> 🔴 **El agente DEBE mostrar este bloque ANTES de CHECKPOINT 2**

```markdown
## 🧪 QC Report: {ISSUE_ID}

| #   | Check                 | Type     | Status    | Evidence                     |
| --- | --------------------- | -------- | --------- | ---------------------------- |
| 1   | Issue Compliance (AC) | 🤖 Auto  | ✅/🔴     | [AC refs]                    |
| 2   | Tests Exist           | 🤖 Auto  | ✅/⚠️/N/A | [test files or N/A for docs] |
| 3   | Lint/Types            | 🤖 Auto  | ✅        | Phase 4 evidence             |
| 4   | Duplication           | 👤 Human | ✅/🛑     | checked vs INVENTORY         |
| 5   | Scope Creep           | 👤 Human | ✅/🛑     | matches issue scope          |
| 6   | JSDoc                 | 🤖 Semi  | ✅/🟡/N/A | [status]                     |

### Conditional (only if applies):

| Breaking Changes | 🤖 Auto | ✅/🛑/N/A | [if touched lib/ or types/] |
| Migration | 🤖 Auto | ✅/🛑/N/A | [if touched schema/] |

**Verdict:** ✅ PASS / 🛑 NEEDS CONFIRM / 🔴 FAIL
```

---

## Output: File Summary (MANDATORY)

// turbo

```bash
echo "📂 Archivos en este issue:"
echo ""
echo "| Tipo | Archivo |"
echo "| ---- | ------- |"
for f in $(git diff --diff-filter=A --name-only 2>/dev/null); do
  echo "| 🆕 | \`$f\` |"
done
for f in $(git diff --diff-filter=M --name-only 2>/dev/null); do
  echo "| ✏️ | \`$f\` |"
done
for f in $(git diff --diff-filter=D --name-only 2>/dev/null); do
  echo "| 🗑️ | \`$f\` |"
done
NEW_DEPS=$(git diff package.json 2>/dev/null | grep "^+" | grep -E '"[^"]+":\s' | grep -v "^+++" | sed 's/^+//' | sed 's/[",]//g' | awk '{print $1, $2}')
if [ -n "$NEW_DEPS" ]; then
  echo "$NEW_DEPS" | while read name version; do
    echo "| 📦 | \`$name $version\` (new dep) |"
  done
fi
echo ""
```

---

## Stop Conditions

| Condition | Action                             |
| --------- | ---------------------------------- |
| 🔴 FAIL   | NO continuar a Close — Fix primero |
| 🛑 STOP   | Esperar confirmación del usuario   |
| ✅ PASS   | Continuar a Close                  |

---

_QC Complete → Continuar a CHECKPOINT 2 con QC Report visible_
