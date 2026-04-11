# MATCH-002: API — POST /api/matches (crear match)

> **Issue ID:** MATCH-002
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/api`, `domains/db`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar `POST /api/matches`: crea un Match con status `in_progress` y las Participations correspondientes (2-4 jugadores, cada uno con su deck). Incluye todas las validaciones de negocio: no repetir decks, no poner un deck en dos matches activos simultáneamente, y que todos los jugadores/decks pertenezcan al usuario autenticado.

## User Story

> Como **P-002** (usuario autenticado), quiero **iniciar una partida seleccionando jugadores y decks** para **comenzar el tracking en vivo**.

**Implementa:** US-010, US-011, US-012

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | POST /api/matches | [08_API_CONTRACTS.md#post-apimatches](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-MATCH-01 (2-4 players) | [05_BUSINESS_RULES.md#br-match-01](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-DECK-01 (no deck duplicado) | [05_BUSINESS_RULES.md#br-deck-01](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-010, US-011, US-012 | [04_USER_STORIES.md#us-010](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `POST /api/matches` acepta array de `{ player_id, deck_id }` (2-4 elementos)
- [ ] Retorna `400` si hay menos de 2 o más de 4 participantes
- [ ] Retorna `400` si un mismo `deck_id` aparece más de una vez en el request
- [ ] Retorna `400` si algún deck ya está en otro match con status `in_progress`
- [ ] Crea Match (status: `in_progress`) + N Participations en una transacción
- [ ] Participations inicializan `life_total = 40`, `poison_counters = 0`, `commander_damage = {}`
- [ ] Retorna el match creado con sus participations embebidas
- [ ] `401` sin JWT, `403` si player/deck no pertenece al usuario

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear match con 4 jugadores exitosamente
  Dado que tengo 4 players y 4 decks sin match activo
  Cuando hago POST /api/matches con los 4 pares player_id/deck_id
  Entonces retorna 201 con el match y 4 participations con life_total=40

Escenario: Deck ya en match activo
  Dado que el deck "Superfriends" está en un match in_progress
  Cuando intento crear un nuevo match que incluye "Superfriends"
  Entonces retorna 400 "Deck is already in an active match"

Escenario: Menos de 2 participantes
  Cuando hago POST /api/matches con solo 1 par player/deck
  Entonces retorna 400 "Match requires 2-4 participants"
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/api/matches+api.ts` — POST handler
- `services/matches.ts` — createMatch (con transacción Drizzle)

**API Contract:**
```typescript
type CreateMatchInput = {
  participants: Array<{ player_id: string; deck_id: string }>;
};
type CreateMatchResponse = {
  id: string;
  status: 'in_progress';
  participations: Participation[];
  created_at: string;
};
// Errors: 400 VALIDATION_ERROR, 400 DECK_CONFLICT, 401, 403
```

**Transacción:**
```typescript
await db.transaction(async (tx) => {
  const match = await tx.insert(matches).values({ createdBy: userId }).returning();
  await tx.insert(participations).values(participants.map(p => ({
    matchId: match.id, playerId: p.player_id, deckId: p.deck_id,
    lifeTotal: 40, poisonCounters: 0, commanderDamage: {},
  })));
});
```

**Dependencias de Issues:**
- Bloqueado por: MATCH-001
- Bloquea a: MATCH-005 (Match Setup UI)

## ⚠️ Edge Cases

- La verificación de "deck en match activo" requiere un JOIN con participations + matches — hacer en la misma transacción para evitar race conditions
- Si la transacción falla a mitad, no quedan participations huérfanas

## 🧪 Tests Requeridos

- [ ] Unit: `services/matches.ts` — createMatch con deck duplicado falla
- [ ] Integration: POST retorna 400 para deck en match activo

## 🚫 Out of Scope

- Lógica del tracker → EPIC-03
- Modificar participations post-creación → TRACK-002

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
