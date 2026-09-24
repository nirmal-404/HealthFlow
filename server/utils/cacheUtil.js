// Import Redis client
const { createClient } = require("redis");

// In-memory cache as fallback when Redis is unavailable
let permissionsCache = {};

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Redis connection management
let redisConnected = false;

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    redisConnected = true;
    console.log("Connected to Redis server successfully");
    return true;
  } catch (error) {
    redisConnected = false;
    console.warn(
      "Redis connection failed, using in-memory cache instead:",
      error.message
    );
    return false;
  }
};

// Initialize Redis connection
connectRedis().catch((err) => {
  console.warn(
    "Redis initial connection failed, using in-memory cache:",
    err.message
  );
});

// Get cached permissions
const getPermissionsFromCache = async (roleId) => {
  try {
    // Try to get from Redis if connected
    if (redisConnected) {
      const cachedPermissions = await redisClient.get(`permissions:${roleId}`);
      if (cachedPermissions) {
        return JSON.parse(cachedPermissions);
      }
    }
  } catch (error) {
    console.warn(
      "Error getting permissions from Redis, falling back to in-memory cache:",
      error.message
    );
  }

  // Fallback to in-memory cache
  return permissionsCache[roleId];
};

// Set permissions to cache
const setPermissionsInCache = async (roleId, permissions) => {
  try {
    // Try to store in Redis if connected
    if (redisConnected) {
      await redisClient.set(
        `permissions:${roleId}`,
        JSON.stringify(permissions),
        {
          EX: 86400, // 24 hours expiration
        }
      );
    }
  } catch (error) {
    console.warn(
      "Error setting permissions in Redis, falling back to in-memory cache:",
      error.message
    );
  }

  // Always store in memory as fallback
  permissionsCache[roleId] = permissions;
};

// Remove permissions from cache (used when logging out or when role changes)
const removePermissionsFromCache = async (roleId) => {
  try {
    // Try to remove from Redis if connected
    if (redisConnected) {
      await redisClient.del(`permissions:${roleId}`);
    }
  } catch (error) {
    console.warn("Error removing permissions from Redis:", error.message);
  }

  // Always remove from memory cache
  delete permissionsCache[roleId];
};

// In-memory cache implementation
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

// Cache appointment details for 2 hours
const APPOINTMENT_CACHE_EXPIRE = 2 * 60 * 60; // 2 hours in seconds

const cacheUtil = {
  // Store appointment details during payment process
  async cacheAppointmentDetails(orderId, details) {
    try {
      if (!orderId || !details) {
        console.warn("Invalid cache parameters:", {
          orderId,
          hasDetails: !!details,
        });
        return;
      }
      memoryCache.set(orderId, details);
      memoryCacheExpiry.set(
        orderId,
        Date.now() + APPOINTMENT_CACHE_EXPIRE * 1000
      );
      console.log(`Cached appointment details in memory for order: ${orderId}`);
      console.log(
        "Cache expiry:",
        new Date(memoryCacheExpiry.get(orderId)).toISOString()
      );
    } catch (err) {
      console.error("Cache error:", err);
      throw new Error("Failed to cache appointment details: " + err.message);
    }
  },

  // Retrieve appointment details
  async getAppointmentDetails(orderId) {
    try {
      if (!orderId) {
        console.warn("Invalid orderId for cache retrieval");
        return null;
      }

      const memDetails = memoryCache.get(orderId);
      const expiry = memoryCacheExpiry.get(orderId);

      console.log(`Checking cache for order ${orderId}:`, {
        hasDetails: !!memDetails,
        expiry: expiry ? new Date(expiry).toISOString() : null,
        now: new Date().toISOString(),
      });

      if (memDetails && expiry > Date.now()) {
        console.log(
          `Retrieved details from memory cache for order: ${orderId}`
        );
        return memDetails;
      } else if (memDetails) {
        // Clean up expired cache entry
        console.log(`Cache expired for order: ${orderId}`);
        memoryCache.delete(orderId);
        memoryCacheExpiry.delete(orderId);
      }

      console.log(`No cached details found for order: ${orderId}`);
      return null;
    } catch (err) {
      console.error("Cache retrieval error:", err);
      return null;
    }
  },

  // Remove appointment details from cache
  async removeAppointmentDetails(orderId) {
    try {
      if (!orderId) {
        console.warn("Invalid orderId for cache removal");
        return;
      }
      memoryCache.delete(orderId);
      memoryCacheExpiry.delete(orderId);
      console.log(`Removed cached details from memory for order: ${orderId}`);
    } catch (err) {
      console.error("Cache removal error:", err);
      throw new Error(
        "Failed to remove cached appointment details: " + err.message
      );
    }
  },
};

module.exports = {
  getPermissionsFromCache,
  setPermissionsInCache,
  removePermissionsFromCache,
  redisClient,
  connectRedis,
  cacheUtil,
};
