# Phase 4: Implement + Gather Evidence

> **Carga:** Solo DESPUÉS de CHECKPOINT 1 aprobado.
> **Propósito:** Implementar lo del plan, ejecutar validaciones, recopilar evidencia.

---

## 4.1 Implement

**Rol:** Senior Full-Stack Engineer

> Skills y agents ya fueron cargados en Phase 1.
> No re-cargar ni re-determinar aquí.

**Acciones:**

1. Leer plan de Phase 3
2. Implementar EXACTAMENTE lo del plan
3. NO adelantar trabajo de otros issues
4. Cumplir TODOS los AC
5. Documentar desviaciones si el plan cambió

**Control de flujo:**

```bash
/pause ISSUE-XXX    # Para pausar
/park "[idea]"      # Para ideas descubiertas
```

---

## 4.2 Run Validations

> 🔴 Ejecutar TODAS las validaciones. Recopilar resultados como evidencia para Phase 5.

// turbo

```bash
pnpm typecheck
```

// turbo

```bash
pnpm lint
```

// turbo

```bash
pnpm build
```

**Si el plan incluye tests:**

// turbo

```bash
pnpm test
```

**Si hay errores:**

1. Corregir
2. Re-ejecutar validaciones
3. Repetir hasta ✅

---

## 4.3 Gather Evidence

> 📝 Recopilar artefactos para Phase 5 (QC evaluará esta evidencia).

```markdown
🔄 **Evidence Gathered:**

- Typecheck: ✅/🔴
- Lint: ✅/🔴
- Build: ✅/🔴
- Tests: ✅/🔴/N/A
- Files created: [lista]
- Files modified: [lista]
```

---

_Phase 4 Complete → Continuar a Phase 5 (QC evaluates evidence)_
