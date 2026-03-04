/**
 * Restaurant-related types shared across Restaurant Service,
 * Customer BFF (for discovery), and Order Service.
 */

/** Restaurant profile */
export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  cuisineTypes: string[];
  address: RestaurantAddress;
  contactPhone: string;
  contactEmail: string;
  images: RestaurantImages;
  operatingHours: OperatingHour[];
  isVegOnly: boolean;
  averageRating: number;
  totalRatings: number;
  avgPrepTimeMins: number;
  minOrderValue: number;
  commissionRate: number;
  fssaiLicense: string;
  gstin?: string;
  status: RestaurantStatus;
  isOnline: boolean;
  maxConcurrentOrders: number;
  cityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  location: GeoPoint;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

export interface RestaurantImages {
  logo?: string;
  cover?: string;
  gallery: string[];
}

export interface OperatingHour {
  day: DayOfWeek;
  open: string;
  close: string;
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type RestaurantStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

/** Restaurant listing card (subset of Restaurant for list views) */
export interface RestaurantListItem {
  id: string;
  name: string;
  slug: string;
  cuisineTypes: string[];
  images: RestaurantImages;
  averageRating: number;
  totalRatings: number;
  avgPrepTimeMins: number;
  minOrderValue: number;
  isVegOnly: boolean;
  isOnline: boolean;
  /** Calculated dynamically based on distance */
  deliveryFee: number;
  estimatedDeliveryMins: number;
  distanceKm: number;
}

// ═══ Menu Types ═══

/** Complete restaurant menu */
export interface Menu {
  id: string;
  restaurantId: string;
  categories: MenuCategory[];
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  /** Price in paise (smallest currency unit) */
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  addOnGroups: AddOnGroup[];
}

export interface AddOnGroup {
  id: string;
  title: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT';
  required: boolean;
  options: AddOnOption[];
}

export interface AddOnOption {
  id: string;
  name: string;
  /** Price in paise */
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
}
