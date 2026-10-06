<!-- Diese Seite wird automatisch aus dem Ordner wiki/ im Repository erzeugt. Änderungen im Wiki-Editor werden beim nächsten Abgleich überschrieben. Bearbeiten: https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/tree/main/wiki -->
<p align="center">
  <img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/docs/banner.svg" alt="Projekt GAS: Mini-Sicherheitssystem mit Keypad, RFID-Leser und Bewegungsmelder" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Arduino-Uno_R3-00979D?logo=arduino&logoColor=white" alt="Arduino Uno R3">
  <img src="https://img.shields.io/badge/LF07-Cyber--physische_Systeme-4c1" alt="LF07">
  <img src="https://img.shields.io/badge/3D--Druck-OpenSCAD-F9D72C?logo=openscad&logoColor=black" alt="OpenSCAD">
  <img src="https://img.shields.io/badge/Lizenz-MIT-blue" alt="MIT-Lizenz">
</p>

# Projekt GAS – Mini-Sicherheitssystem

<p align="center"><b>Projektdokumentation · Lernfeld 7</b></p>

| | |
|---|---|
| **Projekttitel** | Projekt GAS – Mini-Sicherheitssystem mit Keypad, RFID-Leser und Bewegungsmelder |
| **Gruppenmitglieder** | ✏️ TODO (Team): Vor- und Nachnamen |
| **Klasse** | ✏️ TODO (Team) |
| **Lehrkraft** | ✏️ TODO (Team) |
| **Datum der Abgabe** | ✏️ TODO (Team) |

Eine kleine Alarmanlage auf einem Arduino Uno R3, gebaut im Lernfeld 7. Scharf-
und unscharf geschaltet wird mit einer PIN am 4x4-Keypad oder mit einer
RFID-Karte. Ist die Anlage scharf, löst der Bewegungsmelder eine 30-sekündige
Sirene aus. Das OLED zeigt nur Symbole: ein Herz (unscharf), einen Totenkopf
(scharf) und einen blinkenden Totenkopf (Alarm). Karten werden direkt am Gerät
angelernt, ganz ohne PC(Computer).

> [!NOTE]
> ✏️ **TODO (Team):** Hier ein Foto oder GIF vom fertigen Gerät einfügen
> (z. B. Karte auflegen → Herz wird zum Totenkopf). Bild im Repository unter
> `wiki/images/` ablegen und so einbinden:
> `<p align="center"><img src="https://raw.githubusercontent.com/BBZ-AIFS51/LF7-Projekt_GAS/main/wiki/images/geraet.gif" width="60%"></p>`

<p align="center">
  <a href="https://bbz-aifs51.github.io/LF7-Projekt_GAS/"><b>▶ 3D-Modell im Browser ausprobieren</b></a>
  &nbsp;·&nbsp; <a href="https://github.com/BBZ-AIFS51/LF7-Projekt_GAS">Repository mit Sourcecode</a>
  &nbsp;·&nbsp; <a href="https://github.com/BBZ-AIFS51/LF7-Projekt_GAS/blob/main/Anleitung/Mini%20Security%20System%20Manual.pdf">Bedienungsanleitung (PDF)</a>
</p>

## Inhalt

Die Kapitel 1–10 folgen dem vorgegebenen Aufbau der Projektdokumentation. Der
Anhang enthält Planung, Kosten und den Verlauf der Entwicklung.

| Kapitel | Worum es geht |
|---|---|
| **1** Deckblatt | diese Seite |
| **2** [💡 Idee und Zielsetzung](Idee-und-Zielsetzung) | Welches Problem das Projekt löst, Anforderungen, Abgrenzung |
| **3** [🎛️ Funktionsbeschreibung](Funktionsbeschreibung) | Wie die Anlage aus Sicht der Anwender funktioniert |
| **4** [🧩 Verwendete Bauteile](Verwendete-Bauteile) | Alle Bauteile und wofür sie eingesetzt werden |
| **5** [🔌 Aufbau und Schaltplan](Aufbau-und-Schaltplan) | Schaltplan, Pin-Zuordnung, Foto vom Aufbau, Gehäuse |
| **6** [📄 Sourcecode](Sourcecode) | Welche Dateien zum Projekt gehören |
| **7** [🧠 Wichtige Codeabschnitte](Wichtige-Codeabschnitte) | Kernlogik der Firmware, erklärt |
| **8** [🧗 Herausforderungen](Herausforderungen) | Probleme mit Bauteilen und wie wir sie gelöst haben |
| **9** [💭 Fazit und Ausblick](Fazit-und-Ausblick) | Was wir gelernt haben, mögliche Erweiterungen |
| **10** [📚 Quellenverzeichnis](Quellenverzeichnis) | Datenblätter, Bibliotheken, Werkzeuge |

| Anhang | Worum es geht |
|---|---|
| [👥 Team und Rollen](Team-und-Rollen) | Wer hat was gemacht |
| [📅 Zeitplan](Zeitplan) | Geplanter und tatsächlicher Ablauf |
| [💶 Kosten](Kosten) | Preise und Gesamtkosten |
| [🔧 Projektphasen](Projektphasen) | Die sieben Phasen des Projekts, Stand und offene Punkte |
| [🧭 Entwicklungsverlauf](Entwicklungsverlauf) | Alle Arbeitsschritte als Zeitleiste |
| [🤖 KI-Einsatz](KI-Einsatz) | Wie wir Claude Code als Hilfsmittel eingesetzt haben |

## Auf einen Blick

| **6** | **4** | **19** | **5** | **5** |
|:---:|:---:|:---:|:---:|:---:|
| Bauteile am Uno | Arduino-Sketches | Arbeitsschritte im [Entwicklungsverlauf](Entwicklungsverlauf) | Zustände der Anlage | Druckteile fürs Gehäuse |
