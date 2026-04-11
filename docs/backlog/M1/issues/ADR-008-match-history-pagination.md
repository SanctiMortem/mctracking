# ADR-008: Match History Pagination — Cursor vs Offset

> **Issue ID:** ADR-008
> **Priority:** P2
> **Effort:** XS
> **Story Points:** 1
> **Status:** ✅ Done
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Decidir la estrategia de paginación para `GET /matches` (historial). Las dos opciones son offset-based (simple, ya esbozado en 08_API_CONTRACTS.md con `limit`/`offset`) o cursor-based (más robusto para listas en tiempo real con inserciones frecuentes). La decisión afecta HIST-001 y la forma en que la UI maneja el scroll infinito.

## Pregunta

> **¿Debería `GET /matches` usar paginación por offset (`limit` + `offset`) o por cursor (`cursor` + `limit`)?**

**Open Question original:** OQ-02 en 08_API_CONTRACTS.md — "¿Paginación en `/matches` (historial) es por cursor o por offset?"

---

## 📎 Doc References

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /matches | [08_API_CONTRACTS.md#get-matches](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-MATCH-07 (in_progress excluido) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Opciones

### Opción A — Offset pagination (recomendada para MVP)

```typescript
// Query params: ?limit=20&offset=0
GET /matches?limit=20&offset=40  // página 3

// Response
{
  success: true,
  data: {
    matches: Match[],
    total: number,      // total de matches (para calcular páginas)
    limit: number,
    offset: number,
    has_more: boolean
  }
}
```

**Pros:**
- Ya esbozado en 08_API_CONTRACTS.md — mínimo cambio
- Simple de implementar con Drizzle `.limit().offset()`
- La UI de historial no tiene inserciones en tiempo real (los matches se cierran, no se crean durante el scroll)
- Total de matches es manejable en MVP (usuarios personales tienen < 500 matches)

**Contras:**
- Drift si se insertan matches mientras se pagina (improbable: historial solo muestra completed/abandoned)

### Opción B — Cursor pagination

```typescript
// Query params: ?limit=20&cursor=<opaque_cursor>
// cursor = base64(match.ended_at + match.id)

// Response
{
  success: true,
  data: {
    matches: Match[],
    next_cursor: string | null,  // null = no hay más
    has_more: boolean
  }
}
```

**Pros:**
- Estable ante inserciones — no hay drift de páginas
- Mejor para infinite scroll sin "saltos"

**Contras:**
- No permite saber el total ni navegar a una página específica
- Más complejo de implementar
- Innecesario para MVP: el historial es append-only (matches no se insertan durante el scroll del historial)

---

## 🎯 Recomendación

**Opción A — Offset pagination**

Razón: El historial es append-only y completamente estático durante el scroll (no hay nuevos matches creados mientras el usuario navega). El drift de offset es teóricamente posible pero irrelevante en práctica. La simplicidad de implementación tiene prioridad en MVP. Si en Fase 2 se añaden filtros complejos o más de 1000 matches, migrar a cursor.

---

## ✅ Criterios de Aceptación

- [x] Decisión documentada en esta ADR con la opción elegida
- [x] HIST-001 implementa la opción elegida
- [x] Schema de respuesta documentado en Implementation Evidence

## 🧪 Tests Requeridos

- [ ] Ningún test adicional — la ADR informa la implementación

---

## SK Leverage

No aplica.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | **Opción A — Offset pagination** (`limit` + `offset`) | El historial es append-only y estático durante el scroll (no se insertan nuevos matches mientras el usuario navega). El drift de offset es teóricamente posible pero irrelevante en práctica. La implementación con Drizzle `.limit().offset()` es trivial. MVP prioriza simplicidad. Migrar a cursor si en Fase 2 el volumen supera 1000 matches o se requieren filtros complejos en tiempo real. |

### Schema de Respuesta (GET /matches)

```typescript
// Query params
GET /matches?limit=20&offset=0&player_id=...

// Response
{
  success: true,
  data: {
    matches: Match[],
    total: number,       // total de matches (para calcular páginas en UI)
    limit: number,
    offset: number,
    has_more: boolean    // offset + limit < total
  }
}
```

**OQ-02 resuelto:** Paginación por offset. Documentado en `08_API_CONTRACTS.md` (ya correcto).

### Impacto en issues dependientes

- **HIST-001** — implementar `GET /matches` usando `limit`/`offset` (Drizzle `.limit().offset()`)
- **HIST-002** — UI de historial puede mostrar indicador de total + botón "Load more" o scroll infinito con offset incremental

---

## Commits

_Ninguno — ADR puro, sin cambios de código._

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
