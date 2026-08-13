import express from "express";
import movieController from "../controllers/movieController.js";

const router = express.Router();

router.get("/", movieController.getAllMovies);
router.get("/:id", movieController.getMovieById);
router.post("/", movieController.createMovie);
router.put("/:id", movieController.updateMovie);
router.patch("/:id", movieController.patchMovie);
router.delete("/:id", movieController.deleteMovie);

export default router;
