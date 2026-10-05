# FlowCraft

*[Deutsche Anleitung lesen](README.de.md)*

A visual, Node-RED-style flow editor for Home Assistant, built as a single Lovelace custom card. Design your automation logic on a canvas — drag triggers, conditions and actions, wire them together — and FlowCraft compiles it into a native Home Assistant automation (or, for Alexa switches, native HA scripts plus a helper). No YAML required, and nothing runs through a separate add-on: the compiled result is a plain automation/script that lives entirely in your own Home Assistant configuration.

## Features

- Drag-and-drop canvas: triggers (Wenn) → conditions (Falls) → actions (Dann)
- Compiles directly to native HA automations/scripts — no proxy service, no YAML editing
- Built-in simulator: step through your flow's logic against your current entity states, without touching any device
- One-click test run of an already-deployed flow
- Integration filter: choose which integrations' entities show up in the pickers, so large installations stay manageable
- Copy/paste, multi-select, undo (Ctrl+Z/C/V)
- Alexa switch: a dedicated trigger with an "On" and an "Off" output — say "Alexa, turn <name> on/off" natively, no "activate" needed
- Automatic detection of which node types are usable, based on what entities/integrations your installation actually has

## Installation

### HACS (recommended)

1. In Home Assistant, go to **HACS → Frontend**.
2. Click the three-dot menu → **Custom repositories**.
3. Add this repository's URL, category **Lovelace**.
4. Find **FlowCraft** in the list and install it.
5. Add the resource under **Settings → Dashboards → ⋮ → Resources** if it wasn't added automatically (`/hacsfiles/ha-flowcraft/flowcraft.js`, type: JavaScript Module).

### Manual

1. Copy `flowcraft.js` into your `config/www/` folder.
2. Go to **Settings → Dashboards → ⋮ → Resources** and add `/local/flowcraft.js` as a **JavaScript Module**.
3. Reload your browser.

## Adding the card

Add a card of type `custom:flowcraft-editor` to any dashboard, e.g. via YAML:

```yaml
type: custom:flowcraft-editor
```

The card takes up the full available height and needs no further configuration — everything (your flows, your integration filter) is stored per Home Assistant user.

## Usage

1. Click **+ Neuer Flow** to create a flow, give it a name.
2. Add a trigger from the left palette (e.g. "Bewegung" for a motion sensor), then a condition and/or action, and connect them by dragging from the round output port to the next node's input port.
3. Click a node to edit its settings in the right-hand inspector panel.
4. Click **🔍 Simulieren** to dry-run the logic against your current entity states (nothing is actually sent to any device).
5. Click **Deploy** to compile and push the flow as a real Home Assistant automation (or script, for a voice-command trigger).

### Triggers ("Wenn")

| Node | What it does | Key fields |
|---|---|---|
| 🚶 Motion | Fires when a motion/occupancy/presence sensor turns on/off | sensor, on/off, minimum duration |
| 🔀 State changes | Fires on any state change of an entity | entity, optional from/to state, minimum duration |
| 📈 Numeric threshold | Fires when a numeric value crosses above/below a threshold | sensor, above/below |
| ⏰ Time | Fires daily at a fixed time | time |
| 📅 Time + weekday | Like Time, but only on selected weekdays | time, weekdays |
| 🌅 Sun | Fires at sunrise/sunset (± offset in minutes) | event, offset |
| 🔘 Button/remote | Fires on a button-press event entity (e.g. a Zigbee remote) | event entity, event type |
| 📍 Zone enter/leave | Fires when a person enters/leaves a zone | person, zone, event |
| 📆 Calendar event | Fires when a calendar event starts/ends (optionally filtered by title) | calendar, event, offset, title filter |
| 🚀 Home Assistant start | Fires once when Home Assistant starts | – |
| 🧱 Sub-flow (start) | Turns the connected actions into a reusable script "Sub-flow: <name>" that any flow can call with *Run script* | name |
| 🔛 Alexa switch (On/Off) | Two outputs: **On** (top) holds the actions for switching on, **Off** (bottom) the actions for switching off. See the note below. | name for Alexa (e.g. "Morning light") |

A flow can contain several trigger nodes at once — each fires the flow (or its own branch) independently.

> 🔛 **Alexa switch (On/Off).** Connect the **On** output to the actions that should run when switched on, and the **Off** output to the ones for switching off (leave one empty if you only need one direction). On deploy FlowCraft automatically creates a real `input_boolean` helper with that name, exposes **only the helper** to Alexa (Alexa treats it as a normal switch, so "Alexa, turn Morning light on/off" works natively), and builds two scripts plus a small helper automation that runs the matching script when the helper toggles. Deleting the node or the flow removes the helper, scripts, automation and the Alexa exposure again. If a newly created switch does not show up in Alexa after a few minutes, say "Alexa, discover devices" once.

### Conditions ("Falls")

| Node | What it checks |
|---|---|
| 🌙 Is it dark? | Illuminance sensor below a threshold (with sun elevation as a fallback if the sensor is unavailable) |
| ❓ State is | Entity has a given state (comma-separated list for multiple); optional "for at least N minutes" |
| 🔢 Numeric comparison | A numeric value/attribute is above/below a threshold |
| ☀️ Sun position | Current time is before/after sunrise/sunset (± offset) |
| 🕒 Time window | Current time is between two times |
| 📅 Weekday | Today is one of the selected weekdays |
| 📍 Zone is | A person is currently in a given zone |
| 🔗 AND/OR | Combines up to 4 entity/state pairs with AND or OR |
| 🧩 Template | Advanced: a custom Jinja template that must evaluate to true/false |

Every condition has two outputs: top = "yes", bottom = "no". Leave the bottom output unconnected and nothing happens on "no".

### Actions ("Dann")

| Node | What it does |
|---|---|
| 💡 Device on/off/toggle | Switches a light/switch/etc. on, off or toggles it (optional brightness % for lights) |
| 💡 Switch several devices | Switches several devices at once with the same action; the node grows with the number of devices; each device can have its own action (on/off/toggle, brightness) and shows its live state |
| ⏳ Delay | Waits the given time before continuing |
| 🔔 Notification | Calls any notification service (default: HA's built-in `persistent_notification`) |
| 🎚️ Set value | Sets a helper value (`input_number`, `input_text`, `input_select`, `input_boolean`, `number`) |
| 🎬 Activate scene | Activates an existing HA scene |
| 📜 Run script | Runs an existing HA script; optionally waits until it has finished (e.g. for sub-flows) |
| 🪟 Cover | Open/close/stop/set position for covers (blinds, awnings, etc.) |
| 📱 Push notification | Sends a push notification to a phone running the Home Assistant Companion App |
| 🔁 Repeat | Repeats everything downstream N times |

### Optional: filtering by integration

Click **⚙ Integrationen** to choose which of your installed integrations should populate the entity pickers. Useful on larger installations where you only want to build flows against certain devices. This is a display-only filter — it doesn't disable anything, it just narrows the dropdown lists.

### Keyboard shortcuts

| Shortcut | Effect |
|---|---|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + C | Copy selected nodes |
| Ctrl/Cmd + V | Paste |
| Delete / Backspace | Delete selected nodes (canvas focused) |

### Prerequisites per node type

FlowCraft itself needs nothing beyond installation — it only uses Home Assistant's own building blocks (automations, scripts, the entity registry). Individual nodes, though, need the matching integration/hardware, otherwise their entity picker simply stays empty:

| Node(s) | Requirement in Home Assistant |
|---|---|
| Motion, State changes, Numeric threshold, Numeric comparison, Is it dark? | A sensor/binary_sensor with the matching `device_class` (motion/occupancy/presence or illuminance) — typically via Zigbee (ZHA/Zigbee2MQTT/deCONZ), Z-Wave, Wi-Fi devices, Shelly, etc. |
| Device on/off/toggle | A controllable entity (`light`, `switch`, `fan`, `climate`, …) via any integration |
| Cover | A `cover` entity via the relevant integration |
| Zone enter/leave, Zone is | At least one **person** (`person.*`) with location tracking enabled (the Home Assistant Companion App or a device tracker), and at least one **zone** (`zone.*` — "home" always exists) |
| Calendar event | A calendar integration (e.g. Google Calendar, CalDAV, local calendar) so `calendar.*` entities exist |
| Activate scene | At least one scene (`scene.*`) already created in HA |
| Run script | At least one existing script (`script.*`) |
| Push notification | The Home Assistant Companion App on at least one phone, connected to your instance (provides the `notify.mobile_app_…` services) |
| Set value | A matching helper (`input_number`, `input_text`, `input_select`, `input_boolean`) or a `number` entity — create helpers under Settings → Devices & Services → Helpers |
| Alexa switch | Home Assistant connected to Alexa, most easily via **Home Assistant Cloud (Nabu Casa)**. FlowCraft creates the helper and exposes it to Alexa automatically on every deploy. |

If the required integration/hardware is missing, the affected node simply shows no matching entities, or appears greyed out with a ⚠ in the palette.

### Troubleshooting

| Message/situation | Meaning | Fix |
|---|---|---|
| "Kein Ausloeser ist mit einer Aktion verbunden" | No unbroken connection from a trigger to an action | Wire the nodes together |
| "Schleife im Flow bei …" | The wires form a cycle (A → B → A) | Remove the connection that closes the loop |
| "… veraltete(r) Node(s) mit unbekanntem Typ entfernt" | A node type used previously no longer exists in the card | Rebuild the affected part of the flow |
| "Deploy fehlgeschlagen: …" | Home Assistant rejected the automation/script (usually an invalid entity) | Read the error message, check the field it points to |
| "Bitte zuerst Deploy klicken …" (on Test) | The flow hasn't been deployed yet | Deploy first, then Test |

## How it works

FlowCraft stores your flows as JSON (via Home Assistant's own frontend user-data storage, with a `localStorage` fallback) and compiles them client-side into standard Home Assistant automation/script configuration, which it then pushes through the normal `config/automation/config/*` and `config/script/config/*` REST endpoints — the same ones the built-in automation editor uses. There is no backend component, no custom integration, and no YAML to hand-edit. Deployed automations/scripts are ordinary Home Assistant entities you can inspect, trace, and (if you ever want to) edit by hand like any other.

## Contributing

Issues and pull requests are welcome. This is a single-file project by design — please keep additions self-contained within `flowcraft.js` unless there's a strong reason to split it up.

## License

MIT — see [LICENSE](LICENSE).
