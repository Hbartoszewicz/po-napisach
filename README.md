# Po Napisach

Prosty serwis filmowy wykonany w Node.js + Express.

## Funkcje

- formularz dodawania filmu,
- walidacja pustych pól,
- walidacja adresu URL zaczynającego się od `http://` albo `https://`,
- sprawdzanie, czy film już istnieje,
- lista dodanych filmów,
- plakat pobierany z API OMDb albo plakat zastępczy,
- dodawanie komentarzy do filmu,
- komentarz ma datę oraz losową nazwę użytkownika,
- dane są przechowywane tylko w pamięci serwera.

## Uruchomienie

```bash
npm install
node index.js
```

Następnie otwórz w przeglądarce:

```text
http://localhost:3000
```
