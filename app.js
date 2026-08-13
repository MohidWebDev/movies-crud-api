import express from "express";
import cors from "cors";
import morgan from "morgan";
import movieRoutes from "./routes/movieRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use(express.static("public"));

app.use("/api/movies", movieRoutes);

app.use(errorHandler);

export default app;
