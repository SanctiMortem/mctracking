# PLAT-011: Monetización — Ads Integration (AdMob/Unity — free tier)

> **Issue ID:** PLAT-011
> **Priority:** P2
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`, `domains/ui`
> **Agents:** `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Integrar anuncios para el free tier: BannerAd en pantallas de historial/stats/home, e InterstitialAd al cerrar un match. Los anuncios se ocultan automáticamente si `user_settings.premium = true`. Seleccionar entre Google AdMob (`expo-ads-admob`) o Unity Ads.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DISCOVERY | §3 Monetización | [00_DISCOVERY_BRIEF.md](../../planning/00_DISCOVERY_BRIEF.md) |
| BUSINESS_RULES | BR-AUTH-04 (premium gate) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] BannerAd visible en SCR-002 (Home), SCR-005 (Historial), SCR-006 (Stats) — solo si `!premium`
- [ ] InterstitialAd al navegar de SCR-010 (Resultados) a Home — solo si `!premium`
- [ ] Si `premium = true`: ningún ad se muestra en ninguna pantalla (BR-AUTH-04)
- [ ] Ads no bloquean features — solo se muestran en momentos no intrusivos
- [ ] Ads no se muestran en SCR-008 (Match Tracker) — no interrumpir el juego
- [ ] Configurar AdMob App ID en `app.json` (o Unity Ads si se elige Unity)
- [ ] Test mode durante desarrollo (AdMob test IDs o Unity test mode)

## 🔧 Contexto Técnico

**Librería recomendada:** `react-native-google-mobile-ads` (más activo que `expo-ads-admob` en 2026)

**Patrón de uso:**
```typescript
// components/ads/BannerAdWrapper.tsx
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSettings } from '../../hooks/useSettings';

export function BannerAdWrapper() {
  const { settings } = useSettings();
  if (settings?.premium) return null;  // BR-AUTH-04
  return (
    <BannerAd
      unitId={__DEV__ ? TestIds.BANNER : BANNER_AD_UNIT_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    />
  );
}
```

**Configuración app.json:**
```json
{
  "expo": {
    "plugins": [
      ["react-native-google-mobile-ads", {
        "androidAppId": "ca-app-pub-xxx~xxx",
        "iosAppId": "ca-app-pub-xxx~xxx"
      }]
    ]
  }
}
```

**Dependencias de Issues:**
- Bloqueado por: PLAT-003 (Auth — para verificar estado premium), PLAT-007 (settings con campo premium), PLAT-010 (Home screen)
- Bloquea a: PLAT-012 (el IAP justifica quitar los ads)

---

## ⚠️ Edge Cases

- GDPR/ATT (iOS 14.5+): `expo-tracking-transparency` para solicitar permiso de tracking en iOS antes de mostrar ads personalizados
- Si el usuario está offline: AdMob puede no cargar — no crashear, simplemente no mostrar el banner
- InterstitialAd: solo mostrar una vez por sesión de cierre de match (no en cada match)

## 🧪 Tests Requeridos

- [ ] Unit: `BannerAdWrapper` retorna null cuando `premium=true`
- [ ] Manual: verificar que ads se muestran en device físico con AdMob test IDs

## 🚫 Out of Scope

- Video ads / rewarded ads → Fase 2
- Ads dentro del tracker (SCR-008) → explícitamente excluido

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-12 | `react-native-google-mobile-ads` (no `expo-ads-admob`) | Más activo en 2026, soporte nativo superior |
| 2026-04-12 | `BannerAdWrapper` retorna `null` cuando `settings === null` | Default seguro: no mostrar ads mientras carga, evita flash de ad en usuarios premium |
| 2026-04-12 | `requestNonPersonalizedAdsOnly: true` por defecto | GDPR-safe sin implementar ATT explícito en MVP |
| 2026-04-12 | Interstitial solo en "Go Home" de SCR-010 | Momento no intrusivo post-partida; excluido del tracker (SCR-008) |
| 2026-04-12 | `expo-tracking-transparency` diferido | Edge case iOS ATT — no bloqueante para MVP, documentado |
| 2026-04-12 | AdMob App IDs como placeholder | Requieren cuenta AdMob activa; configurar con `ADMOB_*` env vars en EAS |

### Artefactos Creados

- `components/ads/BannerAdWrapper.tsx` — banner con gate premium + test IDs en dev
- `hooks/useInterstitialAd.ts` — carga interstitial, expone `showAd(callback)`
- `__tests__/unit/components/BannerAdWrapper.test.tsx` — 3 casos: premium=true, premium=false, settings=null

### Artefactos Modificados

- `app/(tabs)/home.tsx` — `<BannerAdWrapper />`
- `app/(tabs)/history.tsx` — `<BannerAdWrapper />`
- `app/(tabs)/stats.tsx` — `<BannerAdWrapper />`
- `app/match/[id]/results.tsx` — `useInterstitialAd` + `showAd()` en "Go Home"
- `app.json` — plugin `react-native-google-mobile-ads` con App IDs placeholder
- `app.config.ts` — ídem, con env vars `ADMOB_*`
- `package.json` — `react-native-google-mobile-ads: ^14.0.0`

### AC Coverage

| AC | Estado |
|----|--------|
| BannerAd en SCR-002 Home solo si `!premium` | ✅ |
| BannerAd en SCR-005 Historial solo si `!premium` | ✅ |
| BannerAd en SCR-006 Stats solo si `!premium` | ✅ |
| InterstitialAd al ir a Home desde SCR-010 solo si `!premium` | ✅ |
| `premium=true` → ningún ad en ninguna pantalla | ✅ BannerAdWrapper + useInterstitialAd gate |
| Ads no en SCR-008 Match Tracker | ✅ no se añadió |
| AdMob App ID en app.json | ✅ placeholder — reemplazar con ID real |
| Test mode en dev | ✅ `TestIds.ADAPTIVE_BANNER` / `TestIds.INTERSTITIAL` |

### Pasos Manuales Pendientes

```bash
# 1. Instalar dependencia
pnpm install

# 2. Crear cuenta AdMob → obtener App IDs reales
# 3. Configurar EAS secrets
eas secret:create --scope project --name ADMOB_ANDROID_APP_ID --value "ca-app-pub-xxx~xxx"
eas secret:create --scope project --name ADMOB_IOS_APP_ID --value "ca-app-pub-xxx~xxx"
eas secret:create --scope project --name ADMOB_BANNER_UNIT_ID --value "ca-app-pub-xxx/xxx"
eas secret:create --scope project --name ADMOB_INTERSTITIAL_UNIT_ID --value "ca-app-pub-xxx/xxx"

# 4. Rebuild nativo (react-native-google-mobile-ads requiere native build)
eas build --platform ios --profile development
```

---

## Commits

`edc50fa` feat(platform): implement PLAT-011 — Ads Integration (AdMob free tier)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
