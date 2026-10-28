import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import movieRoutes from "./routes/movieRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import { generalLimiter, authLimiter } from "./middleware/rateLimiter.js";

const app = express();

// Behind a reverse proxy (Render, Railway, Nginx...), set TRUST_PROXY to the
// number of proxies in front of the app, so rate limiting sees each visitor's
// real IP. Leave it unset when the app is reached directly: trusting the
// header there would let anyone fake their IP.
const trustedProxies = Number.parseInt(process.env.TRUST_PROXY, 10);
if (Number.isInteger(trustedProxies) && trustedProxies > 0) {
  app.set("trust proxy", trustedProxies);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(generalLimiter);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/movies", movieRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/auth", authLimiter, authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
