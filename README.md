# Po Napisach

Prosty serwis filmowy wykonany w Node.js, Express, HTML, CSS i JavaScript.

## Funkcje

- logowanie użytkownika przez formularz z nazwą użytkownika,
- sesja użytkownika obsługiwana przez `express-session`,
- formularz dodawania filmu dostępny tylko po zalogowaniu,
- walidacja pustych pól,
- walidacja adresu URL zaczynającego się od `http://` albo `https://`,
- sprawdzanie, czy film już istnieje,
- lista dodanych filmów,
- plakat i szczegóły pobierane z API OMDb albo plakat zastępczy,
- dodawanie komentarzy tylko po zalogowaniu,
- komentarz ma datę oraz nazwę użytkownika, który go dodał,
- głosowanie `+` i `-` przy komentarzach,
- blokada ponownego głosowania na komentarz w tej samej przeglądarce przez `localStorage`,
- dane są zapisywane w pliku `database.json` przez `simple-json-db`.

## Uruchomienie

```bash
npm install
npm start
```

Następnie otwórz w przeglądarce:

```text
http://localhost:3000
```
