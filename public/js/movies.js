const movieList = document.getElementById("movie-list");

const fetchMovies = async () => {
  try {
    const res = await fetch("/api/movies");
    const movies = await res.json();
    renderMovies(movies);
  } catch (err) {
    movieList.innerHTML = "<p>Failed to load movies.</p>";
  }
};

const renderMovies = (movies) => {
  movieList.innerHTML = "";
  movieList.className = "movies-grid";

  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.className = "movie-card";

    card.innerHTML = `
      <div>
        <strong>${movie.title}</strong> (${movie.year})<br>
        ${movie.director} — ${movie.genre}
      </div>
      <div class="movie-actions">
        <a href="edit-movie.html?id=${movie._id}" class="btn">Edit</a>
        <button data-id="${movie._id}" class="delete-btn">Delete</button>
      </div>
    `;

    movieList.appendChild(card);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDelete);
  });
};

let pendingDeleteId = null;

const handleDelete = (e) => {
  pendingDeleteId = e.target.dataset.id;
  document.getElementById("confirm-modal").classList.add("active");
};

const confirmDelete = async () => {
  try {
    await fetch(`/api/movies/${pendingDeleteId}`, { method: "DELETE" });
    fetchMovies();
  } catch (err) {
    alert("Failed to delete movie.");
  } finally {
    closeModal();
  }
};

const closeModal = () => {
  pendingDeleteId = null;
  document.getElementById("confirm-modal").classList.remove("active");
};

document
  .getElementById("confirm-delete-btn")
  .addEventListener("click", confirmDelete);
document
  .getElementById("cancel-delete-btn")
  .addEventListener("click", closeModal);

fetchMovies();
