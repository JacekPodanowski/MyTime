# Zbuduj i uruchom
docker-compose up --build

# Zatrzymaj
docker-compose down

Aplikacja działa w przeglądarce na: http://localhost:5000

Uwaga: aplikacja używa SQLite (plik w katalogu `database`) — SQLite nie nasłuchuje na porcie TCP. Jeśli potrzebujesz narzędzia WWW do przeglądania bazy (np. sqlite-web), mogę dodać usługę serwera bazy nasłuchującą na porcie `5002`.


