# Präsentation

Die Präsentation zu Projekt GAS als eine einzige HTML-Datei, die ohne Internet
läuft. Schriften, Bilder, three.js und das 3D-Modell sind eingebettet.

| Datei | Inhalt |
|---|---|
| [`Praesentation_GAS.html`](Praesentation_GAS.html) | **die fertige Präsentation**, wird abgegeben (aus `src/` gebaut, nicht von Hand ändern) |
| `src/index.html` | Folien mit Texten und Sprechernotizen |
| `src/scenes.js` | was das 3D-Modell auf jeder Folie zeigt (Kamera, Display, Kabel) |
| `src/scene.js` | 3D-Modelle aller Bauteile, Gehäuse aus den echten STL-Dateien |
| `src/oled.js` | Display-Inhalte, gleiche Symbole wie in `alarm_system.ino` |
| `src/deck.js`, `src/deck.css` | Steuerung und Gestaltung |
| `src/fonts/`, `src/img/` | Schriften (Carlito und JetBrains Mono, beide frei lizenziert), Schaltplan, QR-Codes |
| `build.mjs` | baut die eine HTML-Datei |

Die Fotos kommen beim Bauen aus [`../Fotos/`](../Fotos/), three.js und die
Gehäusedaten aus [`../docs/viewer/`](../docs/viewer/).

## Vorführen

1. `Praesentation_GAS.html` in Chrome, Edge oder Firefox öffnen (Doppelklick
   reicht, kein Server nötig).
2. <kbd>F</kbd> für Vollbild.
3. Weiter mit <kbd>→</kbd>, <kbd>Leertaste</kbd> oder dem Presenter
   (Bild-ab-Taste), zurück mit <kbd>←</kbd>.

| Taste | Wirkung |
|---|---|
| <kbd>N</kbd> | Notizen, Stoppuhr und Zielzeit einblenden |
| <kbd>T</kbd> | Stoppuhr auf 0 (startet sonst beim ersten Weiterklicken) |
| <kbd>O</kbd> | Übersicht aller Folien, zum Springen bei Fragen |
| <kbd>B</kbd> | Bild schwarz |
| <kbd>M</kbd> | Animationen aus, jede Folie steht dann sofort komplett da |
| <kbd>H</kbd> | Hilfe |

Auf manchen Folien erscheinen Punkte nacheinander, dann braucht es mehrere
Klicks. Die Töne auf den Folien 7 und 17 (OK, Fehler, Piep, Sirene) haben die
Frequenzen aus der Firmware, Lautstärke am Notebook vorher prüfen.

Oben links steht das Kapitel der Dokumentation, oben rechts, wer spricht.
Die Sprechernotizen (<kbd>N</kbd>) sind nur Stichpunkte als Start, ersetzt sie
durch eure eigenen.

## Ändern

Texte in `src/index.html` ändern, dann aus dem Hauptordner des Repositorys:

```bash
node praesentation/build.mjs
```

Zum Ausprobieren ohne Bauen lässt sich auch `src/index.html` direkt im Browser
öffnen.
