<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 4 · 🧩 Verwendete Bauteile

Alle Bauteile des Projekts und wofür sie eingesetzt werden. Preise und
Bezugsquellen stehen im Anhang unter [Kosten](Kosten), die Verdrahtung in
[Kapitel 5](Aufbau-und-Schaltplan).

## Elektronik

| Bauteil | Typ / Kenndaten | Aufgabe im Projekt |
|---|---|---|
| 🧠 **Mikrocontroller** | Arduino Uno R3 (ATmega328P, 16 MHz, 32 KB Flash, **2 KB SRAM**, 1 KB EEPROM) | Das „Gehirn“: fragt alle Eingaben ab, führt den Zustandsautomaten aus und steuert Display und Buzzer. Im internen EEPROM liegen die erlaubten RFID-Karten. |
| ⌨️ **Tastenfeld** | 4x4-Folien-Keypad, 16 Tasten, 8 Anschlüsse (4 Reihen, 4 Spalten) | PIN-Eingabe, Bestätigen (<kbd>#</kbd>), Löschen (<kbd>*</kbd>), Admin-Menü (<kbd>A</kbd>) und RFID-Reset (<kbd>B</kbd>) |
| 🖥️ **Display** | OLED 1,3 Zoll, 128 × 64 Pixel, monochrom, Controller **SH1106**, I²C, Adresse `0x3C` | Zeigt den Zustand als Symbol (Herz, Totenkopf, ✖), die PIN als `*`, Countdowns und das Admin-Menü |
| 📶 **RFID-Leser** | RC522-Modul (NXP MFRC522), 13,56 MHz, SPI, **Versorgung 3,3 V** | Liest die Kennung (UID) von Karten und Schlüsselanhängern, zweiter Weg zum Scharf- und Unscharfschalten |
| 💳 **RFID-Karte und -Anhänger** | MIFARE Classic, 4-Byte-UID | „Schlüssel“ für berechtigte Personen. Welche Karten gelten, wird im Admin-Menü festgelegt. |
| 👁️ **Bewegungsmelder** | PIR-Sensor HC-SR501 (Joy-IT SEN-HC-SR501), Erfassungswinkel ca. 120°, Reichweite bis ca. 7 m, Ausgang HIGH bei Bewegung | Erkennt, wenn jemand den Raum betritt, und löst im scharfen Zustand den Alarm aus |
| 🔊 **Buzzer** | Passiver Piezo-Summer | Alle Töne: Tastenklick, Bestätigung, Fehlerton, Piepen der Ausgangsverzögerung, Sirene |
| 🔋 **Stromversorgung** | 9-V-Batterie mit Hohlstecker (alternativ USB) | Versorgt den Arduino. Alle Module hängen an dessen 5-V- bzw. 3,3-V-Pin. |
| 🔗 **Breadboard und Jumper-Kabel** | Steckbrett, Steckbrücken | Gemeinsame 5-V- und GND-Schiene, Verbindungen ohne Löten |

> [!NOTE]
> **Warum ein passiver Buzzer?** Ein aktiver Buzzer piept mit einer festen
> Tonhöhe, sobald Spannung anliegt. Ein passiver Buzzer braucht ein
> Rechtecksignal vom Arduino (`tone()`), kann dafür aber jede Tonhöhe spielen.
> Nur so sind heller Bestätigungston, tiefer Fehlerton und eine auf- und
> abschwellende Sirene möglich.

> [!NOTE]
> **Warum SH1106 und nicht SSD1306?** Die meisten Anleitungen für 128x64-OLEDs
> nutzen den Controller SSD1306. Unser 1,3-Zoll-Display hat aber einen SH1106.
> Mit der falschen Library bleibt es leer oder zeigt Streifen, siehe
> [Herausforderungen](Herausforderungen#oled-display-bleibt-leer).

## Software und Bibliotheken

| Bibliothek | Wofür |
|---|---|
| Adafruit SH110X | Ansteuerung des OLED-Displays (Klasse `Adafruit_SH1106G`) |
| Adafruit GFX | Zeichnen von Formen und Text (Herz, Totenkopf, Countdown) |
| Adafruit BusIO | Hilfsschicht für I²C, wird von SH110X benötigt |
| MFRC522 | Ansteuerung des RFID-Lesers |
| `Wire`, `SPI`, `EEPROM` | I²C-Bus, SPI-Bus und Kartenspeicher, in der Arduino IDE enthalten |
| Keypad | nur im Test-Sketch `hardware_test`. Die Hauptfirmware scannt das Tastenfeld selbst, siehe [Kapitel 7](Wichtige-Codeabschnitte#75-tastenfeld-selbst-abfragen). |

Quellen zu allen Bauteilen und Bibliotheken: [Quellenverzeichnis](Quellenverzeichnis).

## Gehäuse

Für das 3D-gedruckte Gehäuse kommen fünf Druckteile aus PLA, Schrauben und ein
3-adriges Kabel zum Sensorteil dazu. Die vollständige Liste steht unter
[Kosten](Kosten#gehäuse), Planung und Bauanleitung in der
[Gehäuse-Anleitung](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/MDs/gehaeuse.md).

---

<sub>← [3 Funktionsbeschreibung](Funktionsbeschreibung) · [5 Aufbau und Schaltplan](Aufbau-und-Schaltplan) →</sub>
