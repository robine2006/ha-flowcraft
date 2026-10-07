# FlowCraft

Eine ausführliche, für Einsteiger verständliche Anleitung zur Lovelace-Karte
**FlowCraft**, die grafisch erstellte Abläufe (Wenn → Falls → Dann) in
native Home-Assistant-Automationen und -Skripte übersetzt – ganz ohne
YAML-Kenntnisse.

*[Read this in English](README.md)*

---

## 1. Was ist FlowCraft?

FlowCraft ist eine Lovelace-Karte für dein Home-Assistant-Dashboard. Sie
sieht aus wie ein kleines Node-RED: Du ziehst Bausteine ("Nodes") auf eine
Zeichenfläche, verbindest sie mit Linien und beschreibst so einen Ablauf
nach dem Muster:

> **Wenn** etwas passiert (Auslöser) **→ Falls** eine Bedingung zutrifft
> (optional) **→ Dann** tue etwas (Aktion).

Wenn du auf **„Deploy“** klickst, übersetzt die Karte deinen selbst
gebauten Ablauf automatisch in eine ganz normale Home-Assistant-Automation
(oder beim Alexa-Schalter in Skripte plus einen Helfer) und legt sie in Home Assistant
an. Du musst also **kein YAML schreiben** – die Karte erledigt das für dich
im Hintergrund. Es läuft dabei kein separater Dienst oder Add-on mit: das
Ergebnis ist eine ganz normale Automation/ein normales Skript, das komplett
in deiner eigenen Home-Assistant-Konfiguration lebt.

Installationsanleitung siehe Abschnitt „Installation“ weiter unten bzw. in
der [README.md](README.md).

---

## 2. Die Bedienoberfläche im Überblick

Oben in der Karte gibt es eine Werkzeugleiste, links eine Bausteinpalette,
in der Mitte die Zeichenfläche (Canvas) und rechts das Einstellungsfeld für
den gerade ausgewählten Baustein.

### 2.1 Werkzeugleiste (von links nach rechts)

| Element | Bedeutung |
|---|---|
| Dropdown (Flow-Auswahl) | Wechselt zwischen deinen gespeicherten Flows (ein Flow = ein Ablauf/eine spätere Automation) |
| **+ Neuer Flow** | Legt einen weiteren, leeren Flow an |
| Textfeld „Flow-Name“ | Name des aktuell geöffneten Flows (frei wählbar, erscheint später als Automations-Name) |
| Checkbox **„aktiv“** | Legt fest, ob die Automation nach dem Deploy ein- oder ausgeschaltet ist |
| **Deploy** | Übersetzt den Flow in eine echte HA-Automation/HA-Skript und speichert sie in Home Assistant |
| **▶ Test** | Führt die bereits deployte Automation/das Skript einmal wirklich aus (inkl. Prüfung der Falls-Bedingungen mit den aktuellen echten Werten) – zum Debuggen, ohne extra Helfer |
| **🔍 Simulieren** | Prüft alle Bedingungen mit den aktuellen Werten und zeigt Schritt für Schritt an, was passieren *würde* – schaltet aber **nichts** wirklich |
| **Vorschau** | Zeigt das erzeugte HA-YAML als Text an (nur zur Kontrolle, muss nicht verstanden werden) |
| **Flow löschen** | Löscht den aktuell geöffneten Flow inkl. der zugehörigen Automation/Skripte in Home Assistant |
| **⚙ Integrationen** | Öffnet einen Filter: welche Integrationen bei der Geräteauswahl angeboten werden (siehe Abschnitt 6) |
| **⧉ Kopieren / 📋 Einfügen** | Kopiert/fügt ausgewählte Bausteine ein (auch per Strg+C / Strg+V) |
| **↶ Rückgängig** | Macht die letzte Änderung rückgängig (auch per Strg+Z) |
| Statuszeile | Zeigt Erfolgs- oder Fehlermeldungen an |
| „vX.X.X“ | Die aktuelle Version der Karte |

### 2.2 Bausteinpalette (links)

In drei Gruppen sortiert:
- **Auslöser (Wenn)** – womit ein Ablauf startet
- **Bedingung (Falls)** – ein Filter, der den Ablauf nur unter bestimmten
  Umständen weiterlaufen lässt
- **Aktion (Dann)** – was am Ende tatsächlich passiert

Ein Klick auf einen Baustein in der Palette legt ihn auf der Zeichenfläche ab.

### 2.3 Zeichenfläche (Canvas)

- Bausteine lassen sich mit der Maus verschieben.
- Jeder Baustein hat rechts einen kleinen Anschlusspunkt ("Ausgang"). Von dort
  aus zu einem anderen Baustein ziehen, um eine Verbindung ("Wire") zu
  erzeugen.
- **Bedingungs-Bausteine haben zwei Ausgänge**: der obere steht für „Ja/trifft
  zu“, der untere für „Nein/trifft nicht zu“. So lassen sich Wenn-Dann-Sonst-
  Abläufe bauen.
- Mehrere Bausteine gleichzeitig markieren: Rahmen aufziehen oder mit
  gedrückter Umschalttaste anklicken.
- Eine Verbindung löschen: auf die Linie klicken.
- Einen Baustein löschen: auswählen und Entf-/Rücktaste drücken, oder im
  Einstellungsfeld rechts auf das Löschen-Symbol klicken.

### 2.4 Einstellungsfeld (rechts)

Sobald ein Baustein angeklickt wird, erscheinen hier seine Einstellungen
(z. B. welcher Sensor, welcher Schwellenwert, welches Gerät). Pflichtfelder
sind markiert; ohne sie lässt sich nicht deployen.

---

## 3. Schritt-für-Schritt: Deinen ersten Flow erstellen

Beispiel: „Wenn Bewegung im Flur erkannt wird UND es dunkel ist, schalte das
Flurlicht ein, warte 5 Minuten, schalte es wieder aus.“

1. Auf **„+ Neuer Flow“** klicken und dem Flow oben im Textfeld einen
   sprechenden Namen geben, z. B. „Flurlicht bei Bewegung“.
2. In der Palette unter „Auslöser“ auf **„Bewegung“** klicken – der Baustein
   erscheint auf der Zeichenfläche.
3. Baustein anklicken, rechts im Feld den passenden Bewegungsmelder
   auswählen.
4. Unter „Bedingung“ auf **„Ist es dunkel?“** klicken, den Helligkeitssensor
   auswählen und ggf. den Schwellenwert anpassen.
5. Den Ausgang des Bewegungsmelder-Bausteins mit dem Bedingungsbaustein
   verbinden (Linie ziehen).
6. Unter „Aktion“ auf **„Gerät schalten“** klicken, das Flurlicht auswählen,
   Aktion „Einschalten“.
7. Den **oberen** (Ja-)Ausgang der Bedingung mit diesem Aktions-Baustein
   verbinden.
8. Optional: „Verzögerung“-Baustein (5 Minuten) und einen zweiten „Gerät
   schalten“-Baustein (Ausschalten) hinzufügen und der Reihe nach verbinden.
9. Auf **„🔍 Simulieren“** klicken, um zu prüfen, ob die Bedingung mit den
   aktuellen Werten wie erwartet reagiert (schaltet noch nichts wirklich).
10. Auf **„Deploy“** klicken. Die Karte legt jetzt automatisch eine
    Home-Assistant-Automation mit diesem Ablauf an.
11. Mit **„▶ Test“** einmal probeweise wirklich auslösen.

Fertig – der Ablauf läuft ab sofort automatisch, sobald die echte Bewegung
erkannt wird.

---

## 4. Alle Bausteine im Detail

### 4.1 Auslöser (Wenn) – startet einen Ablauf

| Baustein | Was er tut | Wichtige Felder |
|---|---|---|
| 🚶 **Bewegung** | Startet, wenn ein Bewegungs-/Präsenzmelder erkennt/nicht mehr erkennt | Sensor, „erkannt“/„beendet“, Mindestdauer |
| 🔀 **Zustand ändert sich** | Startet bei einer beliebigen Zustandsänderung einer Entität | Entität, optional Von/Nach-Zustand, Mindestdauer |
| 📈 **Wert-Schwelle** | Startet, wenn ein Zahlenwert eine Schwelle über-/unterschreitet | Sensor, Über/Unter |
| ⏰ **Uhrzeit** | Startet täglich zu einer festen Uhrzeit | Uhrzeit |
| 📅 **Uhrzeit + Wochentag** | Wie „Uhrzeit“, aber nur an gewählten Wochentagen | Uhrzeit, Wochentage |
| 🌅 **Sonne** | Startet bei Sonnenauf-/-untergang (+ Versatz in Minuten) | Ereignis, Versatz |
| 🔘 **Taste/Fernbedienung** | Startet bei einem Tastendruck-Ereignis (z. B. Zigbee-Fernbedienung) | Event-Entität, Ereignistyp |
| 📍 **Zone betreten/verlassen** | Startet, wenn eine Person eine Zone betritt/verlässt (Standort) | Person, Zone, Ereignis |
| 📆 **Kalender-Ereignis** | Startet, wenn ein Kalendertermin beginnt/endet (optional nur bei bestimmtem Titel) | Kalender, Ereignis, Versatz, Titel-Filter |
| 🚀 **Home Assistant startet** | Startet einmalig beim Start von Home Assistant | – |
| 🧱 **Teilablauf (Start)** | Macht die angehängten Aktionen zu einem wiederverwendbaren Skript „Teilablauf: <Name>“, das jeder Flow per *Skript ausführen* aufrufen kann | Name |
| 🔛 **Alexa-Schalter (An/Aus)** | Hat **zwei Ausgänge**: „Ein“ (oben) für die Einschalt-Aktionen, „Aus“ (unten) für die Ausschalt-Aktionen. Siehe Kasten unten. | Name für Alexa (z. B. „Morgenlicht“) |

> Ein Flow kann auch **mehrere** Auslöser-Bausteine gleichzeitig enthalten –
> jeder davon kann (unabhängig) denselben oder einen eigenen Ablauf
> auslösen.

> 🔛 **Alexa-Schalter (An/Aus):** Verbinde den Ausgang **„Ein“** mit den Aktionen fürs Einschalten und **„Aus“** mit denen fürs Ausschalten (wer nur eine Richtung braucht, lässt den anderen frei). Beim Klick auf „Deploy“ legt FlowCraft **automatisch** einen echten `input_boolean`-Helfer mit dem eingegebenen Namen an, gibt **nur diesen Helfer** für Alexa frei (Alexa behandelt ihn als normalen Schalter, daher funktioniert „Alexa, schalte **Morgenlicht an/aus**“ nativ, ohne „aktiviere“) und baut im Hintergrund zwei Skripte sowie eine kleine Hilfs-Automation, die beim Umschalten des Helfers das passende Skript ausführt. Löschst du den Baustein (oder den ganzen Flow), werden Helfer, Skripte, Hilfs-Automation und Alexa-Freigabe automatisch wieder entfernt – es bleiben keine verwaisten Einträge zurück. Taucht ein neuer Schalter nach ein paar Minuten ausnahmsweise nicht bei Alexa auf, hilft einmalig „**Alexa, entdecke Geräte neu**“.

### 4.2 Bedingungen (Falls) – lässt den Ablauf nur unter bestimmten Umständen weiterlaufen

| Baustein | Was er prüft |
|---|---|
| 🌙 **Ist es dunkel?** | Helligkeitssensor unter Schwellenwert (mit Sonnenhöhe als Ausweich-Logik, falls Sensor mal ausfällt) |
| ❓ **Zustand ist** | Entität hat einen bestimmten Zustand (mehrere Werte mit Komma möglich); optional „seit mindestens N Minuten“ |
| 🔢 **Wert-Vergleich** | Zahlenwert/Attribut liegt über/unter einer Schwelle |
| ☀️ **Sonnenstand** | Aktuelle Zeit liegt vor/nach Sonnenauf-/-untergang (± Versatz) |
| 🕒 **Zeitfenster** | Aktuelle Uhrzeit liegt zwischen zwei Uhrzeiten |
| 📅 **Wochentag** | Heute ist einer der gewählten Wochentage |
| 📍 **Zone ist** | Eine Person befindet sich aktuell in einer bestimmten Zone |
| 🔗 **UND/ODER** | Verknüpft bis zu 4 Entität/Zustand-Paare wahlweise mit UND oder ODER |
| 🧩 **Vorlage (Template)** | Für Fortgeschrittene: eigene Jinja-Vorlage, die wahr/falsch ergeben muss |

Jede Bedingung hat **zwei Ausgänge**: oben = „trifft zu“, unten = „trifft
nicht zu“. Wird nur der obere Ausgang verbunden, passiert im Falle „Nein“
einfach nichts.

### 4.3 Aktionen (Dann) – was tatsächlich passiert

| Baustein | Was er tut |
|---|---|
| 💡 **Gerät schalten** | Schaltet Licht/Schalter/etc. ein/aus/um (bei Licht optional Helligkeit in %) |
| 💡 **Mehrere Geräte schalten** | Schaltet mehrere Geräte gleichzeitig mit derselben Aktion; der Node wächst mit der Anzahl der Geräte; je Gerät eigene Aktion möglich (an/aus/um, Helligkeit), jedes mit Ist-Zustand |
| ⏳ **Verzögerung** | Wartet die angegebene Zeit, bevor es weitergeht |
| 🔔 **Benachrichtigung** | Ruft einen beliebigen Benachrichtigungsdienst auf (Standard: HA-eigene „persistent_notification“) |
| 🎚️ **Wert setzen** | Setzt einen Helferwert (input_number, input_text, input_select, input_boolean, number) |
| 🎬 **Szene aktivieren** | Aktiviert eine bereits in HA angelegte Szene |
| 📜 **Skript ausführen** | Startet ein bereits vorhandenes HA-Skript; wahlweise mit Warten bis es fertig ist (z. B. bei Teilabläufen) |
| 🪟 **Rollladen/Cover** | Öffnen/Schließen/Stopp/Position setzen für Rollläden, Markisen etc. |
| 📱 **Push-Benachrichtigung** | Schickt eine Push-Nachricht an ein Smartphone mit Home-Assistant-App |
| 🔁 **Wiederholen** | Wiederholt alle danach angeschlossenen Aktionen X-mal |

---

## 5. Mehrere Flows, aktivieren/deaktivieren, löschen

- Jeder Flow entspricht später **einer** HA-Automation (beim Alexa-Schalter: zwei
  Skripte plus Helfer). Du kannst beliebig viele Flows anlegen und im
  Dropdown oben zwischen ihnen wechseln.
- Die Checkbox **„aktiv“** entspricht dem Ein/Aus-Schalter der Automation in
  Home Assistant – ein inaktiver Flow wird zwar deployt, aber nicht
  ausgeführt.
- **„Flow löschen“** entfernt sowohl den Flow in der Karte als auch die
  dazugehörige Automation bzw. beim Alexa-Schalter Helfer, Skripte und Hilfs-Automation in Home Assistant (falls
  bereits deployt).
- Änderungen an einem Flow werden automatisch zwischengespeichert, sobald du
  etwas änderst – erst **„Deploy“** überträgt sie aber tatsächlich als
  Automation/Skript nach Home Assistant.

---

## 6. Der „Integrationen“-Filter

Über **„⚙ Integrationen“** legst du fest, aus welchen HA-Integrationen
Entitäten in den Auswahlfeldern (z. B. „Bewegungsmelder“, „Gerät schalten“)
angeboten werden. Das ist reine Komfortfunktion, damit die Listen nicht mit
hunderten Entitäten überladen sind. Standardmäßig sind gängige Integrationen
vorausgewählt (Matter, Homematic(IP) Local); du kannst hier weitere ein-
oder ausblenden oder gezielt suchen. Diese Auswahl schaltet **nichts
technisch ab** – sie blendet nur Einträge in den Dropdown-Listen aus/ein.

---

## 7. Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| Strg/Cmd + Z | Rückgängig |
| Strg/Cmd + C | Ausgewählte Bausteine kopieren |
| Strg/Cmd + V | Einfügen |
| Entf / Rücktaste | Ausgewählte Bausteine löschen (bei Fokus auf der Zeichenfläche) |

---

## 8. Was muss in Home Assistant zusätzlich installiert/eingerichtet sein?

Die Karte selbst benötigt außer der Installation (siehe [README.md](README.md))
**nichts zusätzlich** – sie nutzt nur Bordmittel von Home Assistant
(Automationen, Skripte, die Entity-Registry). Für **einzelne Bausteine**
brauchst du aber die passende Integration/Hardware, sonst gibt es dafür
einfach keine auswählbaren Entitäten:

| Baustein(e) | Voraussetzung in Home Assistant |
|---|---|
| Bewegung, Zustand ändert sich, Wert-Schwelle, Wert-Vergleich, Ist es dunkel? | Ein Sensor/binary_sensor der jeweiligen `device_class` (motion/occupancy/presence bzw. illuminance) – kommt üblicherweise über Zigbee (ZHA/Zigbee2MQTT/deCONZ), Z-Wave, WLAN-Geräte, Shelly, o. ä. |
| Gerät schalten | Ein schaltbares Gerät (`light`, `switch`, `fan`, `climate` …) über eine beliebige Integration |
| Rollladen/Cover | Ein `cover`-Gerät (Rollladen-/Markisenaktor) über die jeweilige Integration |
| Zone betreten/verlassen, Zone ist | Mindestens eine **Person** (`person.*`) mit aktivierter Standortverfolgung (Home-Assistant-App auf dem Handy oder ein Geräte-Tracker) sowie mindestens eine **Zone** (`zone.*`, „Zuhause“ ist immer vorhanden) |
| Kalender-Ereignis | Eine Kalender-Integration (z. B. „Google Kalender“, CalDAV, lokaler Kalender) muss eingebunden sein, damit `calendar.*`-Entitäten existieren |
| Szene aktivieren | Mindestens eine in HA angelegte Szene (`scene.*`) |
| Skript ausführen | Mindestens ein bereits vorhandenes Skript (`script.*`) |
| Push-Benachrichtigung | Die Home-Assistant-Companion-App auf mindestens einem Smartphone, verbunden mit deiner HA-Instanz (liefert die `notify.mobile_app_…`-Dienste) |
| Wert setzen | Ein passender Helfer (`input_number`, `input_text`, `input_select`, `input_boolean`) oder eine `number`-Entität – Helfer legst du unter „Einstellungen → Geräte & Dienste → Helfer“ an |
| **Alexa-Schalter (An/Aus)** | Home Assistant muss mit Alexa verbunden sein, am einfachsten über **Home Assistant Cloud (Nabu Casa)**. Den Schalter-Helfer legt FlowCraft selbst an und gibt ihn bei jedem Deploy automatisch für Alexa frei; er taucht danach normalerweise von selbst bei Alexa auf. Alternativ die manuelle **Alexa Smart Home Skill** (ohne Nabu Casa, technisch aufwendiger). |

**Kurz gesagt:** Fehlt die passende Integration/Hardware für einen
Baustein, taucht im Auswahlfeld einfach kein passender Eintrag auf, bzw.
der Baustein erscheint in der Palette ausgegraut mit einem ⚠-Symbol.

---

## 9. Fehlerbehebung

| Meldung/Situation | Bedeutung | Lösung |
|---|---|---|
| „Kein Auslöser ist mit einer Aktion verbunden“ | Es führt keine durchgehende Verbindung von einem Auslöser zu einer Aktion | Bausteine per Linie verbinden |
| „Schleife im Flow bei …“ | Verbindungen bilden einen Kreis (A → B → A) | Verbindung entfernen, die den Kreis schließt |
| „… veraltete(r) Node(s) mit unbekanntem Typ entfernt“ | Ein früher genutzter Bausteintyp wurde inzwischen aus der Karte entfernt | Betroffenen Teil des Flows neu aufbauen |
| „Deploy fehlgeschlagen: …“ | Home Assistant hat die Automation/das Skript abgelehnt (meist ungültige Entität) | Fehlermeldung lesen, betroffenes Feld prüfen |
| „Bitte zuerst Deploy klicken …“ (bei „Test“) | Der Flow wurde noch nicht deployt | Erst „Deploy“, dann „Test“ |

---

## Installation

Siehe [README.md](README.md#installation) (HACS oder manuell) – kurz
zusammengefasst: über HACS als Custom Repository (Kategorie „Lovelace“)
hinzufügen, dann die Karte `custom:flowcraft-editor` auf einem Dashboard
einbinden.

---

*Diese Anleitung bezieht sich auf FlowCraft Version 0.9.47. Bei neuen
Versionen mit neuen Bausteinen oder Funktionen wird sie entsprechend
aktualisiert. Änderungen siehe [CHANGELOG.md](CHANGELOG.md).*
