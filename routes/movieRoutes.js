import express from "express";
import movieController from "../controllers/movieController.js";
import {
  movieValidationRules,
  movieIdValidationRule,
} from "../middleware/validators/movieValidator.js";
import validateRequest from "../middleware/validateRequest.js";
import upload from "../middleware/upload.js";
import reviewRoutes from "./reviewRoutes.js";

const router = express.Router();

router.use("/:movieId/reviews", reviewRoutes);

router.get("/", movieController.getAllMovies);
router.get(
  "/:id",
  movieIdValidationRule,
  validateRequest,
  movieController.getMovieById,
);
router.post(
  "/",
  movieValidationRules,
  validateRequest,
  movieController.createMovie,
);
router.post(
  "/:id/poster",
  movieIdValidationRule,
  validateRequest,
  upload.single("poster"),
  movieController.uploadPoster,
);
router.put(
  "/:id",
  [...movieIdValidationRule, ...movieValidationRules],
  validateRequest,
  movieController.updateMovie,
);
router.patch(
  "/:id",
  movieIdValidationRule,
  validateRequest,
  movieController.patchMovie,
);
router.delete(
  "/:id",
  movieIdValidationRule,
  validateRequest,
  movieController.deleteMovie,
);

export default router;
