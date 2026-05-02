const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const tokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenFromQuery = typeof req.query.token === "string" ? req.query.token : null;
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(payload.userId).select("-password");
    if (!user) {
      return res.status(401).json({ error: "Invalid token user" });
    }
    req.user = user;
    return next();
  } catch (_e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;
