/**
 * In-memory sliding-window rate limiter middleware for AI endpoints.
 * Limits users/IPs to a maximum number of requests within a time window.
 */

const requestStore = new Map();

// Cleanup stale entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestStore.entries()) {
    const valid = timestamps.filter(ts => now - ts < 60000);
    if (valid.length === 0) {
      requestStore.delete(key);
    } else {
      requestStore.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

const aiRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute window
  const maxRequests = options.max || 10; // 10 requests per minute

  return (req, res, next) => {
    // Identifier based on authenticated user ID or client IP
    const clientId = req.user?.id?.toString() || req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const now = Date.now();

    const userTimestamps = requestStore.get(clientId) || [];
    // Keep only timestamps within windowMs
    const recentRequests = userTimestamps.filter(ts => now - ts < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: "Rate limit exceeded. Too many AI requests. Please wait a minute before trying again."
      });
    }

    recentRequests.push(now);
    requestStore.set(clientId, recentRequests);

    next();
  };
};

module.exports = aiRateLimiter;
