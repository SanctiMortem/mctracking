# SETUP-008: Configure EAS Build (iOS + Android)

> **Issue ID:** SETUP-008
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/api`, `project/architecture`
> **Agents:** `devops-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Configurar EAS Build para que el proyecto pueda compilar binarios nativos (`.ipa` para iOS, `.apk`/`.aab` para Android) sin requerir Xcode o Android Studio en la máquina local. Incluir configuración de perfiles (development, preview, production), manejo de secrets en EAS, y un build exitoso en perfil `development` como verificación.

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **builds nativos automáticos con EAS** para **poder testear en dispositivos reales y eventualmente publicar en App Store / Play Store sin configuración manual de Xcode/Android Studio**.

**Implementa:** — (Infraestructura de distribución, §5 Infrastructure)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DISCOVERY | §5 Infrastructure + §1 Distribución | [00_DISCOVERY_BRIEF.md#§5-infrastructure](../../planning/00_DISCOVERY_BRIEF.md) |
| ARCHITECTURE | Stack (Expo) | [07_ARCHITECTURE.md#stack](../../planning/07_ARCHITECTURE.md) |

---

## ✅ Criterios de Aceptación

- [ ] `eas.json` configurado con 3 perfiles: `development`, `preview`, `production`
- [ ] `app.config.ts` tiene `bundleIdentifier` (iOS) y `package` (Android) definidos
- [ ] Secrets de EAS configurados: `DATABASE_URL`, `CLERK_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] `eas build --platform ios --profile development` completa exitosamente
- [ ] `eas build --platform android --profile development` completa exitosamente
- [ ] `setup_mac_dev_env.sh` documentado y funcional para setup local

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Build de desarrollo exitoso en iOS
  Dado que `eas.json` está configurado con perfil development
  Y los secrets están configurados en EAS
  Cuando ejecuto `eas build --platform ios --profile development`
  Entonces el build completa sin errores
  Y genera un archivo `.ipa` instalable en un dispositivo de desarrollo

Escenario: Secrets no están en el bundle del cliente
  Dado que `DATABASE_URL` está configurado como EAS secret (no en `app.json`)
  Cuando el build de producción se compila
  Entonces `DATABASE_URL` no aparece en el bundle JavaScript del cliente
  Y solo está disponible en el entorno de servidor (API Routes)
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `eas.json` — Perfiles de build
- `app.config.ts` — Config dinámica de Expo (bundleIdentifier, etc.)
- `setup_mac_dev_env.sh` — Script de setup ya existe en el repo, verificar/actualizar

**`eas.json` estructura:**
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Secrets en EAS (no en `.env`):**
```bash
eas secret:create --scope project --name DATABASE_URL --value "..."
eas secret:create --scope project --name CLERK_SECRET_KEY --value "..."
```

**Archivos a crear:**
- `eas.json`
- `app.config.ts` (reemplaza o complementa `app.json`)

**Dependencias de Issues:**
- Bloqueado por: SETUP-001
- No bloquea otros issues (paralelo con SETUP-005/006/007)

## ⚠️ Edge Cases

- Apple Developer Program membership ($99/año) requerida para iOS builds de producción — en development se puede usar con cuenta gratuita
- El primer EAS build puede tomar 15-30 minutos si los recursos de Expo están ocupados

## 🧪 Tests Requeridos

- [ ] Manual: `eas build --platform ios --profile development` completa sin errores
- [ ] Manual: `eas build --platform android --profile development` completa sin errores

## 🚫 Out of Scope

- Configurar App Store Connect / Google Play Console (pre-deploy)
- CI/CD automatizado con GitHub Actions (post-MVP)
- TestFlight / Play Store Internal Testing distribution

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
