/**
 * Minimal type declarations for expo-iap.
 * Replace with the real package types once `expo-iap` is installed (PLAT-012).
 *
 * API mirrors react-native-iap v12 (the upstream this package forks from).
 */
declare module 'expo-iap' {
  export interface Purchase {
    productId: string;
    transactionId?: string;
    transactionDate?: number;
    transactionReceipt?: string; // iOS: base64 receipt
    purchaseToken?: string; // Android: purchase token
    packageNameAndroid?: string;
    isAcknowledgedAndroid?: boolean;
    purchaseStateAndroid?: number;
  }

  export interface PurchaseError {
    code?: string;
    message?: string;
    responseCode?: number;
  }

  export interface Product {
    productId: string;
    price: string;
    currency: string;
    title: string;
    description: string;
  }

  export interface FinishTransactionOptions {
    purchase: Purchase;
    isConsumable: boolean;
  }

  /** Initialize native store connection. Must be called before any other IAP API. */
  export function initConnection(): Promise<boolean>;

  /** Terminate native store connection. Call on unmount. */
  export function endConnection(): Promise<void>;

  /** Fetch product details from App Store / Google Play. */
  export function getProducts(params: { skus: string[] }): Promise<Product[]>;

  /** Initiate a purchase flow for a product (iOS/Android). Result via purchaseUpdatedListener. */
  export function requestPurchase(params: { sku: string; andDangerouslyFinishTransactionAutomatically?: boolean }): Promise<Purchase | void>;

  /**
   * Restore previously completed non-consumable purchases.
   * Triggers purchaseUpdatedListener for each restored transaction.
   */
  export function restorePurchases(): Promise<Purchase[]>;

  /** Acknowledge and finish a transaction. Call after successful verification. */
  export function finishTransaction(options: FinishTransactionOptions): Promise<void>;

  /** Subscribe to purchase updates (successful purchases & restores). */
  export function purchaseUpdatedListener(
    listener: (purchase: Purchase) => void,
  ): { remove: () => void };

  /** Subscribe to purchase errors (cancelled, declined, etc.). */
  export function purchaseErrorListener(
    listener: (error: PurchaseError) => void,
  ): { remove: () => void };
}
