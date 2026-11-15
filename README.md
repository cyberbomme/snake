# Snake

Snake im Stil der monochromen Handy-Displays um 2000 – als statische Web-App ohne Build-Schritt.

## Spielen

- **Steuerkreuz** unter dem Display (Daumen kann zwischen den Richtungen rollen), **Wischen** auf dem Display
- Tastatur: Pfeiltasten / WASD, Handy-Ziffern `2 4 6 8`, `Enter`/`5` = OK, `Esc`/`C` = Pause/Zurück, `M` = Ton
- Menü: Level 1–9, sechs Labyrinthe, Rekord, Anleitung, Ton

Das Spielfeld passt sich der Bildschirmgröße an (Größe wird bei jedem neuen Spiel neu berechnet).

## Auf GitHub Pages veröffentlichen

1. Repository anlegen und alle Dateien in den `main`-Branch pushen.
2. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)**.
3. Nach ca. einer Minute läuft das Spiel unter `https://<benutzer>.github.io/<repo>/`.

Lokal testen: `python3 -m http.server` im Ordner starten und `http://localhost:8000` öffnen.
