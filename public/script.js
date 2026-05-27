const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const userPanel = document.getElementById("userPanel");
const currentUser = document.getElementById("currentUser");
const logoutButton = document.getElementById("logoutButton");
const loginMessage = document.getElementById("loginMessage");
const movieForm = document.getElementById("movieForm");
const movieLoginInfo = document.getElementById("movieLoginInfo");
const message = document.getElementById("message");
const moviesList = document.getElementById("moviesList");

let loggedUser = null;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const voteKey = (movieId, commentId) => `po-napisach-voted-${movieId}-${commentId}`;
const hasVoted = (movieId, commentId) => localStorage.getItem(voteKey(movieId, commentId)) === "true";
const setVoted = (movieId, commentId) => localStorage.setItem(voteKey(movieId, commentId), "true");

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  return { response, result };
}

function updateAuthView() {
  const isLogged = Boolean(loggedUser);

  loginForm.classList.toggle("hidden", isLogged);
  userPanel.classList.toggle("hidden", !isLogged);
  movieForm.classList.toggle("hidden", !isLogged);
  movieLoginInfo.classList.toggle("hidden", isLogged);
  currentUser.textContent = loggedUser || "";
}

async function loadSession() {
  const response = await fetch("/api/session");
  const session = await response.json();

  loggedUser = session.username;
  updateAuthView();
}

async function loadMovies() {
  const response = await fetch("/api/movies");
  renderMovies(await response.json());
}

function renderComments(movie) {
  if (movie.comments.length === 0) {
    return "<li>Brak komentarzy.</li>";
  }

  return movie.comments
    .map((comment) => {
      const disabled = hasVoted(movie.id, comment.id) ? "disabled" : "";
      const voteButtons = loggedUser
        ? `
          <button type="button" class="vote-button" data-movie-id="${movie.id}" data-comment-id="${comment.id}" data-vote="1" ${disabled}>+</button>
          <button type="button" class="vote-button" data-movie-id="${movie.id}" data-comment-id="${comment.id}" data-vote="-1" ${disabled}>-</button>
        `
        : "";

      return `
        <li>
          <div class="comment-top">
            <span>
              <strong>${escapeHtml(comment.user)}</strong>
              <small>(${escapeHtml(comment.date)})</small>
            </span>
            <span class="comment-votes">
              <strong>${Number(comment.score || 0)}</strong>
              ${voteButtons}
            </span>
          </div>
          <p>${escapeHtml(comment.text)}</p>
        </li>
      `;
    })
    .join("");
}

function renderDetails(movie) {
  const details = [
    ["Gatunek", movie.genre],
    ["Reżyser", movie.director],
    ["Aktorzy", movie.actors],
    ["Czas trwania", movie.runtime],
    ["Premiera", movie.released],
    ["Kraj", movie.country],
    ["Ocena IMDb", movie.imdbRating !== "N/A" ? movie.imdbRating : ""],
    ["Opis", movie.plot],
  ];

  return details
    .filter(([, value]) => value)
    .map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`)
    .join("");
}

function renderMovies(movies) {
  if (movies.length === 0) {
    moviesList.innerHTML = `<p class="empty">Nie dodano jeszcze żadnych filmów.</p>`;
    return;
  }

  moviesList.innerHTML = movies
    .map(
      (movie) => `
        <article class="movie-card">
          <img class="movie-poster" src="${escapeHtml(movie.poster)}" alt="Plakat filmu ${escapeHtml(movie.title)}" />

          <div class="movie-info">
            <h3>${escapeHtml(movie.title)} (${escapeHtml(movie.year)})</h3>
            <a class="movie-link" href="${escapeHtml(movie.url)}" target="_blank">Otwórz stronę filmu</a>

            <div class="movie-details">${renderDetails(movie)}</div>
            <p><strong>Liczba komentarzy:</strong> ${movie.comments.length}</p>

            ${
              loggedUser
                ? `
                  <form class="comment-form" data-id="${movie.id}">
                    <input type="text" placeholder="Napisz komentarz..." />
                    <button type="submit">Opublikuj</button>
                  </form>
                `
                : `<p class="login-required">Zaloguj się, aby dodać komentarz.</p>`
            }

            <ul class="comments">${renderComments(movie)}</ul>
          </div>
        </article>
      `,
    )
    .join("");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { response, result } = await postJson("/api/login", { username: usernameInput.value });

  if (!response.ok) {
    showMessage(loginMessage, result.message, "error");
    return;
  }

  loggedUser = result.username;
  usernameInput.value = "";
  showMessage(loginMessage, result.message, "success");
  updateAuthView();
  loadMovies();
});

logoutButton.addEventListener("click", async () => {
  const { result } = await postJson("/api/logout");

  loggedUser = null;
  showMessage(loginMessage, result.message, "success");
  updateAuthView();
  loadMovies();
});

movieForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { response, result } = await postJson("/api/movies", {
    url: document.getElementById("movieUrl").value,
    title: document.getElementById("movieTitle").value,
    year: document.getElementById("movieYear").value,
  });

  if (!response.ok) {
    showMessage(message, result.message, "error");
    return;
  }

  showMessage(message, result.message, "success");
  movieForm.reset();
  loadMovies();
});

moviesList.addEventListener("submit", async (event) => {
  if (!event.target.classList.contains("comment-form")) {
    return;
  }

  event.preventDefault();

  const form = event.target;
  const input = form.querySelector("input");
  const { response, result } = await postJson(`/api/movies/${form.dataset.id}/comments`, {
    text: input.value,
  });

  if (!response.ok) {
    showMessage(message, result.message, "error");
    return;
  }

  showMessage(message, result.message, "success");
  input.value = "";
  loadMovies();
});

moviesList.addEventListener("click", async (event) => {
  if (!event.target.classList.contains("vote-button")) {
    return;
  }

  const button = event.target;
  const movieId = button.dataset.movieId;
  const commentId = button.dataset.commentId;

  if (hasVoted(movieId, commentId)) {
    return;
  }

  const { response, result } = await postJson(
    `/api/movies/${movieId}/comments/${commentId}/vote`,
    { vote: Number(button.dataset.vote) },
  );

  if (!response.ok) {
    showMessage(message, result.message, "error");
    return;
  }

  setVoted(movieId, commentId);
  loadMovies();
});

async function init() {
  await loadSession();
  await loadMovies();
}

init();
