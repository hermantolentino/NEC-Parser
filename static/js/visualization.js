// static/js/visualization.js
import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.150.1/examples/jsm/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;
let gridHelper, axesGroup, wireGroup, feedGroup;
let tableBody;

export function renderVisualization() {
  initScene();
  drawWiresAndFeeds(window._necGeometry, window._necFeedMap);
  addAxes(window._necGeometry);
  fitViewToGeometry(window._necGeometry);
  populateTable(window._necGeometry, window._necFeedMap);
  animate();
}

function initScene() {
  const container = document.getElementById('viz-canvas');
  container.innerHTML = '';  // clear previous canvas

  const w = container.clientWidth,
        h = container.clientHeight;

  scene = new THREE.Scene();
  scene.up.set(0,0,1);

  camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
  camera.up.set(0,0,1);
  camera.position.set(1,1,1);

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
  gridHelper.rotation.x = Math.PI/2;
  scene.add(gridHelper);

  // Groups
  axesGroup = new THREE.Group(); scene.add(axesGroup);
  wireGroup = new THREE.Group(); scene.add(wireGroup);
  feedGroup = new THREE.Group(); scene.add(feedGroup);

  // Table body reference
  tableBody = document.querySelector('#wire-table tbody');

  window.addEventListener('resize', onWindowResize);
}

function drawWiresAndFeeds(geomData, feedMap) {
  wireGroup.clear();
  feedGroup.clear();

  const matWire = new THREE.LineBasicMaterial({ color: 0xCCCC00 });
  const matFeed = new THREE.MeshBasicMaterial({ color: 0xFF00FF });
  const feedSphere = new THREE.SphereGeometry(0.05, 8, 8);

  geomData.forEach(({ start, end, tag }) => {
    // Wire
    const pts = [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    wireGroup.add(new THREE.Line(geo, matWire));

    // Tag label at midpoint
    const mid = pts[0].clone().add(pts[1]).multiplyScalar(0.5);
    const div = document.createElement('div');
    div.className = 'wire-label';
    div.textContent = tag;
    const label = new CSS2DObject(div);
    label.position.copy(mid);
    scene.add(label);

    // Feed sphere
    if (feedMap[tag]) {
      const sph = new THREE.Mesh(feedSphere, matFeed);
      sph.position.copy(mid);
      feedGroup.add(sph);
    }
  });
}

function addAxes(geomData) {
  axesGroup.clear();

  // Find geometry extent
  let maxLen = 1;
  geomData.forEach(({ start, end }) => {
    maxLen = Math.max(
      maxLen,
      new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end))
    );
  });
  const len = maxLen * 1.2;

  const axes = [
    { dir:[1,0,0], color:0xFF0000, label:'X' },
    { dir:[0,1,0], color:0x00FF00, label:'Y' },
    { dir:[0,0,1], color:0x0000FF, label:'Z' }
  ];
  axes.forEach(({dir, color, label}) => {
    const material = new THREE.LineBasicMaterial({ color });
    const pts = [
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(...dir).multiplyScalar(len)
    ];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    axesGroup.add(new THREE.Line(g, material));

    const div = document.createElement('div');
    div.className = 'wire-label';
    div.textContent = label;
    const lbl = new CSS2DObject(div);
    lbl.position.copy(pts[1]);
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