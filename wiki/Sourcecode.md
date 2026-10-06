<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 6 · 📄 Sourcecode

Der vollständige Sourcecode liegt als eigene Dateien bei und ist hier nicht
abgedruckt. Die wichtigsten Stellen sind in [Kapitel 7](Wichtige-Codeabschnitte)
erklärt.

## Dateien

| Datei | Zweck | Umfang |
|---|---|---:|
| **[`Code/alarm_system/alarm_system.ino`](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Code/alarm_system/alarm_system.ino)** | **Hauptfirmware:** Zustandsautomat, PIN, RFID, Admin-Menü, Töne, Display | ca. 1050 Zeilen |
| [`Code/hardware_test/hardware_test.ino`](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Code/hardware_test/hardware_test.ino) | Inbetriebnahme: prüft Display, Keypad, Buzzer und Bewegungsmelder einzeln | ca. 210 Zeilen |
| [`Code/display_test/display_test.ino`](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Code/display_test/display_test.ino) | nur das Display: Symbole im Wechsel, gibt den freien Arbeitsspeicher aus | ca. 130 Zeilen |
| [`Code/rfid_test/rfid_test.ino`](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Code/rfid_test/rfid_test.ino) | nur der RFID-Leser: prüft das Modul und zeigt die Kennung jeder Karte | ca. 90 Zeilen |

Die Arduino IDE verlangt, dass jeder Sketch in einem eigenen Ordner mit
gleichem Namen liegt, daher die Unterordner.

> [!NOTE]
> ✏️ **TODO (Team):** Abgabeform eintragen, z. B. „Die Dateien liegen der
> Abgabe als `Sourcecode.zip` bei“ oder „Stand: Tag `v1.0` im Repository“.

## Kompilieren und hochladen

1. Arduino IDE installieren und über den Library Manager installieren:
   **Adafruit SH110X** (mit Abhängigkeiten *Adafruit GFX* und *Adafruit
   BusIO*) und **MFRC522**.
2. Oben in `alarm_system.ino` PIN und Admin-PIN festlegen (`PIN_CODE`,
   `ADMIN_PIN`).
3. Board **Arduino Uno** und den richtigen Port wählen, hochladen.
4. Seriellen Monitor auf **9600 Baud** stellen. Beim Start erscheinen die
   Version des RFID-Lesers, die Zahl der gespeicherten Karten und der freie
   Arbeitsspeicher.

## Einstellungen im Code

Alle Zeiten und Grenzwerte stehen als Konstanten am Anfang der Hauptfirmware und
lassen sich dort ändern, ohne den restlichen Code anzufassen:

| Konstante | Wert | Bedeutung |
|---|---:|---|
| `EXIT_DELAY_MS` | 10 000 ms | Ausgangsverzögerung nach dem Scharfschalten |
| `ALARM_MS` | 30 000 ms | Dauer der Sirene |
| `ERROR_TONE_MS` | 2 000 ms | Dauer des Fehlertons |
| `MAX_WRONG_TRIES` | 3 | Fehlversuche bis zum Alarm |
| `ENTRY_TIMEOUT_MS` | 10 000 ms | halb getippte PIN wird gelöscht |
| `ADMIN_IDLE_TIMEOUT_MS` | 20 000 ms | Admin-Menü schließt bei Inaktivität |
| `MAX_STORED_UIDS` | 8 | maximale Zahl gespeicherter Karten |
| `RFID_POLL_MS` | 200 ms | Abstand zwischen zwei Abfragen des RFID-Lesers |

> [!NOTE]
> ✏️ **TODO (Team):** Gefordert war ein Fehlerton von 3 s, im Code stehen 2 s
> (`ERROR_TONE_MS`). Entweder auf `3000UL` ändern oder hier begründen, warum
> 2 s besser passen.

---

<sub>← [5 Aufbau und Schaltplan](Aufbau-und-Schaltplan) · [7 Wichtige Codeabschnitte](Wichtige-Codeabschnitte) →</sub>
