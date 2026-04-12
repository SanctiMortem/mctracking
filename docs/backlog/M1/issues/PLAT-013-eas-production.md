# PLAT-013: Platform — EAS Build Production (iOS + Android)

> **Issue ID:** PLAT-013
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`
> **Agents:** `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Configurar y validar los builds de producción en EAS para iOS (TestFlight) y Android (Play Store internal). Extiende SETUP-008 (que configuró development/preview) con el perfil `production` y los artefactos reales listos para review.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| SETUP | SETUP-008 EAS Build config | [SETUP-008-configure-eas-build.md](./SETUP-008-configure-eas-build.md) |
| SETUP | SETUP-002 EAS secrets | [SETUP-002-configure-env-vars.md](./SETUP-002-configure-env-vars.md) |

---

## ✅ Criterios de Aceptación

- [ ] `eas.json` profile `production` configurado: `distribution: "store"` para iOS y Android
- [ ] iOS: bundle identifier `com.aboutagency.mtgtracker` en Apple Developer + provisioning profile en EAS
- [ ] iOS: build IPA generado con `eas build --platform ios --profile production` → upload a TestFlight
- [ ] Android: keystore configurado en EAS secrets + `aab` generado y subido a Play Store internal
- [ ] Todas las env vars de producción configuradas en EAS secrets (`DATABASE_URL_PROD`, `CLERK_PUBLISHABLE_KEY_PROD`, etc.)
- [ ] `app.json` con `version` y `buildNumber`/`versionCode` correctos para primer release
- [ ] Smoke test en TestFlight: auth + crear match + tracker básico funcional

## 🔧 Contexto Técnico

**eas.json production additions:**
```json
{
  "build": {
    "production": {
      "distribution": "store",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "APP_ENV": "production"
      }
    }
  }
}
```

**app.json versioning:**
```json
{
  "expo": {
    "version": "1.0.0",
    "ios": { "buildNumber": "1" },
    "android": { "versionCode": 1 }
  }
}
```

**EAS secrets para producción:**
```bash
eas secret:create --scope project --name DATABASE_URL --value "..."
eas secret:create --scope project --name CLERK_SECRET_KEY --value "..."
# etc.
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-008 (perfiles previos), todos los demás issues (M1 completo)
- Bloquea a: — (cierre del milestone)

---

## ⚠️ Edge Cases

- Apple Developer Program membership requerida para iOS production ($99/año)
- Google Play Console membership requerida para Android ($25 one-time)
- EAS Build puede tardar 20-40 min en cola — planificar anticipadamente

## 🧪 Tests Requeridos

- [ ] Manual: smoke test en TestFlight device físico (auth + tracker básico)
- [ ] Manual: smoke test en Android internal track

---

## SK Leverage

No aplica.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-12 | Bundle identifier cambiado a `com.aboutagency.mtgtracker` | Alinear con branding del proyecto (mtgtracker vs mtgcommander anterior) |
| 2026-04-12 | `distribution: "store"` en producción (no `autoIncrement`) | EAS requiere `distribution: "store"` explícito para builds de App Store / Play Store |
| 2026-04-12 | `ios.resourceClass: "m-medium"` | Build más rápido en EAS para producción iOS |
| 2026-04-12 | `android.buildType: "app-bundle"` | `.aab` requerido por Google Play Store (no `.apk`) |
| 2026-04-12 | `version: "1.0.0"`, `buildNumber: "1"`, `versionCode: 1` | Primer release oficial del milestone M1 |

### AC Coverage

| AC | Estado | Nota |
|----|--------|------|
| `eas.json` production con `distribution: "store"` | ✅ | `eas.json` actualizado |
| iOS: `ios.resourceClass: "m-medium"` | ✅ | `eas.json` actualizado |
| Android: `buildType: "app-bundle"` | ✅ | `eas.json` actualizado |
| Bundle ID `com.aboutagency.mtgtracker` en iOS | ✅ | `app.json` + `app.config.ts` |
| Package `com.aboutagency.mtgtracker` en Android | ✅ | `app.json` + `app.config.ts` |
| `version: "1.0.0"`, `buildNumber: "1"`, `versionCode: 1` | ✅ | `app.json` + `app.config.ts` |
| EAS secrets de producción | ⏳ Manual | `eas secret:create` con valores reales |
| Apple Developer: provisioning profile | ⏳ Manual | Requiere Apple Developer Program |
| iOS build → TestFlight | ⏳ Manual | `eas build --platform ios --profile production` |
| Android keystore + `.aab` → Play Store | ⏳ Manual | `eas build --platform android --profile production` |
| Smoke test TestFlight | ⏳ Manual | Post-build |

### Pasos Manuales Pendientes

```bash
# 1. Registrar bundle ID en Apple Developer Portal
#    com.aboutagency.mtgtracker → App Identifiers

# 2. Configurar EAS secrets de producción
eas secret:create --scope project --name DATABASE_URL --value "<neon-prod-url>"
eas secret:create --scope project --name CLERK_PUBLISHABLE_KEY --value "<clerk-prod-key>"
eas secret:create --scope project --name CLERK_SECRET_KEY --value "<clerk-prod-secret>"

# 3. Vincular EAS project ID real (reemplazar PLACEHOLDER en app.json/app.config.ts)
eas project:info  # obtener projectId

# 4. Build iOS production
eas build --platform ios --profile production

# 5. Build Android production
eas build --platform android --profile production

# 6. Upload a TestFlight (tras build exitoso)
eas submit --platform ios --profile production

# 7. Smoke test en dispositivo físico
```

---

## Commits

`c5856ac` feat(platform): implement PLAT-013 — EAS Build Production (iOS + Android)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
