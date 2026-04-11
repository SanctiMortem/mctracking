# SETUP-003: Configure Drizzle ORM + Neon connection

> **Issue ID:** SETUP-003
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/db`
> **Agents:** `database-architect`, `data-modeler-drizzle`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Configurar Drizzle ORM con el driver de Neon Serverless para que las Expo API Routes puedan conectarse a la base de datos PostgreSQL. Este issue incluye: instalar y configurar `drizzle-orm` + `@neondatabase/serverless`, crear el módulo de conexión `services/db.ts`, configurar `drizzle.config.ts` para migraciones, y crear la primera migración vacía que confirma que el pipeline funciona.

No se crea schema de dominio aquí — ese trabajo va en DATA-001 (EPIC-01). Este issue solo valida que la infraestructura de DB funciona end-to-end.

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **Drizzle ORM conectado a Neon** para **que las API Routes del proyecto puedan hacer queries type-safe a PostgreSQL sin exponer credenciales al cliente**.

**Implementa:** — (Infraestructura DB, §7 Architecture ADR-002)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| ARCHITECTURE | ADR-002 Neon + Drizzle | [07_ARCHITECTURE.md#adr-002](../../planning/07_ARCHITECTURE.md) |
| ARCHITECTURE | ADR-003 Expo API Routes + Hono | [07_ARCHITECTURE.md#adr-003](../../planning/07_ARCHITECTURE.md) |
| DISCOVERY | §5 Infrastructure | [00_DISCOVERY_BRIEF.md#§5-infrastructure](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Criterios de Aceptación

- [ ] `services/db.ts` exporta una instancia de Drizzle conectada a Neon
- [ ] `drizzle.config.ts` configurado para migraciones con output en `drizzle/`
- [ ] `pnpm db:generate` ejecuta sin errores (schema vacío)
- [ ] `pnpm db:migrate` aplica migraciones a Neon sin errores
- [ ] API Route de prueba (`app/api/health.ts`) responde `{ ok: true, db: "connected" }` tras hacer un query simple
- [ ] `DATABASE_URL` solo accesible desde API Routes (nunca en componentes cliente)
- [ ] Scripts `db:generate` y `db:migrate` definidos en `package.json`

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Conexión a Neon exitosa
  Dado que `DATABASE_URL` está configurado en `.env.local`
  Y `services/db.ts` está correctamente configurado
  Cuando llamo `GET /api/health` desde la app
  Entonces la respuesta es `{ ok: true, db: "connected" }`
  Y el query de ping a Neon responde en menos de 2 segundos

Escenario: Migraciones funcionan correctamente
  Dado que `drizzle.config.ts` apunta al schema correcto
  Cuando ejecuto `pnpm db:migrate`
  Entonces las migraciones se aplican a la base de datos en Neon
  Y `drizzle_migrations` table registra la migración

Escenario: DATABASE_URL no se expone al cliente
  Dado que `services/db.ts` importa desde `constants/env.ts`
  Cuando el bundle de React Native se compila
  Entonces `DATABASE_URL` no aparece en el bundle del cliente
  Y el import de `services/db.ts` solo funciona en contexto de servidor (API Routes)
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `services/db.ts` — Instancia de Drizzle + cliente Neon
- `drizzle.config.ts` — Configuración de migraciones
- `drizzle/` — Directorio de migraciones (gitignored excepto los `.sql` generados)
- `app/api/health.ts` — API Route de prueba de conexión
- `package.json` — Scripts `db:generate` y `db:migrate`

**`services/db.ts` pattern:**
```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from '@/constants/env';

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql);
```

**`drizzle.config.ts`:**
```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './db/schema.ts',  // se crea en DATA-001
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Scripts en `package.json`:**
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-001, SETUP-002
- Bloquea a: DATA-001 (schema), todos los issues de API de EPIC-01+

## ⚠️ Edge Cases

- Neon serverless necesita `neon-http` driver (no `pg`) para funcionar en edge/serverless — usar `drizzle-orm/neon-http`
- En iOS simulator, las llamadas a Neon pasan por la red local del Mac — asegurarse de que el Mac tiene internet al testear
- `drizzle/` directory debe incluirse en git (los `.sql` de migraciones son código), pero no `.env.local`

## 🧪 Tests Requeridos

- [ ] Integration: `GET /api/health` retorna `{ ok: true }` con DB real de Neon
- [ ] Manual: `pnpm db:generate` + `pnpm db:migrate` ejecutan sin errores en shell

## 🚫 Out of Scope

- Crear schema de dominio (Commander, Player, etc.) → DATA-001
- Row Level Security (RLS) con Clerk → DATA-001
- Transacciones o queries de dominio

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto).

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
