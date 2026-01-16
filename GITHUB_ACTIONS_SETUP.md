# GitHub Actions Setup - Automatischer Build & Deploy

Diese Anleitung erklärt, wie Sie GitHub Actions für automatische Docker-Builds einrichten.

## Übersicht

```
[Push zu GitHub main] 
      ↓
[GitHub Actions baut Docker-Images]
      ↓
[Images werden zu GitHub Container Registry gepusht]
      ↓
[Server: Admin klickt "System aktualisieren"]
      ↓
[Server zieht neue Images & startet neu]
```

## Voraussetzungen

1. GitHub Repository (öffentlich oder privat)
2. Server mit Docker & Docker Compose
3. Internetzugang vom Server zu ghcr.io

## Schritt 1: Repository zu GitHub pushen

Falls noch nicht geschehen:

```bash
git remote add origin https://github.com/IHR-USERNAME/IHR-REPO.git
git branch -M main
git push -u origin main
```

## Schritt 2: GitHub Actions aktivieren

GitHub Actions ist automatisch aktiviert. Der Workflow `.github/workflows/build-and-push.yml` startet automatisch bei jedem Push zu `main`.

## Schritt 3: Server für Registry-Images konfigurieren

### 3.1 Bei GitHub Container Registry anmelden

Erstellen Sie einen Personal Access Token (PAT) mit `read:packages` Berechtigung:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)"
3. Name: "Server Docker Pull"
4. Ablauf: 90 Tage oder länger
5. Berechtigung: `read:packages`
6. Token kopieren und sicher aufbewahren!

### 3.2 Auf dem Server anmelden

```bash
# Anmelden bei GitHub Container Registry
echo "IHR_TOKEN" | docker login ghcr.io -u IHR_USERNAME --password-stdin
```

### 3.3 .env Datei anpassen

Fügen Sie zu Ihrer `.env` hinzu:

```bash
# GitHub Repository (für Image-Namen)
GITHUB_REPOSITORY=ihr-username/ihr-repo
```

## Schritt 4: Production Compose verwenden

Auf dem Server:

```bash
# Production Compose-Datei verwenden
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Schritt 5: Updates durchführen

### Option A: Über die Web-Oberfläche
1. Als Admin einloggen
2. Einstellungen → System → "System aktualisieren" klicken
3. Warten bis Update abgeschlossen

### Option B: Manuell per SSH
```bash
cd /pfad/zum/projekt
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Ablauf eines Updates

1. Sie pushen Code-Änderungen zu GitHub `main`
2. GitHub Actions baut automatisch neue Docker-Images (~5-10 Minuten)
3. Images werden zu ghcr.io gepusht
4. Sie klicken "System aktualisieren" im Portal
5. Server zieht neue Images und startet Container neu
6. Während des Updates erscheint eine Wartungsseite

## Fehlerbehebung

### Build schlägt fehl
- Prüfen Sie die Actions-Logs: Repository → Actions → Workflow-Run anklicken
- Häufige Ursachen: Syntax-Fehler, fehlende Dateien

### Pull schlägt fehl auf Server
```bash
# Erneut anmelden
docker login ghcr.io -u IHR_USERNAME

# Token-Berechtigung prüfen (braucht read:packages)
```

### Image nicht gefunden
- Prüfen Sie, ob der Build in GitHub Actions erfolgreich war
- Repository-Name in GITHUB_REPOSITORY muss exakt stimmen (Kleinbuchstaben!)

## Sicherheitshinweise

- Der GitHub Token (PAT) sollte nur `read:packages` haben
- Token regelmäßig erneuern
- Bei privaten Repos: Nur autorisierte User können Images pullen

## Vorteile dieser Lösung

1. **Kein Build auf dem Server** - Server braucht weniger RAM
2. **Automatisch** - Jeder Push löst Build aus
3. **Nachvollziehbar** - Jedes Image hat SHA-Tag
4. **Schnell** - GitHub hat starke Build-Server
5. **Kostenlos** - 2000 Build-Minuten/Monat inklusive
