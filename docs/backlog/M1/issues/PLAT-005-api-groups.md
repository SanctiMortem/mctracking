# PLAT-005: API — Groups CRUD (create, invite, join)

> **Issue ID:** PLAT-005
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar los 4 endpoints de Groups: `GET /groups` (listar grupos del usuario), `POST /groups` (crear grupo + membership owner), `POST /groups/:id/invite` (generar/regenerar invite link), y `POST /groups/join` (unirse por invite code). Implementa el sistema de Friend Groups (FT-017).

## User Story

> Como **P-004** (Group Owner), quiero **crear un grupo e invitar a mis amigos** para **tener una base de datos compartida de jugadores, decks y partidas**.

**Implementa:** US-038, US-039, US-040

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | POST /groups, invite, join | [08_API_CONTRACTS.md#groups](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-GROUP-01, BR-GROUP-02, BR-GROUP-04, BR-GROUP-05 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-038, US-039, US-040 | [04_USER_STORIES.md#us-038](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

**GET /groups:**
- [ ] Retorna todos los grupos donde el usuario autenticado es owner o member
- [ ] Response: `{ success: true, data: Array<{ group: Group, role: 'owner' | 'member' }> }`
- [ ] Grupos archivados (`archived_at IS NOT NULL`) excluidos por defecto
- [ ] Ordena por `created_at DESC`

**POST /groups:**
- [ ] Crea `Group` con `owner_id = auth.userId`
- [ ] Crea `GroupMembership(role='owner')` para el creador
- [ ] Genera `invite_code` único + `invite_expires_at = NOW() + 7 days` (BR-GROUP-05)
- [ ] Un usuario puede pertenecer a múltiples grupos (BR-GROUP-01)

**POST /groups/:id/invite:**
- [ ] Solo accesible para el Group Owner (403 si es member — BR-GROUP-04)
- [ ] Si el invite_code existe y no expiró: retornarlo tal cual
- [ ] Si expiró o se solicita regenerar: invalidar el anterior + generar nuevo con nueva expiración (BR-GROUP-05)
- [ ] Retorna el invite_code y invite_expires_at

**PATCH /groups/:id (archive):**
- [ ] Solo accesible para el Group Owner (403 si es member)
- [ ] Setea `archived_at = NOW()` en el grupo (BR-GROUP-04 — archivar, no eliminar)
- [ ] Grupos archivados excluidos de `GET /groups` por defecto
- [ ] Retorna `{ success: true, data: { group: Group } }` con `archived_at` seteado

**POST /groups/join:**
- [ ] Input: `{ invite_code: string }`
- [ ] Valida que el invite_code exista y no haya expirado (BR-GROUP-05)
- [ ] Si el usuario ya es miembro: retornar 409 CONFLICT
- [ ] Crea `GroupMembership(role='member')`
- [ ] Retorna el grupo + la membership creada (BR-GROUP-02)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear grupo
  Dado que soy un usuario autenticado
  Cuando llamo POST /groups con name="Los Comandantes"
  Entonces se crea el grupo con owner_id=mi user_id
  Y se crea GroupMembership(role='owner')
  Y invite_code y invite_expires_at están presentes en la respuesta

Escenario: Unirse por invite code válido
  Dado que tengo el invite_code "abc123" del grupo "Los Comandantes"
  Cuando llamo POST /groups/join con invite_code="abc123"
  Entonces se crea GroupMembership(role='member')
  Y puedo acceder al historial del grupo

Escenario: Invite code expirado
  Dado que el invite_code "abc123" expiró hace 2 días
  Cuando llamo POST /groups/join con ese code
  Entonces recibo 409 con error="GROUP_INVITE_EXPIRED" (BR-GROUP-05)

Escenario: Miembro no puede generar invite
  Dado que soy miembro (no owner) del grupo
  Cuando llamo POST /groups/:id/invite
  Entonces recibo 403 FORBIDDEN (BR-GROUP-04)
```

## 🔧 Contexto Técnico

**Rutas:**
- `app/api/groups+api.ts` — GET /groups (list), POST /groups (create)
- `app/api/groups/[id]+api.ts` — PATCH /groups/:id (archive)
- `app/api/groups/[id]/invite+api.ts` — POST invite
- `app/api/groups/join+api.ts` — POST join

**Invite code generation:**
```typescript
import { randomBytes } from 'crypto';

function generateInviteCode(): string {
  return randomBytes(6).toString('base64url');  // ~8 chars URL-safe
}
```

**Join validation:**
```typescript
const group = await db.query.groups.findFirst({
  where: eq(groups.invite_code, invite_code)
});
if (!group) throw new HTTPException(404);
if (group.invite_expires_at < new Date()) {
  throw new HTTPException(409, { message: 'GROUP_INVITE_EXPIRED' });
}
// Check ya miembro
const existing = await db.query.group_members.findFirst({
  where: and(eq(group_members.group_id, group.id), eq(group_members.user_id, auth.userId))
});
if (existing) throw new HTTPException(409, { message: 'ALREADY_A_MEMBER' });
```

**Dependencias de Issues:**
- Bloqueado por: PLAT-001 (groups schema)
- Bloquea a: PLAT-006

---

## ⚠️ Edge Cases

- `invite_expires_at = null`: si el owner no quiere expiración (no en MVP — default siempre 7 días)
- Un usuario puede ser owner de un grupo Y member de otro (BR-GROUP-01)
- `POST /groups` duplica nombre: permitido — dos grupos pueden tener el mismo nombre (diferente owner_id)

## 🧪 Tests Requeridos

- [ ] Integration: GET /groups retorna grupos donde el usuario es owner o member
- [ ] Integration: GET /groups excluye grupos archivados por defecto
- [ ] Integration: crear grupo + verificar membership owner
- [ ] Integration: PATCH /groups/:id archiva grupo (owner) → archived_at seteado
- [ ] Integration: PATCH /groups/:id por miembro retorna 403
- [ ] Integration: join con código válido crea membership member
- [ ] Integration: join con código expirado retorna GROUP_INVITE_EXPIRED
- [ ] Integration: join duplicado retorna ALREADY_A_MEMBER
- [ ] Integration: member no puede generar invite (403)

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
