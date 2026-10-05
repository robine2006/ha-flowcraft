# Changelog

## 0.9.45
- **Flow status** in the toolbar: deployed / unsaved changes / last triggered / missing entities.
- **Export / Import** of a flow as a JSON file.
- *State is* condition: optional "for at least N minutes".
- New action **Switch several devices**: one action for many devices; the node grows with the number of devices and shows each device with its live state.
- Reusable **sub-flows**: new *Sub-flow (start)* trigger creates a script that any flow can call via *Run script* (optionally waiting until it has finished).
- Warning marker on nodes whose entity no longer exists.
- New trigger **Home Assistant start**.
- Scripts created for Alexa switches and sub-flows are automatically un-exposed from Alexa after deploy.
- Alexa switch script/automation IDs now include the flow ID, so two flows using the same node number can no longer overwrite each other; old IDs are cleaned up on the next deploy.

## 0.9.44
- New **Alexa switch (On/Off)** trigger: two outputs ("On"/"Off"); on deploy FlowCraft creates an `input_boolean` helper, two scripts and a small helper automation and exposes only the helper to Alexa, so native "turn <name> on/off" works. Everything is cleaned up again when the node or flow is deleted. It replaces the former "Alexa voice command" node (script/scene based, "activate" only), which has been removed.
- Entity/device/area registries are reloaded automatically when something changes in Home Assistant (new devices show up in the pickers without a page reload).
- Consistent line spacing inside nodes; "On/Off" and "Yes/No" output labels are now right-aligned next to their ports.
- Source comments removed from the published file.

## 0.9.39
- Consistent naming throughout: the tool is called "FlowCraft" everywhere — file name, class (`FlowCraftEditor`), custom element tag (`flowcraft-editor`), global compiler export (`window.FlowCraftCompiler`), storage keys (`flowcraft_flows`/`flowcraft_platforms`), version helper (`input_text.flowcraft_version`), and the automation/script names FlowCraft generates.
- No functional changes to the compiler.

## 0.9.38
- Initial public release, extracted from a personal Home Assistant setup and generalized: sample flow uses placeholder entities (`binary_sensor.beispiel_bewegungsmelder`, `sensor.beispiel_helligkeitssensor`, `switch.beispiel_licht`) instead of real device IDs, disabled by default.
- Reduced in-code documentation to keep the file under the ~128 KB size some Home Assistant setups enforce for inline dashboard resources.

## Earlier versions
Developed privately prior to the first public release; not published here.
