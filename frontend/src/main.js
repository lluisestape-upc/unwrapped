import { Stage } from './scene.js';
import { SpatialMix } from './audio.js';
import { buildEnvironment } from './environment.js';
import { buildMonument } from './monuments.js';
import { Interaction } from './interaction.js';
import { Trail } from './trail.js';
import { Pad } from './pad.js';
import { SkyText } from './skytext.js';
import { BlindGame } from './blind.js';
import { Beat } from './beat.js';
import { Course } from './course.js';
import { Recorder } from './recorder.js';
import { Words } from './words.js';
import { Table, TABLE_HEIGHT } from './table.js';
import { Inspector } from './inspect.js';
import { Tutorial } from './tutorial.js';
import { Missions } from './missions.js';
import {
  cacheUrl, createWorld, currentMode, getStatus, getWorld, listWorlds, resolveWorldId,
} from './api.js';

const dom = {
  overlay: document.getElementById('overlay'),
  enter: document.getElementById('enter'),
  title: document.getElementById('world-title'),
  hud: document.getElementById('hud'),
  songs: document.getElementById('songs'),
  modes: document.getElementById('modes'),
  pause: document.getElementById('pause'),
  readout: document.getElementById('stem-readout'),
  meta: document.getElementById('meta'),
  controls: document.querySelector('.controls'),
  tutorial: document.getElementById('tutorial'),
  missions: document.getElementById('missions'),
};

/** Offer the other worlds, if there is more than one. Switching reloads. */
async function renderChooser(currentId) {
  let worlds = [];
  try {
    worlds = await listWorlds();
  } catch {
    return;                       // one world only, or no index: no chooser
  }
  if (worlds.length < 2) return;

  dom.songs.hidden = false;
  dom.songs.innerHTML = worlds.map((w) => `
    <button class="song" data-id="${w.id}" aria-current="${w.id === currentId}"
            type="button">${w.title}</button>`).join('');

  for (const button of dom.songs.querySelectorAll('.song')) {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (id === currentId) return;
      location.search = `?world=${encodeURIComponent(id)}`;
    });
  }
}

// What each pipeline step is called on screen, for someone who has never
// heard of stems or Demucs.
const STEP_WORDS = {
  waiting: 'Waiting to start',
  'copying source': 'Opening the song',
  'reusing stems': 'Finding the instruments',
  'separating stems': 'Finding the instruments (the slow part, a few minutes)',
  'analysing audio': 'Listening to each instrument',
  environment: 'Choosing a landscape',
  ready: 'Almost there',
  'shaping the models': 'Getting the models ready',
  'listening to the words': 'Listening to the words',
  'making the words': 'Tripo is building the words',
  'world ready': 'Your world is ready',
};

function stepWords(step) {
  if (step.startsWith('tripo: ')) return `Tripo is building the ${step.slice(7)}`;
  return STEP_WORDS[step] || step;
}

/**
 * Your own song. Only where the pipeline is running (this laptop, with the
 * backend up): the published static site has no server to build on.
 */
function bindMaker() {
  if (currentMode() !== 'api') return;
  const root = document.getElementById('make');
  const button = document.getElementById('make-button');
  const input = document.getElementById('make-file');
  const progress = document.getElementById('make-progress');
  const step = progress.querySelector('.make-step');
  const bar = progress.querySelector('.make-bar i');
  root.hidden = false;

  button.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    button.disabled = true;
    progress.hidden = false;
    step.textContent = 'Sending the song';
    let id;
    try {
      ({ id } = await createWorld(file, title, ''));
    } catch (error) {
      step.textContent = `Could not start: ${error.message}`;
      button.disabled = false;
      return;
    }
    const timer = setInterval(async () => {
      let status;
      try { status = await getStatus(id); } catch { return; }
      bar.style.width = `${status.progress || 0}%`;
      step.textContent = stepWords(status.step || '');
      if (status.state === 'error') {
        clearInterval(timer);
        step.textContent = 'Something went wrong building this one. Try another song.';
        button.disabled = false;
      } else if (status.state === 'done' && status.step === 'world ready') {
        clearInterval(timer);
        setTimeout(() => { location.search = `?world=${encodeURIComponent(id)}`; }, 800);
      }
    }, 2000);
  });
}

const STAND_HEIGHT = 0.15;      // metres between an instrument's feet and the ground

// Discover and Play are the two on the menu. The rest are still here, reached
// with ?mode=, while it is decided whether they come back.
const MODES = ['discover', 'play', 'lyrics', 'gather', 'wander', 'pulse', 'echo', 'blind'];
const TABLE_MODES = new Set(['discover', 'play']);

// The one sentence each mode needs. It goes in the sky, not on the menu: the
// menu shows what a mode looks like, the world says what to do in it.
const INSTRUCTION = {
  discover: 'walk up to an instrument and press F',
  play: 'the table in the middle is yours',
  lyrics: 'every word that is sung becomes a thing',
  gather: 'walk up to a shape to wake it',
  wander: 'where you stand is the mix',
  echo: 'walk a while, then press R',
  blind: 'find the sound, then press E',
};

// Pulse writes its own line instead, once per level, pinned over the platform
// the run starts from. Nothing here follows the camera.
const LEVEL_LINES = [
  'jump when it flashes',
  'only a jump on the beat will reach',
  'every crossing brings a voice back',
  'stay in time',
  'keep the run going',
  'the last of it',
];
const levelLine = (n) => LEVEL_LINES[Math.min(n, LEVEL_LINES.length) - 1];

/** Aim the walker at a point on the ground. */
function faceTowards(stage, from, to) {
  stage.yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z));
  // Tipped down a little: on a course the thing you need to see is at your
  // own feet's height, and level with the horizon it sits at the very bottom
  // of the screen.
  stage.pitch = -0.16;
}

// ?event: the build shown at a stand. Every visitor gets the first-time
// experience (tutorial, no stars), and the key left of 1 starts it all over.
const EVENT = new URLSearchParams(location.search).has('event');
const EVENT_KEY = 'Backquote';

function readMode() {
  const asked = new URLSearchParams(location.search).get('mode');
  return MODES.includes(asked) ? asked : 'discover';
}

function bindModes(onPick) {
  let current = readMode();
  const paint = () => {
    for (const button of dom.modes.querySelectorAll('.mode')) {
      button.setAttribute('aria-checked', String(button.dataset.mode === current));
    }
  };
  for (const button of dom.modes.querySelectorAll('.mode')) {
    button.addEventListener('click', () => {
      current = button.dataset.mode;
      paint();
      onPick(current);
    });
  }
  paint();
  return () => current;
}

async function boot() {
  const stage = new Stage(document.getElementById('stage'));
  if (EVENT) {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('firstsong.tutorial') || key.startsWith('unwrapped.stars')) {
          localStorage.removeItem(key);
        }
      }
    } catch { /* storage refused: nothing is remembered anyway */ }
  }

  let world;
  try {
    world = await getWorld(await resolveWorldId());
  } catch (error) {
    dom.enter.textContent = 'No world found';
    dom.title.textContent = String(error.message);
    console.error(error);
    return;
  }

  const base = cacheUrl(world.id);
  dom.title.textContent = world.title;
  dom.meta.textContent =
    `${world.mix.tempo} BPM · key ${world.mix.key} · ${world.stems.length} stems · ` +
    `${world.environment.provider}`;

  const environment = await buildEnvironment(stage, world.environment, base, world.mix, world.id);
  const metaLine = dom.meta.textContent;
  const showLandscape = () => {
    if (environment.label) dom.meta.textContent = `${metaLine} · ${environment.label}`;
  };
  showLandscape();

  // The pipeline hangs each instrument at its own height, which read as
  // floating lanterns against the old dark sky. In daylight, with a shadow
  // on the ground below, a drum kit three metres up is just wrong: stand
  // them all on the grass, with a breath of air under their feet.
  for (const spec of world.stems) spec.position[1] = STAND_HEIGHT;

  const monuments = await Promise.all(
    world.stems.map((spec) => buildMonument(spec, base))
  );
  for (const monument of monuments) stage.scene.add(monument.group);

  // The lyrics' objects download while the stems decode: neither waits on
  // the other.
  const words = new Words(stage.scene, world.words || [], base);
  const wordsReady = words.load();

  const mix = new SpatialMix();
  dom.enter.textContent = 'Decoding stems…';
  await mix.load(world, base, (done, total, name) => {
    dom.enter.textContent = `Decoding ${name} (${done}/${total})…`;
  });
  await wordsReady;

  // Pair each monument with its stem by name.
  const byName = new Map(mix.stems.map((stem) => [stem.spec.name, stem]));
  const singer = monuments.find((m) => m.spec.name === 'vocals');
  const voice = byName.get('vocals');

  const interaction = new Interaction(stage, mix, monuments);
  const trail = new Trail(stage.scene, world.environment.sky_bottom);
  const pad = new Pad(stage.scene, world.environment.sky_bottom);
  const sky = new SkyText(stage.scene, stage.camera);

  const blind = new BlindGame({ stage, mix, monuments, sky, pad, trail });
  const beat = new Beat(stage.scene, world.mix.beats, world.environment.sky_bottom);
  const course = new Course(stage.scene, world.environment.sky_bottom);
  const recorder = new Recorder(stage);

  // One level per stem that starts the mode asleep, so the last crossing is
  // the one that finishes the song.
  const PULSE_LEVELS = Math.max(1, world.stems.length - 1);

  const table = new Table({
    scene: stage.scene, stage, mix, monuments, bpm: world.mix.tempo,
  });
  table.group.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  const inspector = new Inspector({ stage, table, mix });

  // What the player has actually done, counted, so each tutorial step can
  // wait for the real thing rather than for a timer.
  const seen = {
    walked: 0, discovered: 0, took: 0, inspected: 0, changed: 0, listened: 0, closed: 0,
    carried: 0, moved: 0, hushed: 0, unhushed: 0, soloed: 0, reset: 0,
  };
  inspector.onEvent = (what) => {
    if (what === 'open') seen.inspected++;
    if (what === 'change') seen.changed++;
    if (what === 'listen') seen.listened++;
    if (what === 'close') seen.closed++;
  };
  const total = monuments.length;
  const found = () => total - interaction.sleeping.size;

  // Steps count from the moment their tutorial starts, not from boot, or a
  // puck picked up in an earlier visit would tick a step nobody has done yet.
  const since = { ...seen };
  const did = (what, times = 1) => seen[what] - since[what] >= times;
  const markStart = () => Object.assign(since, seen);

  // The table, taught the same way in both modes.
  const TABLE_STEPS = [
    { text: 'Point at an effect on the table and press E to pick it up',
      keys: ['E'], done: () => did('took') },
    { text: 'Set it down next to one of the little instruments',
      keys: ['E'], done: () => table.pucks.some((p) => p.on) },
    { text: 'Point at it and press Enter to go inside the effect',
      keys: ['Enter'], done: () => did('inspected') },
    { text: 'W and S change the value, A and D choose another one',
      keys: ['W', 'S', 'A', 'D'], done: () => did('changed', 2) },
    { text: 'Hold F to hear only what the effect adds',
      keys: ['F'], done: () => did('listened') },
    { text: 'Press Enter to come back out',
      keys: ['Enter'], done: () => did('closed') },
  ];

  // The instruments themselves: where they stand, and whether they play.
  const INSTRUMENT_STEPS = [
    { text: 'The instruments move too. Look at one and press E to pick it up',
      keys: ['E'], done: () => did('carried') },
    { text: 'Walk somewhere else and press E to set it down. You hear it from where it stands',
      keys: ['E'], done: () => did('moved') },
    { text: 'Look at an instrument and press Q to silence it',
      keys: ['Q'], done: () => did('hushed') },
    { text: 'Press Q again to bring it back',
      keys: ['Q'], done: () => did('unhushed') },
    { text: 'Hold F next to an instrument to hear it on its own',
      keys: ['F'], done: () => did('soloed') },
    { text: 'The red button in the middle of the table puts everything back. Press E on it',
      keys: ['E'], done: () => did('reset') },
  ];

  const tutorial = new Tutorial(dom.tutorial, [
    { text: 'Walk with W A S D and look around with the mouse',
      keys: ['W', 'A', 'S', 'D'], done: () => seen.walked - since.walked > 3 },
    { text: 'Walk up to one of the instruments',
      done: () => !!interaction.nearestAny() },
    { text: 'Press F to hear it',
      keys: ['F'], done: () => did('discovered') },
    { text: 'Find the others. Each one you find joins the song',
      keys: ['F'], progress: () => `${found()} of ${total}`,
      done: () => interaction.sleeping.size === 0 },
    { text: 'Something landed in the middle. Go to it',
      done: () => table.inReach },
    ...TABLE_STEPS,
    ...INSTRUMENT_STEPS,
  ], { key: 'firstsong.tutorial.done', covers: ['firstsong.tutorial.table'], onStart: markStart });

  // Play starts with the whole band and the table already there, so it skips
  // finding them and teaches the rest, only to someone who never did Discover.
  const tableTutorial = new Tutorial(dom.tutorial, [
    { text: 'The table in the middle is yours. Walk up to it',
      keys: ['W'], done: () => table.inReach },
    ...TABLE_STEPS,
    ...INSTRUMENT_STEPS,
  ], { key: 'firstsong.tutorial.table', onStart: markStart });
  const TUTORIAL_FOR = { discover: tutorial, play: tableTutorial };

  // Missions: jobs a producer would do, each checked against the real mix.
  // Only the ones this song's instruments allow are offered.
  const monumentNamed = (name) => monuments.find((m) => m.spec.name === name);
  const effectOn = (name, kind) => {
    const token = table.tokens.find((t) => t.monument.spec.name === name);
    return (token && table.pucks.find((p) => p.kind === kind && p.on === token)) || null;
  };
  const value = (puck, name) => (puck ? puck.effect.values[name] : null);
  const RHYTHM = ['drums', 'bass'];
  const missions = new Missions(dom.missions, [
    { id: 'solo-drums', needs: ['drums'],
      text: 'Hear only the drums: hold F next to them',
      keys: ['F'], check: () => interaction.soloing?.spec.name === 'drums',
      lesson: 'That is a stem: one instrument on its own. A song is a few of them played together.' },
    { id: 'the-beat', needs: RHYTHM,
      text: 'Leave only the beat: silence everything except the drums and the bass',
      keys: ['Q'],
      check: () => monuments.every((m) => (RHYTHM.includes(m.spec.name) ? !m.hushed : m.hushed)),
      lesson: 'Drums and bass are the rhythm section. Most songs are built on top of them.' },
    { id: 'cathedral', needs: ['vocals'],
      text: 'Put the singer in a cathedral: Reverb on the voice, decay over 4 seconds',
      keys: ['E', 'Enter'], check: () => value(effectOn('vocals', 'reverb'), 'decay') >= 4,
      lesson: 'Reverb is the room. A long decay is a big room: a church, a cave, a stadium.' },
    { id: 'echo', needs: ['vocals'],
      text: 'Make the singer echo on and on: Delay on the voice, feedback over 60%',
      keys: ['E', 'Enter'], check: () => value(effectOn('vocals', 'delay'), 'feedback') >= 0.6,
      lesson: 'Feedback sends every echo back in, so it repeats again, a little quieter each time.' },
    { id: 'next-door', needs: ['drums'],
      text: 'Make the drums sound like they are in the room next door: Filter on the drums, below 400 Hz',
      keys: ['E', 'Enter'],
      check: () => {
        const puck = effectOn('drums', 'filter');
        return value(puck, 'type') === 'lowpass' && value(puck, 'cutoff') <= 400;
      },
      lesson: 'Walls stop the high frequencies first. A lowpass filter does the same thing.' },
    { id: 'growl', needs: ['bass'],
      text: 'Make the bass growl: Distortion on the bass, drive over 20x',
      keys: ['E', 'Enter'], check: () => value(effectOn('bass', 'drive'), 'drive') >= 20,
      lesson: 'Distortion adds harmonics the bass never played. That is why a dirty bass cuts through.' },
    { id: 'chain', needs: [],
      text: 'Chain two effects on the same instrument',
      keys: ['E'],
      check: () => table.tokens.some((t) => table.pucks.filter((p) => p.on === t).length >= 2),
      lesson: 'Order matters: the second effect works on whatever the first one made.' },
    { id: 'far', needs: [],
      text: 'Carry an instrument far away, more than 25 metres from the table',
      keys: ['E'],
      check: () => monuments.some((m) => !m.carried
        && Math.hypot(m.group.position.x, m.group.position.z) > 25),
      lesson: 'Far away is quieter and further into the room. Mixing is deciding where everything stands.' },
  ].filter((m) => m.needs.every((name) => monumentNamed(name))),
  { key: `unwrapped.stars.${world.id}`, ctx: mix.ctx });
  stage.addEventListener('mission', () => missions.skip());
  stage.addEventListener('sensitivity', (event) => {
    sky.announce(`mouse ${Math.round(event.detail * 100)}%`, 1.5);
  });
  const teachingNow = () => tutorial.active || tableTutorial.active;

  const TABLE_SIGN = 'set an effect next to an instrument';
  // Read from a few metres away, not twenty like Pulse's signs, so it is
  // hung low and small, just over the table.
  const pinTableSign = () => sky.pin(TABLE_SIGN, { x: 0, y: TABLE_HEIGHT, z: 0 },
                                     { height: 1.35, scale: 0.075 });

  table.onChange = (what) => {
    if (inspector.active) inspector.draw();
    if (what === 'take') { sky.dismiss(); seen.took++; }
    // The table resets itself; the instruments are sent home from here,
    // flying back along their arcs as the pad used to do.
    if (what === 'reset') {
      seen.reset++;
      interaction.reset();
      if (!teachingNow()) sky.announce('back to how it was', 2.5);
    }
  };
  // The sign goes up when the table comes down, not before: in Discover there
  // is nothing to explain until there is a table to explain.
  table.onLanded = () => { if (!teachingNow()) pinTableSign(); };

  // L: the same song somewhere else. The monuments, the table and the mix
  // stay exactly where they are; only the place around them changes.
  stage.addEventListener('landscape', () => {
    if (!environment.cycle()) return;
    showLandscape();
    if (!teachingNow()) sky.announce(environment.label, 2.5);
  });

  // T: trailer mode. Every overlay and every written line goes away, and the
  // name is written in the sky ahead, waiting for the camera to look up.
  stage.addEventListener('trailer', () => {
    const on = document.body.classList.toggle('cinematic');
    sky.quiet = on;
    if (on) sky.title('Unwrapped');
    else sky.untitle();
  });

  stage.addEventListener('replay', () => {
    if (recorder.playing) { recorder.stop(); return; }
    if (!recorder.play()) return;
    // Over the same stretch of the track it was walked to, or it would be a
    // different mix from the one the walk actually made.
    mix.seek(recorder.songStart);
    trail.clear();
    sky.announce('again, the way you walked it', 4);
  });
  const currentMode = bindModes(() => {});

  // Which game is running, so that coming back in from the menu continues it
  // rather than starting it over. Picking a different mode does restart.
  let running = null;
  let echoNudged = false;
  // Set by H: the next start of Discover or Play teaches again, even to a
  // browser that remembers having finished the tutorial.
  let teachAgain = false;
  let fromTheTop = false;

  // The next visitor: silence, sleeping instruments, the tutorial, no stars,
  // the song from the top, the first landscape. Works from the menu too.
  const firstBiome = environment.biome;
  function nextVisitor() {
    inspector.cancel();
    recorder.stop?.();
    document.body.classList.remove('cinematic');
    sky.quiet = false;
    sky.untitle();
    sky.unpin();
    if (firstBiome && environment.biome !== firstBiome) {
      environment.set(firstBiome);
      showLandscape();
    }
    missions.reset();
    tutorial.stop();
    tableTutorial.stop();
    table.hide();
    // From the menu the song is paused and cannot seek: do it on the way in.
    fromTheTop = !mix.seek(0);
    stage.yaw = 0;
    // The menu too, or the next "Step inside" would start whatever the last
    // visitor had picked.
    dom.modes.querySelector('[data-mode="discover"]')?.click();
    running = null;
    teachAgain = true;
    startMode('discover');
  }
  if (EVENT) {
    document.addEventListener('keydown', (event) => {
      if (event.code === EVENT_KEY && !event.repeat) nextVisitor();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyH' || event.defaultPrevented) return;
    if (!stage.active || inspector.active) return;
    const teacher = TUTORIAL_FOR[running];
    if (!teacher || teacher.active) return;
    // Start the mode over, so every step begins from the state it teaches.
    const mode = running;
    table.hide();
    running = null;
    teachAgain = true;
    sky.dismiss();
    startMode(mode);
  });

  function startMode(mode) {
    // Pulse is the one mode where walking up to a sleeping shape does nothing:
    // there the only way back into the song is to land on the beat. It is also
    // the only one with anything to stand on above the plain, and the only one
    // where the song decides how high a jump goes.
    interaction.wakeOnApproach = mode !== 'pulse' && mode !== 'discover';
    if (mode === 'pulse') {
      stage.groundAt = (x, z, feet) => course.heightAt(x, z, feet);
      stage.jumpPower = () => beat.liftAt(mix.songTime());
    } else {
      stage.groundAt = () => 0;
      stage.jumpPower = () => 1;
      // Leaving Pulse from halfway up the climb: set down on the pad rather
      // than dropped out of the sky onto a plain that just appeared.
      if (stage.altitude > 0.5) stage.placeAt(0, 0, 0);
      course.clear();
      if (mode !== running) sky.unpin();
    }
    // The table and the pad both want the middle of the world.
    pad.group.visible = !TABLE_MODES.has(mode);
    if (!TABLE_MODES.has(mode)) table.hide();

    if (mode !== 'blind' && blind.active) blind.active = false;

    const fresh = mode !== running || (mode === 'blind' && !blind.active);
    // Each tutorial belongs to its mode: leaving it half-way puts it away
    // without counting it as done, so it is there again next time.
    const teacher = TUTORIAL_FOR[mode];
    for (const other of [tutorial, tableTutorial]) if (other !== teacher) other.stop();
    // While a tutorial is talking, the sky stays quiet: one voice at a time.
    const teaching = !!teacher && (teacher.active || teachAgain || (fresh && !teacher.seen));
    if (mode !== 'pulse' && !teaching) sky.say(INSTRUCTION[mode]);

    running = mode;
    if (!fresh) return;

    switch (mode) {
      case 'discover':
        // Silence, and a table still up in the sky. Every instrument found
        // brings its layer in; finding the last one brings the table down.
        interaction.wakeOnApproach = false;
        interaction.reset();
        interaction.sleepAll();
        table.hide();
        stage.placeAt(0, 0, 0);
        tutorial.start(teachAgain);
        teachAgain = false;
        break;
      case 'lyrics':
        // The song from the top, the whole band, and a world that starts
        // empty: the words build it as they are sung.
        interaction.wakeAll();
        interaction.reset();
        mix.seek(0);
        words.restart();
        break;
      case 'play':
        interaction.wakeAll();
        interaction.reset();
        table.show();
        // The tutorial says what the sign would, so only one of them does.
        if (!tableTutorial.start(teachAgain)) pinTableSign();
        teachAgain = false;
        stage.placeAt(0, 0, 4.4);
        stage.yaw = 0;
        stage.pitch = -0.22;
        break;
      case 'blind':
        blind.start();
        break;
      case 'gather':
        interaction.beginAsleep();
        break;
      case 'pulse': {
        beat.reset();
        interaction.beginAsleep('drums');
        // Clear of the skyline, whatever this song happened to build.
        const skyline = Math.max(...monuments.map((m) => m.top));
        const first = course.start(skyline + 1.9);
        stage.placeAt(first.x, first.h, first.z);
        faceTowards(stage, first, course.platforms[1]);
        sky.pin(levelLine(1), course.signSpotFor(first), { height: 0 });
        break;
      }
      case 'echo':
        // A clean sheet: the mix you are about to hear should be the walk you
        // are about to take, not whatever wandering came before it.
        interaction.wakeAll();
        interaction.reset();
        recorder.clear();
        trail.clear();
        echoNudged = false;
        break;
      default:
        // Wander is the world as it was built: whole, and nothing asleep.
        interaction.wakeAll();
        interaction.reset();
        break;
    }
  }

  stage.addEventListener('takeOrPlace', () => {
    // In Blind the same key commits to a spot instead of picking things up.
    if (blind.active) { blind.guess(); return; }
    if (inspector.active) return;
    // At the table, E moves effects; anywhere else it carries monuments.
    if (table.takeOrPlace()) return;
    if (interaction.takeOrPlace()) sky.dismiss();
  });

  // Enter: go inside the effect you are pointing at, or come back out.
  stage.addEventListener('inspect', () => {
    if (inspector.active) { inspector.close(); return; }
    const puck = table.carrying || table.aimed;
    if (!puck) return;
    if (table.carrying) table.takeOrPlace();     // set it down first
    inspector.open(puck);
  });

  // The sky acknowledges the song coming back together, then gets out of the way.
  interaction.onChange = (what) => {
    if (what === 'take') seen.carried++;
    if (what === 'place') seen.moved++;
    if (what === 'hush') seen.hushed++;
    if (what === 'wake') seen.unhushed++;
    if (what === 'solo') seen.soloed++;
    // Waking the first one proves the instruction landed.
    if (what === 'discovered') sky.dismiss();
    if (what === 'discovered' || what === 'assembled') seen.discovered++;
    // Discover's reward for finding every instrument is the table itself.
    if (what === 'assembled' && running === 'discover') {
      table.drop();
      return;
    }
    // Pulse says this itself, in its own pinned line over the last platform.
    if (what === 'assembled' && running !== 'pulse') {
      sky.announce('all of it, together');
    }
  };
  stage.addEventListener('hushOrWake', () => interaction.hushOrWake());

  // F is "listen": to one instrument alone, to one effect alone from inside
  // it, and in Discover, to an instrument for the first time.
  stage.addEventListener('soloStart', () => {
    if (inspector.active) { inspector.listen(true); return; }
    if (running === 'discover') {
      const target = interaction.nearestAny();
      if (target && interaction.sleeping.has(target.spec.name)) {
        interaction.wake(target, 0.6);
        return;
      }
    }
    interaction.startSolo();
  });
  stage.addEventListener('soloEnd', () => {
    if (inspector.active) { inspector.listen(false); return; }
    interaction.endSolo();
  });

  // Land a jump on the pad and the world goes back to how it was found.
  stage.addEventListener('land', (event) => {
    // Every landing answers the beat; only a landing on the pad resets.
    beat.land(mix.songTime(), stage.camera.position);

    if (running === 'pulse') {
      const here = stage.camera.position;
      const result = course.landed(here.x, here.z, event.detail?.altitude ?? 0);

      if (result.kind === 'ground') {
        // Fell. Back to the last disc you actually stood on, which costs you
        // the crossing and nothing else: the song never stops.
        const back = course.checkpoint;
        if (back) {
          stage.placeAt(back.x, back.h, back.z);
          const ahead = course.target;
          if (ahead && ahead !== back) faceTowards(stage, back, ahead);
        }
      } else if (result.kind === 'level') {
        interaction.wakeOne();
        const from = course.goal;      // this disc becomes the next run's start
        const more = course.nextLevel(PULSE_LEVELS);
        sky.pin(more ? levelLine(course.level) : 'all of it, together',
                course.signSpotFor(from), { height: 0 });
      }
      return;                          // the pad plays no part up here
    }

    if (blind.active) return;         // mid-round, the pad is not in play
    if (!pad.group.visible) return;   // the table has the middle in these modes
    if (!pad.contains(stage.camera.position)) return;
    pad.fire();
    interaction.reset();
    trail.clear();
  });

  dom.enter.disabled = false;
  dom.enter.textContent = 'Step inside';
  let started = false;
  dom.enter.addEventListener('click', async () => {
    const mode = currentMode();
    if (mix.playing) {
      await mix.resume();
    } else {
      mix.start();
      started = true;
    }
    // Picking a different mode from the card starts it; picking the one that
    // is already running just drops you back into it.
    startMode(mode);
    if (fromTheTop) { mix.seek(0); fromTheTop = false; }
    setPauseLabel();
    stage.enter();
  });

  // The HUD follows entering the world, not pointer lock: if the browser
  // refuses to capture the cursor the piece must still be playable.
  stage.addEventListener('enter', () => {
    dom.overlay.classList.add('hidden');
    dom.tutorial.classList.remove('away');
    dom.hud.classList.remove('hidden');
    // One frame later the pointerlockchange event has settled.
    setTimeout(() => {
      dom.controls.textContent = stage.needsDragHint
        ? 'W A S D walk · drag to look · F listen · E take · Enter inside an effect · H tutorial · Esc let go'
        : 'W A S D walk · mouse to look (- = speed) · F listen · E take · Enter inside an effect · H tutorial · Esc let go';
    }, 120);
  });
  const setPauseLabel = () => {
    dom.pause.textContent = mix.paused ? 'Play the song' : 'Stop the song';
  };
  dom.pause.addEventListener('click', async (event) => {
    event.stopPropagation();
    await mix.togglePause();
    setPauseLabel();
  });

  stage.addEventListener('exit', async () => {
    inspector.cancel();
    // Letting go stops the song too: nobody wants it playing at a menu.
    await mix.pause();
    setPauseLabel();
    dom.overlay.classList.remove('hidden');
    dom.hud.classList.add('hidden');
    // The tutorial waits behind the menu and picks up where it was.
    dom.tutorial.classList.add('away');
    dom.enter.textContent = 'Back inside';
  });

  // Handy from the devtools console while tuning the mapping:
  //   __firstsong.mix.stems.map(s => [s.spec.name, s.level])
  await renderChooser(world.id);
  bindMaker();
  window.__firstsong = {
    stage, mix, world, monuments, environment, interaction, trail, pad, sky,
    blind, beat, course, recorder, words, table, inspector, tutorial, tableTutorial, missions, seen,
    nextVisitor,
  };

  let elapsed = 0;
  /**
   * One frame of the whole world. Split from the rAF loop so it can also be
   * stepped by hand from the console (__firstsong.tick(1/60)) when the page
   * is not being painted, which is how the tutorial and the table get tested.
   */
  function tick(fixed) {
    const dt = fixed ?? Math.min(stage.clock.getDelta(), 0.05);
    elapsed += dt;

    // While a replay runs, or while you are inside an effect, something else
    // holds the camera and walking is ignored.
    const inspecting = inspector.update(dt);
    const replaying = !inspecting && recorder.update(dt);
    if (!replaying && !inspecting) {
      stage.step(dt);
      table.push(stage.camera.position);
      recorder.record(dt, mix.songTime());
    }
    table.update(dt, mix.songTime());
    interaction.update(dt);
    mix.update(stage.camera);
    if (stage.active) trail.update(stage.camera.position);
    blind.update(dt);

    // The words leave the singer, wherever the singer has been carried to,
    // and only while the singer can be heard.
    // Only in Lyrics: everywhere else the world is the band and the table.
    const lyrics = running === 'lyrics';
    words.setVisible(lyrics);
    if (lyrics) {
      if (singer) words.origin.copy(singer.group.position).setY(singer.top * 0.8);
      words.update(dt, mix.songTime(), mix.playing && (!voice || !voice.muted));
    }

    if (stage.active && !inspecting) {
      seen.walked += Math.hypot(stage.velocity.x, stage.velocity.z) * dt;
    }
    tutorial.update(dt);
    tableTutorial.update(dt);
    // Missions once there is a table to do them at and nobody is teaching.
    const missionTime = TABLE_MODES.has(running) && table.landed && !teachingNow();
    if (missionTime !== missions.active) missions.show(missionTime);
    missions.update(dt);
    beat.update(dt);
    // The course blinks on the beat, which is the only teaching Pulse does.
    if (running === 'pulse') course.update(dt, beat.offsetFrom(mix.songTime()));
    pad.update(stage.camera.position, dt, !blind.active && interaction.dirty);

    // Echo: the first instruction has faded by the time there is a walk worth
    // hearing, so say it again once, at the moment it becomes true.
    if (running === 'echo' && !echoNudged && !recorder.playing
        && recorder.seconds > 20) {
      echoNudged = true;
      sky.say('press R to walk it again', 8);
    }
    sky.update(dt);
    const energy = mix.playing
      ? Math.min(1, 1.8 * mix.stems.reduce((sum, s) => sum + (s.muted ? 0 : s.level), 0)
        / Math.max(1, mix.stems.length))
      : 0;
    environment.update(dt, stage.camera, energy);
    // One discovery at a time: while the song is still being assembled, the
    // sky says nothing about carrying.

    for (const monument of monuments) {
      const stem = byName.get(monument.spec.name);
      monument.pulse(stem ? stem.level : 0, elapsed, dt);
    }

    if (mix.playing) {
      const loudest = mix.dominant();
      dom.readout.innerHTML = mix.stems
        .map((stem) => {
          const width = Math.round(stem.level * 100);
          const held = interaction.carrying?.spec.name === stem.spec.name;
          const near = interaction.focus?.spec.name === stem.spec.name;
          const strong = held || near || stem === loudest ? ' strong' : '';
          const dot = stem.muted ? 'transparent' : stem.spec.colour;
          const ring = stem.muted ? `box-shadow:inset 0 0 0 1px ${stem.spec.colour}` : '';
          return `<div class="stem${strong}${held ? ' held' : ''}">
                    <span class="dot" style="background:${dot};${ring}"></span>
                    <span class="name">${stem.spec.name}</span>
                    <span class="bar"><i style="width:${width}%;background:${stem.spec.colour}"></i></span>
                  </div>`;
        })
        .join('');
    }

    stage.render();
  }
  window.__firstsong.tick = tick;

  function frame() {
    requestAnimationFrame(frame);
    tick();
  }
  frame();
}

boot();
