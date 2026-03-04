/**
 * Delivery-related types shared across Delivery Service,
 * Order Service, Rider BFF, and Customer BFF (for tracking).
 */

/** Delivery record */
export interface Delivery {
  id: string;
  orderId: string;
  riderId?: string;
  restaurantId: string;
  status: DeliveryStatus;
  pickupLocation: DeliveryLocation;
  dropoffLocation: DeliveryLocation;
  estimatedDistanceKm?: number;
  estimatedDurationMins?: number;
  actualPickupAt?: string;
  actualDeliveredAt?: string;
  deliveryOtp: string;
  deliveryPhotoUrl?: string;
  /** Rider earnings in paise */
  riderPayout: number;
  /** Customer tip in paise */
  tipAmount: number;
  broadcastCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus =
  | 'PENDING'
  | 'BROADCAST'
  | 'ASSIGNED'
  | 'PICKING_UP'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'FAILED';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  address: string;
}

/** Broadcast log entry (audit trail for rider assignment) */
export interface BroadcastLog {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  radiusKm: number;
  ridersNotified: number;
  riderIdsNotified: string[];
  acceptedByRiderId?: string;
  expired: boolean;
  createdAt: string;
  resolvedAt?: string;
}

/** Real-time rider location (stored in Redis) */
export interface RiderLocation {
  riderId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt: string;
}

/** Delivery broadcast pushed to riders via WebSocket */
export interface DeliveryBroadcast {
  deliveryId: string;
  restaurantName: string;
  pickup: DeliveryLocation;
  dropoff: DeliveryLocation;
  distanceKm: number;
  /** Estimated payout in paise */
  estimatedPayout: number;
  expiresAt: string;
}
