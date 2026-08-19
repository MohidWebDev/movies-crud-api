import { body, param } from "express-validator";

export const movieValidationRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("director").trim().notEmpty().withMessage("Director is required"),
  body("year")
    .isInt({ min: 1888, max: 2100 })
    .withMessage("Year must be a valid number"),
  body("genre").trim().notEmpty().withMessage("Genre is required"),
];

export const movieIdValidationRule = [
  param("id").isMongoId().withMessage("Invalid movie ID"),
];
