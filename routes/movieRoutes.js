import express from "express";
import movieController from "../controllers/movieController.js";
import {
  movieValidationRules,
  movieIdValidationRule,
  getMoviesQueryValidationRules,
} from "../middleware/validators/movieValidator.js";
import validateRequest from "../middleware/validateRequest.js";
import upload from "../middleware/upload.js";
import reviewRoutes from "./reviewRoutes.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use("/:movieId/reviews", reviewRoutes);

router.get(
  "/",
  getMoviesQueryValidationRules,
  validateRequest,
  movieController.getAllMovies,
);

router.get("/stats", movieController.getMovieStats);

router.get(
  "/:id",
  movieIdValidationRule,
  validateRequest,
  movieController.getMovieById,
);
router.post(
  "/",
  protect,
  movieValidationRules,
  validateRequest,
  movieController.createMovie,
);
router.post(
  "/:id/poster",
  protect,
  movieIdValidationRule,
  validateRequest,
  upload.single("poster"),
  movieController.uploadPoster,
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  [...movieIdValidationRule, ...movieValidationRules],
  validateRequest,
  movieController.updateMovie,
);
router.patch(
  "/:id",
  protect,
  authorize("admin"),
  movieIdValidationRule,
  validateRequest,
  movieController.patchMovie,
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  movieIdValidationRule,
  validateRequest,
  movieController.deleteMovie,
);

export default router;
