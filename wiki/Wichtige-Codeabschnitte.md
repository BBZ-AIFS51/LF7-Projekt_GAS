<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 7 · 🧠 Wichtige Codeabschnitte

Die zentralen Stellen der Hauptfirmware
[`alarm_system.ino`](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Code/alarm_system/alarm_system.ino),
erklärt. Das übliche Grundgerüst (Variablen, `setup()`, Zeichenfunktionen für
die Symbole) ist nicht aufgeführt. Die Ausschnitte sind gekürzt: Testausgaben
über den seriellen Monitor sind weggelassen, `// …` markiert größere Lücken.
Die Kommentare im Code sind auf Englisch.

| Abschnitt | Funktionen im Code |
|---|---|
| [7.1 Programmablauf: nichts darf blockieren](#71-programmablauf-nichts-darf-blockieren) | `loop()` |
| [7.2 Zustandsautomat](#72-zustandsautomat) | `setState()`, `updateState()` |
| [7.3 Zugriff erlaubt oder verweigert](#73-zugriff-erlaubt-oder-verweigert) | `accessGranted()`, `accessDenied()` |
| [7.4 Bewegung erkennen](#74-bewegung-erkennen) | `handleMotion()` |
| [7.5 Tastenfeld selbst abfragen](#75-tastenfeld-selbst-abfragen) | `scanKeypad()`, `getKeyPress()` |
| [7.6 RFID-Karten lesen und speichern](#76-rfid-karten-lesen-und-speichern) | `readNewCardUid()`, `loadUidsFromEeprom()` |
| [7.7 Töne ohne Warten](#77-töne-ohne-warten) | `updateSound()` |
| [7.8 Arbeitsspeicher sparen](#78-arbeitsspeicher-sparen) | `F()`, `PROGMEM` |

## 7.1 Programmablauf: nichts darf blockieren

```cpp
void loop() {
  if (state == STATE_ADMIN) {
    handleAdminKeypad();
    handleAdminRfid();
  } else {
    handleKeypad();
    handleRfid();
  }
  handleMotion();
  updateState();
  updateSound();
  updateDisplay();
}
```

`loop()` ruft nur kurze Funktionen nacheinander auf und läuft so viele tausend
Mal pro Sekunde. Jede Funktion schaut nach, ob es für sie etwas zu tun gibt, und
kehrt sofort zurück.

**Wichtigste Entscheidung im ganzen Programm:** Es gibt kein `delay()`. Würde der
Code zum Beispiel für die 30 Sekunden Sirene `delay(30000)` aufrufen, könnte in
dieser Zeit niemand die PIN eingeben, um den Alarm zu beenden. Stattdessen merkt
sich das Programm, **wann** etwas angefangen hat (`millis()`), und prüft bei
jedem Durchlauf, ob die Zeit schon um ist. So reagiert die Anlage immer sofort
auf Tasten, Karten und Bewegung, auch während Töne laufen.

## 7.2 Zustandsautomat

```cpp
enum SystemState { STATE_DISARMED, STATE_EXIT_DELAY, STATE_ARMED, STATE_ALARM, STATE_ADMIN };
SystemState state = STATE_DISARMED;

void setState(SystemState next) {
  state = next;
  stateStart = millis();          // remember when this state began
  // …
}

void updateState() {
  unsigned long now = millis();

  if (state == STATE_EXIT_DELAY) {
    // … one short beep per second …
    if (now - stateStart >= EXIT_DELAY_MS) {
      setState(STATE_ARMED);
    }
  } else if (state == STATE_ALARM) {
    if (now - stateStart >= ALARM_MS) {
      stopSound();
      setState(STATE_ARMED);      // siren over, stay armed
    }
  }
}
```

- Die Variable `state` hält fest, in welchem der fünf Zustände die Anlage gerade
  ist (Diagramm in [Kapitel 3](Funktionsbeschreibung#zustände-der-anlage)). Ein
  `enum` macht den Code lesbar: `STATE_ARMED` statt einer Zahl wie `2`.
- Jeder Zustandswechsel läuft über `setState()`. Dort wird die Startzeit
  gespeichert. Damit kann `updateState()` mit einer einfachen Subtraktion
  prüfen, ob die Ausgangsverzögerung (10 s) oder die Sirene (30 s) abgelaufen
  ist.
- **Nach dem Alarm geht die Anlage zurück auf SCHARF, nicht auf UNSCHARF.**
  Sonst könnte ein Einbrecher einfach 30 Sekunden warten und wäre danach
  unbemerkt im Raum.

> [!NOTE]
> `now - stateStart >= …` funktioniert auch dann, wenn `millis()` nach etwa
> 49 Tagen überläuft und wieder bei 0 anfängt. Ein Vergleich wie
> `now >= stateStart + ALARM_MS` würde in diesem Moment falsch rechnen.

## 7.3 Zugriff erlaubt oder verweigert

PIN und RFID-Karte landen am Ende in denselben zwei Funktionen. Dadurch verhalten
sich beide Wege garantiert gleich.

```cpp
void accessGranted() {
  wrongTries = 0;
  switch (state) {
    case STATE_ALARM:
    case STATE_ARMED:
    case STATE_EXIT_DELAY:
      setState(STATE_DISARMED);   // anything active -> disarm
      break;
    case STATE_DISARMED:
      setState(STATE_EXIT_DELAY); // disarmed -> start arming
      break;
  }
  startSound(SOUND_OK);
}

void accessDenied(const __FlashStringHelper *reason) {
  if (state == STATE_ALARM) {
    return;                       // wrong entry must not stop the siren
  }
  wrongTries++;
  if (wrongTries >= MAX_WRONG_TRIES) {
    wrongTries = 0;
    triggerAlarm(reason);
  } else {
    startSound(SOUND_ERROR);
  }
}
```

- **Richtige Eingabe** schaltet um: Ist die Anlage aktiv (Ausgangsverzögerung,
  scharf oder Alarm), wird sie unscharf. Ist sie unscharf, startet die
  Ausgangsverzögerung. Der Zähler für Fehlversuche wird zurückgesetzt.
- **Falsche Eingabe** erhöht den Zähler. Beim dritten Mal (`MAX_WRONG_TRIES`)
  gibt es Alarm, sonst nur den Fehlerton. Das verhindert, dass jemand die PIN
  einfach durchprobiert.
- **Während des Alarms** wird eine falsche Eingabe ignoriert. Vorher hat der
  Fehlerton die Sirene ersetzt, und nach dem Fehlerton war Ruhe (siehe
  [Herausforderungen](Herausforderungen#falsche-eingabe-beendet-den-alarm)).

Die PIN selbst wird in `submitEntry()` mit `strcmp(entry, PIN_CODE)` verglichen,
also Zeichen für Zeichen mit der gespeicherten PIN.

## 7.4 Bewegung erkennen

```cpp
void handleMotion() {
  bool motion = (digitalRead(MOTION_PIN) == HIGH);

  // rising edge only, so one long detection does not retrigger endlessly
  if (motion && !lastMotion && state == STATE_ARMED) {
    triggerAlarm(F("motion detected"));
  }
  lastMotion = motion;
}
```

- Der Bewegungsmelder liefert HIGH, solange er Bewegung sieht. Ausgewertet wird
  nur der **Wechsel von LOW auf HIGH** (steigende Flanke): `motion` ist jetzt
  wahr, `lastMotion` vom letzten Durchlauf war falsch. So löst eine einzige,
  längere Bewegung den Alarm nur einmal aus.
- Die Bedingung `state == STATE_ARMED` sorgt dafür, dass Bewegung im unscharfen
  Zustand und während der Ausgangsverzögerung keine Rolle spielt.
- Beim Scharfschalten setzt `setState()` den Wert `lastMotion` auf den
  aktuellen Sensorwert. Sieht der Sensor in diesem Moment noch die Person, die
  gerade gegangen ist, zählt das nicht als neue Bewegung.

## 7.5 Tastenfeld selbst abfragen

Die übliche Keypad-Library brauchte rund 120 Byte Arbeitsspeicher, die der Uno
nicht übrig hatte (siehe [7.8](#78-arbeitsspeicher-sparen)). Deshalb fragt die
Firmware die Tastenmatrix selbst ab.

```cpp
char scanKeypad() {
  char found = 0;
  for (byte c = 0; c < 4 && found == 0; c++) {
    pinMode(COL_PINS[c], OUTPUT);     // pull this column low
    delayMicroseconds(5);             // let the line settle
    for (byte r = 0; r < 4; r++) {
      if (digitalRead(ROW_PINS[r]) == LOW) {
        found = pgm_read_byte(&KEYS[r][c]);
        break;
      }
    }
    pinMode(COL_PINS[c], INPUT);      // back to high-Z
  }
  return found;
}
```

- Die 16 Tasten sitzen an den Kreuzungen von 4 Reihen und 4 Spalten. Eine
  gedrückte Taste verbindet ihre Reihe mit ihrer Spalte.
- Die Reihen-Pins haben einen internen **Pull-up-Widerstand** und lesen
  normalerweise HIGH. Die Schleife zieht nacheinander je eine Spalte auf LOW.
  Liest dabei eine Reihe LOW, ist genau die Taste an dieser Kreuzung gedrückt.
- Welches Zeichen zu Reihe und Spalte gehört, steht in der Tabelle `KEYS`.

`getKeyPress()` **entprellt** das Ergebnis: Ein mechanischer Kontakt flattert
beim Drücken ein paar Millisekunden zwischen offen und geschlossen. Eine Taste
zählt erst, wenn sie 20 ms (`DEBOUNCE_MS`) stabil gedrückt ist, und wird nur
einmal pro Druck gemeldet.

## 7.6 RFID-Karten lesen und speichern

```cpp
bool readNewCardUid() {
  if (!rfidOk || millis() - lastRfidPoll < RFID_POLL_MS) {
    return false;                     // ask the reader only every 200 ms
  }
  lastRfidPoll = millis();

  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return false;
  }
  // …
  mfrc522.PICC_HaltA();               // send the card to sleep
  return true;
}
```

- Jede Karte hat eine feste Kennung, die **UID** (bei unseren Karten 4 Byte).
  Die Firmware vergleicht sie Byte für Byte mit der Liste der erlaubten Karten
  (`findStoredUid()`).
- Der Leser wird **nur alle 200 ms** gefragt. Liegt keine Karte auf, wartet
  eine Abfrage etwa 25 ms auf eine Antwort. Bei jedem Durchlauf von `loop()`
  würde das Tastenfeld träge und die Sirene stockend.
- `PICC_HaltA()` schickt die Karte schlafen. Eine liegengelassene Karte schaltet
  die Anlage dadurch nicht ständig hin und her.

**Speicherung im EEPROM:** Die erlaubten Karten stehen nicht im Code, sondern im
EEPROM des Uno. Dieser Speicher behält seinen Inhalt ohne Strom und auch beim
erneuten Hochladen des Sketches.

| Adresse | Inhalt |
|---|---|
| 0 | Kennbyte `0xA5`: „hier wurde schon einmal gespeichert“ |
| 1 | Anzahl gespeicherter Karten |
| ab 2 | je 4 Byte pro Karte |

Fehlt das Kennbyte, ist der Chip neu. Dann schreibt `loadUidsFromEeprom()` eine
Startliste hinein. Gespeichert wird mit `EEPROM.update()`, das eine Zelle nur
beschreibt, wenn sich ihr Wert ändert. Das schont den Speicher, der nur etwa
100 000 Schreibvorgänge pro Zelle verträgt.

## 7.7 Töne ohne Warten

```cpp
case SOUND_ALARM: {
  unsigned long phase = t % 500UL;               // 500 ms up/down cycle
  unsigned long step  = (phase % 250UL) / 10UL;  // 0..24
  int freq = (phase < 250UL) ? (2500 + (int)step * 50)
                             : (3700 - (int)step * 50);
  setFreq(freq);
  break;
}
```

- Alle Töne funktionieren nach demselben Prinzip wie der Zustandsautomat:
  `t` ist die Zeit seit Beginn des Tons. Daraus wird bei jedem Durchlauf die
  passende Frequenz berechnet.
- **Sirene:** In jeder halben Sekunde steigt die Frequenz in 25 Stufen von
  2500 Hz auf 3700 Hz und fällt wieder ab. In diesem Bereich ist der Buzzer am
  lautesten, das Auf und Ab macht den Ton schrill und auffällig.
- **Fehlerton:** wechselt alle 35 ms zwischen 95 Hz und 135 Hz. Dadurch klingt
  er rau und brummend.
- **Bestätigung:** zwei kurze, helle Töne (1568 Hz, dann 2093 Hz).
- `setFreq()` ruft `tone()` nur auf, wenn sich die Frequenz wirklich ändert.
  Sonst würde der Ton bei jedem Durchlauf neu gestartet und knacken.

## 7.8 Arbeitsspeicher sparen

Der Uno hat nur **2048 Byte** Arbeitsspeicher (SRAM). Das Display braucht davon
allein 1024 Byte als Bildpuffer. Wird der Rest knapp, überschreibt das Programm
seine eigenen Daten: Das Display zeigt Pixelmüll, der Arduino startet neu oder
erkennt Tasten falsch (siehe [Herausforderungen](Herausforderungen#arbeitsspeicher-zu-knapp)).

```cpp
Serial.println(F("=== Alarm system ready (disarmed) ==="));

const char KEYS[4][4] PROGMEM = {
  {'1', '2', '3', 'A'},
  // …
};
```

- `F("…")` lässt einen Text im Flash-Speicher (32 KB) und kopiert ihn nicht in
  den Arbeitsspeicher. Das gilt für alle Texte der Firmware.
- `PROGMEM` macht dasselbe für feste Tabellen wie die Tastenbelegung. Gelesen
  wird dann mit `pgm_read_byte()`.
- Keine Keypad-Library, kein `snprintf`, keine Textpuffer. Beim Start gibt die
  Firmware den freien Speicher über den seriellen Monitor aus (`freeRam()`).

> [!NOTE]
> ✏️ **TODO (Team):** Gemessenen Wert eintragen: Beim Start meldet die Firmware
> `free SRAM: ___` Byte. (Vorher, mit Keypad-Library: 205 Byte.)

---

<sub>← [6 Sourcecode](Sourcecode) · [8 Herausforderungen](Herausforderungen) →</sub>
