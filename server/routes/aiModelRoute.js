const { Router } = require("express");
const run = require("../aiModel");
const { protect } = require("../middleware/authMiddleware");
const aiRateLimiter = require("../middleware/aiRateLimiter");

const router = Router();

// Apply authentication middleware and rate limiter to protect against unauthorized access and DoS
router.post(
  "/prompt",
  protect,
  aiRateLimiter({ windowMs: 60 * 1000, max: 10 }),
  async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return res.status(400).json({ error: "Prompt must be a non-empty string" });
      }

      // Payload size restriction to prevent DoS via massive strings
      if (prompt.length > 1000) {
        return res.status(400).json({
          error: "Prompt exceeds maximum allowed length of 1000 characters",
        });
      }

      const response = await run(prompt);
      res.json({ success: true, response });
    } catch (err) {
      console.error("Error in /api/ai/prompt:", err);
      res.status(500).json({ error: "Internal server error processing AI prompt" });
    }
  }
);

module.exports = router;