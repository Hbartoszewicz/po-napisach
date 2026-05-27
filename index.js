const express = require("express");
const session = require("express-session");
const path = require("path");
const JSONdb = require("simple-json-db");

const app = express();
const PORT = 3000;
const db = new JSONdb(path.join(__dirname, "database.json"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "po-napisach-session-secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(express.static(path.join(__dirname, "public")));

let movies = db.get("movies") || [];

function saveMovies() {
  db.set("movies", movies);
}

function normalizeStoredMovies() {
  movies.forEach((movie) => {
    movie.comments.forEach((comment) => {
      comment.score = Number(comment.score || 0);
      delete comment.votes;
    });
  });
}

normalizeStoredMovies();
saveMovies();

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({
      message: "Musisz się zalogować, aby wykonać tę akcję.",
    });
  }

  next();
}

function isValidUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function extractImdbId(url) {
  const match = url.match(/tt\d+/);
  return match ? match[0] : null;
}

function movieExists(imdbId, url, title, year) {
  return movies.some(
    (movie) =>
      movie.imdbId === imdbId ||
      movie.url.toLowerCase() === url.toLowerCase() ||
      (movie.title.toLowerCase() === title.toLowerCase() && movie.year === year),
  );
}

async function fetchMovieFromOmdb(imdbId) {
  try {
    const apiUrl = `https://www.omdbapi.com/demo.aspx/?i=${imdbId}&token=demo`;

    console.log("Wysyłam request do OMDb:", apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log("Odpowiedź OMDb:", data);

    if (data.Response === "True") {
      return {
        rated: data.Rated,
        released: data.Released,
        runtime: data.Runtime,
        genre: data.Genre,
        director: data.Director,
        writer: data.Writer,
        actors: data.Actors,
        plot: data.Plot,
        country: data.Country,
        poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
        imdbRating: data.imdbRating,
        imdbVotes: data.imdbVotes,
        type: data.Type,
      };
    }

    console.log("Nie udało się pobrać danych filmu.");
    return null;
  } catch (error) {
    console.error("Błąd pobierania danych filmu:", error.message);
    return null;
  }
}

app.get("/api/movies", (req, res) => {
  res.json(movies);
});

app.get("/api/session", (req, res) => {
  res.json({
    username: req.session.username || null,
  });
});

app.post("/api/login", (req, res) => {
  const username = normalizeText(req.body.username);

  if (!username) {
    return res.status(400).json({
      message: "Podaj nazwę użytkownika.",
    });
  }

  req.session.username = username;

  res.json({
    message: "Zalogowano.",
    username,
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      message: "Wylogowano.",
    });
  });
});

app.post("/api/movies", requireLogin, async (req, res) => {
  const url = normalizeText(req.body.url);
  const title = normalizeText(req.body.title);
  const year = normalizeText(req.body.year);

  if (!url || !title || !year) {
    return res.status(400).json({
      message: "Wszystkie pola formularza muszą być wypełnione.",
    });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({
      message: "Adres URL musi zaczynać się od http:// lub https://.",
    });
  }

  if (!/^\d{4}$/.test(year)) {
    return res.status(400).json({
      message: "Rok produkcji powinien składać się z 4 cyfr.",
    });
  }

  const imdbId = extractImdbId(url);

  if (!imdbId) {
    return res.status(400).json({
      message: "Adres URL musi zawierać poprawne IMDb ID, np. tt0111161.",
    });
  }

  if (movieExists(imdbId, url, title, year)) {
    return res.status(409).json({
      message: "Ten film został już dodany do listy.",
    });
  }

  const movieFromApi = await fetchMovieFromOmdb(imdbId);

  const movie = {
    id: Date.now().toString(),
    imdbId,
    url,
    title,
    year,
    poster:
      movieFromApi?.poster ||
      `https://placehold.co/300x450?text=${encodeURIComponent(title)}`,
    rated: movieFromApi?.rated || "",
    released: movieFromApi?.released || "",
    runtime: movieFromApi?.runtime || "",
    genre: movieFromApi?.genre || "",
    director: movieFromApi?.director || "",
    writer: movieFromApi?.writer || "",
    actors: movieFromApi?.actors || "",
    plot: movieFromApi?.plot || "",
    country: movieFromApi?.country || "",
    imdbRating: movieFromApi?.imdbRating || "",
    imdbVotes: movieFromApi?.imdbVotes || "",
    type: movieFromApi?.type || "",
    comments: [],
  };

  movies.push(movie);
  saveMovies();

  res.status(201).json({
    message: "Film został dodany.",
    movie,
  });
});

app.post("/api/movies/:id/comments", requireLogin, (req, res) => {
  const movie = movies.find((item) => item.id === req.params.id);
  const text = normalizeText(req.body.text);

  if (!movie) {
    return res.status(404).json({
      message: "Nie znaleziono filmu.",
    });
  }

  if (!text) {
    return res.status(400).json({
      message: "Treść komentarza nie może być pusta.",
    });
  }

  const comment = {
    id: Date.now().toString(),
    text,
    user: req.session.username,
    date: new Date().toLocaleString("pl-PL"),
    score: 0,
  };

  movie.comments.push(comment);
  saveMovies();

  res.status(201).json({
    message: "Komentarz został opublikowany.",
    comment,
  });
});

app.post("/api/movies/:movieId/comments/:commentId/vote", requireLogin, (req, res) => {
  const movie = movies.find((item) => item.id === req.params.movieId);
  const vote = Number(req.body.vote);

  if (!movie) {
    return res.status(404).json({
      message: "Nie znaleziono filmu.",
    });
  }

  const comment = movie.comments.find((item) => item.id === req.params.commentId);

  if (!comment) {
    return res.status(404).json({
      message: "Nie znaleziono komentarza.",
    });
  }

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({
      message: "Nieprawidłowy głos.",
    });
  }

  comment.score = Number(comment.score || 0) + vote;
  delete comment.votes;
  saveMovies();

  res.json({
    message: "Głos zapisany.",
    score: comment.score,
  });
});

app.listen(PORT, () => {
  console.log(`Serwer działa: http://localhost:${PORT}`);
});
