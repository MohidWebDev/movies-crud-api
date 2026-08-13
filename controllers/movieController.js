import movieModel from "../models/movieModel.js";

const getAllMovies = (req, res) => {
  const movies = movieModel.getAllMovies();
  res.status(200).json(movies);
};

const getMovieById = (req, res) => {
  const movie = movieModel.getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ message: "Movie not found" });
  }
  res.status(200).json(movie);
};

const createMovie = (req, res) => {
  const { title, director, year, genre } = req.body;
  if (!title || !director || !year || !genre) {
    return res
      .status(400)
      .json({
        message: "All fields are required: title, director, year, genre",
      });
  }
  const newMovie = movieModel.createMovie({ title, director, year, genre });
  res.status(201).json(newMovie);
};

const updateMovie = (req, res) => {
  const { title, director, year, genre } = req.body;
  if (!title || !director || !year || !genre) {
    return res
      .status(400)
      .json({
        message: "All fields are required: title, director, year, genre",
      });
  }
  const updatedMovie = movieModel.updateMovie(req.params.id, {
    title,
    director,
    year,
    genre,
  });
  if (!updatedMovie) {
    return res.status(404).json({ message: "Movie not found" });
  }
  res.status(200).json(updatedMovie);
};

const patchMovie = (req, res) => {
  const updatedMovie = movieModel.patchMovie(req.params.id, req.body);
  if (!updatedMovie) {
    return res.status(404).json({ message: "Movie not found" });
  }
  res.status(200).json(updatedMovie);
};

const deleteMovie = (req, res) => {
  const deleted = movieModel.deleteMovie(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Movie not found" });
  }
  res.status(204).send();
};

export default {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  patchMovie,
  deleteMovie,
};
