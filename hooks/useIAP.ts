/**
 * useIAP — manages the expo-iap purchase flow for the Premium one-time purchase.
 * Handles connection, purchase, restore, receipt verification, and cleanup.
 *
 * Usage:
 *   const { purchase, restore, isPurchasing, isRestoring, error } = useIAP(onSuccess);
 *
 * On successful purchase or restore, calls onSuccess() so the caller
 * can refresh settings and hide ads (BR-AUTH-04).
 *
 * PLAT-012 (EPIC-05)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import {
  initConnection,
  endConnection,
  requestPurchase,
  restorePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
} from 'expo-iap';
import type { Purchase } from 'expo-iap';

import { apiFetch } from '@/services/api';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PREMIUM_PRODUCT_ID = 'com.mtgtracker.premium';

type VerifyResponse = { success: true; data: { premium: boolean } };

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * @param onSuccess - Called after premium is successfully activated.
 *                   Use to refresh settings so ads disappear immediately.
 */
export function useIAP(onSuccess?: () => void) {
  const { getToken } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable ref so the listener closure always calls the latest onSuccess
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // ── Server-side receipt verification ─────────

  const verifyPurchase = useCallback(
    async (purchase: Purchase) => {
      const receipt =
        Platform.OS === 'ios'
          ? (purchase as { transactionReceipt?: string }).transactionReceipt
          : (purchase as { purchaseToken?: string }).purchaseToken;

      if (!receipt) {
        setError('No receipt available');
        return false;
      }

      try {
        const token = await getToken();
        const res = await apiFetch<VerifyResponse>(
          '/api/purchases/verify',
          'POST',
          { receipt, platform: Platform.OS },
          token ?? undefined,
        );
        return res.success && res.data.premium;
      } catch {
        setError('Purchase verification failed. Please try again.');
        return false;
      }
    },
    [getToken],
  );

  // ── Connection + listeners ─────────────────

  useEffect(() => {
    initConnection().catch(() => {
      // Connection failure is non-fatal — purchase() will fail naturally
    });

    const updateSub = purchaseUpdatedListener(async (purchase) => {
      const verified = await verifyPurchase(purchase);

      if (verified) {
        await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
        onSuccessRef.current?.();
      }

      setIsPurchasing(false);
      setIsRestoring(false);
    });

    const errorSub = purchaseErrorListener((err) => {
      // E_USER_CANCELLED is expected — don't surface as an error
      const code = (err as { code?: string }).code;
      if (code !== 'E_USER_CANCELLED') {
        setError(err.message ?? 'Purchase failed');
      }
      setIsPurchasing(false);
      setIsRestoring(false);
    });

    return () => {
      updateSub.remove();
      errorSub.remove();
      endConnection().catch(() => {});
    };
  }, [verifyPurchase]);

  // ── Public API ─────────────────────────────

  /**
   * Initiates the native IAP purchase flow for the Premium product.
   * Result arrives asynchronously via purchaseUpdatedListener.
   */
  const purchase = useCallback(async () => {
    setError(null);
    setIsPurchasing(true);
    try {
      await requestPurchase({ sku: PREMIUM_PRODUCT_ID });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'E_USER_CANCELLED') {
        setError(e instanceof Error ? e.message : 'Purchase failed');
      }
      setIsPurchasing(false);
    }
  }, []);

  /**
   * Restores previous purchases from the App Store / Google Play.
   * Triggers purchaseUpdatedListener for each restored transaction.
   * Shows an alert if nothing was found to restore.
   */
  const restore = useCallback(async () => {
    setError(null);
    setIsRestoring(true);
    try {
      const purchases = await restorePurchases();
      if (!purchases?.length) {
        Alert.alert('Restore purchases', 'No previous Premium purchase found.');
        setIsRestoring(false);
      }
      // If purchases found, purchaseUpdatedListener handles activation
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
      setIsRestoring(false);
    }
  }, []);

  return { purchase, restore, isPurchasing, isRestoring, error };
}
