# BHB Invoice & Dunning Portal - Deployment Guide

## Deployment-Optionen

### Option 1: Cloudflare Tunnel (empfohlen)

**Vorteile:**
- Keine externe/öffentliche IP erforderlich
- Keine offenen Ports = höhere Sicherheit
- Automatisches HTTPS-Zertifikat
- DDoS-Schutz inklusive
- Funktioniert lokal, auf Azure, AWS, etc.

**Geeignet für:** Lokales Testen, Azure VM ohne Public IP, jeder Server hinter NAT

### Option 2: NGINX + Externe IP

**Vorteile:**
- Volle Kontrolle über Reverse Proxy
- Unabhängig von Cloudflare

**Nachteile:**
- Externe/öffentliche IP erforderlich (~5€/Monat auf Azure)
- Ports 80/443 müssen offen sein
- SSL-Zertifikate selbst verwalten (Let's Encrypt)
- Mehr Angriffsfläche

**Geeignet für:** Wenn Cloudflare nicht gewünscht/möglich ist

## Port-Übersicht

| Service      | Port  | Beschreibung                              |
|--------------|-------|-------------------------------------------|
| App (Node)   | 5000  | HTTP API + Frontend (intern)              |
| PostgreSQL   | 5432  | Datenbank (nur intern, nicht exponiert)   |
| Cloudflared  | -     | Kein eingehender Port, ausgehend 443/7844 |

## Erforderliche Umgebungsvariablen

### Secrets generieren

```bash
# SESSION_SECRET generieren (64 Zeichen hex = 32 Bytes)
openssl rand -hex 32

# ENCRYPTION_KEY generieren (separat ausführen!)
openssl rand -hex 32

# Datenbank-Passwort generieren
openssl rand -base64 24
```

### Pflicht-Variablen

```env
# Datenbank
DATABASE_URL=postgres://portal:sicheresPasswort@db:5432/portal
DB_PASSWORD=sicheresPasswort

# Authentifizierung (generieren mit: openssl rand -hex 32)
SESSION_SECRET=abc123...

# Verschlüsselung für API-Credentials (generieren mit: openssl rand -hex 32)
# WICHTIG: Muss sich von SESSION_SECRET unterscheiden!
ENCRYPTION_KEY=def456...

# Produktion
NODE_ENV=production
PORT=5000
```

### Optionale Variablen (Alternative zu UI-Konfiguration)

```env

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

### Architektur: Separater Cloudflare-Container

Der Cloudflare-Tunnel läuft als separater Container, damit später weitere Apps hinzugefügt werden können:

```
┌─────────────────────────────────────────────────────────────────┐
│  Server                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  docker-compose.yml (Portal)                                ││
│  │  ├── app (portal:5000)                                      ││
│  │  └── db (postgres:5432)                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  docker-compose.app2.yml (Weitere App)                      ││
│  │  └── app2 (andere-app:3000)                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  docker-compose.cloudflare.yml (Shared Tunnel)              ││
│  │  └── cloudflared ──────────────────────────────────────────►││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                                           │
                                                           ▼
                                              Cloudflare Edge
                                              ├── portal.example.com → app:5000
                                              └── app2.example.com → app2:3000
```

### 1. Netzwerk erstellen (einmalig)

```bash
docker network create portal-network
```

### 2. Tunnel erstellen (Cloudflare Dashboard)

1. Gehe zu **Zero Trust** > **Networks** > **Tunnels**
2. Klicke **Create a tunnel**
3. Wähle **Cloudflared** als Connector
4. Kopiere das **Tunnel Token** (beginnt mit `eyJ...`)

### 3. Ingress-Konfiguration (mehrere Apps)

Im Cloudflare Dashboard unter dem Tunnel > **Public Hostname**:

| Subdomain           | Service          |
|---------------------|------------------|
| portal.example.com  | http://app:5000  |
| app2.example.com    | http://app2:3000 |

### 4. Container starten

```bash
# 1. Netzwerk erstellen (nur beim ersten Mal)
docker network create portal-network

# 2. Portal starten
docker compose up -d

# 3. Cloudflare Tunnel starten (ein Befehl)
docker run -d --name cloudflared --restart unless-stopped \
  --network portal-network \
  cloudflare/cloudflared:latest tunnel run \
  --token DEIN_TUNNEL_TOKEN

# Später: Weitere App hinzufügen
docker compose -f docker-compose.app2.yml up -d
# → Dann im Cloudflare Dashboard neuen Hostname hinzufügen
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

## Alternative: NGINX statt Cloudflare

Falls du später auf NGINX + externe IP wechseln möchtest:

### docker-compose.nginx.yml

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

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - certbot-webroot:/var/www/certbot:ro
    networks:
      - portal-network
    depends_on:
      - app
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certs:/etc/letsencrypt
      - certbot-webroot:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  portal-network:
    driver: bridge

volumes:
  postgres-data:
  certbot-webroot:
```

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:5000;
    }

    server {
        listen 80;
        server_name portal.example.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name portal.example.com;

        ssl_certificate /etc/nginx/certs/live/portal.example.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/live/portal.example.com/privkey.pem;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### SSL-Zertifikat erstellen (Let's Encrypt)

```bash
# Erster Lauf ohne SSL
docker compose -f docker-compose.nginx.yml up -d nginx

# Zertifikat anfordern
docker compose -f docker-compose.nginx.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d portal.example.com

# NGINX neu starten mit SSL
docker compose -f docker-compose.nginx.yml restart nginx
```

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
