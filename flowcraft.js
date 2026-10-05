// ============================================================
// FlowCraft - a Node-RED-style visual flow editor for Home Assistant
// https://github.com/robine2006/ha-flowcraft
// Version: 0.9.46
// License: MIT (see LICENSE)
// Full changelog: see CHANGELOG.md
// ============================================================


const pad = (n) => String(n).padStart(2, '0');
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? undefined : Number(v));
const dom = (e) => String(e || '').split('.')[0];
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
const VERSION = '0.9.46';
const DEFAULT_PLATFORMS = ['matter', 'homematicip_local'];
const PLATFORMS_KEY = 'flowcraft_platforms';
const VERSION_ENTITY = 'input_text.flowcraft_version';
const VERSION_SEEN_KEY = 'flowcraft_reload_seen';
const ACT_DOMAINS = ['switch', 'light', 'input_boolean', 'fan', 'climate', 'media_player', 'script', 'automation', 'humidifier', 'siren', 'valve'];
const HELPER_DOMAINS = ['input_number', 'input_text', 'input_select', 'input_boolean', 'input_datetime', 'input_button', 'timer', 'counter'];
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
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  let hue = h % 360;
  if (hue > 40 && hue < 65) hue = (hue + 90) % 360;
  return hue;
}
const devOf = (c, e) => {
  const d = (c.dev && c.dev[e]) || {};
  return { op: d.op || c.op || 'turn_on', bri: num(d.brightness) !== undefined ? num(d.brightness) : num(c.brightness) };
};
const devAct = (c, e) => {
  const { op, bri } = devOf(c, e), a = { action: `${dom(e)}.${op}`, target: { entity_id: e } };
  if (dom(e) === 'light' && op === 'turn_on' && bri !== undefined) a.data = { brightness_pct: bri };
  return a;
};
const OP_LBL = { turn_on: 'AN', turn_off: 'AUS', toggle: 'UM' };
const T = {
  trig_motion: {
    cat: 'trigger', label: 'Bewegung', icon: '🚶', color: '#2e7d32',
    fields: [
      { k: 'entity', l: 'Bewegungsmelder', t: 'entity', d: ['binary_sensor'], dc: ['motion', 'occupancy', 'presence'], filterInt: true, r: 1 },
      { k: 'to', l: 'Ausloesen bei', t: 'select', o: [['on', 'Bewegung erkannt'], ['off', 'Bewegung beendet']], v: 'on' },
      { k: 'for', l: 'Fuer mindestens (Sek.)', t: 'number' },
    ],
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
  trig_ha_start: {
    cat: 'trigger', label: 'Home Assistant startet', icon: '🚀', color: '#2e7d32',
    fields: [],
    sub: () => 'beim Start von HA',
    trig: () => ({ trigger: 'homeassistant', event: 'start' }),
  },
  trig_script: {
    cat: 'trigger', label: 'Teilablauf (Start)', icon: '🧱', color: '#2e7d32', asSub: true,
    fields: [
      { k: 'name', l: 'Name des Teilablaufs', t: 'text', r: 1, hint: 'Wird als Skript "Teilablauf: <Name>" angelegt und ist danach in jedem Flow ueber "Skript ausfuehren" waehlbar.' },
    ],
    sub: (c) => c.name || '',
  },
  trig_alexa_switch: {
    cat: 'trigger', label: 'Alexa-Schalter (An/Aus)', icon: '🔛', color: '#2e7d32',
    asSwitch: true, twoOut: true, outLabels: ['Ein', 'Aus'],
    fields: [
      { k: 'name', l: 'Name fuer Alexa (z.B. "Morgenlicht") - "Alexa, schalte <Name> an/aus" funktioniert direkt, ohne "aktiviere"', t: 'text', r: 1 },
    ],
    sub: (c) => c.name || '',
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
      { k: 'for', l: 'Seit mindestens (Min., optional)', t: 'number' },
    ],
    sub: (c, L) => [L(c.entity), `= ${c.state || ''}${num(c.for) ? `, seit ≥${c.for} min` : ''}`],
    cond: (c) => clean({ condition: 'state', entity_id: c.entity, state: String(c.state || '').split(',').map((s) => s.trim()).filter(Boolean), for: num(c.for) ? hms(num(c.for)) : undefined }),
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
    sub: (c, L) => [L(c.entity), `${OP_LBL[c.op || 'turn_on']}${(c.op || 'turn_on') === 'turn_on' && num(c.brightness) !== undefined ? ` (${c.brightness}%)` : ''}`],
    act: (c) => devAct(c, c.entity),
  },
  act_multi: {
    cat: 'action', label: 'Mehrere Geraete schalten', icon: '💡', color: '#e65100', multi: true,
    fields: [
      { k: 'entities', l: 'Geraete', t: 'entities', d: ACT_DOMAINS, filterInt: true, r: 1 },
      { k: 'op', l: 'Aktion', t: 'select', o: [['turn_on', 'Einschalten'], ['turn_off', 'Ausschalten'], ['toggle', 'Umschalten']], v: 'turn_on' },
      { k: 'brightness', l: 'Helligkeit % (nur Lichter, Einschalten)', t: 'number' },
    ],
    sub: (c, L) => {
      const e = c.entities || [];
      return [e.length ? L(e[0]) + (e.length > 1 ? ` +${e.length - 1}` : '') : '', OP_LBL[c.op || 'turn_on']];
    },
    act: (c) => (c.entities || []).map((e) => devAct(c, e)),
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
      { k: 'wait', l: 'Warten bis das Skript fertig ist?', t: 'select', o: [['no', 'Nein (parallel starten)'], ['yes', 'Ja (danach geht es weiter)']], v: 'no' },
    ],
    sub: (c, L) => [L(c.entity), c.wait === 'yes' ? 'wartet bis fertig' : ''],
    act: (c) => (c.wait === 'yes' ? { action: c.entity } : { action: 'script.turn_on', target: { entity_id: c.entity } }),
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
    if (t.wrapRepeat) {
      return [{ repeat: { count: num(c.count) || 1, sequence: seq(outs(n.id, 0), p) } }];
    }
    if (t.cat === 'cond') {
      const cond = t.cond(c), yes = seq(outs(n.id, 0), p), no = seq(outs(n.id, 1), p);
      if (yes.length) return [no.length ? { if: [cond], then: yes, else: no } : { if: [cond], then: yes }];
      if (no.length) return [{ if: [{ condition: 'not', conditions: [cond] }], then: no }];
      return [];
    }
    return [].concat(t.act(c)).concat(seq(outs(n.id, 0), p));
  };
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
  const autoBranches = allTriggerNodes
    .filter((n) => !T[n.type].asSwitch && !T[n.type].asSub)
    .map((tr) => ({ tr, steps: buildSteps(tr) }))
    .filter((b) => b.steps.length);
  const switchBranches = allTriggerNodes
    .filter((n) => T[n.type].asSwitch)
    .map((tr) => ({ tr, onSteps: seq(outs(tr.id, 0), [tr.id]), offSteps: seq(outs(tr.id, 1), [tr.id]) }))
    .filter((b) => b.onSteps.length || b.offSteps.length);
  const subs = allTriggerNodes
    .filter((n) => T[n.type].asSub)
    .map((tr) => ({ tr, steps: seq(outs(tr.id, 0), [tr.id]) }))
    .filter((b) => b.steps.length)
    .map((b) => ({ nodeId: b.tr.id, id: 'flowcraft_sub_' + flow.id + '_' + b.tr.id, cfg: { alias: 'Teilablauf: ' + ((b.tr.cfg || {}).name || b.tr.id), sequence: b.steps, mode: 'parallel' } }));
  if (!autoBranches.length && !switchBranches.length && !subs.length) throw new Error('Kein Ausloeser ist mit einer Aktion verbunden');
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
  const switches = switchBranches.map((b) => {
    const name = (b.tr.cfg || {}).name || 'Alexa-Schalter';
    return {
      nodeId: b.tr.id,
      name,
      onScript: { id: 'flowcraft_alexasw_on_' + flow.id + '_' + b.tr.id, cfg: { alias: name + ' - An', sequence: b.onSteps, mode: 'restart' } },
      offScript: { id: 'flowcraft_alexasw_off_' + flow.id + '_' + b.tr.id, cfg: { alias: name + ' - Aus', sequence: b.offSteps, mode: 'restart' } },
    };
  });
  return { automation, switches, subs };
}
function evalConditionLocal(cond, hass) {
  const st = (id) => (hass && hass.states ? hass.states[id] : undefined);
  switch (cond.condition) {
    case 'state': {
      const s = st(cond.entity_id);
      const val = s ? s.state : undefined;
      const wanted = Array.isArray(cond.state) ? cond.state : [cond.state];
      let ok = wanted.includes(val), extra = '';
      if (cond.for) {
        const [hh, mm, ss] = String(cond.for).split(':').map(Number);
        const need = hh * 3600 + mm * 60 + (ss || 0);
        const have = s && s.last_changed ? Math.round((Date.now() - Date.parse(s.last_changed)) / 1000) : 0;
        ok = ok && have >= need;
        extra = `, seit ${Math.floor(have / 60)} min`;
      }
      return { ok, detail: `aktuell: ${val ?? 'unbekannt'}${extra}`, approx: false };
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
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NW = 220;
const catGap = (n) => 16;
const multiOf = (n) => (T[n.type] && T[n.type].multi ? (Array.isArray(n.cfg && n.cfg.entities) ? n.cfg.entities : []) : null);
const nhBase = (n) => { const m = multiOf(n); return m ? 28 + catGap(n) * (1 + Math.max(1, m.length)) : 28 + catGap(n) * 2; };
const nhEntity = (n) => {
  const t = T[n.type];
  if (!t || !n.cfg) return undefined;
  if (t.cat !== 'action' && t.cat !== 'trigger' && t.cat !== 'cond') return undefined;
  if (n.cfg.entity) return n.cfg.entity;
  if (n.type === 'cond_multi' && n.cfg.entity1) return n.cfg.entity1;
  return undefined;
};
const nhShowsVal = (n) => !!nhEntity(n);
const nh = (n) => nhBase(n) + (nhShowsVal(n) ? catGap(n) : 0);
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
const trimLine = (str, maxLen) => {
  str = String(str ?? '');
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
};
const subParts = (t, c, L, maxLen) => {
  const r = t.sub(c, L);
  if (Array.isArray(r)) return [trimLine(r[0] || '', maxLen), trimLine(r[1] || '', maxLen)];
  return wrapSub(String(r ?? ''), maxLen);
};
const subFlat = (t, c, L) => {
  const r = t.sub(c, L);
  return Array.isArray(r) ? r.filter(Boolean).join(' ') : String(r ?? '');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STORE_KEY = 'flowcraft_flows';
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
.fe .node.miss .body{stroke:#ff1744;stroke-width:3;stroke-dasharray:6 3}
.fe .wm{font-size:14px}
.fe .info{font-size:.8em;opacity:.85}.fe .info.dirty{color:#e65100;opacity:1}.fe .info.warn{color:var(--error-color,#c62828);opacity:1}
.fe .chip{display:flex;align-items:center;gap:4px;margin:3px 0;font-size:.85em}.fe .chip span{flex:1;word-break:break-all}.fe .chip button{padding:0 6px}
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
    this._allowedIds = undefined;
    this._registry = null;
    this._allPlatforms = [];
    this._selectedPlatforms = null;
    this._selSet = new Set();
    this._band = null;
    this._clipboard = null;
    this._undoStacks = {};
    this._registryUnsubs = [];
    this._registryReloadTimer = null;
  }
  setConfig(c) { this._config = c || {}; }
  getCardSize() { return 12; }
  set hass(h) {
    const first = !this._hass;
    const prev = this._hass;
    this._hass = h;
    if (first) { this._build(); this._load(); this._loadIntegrationsData(); this._subscribeRegistry(); }
    else {
      const f = this._flow;
      if (f) {
        const ids = f.nodes.flatMap((n) => multiOf(n) || [nhEntity(n)]).filter(Boolean);
        const changed = ids.some((id) => {
          const a = prev && prev.states[id], b = h.states[id];
          return (a ? a.state : undefined) !== (b ? b.state : undefined);
        });
        if (changed) this._render();
      }
    }
    this._checkVersion();
    if (this._el && Date.now() - (this._infoAt || 0) > 5000) this._updInfo();
  }
  get _flow() { return this._flows.find((f) => f.id === this._cur); }
  _sig(f) { return JSON.stringify([f.name, !!f.enabled, f.nodes.map((n) => [n.id, n.type, Object.fromEntries(Object.entries(n.cfg || {}).filter(([k]) => k[0] !== '_'))]), f.wires]); }
  _missing(n) {
    const t = T[n.type], c = n.cfg || {}, out = [];
    if (!t || !this._hass) return out;
    for (const fl of t.fields) {
      if (fl.t !== 'entity' && fl.t !== 'entities') continue;
      for (const id of [].concat(c[fl.k] || [])) if (id && !this._hass.states[id]) out.push(id);
    }
    return out;
  }
  _updInfo() {
    const f = this._flow, el = this._el && this._el.info;
    this._infoAt = Date.now();
    if (!el) return;
    if (!f) { el.textContent = ''; return; }
    const parts = [];
    let cls = 'info';
    if (!f.deployedSig) parts.push('noch nicht deployt');
    else if (f.deployedSig !== this._sig(f)) { parts.push('● ungedeployte Aenderungen'); cls += ' dirty'; }
    else parts.push('✔ deployt' + (f.deployedAt ? ' ' + new Date(f.deployedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''));
    const ac = this._autoCache;
    let st = ac && ac.fid === f.id && this._hass.states[ac.ent];
    if (!st) {
      st = Object.values(this._hass.states).find((s) => s.entity_id.startsWith('automation.') && s.attributes.id === 'flowcraft_' + f.id);
      this._autoCache = st ? { fid: f.id, ent: st.entity_id } : null;
    }
    if (st && st.attributes.last_triggered) parts.push('zuletzt ausgeloest ' + new Date(st.attributes.last_triggered).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    const miss = f.nodes.reduce((a, n) => a + this._missing(n).length, 0);
    if (miss) { parts.push(`⚠ ${miss} fehlende Entitaet(en)`); cls += ' warn'; }
    el.className = cls; el.textContent = parts.join(' · ');
  }
  _export() {
    const f = this._flow; if (!f) return;
    const copy = JSON.parse(JSON.stringify(f));
    delete copy.deployedAt; delete copy.deployedSig; delete copy.deployedSwitchHelpers; delete copy.deployedSubs; delete copy.deployedAlexaV2;
    copy.nodes.forEach((n) => { if (n.cfg) delete n.cfg._helperEntity; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ flowEditor: VERSION, flow: copy }, null, 2)], { type: 'application/json' }));
    a.download = (f.name || 'flow').replace(/[^\w\-]+/g, '_') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this._say('Flow exportiert');
  }
  async _import(file) {
    try {
      const j = JSON.parse(await file.text()), src = j && (j.flow || j);
      if (!src || !Array.isArray(src.nodes) || !Array.isArray(src.wires)) throw new Error('keine gueltige Flow-Datei');
      const nodes = src.nodes.filter((n) => T[n.type]);
      const ids = new Set(nodes.map((n) => n.id));
      const f = { id: 'f' + Date.now().toString(36), name: (src.name || 'Import') + ' (Import)', enabled: false, seq: src.seq || nodes.length + 5, nodes, wires: src.wires.filter((w) => ids.has(w.from) && ids.has(w.to)) };
      f.nodes.forEach((n) => { if (n.cfg) delete n.cfg._helperEntity; });
      this._flows.push(f); this._cur = f.id; this._sel = null; this._selSet = new Set();
      this._refresh(); this._save();
      this._say(`Flow importiert (${nodes.length} Nodes, nicht aktiv - bitte pruefen und deployen)`);
    } catch (e) { this._say('Import fehlgeschlagen: ' + (e.message || e), 1); }
  }
  _checkVersion() {
    const s = this._hass.states[VERSION_ENTITY];
    const latest = s && String(s.state || '').trim();
    if (!latest || latest === VERSION) return;
    let seen = '';
    try { seen = sessionStorage.getItem(VERSION_SEEN_KEY) || ''; } catch (e) {}
    if (seen === latest) return;
    try { sessionStorage.setItem(VERSION_SEEN_KEY, latest); } catch (e) {}
    location.reload();
  }
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
        <button id="bExp" title="Diesen Flow als JSON-Datei sichern">⬇ Export</button>
        <button id="bImp" title="Flow aus JSON-Datei laden">⬆ Import</button>
        <input type="file" id="fImp" accept=".json,application/json" hidden>
        <span class="info" id="flowInfo"></span>
        <span class="status" id="status"></span>
        <span class="ver" title="Kartenversion">v${VERSION}</span>
      </div>
      <div class="main"><div class="pal" id="pal"></div>
        <div class="cv" id="cv" tabindex="0"><svg id="svg" width="2400" height="1400"></svg></div>
        <div class="ins" id="ins"></div></div>
      <pre id="prev" hidden></pre></div></ha-card>`;
    const q = (id) => this.querySelector('#' + id);
    this._el = { sel: q('flowSel'), name: q('fName'), en: q('fEn'), pal: q('pal'), cv: q('cv'), svg: q('svg'), ins: q('ins'), prev: q('prev'), status: q('status'), info: q('flowInfo') };
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
    q('bExp').onclick = () => this._export();
    q('bImp').onclick = () => q('fImp').click();
    q('fImp').onchange = (e) => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) this._import(file); };
    this._el.sel.onchange = () => { this._cur = this._el.sel.value; this._sel = null; this._selSet = new Set(); this._refresh(); };
    this._el.name.oninput = () => { this._flow.name = this._el.name.value; this._save(); this._fillSelect(); this._updInfo(); };
    this._el.en.onchange = () => { this._flow.enabled = this._el.en.checked; this._save(); this._updInfo(); };
    this._el.svg.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (this._mv = (e) => this._move(e)));
    window.addEventListener('pointerup', (this._up = (e) => this._end(e)));
    window.addEventListener('keydown', (this._key = (e) => this._onKey(e)));
    this._el.cv.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && this._selSet.size) this._removeSelected(); });
    this._el.ins.addEventListener('input', (e) => this._field(e));
    this._el.ins.addEventListener('change', (e) => this._field(e));
    this._el.ins.addEventListener('focusin', (e) => { if (e.target.matches('[data-k],[data-day],[data-devop],[data-devbri]')) this._snapshot(); });
    this._el.ins.addEventListener('click', (e) => { const rm = e.target.closest('[data-rmk]'); if (rm) { this._snapshot(); const n = this._flow.nodes.find((k) => k.id === this._sel); const arr = n && n.cfg[rm.dataset.rmk]; if (arr) { const gone = arr.splice(Number(rm.dataset.i), 1)[0]; if (n.cfg.dev && gone) delete n.cfg.dev[gone]; this._save(); this._render(); this._renderIns(); } return; } if (e.target.id === 'delNode') { if (this._selSet.size > 1) this._removeSelected(); else this._removeNode(this._sel); } });
  }
  disconnectedCallback() {
    window.removeEventListener('pointermove', this._mv); window.removeEventListener('pointerup', this._up); window.removeEventListener('keydown', this._key);
    clearTimeout(this._registryReloadTimer);
    this._registryUnsubs.forEach((unsub) => { try { unsub(); } catch (e) {} });
    this._registryUnsubs = [];
  }
  _subscribeRegistry() {
    if (typeof this._hass.connection?.subscribeEvents !== 'function') return;
    const reload = () => {
      clearTimeout(this._registryReloadTimer);
      this._registryReloadTimer = setTimeout(() => this._loadIntegrationsData(), 1000);
    };
    for (const ev of ['entity_registry_updated', 'device_registry_updated', 'area_registry_updated']) {
      this._hass.connection.subscribeEvents(reload, ev)
        .then((unsub) => this._registryUnsubs.push(unsub))
        .catch(() => {});
    }
  }
  _onKey(e) {
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target && e.target.tagName) || '');
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing) { e.preventDefault(); this._undo(); return; }
    if (meta && e.key.toLowerCase() === 'c' && !typing) { e.preventDefault(); this._copy(); return; }
    if (meta && e.key.toLowerCase() === 'v' && !typing) { e.preventDefault(); this._paste(); return; }
  }
  async _load() {
    let flows = null;
    try { const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: STORE_KEY }); flows = r && r.value && r.value.flows; } catch (e) {}
    if (!flows) { try { flows = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {} }
    this._flows = flows && flows.length ? flows : [sampleFlow()];
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
      try { localStorage.setItem(STORE_KEY, JSON.stringify(value.flows)); } catch (e) {}
      try { await this._hass.callWS({ type: 'frontend/set_user_data', key: STORE_KEY, value }); } catch (e) { this._say('Speichern fehlgeschlagen: ' + (e.message || e), 1); }
    }, 500);
  }
  _say(t, err) { this._el.status.textContent = t; this._el.status.className = 'status' + (err ? ' err' : ''); }
  async _loadIntegrationsData() {
    try {
      this._registry = await this._hass.callWS({ type: 'config/entity_registry/list' });
    } catch (e) {
      this._registry = null;
    }
    let deviceReg = null;
    try {
      deviceReg = await this._hass.callWS({ type: 'config/device_registry/list' });
    } catch (e) {}
    let areaReg = null;
    try {
      areaReg = await this._hass.callWS({ type: 'config/area_registry/list' });
    } catch (e) {}
    const devById = {};
    if (deviceReg) for (const d of deviceReg) devById[d.id] = d;
    const areaById = {};
    if (areaReg) for (const a of areaReg) areaById[a.area_id] = a;
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
    try { const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: PLATFORMS_KEY }); sel = r && r.value && r.value.platforms; } catch (e) {}
    if (!sel) { try { sel = JSON.parse(localStorage.getItem(PLATFORMS_KEY) || 'null'); } catch (e) {} }
    if (!sel) {
      const present = new Set(this._allPlatforms.map((p) => p.id));
      sel = DEFAULT_PLATFORMS.filter((p) => present.has(p));
    }
    this._selectedPlatforms = new Set(sel);
  }
  _savePlatforms() {
    const platforms = Array.from(this._selectedPlatforms);
    try { localStorage.setItem(PLATFORMS_KEY, JSON.stringify(platforms)); } catch (e) {}
    this._hass.callWS({ type: 'frontend/set_user_data', key: PLATFORMS_KEY, value: { platforms } }).catch(() => {});
  }
  _recomputeAllowed() {
    if (!this._registry || !this._selectedPlatforms) { this._allowedIds = null; return; }
    this._allowedIds = new Set(this._registry.filter((e) => this._selectedPlatforms.has(e.platform)).map((e) => e.entity_id));
  }
  _typeAvailable(type) {
    const t = T[type];
    if (!t || !Array.isArray(t.fields)) return true;
    for (const f of t.fields) {
      if (f.t !== 'entity' || !f.r) continue;
      if (!f.d || !f.d.length) continue;
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
  _fillSelect() { this._el.sel.innerHTML = this._flows.map((f) => `<option value="${esc(f.id)}"${f.id === this._cur ? ' selected' : ''}>${esc(f.name || f.id)}</option>`).join(''); }
  _refresh() {
    this._fillSelect();
    const f = this._flow;
    this._el.name.value = f ? f.name : ''; this._el.en.checked = !!(f && f.enabled);
    this._el.prev.hidden = true;
    this._activeNodeId = null; this._activePrevId = null;
    this._render(); this._renderIns();
  }
  _outPos(n, o) { const h = nh(n), t = T[n.type]; return [n.x + NW, n.y + (t && (t.cat === 'cond' || t.twoOut) ? [h * 0.3, h * 0.7][o] : h / 2)]; }
  _friendly(id) {
    if (!id) return '';
    const s = this._hass && this._hass.states[id];
    return s ? (s.attributes.friendly_name || id) : id;
  }
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
      const activeWire = this._activeNodeId && w.to === this._activeNodeId && w.from === this._activePrevId;
      h += `<path class="wire${activeWire ? ' active' : ''}" data-wire="${i}" d="${curve(x1, y1, b.x, b.y + nh(b) / 2)}"><title>Klicken zum Loeschen</title></path>`;
    });
    if (this._conn) { const a = byId[this._conn.from]; const [x1, y1] = this._outPos(a, this._conn.out); h += `<path d="${curve(x1, y1, this._conn.x, this._conn.y)}" fill="none" stroke="#ff9800" stroke-width="3" stroke-dasharray="6"/>`; }
    for (const n of f.nodes) {
      const t = T[n.type]; if (!t) continue;
      const hh = nh(n), gap = catGap(n), showVal = nhShowsVal(n);
      const [subL1, subL2] = subParts(t, n.cfg || {}, (id) => this._friendly(id), 33);
      const subY1 = 19 + gap, subY2 = subY1 + gap;
      const ttl = t.label.length > 28 ? t.label.slice(0, 27) + '…' : t.label;
      const isActive = n.id === this._activeNodeId;
      const miss = this._missing(n), ml = multiOf(n);
      const mlBody = (nn, list, y1, g) => {
        const c = nn.cfg || {}, op = c.op || 'turn_on';
        let b = `<text class="ns" x="10" y="${y1}">Standard: ${OP_LBL[op]}${op === 'turn_on' && num(c.brightness) !== undefined ? ` (${c.brightness}%)` : ''}${list.length ? '' : ' - noch keine Geraete'}</text>`;
        list.forEach((id, i) => {
          const y = y1 + g * (i + 1), dv = devOf(c, id);
          const al = `${OP_LBL[dv.op]}${dv.op === 'turn_on' && dom(id) === 'light' && dv.bri !== undefined ? ` ${dv.bri}%` : ''}`;
          b += `<text class="ns" x="10" y="${y}">${esc(trimLine(this._friendly(id), 17))}</text><text class="nv" text-anchor="end" x="${NW - 10}" y="${y}">${esc(al)} · ${esc(this._actValue(id) || '–')}</text>`;
        });
        return b;
      };
      h += `<g class="node${this._selSet.has(n.id) ? ' sel' : ''}${isActive ? ' active' : ''}${miss.length ? ' miss' : ''}" data-id="${n.id}" transform="translate(${n.x},${n.y})">${miss.length ? `<title>Entitaet nicht gefunden: ${esc(miss.join(', '))}</title>` : ''}
        <rect class="body" width="${NW}" height="${hh}" rx="7" fill="${t.color}"/>
        <text class="nt" x="10" y="19">${t.icon} ${esc(ttl)}</text>${ml ? mlBody(n, ml, subY1, gap) : `<text class="ns" x="10" y="${subY1}">${esc(subL1)}</text>${subL2 ? `<text class="ns" x="10" y="${subY2}">${esc(subL2)}</text>` : ''}`}`;
      if (showVal) h += `<text class="nv" x="10" y="${hh - 9}">Aktuell: ${esc(this._actValue(nhEntity(n)) || '–')}</text>`;
      if (t.cat !== 'trigger') h += `<circle class="port" data-in="${n.id}" cx="0" cy="${hh / 2}" r="6"/>`;
      if (t.cat === 'cond' || t.twoOut) {
        const [l0, l1] = t.outLabels || ['Ja', 'Nein'];
        h += `<circle class="port" data-out="${n.id}" data-o="0" cx="${NW}" cy="${hh * 0.3}" r="6"/><circle class="port" data-out="${n.id}" data-o="1" cx="${NW}" cy="${hh * 0.7}" r="6"/><text class="plab" text-anchor="end" x="${NW - 12}" y="${hh * 0.3 + 3}">${esc(l0)}</text><text class="plab" text-anchor="end" x="${NW - 12}" y="${hh * 0.7 + 3}">${esc(l1)}</text>`;
      } else h += `<circle class="port" data-out="${n.id}" data-o="0" cx="${NW}" cy="${hh / 2}" r="6"/>`;
      if (miss.length) h += `<text class="wm" x="${NW - 22}" y="19">⚠️</text>`;
      h += '</g>';
    }
    if (this._band) {
      const { x0, y0, x1, y1 } = this._band;
      const bx = Math.min(x0, x1), by = Math.min(y0, y1), bw = Math.abs(x1 - x0), bh = Math.abs(y1 - y0);
      h += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="rgba(33,150,243,.15)" stroke="#2196f3" stroke-dasharray="4"/>`;
    }
    this._el.svg.innerHTML = h;
    this._updInfo();
  }
  _pt(e) { const r = this._el.cv.getBoundingClientRect(); return [e.clientX - r.left + this._el.cv.scrollLeft, e.clientY - r.top + this._el.cv.scrollTop]; }
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
    if (e.shiftKey) return;
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
  _entityIds(domains, deviceClasses, skipAllowed) {
    return Object.keys(this._hass.states).filter((id) => {
      if (domains && !domains.includes(dom(id))) return false;
      if (deviceClasses) {
        const s = this._hass.states[id];
        if (!deviceClasses.includes((s.attributes || {}).device_class)) return false;
      }
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
      const v = c[fl.k] ?? fl.v ?? (fl.t === 'entities' ? [] : '');
      let labelText = fl.l;
      if (fl.unitFrom) {
        const u = this._unit(c[fl.unitFrom]);
        if (u) labelText += ` (${u})`;
      }
      h += `<label>${esc(labelText)}${fl.r ? ' *' : ''}</label>`;
      if (fl.hint) h += `<div class="hint" style="margin:-2px 0 4px">${esc(fl.hint)}</div>`;
      if (fl.t === 'select') h += `<select data-k="${fl.k}">${fl.o.map(([val, lab]) => `<option value="${esc(val)}"${String(v) === val ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
      else if (fl.t === 'days') h += `<div class="days">${DAYS.map(([d, l]) => `<label><input type="checkbox" data-day="${d}"${(c.days || fl.v).includes(d) ? ' checked' : ''}> ${l}</label>`).join('')}</div>`;
      else if (fl.t === 'entity' || fl.t === 'entities') {
        const multi = fl.t === 'entities', vv = multi ? '' : v;
        const skipInt = !fl.filterInt;
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
        if (vv && !ids.includes(vv)) opts.unshift([vv, `${this._friendly(vv)} (nicht gefunden)`, this._integrationLabel(vv), this._unit(vv), this._platformStyle(vv), this._areaLabel(vv)]);
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
            const labA = area ? `${labU} [${area}]` : labU;
            const icon = style ? style.icon + ' ' : '';
            const colorAttr = style ? ` style="color:${style.color}"` : '';
            return `<option value="${esc(id)}"${id === vv ? ' selected' : ''}${colorAttr}>${esc(icon + labA)}</option>`;
          }).join('');
          return `<optgroup label="${esc(bk)}">${items}</optgroup>`;
        }).join('');
        if (multi) {
          const cur = Array.isArray(v) ? v : [];
          h += cur.map((id, i) => {
            const dv = devOf(c, id), dd = (c.dev && c.dev[id]) || {};
            const ops = [['', 'wie Standard'], ['turn_on', 'An'], ['turn_off', 'Aus'], ['toggle', 'Um']];
            return `<div class="chip" style="flex-wrap:wrap"><span>${esc(this._friendly(id))}${this._hass.states[id] ? '' : ' (nicht gefunden)'}</span><button data-rmk="${fl.k}" data-i="${i}" title="Entfernen">✕</button>`
              + `<select data-devop="${esc(id)}" style="width:auto">${ops.map(([val, lab]) => `<option value="${val}"${(dd.op || '') === val ? ' selected' : ''}>${lab}</option>`).join('')}</select>`
              + (dom(id) === 'light' && dv.op === 'turn_on' ? `<input data-devbri="${esc(id)}" type="number" min="0" max="100" placeholder="Helligkeit %" value="${esc(dd.brightness ?? '')}" style="width:110px">` : '') + '</div>';
          }).join('');
          h += `<select data-addk="${fl.k}"><option value="">+ Geraet hinzufuegen</option>${optionsHtml}</select>${note}`;
        } else h += `<select data-k="${fl.k}"><option value="">- waehlen -</option>${optionsHtml}</select>${note}<div class="hint" data-hint="${fl.k}">${this._hintFor(v)}</div>`;
      }
      else if (fl.t === 'notify_service') {
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
    if (t.dataset.addk) {
      if (t.value) { const arr = c[t.dataset.addk] = c[t.dataset.addk] || []; if (!arr.includes(t.value)) arr.push(t.value); this._save(); this._render(); this._renderIns(); }
      return;
    }
    if (t.dataset.devop !== undefined || t.dataset.devbri !== undefined) {
      const id = t.dataset.devop !== undefined ? t.dataset.devop : t.dataset.devbri;
      const d = ((c.dev = c.dev || {})[id] = c.dev[id] || {});
      if (t.dataset.devop !== undefined) d.op = t.value; else d.brightness = t.value;
      this._save(); this._render();
      if (t.dataset.devop !== undefined) this._renderIns();
      return;
    }
    if (t.dataset.day) c.days = Array.from(this._el.ins.querySelectorAll('[data-day]')).filter((i) => i.checked).map((i) => i.dataset.day);
    else if (t.dataset.k) {
      c[t.dataset.k] = t.value;
      const hint = this._el.ins.querySelector(`[data-hint="${t.dataset.k}"]`); if (hint) hint.innerHTML = this._hintFor(t.value);
      const fl = T[n.type].fields.find((x) => x.k === t.dataset.k);
      entityChanged = fl && fl.t === 'entity';
    } else return;
    this._save(); this._render();
    if (entityChanged) this._renderIns();
  }
  _preview() {
    const f = this._flow, p = this._el.prev, v = validate(f);
    try { p.textContent = JSON.stringify(compileFlow(f), null, 2) + (v.warnings.length ? '\n\nHinweise:\n- ' + v.warnings.join('\n- ') : '') + (v.errors.length ? '\n\nFehler:\n- ' + v.errors.join('\n- ') : ''); } catch (err) { p.textContent = 'Fehler: ' + err.message; }
    p.hidden = !p.hidden;
  }
  async _setAlexaExposed(entityIds, expose) {
    if (!entityIds.length || typeof this._hass.callWS !== 'function') return;
    try { await this._hass.callWS({ type: 'homeassistant/expose_entity', assistants: ['cloud.alexa'], entity_ids: entityIds, should_expose: expose }); } catch (e) {}
  }
  async _ensureSwitchHelper(flow, node, name) {
    if (!node) return null;
    const cfg = node.cfg || (node.cfg = {});
    flow.deployedSwitchHelpers = flow.deployedSwitchHelpers || {};
    if (cfg._helperEntity && this._hass.states[cfg._helperEntity]) {
      const bareId = cfg._helperEntity.split('.')[1];
      try { await this._hass.callWS({ type: 'input_boolean/update', input_boolean_id: bareId, name }); } catch (e) {}
      flow.deployedSwitchHelpers[node.id] = cfg._helperEntity;
      return cfg._helperEntity;
    }
    try {
      const r = await this._hass.callWS({ type: 'input_boolean/create', name, icon: 'mdi:amazon-alexa' });
      const entityId = 'input_boolean.' + r.id;
      cfg._helperEntity = entityId;
      flow.deployedSwitchHelpers[node.id] = entityId;
      return entityId;
    } catch (e) {
      this._say('Alexa-Schalter-Helfer "' + name + '" konnte nicht angelegt werden: ' + ((e && e.message) || e), 1);
      return null;
    }
  }
  _legacyAlexaFree(flow, nodeId) {
    if (flow.deployedAlexaV2) return false;
    return !this._flows.some((o) => o !== flow && !o.deployedAlexaV2 && o.deployedSwitchHelpers && o.deployedSwitchHelpers[nodeId]);
  }
  async _removeLegacyAlexa(nodeId) {
    try { await this._hass.callApi('DELETE', 'config/automation/config/flowcraft_alexasw_' + nodeId); } catch (e) {}
    try { await this._hass.callApi('DELETE', 'config/script/config/flowcraft_alexasw_on_' + nodeId); } catch (e) {}
    try { await this._hass.callApi('DELETE', 'config/script/config/flowcraft_alexasw_off_' + nodeId); } catch (e) {}
  }
  async _removeSwitchHelper(flow, nodeId, helperEntity) {
    if (helperEntity) {
      await this._setAlexaExposed([helperEntity], false);
      try { await this._hass.callWS({ type: 'input_boolean/delete', input_boolean_id: helperEntity.split('.')[1] }); } catch (e) {}
    }
    const pre = flow.id + '_' + nodeId;
    try { await this._hass.callApi('DELETE', 'config/automation/config/flowcraft_alexasw_' + pre); } catch (e) {}
    try { await this._hass.callApi('DELETE', 'config/script/config/flowcraft_alexasw_on_' + pre); } catch (e) {}
    try { await this._hass.callApi('DELETE', 'config/script/config/flowcraft_alexasw_off_' + pre); } catch (e) {}
    if (this._legacyAlexaFree(flow, nodeId)) await this._removeLegacyAlexa(nodeId);
  }
  async _deploy() {
    const f = this._flow, v = validate(f);
    if (v.errors.length) { this._say(v.errors[0], 1); return; }
    let result;
    try { result = compileFlow(f); } catch (err) { this._say(err.message, 1); return; }
    try {
      this._say('Deploy laeuft ...');
      if (result.automation) await this._hass.callApi('POST', 'config/automation/config/' + result.automation.id, result.automation);
      let switchCount = 0;
      for (const sw of result.switches) {
        const node = f.nodes.find((n) => n.id === sw.nodeId);
        const helperId = await this._ensureSwitchHelper(f, node, sw.name);
        if (!helperId) continue;
        await this._hass.callApi('POST', 'config/script/config/' + sw.onScript.id, sw.onScript.cfg);
        await this._hass.callApi('POST', 'config/script/config/' + sw.offScript.id, sw.offScript.cfg);
        const autoId = 'flowcraft_alexasw_' + f.id + '_' + sw.nodeId;
        await this._hass.callApi('POST', 'config/automation/config/' + autoId, {
          id: autoId,
          alias: 'FlowCraft Alexa-Schalter: ' + sw.name,
          description: 'Erzeugt von FlowCraft (Alexa-Schalter-Node). Aenderungen bitte in FlowCraft machen, sie werden beim naechsten Deploy ueberschrieben.',
          triggers: [
            { trigger: 'state', entity_id: helperId, to: 'on', id: 'on' },
            { trigger: 'state', entity_id: helperId, to: 'off', id: 'off' },
          ],
          conditions: [],
          actions: [{ choose: [
            { conditions: [{ condition: 'trigger', id: 'on' }], sequence: [{ action: 'script.turn_on', target: { entity_id: 'script.' + sw.onScript.id } }] },
            { conditions: [{ condition: 'trigger', id: 'off' }], sequence: [{ action: 'script.turn_on', target: { entity_id: 'script.' + sw.offScript.id } }] },
          ] }],
          mode: 'queued',
        });
        await this._setAlexaExposed([helperId], true);
        if (this._legacyAlexaFree(f, sw.nodeId)) await this._removeLegacyAlexa(sw.nodeId);
        switchCount++;
      }
      const subIds = result.subs.map((x) => x.id);
      for (const sb of result.subs) await this._hass.callApi('POST', 'config/script/config/' + sb.id, sb.cfg);
      const staleSubs = (f.deployedSubs || []).filter((id) => !subIds.includes(id));
      for (const id of staleSubs) { try { await this._hass.callApi('DELETE', 'config/script/config/' + id); } catch (e) {} }
      f.deployedSubs = subIds;
      const curSwitchIds = result.switches.map((s) => s.nodeId);
      const deployedHelpers = f.deployedSwitchHelpers || {};
      const removedSwitchIds = Object.keys(deployedHelpers).filter((id) => !curSwitchIds.includes(id));
      for (const id of removedSwitchIds) { await this._removeSwitchHelper(f, id, deployedHelpers[id]); delete deployedHelpers[id]; }
      f.deployedSwitchHelpers = deployedHelpers;
      f.deployedAlexaV2 = true;
      if (result.automation) await this._hass.callService('automation', 'reload');
      if (switchCount || removedSwitchIds.length || subIds.length || staleSubs.length) {
        await this._hass.callService('script', 'reload');
        await this._hass.callService('automation', 'reload');
      }
      await sleep(1500);
      await this._setAlexaExposed(result.switches.flatMap((x) => ['script.' + x.onScript.id, 'script.' + x.offScript.id]).concat(subIds.map((id) => 'script.' + id)).filter((id) => this._hass.states[id]), false);
      if (result.automation) {
        const st = Object.values(this._hass.states).find((s) => s.entity_id.startsWith('automation.') && s.attributes.id === result.automation.id);
        if (st) await this._hass.callService('automation', f.enabled ? 'turn_on' : 'turn_off', { entity_id: st.entity_id });
      }
      f.deployedAt = new Date().toISOString(); f.deployedSig = this._sig(f); this._save(); this._updInfo();
      const t = new Date().toLocaleTimeString('de-DE');
      const switchNote = switchCount ? ` - ${switchCount} Alexa-Schalter aktualisiert und bei Alexa freigegeben (natives "an"/"aus", erscheint idR. automatisch bei Alexa)` : '';
      const removedSwitchNote = removedSwitchIds.length ? ` - ${removedSwitchIds.length} entfernte(r) Alexa-Schalter geloescht und Alexa-Freigabe zurueckgenommen` : '';
      this._say(`Deployed ${t}${subIds.length ? ` - ${subIds.length} Teilablauf/-ablaeufe` : ''}${switchNote}${removedSwitchNote}${v.warnings.length ? ' (' + v.warnings.length + ' Hinweis/e, siehe Vorschau)' : ''}`);
    } catch (err) { this._say('Deploy fehlgeschlagen: ' + ((err && (err.body && err.body.message || err.message)) || err), 1); }
  }
  async _testRun() {
    const f = this._flow;
    if (!f) return;
    let result = null;
    try { result = compileFlow(f); } catch (e) {}
    const autoSt = Object.values(this._hass.states).find((s) => s.entity_id.startsWith('automation.') && s.attributes.id === 'flowcraft_' + f.id);
    const switchOnEnts = (result && result.switches || []).map((s) => 'script.' + s.onScript.id).filter((id) => this._hass.states[id]);
    if (!autoSt && !switchOnEnts.length) { this._say('Bitte zuerst „Deploy" klicken, danach kann getestet werden.', 1); return; }
    try {
      this._say('Test laeuft ...');
      if (autoSt) await this._hass.callService('automation', 'trigger', { entity_id: autoSt.entity_id, skip_condition: false });
      for (const id of switchOnEnts) await this._hass.callService('script', 'turn_on', { entity_id: id });
      const t = new Date().toLocaleTimeString('de-DE');
      this._say(`Test ausgefuehrt ${t} - Bedingungen wurden mit den aktuellen echten Werten geprueft.`);
    } catch (err) { this._say('Test fehlgeschlagen: ' + ((err && (err.body && err.body.message || err.message)) || err), 1); }
  }
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
  async _simulate() {
    if (this._simRunning) return;
    const f = this._flow, v = validate(f);
    if (v.errors.length) { this._say(v.errors[0], 1); return; }
    const triggers = f.nodes.filter((n) => T[n.type] && T[n.type].cat === 'trigger');
    if (!triggers.length) { this._say('Kein Ausloeser vorhanden', 1); return; }
    this._simRunning = true;
    this._el.prev.hidden = false;
    let out = `Simulation von „${f.name}“ (${new Date().toLocaleTimeString('de-DE')}) - es wird NICHTS an Geraete gesendet:\n`;
    this._el.prev.textContent = out;
    this._say('Simulation laeuft ... (Ablauf wird auf dem Canvas animiert)');
    const playBranch = async (tr, o, label) => {
      if (label) { out += `(Zweig „${label}“)\n`; this._el.prev.textContent = out; }
      const steps = this._outsTrace(tr.id, o, [tr.id]);
      if (!steps.length) { out += '(nicht verbunden)\n'; this._el.prev.textContent = out; return; }
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
    };
    try {
      for (const tr of triggers) {
        const t = T[tr.type];
        out += `\n=== Ausloeser: ${t.icon} ${t.label} (${subFlat(t, tr.cfg || {}, (id) => this._friendly(id))}) ===\n`;
        this._el.prev.textContent = out;
        this._activeNodeId = tr.id; this._activePrevId = null; this._render();
        await sleep(700);
        if (t.twoOut) {
          const [l0, l1] = t.outLabels || ['Ja', 'Nein'];
          await playBranch(tr, 0, l0);
          await playBranch(tr, 1, l1);
        } else {
          await playBranch(tr, 0, null);
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
    try { await this._hass.callApi('DELETE', 'config/automation/config/flowcraft_' + f.id); } catch (e) {}
    for (const [nodeId, helperEntity] of Object.entries(f.deployedSwitchHelpers || {})) {
      await this._removeSwitchHelper(f, nodeId, helperEntity);
    }
    for (const id of f.deployedSubs || []) { try { await this._hass.callApi('DELETE', 'config/script/config/' + id); } catch (e) {} }
    try { await this._hass.callService('automation', 'reload'); } catch (e) {}
    try { await this._hass.callService('script', 'reload'); } catch (e) {}
    this._flows = this._flows.filter((x) => x.id !== f.id);
    if (!this._flows.length) this._flows.push({ id: 'f' + Date.now().toString(36), name: 'Neuer Flow', enabled: true, seq: 0, nodes: [], wires: [] });
    this._cur = this._flows[0].id; this._sel = null; this._selSet = new Set(); this._save(); this._refresh();
  }
}
if (!customElements.get('flowcraft-editor')) customElements.define('flowcraft-editor', FlowCraftEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'flowcraft-editor', name: 'FlowCraft', description: 'Node-RED-artiger Flow-Editor, erzeugt HA-Automationen' });
