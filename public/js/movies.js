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

const handleDelete = async (e) => {
  const id = e.target.dataset.id;
  if (!confirm("Delete this movie?")) return;

  try {
    await fetch(`/api/movies/${id}`, { method: "DELETE" });
    fetchMovies();
  } catch (err) {
    alert("Failed to delete movie.");
  }
};

fetchMovies();
