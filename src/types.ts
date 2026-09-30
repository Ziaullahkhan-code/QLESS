export type RestaurantCategory = 'Fast Food' | 'Cafes' | 'Popular Restaurants';

export type PriceTier = '₨' | '₨₨' | '₨₨₨';

export interface Restaurant {
  id: string;
  name: string;
  category: RestaurantCategory;
  cuisine: string;
  tagline: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  avgWaitPerPartyMin: number;
  avgPreparationTimeMin: number; // e.g. 8 mins, 12 mins, 18 mins
  priceRange: PriceTier; // '₨' | '₨₨' | '₨₨₨'
  priceDescription: string; // e.g. "Avg ₨650/person"
  defaultCounter: string;
  availableCounters: string[];
  coverImage: string;
  accentColor: string;
  hours: string;
  nominalDistanceMeters?: number;
}

export type TokenStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'skipped' | 'cancelled' | 'expired';

export interface QueueToken {
  id: string;
  restaurantId: string;
  tokenNumber: string; // e.g. "BL-104"
  customerName: string;
  partySize: number;
  phone?: string;
  createdAt: number;
  status: TokenStatus;
  calledAt?: number;
  calledToCounter?: string; // e.g. "Counter 3"
  expiresAt?: number; // timestamp when token will auto-expire if diner doesn't show
  expiredAt?: number;
  isCurrentClientToken?: boolean;
  notes?: string;
  autoReissuedFromId?: string;
  reissuedTokenNumber?: string;
}

export interface QueueMetrics {
  totalWaiting: number;
  estimatedWaitMinutes: number;
  currentlyServingToken?: QueueToken;
  servedCountToday: number;
  skippedCountToday: number;
  expiredCountToday?: number;
  averageWaitTimeMinutes: number;
}

export interface ExpiredNotification {
  id: string;
  oldTokenNumber: string;
  newTokenNumber: string;
  restaurantId: string;
  restaurantName: string;
  counterName: string;
  timestamp: number;
  timeoutSeconds: number;
}

export type ActiveView = 'customer' | 'business' | 'split' | 'display';
export type CustomerDisplayView = 'grid' | 'map';

export interface SmsNotificationResult {
  success: boolean;
  phone: string;
  operator: string;
  message: string;
  timestamp: number;
  deliveryId: string;
}

export type SortFilterOption = 
  | 'distanceAsc'
  | 'distanceDesc'
  | 'priceAsc'
  | 'priceDesc'
  | 'prepTimeAsc'
  | 'waitAsc'
  | 'ratingDesc';
