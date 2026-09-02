import jwt from "jsonwebtoken";
import crypto from "crypto";

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );
};

export default generateRefreshToken;
