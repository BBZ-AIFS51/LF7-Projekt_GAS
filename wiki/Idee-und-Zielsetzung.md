<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 2 · 💡 Idee und Zielsetzung

Welches Problem das Projekt lösen soll, was die Anlage können muss und was
bewusst nicht dazugehört.

## Ausgangsidee

Ein Raum soll gegen unbefugtes Betreten gesichert werden, zum Beispiel ein
Lager- oder Serverraum. Wer berechtigt ist, schaltet die Anlage an der Tür
scharf, bevor er geht, und beim Zurückkommen wieder unscharf. Betritt jemand den
Raum, während die Anlage scharf ist, gibt es lauten Alarm.

**Unsere Projektidee in einem Satz:** Ein Mini-Sicherheitssystem für eine Tür,
das sich per PIN oder RFID-Karte scharf und unscharf schalten lässt und bei
Bewegung im Raum Alarm gibt.

> [!NOTE]
> ✏️ **TODO (Team):** 2–3 Sätze, warum ihr euch für eine Alarmanlage
> entschieden habt und in welchem Rahmen das Projekt entstanden ist
> (Gruppenarbeit, Zeitraum, welche Bauteile gestellt wurden). Gibt es einen
> schriftlichen Auftrag der Lehrkraft, ihn hier als Zitat einfügen.

## Zielsetzung

Das Projekt soll zeigen, wie ein Mikrocontroller mehrere Sensoren und Aktoren zu
einem zusammenhängenden System verbindet:

- **Eingaben auswerten:** Tastenfeld, RFID-Karten und Bewegungsmelder werden
  gleichzeitig abgefragt, ohne dass eine Eingabe die andere blockiert.
- **Entscheiden:** Ein Zustandsautomat legt fest, wie die Anlage auf eine
  Eingabe reagiert, je nachdem, ob sie gerade unscharf, scharf oder im Alarm ist.
- **Rückmeldung geben:** Display und Buzzer zeigen jederzeit eindeutig, was
  passiert, auch ohne Text (Symbole und unterschiedliche Töne).
- **Sicher bedienen:** Die PIN ist beim Tippen nicht lesbar, und wer
  wiederholt falsch rät, löst den Alarm aus.

## Anforderungen

Die Muss-Anforderungen stammen aus unserer ersten Beschreibung des Systems
([Entwicklungsverlauf, Schritt 1](Entwicklungsverlauf#-schritt-1--auftrag-komplette-firmware)).
Die Kann-Anforderungen sind im Lauf des Projekts dazugekommen, teils als
Anregung der Lehrkraft.

### Muss

| # | Anforderung | Status |
|:---:|---|:---:|
| M1 | Scharf- und Unscharfschalten mit einer PIN am Keypad, Bestätigung mit <kbd>#</kbd> | ✅ |
| M2 | PIN wird bei der Eingabe nur als `*` angezeigt | ✅ |
| M3 | Bewegungsmelder löst **nur im scharfen Zustand** Alarm aus | ✅ |
| M4 | Alarm: laut und schrill, 30 Sekunden | ✅ |
| M5 | Richtige PIN: heller Bestätigungston · falsche PIN: rauer, langer Ton | ✅ |
| M6 | 3 Fehleingaben lösen den Alarm aus | ✅ |
| M7 | Display: Totenkopf im scharfen Zustand, Herz im unscharfen Zustand | ✅ |

### Kann

| # | Anforderung | Herkunft | Status |
|:---:|---|---|:---:|
| K1 | Zweiter Weg zum Scharf-/Unscharfschalten: RFID-Karte | eigene Idee | ✅ |
| K2 | Ausgangsverzögerung, damit man nach dem Scharfschalten den Raum verlassen kann | Vorschlag von Claude Code | ✅ |
| K3 | Rechtevergabe: Karten ohne PC anlernen und löschen (Admin-Menü) | Lehrkraft | ✅ |
| K4 | RFID-Reset, falls der Kartenleser hängt | Lehrkraft | ✅ |
| K5 | 3D-gedrucktes Gehäuse, Bewegungsmelder getrennt im Raum | eigene Idee | 🟡 entworfen |
| K6 | Interaktives 3D-Modell im Browser | eigene Idee | ✅ |

> [!NOTE]
> ✏️ **TODO (Team):** Status von K5 aktualisieren, sobald das Gehäuse gedruckt
> ist. Fehlen Anforderungen aus dem Auftrag der Lehrkraft? Dann ergänzen.

## Abgrenzung

Bewusst **nicht** Teil des Projekts:

- keine Netzwerkanbindung, keine App, keine Benachrichtigung aufs Handy
- keine Protokollierung, wer wann welche Karte benutzt hat
- nur eine Berechtigungsstufe pro Karte (jede gespeicherte Karte darf scharf
  und unscharf schalten), siehe [Entwicklungsverlauf, Schritt 5](Entwicklungsverlauf#-schritt-5--kollisionserkennung-und-rechtevergabe-bei-rfid)
- keine Notstromversorgung, kein Sabotagekontakt am Gehäuse

## Rahmenbedingungen

| | |
|---|---|
| **Mikrocontroller** | Arduino Uno R3: 2 KB Arbeitsspeicher, davon belegt das Display allein die Hälfte |
| **Anschlüsse** | Bis auf die serielle Schnittstelle sind alle Pins belegt, Erweiterungen (z. B. SD-Karte) passen nicht mehr |
| **Umfang** | Schulprojekt: lieber wenige Funktionen, die sauber laufen |
| **Zeitraum** | ✏️ TODO (Team): Projektstart und Abgabetermin eintragen |

---

<sub>← [1 Deckblatt](Home) · [3 Funktionsbeschreibung](Funktionsbeschreibung) →</sub>
