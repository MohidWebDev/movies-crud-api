import { body, param, query } from "express-validator";

export const movieValidationRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("director").trim().notEmpty().withMessage("Director is required"),
  body("year")
    .isInt({ min: 1888, max: 2100 })
    .withMessage("Year must be a valid number"),
  body("genre")
    .isArray({ min: 1 })
    .withMessage("At least one genre is required"),
  body("genre.*")
    .isIn([
      "Action",
      "Adventure",
      "Animation",
      "Comedy",
      "Crime",
      "Documentary",
      "Drama",
      "Family",
      "Fantasy",
      "Historical",
      "Horror",
      "Musical",
      "Mystery",
      "Romance",
      "Sci-Fi",
      "Sports",
      "Thriller",
      "War",
      "Western",
    ])
    .withMessage("Invalid genre selected"),
  body("trailerUrl")
    .optional({ values: "falsy" })
    .trim()
    .matches(
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/,
    )
    .withMessage("Trailer URL must be a valid YouTube link"),
];

export const movieIdValidationRule = [
  param("id").isMongoId().withMessage("Invalid movie ID"),
];

export const getMoviesQueryValidationRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("genre")
    .optional()
    .isIn([
      "Action",
      "Adventure",
      "Animation",
      "Comedy",
      "Crime",
      "Documentary",
      "Drama",
      "Family",
      "Fantasy",
      "Historical",
      "Horror",
      "Musical",
      "Mystery",
      "Romance",
      "Sci-Fi",
      "Sports",
      "Thriller",
      "War",
      "Western",
    ])
    .withMessage("Invalid genre filter"),
  query("sort").optional().isIn(["year"]).withMessage("Invalid sort option"),
];
