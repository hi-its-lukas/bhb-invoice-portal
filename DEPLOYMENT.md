# BHB Invoice & Dunning Portal - Deployment Guide

## Port-Übersicht

| Service      | Port  | Beschreibung                              |
|--------------|-------|-------------------------------------------|
| App (Node)   | 5000  | HTTP API + Frontend (intern)              |
| PostgreSQL   | 5432  | Datenbank (nur intern, nicht exponiert)   |
| Cloudflared  | -     | Kein eingehender Port, ausgehend 443/7844 |

## Erforderliche Umgebungsvariablen

### Pflicht-Variablen

```env
# Datenbank
DATABASE_URL=postgres://portal:sicheresPasswort@db:5432/portal

# Authentifizierung
SESSION_SECRET=mindestens-32-zeichen-zufaelliger-string

# Verschlüsselung für API-Credentials (BHB, SMTP)
ENCRYPTION_KEY=anderer-32-zeichen-zufaelliger-string

# Produktion
NODE_ENV=production
PORT=5000
```

### Optionale Variablen (Alternative zu UI-Konfiguration)

```env
# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...

# SMTP (falls nicht über UI konfiguriert)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=...
SMTP_SECURE=false
SMTP_FROM=Portal <noreply@example.com>
```

## Docker Compose Konfiguration

```yaml
version: '3.8'

services:
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=postgres://portal:${DB_PASSWORD}@db:5432/portal
      - SESSION_SECRET=${SESSION_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    networks:
      - portal-network
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=portal
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=portal
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - portal-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U portal -d portal"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - portal-network
    depends_on:
      - app
    restart: unless-stopped

networks:
  portal-network:
    driver: bridge

volumes:
  postgres-data:
```

## Cloudflare Tunnel Einrichtung

### 1. Tunnel erstellen (Cloudflare Dashboard)

1. Gehe zu **Zero Trust** > **Networks** > **Tunnels**
2. Klicke **Create a tunnel**
3. Wähle **Cloudflared** als Connector
4. Kopiere das **Tunnel Token** (beginnt mit `eyJ...`)

### 2. Ingress-Konfiguration

Im Cloudflare Dashboard unter dem Tunnel:

| Subdomain           | Service          |
|---------------------|------------------|
| portal.example.com  | http://app:5000  |

Alternativ mit config.yml:

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: portal.example.com
    service: http://app:5000
  - service: http_status:404
```

## Erster Admin-Benutzer anlegen

### Option 1: Über Docker Exec (empfohlen)

```bash
# 1. Container starten
docker compose up -d db
docker compose run --rm app npm run db:push

# 2. Passwort-Hash generieren
docker compose run --rm app node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('IhrSicheresPasswort123!', 10).then(hash => console.log(hash));
"
# Ausgabe: $2a$10$... (kopieren!)

# 3. Admin-Benutzer einfügen
docker compose exec db psql -U portal -d portal -c "
INSERT INTO users (id, username, display_name, password_hash, role)
VALUES (
  gen_random_uuid(),
  'admin',
  'Portal Administrator',
  '\$2a\$10\$...IhrKopierterHash...',
  'admin'
) ON CONFLICT (username) DO NOTHING;
"

# 4. Vollständig starten
docker compose up -d
```

### Option 2: Bootstrap-Script

Erstelle `scripts/bootstrap-admin.ts`:

```typescript
import { storage } from '../server/storage';

async function createAdmin() {
  const existing = await storage.getUserByUsername('admin');
  if (existing) {
    console.log('Admin user already exists');
    return;
  }
  
  await storage.createUser(
    'admin',
    'IhrSicheresPasswort123!',
    'Portal Administrator',
    'admin'
  );
  console.log('Admin user created successfully');
}

createAdmin().then(() => process.exit(0));
```

## Deployment-Schritte

```bash
# 1. .env Datei erstellen
cp .env.example .env
# Variablen ausfüllen!

# 2. Images bauen
docker compose build

# 3. Datenbank starten und migrieren
docker compose up -d db
docker compose run --rm app npm run db:push

# 4. Admin-Benutzer anlegen (siehe oben)

# 5. Vollständiger Start
docker compose up -d

# 6. Logs prüfen
docker compose logs -f app

# 7. Zugriff testen
# Lokal: http://localhost:5000
# Extern: https://portal.example.com (nach Cloudflare-Tunnel-Setup)
```

## Benutzerrollen

| Rolle      | Zugriff                                           |
|------------|---------------------------------------------------|
| `admin`    | Voller Zugriff inkl. Benutzerverwaltung           |
| `user`     | Interner Mitarbeiter, alle Features außer Benutzer|
| `customer` | Externer Kunde, nur eigene Rechnungen/Dashboard   |

## Sicherheitshinweise

1. **Passwörter**: Verwenden Sie starke, einzigartige Passwörter für alle Konten
2. **ENCRYPTION_KEY**: Muss sich vom SESSION_SECRET unterscheiden
3. **Datenbank**: Port 5432 niemals nach außen exponieren
4. **HTTPS**: Immer über Cloudflare Tunnel, nie direkt HTTP exponieren
5. **Backup**: PostgreSQL-Volume regelmäßig sichern

## Wartung

```bash
# Logs anzeigen
docker compose logs -f

# Neustart
docker compose restart app

# Datenbank-Backup
docker compose exec db pg_dump -U portal portal > backup.sql

# Update
git pull
docker compose build
docker compose up -d
```
