# Phase 0: Mode Detection + Context Status

> **Propósito:** Detectar modo y mostrar estado del contexto.
> **Sin carga de datos** — solo detección y status.

---

## 0.1 Context Status (MANDATORY)

> 🔴 **MANDATORY OUTPUT — NO SKIP**
>
> **EL AGENTE DEBE:**
>
> 1. Generar y mostrar este bloque ANTES de cualquier otra acción
> 2. Usar `notify_user` si el contexto es > 50%
>
> **EJEMPLO OBLIGATORIO DE OUTPUT:**

```markdown
## 📊 Context Status

| Metric            | Value        | Status   |
| ----------------- | ------------ | -------- |
| Conversación      | [N] mensajes | 🟢/🟡/🔴 |
| Archivos leídos   | [M] archivos | 🟢/🟡/🔴 |
| Contexto estimado | [X]%         | 🟢/🟡/🔴 |

**Workflow:** /docs
**Timestamp:** [fecha-hora]
```

### Thresholds

| Contexto | Status      | Acción     |
| -------- | ----------- | ---------- |
| < 30%    | 🟢 OK       | Continuar  |
| 30-50%   | 🟡 Moderate | Precaución |
| > 50%    | 🔴 HIGH     | ⚠️ WARNING |

### Si contexto > 50%

```markdown
## ⚠️ CONTEXTO ALTO DETECTADO

**Contexto estimado:** [X]% (> 50%)

**🔴 RECOMENDACIÓN: INICIAR NUEVO CHAT**

1. Commit cambios: `git add . && git commit -m "WIP: ..."`
2. Abrir nueva conversación
3. Ejecutar `/init`

**¿Deseas continuar de todas formas?** (sí/no)
```

---

## 0.2 Mode Detection

// turbo

```bash
ls docs/planning/0[2-9]_*.md docs/planning/1[0-4]_*.md 2>/dev/null && echo "✅ Docs existen" || echo "❌ No hay docs"
```

**Si docs existen, mostrar:**

```markdown
| #   | Opción        | Acción                                |
| --- | ------------- | ------------------------------------- |
| 1   | **regenerar** | Regenerar documentos completos        |
| 2   | **validar**   | Solo ejecutar validación multi-agente |
| 3   | **cancelar**  | Abortar                               |
```

**Si usuario elige 2 (validar):**

- Cargar y ejecutar SOLO la fase de validación del workflow
- Saltar generación, ir directo a CHECKPOINT 3

---

_Phase 0 Complete → Continuar a Phase 1 (Context Loading)_
