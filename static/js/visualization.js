// static/js/visualization.js
import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.150.1/examples/jsm/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;
let gridHelper, axesGroup, wireGroup, feedGroup;
let tableBody;

function initScene() {
  const container = document.getElementById('viz-canvas');
  while (container.firstChild) container.removeChild(container.firstChild);

  scene = new THREE.Scene();
  scene.up.set(0, 0, 1);

  const w = container.clientWidth, h = container.clientHeight;
  camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
  camera.up.set(0, 0, 1);
  camera.position.set(0, -5, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.screenSpacePanning = false;
  controls.update();

  // Ground grid (XY plane)
  gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);

  // Axes (Z-up)
  axesGroup = new THREE.Group();
  const axisLen = 2;
  const axes = [
    { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000, label: 'X', pos: new THREE.Vector3(axisLen, 0, 0) },
    { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00, label: 'Y', pos: new THREE.Vector3(0, axisLen, 0) },
    { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff, label: 'Z', pos: new THREE.Vector3(0, 0, axisLen) }
  ];
  axes.forEach(({ dir, color, label, pos }) => {
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), axisLen, color);
    const lbl = new CSS2DObject(createLabel(label));
    lbl.position.copy(pos);
    arrow.add(lbl);
    axesGroup.add(arrow);
  });
  scene.add(axesGroup);

  wireGroup = new THREE.Group();
  feedGroup = new THREE.Group();
  scene.add(wireGroup);
  scene.add(feedGroup);

  tableBody = document.querySelector('#wire-table tbody');
}

function createLabel(text) {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text;
  div.style.color = '#fff';
  div.style.fontSize = '12px';
  return div;
}

function populateTable(geometry, feedMap) {
  tableBody.innerHTML = '';
  geometry.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.tag}</td>
      <td>${(item.length || 0).toFixed(3)}</td>
      <td>${item.start.join(', ')}</td>
      <td>${item.end.join(', ')}</td>
      <td>${item.segments}</td>
      <td>${feedMap[item.tag] ? 'Yes' : ''}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderGeometry(geometry, feedMap) {
  wireGroup.clear();
  feedGroup.clear();
  geometry.forEach(item => {
    const points = [];
    for (let i = 0; i <= item.segments; i++) {
      const t = i / item.segments;
      const x = item.start[0] + (item.end[0] - item.start[0]) * t;
      const y = item.start[1] + (item.end[1] - item.start[1]) * t;
      const z = item.start[2] + (item.end[2] - item.start[2]) * t;
      points.push(new THREE.Vector3(x, y, z));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xffff00 })
    );
    wireGroup.add(line);
    if (window._necFeedMap[item.tag]) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff00ff })
      );
      sphere.position.copy(points[Math.floor(points.length / 2)]);
      feedGroup.add(sphere);
    }
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
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}

export function renderVisualization() {
  console.log('Geometry:', window._necGeometry);
  console.log('Feed Map:', window._necFeedMap);
  initScene();
  renderGeometry(window._necGeometry, window._necFeedMap);
  populateTable(window._necGeometry, window._necFeedMap);
  animate();

  document.getElementById('toggle-grid').addEventListener('change', e => gridHelper.visible = e.target.checked);
  document.getElementById('toggle-axes').addEventListener('change', e => axesGroup.visible = e.target.checked);
  document.getElementById('toggle-feed').addEventListener('change', e => feedGroup.visible = e.target.checked);

  window.addEventListener('resize', onWindowResize);
}

window.addEventListener('DOMContentLoaded', renderVisualization);