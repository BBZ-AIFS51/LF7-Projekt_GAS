<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 5 · 🔌 Aufbau und Schaltplan

Wie die Bauteile verdrahtet sind: Schaltplan, Pin-Zuordnung, Stromversorgung
und ein Foto vom echten Aufbau zum Vergleich.

## Schaltplan

<p align="center">
  <a href="https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Schaltplan/SCHALTPLAN.png"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Schaltplan/SCHALTPLAN.png" alt="Schaltplan: Arduino Uno mit Keypad, OLED, RFID-RC522, Buzzer, Bewegungsmelder und 9-V-Batterie" width="85%"></a><br>
  <sub>Erstellt mit Cirkit Designer · Bild anklicken für volle Größe · auch als <a href="https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Schaltplan/SCHALTPLAN.svg">SVG</a></sub>
</p>

> [!NOTE]
> Der Schaltplan zeigt den **Versuchsaufbau** auf dem großen Breadboard, dort
> hängt die Batterie noch am Hohlstecker. Im Gehäuse sitzt die Batterie an
> **VIN**, verteilt wird über ein Mini-Breadboard, siehe
> [Stromversorgung im Gehäuse](#stromversorgung-im-gehäuse).
>
> ✏️ **TODO (Team):** Im Cirkit-Designer-Projekt die Batterie von der
> Hohlbuchse auf VIN/GND umstecken und `SCHALTPLAN.png`/`.svg` neu exportieren.

## Pin-Zuordnung

| Bauteil | Anschluss am Bauteil | Pin am Uno | Bus / Signal |
|---|---|---|---|
| ⌨️ Keypad | Reihen R1, R2, R3, R4 | D9, D8, D7, D6 | digital, Matrix |
| ⌨️ Keypad | Spalten C1, C2, C3, C4 | D5, D4, D3, D2 | digital, Matrix |
| 🖥️ OLED | SDA · SCL | **A4 · A5** | I²C (fest vorgegeben) |
| 📶 RFID-RC522 | SDA/SS · RST | A0 · A1 | SPI-Auswahl, Reset |
| 📶 RFID-RC522 | MOSI · MISO · SCK | **D11 · D12 · D13** | SPI (fest vorgegeben) |
| 📶 RFID-RC522 | VCC | **3,3 V** | ⚠️ nicht 5 V |
| 👁️ Bewegungsmelder | OUT | A2 | digital, HIGH = Bewegung |
| 🔊 Buzzer | Signal (S) | D10 | `tone()` |
| alle anderen Module | VCC · GND | 5 V · GND | gemeinsame Spalten auf dem Mini-Breadboard |
| 🔋 9-V-Batterie | + (rot) · − (schwarz) | **VIN** · GND | über das Mini-Breadboard, ⚠️ kein Verpolungsschutz |

Damit ist der Uno fast voll: Frei sind nur noch A3 und D0/D1. D0/D1 sind die
serielle Schnittstelle zum PC und werden für Upload und Testausgaben gebraucht.

> [!WARNING]
> **Der RFID-Leser läuft mit 3,3 V.** An 5 V wird das Modul zerstört. Alle
> anderen Module bekommen 5 V.
>
> **VIN hat keinen Verpolungsschutz.** Die Schutzdiode des Uno sitzt nur
> hinter dem Hohlstecker ([1]). Plus und Minus der Batterie vertauscht = Uno
> kaputt.

### Warum diese Pins?

- **I²C und SPI liegen beim Uno auf festen Pins.** Das Display muss an A4/A5,
  die Datenleitungen des RFID-Lesers an D11–D13. Nur die Auswahl- und
  Reset-Leitung des Lesers (A0, A1) ist frei wählbar.
- **Der Bewegungsmelder ist umgezogen.** Er saß zuerst auf D11. Als der
  RFID-Leser dazukam, wurde D11 als SPI-Leitung gebraucht, deshalb hängt der
  Sensor jetzt an A2. Die analogen Pins funktionieren auch als normale
  Digitalpins.
- **Das Keypad braucht 8 Pins** (D2–D9), weil jede Reihe und jede Spalte eine
  eigene Leitung hat.

## Stromversorgung im Gehäuse

Am Hohlstecker würde der Batterieclip unten aus dem Gehäuse ragen. Deshalb
liegt der **9-V-Block innen** links neben dem Mini-Breadboard und speist den
Uno über den Pin **VIN** (erlaubt sind 7–12 V, [1]). Der Spannungsregler des
Uno macht daraus die 5 V für alle Module, der RC522 bekommt 3,3 V vom Uno.

Das Mini-Breadboard (SYB-170) hat keine Stromschienen, sondern 17 Spalten mit je
zweimal 5 verbundenen Löchern. Es verteilt nur den Strom, alle Signale gehen
direkt an den Uno.

<p align="center">
  <a href="https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Schaltplan/steckplan_gehaeuse.svg"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Schaltplan/steckplan_gehaeuse.svg" alt="Steckplan des Mini-Breadboards: Spalte 13 = 5 V, Spalte 15 = GND, Spalte 17 unten = 9 V zur VIN" width="100%"></a>
</p>

| Spalte (von links) | Hälfte | Netz | Was steckt drin |
|---|---|---|---|
| 13 | oben | +5 V | Uno 5V, OLED VCC, Buzzer +, Bewegungsmelder VCC (Kabel) |
| 15 | oben | GND | Uno GND, OLED GND, Buzzer −, Bewegungsmelder GND (Kabel), Batterie − |
| 17 | unten | +9 V | Batterie +, Brücke zum Uno-Pin VIN |

- **Ein/Aus:** Batterieclip anstecken bzw. abziehen, einen Schalter gibt es nicht.
- **Laufzeit:** grob 3–5 Stunden. Die Schaltung zieht um die 100 mA, ein
  Alkali-9-V-Block hat etwa 400–500 mAh. Für Tests und die Vorführung reicht
  das, für Dauerbetrieb nicht.
- **Hochladen:** USB-Kabel anstecken, die Batterie darf dranbleiben. Der Uno
  schaltet selbst auf VIN um, sobald dort mehr als etwa 6,6 V anliegen.

> [!NOTE]
> ✏️ **TODO (Team):** Laufzeit mit einer frischen Batterie einmal messen und
> hier eintragen.

## Verdrahtung als Übersicht

<p align="center">
  <img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/docs/wiring.svg" alt="Animierte Übersicht: Verdrahtung aller Bauteile mit dem Arduino Uno" width="100%">
</p>

## Foto vom Versuchsaufbau

<table>
  <tr>
    <td align="center" width="50%"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Schaltplan/SCHALTPLAN.png" alt="Schaltplan"><br><sub>Schaltplan</sub></td>
    <td align="center" width="50%">✏️ <b>TODO (Team):</b> Foto<br><sub>Echter Aufbau auf dem Breadboard</sub></td>
  </tr>
</table>

> [!IMPORTANT]
> ✏️ **TODO (Team):** Foto vom echten Aufbau machen (von oben, alle Kabel gut
> zu sehen) und im Repository unter `wiki/images/aufbau.jpg` ablegen. Dann in der
> Tabelle oben die rechte Zelle ersetzen durch:
> `<img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/wiki/images/aufbau.jpg" alt="Versuchsaufbau">`
>
> Am besten gleich prüfen, ob Schaltplan und Foto übereinstimmen, vor allem
> die 3,3 V am RFID-Leser und der Bewegungsmelder an A2.

## Gehäuse

Für den Einsatz an der Tür gibt es zwei 3D-gedruckte Gehäuse, verbunden über
ein 3-adriges Kabel (5 V, GND, Signal des Bewegungsmelders): das **Bedienteil**
außen mit Uno, Keypad, Display, RFID-Leser und Buzzer und das **Sensorteil**
innen. Ein 60°-Keil dreht den Bewegungsmelder zur Tür.

<table>
  <tr>
    <td align="center" width="50%"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/zusammengebaut.png" alt="Bedienteil und Sensorteil zusammengebaut"><br><sub>Bedienteil und Sensorteil auf dem Keil</sub></td>
    <td align="center" width="50%"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/explosion.png" alt="Explosionszeichnung des Bedienteils"><br><sub>Explosionszeichnung des Bedienteils</sub></td>
  </tr>
</table>

Planung, Druckeinstellungen und Zusammenbau:
[Gehäuse-Anleitung](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/MDs/gehaeuse.md) ·
im [3D-Modell](https://bbz-aifs51.github.io/LF7-Projekt_GAS/#enclosure) lässt
sich das Gehäuse aufklappen.

<p align="center">
  <img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/wiki/images/gehaeuse_innen.jpg" alt="Gedrucktes Rückteil des Bedienteils mit Arduino Uno und Mini-Breadboard" width="45%"><br>
  <sub>Das gedruckte Rückteil: Uno unten (USB-Buchse in der Aussparung), darüber das Mini-Breadboard</sub>
</p>

> [!NOTE]
> ✏️ **TODO (Team):** Foto vom fertig verkabelten und zugeschraubten Gerät ergänzen.

---

<sub>← [4 Verwendete Bauteile](Verwendete-Bauteile) · [6 Sourcecode](Sourcecode) →</sub>
