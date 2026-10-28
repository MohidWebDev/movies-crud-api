import Movie from "../models/movieModel.js";
import Review from "../models/reviewModel.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import cloudinary from "../config/cloudinary.js";
import escapeRegex from "../utils/escapeRegex.js";
import { buildStatsPipeline } from "../utils/statsPipeline.js";

const getAllMovies = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  const andConditions = [];

  if (req.query.genre) {
    andConditions.push({ genre: req.query.genre });
  }

  const search = req.query.search?.trim();

  if (search) {
    const pattern = escapeRegex(search);
    const regex = new RegExp(pattern, "i");

    andConditions.push({
      $or: [
        { title: regex },
        { director: regex },
        { genre: regex },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$year" },
              regex: pattern,
            },
          },
        },
      ],
    });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  const sortOption = req.query.sort === "year" ? { year: 1 } : {};

  const [movies, totalCount] = await Promise.all([
    Movie.find(filter).sort(sortOption).skip(skip).limit(limit),
    Movie.countDocuments(filter),
  ]);

  res.status(200).json({
    data: movies,
    page,
    totalPages: Math.ceil(totalCount / limit),
    totalCount,
  });
});

const getMovieById = catchAsync(async (req, res, next) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    return next(new AppError("Movie not found", 404));
  }
  res.status(200).json(movie);
});

const createMovie = catchAsync(async (req, res) => {
  const { title, director, year, genre, trailerUrl } = req.body;
  const newMovie = await Movie.create({
    title,
    director,
    year,
    genre,
    trailerUrl,
  });
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

  // Delete the old poster from Cloudinary if one exists
  if (movie.poster?.publicId) {
    await cloudinary.uploader.destroy(movie.poster.publicId).catch((err) => {
      console.error("Failed to delete old poster from Cloudinary:", err);
    });
  }

  movie.poster = {
    url: req.file.path,
    publicId: req.file.filename,
  };
  await movie.save();

  res.status(200).json(movie);
});

const updateMovie = catchAsync(async (req, res, next) => {
  const { title, director, year, genre, trailerUrl } = req.body;
  const updatedMovie = await Movie.findByIdAndUpdate(
    req.params.id,
    { title, director, year, genre, trailerUrl },
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

  await Review.deleteMany({ movie: deleted._id });

  if (deleted.poster?.publicId) {
    await cloudinary.uploader.destroy(deleted.poster.publicId).catch((err) => {
      console.error("Failed to delete poster from Cloudinary:", err);
    });
  }

  res.status(204).send();
});

const getMovieStats = catchAsync(async (req, res) => {
  const stats = await Review.aggregate(buildStatsPipeline());
  res.status(200).json(stats);
});

export default {
  getAllMovies,
  getMovieById,
  createMovie,
  uploadPoster,
  updateMovie,
  patchMovie,
  deleteMovie,
  getMovieStats,
};
