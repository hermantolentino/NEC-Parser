// static/js/visualization.js
import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.150.1/examples/jsm/renderers/CSS2DRenderer.js';

let initialized = false;
function renderVisualization() {
  if (initialized) return;
  initialized = true;

  // Retrieve data
  const geomData = window._necGeometry || [];
  const feedMap = window._necFeedMap || {};

  // Container
  const container = document.getElementById('viz-canvas');
  container.style.position = 'relative';
  const width = container.clientWidth || window.innerWidth - 40;
  const height = 600;
  container.innerHTML = '';

  // WebGL renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.domElement.style.position = 'relative';

  // CSS2D renderer
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';

  container.appendChild(renderer.domElement);
  container.appendChild(labelRenderer.domElement);

  // Scene & camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.up.set(0, 0, 1);

  // Lighting
  scene.add(new THREE.AmbientLight(0x555555));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0, 0, 100);
  scene.add(dirLight);

  // Helpers: grid
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

  // Helpers: axes
  const axesGroup = new THREE.Group();
  const axisLabels = [];
  const axesCfg = [
    { vec: [5, 0, 0], color: 0xff0000, text: 'X' },
    { vec: [0, 5, 0], color: 0x00ff00, text: 'Y' },
    { vec: [0, 0, 5], color: 0x0000ff, text: 'Z' }
  ];
  axesCfg.forEach(cfg => {
    const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(...cfg.vec)];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: cfg.color }));
    axesGroup.add(line);
    const div = document.createElement('div');
    div.className = 'wire-label';
    div.textContent = cfg.text;
    div.style.color = '#' + cfg.color.toString(16).padStart(6,'0');
    div.style.fontWeight = 'bold';
    const lbl = new CSS2DObject(div);
    lbl.position.set(...cfg.vec);
    axesGroup.add(lbl);
    axisLabels.push(lbl);
  });
  axesGroup.rotation.x = -Math.PI/2;
  scene.add(axesGroup);

  // Prepare groups
  const wireGroup = new THREE.Group();
  const feedGroup = new THREE.Group();
  const wireMat = new THREE.LineBasicMaterial({ color: 0xff0000 });

  // Coerce and filter segments
  geomData.forEach(g => {
    if (Array.isArray(g.start)) g.start = g.start.map(v => Number(v));
    if (Array.isArray(g.end)) g.end = g.end.map(v => Number(v));
  });
  const valid = geomData.filter(g => (
    Array.isArray(g.start) && g.start.length===3 &&
    Array.isArray(g.end) &&   g.end.length===3   &&
    g.start.concat(g.end).every(n => Number.isFinite(n))
  ));

  // Draw segments
  valid.forEach(g => {
    const p1 = new THREE.Vector3(...g.start);
    const p2 = new THREE.Vector3(...g.end);
    const geom = new THREE.BufferGeometry().setFromPoints([p1,p2]);
    wireGroup.add(new THREE.Line(geom, wireMat));

    // Tag label
    const mid = new THREE.Vector3().addVectors(p1,p2).multiplyScalar(0.5);
    const div = document.createElement('div');
    div.className = 'wire-label';
    div.textContent = g.tag;
    const tagLbl = new CSS2DObject(div);
    tagLbl.position.copy(mid);
    wireGroup.add(tagLbl);

    // Feed points
    if (feedMap[g.tag]) {
      const dir = new THREE.Vector3().subVectors(p2,p1).normalize().multiplyScalar(0.1);
      [dir.clone(), dir.clone().negate()].forEach(off => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.1,16,16),
          new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        dot.position.copy(p1.clone().add(off));
        feedGroup.add(dot);
      });
    }
  });
  wireGroup.rotation.x = -Math.PI/2;
  feedGroup.rotation.x = -Math.PI/2;
  scene.add(wireGroup);
  scene.add(feedGroup);

  // Sync initial toggles
  const gcb = document.getElementById('toggle-grid');
  gridHelper.visible = gcb ? gcb.checked : true;
  const acb = document.getElementById('toggle-axes');
  axesGroup.visible = acb ? acb.checked : true;
  axisLabels.forEach(lbl => lbl.visible = axesGroup.visible);
  const fcb = document.getElementById('toggle-feed');
  feedGroup.visible = fcb ? fcb.checked : true;

  // Controls & animate
  const controls = new OrbitControls(camera, renderer.domElement);
  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  })();

  // Toggle handlers
  gcb.addEventListener('change', e => gridHelper.visible = e.target.checked);
  acb.addEventListener('change', e => {
    axesGroup.visible = e.target.checked;
    axisLabels.forEach(lbl=>lbl.visible=e.target.checked);
  });
  fcb.addEventListener('change', e => feedGroup.visible = e.target.checked);

  // Populate table
  const table = document.getElementById('wire-table');
  if (table) {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    valid.forEach(g => {
      const p1 = new THREE.Vector3(...g.start);
      const p2 = new THREE.Vector3(...g.end);
      const len = p1.distanceTo(p2).toFixed(3);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${g.tag}</td>
        <td>${len}</td>
        <td>${g.start.join(', ')}</td>
        <td>${g.end.join(', ')}</td>
        <td>${g.segments}</td>
        <td>${feedMap[g.tag] ? 'Yes' : 'No'}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

// Bind on tab click
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'visualization') setTimeout(renderVisualization,50);
    });
  });
});
