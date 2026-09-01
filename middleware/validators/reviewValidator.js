import { body, param } from "express-validator";

export const reviewValidationRules = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be a number between 1 and 5"),
  body("comment").optional().trim(),
];

export const movieIdParamValidationRule = [
  param("movieId").isMongoId().withMessage("Invalid movie ID"),
];

export const reviewIdParamValidationRule = [
  param("id").isMongoId().withMessage("Invalid review ID"),
];
