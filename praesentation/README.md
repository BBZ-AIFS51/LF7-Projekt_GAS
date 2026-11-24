# Präsentation

Die Präsentation zu Projekt GAS als einzelne HTML-Dateien, die ohne Internet
laufen. Schriften, Bilder, three.js und das 3D-Modell sind eingebettet.

| Datei | Wofür |
|---|---|
| [`Praesentation_GAS.html`](Praesentation_GAS.html) | **Abgabe**: nur die Folien, ohne Sprechernotizen |
| [`Praesentation_GAS_Vortrag.html`](Praesentation_GAS_Vortrag.html) | **zum Vortragen**: gleiche Folien, dazu Sprechernotizen und die Referentenansicht im zweiten Fenster |

Beide werden aus `src/` gebaut, nicht von Hand ändern.

| Quelle | Inhalt |
|---|---|
| `src/index.html` | Folien mit Stichpunkten, Sprechernotizen in `<aside class="notes">` |
| `src/scenes.js` | was das 3D-Modell auf jeder Folie zeigt (Kamera, Display, Kabel) |
| `src/scene.js` | 3D-Modelle aller Bauteile, Gehäuse aus den echten STL-Dateien |
| `src/oled.js` | Display-Inhalte, gleiche Symbole wie in `alarm_system.ino` |
| `src/deck.js`, `src/deck.css` | Steuerung, Referentenansicht und Gestaltung |
| `src/fonts/`, `src/img/` | Schriften (Carlito und JetBrains Mono, frei lizenziert), Schaltplan, QR-Codes |
| `build.mjs` | baut beide HTML-Dateien |

Die Fotos kommen beim Bauen aus [`../Fotos/`](../Fotos/), three.js und die
Gehäusedaten aus [`../docs/viewer/`](../docs/viewer/).

## Vortragen mit Referentenansicht (wie bei PowerPoint)

Notebook am Beamer, Bildschirm **erweitern**, nicht duplizieren (Windows:
<kbd>Win</kbd> + <kbd>P</kbd>, „Erweitern“).

1. `Praesentation_GAS_Vortrag.html` in Chrome oder Edge öffnen.
2. <kbd>P</kbd> drücken. Es öffnet sich ein zweites Fenster, die
   Referentenansicht. Fragt der Browser nach Popups: erlauben und <kbd>P</kbd>
   noch einmal drücken.
3. Das **Folienfenster** an der Titelleiste auf den Beamer ziehen und
   <kbd>F</kbd> für Vollbild drücken. Nicht in die Folie klicken, ein Klick
   blättert weiter.
4. Die **Referentenansicht** bleibt auf dem Notebook. Einmal in die Notizen
   klicken, dann steuert ihr von dort: Pfeiltasten, Leertaste, Presenter oder
   die Buttons oben. Ein Klick auf die Folienvorschau blättert weiter.

Die Referentenansicht zeigt:

- links groß die aktuelle Folie mit dem 3D-Modell, darunter den nächsten
  Klick oder die nächste Folie (gelb: „Klick 2 von 5“ heißt, auf dieser Folie
  kommen noch Punkte)
- rechts die Sprechernotizen. Bei den Code-Folien steht zuerst, wie ihr es
  erklärt, dann jede Zeile einzeln und am Ende Antworten auf mögliche Fragen
- oben Stoppuhr, Zielzeit bis zum Ende der Folie (wird orange, wenn ihr mehr
  als 30 Sekunden drüber seid), Uhrzeit, Liste zum Springen bei Fragen,
  „Bild schwarz“ und Schriftgröße der Notizen

Stellen mit `[Euer Teil: ...]` in den Notizen füllt ihr selbst, zum Beispiel
Fazit und Reflexion.

Das Live-Bild vom 3D-Modell in der Vorschau kommt aus dem Folienfenster und
läuft nur, solange dieses sichtbar ist. Am Beamer ist das so. Übt ihr mit nur
einem Bildschirm und die Referentenansicht verdeckt das Folienfenster, bleibt
das Bild stehen. Stoppuhr und Notizen laufen trotzdem.

## Ohne zweiten Bildschirm

Nur ein Fenster: <kbd>N</kbd> blendet Notizen und Stoppuhr unten ein (sieht
dann aber auch das Publikum).

| Taste | Wirkung |
|---|---|
| <kbd>→</kbd> <kbd>Leertaste</kbd> <kbd>Bild ab</kbd> | weiter |
| <kbd>←</kbd> <kbd>Bild auf</kbd> | zurück |
| <kbd>P</kbd> | Referentenansicht öffnen (nur Vortragsversion) |
| <kbd>F</kbd> | Vollbild (im Folienfenster) |
| <kbd>T</kbd> | Stoppuhr auf 0 (startet sonst beim ersten Weiterklicken) |
| <kbd>B</kbd> | Bild schwarz |
| <kbd>O</kbd> | Übersicht aller Folien |
| <kbd>M</kbd> | Animationen aus, jede Folie steht sofort komplett da |
| <kbd>H</kbd> | Hilfe |

Die Töne auf den Folien 7 und 17 (OK, Fehler, Piep, Sirene) haben die
Frequenzen aus der Firmware. Lautstärke am Notebook vorher prüfen.

## Ändern

Texte und Notizen in `src/index.html` ändern, dann aus dem Hauptordner des
Repositorys:

```bash
node praesentation/build.mjs
```

Zum Ausprobieren ohne Bauen lässt sich auch `src/index.html` direkt im Browser
öffnen.
