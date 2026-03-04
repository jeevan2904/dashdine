/**
 * User-related types shared across User Service, BFF gateways,
 * and services that need user information.
 */

/** Customer/User profile */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  defaultAddressId?: string;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

/** Delivery address */
export interface Address {
  id: string;
  userId: string;
  label: AddressLabel;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
}

export type AddressLabel = 'Home' | 'Work' | 'Other';

/** Rider profile (extends base user) */
export interface RiderProfile {
  id: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  drivingLicenseUrl: string;
  idProofUrl: string;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  currentCityId?: string;
  averageRating: number;
  totalDeliveries: number;
  createdAt: string;
  updatedAt: string;
}

export type VehicleType = 'BICYCLE' | 'SCOOTER' | 'MOTORCYCLE' | 'CAR';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
