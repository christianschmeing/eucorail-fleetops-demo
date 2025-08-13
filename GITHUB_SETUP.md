# GitHub Setup Anleitung

## 🚀 Schritte zur GitHub-Übertragung

### 1. GitHub Repository erstellen

1. Gehen Sie zu [GitHub.com](https://github.com) und loggen Sie sich ein
2. Klicken Sie auf das "+" Symbol oben rechts → "New repository"
3. Repository-Name eingeben: `eucorail-fleetops-demo`
4. Beschreibung: `Eucorail FleetOps Demo - Professionelle Flottenplattform für Zugwartung`
5. **Wichtig**: Repository als **Private** markieren (für interne Nutzung)
6. **NICHT** "Initialize this repository with a README" aktivieren
7. Klicken Sie auf "Create repository"

### 2. Lokales Repository mit GitHub verbinden

```bash
# Remote Repository hinzufügen (ersetzen Sie YOUR_USERNAME durch Ihren GitHub-Username)
git remote add origin https://github.com/YOUR_USERNAME/eucorail-fleetops-demo.git

# Branch auf 'main' umbenennen (falls nötig)
git branch -M main

# Code zu GitHub pushen
git push -u origin main
```

### 3. GitHub Repository konfigurieren

#### Repository-Einstellungen
1. Gehen Sie zu "Settings" → "General"
2. Scrollen Sie zu "Danger Zone"
3. Aktivieren Sie "Restrict pushes that create files that are larger than 100 MB"

#### Branch Protection (Optional)
1. "Settings" → "Branches"
2. "Add rule" für `main` Branch
3. Aktivieren Sie:
   - ✅ "Require a pull request before merging"
   - ✅ "Require status checks to pass before merging"
   - ✅ "Include administrators"

### 4. GitHub Actions für CI/CD (Optional)

Erstellen Sie `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.17.0'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run tests
      run: npm test
```

### 5. README.md aktualisieren

Ersetzen Sie in der README.md:
```markdown
git clone <your-github-repo-url>
```

Durch:
```markdown
git clone https://github.com/YOUR_USERNAME/eucorail-fleetops-demo.git
```

### 6. Team-Zugriff verwalten

1. "Settings" → "Collaborators and teams"
2. "Add people" → GitHub-Usernames der Teammitglieder eingeben
3. Rolle: "Write" (für Entwickler) oder "Admin" (für Projektleiter)

### 7. Issues und Projects (Optional)

#### Issue Templates erstellen
Erstellen Sie `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows]
 - Browser: [e.g. Chrome, Safari]
 - Version: [e.g. 22]
```

### 8. Deployment (Optional)

#### Vercel Deployment
1. Gehen Sie zu [Vercel.com](https://vercel.com)
2. "New Project" → GitHub Repository auswählen
3. Framework Preset: "Next.js"
4. Root Directory: `apps/web`
5. Build Command: `npm run build`
6. Output Directory: `.next`
7. Deploy

#### Railway Deployment (für API)
1. Gehen Sie zu [Railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Repository auswählen
4. Root Directory: `packages/api`
5. Deploy

### 9. Finale Schritte

```bash
# README mit korrektem Repository-Link aktualisieren
git add README.md
git commit -m "Update README with correct repository URL"
git push

# Branch für neue Features erstellen
git checkout -b feature/initial-setup
git push -u origin feature/initial-setup
```

### 10. Dokumentation vervollständigen

Erstellen Sie zusätzliche Dokumentation:

- `CONTRIBUTING.md` - Entwicklungsrichtlinien
- `CHANGELOG.md` - Versionshistorie
- `API.md` - API-Dokumentation
- `DEPLOYMENT.md` - Deployment-Anleitung

## 🔐 Sicherheitshinweise

1. **Private Repository**: Das Repository sollte privat bleiben
2. **Sensitive Data**: Keine API-Keys oder Passwörter committen
3. **Environment Variables**: Nutzen Sie GitHub Secrets für sensitive Daten
4. **Access Control**: Regelmäßig Team-Zugriffe überprüfen

## 📞 Support

Bei Problemen:
1. GitHub Issues nutzen
2. Team-Chat (Slack/Teams)
3. Dokumentation prüfen

---

**Fertig!** Ihr Eucorail FleetOps Demo Projekt ist jetzt auf GitHub verfügbar und kann von Ihrem Team genutzt werden.
