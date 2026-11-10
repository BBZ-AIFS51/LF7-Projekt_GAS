# Hardware-Aufbau — Projekt GAS

Stand: 10.11.2026 (fertiger Aufbau im Gehäuse, mit RFID-Leser und Batterie an
VIN). Diese Datei beschreibt die Hardware, wie sie tatsächlich verdrahtet ist.

Die erste Fassung dieser Datei war ein Export aus Cirkit Designer, bevor es
Firmware, RFID-Leser und Gehäuse gab (SDA/SCL waren dort vertauscht, der
Bewegungsmelder hing noch an D11). Sie steht in der Git-Historie.

Verwandte Dateien:

- Schaltplan (Versuchsaufbau, großes Breadboard):
  [../Schaltplan/SCHALTPLAN.png](../Schaltplan/SCHALTPLAN.png)
- Steckplan im Gehäuse (Mini-Breadboard):
  [../Schaltplan/steckplan_gehaeuse.svg](../Schaltplan/steckplan_gehaeuse.svg)
- Firmware: [../Code/alarm_system/alarm_system.ino](../Code/alarm_system/alarm_system.ino)
- Gehäuse: [gehaeuse.md](gehaeuse.md)

---

## Bauteile

| # | Bauteil | Typ / Kenndaten | Versorgung |
|---|---|---|---|
| 1 | Mikrocontroller | Arduino Uno R3 (ATmega328P, 16 MHz, 32 KB Flash, 2 KB SRAM, 1 KB EEPROM) | 9 V an VIN |
| 2 | Tastenfeld | 4x4-Folien-Keypad, 8 Anschlüsse (R1–R4, C1–C4) | keine (nur Signalleitungen) |
| 3 | Display | OLED 1,3", 128 × 64, Controller **SH1106**, I²C-Adresse **0x3C** | 5 V |
| 4 | RFID-Leser | RC522 (NXP MFRC522), 13,56 MHz, SPI | **3,3 V** |
| 5 | RFID-Karten | MIFARE Classic, 4-Byte-UID (Karte und Schlüsselanhänger) | — |
| 6 | Bewegungsmelder | PIR HC-SR501, Ausgang **active HIGH** | 5 V |
| 7 | Buzzer | passiver Piezo-Summer, direkt am Pin, ohne Transistor | 5 V |
| 8 | Stromversorgung | 9-V-Blockbatterie mit Clip, an **VIN** | — |
| 9 | Stromverteilung | Mini-Breadboard SYB-170 (17 Spalten, je 2 × 5 Löcher, keine Stromschienen) | — |

Die Bauteile sind auf zwei Gehäuse verteilt:

- **Bedienteil** (außen an der Tür): Uno, Keypad, OLED, RC522, Buzzer,
  Mini-Breadboard, Batterie
- **Sensorteil** (innen, auf einem 60°-Keil zur Tür gedreht): HC-SR501,
  mit dem Bedienteil über ein 3-adriges Kabel (5 V, GND, OUT) verbunden

---

## Pin-Belegung am Uno

| Pin am Uno | Bauteil | Anschluss am Bauteil | Funktion |
|---|---|---|---|
| D2 | Keypad | C4 | Spalte |
| D3 | Keypad | C3 | Spalte |
| D4 | Keypad | C2 | Spalte |
| D5 | Keypad | C1 | Spalte |
| D6 | Keypad | R4 | Reihe |
| D7 | Keypad | R3 | Reihe |
| D8 | Keypad | R2 | Reihe |
| D9 | Keypad | R1 | Reihe |
| D10 | Buzzer | Signal (S) | Ton über `tone()` |
| D11 | RC522 | MOSI | Hardware-SPI (fest) |
| D12 | RC522 | MISO | Hardware-SPI (fest) |
| D13 | RC522 | SCK | Hardware-SPI (fest) |
| A0 | RC522 | SDA / SS | Chip-Select |
| A1 | RC522 | RST | Reset |
| A2 | Bewegungsmelder | OUT | Bewegung erkannt = HIGH |
| A4 | OLED | SDA | I²C-Daten (fest) |
| A5 | OLED | SCL | I²C-Takt (fest) |
| 3V3 | RC522 | VCC | **nur 3,3 V** |
| GND (2. Pin) | RC522 | GND | Masse |
| 5V | Mini-Breadboard Spalte 13 | — | 5 V für OLED, Buzzer, Bewegungsmelder |
| GND | Mini-Breadboard Spalte 15 | — | gemeinsame Masse |
| VIN | Mini-Breadboard Spalte 17 | — | 9 V von der Batterie |

Nicht angeschlossen: RC522-IRQ. Frei sind nur noch **A3** und **D0/D1**
(serielle Schnittstelle).

Pin-Mapping des Keypads in der Firmware:

```cpp
const byte ROW_PINS[4] = {9, 8, 7, 6};   // R1, R2, R3, R4
const byte COL_PINS[4] = {5, 4, 3, 2};   // C1, C2, C3, C4
```

Tastenbelegung (Standard 4x4):

```text
1 2 3 A
4 5 6 B
7 8 9 C
* 0 # D
```

---

## Stromverteilung im Bedienteil (Mini-Breadboard)

Das Mini-Breadboard verteilt nur die Versorgung, alle Signalleitungen gehen
direkt zum Uno. Spalten von links gezählt, Blick ins offene Rückteil mit dem
Uno unten.

| Spalte | Hälfte | Netz | Was steckt drin |
|---|---|---|---|
| 13 | oben | +5 V | Uno 5V, OLED VCC, Buzzer +, Bewegungsmelder VCC (Kabel) |
| 15 | oben | GND | Uno GND, OLED GND, Buzzer −, Bewegungsmelder GND (Kabel), Batterie − |
| 17 | unten | +9 V | Batterie +, Brücke zu Uno VIN |

RC522 3,3 V und GND gehen direkt an den Uno (3V3 und zweiter GND-Pin), nicht
übers Breadboard.

---

## Wichtige Hinweise

- **RC522 nur an 3,3 V.** 5 V an VCC zerstört das Modul. Der 3V3-Pin liefert
  50 mA, der RC522 braucht 13–26 mA. Die SPI-Leitungen kommen mit 5-V-Pegel
  vom Uno; das liegt laut Datenblatt außerhalb der Spezifikation,
  funktioniert in der Praxis aber.
- **Bewegungsmelder an A2, nicht D11.** D11 ist der feste SPI-MOSI-Pin für
  den RC522. A2 ist am Uno Digitalpin 16 und funktioniert normal mit
  `digitalRead()`.
- **I²C ist am Uno fest:** SDA = A4, SCL = A5.
- **OLED ist ein SH1106, kein SSD1306.** Library `Adafruit SH110X`, Klasse
  `Adafruit_SH1106G`.
- **`SPI.begin()` setzt D10 auf HIGH** (D10 ist der SS-Pin des AVR), dort
  hängt der Buzzer. Deshalb setzt die Firmware den Buzzer-Pin erst nach
  `SPI.begin()` auf LOW.
- **Batterie an VIN hat keinen Verpolungsschutz** (die Schutzdiode sitzt nur
  hinter dem Hohlstecker). Plus und Minus vertauscht = Uno kaputt. VIN braucht
  7–12 V, unter ~7 V wird es unzuverlässig.
- **Laufzeit** mit einer frischen 9-V-Batterie grob 3–5 h (Gesamtstrom etwa
  100 mA). Ausschalten = Clip abziehen. USB darf zum Hochladen gleichzeitig
  stecken.
- **Prüfwert RC522:** `VersionReg` antwortet `0x91` oder `0x92`. `0x00` oder
  `0xFF` heißt: Modul antwortet nicht (Verdrahtung oder 5 V statt 3,3 V).
