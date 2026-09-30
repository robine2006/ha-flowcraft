// ============================================================
// FlowCraft - Node-RED-artiger Flow-Editor fuer Home Assistant
// Dies ist die eigenstaendige OEFFENTLICHE Veroeffentlichungsversion, komplett
// getrennt von Roberts persoenlicher Arbeitsversion (siehe /home/claude/work/
// ikea-flow-editor.js bzw. Projekt-Dokument) - Aenderungen hier werden NICHT
// automatisch dorthin uebernommen und umgekehrt. Der Name "FlowCraft" wird
// konsequent ueberall verwendet: Dateiname, Klasse (FlowCraftEditor),
// Custom-Element-Tag (flowcraft-editor, keine Alias-Tags), globaler Compiler-
// Export (window.FlowCraftCompiler), Speicher-Keys (flowcraft_flows/-platforms)
// und Versions-Helfer (input_text.flowcraft_version) - keine Altlasten/Aliase
// aus fruehreren, projektinternen Arbeitsnamen, da dies eine frische
// Erstveroeffentlichung ohne bestehende Installationen ist.
// Version:   0.9.39
// Datum:     2026-09-30 12:14 UTC
// Changelog: 0.9.39 - Namenskonsistenz hergestellt (auf Wunsch): saemtliche
//            Alt-/Alias-Bezeichnungen aus der internen Entwicklungsphase
//            entfernt, die nicht zum oeffentlichen Namen "FlowCraft" passten.
//            Entfernt: der zusaetzliche Custom-Element-Alias-Tag (frueher
//            zusaetzlich zu "flowcraft-editor" registriert) samt zugehoerigem
//            CSS-Selektor, sowie der Migrations-Lesefallback fuer alte
//            Speicher-Keys (unnoetig bei einer frischen Veroeffentlichung ohne
//            bestehende Installationen). Der im generierten Automation-Text
//            verwendete Werkzeugname heisst jetzt durchgaengig "FlowCraft"
//            statt eines aelteren Arbeitsnamens. Keine funktionale Aenderung
//            am Compiler. Vollstaendige Versionshistorie: siehe Projekt-
//            Dokument "flowcraft-changelog.md".
// ============================================================

const pad = (n) => String(n).padStart(2, '0');
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? undefined : Number(v));
const dom = (e) => String(e || '').split('.')[0];
// Prueft generisch (ohne Hardcodierung einzelner Entitaeten), ob in hass.states
// mindestens eine Entitaet existiert, deren Domain in "domains" enthalten ist
// und - falls "dc" (Liste erlaubter device_class-Werte) angegeben ist -
// zusaetzlich deren device_class-Attribut darin vorkommt. Ohne Domain-Filter
// (domains leer/undefined) gilt ein Feld als uneingeschraenkt -> immer verfuegbar.
function domainHasEntity(hass, domains, dc) {
  if (!domains || !domains.length) return true;
  const states = (hass && hass.states) || {};
  for (const id in states) {
    if (!domains.includes(dom(id))) continue;
    if (dc && dc.length) {
      const st = states[id];
      if (!st || !dc.includes((st.attributes || {}).device_class)) continue;
    }
    return true;
  }
  return false;
}
const hms = (min, sec = 0) => {
  const t = Math.round(min * 60 + sec);
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
};
const offs = (m) => {
  m = Number(m) || 0;
  return m ? (m < 0 ? '-' : '') + hms(Math.abs(m)) : undefined;
};
const hm = (s) => (s && /^\d{1,2}:\d{2}/.test(s) ? s.slice(0, 5).padStart(5, '0') + ':00' : undefined);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
const DAYS = [['mon', 'Mo'], ['tue', 'Di'], ['wed', 'Mi'], ['thu', 'Do'], ['fri', 'Fr'], ['sat', 'Sa'], ['sun', 'So']];
const VERSION = '0.9.39';
// Standardauswahl, solange der Nutzer noch keine eigene Integrationsauswahl
// getroffen hat: IKEA-Geraete laufen ueber die Matter-Integration (DIRIGERA-
// Bruecke), dazu Homematic/HomematicIP ueber die lokale RaspberryMatic-CCU
// (Integration "Homematic(IP) Local", HA-Platform-Name homematicip_local).
const DEFAULT_PLATFORMS = ['matter', 'homematicip_local'];
const PLATFORMS_KEY = 'flowcraft_platforms';
const VERSION_ENTITY = 'input_text.flowcraft_version';
const VERSION_SEEN_KEY = 'flowcraft_reload_seen';
// Nur Domains, deren Entitaeten generisch turn_on/turn_off/toggle unterstuetzen.
// 'cover' (nur open/close/stop) und 'scene' (nur "aktivieren", kein turn_off/toggle)
// wurden bewusst ausgeschlossen, da sie mit diesem Aktions-Node nicht sauber
// schaltbar sind.
const ACT_DOMAINS = ['switch', 'light', 'input_boolean', 'fan', 'climate', 'media_player', 'script', 'automation', 'humidifier', 'siren', 'valve'];
// Helfer-Domains: gehoeren wie sun.sun zu keiner Geraete-Integration (in der Entity-
// Registry steht als "Plattform" jeweils die Helfer-Domain selbst, z.B. "input_number",
// nicht der Hersteller). Sie muessen daher vom Integrationen-Filter ausgenommen werden,
// sonst verschwinden z.B. Homematic-Automatisierungshelfer bei "Wert setzen" komplett,
// solange man nicht extra die Pseudo-Integration "input_number" & Co. anhakt.
const HELPER_DOMAINS = ['input_number', 'input_text', 'input_select', 'input_boolean', 'input_datetime', 'input_button', 'timer', 'counter'];
// Farb-/Symbol-Zuordnung fuer die Entitaetsauswahl, damit auf einen Blick erkennbar
// ist, von welchem Hersteller/welcher Integration eine Entitaet stammt. Die Farben
// sind bewusst etwas gedaempft (kein reines Gelb/Blau usw.) gewaehlt, damit der Text
// sowohl auf hellem als auch auf dunklem Hintergrund noch gut lesbar bleibt.
// IKEA-Geraete laufen technisch ueber die Matter-Integration, sollen aber trotzdem
// markentypisch gelb erscheinen statt in der generischen Matter-Farbe - siehe
// _platformStyle(), das dafuer zuerst den Hersteller prueft.
// Wichtig: der tatsaechliche HA-Platform-Name fuer die lokale Homematic(IP)-CCU
// (RaspberryMatic) ist "homematicip_local" - NICHT "homematic" oder
// "homematicip_cloud" (das waere die separate Cloud-Anbindung). In 0.9.7 stand
// hier faelschlicherweise "homematic"/"homematicip_cloud", wodurch nur IKEA
// (Matter) farbig erschien - siehe 0.9.8-Changelog.
// Fest zugeordnete Farben fuer die bekanntesten/haeufigsten Integrationen (damit
// diese immer gleich aussehen). Jede andere Integration, die hier nicht drinsteht,
// bekommt ueber _hashHue() automatisch eine eigene, aus ihrem Namen errechnete
// Farbe - so hat wirklich JEDE Integration eine eigene, aber stabile Farbe, auch
// ohne dass sie hier von Hand eingetragen werden muss.
const PLATFORM_STYLE = {
  matter: { color: '#6a1b9a', icon: '🟣' },
  homematicip_local: { color: '#1565c0', icon: '🔵' },
  zha: { color: '#2e7d32', icon: '🟢' },
  zwave_js: { color: '#d84315', icon: '🟠' },
  mqtt: { color: '#546e7a', icon: '⬜' },
  esphome: { color: '#00838f', icon: '🔶' },
  tasmota: { color: '#c62828', icon: '🔺' },
  shelly: { color: '#00695c', icon: '🔻' },
};
const IKEA_STYLE = { color: '#8a6d00', icon: '🟡' };
// Errechnet aus einem beliebigen Integrations-/Platform-Namen eine feste,
// gut lesbare Farbe (Hashwert -> Farbton), damit auch Integrationen ohne
// Eintrag in PLATFORM_STYLE eine eigene, aber immer gleichbleibende Farbe
// bekommen. Der Gelbbereich bleibt IKEA vorbehalten, damit es nicht zu
// Verwechslungen kommt.
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  let hue = h % 360;
  if (hue > 40 && hue < 65) hue = (hue + 90) % 360;
  return hue;
}

// ---------- Node-Typen ----------
const T = {
  trig_motion: {
    cat: 'trigger', label: 'Bewegung', icon: '🚶', color: '#2e7d32',
    fields: [
      { k: 'entity', l: 'Bewegungsmelder', t: 'entity', d: ['binary_sensor'], dc: ['motion', 'occupancy', 'presence'], filterInt: true, r: 1 },
      { k: 'to', l: 'Ausloesen bei', t: 'select', o: [['on', 'Bewegung erkannt'], ['off', 'Bewegung beendet']], v: 'on' },
      { k: 'for', l: 'Fuer mindestens (Sek.)', t: 'number' },
    ],
    // sub liefert [Sensor/Entitaet, Vergleichswerte] - siehe subParts()/wrapSub()
    // in _render(): dadurch landet die Entitaet immer auf der ersten und die
    // eingestellten Werte auf der zweiten Zeile des Nodes, statt sich einen
    // Zeilenumbruch an einer zufaelligen Wortgrenze zu teilen.
    sub: (c, L) => [L(c.entity), `${c.to === 'off' ? 'beendet' : 'erkannt'}${num(c.for) ? `, ≥${c.for}s` : ''}`],
    trig: (c) => clean({ trigger: 'state', entity_id: c.entity, to: c.to || 'on', for: num(c.for) ? hms(0, num(c.for)) : undefined }),
  },
  trig_state: {
    cat: 'trigger', label: 'Zustand aendert sich', icon: '🔀', color: '#2e7d32',
    fields: [
      { k: 'entity', l: 'Entitaet', t: 'entity', filterInt: true, r: 1 },
      { k: 'from', l: 'Von (optional)', t: 'text' },
      { k: 'to', l: 'Nach (optional)', t: 'text' },
      { k: 'for', l: 'Fuer mindestens (Sek.)', t: 'number' },
    ],
    sub: (c, L) => {
      const parts = [];
      if (c.from) parts.push(`von ${c.from}`);
      if (c.to) parts.push(`nach ${c.to}`);
      if (num(c.for)) parts.push(`≥${c.for}s`);
      return [L(c.entity), parts.join(', ')];
    },
    trig: (c) => clean({ trigger: 'state', entity_id: c.entity, from: c.from, to: c.to, for: num(c.for) ? hms(0, num(c.for)) : undefined }),
  },
  trig_numeric: {
    cat: 'trigger', label: 'Wert-Schwelle', icon: '📈', color: '#2e7d32',
    fields: [
      { k: 'entity', l: 'Sensor', t: 'entity', d: ['sensor', 'input_number'], filterInt: true, r: 1 },
      { k: 'above', l: 'Ueber', t: 'number', unitFrom: 'entity' },
      { k: 'below', l: 'Unter', t: 'number', unitFrom: 'entity' },
    ],
    sub: (c, L) => {
      const parts = [];
      if (num(c.above) !== undefined) parts.push(`> ${c.above}`);
      if (num(c.below) !== undefined) parts.push(`< ${c.below}`);
      return [L(c.entity), parts.join(', ')];
    },
    trig: (c) => clean({ trigger: 'numeric_state', entity_id: c.entity, above: num(c.above), below: num(c.below) }),
  },
  trig_time: {
    cat: 'trigger', label: 'Uhrzeit', icon: '⏰', color: '#2e7d32',
    fields: [{ k: 'at', l: 'Uhrzeit', t: 'time', r: 1, v: '07:00' }],
    sub: (c) => c.at,
    trig: (c) => ({ trigger: 'time', at: hm(c.at) || '07:00:00' }),
  },
  trig_time_weekday: {
    // Ein Wochentag allein kann in HA nichts ausloesen (kein Ereignis), deshalb
    // ist dies ein eigener Ausloeser-Node, der eine Uhrzeit MIT Wochentags-
    // Einschraenkung kombiniert: technisch ein normaler Zeit-Trigger, dessen
    // gesamter nachgeschalteter Zweig (steps) vom Compiler zusaetzlich in eine
    // "if: weekday"-Bedingung eingepackt wird (siehe wrapWeekday in compileFlow).
    cat: 'trigger', label: 'Uhrzeit + Wochentag', icon: '📅', color: '#2e7d32',
    wrapWeekday: true,
    fields: [
      { k: 'at', l: 'Uhrzeit', t: 'time', r: 1, v: '07:00' },
      { k: 'days', l: 'Wochentage', t: 'days', v: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    ],
    sub: (c) => `${c.at || ''} (${(c.days || []).length ? c.days.join(',') : 'alle'})`,
    trig: (c) => ({ trigger: 'time', at: hm(c.at) || '07:00:00' }),
  },
  trig_sun: {
    cat: 'trigger', label: 'Sonne', icon: '🌅', color: '#2e7d32',
    fields: [
      { k: 'event', l: 'Ereignis', t: 'select', o: [['sunrise', 'Sonnenaufgang'], ['sunset', 'Sonnenuntergang']], v: 'sunset' },
      { k: 'offset', l: 'Versatz in Min. (negativ = vorher)', t: 'number', v: '0' },
    ],
    sub: (c) => (c.event === 'sunrise' ? 'Sonnenaufgang' : 'Sonnenuntergang') + (num(c.offset) ? ` ${c.offset} min` : ''),
    trig: (c) => clean({ trigger: 'sun', event: c.event || 'sunset', offset: offs(c.offset) }),
  },
  trig_button: {
    cat: 'trigger', label: 'Taste / Fernbedienung', icon: '🔘', color: '#2e7d32',
    fields: [
      { k: 'entity', l: 'Taste (event-Entität)', t: 'entity', d: ['event'], filterInt: true, r: 1 },
      { k: 'event_type', l: 'Ereignis (leer = beliebig)', t: 'select', o: [['', 'Beliebig'], ['initial_press', 'Erster Druck'], ['short_release', 'Kurz gedrückt'], ['long_press', 'Lang gedrückt (Anfang)'], ['long_release', 'Lang gedrückt (Ende)']], v: '' },
    ],
    sub: (c, L) => {
      const evLabels = { initial_press: 'Erster Druck', short_release: 'Kurz', long_press: 'Lang (Anfang)', long_release: 'Lang (Ende)' };
      return [L(c.entity), c.event_type ? (evLabels[c.event_type] || c.event_type) : ''];
    },
    trig: (c) => (c.event_type
      ? { trigger: 'event.received', target: { entity_id: c.entity }, options: { event_type: [c.event_type] } }
      : { trigger: 'event.received', target: { entity_id: c.entity } }),
  },
  trig_zone: {
    cat: 'trigger', label: 'Zone betreten/verlassen', icon: '📍', color: '#2e7d32',
    fields: [
      { k: 'entity', l: 'Person', t: 'entity', d: ['person'], r: 1 },
      { k: 'zone', l: 'Zone', t: 'entity', d: ['zone'], r: 1 },
      { k: 'event', l: 'Ereignis', t: 'select', o: [['enter', 'Betritt'], ['leave', 'Verlaesst']], v: 'enter' },
    ],
    sub: (c, L) => [L(c.entity), `${c.event === 'leave' ? 'verlaesst' : 'betritt'} ${L(c.zone)}`],
    trig: (c) => ({ trigger: 'zone', entity_id: c.entity, zone: c.zone, event: c.event || 'enter' }),
  },
  trig_calendar: {
    // wrapCalendarTitle: HA kennt kein "waehle ein bestimmtes Ereignis aus einer
    // Liste" - der Trigger feuert immer fuer JEDES Ereignis im gewaehlten Kalender.
    // Ist "title_filter" gesetzt, wird der gesamte nachgeschaltete Zweig deshalb
    // zusaetzlich in eine Template-Bedingung eingepackt, die trigger.calendar_event.summary
    // mit dem gewuenschten Titel vergleicht (siehe compileFlow) - spart den bisher
    // noetigen separaten "Vorlage (Template)"-Node fuer diesen sehr haeufigen Fall.
    cat: 'trigger', label: 'Kalender-Ereignis', icon: '📆', color: '#2e7d32',
    wrapCalendarTitle: true,
    fields: [
      { k: 'entity', l: 'Kalender', t: 'entity', d: ['calendar'], r: 1 },
      { k: 'event', l: 'Ereignis', t: 'select', o: [['start', 'Beginnt'], ['end', 'Endet']], v: 'start' },
      { k: 'offset', l: 'Versatz in Min. (negativ = vorher)', t: 'number', v: '0' },
      { k: 'title_filter', l: 'Nur bei Termin-Titel (optional, leer = alle)', t: 'text' },
    ],
    sub: (c, L) => [L(c.entity), `${c.event === 'end' ? 'endet' : 'beginnt'}${c.title_filter ? ` ("${c.title_filter}")` : ''}`],
    trig: (c) => clean({ trigger: 'calendar', entity_id: c.entity, event: c.event || 'start', offset: offs(c.offset) }),
  },
  trig_alexa: {
    // Ganz ohne Helfer und ohne manuell in der Alexa-App eine Routine anzulegen:
    // dieser Node erzeugt beim Deploy KEINE HA-Automation, sondern ein eigenes,
    // natives HA-Skript (script.*) mit dem hier eingegebenen Namen als Anzeigename
    // (siehe asScript in compileFlow/_deploy). Skripte werden von der bestehenden
    // Alexa-Anbindung automatisch wie ein Geraet/eine Szene an Alexa
    // weitergegeben - Alexa kann sie direkt per "Alexa, schalte <Name> ein"
    // bzw. "Alexa, aktiviere <Name>" ausloesen, ganz ohne Zwischenschalter oder
    // Routine. Einzige (einmalige) Voraussetzung: neu hinzugekommene Geraete
    // muessen Alexa bekannt gemacht werden ("Alexa, entdecke Geraete neu" bzw.
    // in der Alexa-App "Geraete hinzufuegen") - das ist bei JEDEM neuen Geraet
    // in Alexa so und keine Besonderheit dieses Nodes.
    // WICHTIG (0.9.34): Ein HA-Skript kennt selbst kein "an"/"aus" - es fuehrt
    // beim Aufruf immer nur EINMAL die hier angeschlossene Aktionskette aus.
    // Home Assistant meldet Skripte an Alexa als Szene, die Alexa nur
    // "aktivieren" kann. "Alexa, schalte <Name> EIN" aktiviert die Sequenz
    // ganz normal; "Alexa, schalte <Name> AUS" wird von Alexa zwar meist mit
    // "ok" quittiert, loest in HA aber KEINE eigene "Aus"-Sequenz aus. Wer
    // sowohl Ein- als auch Ausschalten per Sprache will, braucht daher ZWEI
    // eigene Alexa-Sprachbefehl-Nodes mit unterschiedlichem Namen (z.B.
    // "Schlafzimmerlicht an" -> Einschalten, "Schlafzimmerlicht aus" ->
    // Ausschalten) - siehe Hinweistext im Feld und in der Anleitung.
    // NEU (0.9.35): Beim Deploy wird das erzeugte Skript automatisch per
    // WebSocket-Befehl (homeassistant/expose_entity) bei Alexa freigegeben
    // (siehe _setAlexaExposed/_deploy) - der Schieberegler unter Einstellungen
    // -> Sprachassistenten -> Alexa muss dafuer nicht mehr manuell umgelegt
    // werden. Wird dieser Node geloescht (oder aus der Aktionskette entfernt),
    // wird die Freigabe beim naechsten Deploy automatisch wieder zurueckgenommen.
    // Home Assistant Cloud meldet eine geaenderte Freigabeliste von sich aus
    // aktiv an Alexa (Discovery.AddOrUpdateReport) - ein neues Skript taucht
    // dadurch idR. genauso automatisch bei Alexa auf wie ein neu hinzugefuegtes
    // Matter-Geraet, meist innerhalb von Sekunden bis wenigen Minuten, ganz ohne
    // "Alexa, entdecke Geraete neu".
    cat: 'trigger', label: 'Alexa-Sprachbefehl', icon: '🗣️', color: '#2e7d32',
    asScript: true,
    fields: [
      { k: 'phrase', l: 'Name fuer Alexa (z.B. "Schlafzimmerlicht an" - fuehrt IMMER nur diese eine Aktionskette aus. Fuer An UND Aus: zwei Nodes mit je eigenem Namen anlegen, siehe Anleitung)', t: 'text', r: 1 },
    ],
    sub: (c) => c.phrase || '',
  },
  cond_dark: {
    cat: 'cond', label: 'Ist es dunkel?', icon: '🌙', color: '#1565c0',
    fields: [
      { k: 'entity', l: 'Helligkeitssensor (lx)', t: 'entity', d: ['sensor'], dc: ['illuminance'], filterInt: true, r: 1 },
      { k: 'below', l: 'Dunkel unter (lx)', t: 'number', v: '500' },
      { k: 'fallback', l: 'Ersatz: Sonnenhoehe unter (Grad, leer = aus)', t: 'number', v: '6' },
    ],
    sub: (c, L) => [L(c.entity), `< ${c.below || 500} lx`],
    cond: (c) => {
      const lux = { condition: 'numeric_state', entity_id: c.entity, below: num(c.below) ?? 500 };
      if (num(c.fallback) === undefined) return lux;
      return {
        condition: 'or',
        conditions: [
          lux,
          { condition: 'and', conditions: [
            { condition: 'state', entity_id: c.entity, state: ['unavailable', 'unknown'] },
            { condition: 'numeric_state', entity_id: 'sun.sun', attribute: 'elevation', below: num(c.fallback) },
          ] },
        ],
      };
    },
  },
  cond_state: {
    cat: 'cond', label: 'Zustand ist', icon: '❓', color: '#1565c0',
    fields: [
      { k: 'entity', l: 'Entitaet', t: 'entity', filterInt: true, r: 1 },
      { k: 'state', l: 'Zustand (mehrere mit Komma)', t: 'text', r: 1, v: 'on' },
    ],
    sub: (c, L) => [L(c.entity), `= ${c.state || ''}`],
    cond: (c) => ({ condition: 'state', entity_id: c.entity, state: String(c.state || '').split(',').map((s) => s.trim()).filter(Boolean) }),
  },
  cond_numeric: {
    cat: 'cond', label: 'Wert-Vergleich', icon: '🔢', color: '#1565c0',
    fields: [
      { k: 'entity', l: 'Sensor', t: 'entity', d: ['sensor', 'input_number', 'sun'], filterInt: true, r: 1 },
      { k: 'attribute', l: 'Attribut (optional)', t: 'text' },
      { k: 'above', l: 'Ueber', t: 'number', unitFrom: 'entity' },
      { k: 'below', l: 'Unter', t: 'number', unitFrom: 'entity' },
    ],
    sub: (c, L) => {
      const parts = [];
      if (num(c.above) !== undefined) parts.push(`> ${c.above}`);
      if (num(c.below) !== undefined) parts.push(`< ${c.below}`);
      const base = c.attribute ? `${L(c.entity)}.${c.attribute}` : L(c.entity);
      return [base, parts.join(', ')];
    },
    cond: (c) => clean({ condition: 'numeric_state', entity_id: c.entity, attribute: c.attribute, above: num(c.above), below: num(c.below) }),
  },
  cond_sun: {
    cat: 'cond', label: 'Sonnenstand', icon: '☀️', color: '#1565c0',
    fields: [
      { k: 'after', l: 'Nach', t: 'select', o: [['', '-'], ['sunrise', 'Sonnenaufgang'], ['sunset', 'Sonnenuntergang']] },
      { k: 'after_offset', l: 'Versatz nach (Min.)', t: 'number' },
      { k: 'before', l: 'Vor', t: 'select', o: [['', '-'], ['sunrise', 'Sonnenaufgang'], ['sunset', 'Sonnenuntergang']] },
      { k: 'before_offset', l: 'Versatz vor (Min.)', t: 'number' },
    ],
    sub: (c) => [c.after && 'nach ' + c.after, c.before && 'vor ' + c.before].filter(Boolean).join(', '),
    cond: (c) => clean({ condition: 'sun', after: c.after, after_offset: offs(c.after_offset), before: c.before, before_offset: offs(c.before_offset) }),
  },
  cond_time: {
    cat: 'cond', label: 'Zeitfenster', icon: '🕒', color: '#1565c0',
    fields: [
      { k: 'after', l: 'Ab', t: 'time', v: '18:00' },
      { k: 'before', l: 'Bis', t: 'time', v: '23:00' },
    ],
    sub: (c) => `${c.after || ''} - ${c.before || ''}`,
    cond: (c) => clean({ condition: 'time', after: hm(c.after), before: hm(c.before) }),
  },
  cond_weekday: {
    cat: 'cond', label: 'Wochentag', icon: '📅', color: '#1565c0',
    fields: [{ k: 'days', l: 'Tage', t: 'days', v: ['mon', 'tue', 'wed', 'thu', 'fri'] }],
    sub: (c) => (c.days || []).join(','),
    cond: (c) => ({ condition: 'time', weekday: c.days && c.days.length ? c.days : DAYS.map((d) => d[0]) }),
  },
  cond_zone: {
    cat: 'cond', label: 'Zone ist', icon: '📍', color: '#1565c0',
    fields: [
      { k: 'entity', l: 'Person', t: 'entity', d: ['person'], r: 1 },
      { k: 'zone', l: 'Zone', t: 'entity', d: ['zone'], r: 1 },
    ],
    sub: (c, L) => [L(c.entity), `in ${L(c.zone)}`],
    cond: (c) => ({ condition: 'zone', entity_id: c.entity, zone: c.zone }),
  },
  cond_multi: {
    cat: 'cond', label: 'UND / ODER', icon: '🔗', color: '#1565c0',
    // Ersetzt die vorherigen getrennten Nodes "UND" und "ODER" (0.9.13): jetzt ein
    // einziger Node, bei dem die Verknuepfung (UND/ODER) als Kriterium waehlbar ist
    // und bis zu 4 Entitaet/Zustand-Paare angegeben werden koennen (nicht mehr nur 2).
    fields: [
      { k: 'logic', l: 'Verknuepfung', t: 'select', o: [['and', 'UND (alle muessen zutreffen)'], ['or', 'ODER (mindestens eine muss zutreffen)']], v: 'and' },
      { k: 'entity1', l: 'Entitaet 1', t: 'entity', filterInt: true, r: 1 },
      { k: 'state1', l: 'Zustand 1', t: 'text', r: 1, v: 'on' },
      { k: 'entity2', l: 'Entitaet 2 (optional)', t: 'entity', filterInt: true },
      { k: 'state2', l: 'Zustand 2', t: 'text' },
      { k: 'entity3', l: 'Entitaet 3 (optional)', t: 'entity', filterInt: true },
      { k: 'state3', l: 'Zustand 3', t: 'text' },
      { k: 'entity4', l: 'Entitaet 4 (optional)', t: 'entity', filterInt: true },
      { k: 'state4', l: 'Zustand 4', t: 'text' },
    ],
    sub: (c, L) => [1, 2, 3, 4]
      .filter((i) => c[`entity${i}`])
      .map((i) => `${L(c[`entity${i}`])}=${c[`state${i}`] || ''}`)
      .join(c.logic === 'or' ? ' ODER ' : ' UND '),
    cond: (c) => {
      const conditions = [1, 2, 3, 4]
        .filter((i) => c[`entity${i}`])
        .map((i) => ({ condition: 'state', entity_id: c[`entity${i}`], state: c[`state${i}`] }));
      if (conditions.length <= 1) return conditions[0] || { condition: 'state', entity_id: c.entity1, state: c.state1 };
      return { condition: c.logic === 'or' ? 'or' : 'and', conditions };
    },
  },
  cond_template: {
    cat: 'cond', label: 'Vorlage (Template)', icon: '🧩', color: '#1565c0',
    fields: [
      { k: 'template', l: 'Jinja-Vorlage (ergibt true/false)', t: 'text', r: 1, v: '{{ true }}' },
    ],
    sub: (c) => c.template,
    cond: (c) => ({ condition: 'template', value_template: c.template }),
  },
  act_device: {
    cat: 'action', label: 'Geraet schalten', icon: '💡', color: '#e65100',
    fields: [
      { k: 'entity', l: 'Geraet', t: 'entity', d: ACT_DOMAINS, filterInt: true, r: 1 },
      { k: 'op', l: 'Aktion', t: 'select', o: [['turn_on', 'Einschalten'], ['turn_off', 'Ausschalten'], ['toggle', 'Umschalten']], v: 'turn_on' },
      { k: 'brightness', l: 'Helligkeit % (nur Licht, Einschalten)', t: 'number' },
    ],
    sub: (c, L) => [L(c.entity), `${{ turn_on: 'AN', turn_off: 'AUS', toggle: 'UM' }[c.op || 'turn_on']}${(c.op || 'turn_on') === 'turn_on' && num(c.brightness) !== undefined ? ` (${c.brightness}%)` : ''}`],
    act: (c) => {
      const a = { action: `${dom(c.entity)}.${c.op || 'turn_on'}`, target: { entity_id: c.entity } };
      if (dom(c.entity) === 'light' && (c.op || 'turn_on') === 'turn_on' && num(c.brightness) !== undefined) a.data = { brightness_pct: num(c.brightness) };
      return a;
    },
  },
  act_delay: {
    cat: 'action', label: 'Verzoegerung', icon: '⏳', color: '#e65100',
    fields: [
      { k: 'min', l: 'Minuten', t: 'number', v: '5' },
      { k: 'sec', l: 'Sekunden', t: 'number', v: '0' },
    ],
    sub: (c) => `${c.min || 0} min ${c.sec || 0} s`,
    act: (c) => ({ delay: hms(num(c.min) || 0, num(c.sec) || 0) }),
  },
  act_notify: {
    cat: 'action', label: 'Benachrichtigung', icon: '🔔', color: '#e65100',
    fields: [
      { k: 'service', l: 'Dienst', t: 'text', v: 'persistent_notification.create', r: 1 },
      { k: 'title', l: 'Titel', t: 'text' },
      { k: 'message', l: 'Nachricht', t: 'text', r: 1 },
    ],
    sub: (c) => c.message,
    act: (c) => ({ action: c.service || 'persistent_notification.create', data: clean({ title: c.title, message: c.message }) }),
  },
  act_set_value: {
    cat: 'action', label: 'Wert setzen', icon: '🎚️', color: '#e65100',
    fields: [
      { k: 'entity', l: 'Helfer/Entitaet', t: 'entity', d: ['input_number', 'number', 'input_text', 'input_select', 'input_boolean'], filterInt: true, r: 1 },
      { k: 'value', l: 'Wert (Zahl, Text, Option oder on/off)', t: 'text', r: 1 },
    ],
    sub: (c, L) => [L(c.entity), `= ${c.value || ''}`],
    act: (c) => {
      const d = dom(c.entity);
      if (d === 'input_boolean') return { action: `input_boolean.${String(c.value || '').toLowerCase() === 'off' ? 'turn_off' : 'turn_on'}`, target: { entity_id: c.entity } };
      if (d === 'input_select') return { action: 'input_select.select_option', target: { entity_id: c.entity }, data: { option: c.value } };
      return { action: `${d}.set_value`, target: { entity_id: c.entity }, data: { value: c.value } };
    },
  },
  act_scene: {
    cat: 'action', label: 'Szene aktivieren', icon: '🎬', color: '#e65100',
    fields: [
      { k: 'entity', l: 'Szene', t: 'entity', d: ['scene'], r: 1 },
    ],
    sub: (c, L) => L(c.entity),
    act: (c) => ({ action: 'scene.turn_on', target: { entity_id: c.entity } }),
  },
  act_script: {
    cat: 'action', label: 'Skript ausfuehren', icon: '📜', color: '#e65100',
    fields: [
      { k: 'entity', l: 'Skript', t: 'entity', d: ['script'], r: 1 },
    ],
    sub: (c, L) => L(c.entity),
    act: (c) => ({ action: 'script.turn_on', target: { entity_id: c.entity } }),
  },
  act_cover: {
    cat: 'action', label: 'Rollladen/Cover', icon: '🪟', color: '#e65100',
    fields: [
      { k: 'entity', l: 'Cover', t: 'entity', d: ['cover'], filterInt: true, r: 1 },
      { k: 'op', l: 'Aktion', t: 'select', o: [['open_cover', 'Oeffnen'], ['close_cover', 'Schliessen'], ['stop_cover', 'Stopp'], ['set_cover_position', 'Position setzen']], v: 'open_cover' },
      { k: 'position', l: 'Position % (nur bei „Position setzen“)', t: 'number' },
    ],
    sub: (c, L) => [L(c.entity), `${{ open_cover: 'AUF', close_cover: 'ZU', stop_cover: 'STOPP', set_cover_position: 'POS' }[c.op || 'open_cover']}${(c.op || 'open_cover') === 'set_cover_position' && num(c.position) !== undefined ? ` (${c.position}%)` : ''}`],
    act: (c) => {
      const a = { action: `cover.${c.op || 'open_cover'}`, target: { entity_id: c.entity } };
      if ((c.op || 'open_cover') === 'set_cover_position' && num(c.position) !== undefined) a.data = { position: num(c.position) };
      return a;
    },
  },
  act_notify_mobile: {
    cat: 'action', label: 'Push-Benachrichtigung', icon: '📱', color: '#e65100',
    fields: [
      { k: 'service', l: 'Geraet/Dienst', t: 'notify_service', r: 1 },
      { k: 'title', l: 'Titel', t: 'text' },
      { k: 'message', l: 'Nachricht', t: 'text', r: 1 },
    ],
    sub: (c) => c.message,
    act: (c) => ({ action: c.service ? `notify.${c.service}` : 'notify.notify', data: clean({ title: c.title, message: c.message }) }),
  },
  act_repeat: {
    cat: 'action', label: 'Wiederholen', icon: '🔁', color: '#e65100',
    wrapRepeat: true,
    fields: [
      { k: 'count', l: 'Wiederholungen', t: 'number', r: 1, v: '3' },
    ],
    sub: (c) => `${c.count || 3}x`,
  },
};

// ---------- Compiler: Flow -> HA-Automation ----------
function validate(flow) {
  const errors = [], warnings = [];
  const inc = new Set(flow.wires.map((w) => w.to));
  const outc = new Set(flow.wires.map((w) => w.from));
  for (const n of flow.nodes) {
    const t = T[n.type];
    if (!t) { errors.push('Unbekannter Node-Typ ' + n.type); continue; }
    for (const f of t.fields) if (f.r && !String((n.cfg || {})[f.k] ?? '').trim()) errors.push(`${t.label}: „${f.l}“ fehlt`);
    if (t.cat === 'trigger' && !outc.has(n.id)) warnings.push(`${t.label} ist mit nichts verbunden`);
    if (t.cat !== 'trigger' && !inc.has(n.id)) warnings.push(`${t.label} hat keinen Eingang und wird nie erreicht`);
  }
  if (!flow.nodes.some((n) => T[n.type] && T[n.type].cat === 'trigger')) errors.push('Der Flow braucht mindestens einen Ausloeser');
  return { errors, warnings };
}

function compileFlow(flow) {
  const nodes = {};
  flow.nodes.forEach((n) => (nodes[n.id] = n));
  const outs = (id, o) => flow.wires.filter((w) => w.from === id && (w.out || 0) === o).map((w) => nodes[w.to]).filter(Boolean);
  const seq = (list, path) => list.flatMap((n) => step(n, path));
  const step = (n, path) => {
    const t = T[n.type];
    if (path.includes(n.id)) throw new Error(`Schleife im Flow bei „${t.label}“`);
    const p = path.concat(n.id), c = n.cfg || {};
    // wrapRepeat (z.B. "Wiederholen"): statt die Aktion selbst auszufuehren und
    // danach den nachgeschalteten Zweig anzuhaengen, wird der gesamte
    // nachgeschaltete Zweig als "sequence" in einen HA repeat-Block gepackt.
    if (t.wrapRepeat) {
      return [{ repeat: { count: num(c.count) || 1, sequence: seq(outs(n.id, 0), p) } }];
    }
    if (t.cat === 'cond') {
      const cond = t.cond(c), yes = seq(outs(n.id, 0), p), no = seq(outs(n.id, 1), p);
      if (yes.length) return [no.length ? { if: [cond], then: yes, else: no } : { if: [cond], then: yes }];
      if (no.length) return [{ if: [{ condition: 'not', conditions: [cond] }], then: no }];
      return [];
    }
    return [t.act(c)].concat(seq(outs(n.id, 0), p));
  };
  // Baut die "steps" (Aktionsliste) ab einem Ausloeser-Node - inkl. der
  // bestehenden Wochentags-/Kalender-Titel-Einpackungen, die unabhaengig davon
  // gelten, ob der Ausloeser am Ende als HA-Automation-Trigger (asAuto) oder
  // als HA-Skript (asScript, siehe "Alexa-Sprachbefehl") verwendet wird.
  const buildSteps = (tr) => {
    let steps = seq(outs(tr.id, 0), [tr.id]);
    const days = (tr.cfg || {}).days;
    if (T[tr.type].wrapWeekday && days && days.length && steps.length) {
      steps = [{ if: [{ condition: 'time', weekday: days }], then: steps }];
    }
    const titleFilter = ((tr.cfg || {}).title_filter || '').trim();
    if (T[tr.type].wrapCalendarTitle && titleFilter && steps.length) {
      const esc_j = titleFilter.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      steps = [{ if: [{ condition: 'template', value_template: `{{ trigger.calendar_event.summary == '${esc_j}' }}` }], then: steps }];
    }
    return steps;
  };
  const allTriggerNodes = flow.nodes.filter((n) => T[n.type] && T[n.type].cat === 'trigger');
  // asScript-Ausloeser (aktuell nur "Alexa-Sprachbefehl"): erzeugen KEINEN
  // Automation-Trigger, sondern werden weiter unten je einzeln zu einem
  // eigenstaendigen HA-Skript (script.*) kompiliert - Alexa kann Skripte ohne
  // jede weitere Einrichtung direkt per Sprachbefehl ausloesen (siehe
  // Kommentar am Node-Typ trig_alexa).
  const autoBranches = allTriggerNodes
    .filter((n) => !T[n.type].asScript)
    .map((tr) => ({ tr, steps: buildSteps(tr) }))
    .filter((b) => b.steps.length);
  const scriptBranches = allTriggerNodes
    .filter((n) => T[n.type].asScript)
    .map((tr) => ({ tr, steps: buildSteps(tr) }))
    .filter((b) => b.steps.length);
  if (!autoBranches.length && !scriptBranches.length) throw new Error('Kein Ausloeser ist mit einer Aktion verbunden');
  let automation = null;
  if (autoBranches.length) {
    const triggers = autoBranches.map((b) => ({ ...T[b.tr.type].trig(b.tr.cfg || {}), id: b.tr.id }));
    const actions = autoBranches.length === 1
      ? autoBranches[0].steps
      : [{ choose: autoBranches.map((b) => ({ conditions: [{ condition: 'trigger', id: b.tr.id }], sequence: b.steps })) }];
    const hasDelay = flow.nodes.some((n) => n.type === 'act_delay');
    automation = {
      id: 'flowcraft_' + flow.id,
      alias: 'FlowCraft: ' + (flow.name || flow.id),
      description: 'Erzeugt von FlowCraft. Aenderungen bitte in FlowCraft machen, sie werden beim naechsten Deploy ueberschrieben.',
      triggers,
      conditions: [],
      actions,
      mode: hasDelay ? 'restart' : 'single',
    };
  }
  // Jeder Alexa-Sprachbefehl-Node wird ein eigenstaendiges HA-Skript, damit
  // Alexa ihn direkt per Namen ansprechen kann - der eingegebene Name wird
  // dabei 1:1 zum Anzeigenamen (alias) des Skripts.
  const scripts = scriptBranches.map((b) => ({
    id: 'flowcraft_alexa_' + b.tr.id,
    nodeId: b.tr.id,
    cfg: {
      alias: (b.tr.cfg || {}).phrase || 'Alexa-Befehl',
      sequence: b.steps,
      mode: 'restart',
    },
  }));
  return { automation, scripts };
}

// ---------- Simulation: Bedingungen mit aktuellen hass.states auswerten, ----------
// ---------- OHNE irgendeinen Service/Aktor tatsaechlich aufzurufen. ----------
// Deckt genau die Bedingungs-Formen ab, die die eigenen cond_*-Nodes erzeugen
// (state, numeric_state, zone, time, and/or/not, sun, template). Fuer "sun" gibt es
// nur eine grobe Naeherung ueber die aktuelle Sonnenhoehe (keine echte Astral-
// Berechnung mit Datum/Offset), fuer "template" (Vorlage, sowie den automatisch
// erzeugten Kalender-Titel-Filter) kann ohne echten Trigger-Kontext (z.B.
// trigger.calendar_event) nicht sicher ausgewertet werden - wird deshalb als
// "angenommen: Ja" markiert, klar gekennzeichnet mit approx:true.
function evalConditionLocal(cond, hass) {
  const st = (id) => (hass && hass.states ? hass.states[id] : undefined);
  switch (cond.condition) {
    case 'state': {
      const s = st(cond.entity_id);
      const val = s ? s.state : undefined;
      const wanted = Array.isArray(cond.state) ? cond.state : [cond.state];
      return { ok: wanted.includes(val), detail: `aktuell: ${val ?? 'unbekannt'}`, approx: false };
    }
    case 'numeric_state': {
      const s = st(cond.entity_id);
      const raw = cond.attribute ? (s && s.attributes ? s.attributes[cond.attribute] : undefined) : (s ? s.state : undefined);
      const n = parseFloat(raw);
      let ok = !isNaN(n);
      if (ok && cond.above !== undefined) ok = n > cond.above;
      if (ok && cond.below !== undefined) ok = ok && n < cond.below;
      return { ok, detail: `aktuell: ${isNaN(n) ? (raw ?? 'unbekannt') : n}`, approx: false };
    }
    case 'zone': {
      const s = st(cond.entity_id);
      const zoneSlug = String(cond.zone || '').split('.')[1];
      const zoneSt = st(cond.zone);
      const zoneName = zoneSt && zoneSt.attributes && zoneSt.attributes.friendly_name;
      const ok = !!(s && (s.state === zoneSlug || (zoneName && s.state === zoneName)));
      return { ok, detail: `Person-Status: ${s ? s.state : 'unbekannt'}`, approx: true };
    }
    case 'time': {
      const now = new Date();
      let ok = true;
      const detail = [];
      if (cond.weekday && cond.weekday.length) {
        const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = map[now.getDay()];
        ok = ok && cond.weekday.includes(today);
        detail.push(`Wochentag heute: ${today}`);
      }
      if (cond.after) {
        const [h, m] = cond.after.split(':').map(Number);
        const d = new Date(now); d.setHours(h, m, 0, 0);
        ok = ok && now >= d;
        detail.push(`ab ${cond.after}`);
      }
      if (cond.before) {
        const [h, m] = cond.before.split(':').map(Number);
        const d = new Date(now); d.setHours(h, m, 0, 0);
        ok = ok && now <= d;
        detail.push(`bis ${cond.before}`);
      }
      return { ok, detail: detail.join(', ') || 'Zeitfenster', approx: false };
    }
    case 'sun': {
      const s = st('sun.sun');
      const elevation = s && s.attributes ? Number(s.attributes.elevation) : NaN;
      const afternoon = new Date().getHours() >= 12;
      let ok = true;
      if (cond.after === 'sunset') ok = ok && elevation < 0 && afternoon;
      if (cond.after === 'sunrise') ok = ok && elevation > -6 && !afternoon;
      if (cond.before === 'sunset') ok = ok && !(elevation < 0 && afternoon);
      if (cond.before === 'sunrise') ok = ok && !afternoon && elevation < 0;
      return { ok, detail: `Sonnenhoehe: ${isNaN(elevation) ? '?' : elevation.toFixed(1)}°`, approx: true };
    }
    case 'template': {
      return { ok: true, detail: 'Vorlage nicht simulierbar (kein echter Ausloeser-Kontext) - angenommen: Ja', approx: true };
    }
    case 'and': {
      const parts = cond.conditions.map((c) => evalConditionLocal(c, hass));
      return { ok: parts.every((p) => p.ok), detail: parts.map((p) => p.detail).join(' UND '), approx: parts.some((p) => p.approx) };
    }
    case 'or': {
      const parts = cond.conditions.map((c) => evalConditionLocal(c, hass));
      return { ok: parts.some((p) => p.ok), detail: parts.map((p) => p.detail).join(' ODER '), approx: parts.some((p) => p.approx) };
    }
    case 'not': {
      const parts = cond.conditions.map((c) => evalConditionLocal(c, hass));
      return { ok: !parts.every((p) => p.ok), detail: 'NICHT (' + parts.map((p) => p.detail).join(', ') + ')', approx: parts.some((p) => p.approx) };
    }
    default:
      return { ok: true, detail: 'unbekannter Bedingungstyp - angenommen: Ja', approx: true };
  }
}

if (typeof window !== 'undefined') window.FlowCraftCompiler = { compileFlow, validate, T, evalConditionLocal };

// ---------- Editor ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NW = 220;
// Zeilenabstand Titel->Sub-Text bzw. (falls vorhanden) letzte Sub-Zeile->"Aktuell":
// bei Pruefen-Nodes (cat 'cond') groesser, weil dort noch die Ja/Nein-Beschriftung
// neben den Ausgangs-Ports Platz braucht.
const catGap = (n) => (T[n.type] && T[n.type].cat === 'cond' ? 26 : 16);
// Zeilenhoehe der Sub-Text-Zeile(n) (11px Schrift, siehe .fe .ns).
const LINE_H = 13;
// Basis-Hoehe je nach Node-Kategorie: Titelzeile + Platz fuer bis zu ZWEI
// Sub-Text-Zeilen (automatischer Zeilenumbruch statt Abschneiden mitten im
// Wort, siehe wrapSub()) + Nodes mit einer Bezugs-Entitaet bekommen zusaetzliche
// Hoehe fuer die dritte Zeile mit dem aktuellen Ist-Wert.
const nhBase = (n) => 28 + catGap(n) + LINE_H;
// Liefert die Entitaet, deren Ist-Wert als dritte Zeile im Node angezeigt werden
// soll - fuer Aktor-, Ausloeser- und Pruefen-Nodes mit genau einer Bezugs-Entitaet
// (bei "UND/ODER" mit mehreren Entitaeten wird die erste gezeigt); Nodes ohne
// Entitaetsbezug (Uhrzeit, Sonnenstand, Wochentag, Vorlage, Verzoegerung, ...)
// liefern nichts und bekommen daher auch keine dritte Zeile.
const nhEntity = (n) => {
  const t = T[n.type];
  if (!t || !n.cfg) return undefined;
  if (t.cat !== 'action' && t.cat !== 'trigger' && t.cat !== 'cond') return undefined;
  if (n.cfg.entity) return n.cfg.entity;
  if (n.type === 'cond_multi' && n.cfg.entity1) return n.cfg.entity1;
  return undefined;
};
const nhShowsVal = (n) => !!nhEntity(n);
// Gesamthoehe: Basis (Titel + bis zu 2 Sub-Zeilen) plus - falls eine dritte
// Zeile mit dem Ist-Wert gezeigt wird - derselbe Zeilenabstand wie zwischen
// Titel und Sub-Text, damit alle Zeilen gleichmaessig verteilt sind.
const nh = (n) => nhBase(n) + (nhShowsVal(n) ? catGap(n) : 0);
// Bricht einen Sub-Text auf bis zu zwei Zeilen um (an einer Wortgrenze nahe
// maxLen, sonst hart), statt ihn mitten im Wort auf einer zu langen Zeile
// abzuschneiden. Passt zusammen mit NW=220px / .ns-Schriftgroesse (11px).
const wrapSub = (str, maxLen) => {
  str = String(str ?? '');
  if (str.length <= maxLen) return [str, ''];
  let breakAt = str.lastIndexOf(' ', maxLen);
  if (breakAt < maxLen * 0.4) breakAt = maxLen;
  let line1 = str.slice(0, breakAt).trim();
  let line2 = str.slice(breakAt).trim();
  if (line2.length > maxLen) line2 = line2.slice(0, maxLen - 1) + '…';
  return [line1, line2];
};
// Kuerzt eine bereits an einer sinnvollen Stelle abgeteilte Zeile (siehe
// subParts()) hart auf maxLen, falls sie (z.B. bei sehr langen Entitaetsnamen)
// trotzdem zu lang fuer eine Zeile ist.
const trimLine = (str, maxLen) => {
  str = String(str ?? '');
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
};
// Node-Typen mit Entitaetsbezug liefern ihren sub()-Text bewusst als
// [Sensor/Entitaet, Vergleichswerte-bzw.-Zustand] (Array) statt als ein-
// zelnen String, damit die zweite Node-Zeile immer an dieser sinnvollen,
// fachlichen Stelle umbricht (z.B. "Buero Luftfeuchtigkeit" / "> 90, < 3")
// statt an einer zufaelligen Wortgrenze. Andere Node-Typen (Vorlage,
// UND/ODER, Benachrichtigung, ...) liefern weiterhin einen einzelnen String,
// der bei Bedarf per wrapSub() umgebrochen wird. subParts() liefert in
// beiden Faellen einheitlich [Zeile1, Zeile2] fuer die Anzeige im Node.
const subParts = (t, c, L, maxLen) => {
  const r = t.sub(c, L);
  if (Array.isArray(r)) return [trimLine(r[0] || '', maxLen), trimLine(r[1] || '', maxLen)];
  return wrapSub(String(r ?? ''), maxLen);
};
// Liefert denselben sub()-Text als einzelnen, flachen String (z.B. fuer die
// Text-Vorschau bei "Simulieren" oder den Ausloeser-Kopf), unabhaengig davon,
// ob sub() ein Array oder einen String zurueckgibt.
const subFlat = (t, c, L) => {
  const r = t.sub(c, L);
  return Array.isArray(r) ? r.filter(Boolean).join(' ') : String(r ?? '');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STORE_KEY = 'flowcraft_flows';

// Beispiel-Flow fuer Erstinstallationen - bewusst mit generischen Platzhalter-
// Entities statt echter Geraete-/Standortdaten des Autors (siehe Changelog
// 0.9.37), damit eine veroeffentlichte Version keine persoenlichen Daten
// enthaelt. Die Platzhalter existieren in keiner echten HA-Instanz, der Flow
// dient nur zur Veranschaulichung des Aufbaus (Auslöser -> Bedingung -> Aktion).
const sampleFlow = () => ({
  id: 'f' + Date.now().toString(36), name: 'Beispiel: Licht bei Bewegung', enabled: false, seq: 5,
  nodes: [
    { id: 'n1', type: 'trig_motion', x: 40, y: 60, cfg: { entity: 'binary_sensor.beispiel_bewegungsmelder', to: 'on' } },
    { id: 'n2', type: 'cond_dark', x: 290, y: 55, cfg: { entity: 'sensor.beispiel_helligkeitssensor', below: '500', fallback: '6' } },
    { id: 'n3', type: 'act_device', x: 540, y: 60, cfg: { entity: 'switch.beispiel_licht', op: 'turn_on' } },
    { id: 'n4', type: 'act_delay', x: 790, y: 60, cfg: { min: '5', sec: '0' } },
    { id: 'n5', type: 'act_device', x: 1040, y: 60, cfg: { entity: 'switch.beispiel_licht', op: 'turn_off' } },
  ],
  wires: [
    { from: 'n1', out: 0, to: 'n2' }, { from: 'n2', out: 0, to: 'n3' },
    { from: 'n3', out: 0, to: 'n4' }, { from: 'n4', out: 0, to: 'n5' },
  ],
});

const CSS = `
:host,flowcraft-editor{display:block}
.fe{display:flex;flex-direction:column;height:calc(100vh - 64px);min-height:520px;color:var(--primary-text-color)}
.fe .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--divider-color)}
.fe button,.fe select,.fe input:not([type=checkbox]){font:inherit;padding:6px 10px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color)}
.fe button{cursor:pointer}.fe button.pri{background:var(--primary-color);color:#fff;border-color:var(--primary-color)}
.fe .status{margin-left:auto;font-size:.9em;opacity:.85}.fe .status.err{color:var(--error-color,#c62828)}
.fe .ver{font-size:.75em;opacity:.55;font-family:monospace}
.fe .main{display:flex;flex:1;min-height:0}
.fe .pal{width:170px;overflow:auto;padding:8px;border-right:1px solid var(--divider-color);flex:none}
.fe .pal h4{margin:10px 0 4px;font-size:.8em;text-transform:uppercase;opacity:.7}
.fe .pal button{display:block;width:100%;text-align:left;margin:3px 0;border-left-width:5px}
.fe .pal button:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(1)}
.fe .cv{flex:1;overflow:auto;position:relative;outline:none;background:var(--secondary-background-color,#f5f5f5)}
.fe .ins{width:280px;overflow:auto;padding:10px;border-left:1px solid var(--divider-color);flex:none}
.fe .ins label{display:block;margin:10px 0 3px;font-size:.85em;opacity:.8}
.fe .ins input:not([type=checkbox]),.fe .ins select{width:100%;box-sizing:border-box}
.fe .ins .hint{font-size:.8em;opacity:.7;margin-top:2px;word-break:break-all}
.fe .ins .days label{display:inline-block;margin:4px 8px 0 0}
.fe pre{margin:0;max-height:220px;overflow:auto;padding:8px 12px;border-top:1px solid var(--divider-color);font-size:.8em}
.fe svg text{pointer-events:none;font-family:inherit}
.fe .nt{fill:#fff;font-size:13px;font-weight:600}.fe .ns{fill:#fff;font-size:11px;opacity:.85}
.fe .nv{fill:#ffe082;font-size:10px;font-style:italic}
.fe .node{cursor:move}.fe .node.sel .body{stroke:var(--primary-text-color);stroke-width:3}
.fe .port{fill:#fff;stroke:#444;stroke-width:2;cursor:crosshair}.fe .port:hover{fill:#ffca28}
.fe .wire{fill:none;stroke:#607d8b;stroke-width:3;cursor:pointer}.fe .wire:hover{stroke:#c62828}
.fe .node.active .body{stroke:#ffca28;stroke-width:4;filter:drop-shadow(0 0 8px #ffca28)}
.fe .node.active .port{animation:fe-pulse .8s ease-in-out infinite}
@keyframes fe-pulse{0%,100%{r:6}50%{r:10}}
.fe .wire.active{stroke:#ffca28;stroke-width:4;stroke-dasharray:8 6;animation:fe-flow .5s linear infinite}
@keyframes fe-flow{to{stroke-dashoffset:-14}}
.fe .plab{fill:#fff;font-size:10px}
.fe-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.fe-modal{background:var(--card-background-color);color:var(--primary-text-color);border-radius:8px;padding:16px 20px;max-width:360px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 4px 24px rgba(0,0,0,.3)}
.fe-modal h3{margin-top:0}
.fe-modal .modlist{display:flex;flex-direction:column;gap:4px;margin:10px 0}
.fe-modal .modrow{display:flex;align-items:center;gap:6px;font-size:.9em}
.fe-modal .cnt{opacity:.6;font-size:.85em}
.fe-modal .modbtns{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
`;

class FlowCraftEditor extends HTMLElement {
  constructor() {
    super();
    this._flows = []; this._cur = null; this._sel = null; this._drag = null; this._conn = null; this._timer = null;
    this._allowedIds = undefined; // undefined = noch nicht geladen, null = keine Einschraenkung (Registry fehlt), Set = aktiv
    this._registry = null; // rohe Entity-Registry (config/entity_registry/list)
    this._allPlatforms = []; // [{id, count}] alle in der Registry gefundenen Integrationen
    this._selectedPlatforms = null; // Set der vom Nutzer gewaehlten Integrationen
    this._selSet = new Set(); // Mehrfachauswahl von Node-IDs auf dem Canvas
    this._band = null; // Auswahlrahmen waehrend des Aufziehens (Rubber-Band-Select)
    this._clipboard = null; // {nodes, wires} fuer Kopieren/Einfuegen
    this._undoStacks = {}; // je Flow-ID ein Verlauf von {nodes, wires}-Schnappschuessen
  }
  setConfig(c) { this._config = c || {}; }
  getCardSize() { return 12; }
  set hass(h) {
    const first = !this._hass;
    const prev = this._hass;
    this._hass = h;
    if (first) { this._build(); this._load(); this._loadIntegrationsData(); }
    else {
      // Canvas nur neu zeichnen, wenn sich der Ist-Wert einer aktuell sichtbaren
      // Aktor-Entitaet (dritte Zeile im Node) tatsaechlich geaendert hat - nicht
      // bei jedem HA-Update irgendeiner der ~1950 Entitaeten neu rendern.
      const f = this._flow;
      if (f) {
        const ids = f.nodes.map((n) => nhEntity(n)).filter(Boolean);
        const changed = ids.some((id) => {
          const a = prev && prev.states[id], b = h.states[id];
          return (a ? a.state : undefined) !== (b ? b.state : undefined);
        });
        if (changed) this._render();
      }
    }
    this._checkVersion();
  }
  get _flow() { return this._flows.find((f) => f.id === this._cur); }

  // --- Auto-Update: Seite automatisch neu laden, wenn eine neue Kartenversion deployt wurde ---
  _checkVersion() {
    const s = this._hass.states[VERSION_ENTITY];
    const latest = s && String(s.state || '').trim();
    if (!latest || latest === VERSION) return;
    let seen = '';
    try { seen = sessionStorage.getItem(VERSION_SEEN_KEY) || ''; } catch (e) { /* ignore */ }
    if (seen === latest) return; // schon versucht, keine Reload-Schleife
    try { sessionStorage.setItem(VERSION_SEEN_KEY, latest); } catch (e) { /* ignore */ }
    location.reload();
  }

  // --- Aufbau ---
  _build() {
    this.innerHTML = `<ha-card><style>${CSS}</style><div class="fe">
      <div class="bar">
        <select id="flowSel"></select>
        <button id="bNew">+ Neuer Flow</button>
        <input id="fName" placeholder="Flow-Name">
        <label><input type="checkbox" id="fEn"> aktiv</label>
        <button id="bDeploy" class="pri">Deploy</button>
        <button id="bTest" title="Fuehrt die deployte Automation dieses einen Flows einmal aus (inkl. Falls/Dann-Pruefung mit den aktuellen echten Werten) - ohne extra Helfer, einfach zum Debuggen">▶ Test</button>
        <button id="bSim" title="Prueft alle Bedingungen dieses Flows mit den aktuellen Werten und zeigt Schritt fuer Schritt, was passieren wuerde - OHNE Geraete tatsaechlich zu schalten">🔍 Simulieren</button>
        <button id="bPrev">Vorschau</button>
        <button id="bDel">Flow loeschen</button>
        <button id="bInt" title="Welche Integrationen bei der Geraeteauswahl beruecksichtigt werden">⚙ Integrationen</button>
        <button id="bCopy" title="Ausgewaehlte Nodes kopieren (Strg+C)">⧉ Kopieren</button>
        <button id="bPaste" title="Einfuegen (Strg+V)">📋 Einfuegen</button>
        <button id="bUndo" title="Rueckgaengig (Strg+Z)">↶ Rueckgaengig</button>
        <span class="status" id="status"></span>
        <span class="ver" title="Kartenversion">v${VERSION}</span>
      </div>
      <div class="main"><div class="pal" id="pal"></div>
        <div class="cv" id="cv" tabindex="0"><svg id="svg" width="2400" height="1400"></svg></div>
        <div class="ins" id="ins"></div></div>
      <pre id="prev" hidden></pre></div></ha-card>`;
    const q = (id) => this.querySelector('#' + id);
    this._el = { sel: q('flowSel'), name: q('fName'), en: q('fEn'), pal: q('pal'), cv: q('cv'), svg: q('svg'), ins: q('ins'), prev: q('prev'), status: q('status') };
    this._renderPalette();
    this._el.pal.addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (b) this._addNode(b.dataset.add); });
    q('bNew').onclick = () => { const f = { id: 'f' + Date.now().toString(36), name: 'Neuer Flow', enabled: true, seq: 0, nodes: [], wires: [] }; this._flows.push(f); this._cur = f.id; this._sel = null; this._selSet = new Set(); this._refresh(); this._save(); };
    q('bDel').onclick = () => this._deleteFlow();
    q('bDeploy').onclick = () => this._deploy();
    q('bTest').onclick = () => this._testRun();
    q('bSim').onclick = () => this._simulate();
    q('bPrev').onclick = () => this._preview();
    q('bInt').onclick = () => this._openIntegrationsDialog();
    q('bCopy').onclick = () => this._copy();
    q('bPaste').onclick = () => this._paste();
    q('bUndo').onclick = () => this._undo();
    this._el.sel.onchange = () => { this._cur = this._el.sel.value; this._sel = null; this._selSet = new Set(); this._refresh(); };
    this._el.name.oninput = () => { this._flow.name = this._el.name.value; this._save(); this._fillSelect(); };
    this._el.en.onchange = () => { this._flow.enabled = this._el.en.checked; this._save(); };
    this._el.svg.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (this._mv = (e) => this._move(e)));
    window.addEventListener('pointerup', (this._up = (e) => this._end(e)));
    window.addEventListener('keydown', (this._key = (e) => this._onKey(e)));
    this._el.cv.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && this._selSet.size) this._removeSelected(); });
    this._el.ins.addEventListener('input', (e) => this._field(e));
    this._el.ins.addEventListener('change', (e) => this._field(e));
    this._el.ins.addEventListener('focusin', (e) => { if (e.target.matches('[data-k],[data-day]')) this._snapshot(); });
    this._el.ins.addEventListener('click', (e) => { if (e.target.id === 'delNode') { if (this._selSet.size > 1) this._removeSelected(); else this._removeNode(this._sel); } });
  }
  disconnectedCallback() { window.removeEventListener('pointermove', this._mv); window.removeEventListener('pointerup', this._up); window.removeEventListener('keydown', this._key); }

  // --- Tastenkuerzel: Rueckgaengig / Kopieren / Einfuegen ---
  _onKey(e) {
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target && e.target.tagName) || '');
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing) { e.preventDefault(); this._undo(); return; }
    if (meta && e.key.toLowerCase() === 'c' && !typing) { e.preventDefault(); this._copy(); return; }
    if (meta && e.key.toLowerCase() === 'v' && !typing) { e.preventDefault(); this._paste(); return; }
  }

  // --- Persistenz ---
  async _load() {
    let flows = null;
    try { const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: STORE_KEY }); flows = r && r.value && r.value.flows; } catch (e) { /* ignore */ }
    if (!flows) { try { flows = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { /* ignore */ } }
    this._flows = flows && flows.length ? flows : [sampleFlow()];
    // Schutz gegen "verwaiste" Nodes: wenn ein Node-Typ zwischenzeitlich aus dem
    // Editor entfernt wurde (z.B. ein alter Test-Node), wuerde T[n.type] undefined
    // sein und beim Rendern (nh(), _outPos() usw.) zum kompletten Absturz des
    // Editors fuehren ("leerer/schwarzer" Editor). Solche Nodes samt ihren
    // Verbindungen hier beim Laden herausfiltern statt den Editor zu zerstoeren.
    let removed = 0;
    for (const f of this._flows) {
      if (!Array.isArray(f.nodes)) continue;
      const before = f.nodes.length;
      f.nodes = f.nodes.filter((n) => !!T[n.type]);
      removed += before - f.nodes.length;
      const ids = new Set(f.nodes.map((n) => n.id));
      if (Array.isArray(f.wires)) f.wires = f.wires.filter((w) => ids.has(w.from) && ids.has(w.to));
    }
    if (removed) { this._save(); this._say(`${removed} veraltete(r) Node(s) mit unbekanntem Typ entfernt (z.B. ein geloeschter Baustein) - Flow repariert.`, 1); }
    this._cur = this._flows[0].id;
    this._refresh();
  }
  _save() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      const value = { flows: this._flows };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(value.flows)); } catch (e) { /* ignore */ }
      try { await this._hass.callWS({ type: 'frontend/set_user_data', key: STORE_KEY, value }); } catch (e) { this._say('Speichern fehlgeschlagen: ' + (e.message || e), 1); }
    }, 500);
  }
  _say(t, err) { this._el.status.textContent = t; this._el.status.className = 'status' + (err ? ' err' : ''); }

  // --- Integrationsauswahl fuer die Entitaetsfilter ---
  async _loadIntegrationsData() {
    try {
      this._registry = await this._hass.callWS({ type: 'config/entity_registry/list' });
    } catch (e) {
      this._registry = null; // fail-open: keine Einschraenkung, wenn die Registry nicht geladen werden kann
    }
    let deviceReg = null;
    try {
      deviceReg = await this._hass.callWS({ type: 'config/device_registry/list' });
    } catch (e) { /* ignore: dann eben ohne Hersteller-Anzeige */ }
    let areaReg = null;
    try {
      areaReg = await this._hass.callWS({ type: 'config/area_registry/list' });
    } catch (e) { /* ignore: dann eben ohne Raum-Anzeige */ }
    const devById = {};
    if (deviceReg) for (const d of deviceReg) devById[d.id] = d;
    const areaById = {};
    if (areaReg) for (const a of areaReg) areaById[a.area_id] = a;
    // Je Entitaet: Integration (platform), Hersteller/Modell des zugehoerigen
    // Geraets sowie der Raum (Area) - fuer die Anzeige in der Entitaetsauswahl.
    // Der Raum kann direkt an der Entitaet gesetzt sein (area_id) und ueberschreibt
    // dann den Raum des Geraets, sonst gilt der Raum des zugehoerigen Geraets.
    this._entityMeta = {};
    if (this._registry) {
      for (const e of this._registry) {
        const dev = e.device_id && devById[e.device_id];
        const areaId = e.area_id || (dev && dev.area_id);
        const area = areaId && areaById[areaId] ? areaById[areaId].name : null;
        this._entityMeta[e.entity_id] = { platform: e.platform, manufacturer: dev && dev.manufacturer, model: dev && dev.model, area };
      }
    }
    const counts = {};
    if (this._registry) for (const e of this._registry) { if (e.platform) counts[e.platform] = (counts[e.platform] || 0) + 1; }
    this._allPlatforms = Object.entries(counts).map(([id, count]) => ({ id, count })).sort((a, b) => a.id.localeCompare(b.id, 'de'));
    await this._loadPlatformSelection();
    this._recomputeAllowed();
    this._renderPalette();
    this._renderIns();
  }
  _areaLabel(id) {
    const m = this._entityMeta && this._entityMeta[id];
    return (m && m.area) || '';
  }
  _integrationLabel(id) {
    const m = this._entityMeta && this._entityMeta[id];
    if (!m) return '';
    return m.manufacturer || m.platform || '';
  }
  async _loadPlatformSelection() {
    let sel = null;
    try { const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: PLATFORMS_KEY }); sel = r && r.value && r.value.platforms; } catch (e) { /* ignore */ }
    if (!sel) { try { sel = JSON.parse(localStorage.getItem(PLATFORMS_KEY) || 'null'); } catch (e) { /* ignore */ } }
    if (!sel) {
      // Noch keine eigene Auswahl gespeichert: Standardauswahl, aber nur soweit
      // diese Integrationen tatsaechlich vorhanden sind.
      const present = new Set(this._allPlatforms.map((p) => p.id));
      sel = DEFAULT_PLATFORMS.filter((p) => present.has(p));
    }
    this._selectedPlatforms = new Set(sel);
  }
  _savePlatforms() {
    const platforms = Array.from(this._selectedPlatforms);
    try { localStorage.setItem(PLATFORMS_KEY, JSON.stringify(platforms)); } catch (e) { /* ignore */ }
    this._hass.callWS({ type: 'frontend/set_user_data', key: PLATFORMS_KEY, value: { platforms } }).catch(() => { /* ignore */ });
  }
  _recomputeAllowed() {
    if (!this._registry || !this._selectedPlatforms) { this._allowedIds = null; return; } // fail-open
    this._allowedIds = new Set(this._registry.filter((e) => this._selectedPlatforms.has(e.platform)).map((e) => e.entity_id));
  }

  // --- Verfuegbarkeitspruefung pro Baustein: generisch ueber die "d"-Domain-Liste
  // der Pflicht-Entitaetsfelder eines Node-Typs, ohne Hardcodierung einzelner
  // Entitaeten (siehe domainHasEntity oben) - so funktioniert das auch auf
  // fremden HA-Installationen, auf denen FlowCraft spaeter laeuft.
  _typeAvailable(type) {
    const t = T[type];
    if (!t || !Array.isArray(t.fields)) return true;
    for (const f of t.fields) {
      if (f.t !== 'entity' || !f.r) continue; // nur Pflichtfelder mit Entitaetsauswahl pruefen
      if (!f.d || !f.d.length) continue; // kein Domain-Filter -> keine Einschraenkung moeglich
      if (!domainHasEntity(this._hass, f.d, f.dc)) return false;
    }
    return true;
  }
  _renderPalette() {
    const groups = { trigger: 'Ausloeser (Wenn)', cond: 'Bedingung (Falls)', action: 'Aktion (Dann)' };
    this._el.pal.innerHTML = Object.entries(groups).map(([cat, title]) => `<h4>${title}</h4>` +
      Object.entries(T).filter(([, t]) => t.cat === cat).map(([k, t]) => {
        const avail = this._typeAvailable(k);
        const attrs = avail ? '' : ' disabled title="Keine passende Integration/Entitaet fuer diesen Baustein in Home Assistant gefunden"';
        return `<button data-add="${k}" style="border-left-color:${t.color}"${attrs}>${t.icon} ${esc(t.label)}${avail ? '' : ' ⚠'}</button>`;
      }).join('')).join('');
  }
  _openIntegrationsDialog() {
    const sel = this._selectedPlatforms || new Set();
    const rows = this._allPlatforms.length
      ? this._allPlatforms.map((p) => `<label class="modrow" data-name="${esc(p.id.toLowerCase())}"><input type="checkbox" data-platform="${esc(p.id)}"${sel.has(p.id) ? ' checked' : ''}> ${esc(p.id)} <span class="cnt">(${p.count})</span></label>`).join('')
      : '<p style="opacity:.7">Keine Integrationen gefunden (Entity-Registry konnte nicht geladen werden, es werden derzeit alle Entitaeten angezeigt).</p>';
    const searchHtml = this._allPlatforms.length
      ? '<input type="text" id="intSearch" placeholder="Integration suchen …" style="width:100%;box-sizing:border-box;margin:6px 0 4px">'
      : '';
    const wrap = document.createElement('div');
    wrap.className = 'fe-modal-backdrop';
    wrap.innerHTML = `<div class="fe-modal">
      <h3>Integrationen fuer Geraeteauswahl</h3>
      <p style="opacity:.75;font-size:.9em;margin-top:-4px">Nur Entitaeten der hier angehakten Integrationen werden in den Auswahlfeldern (Bewegungsmelder, Geraet schalten, usw.) angeboten.</p>
      ${searchHtml}
      <div class="modlist">${rows}</div>
      <div class="modbtns"><button id="modClear">Alle loeschen</button><button id="modCancel">Abbrechen</button><button id="modApply" class="pri">Uebernehmen</button></div>
    </div>`;
    this.querySelector('.fe').appendChild(wrap);
    wrap.querySelector('#modCancel').onclick = () => wrap.remove();
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
    const clearBtn = wrap.querySelector('#modClear');
    if (clearBtn) clearBtn.onclick = () => { Array.from(wrap.querySelectorAll('[data-platform]')).forEach((i) => { i.checked = false; }); };
    const searchInput = wrap.querySelector('#intSearch');
    if (searchInput) {
      searchInput.oninput = () => {
        const q = searchInput.value.trim().toLowerCase();
        wrap.querySelectorAll('.modrow').forEach((row) => {
          row.style.display = !q || (row.dataset.name || '').includes(q) ? '' : 'none';
        });
      };
      searchInput.focus();
    }
    const applyBtn = wrap.querySelector('#modApply');
    if (applyBtn) applyBtn.onclick = () => {
      const checked = Array.from(wrap.querySelectorAll('[data-platform]')).filter((i) => i.checked).map((i) => i.dataset.platform);
      this._selectedPlatforms = new Set(checked);
      this._savePlatforms();
      this._recomputeAllowed();
      this._renderIns();
      wrap.remove();
    };
  }

  // --- Rueckgaengig (pro Flow) ---
  _snapshot() {
    const f = this._flow; if (!f) return;
    const st = this._undoStacks[f.id] || (this._undoStacks[f.id] = []);
    st.push(JSON.stringify({ nodes: f.nodes, wires: f.wires }));
    if (st.length > 50) st.shift();
  }
  _undo() {
    const f = this._flow; if (!f) return;
    const st = this._undoStacks[f.id];
    if (!st || !st.length) { this._say('Nichts zum Rueckgaengigmachen'); return; }
    const snap = JSON.parse(st.pop());
    f.nodes = snap.nodes; f.wires = snap.wires;
    this._sel = null; this._selSet = new Set();
    this._save(); this._render(); this._renderIns();
    this._say('Rueckgaengig gemacht');
  }

  // --- Kopieren / Einfuegen ---
  _copy() {
    const f = this._flow; if (!f || !this._selSet.size) return;
    const ids = this._selSet;
    const nodes = f.nodes.filter((n) => ids.has(n.id)).map((n) => JSON.parse(JSON.stringify(n)));
    if (!nodes.length) return;
    const wires = f.wires.filter((w) => ids.has(w.from) && ids.has(w.to)).map((w) => ({ ...w }));
    this._clipboard = { nodes, wires };
    this._say(`${nodes.length} Node(s) kopiert`);
  }
  _paste() {
    const f = this._flow; if (!f || !this._clipboard || !this._clipboard.nodes.length) return;
    this._snapshot();
    const idMap = {};
    const newNodes = this._clipboard.nodes.map((n) => {
      f.seq = (f.seq || 0) + 1;
      const nid = 'n' + f.seq;
      idMap[n.id] = nid;
      return { ...n, id: nid, x: n.x + 30, y: n.y + 30, cfg: JSON.parse(JSON.stringify(n.cfg || {})) };
    });
    const newWires = this._clipboard.wires.map((w) => ({ from: idMap[w.from], out: w.out, to: idMap[w.to] })).filter((w) => w.from && w.to);
    f.nodes.push(...newNodes);
    f.wires.push(...newWires);
    this._selSet = new Set(newNodes.map((n) => n.id));
    this._sel = newNodes.length === 1 ? newNodes[0].id : null;
    this._save(); this._render(); this._renderIns();
    this._say(`${newNodes.length} Node(s) eingefuegt`);
  }

  // --- Anzeige ---
  _fillSelect() { this._el.sel.innerHTML = this._flows.map((f) => `<option value="${esc(f.id)}"${f.id === this._cur ? ' selected' : ''}>${esc(f.name || f.id)}</option>`).join(''); }
  _refresh() {
    this._fillSelect();
    const f = this._flow;
    this._el.name.value = f ? f.name : ''; this._el.en.checked = !!(f && f.enabled);
    this._el.prev.hidden = true;
    this._activeNodeId = null; this._activePrevId = null; // laufende Simulations-Hervorhebung beim Flow-Wechsel zuruecksetzen
    this._render(); this._renderIns();
  }
  _outPos(n, o) { const h = nh(n); return [n.x + NW, n.y + (T[n.type] && T[n.type].cat === 'cond' ? [h * 0.3, h * 0.7][o] : h / 2)]; }
  _friendly(id) {
    if (!id) return '';
    const s = this._hass && this._hass.states[id];
    return s ? (s.attributes.friendly_name || id) : id;
  }
  // Liefert den aktuellen Ist-Wert einer Entitaet als kurzen, lesbaren Text
  // (fuer die dritte Zeile bei Aktor-Nodes auf dem Canvas), z.B. "An", "Aus",
  // "42 %" oder "unbekannt" - ohne HA-Verbindung/Entitaet leerer String.
  _actValue(id) {
    if (!id) return '';
    const s = this._hass && this._hass.states[id];
    if (!s) return '';
    const LABELS = { on: 'An', off: 'Aus', open: 'Offen', closed: 'Zu', unavailable: 'n. verf.', unknown: 'unbekannt', home: 'Zuhause', not_home: 'Abwesend' };
    const lbl = Object.prototype.hasOwnProperty.call(LABELS, s.state) ? LABELS[s.state] : s.state;
    const unit = (s.attributes && s.attributes.unit_of_measurement) || '';
    return unit ? `${lbl} ${unit}` : lbl;
  }
  _unit(id) {
    if (!id) return '';
    const s = this._hass && this._hass.states[id];
    return (s && s.attributes && s.attributes.unit_of_measurement) || '';
  }
  _platformStyle(id) {
    const m = this._entityMeta && this._entityMeta[id];
    if (!m) return null;
    if (m.manufacturer && /ikea/i.test(m.manufacturer)) return IKEA_STYLE;
    if (!m.platform) return null;
    if (PLATFORM_STYLE[m.platform]) return PLATFORM_STYLE[m.platform];
    // Keine fest hinterlegte Farbe fuer diese Integration: automatisch eine
    // eigene, aus dem Integrationsnamen errechnete Farbe vergeben, damit
    // wirklich jede Integration anders (aber konsistent) aussieht.
    return { color: `hsl(${hashHue(m.platform)}, 62%, 38%)`, icon: '●' };
  }
  _render() {
    const f = this._flow; if (!f) { this._el.svg.innerHTML = ''; return; }
    const byId = Object.fromEntries(f.nodes.map((n) => [n.id, n]));
    let h = '<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#9e9e9e" opacity=".5"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/>';
    const curve = (x1, y1, x2, y2) => `M${x1},${y1} C${x1 + 70},${y1} ${x2 - 70},${y2} ${x2},${y2}`;
    f.wires.forEach((w, i) => {
      const a = byId[w.from], b = byId[w.to]; if (!a || !b) return;
      const [x1, y1] = this._outPos(a, w.out || 0);
      // Waehrend "🔍 Simulieren" laeuft: die Verbindung, ueber die der gerade
      // aktive Node erreicht wurde, gelb mit laufender Strich-Animation zeigen.
      const activeWire = this._activeNodeId && w.to === this._activeNodeId && w.from === this._activePrevId;
      h += `<path class="wire${activeWire ? ' active' : ''}" data-wire="${i}" d="${curve(x1, y1, b.x, b.y + nh(b) / 2)}"><title>Klicken zum Loeschen</title></path>`;
    });
    if (this._conn) { const a = byId[this._conn.from]; const [x1, y1] = this._outPos(a, this._conn.out); h += `<path d="${curve(x1, y1, this._conn.x, this._conn.y)}" fill="none" stroke="#ff9800" stroke-width="3" stroke-dasharray="6"/>`; }
    for (const n of f.nodes) {
      const t = T[n.type]; if (!t) continue;
      const hh = nh(n), gap = catGap(n), showVal = nhShowsVal(n);
      // Sub-Text auf zwei Zeilen aufteilen: Node-Typen mit Entitaetsbezug
      // (siehe subParts()) trennen bewusst nach Sensor/Entitaet (Zeile 1) und
      // Vergleichswerten/Zustand (Zeile 2); alle anderen werden bei Bedarf an
      // einer Wortgrenze umgebrochen - so bleibt z.B. bei "Wert-Vergleich"
      // sowohl der Sensorname als auch die eingestellten Schwellwerte lesbar.
      const [subL1, subL2] = subParts(t, n.cfg || {}, (id) => this._friendly(id), 33);
      const subY1 = 19 + gap, subY2 = subY1 + LINE_H;
      // Titelzeile (Icon + Label) ebenfalls kuerzen, damit lange Node-Namen den
      // 220px breiten Rahmen nicht ueberragen (analog zur Sub-Text-Kuerzung oben).
      const ttl = t.label.length > 28 ? t.label.slice(0, 27) + '…' : t.label;
      // Waehrend "🔍 Simulieren" laeuft: den gerade abgearbeiteten Node gelb
      // umranden/leuchten lassen und seine Anschluss-Punkte pulsieren lassen.
      const isActive = n.id === this._activeNodeId;
      h += `<g class="node${this._selSet.has(n.id) ? ' sel' : ''}${isActive ? ' active' : ''}" data-id="${n.id}" transform="translate(${n.x},${n.y})">
        <rect class="body" width="${NW}" height="${hh}" rx="7" fill="${t.color}"/>
        <text class="nt" x="10" y="19">${t.icon} ${esc(ttl)}</text><text class="ns" x="10" y="${subY1}">${esc(subL1)}</text>${subL2 ? `<text class="ns" x="10" y="${subY2}">${esc(subL2)}</text>` : ''}`;
      // Dritte Zeile: aktueller Ist-Wert der Ziel-Entitaet bei Aktor-Nodes
      // (z.B. "Aktuell: An" / "Aktuell: 42 %"), damit man auf einen Blick sieht,
      // ob ein Geraet schon im Zielzustand ist, ohne den Node zu oeffnen.
      if (showVal) h += `<text class="nv" x="10" y="${hh - 9}">Aktuell: ${esc(this._actValue(nhEntity(n)) || '–')}</text>`;
      if (t.cat !== 'trigger') h += `<circle class="port" data-in="${n.id}" cx="0" cy="${hh / 2}" r="6"/>`;
      if (t.cat === 'cond') h += `<circle class="port" data-out="${n.id}" data-o="0" cx="${NW}" cy="${hh * 0.3}" r="6"/><circle class="port" data-out="${n.id}" data-o="1" cx="${NW}" cy="${hh * 0.7}" r="6"/><text class="plab" x="${NW - 30}" y="${hh * 0.3 + 3}">Ja</text><text class="plab" x="${NW - 38}" y="${hh * 0.7 + 3}">Nein</text>`;
      else h += `<circle class="port" data-out="${n.id}" data-o="0" cx="${NW}" cy="${hh / 2}" r="6"/>`;
      h += '</g>';
    }
    if (this._band) {
      const { x0, y0, x1, y1 } = this._band;
      const bx = Math.min(x0, x1), by = Math.min(y0, y1), bw = Math.abs(x1 - x0), bh = Math.abs(y1 - y0);
      h += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="rgba(33,150,243,.15)" stroke="#2196f3" stroke-dasharray="4"/>`;
    }
    this._el.svg.innerHTML = h;
  }
  _pt(e) { const r = this._el.cv.getBoundingClientRect(); return [e.clientX - r.left + this._el.cv.scrollLeft, e.clientY - r.top + this._el.cv.scrollTop]; }

  // --- Interaktion ---
  _down(e) {
    const f = this._flow; if (!f) return;
    const out = e.target.closest('[data-out]'), wire = e.target.closest('[data-wire]'), node = e.target.closest('.node');
    const [x, y] = this._pt(e);
    if (out) { this._conn = { from: out.dataset.out, out: Number(out.dataset.o), x, y }; e.preventDefault(); return; }
    if (wire) { this._snapshot(); f.wires.splice(Number(wire.dataset.wire), 1); this._save(); this._render(); return; }
    if (node) {
      const id = node.dataset.id;
      if (e.shiftKey) {
        if (this._selSet.has(id)) this._selSet.delete(id); else this._selSet.add(id);
        this._sel = this._selSet.size === 1 ? Array.from(this._selSet)[0] : null;
        this._render(); this._renderIns(); e.preventDefault(); return;
      }
      if (!this._selSet.has(id)) this._selSet = new Set([id]);
      this._sel = id;
      this._snapshot();
      const anchors = new Map();
      for (const nid of this._selSet) { const nn = f.nodes.find((k) => k.id === nid); if (nn) anchors.set(nid, { dx: x - nn.x, dy: y - nn.y }); }
      this._drag = { anchors };
      this._render(); this._renderIns(); this._el.cv.focus(); e.preventDefault(); return;
    }
    if (e.shiftKey) return; // Shift-Klick auf leere Flaeche: Auswahl unveraendert lassen
    this._band = { x0: x, y0: y, x1: x, y1: y };
    this._sel = null; this._selSet = new Set(); this._render(); this._renderIns();
  }
  _move(e) {
    if (!this._drag && !this._conn && !this._band) return;
    const [x, y] = this._pt(e), f = this._flow;
    if (this._drag) {
      for (const [id, a] of this._drag.anchors) {
        const n = f.nodes.find((k) => k.id === id); if (!n) continue;
        n.x = Math.max(0, Math.round((x - a.dx) / 10) * 10);
        n.y = Math.max(0, Math.round((y - a.dy) / 10) * 10);
      }
    }
    if (this._conn) { this._conn.x = x; this._conn.y = y; }
    if (this._band) { this._band.x1 = x; this._band.y1 = y; }
    this._render();
  }
  _end(e) {
    // Wichtig: this._up haengt am WINDOW (fuer Drag/Verbinden/Rahmen ausserhalb des
    // Canvas), feuert also bei JEDEM Loslassen der Maustaste irgendwo im Fenster -
    // auch z.B. beim Waehlen eines Eintrags in einem Entitaets-Dropdown im
    // Inspektor. Ohne diese Wache wurde unten IMMER _renderIns() aufgerufen und
    // damit der Inspektor (inkl. gerade geoeffnetem <select>) neu aufgebaut,
    // wodurch die native Auswahlliste mitten in der Auswahl verschwand ("Auswahl
    // springt weg"). Nur re-rendern, wenn tatsaechlich gezogen/verbunden/eine
    // Markierung aufgezogen wurde.
    if (!this._drag && !this._conn && !this._band) return;
    const f = this._flow;
    if (this._conn && f) {
      const el = this._el.svg.getRootNode().elementFromPoint(e.clientX, e.clientY), inp = el && el.closest && el.closest('[data-in]');
      const c = this._conn;
      if (inp && inp.dataset.in !== c.from && !f.wires.some((w) => w.from === c.from && (w.out || 0) === c.out && w.to === inp.dataset.in)) {
        this._snapshot();
        f.wires.push({ from: c.from, out: c.out, to: inp.dataset.in }); this._save();
      }
    }
    if (this._drag) this._save();
    if (this._band && f) {
      const { x0, y0, x1, y1 } = this._band;
      const bx0 = Math.min(x0, x1), bx1 = Math.max(x0, x1), by0 = Math.min(y0, y1), by1 = Math.max(y0, y1);
      if (bx1 - bx0 > 4 || by1 - by0 > 4) {
        const sel = new Set();
        for (const n of f.nodes) { const hh = nh(n); if (n.x < bx1 && n.x + NW > bx0 && n.y < by1 && n.y + hh > by0) sel.add(n.id); }
        this._selSet = sel;
        this._sel = sel.size === 1 ? Array.from(sel)[0] : null;
      }
    }
    this._drag = null; this._conn = null; this._band = null; this._render(); this._renderIns();
  }
  _addNode(type) {
    const f = this._flow; if (!f) return;
    this._snapshot();
    f.seq = (f.seq || 0) + 1;
    const cv = this._el.cv, cfg = {};
    T[type].fields.forEach((fl) => { if (fl.v !== undefined) cfg[fl.k] = fl.v; });
    const off = (f.nodes.length % 8) * 20;
    const n = { id: 'n' + f.seq, type, x: Math.round((cv.scrollLeft + 60 + off) / 10) * 10, y: Math.round((cv.scrollTop + 60 + off) / 10) * 10, cfg };
    f.nodes.push(n); this._sel = n.id; this._selSet = new Set([n.id]); this._save(); this._render(); this._renderIns();
  }
  _removeNode(id) {
    const f = this._flow; if (!f) return;
    this._snapshot();
    f.nodes = f.nodes.filter((n) => n.id !== id); f.wires = f.wires.filter((w) => w.from !== id && w.to !== id);
    this._selSet.delete(id);
    this._sel = null; this._save(); this._render(); this._renderIns();
  }
  _removeSelected() {
    const f = this._flow; if (!f || !this._selSet.size) return;
    this._snapshot();
    const ids = this._selSet;
    f.nodes = f.nodes.filter((n) => !ids.has(n.id)); f.wires = f.wires.filter((w) => !ids.has(w.from) && !ids.has(w.to));
    this._sel = null; this._selSet = new Set();
    this._save(); this._render(); this._renderIns();
  }

  // --- Inspektor ---
  _entityIds(domains, deviceClasses, skipAllowed) {
    return Object.keys(this._hass.states).filter((id) => {
      if (domains && !domains.includes(dom(id))) return false;
      if (deviceClasses) {
        const s = this._hass.states[id];
        if (!deviceClasses.includes((s.attributes || {}).device_class)) return false;
      }
      // sun.sun gehoert zu keiner Integration (kein Eintrag in der Entity-Registry) und
      // wird u.a. bei "Wert-Vergleich" fuer Sonnenhoehen-Vergleiche genutzt - daher vom
      // Integrationen-Filter ausnehmen, sonst wuerde es dort einfach verschwinden.
      if (!skipAllowed && this._allowedIds && dom(id) !== 'sun' && !HELPER_DOMAINS.includes(dom(id)) && !this._allowedIds.has(id)) return false;
      return true;
    }).sort();
  }
  _renderIns() {
    const f = this._flow;
    if (this._selSet.size > 1) {
      this._el.ins.innerHTML = `<p>${this._selSet.size} Nodes ausgewaehlt.</p><button id="delNode">Ausgewaehlte loeschen</button><p style="opacity:.7;font-size:.85em;margin-top:14px">Kopieren: Strg+C oder „⧉ Kopieren“.<br>Einfuegen: Strg+V oder „📋 Einfuegen“.<br>Rueckgaengig: Strg+Z oder „↶ Rueckgaengig“.</p>`;
      return;
    }
    const n = f && f.nodes.find((k) => k.id === this._sel);
    if (!n) { this._el.ins.innerHTML = '<p style="opacity:.7">Node waehlen oder links einen neuen hinzufuegen.<br><br>Verbinden: vom runden Ausgang rechts zum Eingang links ziehen.<br>Mehrere Nodes markieren: Shift-Klick oder Rahmen mit der Maus aufziehen.<br>Markierte Nodes gemeinsam verschieben: ziehen.<br>Verbindung loeschen: anklicken.<br>Node(s) loeschen: Entf-Taste.<br>Kopieren/Einfuegen: Strg+C / Strg+V.<br>Rueckgaengig: Strg+Z.</p>'; return; }
    const t = T[n.type], c = n.cfg || (n.cfg = {});
    let h = `<h3>${t.icon} ${esc(t.label)}</h3>`;
    t.fields.forEach((fl) => {
      const v = c[fl.k] ?? fl.v ?? '';
      // unitFrom: zeigt hinter dem Feldnamen die Einheit der aktuell im Feld
      // 'entity' (o.ae.) gewaehlten Sensor-Entitaet an, z.B. "Ueber (W)" statt
      // nur "Ueber" - damit klar ist, in welcher Einheit der Wert einzugeben ist.
      let labelText = fl.l;
      if (fl.unitFrom) {
        const u = this._unit(c[fl.unitFrom]);
        if (u) labelText += ` (${u})`;
      }
      h += `<label>${esc(labelText)}${fl.r ? ' *' : ''}</label>`;
      if (fl.t === 'select') h += `<select data-k="${fl.k}">${fl.o.map(([val, lab]) => `<option value="${esc(val)}"${String(v) === val ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
      else if (fl.t === 'days') h += `<div class="days">${DAYS.map(([d, l]) => `<label><input type="checkbox" data-day="${d}"${(c.days || fl.v).includes(d) ? ' checked' : ''}> ${l}</label>`).join('')}</div>`;
      else if (fl.t === 'entity') {
        const skipInt = !fl.filterInt; // Integrationen-Filter nur fuer geraetespezifische Felder (Bewegungsmelder, Helligkeitssensor, Taste, Geraet schalten)
        let ids = this._entityIds(fl.d, fl.dc, skipInt);
        let note = '';
        if (fl.dc && !ids.length) {
          ids = this._entityIds(fl.d, undefined, skipInt);
          if (ids.length) note = '<div class="hint">Keine Entitaet mit passender Geraeteklasse gefunden, zeige alle passenden Domains der ausgewaehlten Integrationen.</div>';
        }
        if (fl.filterInt) {
          if (!ids.length && this._allowedIds instanceof Set) {
            note = '<div class="hint">Keine passende Entitaet in den ausgewaehlten Integrationen gefunden. Ueber „⚙ Integrationen“ oben laesst sich die Auswahl erweitern.</div>';
          } else if (this._allowedIds === null) {
            note += '<div class="hint">Hinweis: Integrations-Filter konnte nicht geladen werden, zeige alle Entitaeten.</div>';
          }
        }
        const opts = ids.map((id) => [id, this._friendly(id), this._integrationLabel(id), this._unit(id), this._platformStyle(id), this._areaLabel(id)]);
        if (v && !ids.includes(v)) opts.unshift([v, `${this._friendly(v)} (nicht gefunden)`, this._integrationLabel(v), this._unit(v), this._platformStyle(v), this._areaLabel(v)]);
        // Zuerst nach Hersteller/Integration gruppieren (als <optgroup>), innerhalb
        // einer Gruppe alphabetisch nach Name; Entitaeten ohne bekannten Hersteller
        // landen in einer eigenen Gruppe.
        const byBadge = new Map();
        for (const opt of opts) {
          const key = opt[2] || 'Ohne Integration';
          if (!byBadge.has(key)) byBadge.set(key, []);
          byBadge.get(key).push(opt);
        }
        const badgeKeys = Array.from(byBadge.keys()).sort((a, b) => a.localeCompare(b, 'de'));
        for (const bk of badgeKeys) byBadge.get(bk).sort((a, b) => a[1].localeCompare(b[1], 'de'));
        const optionsHtml = badgeKeys.map((bk) => {
          const items = byBadge.get(bk).map(([id, lab, badge, unit, style, area]) => {
            const labU = unit ? `${lab} (${unit})` : lab;
            // Raum in eckigen Klammern hinter den Namen (bzw. hinter die Einheit),
            // damit auf einen Blick erkennbar ist, in welchem Zimmer die Entitaet
            // steht - Entitaeten ohne zugewiesenen Raum bleiben ohne Zusatz.
            const labA = area ? `${labU} [${area}]` : labU;
            const icon = style ? style.icon + ' ' : '';
            const colorAttr = style ? ` style="color:${style.color}"` : '';
            return `<option value="${esc(id)}"${id === v ? ' selected' : ''}${colorAttr}>${esc(icon + labA)}</option>`;
          }).join('');
          return `<optgroup label="${esc(bk)}">${items}</optgroup>`;
        }).join('');
        h += `<select data-k="${fl.k}"><option value="">- waehlen -</option>${optionsHtml}</select>${note}<div class="hint" data-hint="${fl.k}">${this._hintFor(v)}</div>`;
      }
      else if (fl.t === 'notify_service') {
        // Listet die verfuegbaren notify.* Dienste (z.B. Mobile-App-Geraete) dynamisch
        // aus den HA-Services, statt den Dienstnamen von Hand eintippen zu lassen.
        const all = (this._hass.services && this._hass.services.notify) ? Object.keys(this._hass.services.notify) : [];
        const svcs = all.filter((s) => s !== 'notify' && s !== 'persistent_notification' && s !== 'send_message').sort();
        const note = svcs.length ? '' : '<div class="hint">Keine Push-Dienste gefunden. In HA unter Mobile App / Companion App einrichten.</div>';
        const optionsHtml = svcs.map((s) => `<option value="${esc(s)}"${s === v ? ' selected' : ''}>${esc(s)}</option>`).join('');
        h += `<select data-k="${fl.k}"><option value="">- waehlen -</option>${optionsHtml}</select>${note}`;
      }
      else h += `<input data-k="${fl.k}" type="${fl.t === 'number' ? 'number' : fl.t === 'time' ? 'time' : 'text'}" value="${esc(v)}">`;
    });
    h += '<br><br><button id="delNode">Node loeschen</button>';
    this._el.ins.innerHTML = h;
    t.fields.forEach((fl) => { if (fl.v !== undefined && c[fl.k] === undefined) c[fl.k] = fl.v; });
  }
  _hintFor(id) {
    const s = this._hass.states[id]; if (!s) return '';
    const a = s.attributes || {};
    let h = `${esc(a.friendly_name || id)} - aktuell: ${esc(s.state)}${a.unit_of_measurement ? ' ' + esc(a.unit_of_measurement) : ''}`;
    const badge = this._integrationLabel(id);
    if (badge) h += ` | Integration: ${esc(badge)}`;
    const area = this._areaLabel(id);
    if (area) h += ` | Raum: ${esc(area)}`;
    if (Array.isArray(a.event_types)) h += ` | Ereignisse: ${esc(a.event_types.join(', '))}`;
    if (Array.isArray(a.options)) h += ` | Werte: ${esc(a.options.join(', '))}`;
    return h;
  }
  _field(e) {
    const f = this._flow, n = f && f.nodes.find((k) => k.id === this._sel); if (!n) return;
    const t = e.target, c = n.cfg || (n.cfg = {});
    let entityChanged = false;
    if (t.dataset.day) c.days = Array.from(this._el.ins.querySelectorAll('[data-day]')).filter((i) => i.checked).map((i) => i.dataset.day);
    else if (t.dataset.k) {
      c[t.dataset.k] = t.value;
      const hint = this._el.ins.querySelector(`[data-hint="${t.dataset.k}"]`); if (hint) hint.innerHTML = this._hintFor(t.value);
      const fl = T[n.type].fields.find((x) => x.k === t.dataset.k);
      entityChanged = fl && fl.t === 'entity';
    } else return;
    this._save(); this._render();
    // Wenn eine Sensor-Entitaet gewaehlt wurde, den Inspektor neu aufbauen, damit
    // Felder mit unitFrom (z.B. "Ueber (W)"/"Unter (W)") sofort die Einheit der
    // neu gewaehlten Entitaet anzeigen.
    if (entityChanged) this._renderIns();
  }

  // --- Deploy ---
  _preview() {
    const f = this._flow, p = this._el.prev, v = validate(f);
    try { p.textContent = JSON.stringify(compileFlow(f), null, 2) + (v.warnings.length ? '\n\nHinweise:\n- ' + v.warnings.join('\n- ') : '') + (v.errors.length ? '\n\nFehler:\n- ' + v.errors.join('\n- ') : ''); } catch (err) { p.textContent = 'Fehler: ' + err.message; }
    p.hidden = !p.hidden;
  }
  // Setzt per WebSocket-Befehl "homeassistant/expose_entity" die Sprachassistenten-
  // Freigabe (Einstellungen -> Sprachassistenten -> Alexa) fuer die uebergebenen
  // Entitaeten - genau das, was man sonst manuell als Schieberegler pro Entitaet
  // umlegen wuerde. Nur relevant, wenn Home Assistant Cloud (Nabu Casa) + Alexa
  // ueberhaupt eingerichtet sind; ist das nicht der Fall, schlaegt der Aufruf
  // fehl und wird stillschweigend ignoriert (Skript bleibt trotzdem nutzbar,
  // nur eben nicht automatisch bei Alexa freigegeben).
  async _setAlexaExposed(entityIds, expose) {
    if (!entityIds.length || typeof this._hass.callWS !== 'function') return;
    try { await this._hass.callWS({ type: 'homeassistant/expose_entity', assistants: ['cloud.alexa'], entity_ids: entityIds, should_expose: expose }); } catch (e) { /* Cloud/Alexa nicht eingerichtet o.ae. - ignorieren */ }
  }
  async _deploy() {
    const f = this._flow, v = validate(f);
    if (v.errors.length) { this._say(v.errors[0], 1); return; }
    let result;
    try { result = compileFlow(f); } catch (err) { this._say(err.message, 1); return; }
    try {
      this._say('Deploy laeuft ...');
      if (result.automation) await this._hass.callApi('POST', 'config/automation/config/' + result.automation.id, result.automation);
      // Jeder Alexa-Sprachbefehl-Node wird als eigenstaendiges HA-Skript deployt
      // (siehe compileFlow) - Alexa kann Skripte direkt per Namen ansprechen,
      // ganz ohne Helfer oder manuell angelegte Routine.
      for (const s of result.scripts) await this._hass.callApi('POST', 'config/script/config/' + s.id, s.cfg);
      // Alexa-Sprachbefehl-Nodes, die seit dem letzten Deploy aus dem Flow entfernt
      // (oder von ihrer Aktionskette abgehaengt) wurden: zugehoeriges Skript wieder
      // entfernen und die Alexa-Freigabe zurueknehmen, damit keine verwaisten
      // Eintraege liegen bleiben.
      const curIds = result.scripts.map((s) => s.nodeId);
      const removedIds = (f.deployedAlexaIds || []).filter((id) => !curIds.includes(id));
      for (const id of removedIds) {
        await this._setAlexaExposed(['script.flowcraft_alexa_' + id], false);
        try { await this._hass.callApi('DELETE', 'config/script/config/flowcraft_alexa_' + id); } catch (e) { /* bereits weg */ }
      }
      if (result.automation) await this._hass.callService('automation', 'reload');
      if (result.scripts.length || removedIds.length) await this._hass.callService('script', 'reload');
      // Neue/aktualisierte Alexa-Skripte automatisch bei Alexa freigeben (entspricht
      // dem manuellen Schieberegler unter Einstellungen -> Sprachassistenten ->
      // Alexa). Ersetzt NICHT das einmalige "Alexa, entdecke Geraete neu" fuer
      // Skripte, die Alexa noch nie zuvor gemeldet wurden - das kann nur von
      // Alexa-Seite (Sprachbefehl oder App) ausgeloest werden, nicht von HA aus.
      if (result.scripts.length) await this._setAlexaExposed(result.scripts.map((s) => 'script.' + s.id), true);
      await sleep(1500);
      if (result.automation) {
        const st = Object.values(this._hass.states).find((s) => s.entity_id.startsWith('automation.') && s.attributes.id === result.automation.id);
        if (st) await this._hass.callService('automation', f.enabled ? 'turn_on' : 'turn_off', { entity_id: st.entity_id });
      }
      f.deployedAlexaIds = curIds;
      f.deployedAt = new Date().toISOString(); this._save();
      const t = new Date().toLocaleTimeString('de-DE');
      const scriptNote = result.scripts.length ? ` - ${result.scripts.length} Alexa-Skript(e) aktualisiert und bei Alexa freigegeben (erscheint bei Alexa idR. automatisch, wie bei neuen Matter-Geraeten - taucht es nach ein paar Minuten nicht auf: einmalig „Alexa, entdecke Geraete neu“ sagen)` : '';
      const removedNote = removedIds.length ? ` - ${removedIds.length} entfernte(s) Alexa-Skript(e) geloescht und Alexa-Freigabe zurueckgenommen` : '';
      this._say(`Deployed ${t}${scriptNote}${removedNote}${v.warnings.length ? ' (' + v.warnings.length + ' Hinweis/e, siehe Vorschau)' : ''}`);
    } catch (err) { this._say('Deploy fehlgeschlagen: ' + ((err && (err.body && err.body.message || err.message)) || err), 1); }
  }
  // Fuehrt die bereits deployte Automation bzw. alle Alexa-Skripte dieses Flows
  // einmal manuell aus - ganz ohne extra Helfer oder Test-Node im Flow.
  // skip_condition:false sorgt bei der Automation dafuer, dass dabei alle
  // Bedingungen (Falls/Dann) ganz normal mit den aktuellen echten Werten geprueft
  // werden, genau wie bei einem echten Ausloeser - praktisch zum Debuggen per Knopfdruck.
  async _testRun() {
    const f = this._flow;
    if (!f) return;
    let result = null;
    try { result = compileFlow(f); } catch (e) { /* ignore - unten wird trotzdem nach bereits deployten Entitaeten gesucht */ }
    const autoSt = Object.values(this._hass.states).find((s) => s.entity_id.startsWith('automation.') && s.attributes.id === 'flowcraft_' + f.id);
    const scriptEnts = (result && result.scripts || []).map((s) => 'script.' + s.id).filter((id) => this._hass.states[id]);
    if (!autoSt && !scriptEnts.length) { this._say('Bitte zuerst „Deploy" klicken, danach kann getestet werden.', 1); return; }
    try {
      this._say('Test laeuft ...');
      if (autoSt) await this._hass.callService('automation', 'trigger', { entity_id: autoSt.entity_id, skip_condition: false });
      for (const id of scriptEnts) await this._hass.callService('script', 'turn_on', { entity_id: id });
      const t = new Date().toLocaleTimeString('de-DE');
      this._say(`Test ausgefuehrt ${t} - Bedingungen wurden mit den aktuellen echten Werten geprueft.`);
    } catch (err) { this._say('Test fehlgeschlagen: ' + ((err && (err.body && err.body.message || err.message)) || err), 1); }
  }
  // Simuliert diesen einen Flow mit den aktuellen echten hass.states, OHNE dabei
  // irgendeinen Service (Geraet schalten, Benachrichtigung, usw.) tatsaechlich
  // aufzurufen - zeigt stattdessen Schritt fuer Schritt in der Vorschau, welchen
  // Weg der Flow nehmen wuerde (z.B. "Ist es dunkel? -> JA -> Geraet schalten ->
  // Verzoegerung -> Geraet schalten"). Nuetzlich, um vor einem echten Test zu
  // pruefen, ob die Bedingungen wie erwartet auswerten.
  // Liefert je erreichtem Node ein {id, text}-Objekt (statt nur Text), damit
  // _simulate() beim Abspielen weiss, WELCHER Node gerade auf dem Canvas
  // hervorgehoben werden soll.
  _outsTrace(id, o, path) {
    const f = this._flow;
    return f.wires.filter((w) => w.from === id && (w.out || 0) === o)
      .map((w) => f.nodes.find((n) => n.id === w.to)).filter(Boolean)
      .flatMap((n) => this._buildTrace(n, path));
  }
  _buildTrace(n, path) {
    const t = T[n.type]; if (!t) return [];
    if (path.includes(n.id)) return [{ id: n.id, text: `⚠️ Schleife erkannt bei „${t.label}“ - Simulation an dieser Stelle abgebrochen` }];
    const p = path.concat(n.id), c = n.cfg || {}, L = (id) => this._friendly(id);
    if (t.wrapRepeat) {
      const count = num(c.count) || 1;
      return [{ id: n.id, text: `${t.icon} ${t.label}: wuerde ${count}x wiederholen (Inhalt wird hier nur 1x simuliert)` }, ...this._outsTrace(n.id, 0, p)];
    }
    if (t.cat === 'cond') {
      const res = evalConditionLocal(t.cond(c), this._hass);
      const line = `${t.icon} ${t.label} (${subFlat(t, c, L)}) — ${res.detail} → ${res.ok ? 'JA' : 'NEIN'}${res.approx ? ' (naeherungsweise/angenommen)' : ''}`;
      return [{ id: n.id, text: line }, ...this._outsTrace(n.id, res.ok ? 0 : 1, p)];
    }
    const act = t.act(c);
    return [{ id: n.id, text: `${t.icon} ${t.label} (${subFlat(t, c, L)}) — wuerde ausgefuehrt [SIMULIERT, nicht gesendet]: ${JSON.stringify(act)}` }, ...this._outsTrace(n.id, 0, p)];
  }
  // Spielt die Simulation Schritt fuer Schritt ab: pro erreichtem Node wird
  // dieser (samt der Verbindung, ueber die er erreicht wurde) auf dem Canvas
  // gelb hervorgehoben/animiert (siehe _render()/CSS .active), waehrend
  // parallel der Text-Trace darunter waechst - danach kurze Pause, dann
  // weiter zum naechsten Node. Am Ende wird die Hervorhebung entfernt.
  async _simulate() {
    if (this._simRunning) return; // keine zwei Simulationen gleichzeitig
    const f = this._flow, v = validate(f);
    if (v.errors.length) { this._say(v.errors[0], 1); return; }
    const triggers = f.nodes.filter((n) => T[n.type] && T[n.type].cat === 'trigger');
    if (!triggers.length) { this._say('Kein Ausloeser vorhanden', 1); return; }
    this._simRunning = true;
    this._el.prev.hidden = false;
    let out = `Simulation von „${f.name}“ (${new Date().toLocaleTimeString('de-DE')}) - es wird NICHTS an Geraete gesendet:\n`;
    this._el.prev.textContent = out;
    this._say('Simulation laeuft ... (Ablauf wird auf dem Canvas animiert)');
    try {
      for (const tr of triggers) {
        const t = T[tr.type];
        out += `\n=== Ausloeser: ${t.icon} ${t.label} (${subFlat(t, tr.cfg || {}, (id) => this._friendly(id))}) ===\n`;
        this._el.prev.textContent = out;
        this._activeNodeId = tr.id; this._activePrevId = null; this._render();
        await sleep(700);
        const steps = this._outsTrace(tr.id, 0, [tr.id]);
        if (!steps.length) { out += '(nicht verbunden)\n'; this._el.prev.textContent = out; }
        let prevId = tr.id;
        for (let i = 0; i < steps.length; i++) {
          const st = steps[i];
          this._activeNodeId = st.id; this._activePrevId = prevId; this._render();
          out += `${i + 1}. ${st.text}\n`;
          this._el.prev.textContent = out;
          this._el.prev.scrollTop = this._el.prev.scrollHeight;
          await sleep(900);
          prevId = st.id;
        }
      }
      this._say('Simulation abgeschlossen - keine Aktoren angesprochen (siehe Vorschau unten)');
    } finally {
      this._activeNodeId = null; this._activePrevId = null; this._render();
      this._simRunning = false;
    }
  }
  async _deleteFlow() {
    const f = this._flow; if (!f || !confirm(`Flow „${f.name}“ und die zugehoerige Automation/Skripte loeschen?`)) return;
    try { await this._hass.callApi('DELETE', 'config/automation/config/flowcraft_' + f.id); } catch (e) { /* nie deployed */ }
    // Jeden per Alexa-Sprachbefehl-Node deployten Skript-Eintrag mit entfernen,
    // damit beim Loeschen eines Flows keine verwaisten Alexa-Skripte zurueckbleiben.
    for (const n of f.nodes) {
      if (T[n.type] && T[n.type].asScript) {
        await this._setAlexaExposed(['script.flowcraft_alexa_' + n.id], false);
        try { await this._hass.callApi('DELETE', 'config/script/config/flowcraft_alexa_' + n.id); } catch (e) { /* nie deployed */ }
      }
    }
    try { await this._hass.callService('automation', 'reload'); } catch (e) { /* ignore */ }
    try { await this._hass.callService('script', 'reload'); } catch (e) { /* ignore */ }
    this._flows = this._flows.filter((x) => x.id !== f.id);
    if (!this._flows.length) this._flows.push({ id: 'f' + Date.now().toString(36), name: 'Neuer Flow', enabled: true, seq: 0, nodes: [], wires: [] });
    this._cur = this._flows[0].id; this._sel = null; this._selSet = new Set(); this._save(); this._refresh();
  }
}

if (!customElements.get('flowcraft-editor')) customElements.define('flowcraft-editor', FlowCraftEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'flowcraft-editor', name: 'FlowCraft', description: 'Node-RED-artiger Flow-Editor, erzeugt HA-Automationen' });
