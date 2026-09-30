# FlowCraft

A visual, Node-RED-style flow editor for Home Assistant, built as a single Lovelace custom card. Design your automation logic on a canvas — drag triggers, conditions and actions, wire them together — and FlowCraft compiles it into a native Home Assistant automation (or, for Alexa voice commands, a native HA script). No YAML required, and nothing runs through a separate add-on: the compiled result is a plain automation/script that lives entirely in your own Home Assistant configuration.

## Features

- Drag-and-drop canvas: triggers (Wenn) → conditions (Falls) → actions (Dann)
- Compiles directly to native HA automations/scripts — no proxy service, no YAML editing
- Built-in simulator: step through your flow's logic against your current entity states, without touching any device
- One-click test run of an already-deployed flow
- Integration filter: choose which integrations' entities show up in the pickers, so large installations stay manageable
- Copy/paste, multi-select, undo (Ctrl+Z/C/V)
- Voice commands: a dedicated trigger type compiles to a standalone HA script that Alexa can call directly by name
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

See the palette for all available trigger/condition/action node types — motion, state changes, numeric thresholds, time, sun position, buttons/remotes, zones, calendar events, and Alexa voice commands on the trigger side; brightness/dark checks, state/numeric comparisons, sun position, time windows, weekdays, AND/OR combinations, and Jinja templates on the condition side; device on/off/toggle, delays, notifications (persistent + mobile push), helper value-setting, scenes, scripts, covers, and repeat loops on the action side.

### Optional: filtering by integration

Click **⚙ Integrationen** to choose which of your installed integrations should populate the entity pickers. Useful on larger installations where you only want to build flows against certain devices.

## How it works

FlowCraft stores your flows as JSON (via Home Assistant's own frontend user-data storage, with a `localStorage` fallback) and compiles them client-side into standard Home Assistant automation/script configuration, which it then pushes through the normal `config/automation/config/*` and `config/script/config/*` REST endpoints — the same ones the built-in automation editor uses. There is no backend component, no custom integration, and no YAML to hand-edit. Deployed automations/scripts are ordinary Home Assistant entities you can inspect, trace, and (if you ever want to) edit by hand like any other.

## Contributing

Issues and pull requests are welcome. This is a single-file project by design — please keep additions self-contained within `flowcraft.js` unless there's a strong reason to split it up.

## License

MIT — see [LICENSE](LICENSE).
