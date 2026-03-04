/**
 * Payment-related types shared across Payment Service,
 * Order Service, Settlement Service, and BFF gateways.
 */

/** Payment transaction record */
export interface PaymentTransaction {
  id: string;
  orderId: string;
  customerId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  /** Amount in paise */
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET';

export type PaymentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

/** Refund record */
export interface Refund {
  id: string;
  paymentId: string;
  orderId: string;
  razorpayRefundId?: string;
  /** Refund amount in paise */
  amount: number;
  reason: string;
  initiatedBy: 'SYSTEM' | 'ADMIN' | 'CUSTOMER';
  status: 'INITIATED' | 'PROCESSED' | 'FAILED';
  createdAt: string;
  processedAt?: string;
}

/** Immutable ledger entry (double-entry bookkeeping) */
export interface LedgerEntry {
  id: string;
  orderId: string;
  entryType: LedgerEntryType;
  /** Debit amount in paise */
  debit: number;
  /** Credit amount in paise */
  credit: number;
  /** Running balance after this entry in paise */
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export type LedgerEntryType =
  | 'COLLECTION'
  | 'COMMISSION'
  | 'RESTAURANT_PAYOUT'
  | 'RIDER_PAYOUT'
  | 'REFUND'
  | 'TAX';
