import Review from "../models/reviewModel.js";
import Movie from "../models/movieModel.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

const MAX_REVIEWS_PER_MOVIE = 100;

const createReview = catchAsync(async (req, res, next) => {
  const { movieId } = req.params;

  const movie = await Movie.findById(movieId);
  if (!movie) {
    return next(new AppError("Movie not found", 404));
  }

  const { rating, comment } = req.body;
  const newReview = await Review.create({
    movie: movieId,
    reviewerName: req.user.name,
    rating,
    comment,
  });

  res.status(201).json(newReview);
});

const getReviewsForMovie = catchAsync(async (req, res) => {
  const { movieId } = req.params;
  const reviews = await Review.find({ movie: movieId })
    .sort({ createdAt: -1 })
    .limit(MAX_REVIEWS_PER_MOVIE)
    .lean();
  res.status(200).json(reviews);
});

const getReviewById = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate(
    "movie",
    "title director year",
  );
  if (!review) {
    return next(new AppError("Review not found", 404));
  }
  res.status(200).json(review);
});

const updateReview = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;
  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    { rating, comment },
    { returnDocument: "after", runValidators: true },
  );
  if (!updatedReview) {
    return next(new AppError("Review not found", 404));
  }
  res.status(200).json(updatedReview);
});

const deleteReview = catchAsync(async (req, res, next) => {
  const deleted = await Review.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return next(new AppError("Review not found", 404));
  }
  res.status(204).send();
});

export default {
  createReview,
  getReviewsForMovie,
  getReviewById,
  updateReview,
  deleteReview,
};
