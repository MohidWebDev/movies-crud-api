import express from "express";
import reviewController from "../controllers/reviewController.js";
import {
  reviewValidationRules,
  movieIdParamValidationRule,
  reviewIdParamValidationRule,
} from "../middleware/validators/reviewValidator.js";
import validateRequest from "../middleware/validateRequest.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true });

// Nested routes — mounted under /api/movies/:movieId/reviews
router.get(
  "/",
  movieIdParamValidationRule,
  validateRequest,
  reviewController.getReviewsForMovie,
);
router.post(
  "/",
  protect,
  [...movieIdParamValidationRule, ...reviewValidationRules],
  validateRequest,
  reviewController.createReview,
);

// Standalone routes — mounted under /api/reviews
router.get(
  "/:id",
  reviewIdParamValidationRule,
  validateRequest,
  reviewController.getReviewById,
);
router.patch(
  "/:id",
  protect,
  authorize("admin"),
  [...reviewIdParamValidationRule, ...reviewValidationRules],
  validateRequest,
  reviewController.updateReview,
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  reviewIdParamValidationRule,
  validateRequest,
  reviewController.deleteReview,
);

export default router;
