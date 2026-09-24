const jwt = require("jsonwebtoken");

const generateAccessToken = (userId, activeRoleId) => {
  console.log(
    "[JWT] Generating access token for userId:",
    userId,
    "with activeRoleId:",
    activeRoleId
  );

  const token = jwt.sign({ userId, activeRoleId }, process.env.JWT_SECRET, {
    expiresIn: "120m", // Access token valid for 30 minutes
  });

  console.log("[JWT] Access token generated successfully for userId:", userId);
  return token;
};

const verifyToken = (token) => {
  console.log("[JWT] Verifying token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(
      "[JWT] Token verified successfully for userId:",
      decoded.userId
    );
    return { userId: decoded.userId, activeRoleId: decoded.activeRoleId };
  } catch (error) {
    console.error("[JWT] Token verification failed:", error.message);
    throw new Error("Invalid or expired token");
  }
};

module.exports = {
  generateAccessToken,
  verifyToken,
};
