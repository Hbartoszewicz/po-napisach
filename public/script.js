const movieForm = document.getElementById("movieForm");
const message = document.getElementById("message");
const moviesList = document.getElementById("moviesList");

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function loadMovies() {
  const response = await fetch("/api/movies");
  const movies = await response.json();

  renderMovies(movies);
}

function renderMovies(movies) {
  moviesList.innerHTML = "";

  if (movies.length === 0) {
    moviesList.innerHTML = `<p class="empty">Nie dodano jeszcze żadnych filmów.</p>`;
    return;
  }

  movies.forEach((movie) => {
    const movieCard = document.createElement("article");
    movieCard.className = "movie-card";

    movieCard.innerHTML = `
  <img class="movie-poster" src="${movie.poster}" alt="Plakat filmu ${movie.title}" />

  <div class="movie-info">
    <h3>${movie.title} (${movie.year})</h3>

    <a class="movie-link" href="${movie.url}" target="_blank">
      Otwórz stronę filmu
    </a>

    <div class="movie-details">
      ${movie.genre ? `<p><strong>Gatunek:</strong> ${movie.genre}</p>` : ""}
      ${movie.director ? `<p><strong>Reżyser:</strong> ${movie.director}</p>` : ""}
      ${movie.actors ? `<p><strong>Aktorzy:</strong> ${movie.actors}</p>` : ""}
      ${movie.runtime ? `<p><strong>Czas trwania:</strong> ${movie.runtime}</p>` : ""}
      ${movie.released ? `<p><strong>Premiera:</strong> ${movie.released}</p>` : ""}
      ${movie.country ? `<p><strong>Kraj:</strong> ${movie.country}</p>` : ""}
      ${movie.imdbRating && movie.imdbRating !== "N/A" ? `<p><strong>Ocena IMDb:</strong> ${movie.imdbRating}</p>` : ""}
      ${movie.plot ? `<p><strong>Opis:</strong> ${movie.plot}</p>` : ""}
    </div>

    <p><strong>Liczba komentarzy:</strong> ${movie.comments.length}</p>

        <form class="comment-form" data-id="${movie.id}">
          <input type="text" placeholder="Napisz komentarz..." />
          <button type="submit">Opublikuj</button>
        </form>

        <ul class="comments">
          ${
            movie.comments.length === 0
              ? "<li>Brak komentarzy.</li>"
              : movie.comments
                  .map(
                    (comment) => `
                  <li>
                    <strong>${comment.user}</strong>
                    <small>(${comment.date})</small><br />
                    ${comment.text}
                  </li>
                `,
                  )
                  .join("")
          }
        </ul>
      </div>
    `;

    moviesList.appendChild(movieCard);
  });

  document.querySelectorAll(".comment-form").forEach((form) => {
    form.addEventListener("submit", addComment);
  });
}

movieForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = document.getElementById("movieUrl").value;
  const title = document.getElementById("movieTitle").value;
  const year = document.getElementById("movieYear").value;

  const response = await fetch("/api/movies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, title, year }),
  });

  const result = await response.json();

  if (!response.ok) {
    showMessage(result.message, "error");
    return;
  }

  showMessage(result.message, "success");
  movieForm.reset();
  loadMovies();
});

async function addComment(event) {
  event.preventDefault();

  const form = event.target;
  const movieId = form.dataset.id;
  const input = form.querySelector("input");
  const text = input.value;

  const response = await fetch(`/api/movies/${movieId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const result = await response.json();

  if (!response.ok) {
    showMessage(result.message, "error");
    return;
  }

  showMessage(result.message, "success");
  input.value = "";
  loadMovies();
}

loadMovies();
