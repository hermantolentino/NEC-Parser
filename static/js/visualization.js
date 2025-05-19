// static/js/visualization.js
import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.150.1/examples/jsm/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;
let gridHelper, axesGroup, wireGroup, feedGroup;
let tableBody;

// helper to clear all children of a group
function clearGroup(group) {
  while (group.children.length) {
    group.remove(group.children[0]);
  }
}

export function renderVisualization() {
  initScene();
  drawWiresAndFeeds(window._necGeometry, window._necFeedMap);
  addAxes(window._necGeometry);

  // — ensure CSS2D axis-labels follow the toggle on initial render —
  const tAxes0 = document.getElementById('toggle-axes');
  axesGroup.children.forEach(child => {
    // CSS2DObject is imported at top
    if (child instanceof CSS2DObject) {
      child.visible = tAxes0.checked;
    }
  });

  fitViewToGeometry(window._necGeometry);
  populateTable(window._necGeometry, window._necFeedMap);
  animate();
}

function initScene() {
  const container = document.getElementById('viz-canvas');
  container.innerHTML = '';  // clear previous canvas

  const w = container.clientWidth, h = container.clientHeight;

  scene = new THREE.Scene();
  scene.up.set(0, 0, 1);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.up.set(0, 0, 1);
  camera.position.set(1, 1, 1);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.enableDamping = true;

  // Grid (XY plane)
  gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);

  // Groups
  axesGroup = new THREE.Group();  scene.add(axesGroup);
  wireGroup = new THREE.Group();  scene.add(wireGroup);
  feedGroup = new THREE.Group();  scene.add(feedGroup);

  tableBody = document.querySelector('#wire-table tbody');

  //
  // BIND TOGGLES ONCE
  //
  const tGrid = document.getElementById('toggle-grid');
  tGrid.addEventListener('change', () => gridHelper.visible = tGrid.checked);
  gridHelper.visible = tGrid.checked;

  const tFeed = document.getElementById('toggle-feed');
  tFeed.addEventListener('change', () => feedGroup.visible = tFeed.checked);
  feedGroup.visible = tFeed.checked;

  const tAxes = document.getElementById('toggle-axes');
  tAxes.addEventListener('change', () => {
    axesGroup.visible = tAxes.checked;
    // toggle CSS2DObject.visible so CSS2DRenderer skips them
    axesGroup.children.forEach(child => {
      if (child instanceof CSS2DObject) {
        child.visible = tAxes.checked;
      }
    });
    });
  axesGroup.visible = tAxes.checked;

  window.addEventListener('resize', onWindowResize);
}

export function drawWiresAndFeeds(geomData, feedMap) {
  clearGroup(wireGroup);
  clearGroup(feedGroup);

  const matWire = new THREE.LineBasicMaterial({ color: 0xCCCC00 });
  const matFeed = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
  const feedSphere = new THREE.SphereGeometry(0.05, 8, 8);

  geomData.forEach(({ start, end, tag }) => {
    // draw the wire
    const pts = [ new THREE.Vector3(...start), new THREE.Vector3(...end) ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    wireGroup.add(new THREE.Line(geo, matWire));

    // label the wire
    const mid = pts[0].clone().add(pts[1]).multiplyScalar(0.5);
    const div = document.createElement('div');
    div.className = 'wire-label';
    div.textContent = tag;
    const label = new CSS2DObject(div);
    label.position.copy(mid);
    scene.add(label);

    // feed point (red sphere)
    if (feedMap[tag]) {
      const sph = new THREE.Mesh(feedSphere, matFeed);
      sph.position.copy(mid);
      feedGroup.add(sph);
    }
  });
}

export function addAxes(geomData) {
  clearGroup(axesGroup);

  // determine a good axis length
  let maxLen = 1;
  geomData.forEach(({ start, end }) => {
    const d = new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end));
    maxLen = Math.max(maxLen, d);
  });
  const len = maxLen * 1.2;

  const axes = [
    { dir: [1, 0, 0], color: 0xFF0000, label: 'X' },
    { dir: [0, 1, 0], color: 0x00FF00, label: 'Y' },
    { dir: [0, 0, 1], color: 0x0000FF, label: 'Z' },
  ];

  axes.forEach(({ dir, color, label }) => {
    // the line itself
    const start = new THREE.Vector3(0, 0, 0);
    const end   = new THREE.Vector3(...dir).multiplyScalar(len);
    const geo   = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat   = new THREE.LineBasicMaterial({ color });
    axesGroup.add(new THREE.Line(geo, mat));

    // the CSS2D label
    const div = document.createElement('div');
    div.className = 'axis-label';
    div.textContent = label;
    const lbl = new CSS2DObject(div);
    lbl.position.copy(end);
    axesGroup.add(lbl);
  });
}

function fitViewToGeometry(geomData) {
  const box = new THREE.Box3();
  geomData.forEach(({ start, end }) => {
    box.expandByPoint(new THREE.Vector3(...start));
    box.expandByPoint(new THREE.Vector3(...end));
  });
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length()/2;

  camera.position.copy(
    center.clone().add(new THREE.Vector3(1,1,1).multiplyScalar(radius*2))
  );
  controls.target.copy(center);
  controls.update();
}

function populateTable(geomData, feedMap) {
  tableBody.innerHTML = '';
  geomData.forEach(({ tag, length, start, end, segments }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tag}</td>
      <td>${(length||0).toFixed(3)}</td>
      <td>${start.join(', ')}</td>
      <td>${end.join(', ')}</td>
      <td>${segments}</td>
      <td>${feedMap[tag] ? 'Yes' : ''}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function onWindowResize() {
  const container = document.getElementById('viz-canvas');
  const w = container.clientWidth, h = container.clientHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  labelRenderer.setSize(w,h);
}