const form = document.getElementById("add-movie-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const movie = {
    title: document.getElementById("title").value,
    director: document.getElementById("director").value,
    year: Number(document.getElementById("year").value),
    genre: document.getElementById("genre").value,
  };

  try {
    const res = await fetch("/api/movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movie),
    });

    if (!res.ok) throw new Error("Failed to add movie");

    window.location.href = "movies.html";
  } catch (err) {
    alert("Something went wrong while adding the movie.");
  }
});
