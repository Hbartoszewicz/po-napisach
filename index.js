const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

let movies = [];

const randomUsers = [
  "FilmowyLis",
  "KinoManiak",
  "PopcornowyJan",
  "SeansowaOla",
  "RetroWidz",
  "OscarowyFan",
  "PoNapisachUser",
];

function getRandomUser() {
  const index = Math.floor(Math.random() * randomUsers.length);
  return randomUsers[index];
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
      (movie.title.toLowerCase() === title.toLowerCase() &&
        movie.year === year),
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
        title: data.Title,
        year: data.Year,
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

app.post("/api/movies", async (req, res) => {
  console.log("Otrzymano POST /api/movies");
  console.log("Body:", req.body);

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

  console.log("Wyciągnięte IMDb ID:", imdbId);

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

  console.log("Dane filmu z API:", movieFromApi);

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

  res.status(201).json({
    message: "Film został dodany.",
    movie,
  });
});

app.post("/api/movies/:id/comments", (req, res) => {
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
    user: getRandomUser(),
    date: new Date().toLocaleString("pl-PL"),
  };

  movie.comments.push(comment);

  res.status(201).json({
    message: "Komentarz został opublikowany.",
    comment,
  });
});

app.listen(PORT, () => {
  console.log(`Serwer działa: http://localhost:${PORT}`);
});
