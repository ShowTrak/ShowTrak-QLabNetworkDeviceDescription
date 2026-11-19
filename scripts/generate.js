#!/usr/bin/env node
// Builds showtrak-server.json (the QLab network device description), so every
// OSC route ShowTrak Server accepts can be sent from a QLab network cue.
//
// Monitor check actions are typed in (check type, action, values) rather than
// listed, so check types and actions added to the server later need no new
// description. FreeKiosk commands are a fixed allowlist on the server, so they
// are read from its catalogue and offered as menus.
//
// Usage:
//   node scripts/generate.js [path-to-ShowTrakServer]
//   node scripts/generate.js --dev [path-to-ShowTrakServer]
//
// --dev builds a test copy, "ShowTrak Server (Dev)", with its own identifier,
// so it sits alongside the description QLab ships rather than replacing it.
// It is written straight into QLab's user Network Library and the release file
// in this repo is left alone.
//
// The server checkout must be built (`npm run build`), because the FreeKiosk
// catalogue is read from its compiled dist/ output. Defaults to ../ShowTrakServer.
//
// The layout and menu values follow the ShowTrak description QLab ships, which
// QLab loads ahead of any user Network Library copy with the same identifier.
// Its keys and values must never be renamed: QLab stores them in saved network
// cues, so a rename would break existing workspaces.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RepoRoot = path.resolve(__dirname, '..');
const Args = process.argv.slice(2);
const Dev = Args.includes('--dev');
const ServerArg = Args.find((Arg) => !Arg.startsWith('--'));
const ServerRoot = path.resolve(ServerArg || path.join(RepoRoot, '..', 'ShowTrakServer'));
const NetworkLibrary = path.join(
  require('node:os').homedir(),
  'Library',
  'Application Support',
  'QLab',
  'Network Library'
);
const OutFile = Dev
  ? path.join(NetworkLibrary, 'showtrak-server-dev.qlabnetwork')
  : path.join(RepoRoot, 'showtrak-server.json');

function loadServer(Rel) {
  const File = path.join(ServerRoot, 'dist', Rel);
  if (!fs.existsSync(File) && !fs.existsSync(`${File}.js`) && !fs.existsSync(path.join(File, 'index.js'))) {
    console.error(`Cannot find ${File}. Build ShowTrak Server first (npm run build).`);
    process.exit(1);
  }
  return require(File);
}

const { FREEKIOSK_COMMANDS } = loadServer('Modules/FreeKiosk/commands.js');
const ServerVersion = JSON.parse(fs.readFileSync(path.join(ServerRoot, 'package.json'), 'utf8')).version;

// ---- Parameter builders ----------------------------------------------------

const SLUG_PATTERN = '^\\S+$';

function stringParam(Key, DisplayName) {
  return { key: Key, displayName: DisplayName, type: 'string', pattern: SLUG_PATTERN };
}

function menu(Key, DisplayName, Entries, DefaultValue) {
  const Param = {
    key: Key,
    displayName: DisplayName,
    type: 'menu',
    fadeable: false,
    values: Entries.map((Entry) => (Entry === '---' ? Entry : { [Entry[0]]: Entry[1] })),
  };
  if (DefaultValue !== undefined) Param.defaultValue = DefaultValue;
  return Param;
}

const quote = (Value) => `'${String(Value).replace(/'/g, "\\'")}'`;
const predicateIn = (Key, Values) =>
  Values.length === 1
    ? `${Key} == ${quote(Values[0])}`
    : `${Key} in { ${Values.map(quote).join(', ')} }`;

// ---- Value fields -----------------------------------------------------------
//
// Used for FreeKiosk commands, whose values are fixed 0-100 levels. A value
// that can never contain a space or slash stays in the path, the form every
// server since 3.25.2 accepts; anything else travels as a quoted OSC argument
// (ShowTrak Server 3.35+).

const optionEntries = (Field) =>
  (Array.isArray(Field.Options) ? Field.Options : []).map((Option) =>
    Option && typeof Option === 'object'
      ? [String(Option.label ?? Option.Label ?? Option.value), String(Option.value ?? Option.Value)]
      : [String(Option), String(Option)]
  );

const isBlank = (Value) => Value === undefined || Value === null || Value === '';

// Seconds and ramp times can be fractional; scene, channel and preset numbers
// cannot.
const allowsDecimals = (Field) => /ramp|second|time|delay|duration/i.test(`${Field.Key} ${Field.Label}`);

// One value of an action as a QLab parameter, plus how it appears in the
// template: `token` as an OSC argument, and whether it may sit in the path.
function valueField(Field, Key) {
  const Name = Field.Label || Field.Key;
  const Required = Boolean(Field.Required) && isBlank(Field.Default);
  const Optional = (Text) => (Field.Required ? Text : `${Text} (optional)`);
  const Entries = optionEntries(Field);

  if (Entries.length) {
    const Default =
      !isBlank(Field.Default) && Entries.some((Entry) => Entry[1] === String(Field.Default))
        ? String(Field.Default)
        : Entries[0][1];
    return {
      param: menu(Key, Name, Entries, Default),
      token: `"{${Key}}"`,
      pathSafe: Entries.every((Entry) => /^[^\s/"]+$/.test(Entry[1])),
    };
  }

  if (Field.Type === 'number' && (Field.Required || typeof Field.Default === 'number')) {
    const Param = {
      key: Key,
      displayName: Name,
      type: 'scalar',
      width: 150,
      minimum: typeof Field.Min === 'number' ? Field.Min : 0,
      precision: allowsDecimals(Field) ? [0, 2] : 0,
      fadeable: false,
      defaultValue:
        typeof Field.Default === 'number' ? Field.Default : typeof Field.Min === 'number' ? Field.Min : 1,
    };
    if (typeof Field.Max === 'number') Param.maximum = Field.Max;
    return { param: Param, token: `{${Key}}`, pathSafe: true };
  }

  if (Field.Type === 'number') {
    // Optional with no default: a scalar would always send something, so a
    // text field lets it be left blank (the server then leaves it unset).
    return {
      param: {
        key: Key,
        displayName: Optional(Name),
        type: 'string',
        pattern: '^-?[0-9]*(\\.[0-9]+)?$',
      },
      token: `"{${Key}}"`,
      pathSafe: false,
    };
  }

  if (Field.Type === 'list') {
    const Param = {
      key: Key,
      displayName: `${Name} (comma-separated)`,
      type: 'string',
      pattern: '^[^"]*$',
    };
    if (Array.isArray(Field.Default) && Field.Default.length) Param.defaultValue = Field.Default.join(',');
    return { param: Param, token: `"{${Key}}"`, pathSafe: false };
  }

  const Param = {
    key: Key,
    displayName: Required ? Name : Optional(Name),
    type: 'string',
    pattern: Required ? '^[^"]+$' : '^[^"]*$',
  };
  if (!isBlank(Field.Default) && typeof Field.Default !== 'object') Param.defaultValue = String(Field.Default);
  return { param: Param, token: `"{${Key}}"`, pathSafe: false };
}

// The template tail for an action's values: the first in the path when it is
// path-safe, the rest (or all of them) as OSC arguments.
function valueTemplate(Base, Fields) {
  const Values = Fields.map((Field, Index) => valueField(Field, `v${Index + 1}`));
  const [First, ...Rest] = Values;
  const Template = First.pathSafe
    ? [`${Base}/{v1}`, ...Rest.map((Value) => Value.token)].join(' ')
    : [Base, ...Values.map((Value) => Value.token)].join(' ');
  return { template: Template, parameters: Values.map((Value) => Value.param) };
}

// Given a list of { id, label, fields } actions, the sub-conditions that build
// each one's address: no-value actions share one condition, value-taking
// actions get their own with a field per value. `Base` is the path up to and
// including the action segment.
function actionConditions(ActionKey, Actions, Base) {
  const Plain = Actions.filter((Action) => !Action.fields.length).map((Action) => Action.id);
  const Conditions = [];
  if (Plain.length) {
    Conditions.push({ predicate: predicateIn(ActionKey, Plain), template: Base });
  }
  for (const Action of Actions.filter((Entry) => Entry.fields.length)) {
    Conditions.push({
      predicate: `${ActionKey} == ${quote(Action.id)}`,
      ...valueTemplate(Base, Action.fields),
    });
  }
  return Conditions;
}

// ---- FreeKiosk commands ----------------------------------------------------

// FreeKiosk values are all 0-100 levels, so they stay in the path (the form
// every server since 3.25.2 accepts).
const KioskCommands = FREEKIOSK_COMMANDS.map((Command) => ({
  id: Command.ID,
  label: Command.Label,
  fields: Array.isArray(Command.Params) ? Command.Params.slice(0, 1) : [],
}));

// ---- Assemble --------------------------------------------------------------
//
// The layout follows the description QLab ships (Target, then ID, then
// Action). Its parameter keys and menu values (target, id, action, script;
// 'Client/', '/WakeOnLAN', ...) are kept exactly, because QLab saves them in
// network cues: a workspace built on QLab's copy keeps working on this one.

const idParam = (DisplayName) => stringParam('id', DisplayName);

// All clients has no ID, so its templates leave {id} out. (QLab's copy used a
// hidden, empty ID field instead, but QLab counts an empty field as missing and
// marks every All clients cue as broken.)

function clientActions(WithFreeKiosk) {
  const Entries = [
    ['Wake on LAN', '/WakeOnLAN'],
    ['Run script', '/RunScript'],
    ['Trigger event', '/TriggerEvent'],
  ];
  if (WithFreeKiosk) Entries.push(['FreeKiosk command', '/FreeKiosk']);
  return menu('action', 'Action', Entries, '/WakeOnLAN');
}

function clientTarget(Predicate, ID, WithFreeKiosk) {
  const Base = ID ? '/API/{target}{id}' : '/API/{target}';
  return {
    predicate: Predicate,
    template: `${Base}{action}`,
    parameters: [...(ID ? [ID] : []), clientActions(WithFreeKiosk)],
    conditions: [
      {
        predicate: "action == '/RunScript'",
        template: `${Base}{action}/{script}`,
        parameters: [stringParam('script', 'Script ID')],
      },
      {
        // QLab's copy stores the event ID under `script` too, so the key stays.
        predicate: "action == '/TriggerEvent'",
        template: `${Base}{action}/{script}`,
        parameters: [stringParam('script', 'Event ID')],
      },
      ...(WithFreeKiosk
        ? [
            {
              predicate: "action == '/FreeKiosk'",
              parameters: [
                menu(
                  'command',
                  'Command',
                  KioskCommands.map((Command) => [Command.label, Command.id]),
                  KioskCommands[0].id
                ),
              ],
              conditions: actionConditions('command', KioskCommands, `${Base}/FreeKiosk/{command}`),
            },
          ]
        : []),
    ],
  };
}

const Description = {
  identifier: Dev ? 'com.showtrak.server.dev' : 'com.showtrak.server',
  displayName: Dev ? 'ShowTrak Server (Dev)' : 'ShowTrak Server',
  grouping: 'General',
  api: 1,
  messageType: 'OSC',
  network: [{ transport: 'UDP', defaultPort: 3333, canEditPort: true }],
  parameters: [
    menu(
      'target',
      'Target',
      [
        ['Single client', 'Client/'],
        ['Tagged clients', 'Tag/'],
        ['All clients', 'All'],
        ['Group', 'Group/'],
        '---',
        ['Monitor - run check action', 'Monitor/'],
        ['FreeKiosk terminal', 'FreeKiosk/'],
        '---',
        ['Dummy - send heartbeat', 'Dummy'],
        '---',
        ['System', 'System'],
      ],
      'Client/'
    ),
  ],
  conditions: [
    clientTarget("target == 'Client/'", idParam('Client slug'), false),
    clientTarget("target == 'Tag/'", idParam('Tag'), true),
    clientTarget("target == 'All'", null, true),
    clientTarget("target == 'Group/'", idParam('Group slug'), true),
    {
      // Typed in rather than picked from menus, so a check type or action added
      // to the server later works without a new definition. Values go as OSC
      // arguments, written as they would be in a custom OSC message: text in
      // quotes, numbers bare.
      predicate: "target == 'Monitor/'",
      parameters: [
        idParam('Monitor slug'),
        stringParam('method', 'Check type'),
        stringParam('checkAction', 'Action'),
        menu(
          'valueMode',
          'Values',
          [
            ['None', 'none'],
            ['Send values', 'values'],
          ],
          'none'
        ),
      ],
      conditions: [
        {
          predicate: "valueMode == 'none'",
          template: '/API/Monitor/{id}/{method}/{checkAction}',
        },
        {
          predicate: "valueMode == 'values'",
          template: '/API/Monitor/{id}/{method}/{checkAction} {values}',
          parameters: [{ key: 'values', displayName: 'Values', type: 'string', pattern: '.+' }],
        },
      ],
    },
    {
      predicate: "target == 'FreeKiosk/'",
      parameters: [
        idParam('Terminal slug'),
        menu(
          'command',
          'Command',
          KioskCommands.map((Command) => [Command.label, Command.id]),
          KioskCommands[0].id
        ),
      ],
      conditions: actionConditions('command', KioskCommands, '/API/FreeKiosk/{id}/{command}'),
    },
    {
      predicate: "target == 'Dummy'",
      template: '/API/Dummy/{id}/Heartbeat',
      parameters: [idParam('Dummy slug')],
    },
    {
      // The server's routes are /API/Shutdown and /API/Shutdown/Force (no
      // /System segment); the action values are QLab's copy's, unchanged.
      predicate: "target == 'System'",
      template: '/API{action}',
      parameters: [
        menu(
          'action',
          'Action',
          [
            ['Shutdown gracefully', '/Shutdown'],
            ['Shutdown forcefully', '/Shutdown/Force'],
          ],
          '/Shutdown'
        ),
      ],
    },
  ],
};

// ---- Write -----------------------------------------------------------------

// JSON.stringify with single-key menu entries kept on one line, matching the
// hand-written style of QLab's bundled descriptions.
function format(Value, Indent = '') {
  const Next = `${Indent}  `;
  if (Array.isArray(Value)) {
    if (!Value.length) return '[]';
    return `[\n${Value.map((Item) => Next + format(Item, Next)).join(',\n')}\n${Indent}]`;
  }
  if (Value && typeof Value === 'object') {
    const Keys = Object.keys(Value);
    if (Keys.length === 1 && typeof Value[Keys[0]] !== 'object') {
      return `{ ${JSON.stringify(Keys[0])}: ${JSON.stringify(Value[Keys[0]])} }`;
    }
    return `{\n${Keys.map((Key) => `${Next}${JSON.stringify(Key)}: ${format(Value[Key], Next)}`).join(',\n')}\n${Indent}}`;
  }
  return JSON.stringify(Value);
}

fs.mkdirSync(path.dirname(OutFile), { recursive: true });
fs.writeFileSync(OutFile, `${format(Description)}\n`);

console.log(
  `Wrote ${path.relative(process.cwd(), OutFile)} from ShowTrak Server ${ServerVersion}: ` +
    `${KioskCommands.length} FreeKiosk commands.`
);
