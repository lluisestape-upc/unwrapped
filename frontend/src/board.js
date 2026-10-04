/**
 * The asset board: every Tripo model in every world, with the prompt that
 * made it. One small offscreen renderer draws each model once to an image,
 * so the page holds dozens of models without dozens of WebGL contexts.
 *
 * Words show the object, never the lyric it was heard in.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { cacheUrl, getWorld, listWorlds } from './api.js';

const SIZE = 420;
const loader = new GLTFLoader();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#dfe8ff', '#3a3226', 1.6));
const key = new THREE.DirectionalLight('#fff3e0', 2.4);
key.position.set(3, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight('#9fc0ff', 1.2);
rim.position.set(-4, 2, -3);
scene.add(rim);
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _centre = new THREE.Vector3();

/** Load a model, frame it three-quarters on, and return a PNG of it. */
async function snapshot(url) {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  _box.setFromObject(model);
  _box.getSize(_size);
  _box.getCenter(_centre);
  model.position.sub(_centre);
  const radius = _size.length() / 2 || 1;
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.02;
  camera.position.set(distance * 0.62, distance * 0.38, distance * 0.69);
  camera.lookAt(0, 0, 0);
  camera.near = distance / 50;
  camera.far = distance * 4;
  camera.updateProjectionMatrix();

  scene.add(model);
  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL('image/png');
  scene.remove(model);
  model.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
  return image;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function card(image, title, detail, colour) {
  const figure = el('figure', 'card');
  if (colour) figure.style.setProperty('--tint', colour);
  const frame = el('div', 'frame');
  const img = el('img');
  img.alt = title;
  img.src = image;
  frame.append(img);
  figure.append(frame);
  const caption = el('figcaption');
  caption.append(el('b', '', title));
  if (detail) caption.append(el('span', '', detail));
  figure.append(caption);
  return figure;
}

async function renderWorld(summary, root) {
  const world = await getWorld(summary.id);
  const base = cacheUrl(world.id);
  const section = el('section', 'world');
  const head = el('div', 'world-head');
  head.append(el('h2', '', world.title));
  head.append(el('p', 'meta',
    `${world.mix.tempo} BPM · key ${world.mix.key} · ${world.stems.length} instruments`
    + (world.words?.length ? ` · ${world.words.length} sung objects` : '')));
  section.append(head);

  const instruments = el('div', 'grid instruments');
  section.append(instruments);
  root.append(section);

  let models = 0;
  for (const stem of world.stems) {
    if (!stem.model) continue;
    try {
      const image = await snapshot(`${base}${stem.model}`);
      instruments.append(card(image, stem.name, stem.prompt, stem.colour));
      models++;
    } catch (error) {
      console.warn(`board: ${world.id}/${stem.name}`, error);
    }
  }

  const words = (world.words || []).filter((w) => w.model);
  if (words.length) {
    section.append(el('h3', 'sub', 'Objects from the lyrics'));
    const grid = el('div', 'grid words');
    section.append(grid);
    for (const word of words) {
      try {
        const image = await snapshot(`${base}${word.model}`);
        grid.append(card(image, word.key, word.phrase));
        models++;
      } catch (error) {
        console.warn(`board: ${world.id}/${word.key}`, error);
      }
    }
  }
  if (!models) section.remove();
  return models;
}

async function main() {
  const root = document.getElementById('worlds');
  const count = document.getElementById('count');
  const worlds = await listWorlds();
  let total = 0;
  let songs = 0;
  for (const summary of worlds) {
    const models = await renderWorld(summary, root);
    total += models;
    if (models) songs++;
    count.textContent = `${total} Tripo models across ${songs} song${songs === 1 ? '' : 's'}`;
  }
}

main().catch((error) => {
  document.getElementById('worlds').textContent = `Could not load the worlds: ${error.message}`;
  console.error(error);
});
