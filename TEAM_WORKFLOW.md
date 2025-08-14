# Team Workflow für GitHub Zusammenarbeit

## 🔄 Bidirektionale Synchronisation

### Von Cursor zu GitHub (Push):
```bash
# Änderungen zu GitHub übertragen
npm run push "Beschreibung der Änderungen"
```

### Von GitHub zu Cursor (Pull):
```bash
# Änderungen von GitHub holen
npm run sync
```

## 👥 Teamarbeit Workflow

### 1. **Täglicher Start:**
```bash
# Neueste Änderungen holen
npm run sync

# Demo starten
npm run demo
```

### 2. **Entwicklung:**
```bash
# Neuen Feature-Branch erstellen
git checkout -b feature/neue-funktion

# Entwickeln in Cursor
# Testen mit npm run demo

# Änderungen committen
npm run push "Neue Funktion implementiert"
```

### 3. **Pull Request erstellen:**
```bash
# Branch zu GitHub pushen
git push -u origin feature/neue-funktion

# Dann auf GitHub: "Compare & pull request"
```

### 4. **Nach Code Review:**
```bash
# Zurück zu main
git checkout main

# Neueste Änderungen holen
npm run sync

# Feature-Branch löschen (optional)
git branch -d feature/neue-funktion
```

## 🚨 Konflikte lösen

### Wenn es Merge-Konflikte gibt:
```bash
# Status prüfen
git status

# Konflikte in Cursor lösen
# Dann:
git add .
git commit -m "Merge conflicts resolved"
git push origin main
```

## 📋 Nützliche Commands

```bash
# Status prüfen
git status

# Änderungen anzeigen
git diff

# Commit-Historie
git log --oneline

# Branches anzeigen
git branch -a

# Zu GitHub pushen
npm run push "Nachricht"

# Von GitHub holen
npm run sync
```

## 🔧 Automatisierung

### Git Hooks für automatische Synchronisation:
```bash
# Pre-commit Hook (optional)
# Verhindert Commits wenn nicht gesynced
```

### GitHub Actions für CI/CD:
- Automatische Tests bei jedem Push
- Automatisches Deployment
- Code Quality Checks

## 📞 Team-Kommunikation

### Best Practices:
1. **Regelmäßig syncen** (mindestens täglich)
2. **Klare Commit-Messages** verwenden
3. **Feature-Branches** für neue Funktionen
4. **Pull Requests** für Code Reviews
5. **Issues** für Bug-Tracking

### Kommunikationskanäle:
- GitHub Issues für Bugs/Features
- GitHub Discussions für Fragen
- Team-Chat für schnelle Absprachen

---

**Wichtig**: Immer vor dem Entwickeln `npm run sync` ausführen! 🔄

