// ═══════════════════════════════════════════════════════════
// DashDine — MongoDB Initialization
// ═══════════════════════════════════════════════════════════
// This script runs ONCE when the MongoDB container is first created.
// It creates databases, collections, and indexes for services
// that use MongoDB (Restaurant Service, Notification Service).
//
// MongoDB creates databases lazily (on first write), but we
// pre-create collections and indexes here so they're ready.
// ═══════════════════════════════════════════════════════════

// Switch to restaurant database
db = db.getSiblingDB('dashdine_restaurants');

// Create collections with schema validation
db.createCollection('restaurants');
db.createCollection('menus');

// Create indexes for restaurants
db.restaurants.createIndex({ 'address.location': '2dsphere' });
db.restaurants.createIndex({ city_id: 1, is_online: 1, status: 1 });
db.restaurants.createIndex({ owner_id: 1 });
db.restaurants.createIndex({ slug: 1 }, { unique: true });
db.restaurants.createIndex({ cuisine_types: 1 });
db.restaurants.createIndex(
  { name: 'text', description: 'text' },
  { name: 'restaurant_text_search' },
);

// Create index for menus
db.menus.createIndex({ restaurant_id: 1 }, { unique: true });

// Create a user with readWrite access to this database
db.createUser({
  user: 'dashdine',
  pwd: 'dev_password',
  roles: [{ role: 'readWrite', db: 'dashdine_restaurants' }],
});

print('✅ dashdine_restaurants database initialized');

// Switch to notifications database
db = db.getSiblingDB('dashdine_notifications');

db.createCollection('notifications');
db.createCollection('device_tokens');

// Create indexes for notifications
db.notifications.createIndex({ user_id: 1, created_at: -1 });
db.notifications.createIndex({ user_id: 1, is_read: 1 });
db.notifications.createIndex(
  { expires_at: 1 },
  { expireAfterSeconds: 0 }, // TTL index: auto-delete expired notifications
);
db.notifications.createIndex({ delivery_status: 1 });

// Create indexes for device tokens
db.device_tokens.createIndex({ user_id: 1, is_active: 1 });
db.device_tokens.createIndex({ token: 1 }, { unique: true });

db.createUser({
  user: 'dashdine',
  pwd: 'dev_password',
  roles: [{ role: 'readWrite', db: 'dashdine_notifications' }],
});

print('✅ dashdine_notifications database initialized');
