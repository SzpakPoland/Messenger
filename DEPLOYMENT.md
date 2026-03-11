# GalasKomunikator — Instrukcja wdrożenia na VPS

## Stos technologiczny
- **Frontend**: Next.js 14 (Node.js)
- **Backend**: Express.js + Socket.io
- **Baza danych**: MongoDB
- **Reverse proxy**: Nginx
- **Certyfikaty SSL**: Let's Encrypt (Certbot)
- **Process manager**: PM2
- **Domena**: `mmm3000m3.pl`

---

## 1. Wymagania serwera VPS

- System: **Ubuntu 22.04 LTS** (zalecane)
- Minimum: 1 vCPU, 2 GB RAM, 20 GB dysk
- Otwarte porty: `22` (SSH), `80` (HTTP), `443` (HTTPS)

---

## 2. Wstępna konfiguracja serwera

```bash
# Połącz się przez SSH
ssh root@<IP_SERWERA>

# Aktualizacja systemu
apt update && apt upgrade -y

# Firewall — zezwól na SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status

# Utwórz użytkownika (opcjonalnie, ale zalecane)
adduser deploy
usermod -aG sudo deploy
su - deploy
```

---

## 3. Instalacja Node.js (wersja 20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # powinno wyświetlić v20.x.x
npm -v
```

---

## 4. Instalacja MongoDB

```bash
# Import klucza GPG MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# Uruchom i włącz autostart
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod

# Zabezpiecz MongoDB — utwórz użytkownika admina
mongosh
```

W powłoce `mongosh`:
```javascript
use admin
db.createUser({
  user: "komunikatorAdmin",
  pwd: "ZMIEN_NA_BEZPIECZNE_HASLO",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase"]
})
exit
```

Włącz autoryzację MongoDB:
```bash
sudo nano /etc/mongod.conf
```
Dodaj/zmień sekcję `security`:
```yaml
security:
  authorization: enabled
```
```bash
sudo systemctl restart mongod
```

---

## 5. Instalacja Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 6. Instalacja PM2

```bash
sudo npm install -g pm2
```

---

## 7. Wgranie kodu aplikacji

### Opcja A — przez Git

```bash
cd /var/www
sudo mkdir galas-komunikator
sudo chown deploy:deploy galas-komunikator
cd galas-komunikator

git clone https://github.com/TWOJE_REPO/GalasKomunikator.git .
```

### Opcja B — przez SCP (z lokalnego komputera)

```bash
# Z lokalnego katalogu projektu:
scp -r ./backend deploy@<IP_SERWERA>:/var/www/galas-komunikator/backend
scp -r ./frontend deploy@<IP_SERWERA>:/var/www/galas-komunikator/frontend
```

---

## 8. Konfiguracja zmiennych środowiskowych

### Backend

```bash
cd /var/www/galas-komunikator/backend
cp .env.example .env
nano .env
```

Wypełnij plik `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://komunikatorAdmin:ZMIEN_NA_BEZPIECZNE_HASLO@localhost:27017/galas_komunikator?authSource=admin
JWT_SECRET=WYGENERUJ_MIN_64_LOSOWE_ZNAKI_TU
JWT_EXPIRES_IN=30d
CLIENT_URL=https://mmm3000m3.pl
NODE_ENV=production
```

> Aby wygenerować bezpieczny JWT_SECRET:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Frontend

```bash
cd /var/www/galas-komunikator/frontend
cp .env.example .env.local
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://mmm3000m3.pl
```

---

## 9. Instalacja zależności i build

```bash
# Backend
cd /var/www/galas-komunikator/backend
npm install --production

# Utwórz katalogi na pliki
mkdir -p uploads/avatars uploads/messages

# Frontend
cd /var/www/galas-komunikator/frontend
npm install
npm run build
```

---

## 10. Uruchomienie przez PM2

```bash
# Backend
cd /var/www/galas-komunikator
pm2 start backend/src/server.js --name "gk-backend" --env production

# Frontend (Next.js standalone)
pm2 start npm --name "gk-frontend" -- start --prefix frontend

# Zapisz konfigurację PM2 (autostart po restarcie)
pm2 save
pm2 startup systemd
# Skopiuj i wykonaj wyświetlone polecenie sudo
```

Sprawdź status:
```bash
pm2 list
pm2 logs gk-backend --lines 50
pm2 logs gk-frontend --lines 50
```

---

## 11. Konfiguracja Nginx

```bash
sudo nano /etc/nginx/sites-available/galas-komunikator
```

Wklej poniższą konfigurację (HTTP — tymczasowo, przed SSL):

```nginx
server {
    listen 80;
    server_name mmm3000m3.pl www.mmm3000m3.pl;

    # Zwiększ limity dla plików
    client_max_body_size 25M;

    # ── Frontend (Next.js) ──────────────────────────────
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ── Backend API ─────────────────────────────────────
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ── Socket.io ───────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # ── Pliki statyczne (uploady) ───────────────────────
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

```bash
# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/galas-komunikator /etc/nginx/sites-enabled/
sudo nginx -t           # sprawdź poprawność
sudo systemctl reload nginx
```

---

## 12. Konfiguracja DNS domeny

W panelu rejestratora domeny `mmm3000m3.pl` dodaj rekordy DNS:

| Typ   | Nazwa | Wartość           | TTL  |
|-------|-------|-------------------|------|
| A     | @     | `<IP_SERWERA>`    | 3600 |
| A     | www   | `<IP_SERWERA>`    | 3600 |

Zmiany DNS mogą zająć do 24-48 godzin. Sprawdź propagację:
```bash
nslookup mmm3000m3.pl
```

---

## 13. Certyfikat SSL (HTTPS) — Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

# Uzyskaj certyfikat (po propagacji DNS)
sudo certbot --nginx -d mmm3000m3.pl -d www.mmm3000m3.pl

# Podaj email, zaakceptuj warunki, wybierz przekierowanie HTTP → HTTPS
```

Certbot automatycznie zmodyfikuje konfigurację Nginx, dodając SSL.

Sprawdź automatyczne odnawianie:
```bash
sudo certbot renew --dry-run
```

---

## 14. Finalna konfiguracja Nginx z SSL

Po uruchomieniu certbot plik `/etc/nginx/sites-available/galas-komunikator` zostanie zaktualizowany automatycznie. Zweryfikuj go:

```bash
sudo cat /etc/nginx/sites-available/galas-komunikator
sudo nginx -t && sudo systemctl reload nginx
```

---

## 15. Weryfikacja działania

```bash
# Sprawdź czy aplikacja odpowiada
curl -I https://mmm3000m3.pl
curl https://mmm3000m3.pl/api/health

# Logi PM2
pm2 logs --lines 100

# Status MongoDB
sudo systemctl status mongod

# Status Nginx
sudo systemctl status nginx

# Status usług PM2
pm2 list
```

---

## 16. Aktualizacja aplikacji (deployment)

```bash
cd /var/www/galas-komunikator

# Pobierz zmiany z Git
git pull origin main

# Backend — reinstalacja i restart
cd backend && npm install --production
pm2 restart gk-backend

# Frontend — rebuild i restart
cd ../frontend && npm install && npm run build
pm2 restart gk-frontend
```

---

## 17. Backup bazy danych

```bash
# Ręczny backup
mongodump \
  --uri="mongodb://komunikatorAdmin:HASLO@localhost:27017/galas_komunikator?authSource=admin" \
  --out=/var/backups/mongo/$(date +%Y%m%d_%H%M%S)

# Automatyczny backup (codziennie o 3:00)
sudo crontab -e
# Dodaj linię:
0 3 * * * mongodump --uri="mongodb://komunikatorAdmin:HASLO@localhost:27017/galas_komunikator?authSource=admin" --out=/var/backups/mongo/$(date +\%Y\%m\%d_\%H\%M\%S) && find /var/backups/mongo -mtime +7 -exec rm -rf {} +
```

---

## 18. Monitoring i logi

```bash
# PM2 monitoring (real-time)
pm2 monit

# Logi Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logi MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Stan zasobów
htop
df -h     # przestrzeń dyskowa
free -h   # RAM
```

---

## 19. Rozwiązywanie problemów

### Port zajęty
```bash
sudo lsof -i :5000
sudo lsof -i :3000
sudo kill -9 <PID>
```

### PM2 nie startuje po restarcie serwera
```bash
pm2 save
pm2 startup
# Wykonaj polecenie wyświetlone przez PM2
```

### MongoDB connection refused
```bash
sudo systemctl start mongod
sudo systemctl status mongod
# Sprawdź logi:
sudo journalctl -u mongod -n 50
```

### Certbot — błąd weryfikacji domeny
```bash
# Upewnij się że port 80 jest otwarty i Nginx działa
sudo ufw status
sudo systemctl status nginx
# Spróbuj ponownie:
sudo certbot --nginx -d mmm3000m3.pl
```

---

## Podsumowanie portów

| Usługa       | Port  | Opis                          |
|--------------|-------|-------------------------------|
| Nginx        | 80    | HTTP (redirect do HTTPS)      |
| Nginx        | 443   | HTTPS (proxy do 3000 i 5000)  |
| Next.js      | 3000  | Frontend (tylko localhost)    |
| Express      | 5000  | Backend + Socket.io (tylko localhost) |
| MongoDB      | 27017 | Baza danych (tylko localhost) |

> ⚠️ Porty 5000, 3000 i 27017 **nie** powinny być publicznie dostępne — Nginx działa jako jedyna bramka.

---

## Zmienne środowiskowe — Produkcja

### `backend/.env`
```
PORT=5000
MONGODB_URI=mongodb://komunikatorAdmin:BEZPIECZNE_HASLO@localhost:27017/galas_komunikator?authSource=admin
JWT_SECRET=<64+ losowych znaków hex>
JWT_EXPIRES_IN=30d
CLIENT_URL=https://mmm3000m3.pl
NODE_ENV=production
```

### `frontend/.env.local`
```
NEXT_PUBLIC_API_URL=https://mmm3000m3.pl
```
