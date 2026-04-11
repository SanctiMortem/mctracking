# Context Check (reusable block)

> **Propósito:** Evaluar el estado del contexto de la conversación.
> **Uso:** Se carga con `cat` desde Phase 0 de cualquier workflow.
> **El enforcement (parar o no) lo decide el paso que lo llama, no este bloque.**

---

## Instrucciones para el agente

Genera la siguiente tabla completando los valores. Es una autoevaluación basada en la longitud de la conversación y el contenido cargado:

```markdown
## 📊 Context Status

| Metric            | Value        | Status   |
| ----------------- | ------------ | -------- |
| Conversación      | [N] mensajes | 🟢/🟡/🔴 |
| Contexto estimado | [X]%         | 🟢/🟡/🔴 |

**Workflow:** [nombre del workflow que lo llamó]
**Timestamp:** [fecha-hora actual]
```

## Clasificación

| Contexto | Status | Significado                            |
| -------- | ------ | -------------------------------------- |
| < 30%    | 🟢     | Contexto saludable                     |
| 30-50%   | 🟡     | Precaución — calidad puede degradarse  |
| > 50%    | 🔴     | Contexto degradado — riesgo de errores |

## Indicadores para estimar el %

- Cantidad de mensajes en la conversación (cada mensaje ~1-2%)
- Cantidad de archivos cargados con `cat` (cada uno ~1-3%)
- Cantidad de tool calls ejecutados (cada uno ~0.5-1%)
- Longitud de los outputs de comandos recibidos

> ⚠️ **Esto es una autoevaluación, no una medición exacta de tokens.** El valor está en la **tendencia** (0% → 20% → 40%), no en la precisión del número.

## Acción por status

| Status | Acción                                        |
| ------ | --------------------------------------------- |
| 🟢     | Continuar                                     |
| 🟡     | Precaución — calidad puede degradarse         |
| 🔴     | ⚠️ Abrir nuevo chat → `/init` → continuar ahí |

## Override (para callers)

El caller puede **escalar** el status (tratar 🟡 como 🔴), nunca bajarlo.

Ejemplo en un `context.md` de workflow:

```markdown
// turbo
cat ./.agent/workflows/\_shared/context-check.md

**Enforcement:**

- 🟢 → Continuar a §0.2
- 🟡/🔴 → STOP. `notify_user` con `BlockedOnUser: true`
```

> 🔴 **SIEMPRE generar esta tabla. NUNCA omitirla.**
> El paso que llama este bloque decidirá la acción basada en el status.

---

_Context Check — Reusable Block (shared)_
