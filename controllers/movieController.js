import Movie from "../models/movieModel.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import fs from "fs";
import path from "path";

const getAllMovies = catchAsync(async (req, res) => {
  const movies = await Movie.find();
  res.status(200).json(movies);
});

const getMovieById = catchAsync(async (req, res, next) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    return next(new AppError("Movie not found", 404));
  }
  res.status(200).json(movie);
});

const createMovie = catchAsync(async (req, res) => {
  const { title, director, year, genre } = req.body;
  const newMovie = await Movie.create({ title, director, year, genre });
  res.status(201).json(newMovie);
});

const uploadPoster = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    return next(new AppError("Movie not found", 404));
  }

  if (movie.poster) {
    const oldPath = path.join("public/uploads", movie.poster);
    fs.unlink(oldPath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("Failed to delete old poster:", err);
      }
    });
  }

  movie.poster = req.file.filename;
  await movie.save();

  res.status(200).json(movie);
});

const updateMovie = catchAsync(async (req, res, next) => {
  const { title, director, year, genre } = req.body;
  const updatedMovie = await Movie.findByIdAndUpdate(
    req.params.id,
    { title, director, year, genre },
    { new: true, runValidators: true },
  );
  if (!updatedMovie) {
    return next(new AppError("Movie not found", 404));
  }
  res.status(200).json(updatedMovie);
});

const patchMovie = catchAsync(async (req, res, next) => {
  const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!updatedMovie) {
    return next(new AppError("Movie not found", 404));
  }
  res.status(200).json(updatedMovie);
});

const deleteMovie = catchAsync(async (req, res, next) => {
  const deleted = await Movie.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return next(new AppError("Movie not found", 404));
  }
  res.status(204).send();
});

export default {
  getAllMovies,
  getMovieById,
  createMovie,
  uploadPoster,
  updateMovie,
  patchMovie,
  deleteMovie,
};
