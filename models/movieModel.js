import mongoose from "mongoose";

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
    },
    genre: {
      type: String,
      required: [true, "Genre is required"],
      trim: true,
      enum: {
        values: [
          "Action",
          "Comedy",
          "Drama",
          "Sci-Fi",
          "Horror",
          "Romance",
          "Documentary",
          "Thriller",
          "Animation",
        ],
        message: "{VALUE} is not a supported genre",
      },
    },
    poster: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true },
);

// Pre-save hook: normalize title casing/whitespace before saving
movieSchema.pre("save", function () {
  this.title = this.title.trim();
});

// Post-save hook: simple logging
movieSchema.post("save", function (doc) {
  console.log(`Movie saved: ${doc.title} (${doc._id})`);
});

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
