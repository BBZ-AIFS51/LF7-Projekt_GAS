<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 8 · 🧗 Herausforderungen

Bei welchen Bauteilen und Arbeitsschritten es Schwierigkeiten gab oder etwas
Besonderes zu beachten war, was die Ursache war und wie wir das Problem gelöst
haben.

| Bauteil / Bereich | Problem | Lösung in einem Satz |
|---|---|---|
| 🖥️ Display | [Display bleibt leer](#oled-display-bleibt-leer) | richtige Library für den SH1106 |
| 🧠 Arduino | [Arbeitsspeicher zu knapp](#arbeitsspeicher-zu-knapp) | Texte in den Flash, Keypad selbst abfragen |
| 📶 RFID + 👁️ Bewegungsmelder | [Zwei Bauteile, ein Pin](#zwei-bauteile-ein-pin) | Bewegungsmelder auf A2 umgezogen |
| 📶 RFID + 🔊 Buzzer | [Buzzer-Pin nach dem Start auf HIGH](#buzzer-pin-nach-dem-start-auf-high) | Reihenfolge in `setup()` getauscht |
| 📶 RFID | [Tastenfeld träge, Sirene stockt](#tastenfeld-träge-sirene-stockt) | Kartenleser nur alle 200 ms abfragen |
| 📶 RFID | [Kartenleser antwortet nicht mehr](#kartenleser-antwortet-nicht-mehr) | Neustart des Lesers per Taste <kbd>B</kbd> |
| 📶 RFID | [Versorgungsspannung](#versorgungsspannung-des-rfid-lesers) | 3,3 V statt 5 V |
| 🔊 Alarm | [Falsche Eingabe beendet den Alarm](#falsche-eingabe-beendet-den-alarm) | falsche Eingaben im Alarm ignorieren |
| 📦 Gehäuse | [Wohin mit dem Bewegungsmelder?](#wohin-mit-dem-bewegungsmelder) | eigenes Sensorteil im Raum, auf einem 60°-Keil |

---

### OLED-Display bleibt leer

**Zu beachten:** Fast alle Anleitungen für 128x64-OLEDs gehen von einem
anderen Display-Controller aus. Mit deren Beispielcode bleibt unser Display
leer oder zeigt nur Streifen.

**Ursache:** Die meisten Anleitungen verwenden die Library für den
Display-Controller SSD1306. Unser 1,3-Zoll-Display hat aber einen **SH1106**.
Beide sehen gleich aus, werden aber unterschiedlich angesteuert.

**Lösung:** Beim ersten Test am Aufbau ermittelt, welcher Controller verbaut
ist, danach die Library *Adafruit SH110X* mit der Klasse `Adafruit_SH1106G`
verwendet.

> [!NOTE]
> ✏️ **TODO (Team):** Kurz ergänzen, wie ihr den SH1106 erkannt habt (Aufdruck,
> Datenblatt des Händlers, Ausprobieren?).

### Arbeitsspeicher zu knapp

**Situation:** Mit der ersten Firmware zeigte das Display Pixelmüll statt Herz
und Totenkopf. Nach einer Verbesserung lief es, aber nach einmal Scharf- und
Unscharfschalten wurde die richtige PIN plötzlich als falsch erkannt.

**Ursache:** Der Uno hat 2048 Byte Arbeitsspeicher, das Display belegt davon
allein 1024 Byte. Im seriellen Monitor stand nur noch `free SRAM: 205`, und eine
Ausgabe brach mitten im Wort ab, gefolgt von der Startmeldung. Der Arduino
startete also neu, weil der Speicher überlief.

**Lösung:** In zwei Schritten Speicher gespart:
1. Alle Texte mit `F()` im Flash-Speicher abgelegt, kein `snprintf`, keine
   Textpuffer.
2. Die Keypad-Library (ca. 120 Byte) durch eine eigene Abfrage der Tastenmatrix
   ersetzt, siehe [Kapitel 7.5](Wichtige-Codeabschnitte#75-tastenfeld-selbst-abfragen).

Seitdem gibt die Firmware beim Start den freien Speicher aus, um das im Blick zu
behalten.

### Zwei Bauteile, ein Pin

**Situation:** Der Bewegungsmelder hing an D11. Als der RFID-Leser dazukam,
brauchte der ebenfalls D11.

**Ursache:** Der RFID-Leser kommuniziert über SPI. Beim Uno liegen die
SPI-Leitungen fest auf D11, D12 und D13, sie lassen sich nicht verlegen.

**Lösung:** Der Bewegungsmelder ist auf **A2** umgezogen. Die analogen Pins des
Uno lassen sich auch als normale Digitalpins verwenden.

### Buzzer-Pin nach dem Start auf HIGH

**Zu beachten:** Beim Einbau des RFID-Lesers kam eine versteckte
Wechselwirkung mit dem Buzzer dazu.

**Ursache:** `SPI.begin()` schaltet D10 automatisch auf Ausgang mit HIGH, weil
D10 beim Uno der feste SS-Pin für SPI ist. Genau dort hängt aber der Buzzer.

**Lösung:** In `setup()` zuerst `SPI.begin()` aufrufen und **erst danach** den
Buzzer-Pin auf LOW setzen. So startet der Buzzer immer in einem definierten,
stillen Zustand.

### Tastenfeld träge, Sirene stockt

**Zu beachten:** Der RFID-Leser darf nicht bei jedem Durchlauf von `loop()`
abgefragt werden, sonst reagiert das Tastenfeld langsamer und die Sirene klingt
abgehackt.

**Ursache:** Liegt keine Karte auf, wartet eine Abfrage des Lesers etwa 25 ms
auf eine Antwort, die nie kommt. Bei jeder Runde von `loop()` summiert sich das.

**Lösung:** Der Leser wird nur noch alle 200 ms abgefragt. Eine Karte wird
trotzdem sofort erkannt, das Tastenfeld bleibt flüssig.

### Kartenleser antwortet nicht mehr

**Situation:** Die Lehrkraft hat darauf hingewiesen, dass sich RC522-Module
öfter aufhängen. Dann werden Karten plötzlich nicht mehr gelesen, und es hilft
nur, den ganzen Arduino neu zu starten.

**Ursache:** Günstige Nachbauten des RC522 hängen sich manchmal auf und
antworten dann nicht mehr über SPI.

**Lösung:** Auf Anregung der Lehrkraft startet Taste <kbd>B</kbd> (im
unscharfen Zustand) nur den Leser neu und prüft danach, ob er wieder antwortet.
Ein heller Ton heißt: Leser ist wieder da.

### Versorgungsspannung des RFID-Lesers

**Zu beachten:** Alle anderen Module laufen mit 5 V. Der RFID-Leser darf das nicht.

**Ursache:** Der Chip des RC522 ist für 3,3 V gebaut, 5 V zerstören das Modul.

**Lösung:** VCC des Lesers an den 3,3-V-Pin des Uno. Der liefert bis zu 50 mA,
der Leser braucht etwa 13–26 mA. Die Datenleitungen kommen weiter mit 5 V vom
Uno. Laut Datenblatt ist das außerhalb der Spezifikation, funktioniert in der
Praxis aber zuverlässig.

> [!NOTE]
> ✏️ **TODO (Team):** Gab es Probleme beim Verdrahten des Lesers (z. B. falsche
> Pins, lose Kabel)? Der Test-Sketch `rfid_test` zeigt die Version des Lesers:
> `0x91` oder `0x92` heißt „läuft“, `0x00` oder `0xFF` heißt „antwortet nicht“.

### Falsche Eingabe beendet den Alarm

**Situation:** Beim Testen ist aufgefallen: Wer während des Alarms eine falsche
PIN eingab oder eine falsche Karte vorhielt, hörte kurz den Fehlerton. Danach
war die Sirene aus.

**Ursache:** Es kann immer nur ein Ton gleichzeitig laufen. Der Fehlerton hat die
Sirene ersetzt, und nach seinem Ende war Stille, obwohl die Anlage noch im Alarm
war.

**Lösung:** Während des Alarms werden falsche Eingaben ignoriert. Nur die
richtige PIN oder eine bekannte Karte beendet ihn, siehe
[Kapitel 7.3](Wichtige-Codeabschnitte#73-zugriff-erlaubt-oder-verweigert).

### Wohin mit dem Bewegungsmelder?

**Situation:** Sitzt der Bewegungsmelder im selben Gehäuse wie das Tastenfeld,
sieht er die Person, die gerade die PIN eintippt.

**Lösung:** Zwei Gehäuse: Das Bedienteil hängt außen, das Sensorteil innen. Die
Wand liegt dazwischen, deshalb sieht der Sensor die Person am Tastenfeld nicht.
Flach an der Wand hätte der Sensor allerdings geradeaus in den Raum geschaut und
die Tür nur am Rand erfasst. Ein Keil dreht ihn zur Tür. Zuerst waren es 30°.
Damit die Tür sicher erfasst wird, haben wir auf 60° erhöht: Jetzt reicht der
Erfassungsbereich auf der Türseite bis in die Wand hinein und deckt den ganzen
Eingang ab.

<p align="center">
  <img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/sensor.png" alt="Sensorteil auf dem 60°-Keil" width="45%">
</p>

---

## Weitere Herausforderungen

> [!NOTE]
> ✏️ **TODO (Team):** Ergänzt Probleme, die nur ihr kennt, zum Beispiel:
> - Verdrahtung auf dem Breadboard: Wackelkontakte, vertauschte Kabel?
> - Bewegungsmelder: Empfindlichkeit und Haltezeit an den Potis einstellen,
>   Fehlalarme? Nach dem Einschalten braucht er etwa eine Minute, bis er
>   zuverlässig arbeitet.
> - 3D-Druck: Passte alles? Was musste nachgearbeitet werden?
> - Zusammenarbeit, Zeitplanung, Git
>
> Gleiches Schema: **Situation**, **Ursache**, **Lösung**.

---

<sub>← [7 Wichtige Codeabschnitte](Wichtige-Codeabschnitte) · [9 Fazit und Ausblick](Fazit-und-Ausblick) →</sub>
