import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import movieRoutes from "./routes/movieRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import limiter from "./middleware/rateLimiter.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors());
app.use(limiter);
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/movies", movieRoutes);
app.use("/api/reviews", reviewRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
