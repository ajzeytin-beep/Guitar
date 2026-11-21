# 🎸 Akkordbuch

Gitarren-App für Handy und Tablet: Songs von Webseiten einfügen und mit Akkorden über dem Text anzeigen.

## Funktionen

- **Einfügen per Copy & Paste**: erkennt automatisch „Akkorde über dem Text“ (wie auf den meisten Webseiten) und das ChordPro-Format (`[G]Text`)
- Titel und Interpret werden aus der ersten Zeile erkannt (z.B. „Songname - Band Chords“)
- Erkennt Abschnitte (`[Verse 1]`, `Chorus:`, `Intro: Am G C`), `Capo: 2`, `Tonart: G` und Tabulaturen
- Leicht verrutschte Akkorde werden automatisch an den Wortanfang gerückt
- **Transponieren** in Halbtönen, mit passender Schreibweise (♯/♭) für die Tonart
- **Kapo** mit automatischer Umrechnung der Griffe und **Kapo-Tipp** (bei welchem Bund die meisten Griffe ohne Barré gehen)
- **Griffbilder** für alle Akkorde des Songs, Antippen eines Akkords zeigt den Griff groß
- **Akkorde vereinfachen** (Cmaj7 → C, Am7 → Am)
- **Auto-Scroll** mit einstellbarem Tempo; der Bildschirm bleibt dabei an
- Schriftgröße einstellbar, Einstellungen werden pro Song gespeichert
- Suche, Sortierung, Backup exportieren/importieren
- Hell- und Dunkelmodus im Apple-Stil
- Als App auf dem Homescreen installierbar (PWA), funktioniert offline

## Entwicklung

```bash
npm install
npm run dev      # startet lokal, im WLAN auch auf Handy erreichbar
npm test         # Tests für Parser, Transponieren, Griffbilder
npm run build    # fertige App in dist/
```

## Auf Handy/Tablet installieren

1. In GitHub unter **Settings → Pages → Source** „GitHub Actions“ wählen.
2. Nach jedem Push auf `main` wird die App automatisch veröffentlicht.
3. Die Seite auf dem iPhone/iPad in Safari öffnen → **Teilen → Zum Home-Bildschirm**.
   Auf Android in Chrome: **Menü → App installieren**.

Die Songs werden nur lokal auf dem Gerät gespeichert.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `src/lib/parser.ts` | Erkennt Akkordzeilen, Abschnitte, ChordPro |
| `src/lib/music.ts` | Akkorde zerlegen, transponieren, vereinfachen |
| `src/lib/shapes.ts` | Griffbilder (offene Griffe + Barré-Formen) |
| `src/lib/storage.ts` | Speicherung im Browser, Backup |
| `src/components/` | Oberfläche: Liste, Editor, Songansicht |
