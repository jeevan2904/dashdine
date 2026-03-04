/**
 * Order-related types shared across Order Service, Payment Service,
 * Delivery Service, and all BFF gateways.
 *
 * The Order is the central entity of DashDine — it connects
 * customers, restaurants, riders, and payments.
 */

/** Complete order record */
export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  riderId?: string;
  cityId: string;
  status: OrderStatus;
  orderType: OrderType;
  scheduledFor?: string;
  deliveryAddress: OrderAddress;
  restaurantAddress: OrderAddress;
  /** Food items subtotal in paise */
  subtotal: number;
  /** Delivery charge in paise */
  deliveryFee: number;
  surgeMultiplier: number;
  /** Promo discount in paise */
  discountAmount: number;
  /** GST and taxes in paise */
  taxAmount: number;
  /** Rider tip in paise */
  tipAmount: number;
  /** Grand total in paise */
  totalAmount: number;
  promoCodeId?: string;
  cancellationReason?: string;
  cancelledBy?: CancelledBy;
  specialInstructions?: string;
  estimatedDeliveryAt?: string;
  actualDeliveredAt?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Order status represents the finite state machine of an order.
 *
 * Valid transitions:
 * PLACED → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
 * PLACED → CANCELLED (by customer, before restaurant confirms)
 * CONFIRMED → CANCELLED (by restaurant or admin)
 * PREPARING → CANCELLED (by admin only, with refund)
 */
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderType = 'INSTANT' | 'SCHEDULED';
export type CancelledBy = 'CUSTOMER' | 'RESTAURANT' | 'ADMIN' | 'SYSTEM';

/** Snapshot of address at order time (never changes after order is placed) */
export interface OrderAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

/** Individual line item in an order */
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  /** Snapshot: item name at order time */
  menuItemName: string;
  quantity: number;
  /** Price per unit in paise */
  unitPrice: number;
  /** quantity * unitPrice + addOns total, in paise */
  totalPrice: number;
  /** Snapshot: selected add-ons */
  addOns: OrderItemAddOn[];
  specialInstructions?: string;
  isVeg: boolean;
}

export interface OrderItemAddOn {
  id: string;
  name: string;
  /** Price in paise */
  price: number;
}

/** Status change history entry */
export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedBy: 'SYSTEM' | 'CUSTOMER' | 'RESTAURANT' | 'RIDER' | 'ADMIN';
  changedById?: string;
  notes?: string;
  createdAt: string;
}

/** Order rating submitted by customer */
export interface OrderRating {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  riderId?: string;
  foodRating: number;
  deliveryRating?: number;
  reviewText?: string;
  createdAt: string;
}
