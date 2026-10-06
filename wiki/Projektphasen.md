<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
# 🔧 Projektphasen

<sub>Anhang</sub>

In welchen Phasen das Projekt entstanden ist, und was noch offen ist. Wie die
Anlage funktioniert, steht in [Kapitel 3](Funktionsbeschreibung), die Probleme
und Lösungen in [Kapitel 8](Herausforderungen).

## 1 · Hardware-Aufbau und Bring-up

Alle Bauteile wurden auf dem Breadboard verdrahtet und mit
[`hardware_test`](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Code/hardware_test/hardware_test.ino)
einzeln geprüft: OLED, Keypad, Buzzer und Bewegungsmelder. Dabei hat sich
herausgestellt, dass das Display einen **SH1106**-Controller hat und nicht den
weit verbreiteten SSD1306.

> [!NOTE]
> ✏️ **TODO (Team):** Foto vom Breadboard-Aufbau einfügen und 1–2 Sätze dazu,
> wie der Aufbau gelaufen ist (z. B. was zuerst nicht funktioniert hat).

## 2 · Firmware-Grundfunktion

In einem Schritt entstand der komplette Zustandsautomat: PIN mit `*`-Maske,
Herz und Totenkopf, nicht blockierende Töne und eine 30-Sekunden-Sirene. Die
Ausgangsverzögerung von 10 Sekunden kam als Vorschlag von Claude Code dazu.
→ [Entwicklungsverlauf, Schritt 1](Entwicklungsverlauf#-schritt-1--auftrag-komplette-firmware)

## 3 · Kampf um den Arbeitsspeicher

Der Uno hat nur 2048 Byte SRAM, das Display braucht davon allein 1024. Die
Folgen waren erst Pixelmüll auf dem Display, dann zufällige Neustarts und
falsch erkannte PINs. Gelöst wurde das, indem alle Texte mit `F()` in den Flash
wandern und der Keypad-Scan selbst geschrieben ist (die Library kostete rund
120 Byte).
→ [Schritt 2](Entwicklungsverlauf#-schritt-2--display-zeigt-pixelmüll) ·
[Schritt 4](Entwicklungsverlauf#-schritt-4--neustarts-beim-scharfschalten-text-soll-weg)

## 4 · RFID und Rechtevergabe

Der RC522 wurde als zweiter Weg zum Scharf- und Unscharfschalten ergänzt. Weil
er den SPI-Bus braucht, ist der Bewegungsmelder auf einen anderen Pin
umgezogen. Auf Anregung der Lehrkraft kamen dazu:
- ein **Admin-Menü**, in dem Karten direkt am Gerät angelernt und gelöscht
  werden (gespeichert im EEPROM)
- ein **RFID-Reset** auf Taste <kbd>B</kbd>, falls der Leser hängt

→ [Schritt 5](Entwicklungsverlauf#-schritt-5--kollisionserkennung-und-rechtevergabe-bei-rfid) ·
[Schritt 6](Entwicklungsverlauf#-schritt-6--rechtevergabe-umsetzen-karten-außerhalb-des-codes-verwalten) ·
[Schritt 7](Entwicklungsverlauf#-schritt-7--rfid-reset)

## 5 · Gehäuse

Zwei Gehäuse, verbunden über ein 3-adriges Kabel: das **Bedienteil** außen
neben der Tür und das **Sensorteil** innen im Raum. Der Bewegungsmelder sieht
nicht durch die Wand. Wer am Keypad steht, löst also nichts aus, erst wer den
Raum betritt. Ein 60°-Keil dreht den Sensor zur Tür, damit er den ganzen
Eingang abdeckt.

<table>
  <tr>
    <td align="center" width="50%"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/zusammengebaut.png" alt="Bedienteil und Sensorteil zusammengebaut"><br><sub>Bedienteil und Sensorteil auf dem Keil</sub></td>
    <td align="center" width="50%"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/montage.svg" alt="Montage von oben: Erfassungsbereich des Sensors deckt den Eingang ab"><br><sub>Montage von oben: Erfassungsbereich</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/explosion.png" alt="Explosionszeichnung des Bedienteils"><br><sub>Explosionszeichnung</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/Gehaeuse/bilder/druckplatte.png" alt="Alle Druckteile auf dem Druckbett"><br><sub>Alle fünf Teile auf dem Druckbett</sub></td>
  </tr>
</table>

→ [Schritt 10](Entwicklungsverlauf#-schritt-10--gehäuse-für-den-3d-druck) ·
[Schritt 11](Entwicklungsverlauf#-schritt-11--sensor-schräg-zur-tür) ·
[Schritt 12](Entwicklungsverlauf#-schritt-12--sensor-noch-stärker-zur-tür) ·
[Gehäuse-Anleitung](https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/MDs/gehaeuse.md)

> [!NOTE]
> ✏️ **TODO (Team):** Sobald gedruckt: Fotos vom echten Gehäuse ergänzen. Was
> hat beim Druck oder Zusammenbau nicht gepasst?

## 6 · Präsentation im Repository

Damit das Projekt auch ohne Gerät verständlich ist, gibt es animierte Grafiken
in der README und ein **interaktives 3D-Modell** im Browser. Darin läuft die
gleiche Logik wie in der Firmware, wahlweise als loser Aufbau oder im Gehäuse.

<p align="center">
  <a href="https://bbz-aifs51.github.io/LF7-Projekt_GAS/#enclosure"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/docs/social-preview.png" alt="3D-Modell im Browser öffnen" width="70%"></a><br>
  <sub>Bild anklicken, um das 3D-Modell zu öffnen</sub>
</p>

→ [Schritt 8](Entwicklungsverlauf#-schritt-8--3d-animationen-und-neue-readme) ·
[Schritt 13](Entwicklungsverlauf#-schritt-13--vorschaubilder-gehäuse-im-3d-modell-social-preview) ·
[Schritt 15](Entwicklungsverlauf#-schritt-15--holo-look-für-banner-und-social-preview)

## 7 · Feinschliff

Beim Testen fiel auf, dass eine falsche Eingabe während des Alarms die Sirene
abbrach. Jetzt wird eine falsche Eingabe im Alarm ignoriert.
→ [Schritt 16](Entwicklungsverlauf#-schritt-16--falsche-eingabe-bricht-den-alarm-ab)

## Stand und offene Punkte

> [!NOTE]
> ✏️ **TODO (Team):** Liste aktuell halten.

- [x] Alle Muss-Anforderungen umgesetzt, siehe [Kapitel 2](Idee-und-Zielsetzung#anforderungen)
- [ ] Bugfix aus Schritt 16 am echten Aufbau getestet
- [ ] Freier SRAM nach dem Entfernen der Keypad-Library gemessen: ✏️ TODO Byte (erwartet ~320)
- [ ] RFID-Reset (<kbd>B</kbd>) mit absichtlich getrenntem Leser getestet
- [ ] Gehäusemaße am echten Aufbau nachgemessen
- [ ] Gehäuse gedruckt und montiert
