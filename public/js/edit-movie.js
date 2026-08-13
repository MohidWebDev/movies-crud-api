const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

const form = document.getElementById("edit-movie-form");

const loadMovie = async () => {
  try {
    const res = await fetch(`/api/movies/${movieId}`);
    if (!res.ok) throw new Error("Movie not found");

    const movie = await res.json();

    document.getElementById("title").value = movie.title;
    document.getElementById("director").value = movie.director;
    document.getElementById("year").value = movie.year;
    document.getElementById("genre").value = movie.genre;
  } catch (err) {
    alert("Failed to load movie details.");
  }
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const updatedMovie = {
    title: document.getElementById("title").value,
    director: document.getElementById("director").value,
    year: Number(document.getElementById("year").value),
    genre: document.getElementById("genre").value,
  };

  try {
    const res = await fetch(`/api/movies/${movieId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMovie),
    });

    if (!res.ok) throw new Error("Failed to update movie");

    window.location.href = "movies.html";
  } catch (err) {
    alert("Something went wrong while updating the movie.");
  }
});

loadMovie();
