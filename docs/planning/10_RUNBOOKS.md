# 📟 Runbooks — MTG Commander Tracker

> Generado desde 07_ARCHITECTURE, 06_DATA_MODEL, 08_API_CONTRACTS por `/docs`
> **Fuente:** Discovery Brief §5, §8
> **Versión:** 1.0 — 2026-04-09

---

## Índice

1. [RB-001 — Deploy Mobile (EAS Build)](#rb-001--deploy-mobile-eas-build)
2. [RB-002 — Deploy API (Expo API Routes)](#rb-002--deploy-api-expo-api-routes)
3. [RB-003 — DB Migration (Drizzle)](#rb-003--db-migration-drizzle)
4. [RB-004 — Rollback de Migración](#rb-004--rollback-de-migración)
5. [RB-005 — Rollback de App Store](#rb-005--rollback-de-app-store)
6. [RB-006 — Rotación de Secrets](#rb-006--rotación-de-secrets)
7. [RB-007 — Incidente: API Down](#rb-007--incidente-api-down)
8. [RB-008 — Incidente: DB Connection Pool Exhausted](#rb-008--incidente-db-connection-pool-exhausted)
9. [RB-009 — Incidente: Auth Degradado](#rb-009--incidente-auth-degradado)
10. [RB-010 — Configuración de Entorno Local](#rb-010--configuración-de-entorno-local)

---

## Convenciones

| Símbolo | Significado |
|---------|-------------|
| ⚠️ | Acción destructiva — confirmar antes de ejecutar |
| 🔴 | Crítico — impacto en producción |
| 🟡 | Medio — degradación parcial |
| 🟢 | Bajo — sin impacto en usuario |
| `[ENV]` | Variable de entorno requerida |

**Entornos:**
- `local` — máquina del desarrollador
- `staging` — preview branch en Expo EAS
- `production` — release en App Store / Play Store

---

## RB-001 — Deploy Mobile (EAS Build)

**Propósito:** Compilar y publicar la app en App Store (iOS) y Google Play (Android) vía Expo Application Services (EAS).

**Pre-requisitos:**
- [ ] `eas-cli` instalado globalmente (`npm install -g eas-cli`)
- [ ] Autenticado en Expo (`eas login`)
- [ ] Certificados iOS configurados en EAS (Auto-managed recomendado)
- [ ] Keystore Android configurado en EAS
- [ ] Env vars de producción configuradas en EAS dashboard

### Pasos — iOS Production

```bash
# 1. Verificar env vars en EAS (no en .env local)
eas env:list --environment production

# 2. Build production iOS
eas build --platform ios --profile production

# 3. Monitorear build en dashboard o terminal
# Build ID se imprime al iniciar — guardar para referencia

# 4. Submit al App Store (requiere App Store Connect acceso)
eas submit --platform ios --latest
```

### Pasos — Android Production

```bash
# 1. Build production Android
eas build --platform android --profile production

# 2. Submit a Google Play (Internal Testing primero)
eas submit --platform android --latest --track internal

# 3. Después de QA en Internal Testing, promover a Production
# desde Google Play Console manualmente
```

### Pasos — OTA Update (sin re-submit a stores)

```bash
# Solo para cambios en JS bundle (no código nativo)
eas update --branch production --message "Fix: descripción del cambio"

# Verificar que el update llega a usuarios
eas update:list --branch production
```

**Rollback OTA:**
```bash
# Listar updates disponibles
eas update:list --branch production

# Republish de update anterior (reemplaza current)
eas update --branch production --republish --group <previous-group-id>
```

**Verificación post-deploy:**
- [ ] App se abre sin crash (Sentry / Expo Diagnostics)
- [ ] Login con cada provider funciona (Email, Google, Apple)
- [ ] Crear match de prueba end-to-end
- [ ] Stats cargan sin error

---

## RB-002 — Deploy API (Expo API Routes)

**Contexto:** La API vive dentro del mismo proyecto Expo como API Routes. El deploy del bundle de la app **incluye** las rutas API. No hay deploy separado de backend.

**Para entornos staging/preview:**
```bash
# Crear preview channel automáticamente con PR
# eas.json debe tener profile "preview" configurado
eas build --platform all --profile preview
```

**Env vars de API (server-side, nunca en cliente):**

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | production/staging | Neon connection string |
| `CLERK_SECRET_KEY` | production/staging | Clerk server key (sk_...) |
| `CLERK_PUBLISHABLE_KEY` | production/staging | Clerk public key (pk_...) |
| `GOOGLE_CLIENT_ID` | production/staging | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | production/staging | OAuth Google |

⚠️ **Nunca commitear `.env` con valores reales.** Usar `eas secret:push` o EAS dashboard.

```bash
# Agregar secret a EAS
eas secret:create --scope project --name DATABASE_URL --value "postgresql://..."

# Listar secrets configurados
eas secret:list
```

---

## RB-003 — DB Migration (Drizzle)

**Propósito:** Aplicar cambios al schema de Neon PostgreSQL de forma segura.

**Pre-requisitos:**
- [ ] `DATABASE_URL` configurado localmente (apuntar a staging, no prod directamente)
- [ ] Drizzle Kit instalado (`npm install -D drizzle-kit`)

### Flujo estándar

```bash
# 1. Modificar schema en src/db/schema.ts

# 2. Generar migration SQL (no aplica aún)
npx drizzle-kit generate

# 3. Revisar migration generada en drizzle/migrations/
# IMPORTANTE: revisar SQL antes de aplicar
cat drizzle/migrations/<timestamp>_<name>.sql

# 4. Aplicar a staging PRIMERO
DATABASE_URL=<staging-url> npx drizzle-kit migrate

# 5. Verificar en staging que todo funciona

# 6. Aplicar a producción
DATABASE_URL=<production-url> npx drizzle-kit migrate
```

### Verificación post-migración

```sql
-- Verificar que la tabla/columna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '<tabla>';

-- Verificar que los índices se crearon
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = '<tabla>';

-- Verificar que las constraints existen
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '<tabla>'::regclass;
```

### Tipos de migraciones y riesgos

| Tipo | Riesgo | Estrategia |
|------|--------|------------|
| `ADD COLUMN NULL` | 🟢 Bajo | Aplicar directo |
| `ADD COLUMN NOT NULL DEFAULT` | 🟡 Medio | Verificar volumen de filas |
| `ADD COLUMN NOT NULL sin default` | 🔴 Alto | ⚠️ Requiere backfill previo |
| `DROP COLUMN` | 🔴 Alto | ⚠️ Confirmar que no hay código que la use |
| `ADD INDEX` | 🟡 Medio | Puede ser lento en tablas grandes |
| `ADD CONSTRAINT CHECK` | 🟡 Medio | Validar que datos existentes lo cumplen |
| `RENAME TABLE/COLUMN` | 🔴 Alto | ⚠️ Requiere deploy coordinado |
| `ALTER TYPE ENUM ADD` | 🟢 Bajo | PostgreSQL soporta ADD VALUE sin lock |
| `ALTER TYPE ENUM DROP/RENAME` | 🔴 Alto | ⚠️ Requiere recrear type |

---

## RB-004 — Rollback de Migración

⚠️ **Drizzle no genera rollbacks automáticos.** Cada rollback debe escribirse manualmente.

### Preparar rollback previo al deploy

```bash
# Antes de aplicar cualquier migration, documentar el estado actual
pg_dump --schema-only $DATABASE_URL > backup_schema_$(date +%Y%m%d_%H%M).sql

# Para tablas críticas, backup de datos también
pg_dump --data-only -t match_events $DATABASE_URL > backup_events_$(date +%Y%m%d_%H%M).sql
```

### Rollback de columna agregada

```sql
-- Si se agregó una columna y hay que revertir
ALTER TABLE <tabla> DROP COLUMN IF EXISTS <columna>;
```

### Rollback de tabla creada

```sql
-- Si se creó una tabla nueva
DROP TABLE IF EXISTS <tabla>;
```

### Rollback de índice

```sql
DROP INDEX CONCURRENTLY IF EXISTS <index_name>;
```

### Rollback de constraint

```sql
ALTER TABLE <tabla> DROP CONSTRAINT IF EXISTS <constraint_name>;
```

### Procedimiento de emergencia

1. **Identificar** qué migration causó el problema (revisar `drizzle_migrations` table)
2. **Escribir** SQL de rollback manual
3. **Aplicar** rollback en staging, verificar
4. **Aplicar** rollback en producción
5. **Marcar** la migration como revertida en la tabla de historial:

```sql
-- Eliminar registro de migration aplicada (para que Drizzle la re-aplique corregida)
DELETE FROM drizzle.__drizzle_migrations WHERE hash = '<migration-hash>';
```

---

## RB-005 — Rollback de App Store

**iOS — App Store Connect:**
1. No es posible retirar una versión publicada automáticamente
2. Opción A: Publicar OTA rollback (si el cambio es solo JS)
3. Opción B: Publicar nueva versión con fix urgente (expedited review)
4. Opción C: Contactar a Apple para retirar versión (proceso manual lento)

**Android — Google Play Console:**
1. Google Play permite "Halt rollout" si el deploy está en progreso
2. Para versión ya publicada: publicar nueva versión directamente
3. En emergencia: usar "Managed Publishing" para pausar future releases

**Recomendación:** Usar OTA Updates (RB-001) como primera línea de rollback para bugs JS.

---

## RB-006 — Rotación de Secrets

**Cuándo rotar:**
- Leak confirmado o sospechado de una key
- Offboarding de desarrollador con acceso
- Rotación periódica (recomendado cada 90 días para producción)

### Clerk Keys

```bash
# 1. Generar nueva key en Clerk Dashboard
# Dashboard > API Keys > Create new key

# 2. Actualizar en EAS
eas secret:create --scope project --name CLERK_SECRET_KEY --value "sk_live_..."
# (esto reemplaza el valor existente)

# 3. Deployar nueva build para que tome el nuevo CLERK_PUBLISHABLE_KEY
# (si la publishable key también cambió)

# 4. Revocar la key antigua en Clerk Dashboard
# Esperar 24h por si hay builds en flight antes de revocar
```

### Neon DATABASE_URL

```bash
# 1. En Neon Console: Settings > Connection Pooling > Reset password
# O crear nuevo rol de DB

# 2. Actualizar en EAS
eas secret:create --scope project --name DATABASE_URL --value "postgresql://..."

# 3. Deployar nueva build
# La connection string anterior seguirá funcionando hasta revocarla en Neon
```

---

## RB-007 — Incidente: API Down

**Síntomas:** App muestra errores al crear/cargar matches; HTTP 500/503 en endpoints.

**Triage (< 5 min):**

```bash
# 1. Verificar estado de Expo/EAS
# Status page: status.expo.dev

# 2. Verificar que el DATABASE_URL sea válido
# En Neon Console: verificar que la branch de producción está activa

# 3. Verificar logs de error
# EAS Dashboard > Builds > Ver último build > Logs
# O si hay Sentry/Logflare configurado, revisar ahí
```

**Causas comunes y resolución:**

| Causa | Diagnóstico | Resolución |
|-------|-------------|------------|
| `DATABASE_URL` inválida | Neon Console muestra DB suspendida | Activar DB / verificar secret |
| Clerk webhook falla | Clerk Dashboard > Webhooks > Logs | Re-enviar webhook / verificar endpoint |
| Migration fallida | SQL error en logs | Ejecutar RB-004 |
| OTA Update con bug | Sentry muestra crash reciente | Rollback OTA (RB-001) |
| Rate limit Neon | Logs muestran `too many connections` | Ejecutar RB-008 |

---

## RB-008 — Incidente: DB Connection Pool Exhausted

**Síntomas:** `NeonDbError: too many clients` o queries lentas con timeouts.

**Diagnóstico:**

```sql
-- Ver conexiones activas
SELECT count(*), state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, wait_event_type, wait_event;

-- Ver conexiones idle colgadas
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes';
```

**Resolución inmediata:**

```sql
-- Terminar conexiones idle colgadas (> 5 min sin actividad)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();
```

**Resolución estructural:**
1. Verificar que Drizzle usa `neon()` driver con pooling habilitado
2. En Neon Console: aumentar el límite de conexiones del plan
3. Revisar que todas las conexiones usan `await db.end()` o connection pooling correcto

---

## RB-009 — Incidente: Auth Degradado

**Síntomas:** Usuarios no pueden hacer login; JWT tokens no se validan; 401 en endpoints autenticados.

**Triage:**

```bash
# 1. Verificar estado de Clerk
# Status page: clerk.com/status (o status.clerk.com)

# 2. Verificar que CLERK_SECRET_KEY no expiró o fue rotada
eas secret:list | grep CLERK

# 3. Verificar que el middleware de Hono está parseando el header Authorization correcto
# Los tokens deben ser: Authorization: Bearer <clerk-jwt>
```

**Modo degradado (fallback para usuarios existentes):**
- Guest mode (FT-019) sigue funcionando sin auth
- Si Clerk está down globalmente, no hay workaround para auth — comunicar a usuarios

**Post-incidente:**
- Revisar si el JWT expiration (`exp`) está configurado correctamente en Clerk Dashboard
- Verificar que `CLERK_PUBLISHABLE_KEY` en el cliente no cambió sin rebuild

---

## RB-010 — Configuración de Entorno Local

**Propósito:** Onboarding de nuevo desarrollador o setup de nueva máquina.

### Pre-requisitos del sistema

```bash
# Node.js 20+ LTS
node --version  # debe ser >= 20.0.0

# npm 10+
npm --version

# Expo CLI
npm install -g expo-cli eas-cli

# iOS (solo macOS)
# Xcode 15+ instalado desde App Store
xcode-select --install

# Android
# Android Studio instalado con SDK 34+
# ANDROID_HOME configurado en .zshrc/.bashrc
```

### Setup del proyecto

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd MTG_App

# 2. Instalar dependencias
npm install

# 3. Crear archivo de env local (NO commitear)
cp .env.example .env.local

# 4. Completar .env.local con valores de desarrollo:
# DATABASE_URL=<neon-dev-branch-url>
# CLERK_PUBLISHABLE_KEY=<clerk-dev-pk>
# CLERK_SECRET_KEY=<clerk-dev-sk>
# GOOGLE_CLIENT_ID=<google-dev-client-id>

# 5. Aplicar migrations a la DB de desarrollo
npx drizzle-kit migrate

# 6. Seed de datos de prueba (si existe)
npm run db:seed

# 7. Iniciar servidor de desarrollo
npx expo start
```

### Verificación del setup

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Expo Go (cualquier dispositivo)
# Escanear QR code desde la terminal
```

### Accesos necesarios

| Sistema | Nivel | Para qué |
|---------|-------|---------|
| GitHub repo | Collaborator | Código fuente |
| Expo EAS | Member | Builds y OTA updates |
| Neon Console | Member | DB development branch |
| Clerk Dashboard | Member | Auth config y logs |
| App Store Connect | Developer | iOS submission |
| Google Play Console | Developer | Android submission |

---

## Apéndice: eas.json Reference

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_ENV": "staging"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<apple-id>",
        "ascAppId": "<app-store-connect-id>",
        "appleTeamId": "<team-id>"
      },
      "android": {
        "serviceAccountKeyPath": "./secrets/google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

*Runbooks generados por `/docs` — actualizar con IDs reales (EAS project, App IDs) al iniciar implementación.*
