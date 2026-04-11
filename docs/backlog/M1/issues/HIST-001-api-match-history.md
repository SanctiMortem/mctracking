# HIST-001: API — Match History (GET /matches + filters)

> **Issue ID:** HIST-001
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el endpoint `GET /matches` para el historial con soporte de filtros completos (jugador, deck, commander, fecha, resultado, win_condition) y paginación por offset (ADR-008). Este endpoint es la fuente de datos para SCR-005 (historial) y para el banner de match activo en Home.

## User Story

> Como **P-002** (usuario autenticado), quiero **obtener el historial de mis matches con filtros** para **revisar partidas específicas**.

**Implementa:** US-019, US-020

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /matches | [08_API_CONTRACTS.md#get-matches](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-MATCH-07 (excluir in_progress) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-STATS-08 (filtros) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-MATCH-06 (abandoned en historial pero no en stats) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| ADR | ADR-008 (paginación offset) | [ADR-008-match-history-pagination.md](./ADR-008-match-history-pagination.md) |

---

## ✅ Criterios de Aceptación

- [ ] `GET /matches` retorna matches del usuario (personal) o del `group_id` especificado
- [ ] Excluye matches `in_progress` (BR-MATCH-07)
- [ ] Incluye matches `abandoned` (marcados pero no en stats)
- [ ] Filtros soportados: `player_id`, `deck_id`, `commander_id`, `result`, `win_condition`, `date_from`, `date_to`, `group_id`
- [ ] Paginación offset: `limit` (default 20), `offset` (default 0) + respuesta con `total` y `has_more`
- [ ] Ordenado por `ended_at` DESC (más reciente primero)
- [ ] Cada match en la respuesta incluye: participations con player + deck + commander, result, winner

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Historial básico sin filtros
  Dado que tengo 8 matches completed y 2 abandoned
  Cuando llamo GET /matches?limit=20&offset=0
  Entonces recibo 10 matches ordenados por fecha DESC
  Y los matches in_progress están excluidos (BR-MATCH-07)

Escenario: Filtrar por jugador
  Dado que tengo 10 matches, 6 con el jugador "Ana" (player_id=uuid-ana)
  Cuando llamo GET /matches?player_id=uuid-ana
  Entonces recibo exactamente 6 matches donde participó Ana

Escenario: Filtrar por resultado "win" + jugador
  Dado que Carlos ganó 4 de sus 10 matches
  Cuando llamo GET /matches?player_id=uuid-carlos&result=win
  Entonces recibo 4 matches donde Carlos fue el ganador

Escenario: Paginación
  Dado que tengo 25 matches completed
  Cuando llamo GET /matches?limit=20&offset=0
  Entonces recibo 20 matches con has_more=true
  Cuando llamo GET /matches?limit=20&offset=20
  Entonces recibo 5 matches con has_more=false
```

## 🔧 Contexto Técnico

**Ruta:** `app/api/matches+api.ts` (GET handler adicional al POST existente de MATCH-002)

**Response shape:**
```typescript
{
  success: true,
  data: {
    matches: Array<{
      match: Match,
      participations: Array<Participation & {
        player: Player,
        deck: Deck,
        commander: Commander,
        commander2?: Commander
      }>,
      result?: MatchResult
    }>,
    total: number,
    limit: number,
    offset: number,
    has_more: boolean
  }
}
```

**Query Drizzle:**
```typescript
// WHERE conditions dinámicas según filtros presentes
const conditions = [ne(matches.status, 'in_progress')];
if (player_id) conditions.push(/* JOIN participations WHERE player_id = */);
if (result === 'win') conditions.push(/* winner check */);
if (date_from) conditions.push(gte(matches.ended_at, date_from));
// etc.

const [data, countResult] = await Promise.all([
  db.select().from(matches)
    .where(and(...conditions))
    .orderBy(desc(matches.ended_at))
    .limit(limit).offset(offset),
  db.select({ count: count() }).from(matches).where(and(...conditions))
]);
```

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 (schema), MATCH-003 (close match para tener datos), ADR-008 (confirma offset)
- Bloquea a: HIST-002, HIST-003

---

## ⚠️ Edge Cases

- Si player_id y group_id se especifican juntos: validar que el player pertenece al grupo (FORBIDDEN si no)
- `commander_id` filter: un match puede tener el commander como secondary (partner) — incluir ambos casos
- Si todos los matches son `in_progress`: responder con array vacío + `total=0`

## 🧪 Tests Requeridos

- [ ] Integration: cada filtro funciona correctamente en aislamiento
- [ ] Integration: filtros combinados (player_id + result + date range)
- [ ] Integration: paginación devuelve `has_more=true/false` correctamente
- [ ] Integration: matches `in_progress` nunca aparecen en la respuesta

## 🚫 Out of Scope

- Cursor pagination → decidido en ADR-008 que no aplica en MVP
- Filtro por tags/notas → Fase 2

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
