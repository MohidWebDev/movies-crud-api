import mongoose from "mongoose";
import Review from "./reviewModel.js";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
    },
    director: {
      type: String,
      required: [true, "Director is required"],
      trim: true,
      minlength: [2, "Director name must be at least 2 characters"],
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [1888, "Year can't be before the first film ever made"],
      max: [
        new Date().getFullYear() + 1,
        "Year can't be too far in the future",
      ],
      index: true, // supports sorting movies by year
    },
    genre: {
      type: [String],
      required: [true, "At least one genre is required"],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length > 0;
        },
        message: "At least one genre is required",
      },
      enum: {
        values: [
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
        ],
        message: "{VALUE} is not a supported genre",
      },
    },
    poster: {
      url: { type: String },
      publicId: { type: String },
    },
    trailerUrl: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true },
);

movieSchema.index({ genre: 1 });

movieSchema.pre("save", function () {
  this.title = this.title.trim();
});

movieSchema.post("save", function (doc) {
  console.log(`Movie saved: ${doc.title} (${doc._id})`);
});

movieSchema.pre("findOneAndDelete", async function () {
  const filter = this.getFilter();
  await Review.deleteMany({ movie: filter._id });
});

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
