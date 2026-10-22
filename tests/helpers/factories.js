import Movie from "../../models/movieModel.js";

export const movieData = (overrides = {}) => ({
  title: "Inception",
  director: "Christopher Nolan",
  year: 2010,
  genre: ["Sci-Fi", "Thriller"],
  trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
  ...overrides,
});

export const createMovie = (overrides = {}) =>
  Movie.create(movieData(overrides));
