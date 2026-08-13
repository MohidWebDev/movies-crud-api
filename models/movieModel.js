import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "../data/movies.json");

let movies = JSON.parse(readFileSync(dataPath, "utf-8"));

const saveMovies = () => {
  writeFileSync(dataPath, JSON.stringify(movies, null, 2));
};

const getAllMovies = () => movies;

const getMovieById = (id) => movies.find((movie) => movie.id === Number(id));

const createMovie = (movieData) => {
  const newMovie = {
    id: movies.length ? movies[movies.length - 1].id + 1 : 1,
    ...movieData,
  };
  movies.push(newMovie);
  saveMovies();
  return newMovie;
};

const updateMovie = (id, movieData) => {
  const index = movies.findIndex((movie) => movie.id === Number(id));
  if (index === -1) return null;

  movies[index] = { id: Number(id), ...movieData };
  saveMovies();
  return movies[index];
};

const patchMovie = (id, updates) => {
  const index = movies.findIndex((movie) => movie.id === Number(id));
  if (index === -1) return null;

  movies[index] = { ...movies[index], ...updates };
  saveMovies();
  return movies[index];
};

const deleteMovie = (id) => {
  const index = movies.findIndex((movie) => movie.id === Number(id));
  if (index === -1) return false;

  movies.splice(index, 1);
  saveMovies();
  return true;
};

export default {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  patchMovie,
  deleteMovie,
};
