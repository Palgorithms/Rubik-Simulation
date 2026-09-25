// ============================================================
//  Rubik's Cube — p5.js
//  A 3x3x3 Rubik's cube rendered in 3D with animated face turns,
//  a face selector, and a random scramble generator.
// ============================================================

// -------------------- Canvas --------------------
let isShort = false;
let half = false;

const canvasHeight = document.body.clientHeight;
const canvasWidth = isShort
  ? half
    ? (canvasHeight * 9) / 8
    : (canvasHeight * 9) / 16
  : document.body.clientWidth;

// -------------------- Debug --------------------
let Debug = true;

// -------------------- Rubik State --------------------
const Rubik = {
  level: 3,
  size: 300,
  gap: 3,
  cubes: [],

  // Face definitions in the order: up, down, right, left, front, back
  faces: [
    { face: 'u', color: '#fff' },     // Up
    { face: 'd', color: 'yellow' },   // Down
    { face: 'r', color: 'orange' },   // Right
    { face: 'l', color: 'red' },      // Left
    { face: 'f', color: 'blue' },     // Front
    { face: 'b', color: 'green' },    // Back
  ],

  animationSpeed: (Math.PI / 180) * 12,
  moving: false,

  rotation: {
    level: null,
    axis: null,
    isClockwise: null,
    angle: 0,
  },
};

// -------------------- UI --------------------
let buttons = [];
let faceSelector;
let faceTitle;

// -------------------- Formula / Scramble --------------------
const formula = ['f', 'f', 'u', 'l', 'rp', 'f', 'f', 'lp', 'r', 'u', 'f', 'f'];
let formulaIndex = 0;

const maxMoves = 80;
const randomMoves = [];
let randomMovesIndex = 0;

for (let i = 0; i < maxMoves; i++) {
  randomMoves.push({
    level: Math.floor(Math.random() * Rubik.level),
    axis: Math.floor(Math.random() * Rubik.level),
    isClockwise: Math.floor(Math.random() * 2),
  });
}

// -------------------- Setup --------------------
function setup() {
  createCanvas(canvasWidth, canvasHeight, WEBGL);
  rectMode(CENTER);
  angleMode(RADIANS);
  camera(-400, -400, 700);

  buildRubik();
  buildMoveButtons();
  buildFaceSelector();
}

// -------------------- Draw --------------------
function draw() {
  orbitControl();
  background(255);
  fill(255);

  drawFaceArrow();

  processRubik();
  Cube.renderAll();
}

// ============================================================
//  Cube construction
// ============================================================
function buildRubik() {
  const { level, size, gap } = Rubik;
  const cell = size / level;
  const half = size / 2;

  for (let z = 0; z < level; z++) {
    for (let y = 0; y < level; y++) {
      for (let x = 0; x < level; x++) {
        // Only create the outer shell of cubes
        const isShell =
          x === 0 || y === 0 || z === 0 ||
          x === level - 1 || y === level - 1 || z === level - 1;
        if (!isShell) continue;

        const cx = x * cell - (half - cell / 2);
        const cy = y * cell - (half - cell / 2);
        const cz = z * cell - (half - cell / 2);

        Rubik.cubes.push(new Cube(
          cx, cy, cz,
          x, y, z,
          cell - gap / 2,
          0,
          getStickersForCube(x, y, z, level),
          0.9
        ));
      }
    }
  }
}

/** Return the stickers for a cube at (x,y,z) based on its position. */
function getStickersForCube(x, y, z, level) {
  const stickers = [];
  const push = (faceIndex) =>
    stickers.push({
      face: Rubik.faces[faceIndex].face,
      color: Rubik.faces[faceIndex].color,
    });

  if (y === 0)          push(0); // Up
  if (y === level - 1)  push(1); // Down
  if (x === level - 1)  push(2); // Right
  if (x === 0)          push(3); // Left
  if (z === level - 1)  push(4); // Front
  if (z === 0)          push(5); // Back

  return stickers;
}

// ============================================================
//  Rotations
// ============================================================
function rotateRubik(level, axis, isClockwise = true) {
  if (Rubik.moving) return false;
  Rubik.rotation = { level, axis, isClockwise, angle: 0 };
  Rubik.moving = true;
  return true;
}

function processRubik() {
  if (!Rubik.moving) return;

  const isFirstFrame = Rubik.rotation.angle === 0;
  Rubik.rotation.angle += Rubik.animationSpeed;

  let isLastFrame = false;
  if (Rubik.rotation.angle >= Math.PI / 2) {
    Rubik.rotation.angle = Math.PI / 2;
    Rubik.moving = false;
    isLastFrame = true;
  }

  const { level, axis, isClockwise, angle } = Rubik.rotation;

  if (axis === 0) rotateAroundX(level, isClockwise, angle, isFirstFrame, isLastFrame);
  else if (axis === 1) rotateAroundY(level, isClockwise, angle, isFirstFrame, isLastFrame);
  else rotateAroundZ(level, isClockwise, angle, isFirstFrame, isLastFrame);
}

function rotateAroundX(level, isClockwise, angle, isFirstFrame, isLastFrame) {
  const sign = isClockwise ? -1 : 1;
  for (const c of Rubik.cubes) {
    if (c.fX !== level) continue;

    if (isFirstFrame) { c.SY = c.y; c.SZ = c.z; }

    const a = GetAngle(0, 0, c.SY, c.SZ) + sign * angle;
    const d = dist(0, 0, c.SY, c.SZ);
    c.moveCube(c.x, cos(a) * d, sin(a) * d, sign * angle, 0, 0);

    if (isLastFrame) {
      if (isClockwise) {
        const FZ = c.fZ;
        c.fZ = abs(c.fY - (Rubik.level - 1));
        c.fY = FZ;
        c.resetOrientation('u');
      } else {
        const FY = c.fY;
        c.fY = abs(c.fZ - (Rubik.level - 1));
        c.fZ = FY;
        c.resetOrientation('d');
      }
    }
  }
}

function rotateAroundY(level, isClockwise, angle, isFirstFrame, isLastFrame) {
  const sign = isClockwise ? 1 : -1;
  for (const c of Rubik.cubes) {
    if (c.fY !== level) continue;

    if (isFirstFrame) { c.SX = c.x; c.SZ = c.z; }

    const a = GetAngle(0, 0, c.SX, c.SZ) + sign * angle;
    const d = dist(0, 0, c.SX, c.SZ);
    c.moveCube(cos(a) * d, c.y, sin(a) * d, 0, -sign * angle, 0);

    if (isLastFrame) {
      if (isClockwise) {
        const FX = c.fX;
        c.fX = abs(c.fZ - (Rubik.level - 1));
        c.fZ = FX;
        c.resetOrientation('r');
      } else {
        const FZ = c.fZ;
        c.fZ = abs(c.fX - (Rubik.level - 1));
        c.fX = FZ;
        c.resetOrientation('l');
      }
    }
  }
}

function rotateAroundZ(level, isClockwise, angle, isFirstFrame, isLastFrame) {
  const sign = isClockwise ? 1 : -1;
  for (const c of Rubik.cubes) {
    if (c.fZ !== level) continue;

    if (isFirstFrame) { c.SX = c.x; c.SY = c.y; }

    const a = GetAngle(0, 0, c.SX, c.SY) + sign * angle;
    const d = dist(0, 0, c.SX, c.SY);
    c.moveCube(cos(a) * d, sin(a) * d, c.z, 0, 0, sign * angle);

    if (isLastFrame) {
      if (isClockwise) {
        const FX = c.fX;
        c.fX = abs(c.fY - (Rubik.level - 1));
        c.fY = FX;
        c.resetOrientation('fr');
      } else {
        const FY = c.fY;
        c.fY = abs(c.fX - (Rubik.level - 1));
        c.fX = FY;
        c.resetOrientation('fl');
      }
    }
  }
}

// ============================================================
//  Move parsing
// ============================================================
function MoveRubik(move) {
  const f = faceSelector.value();

  // Remap move based on selected face
  if (f === 'B') {
    if (move === 'r')  move = 'l';
    else if (move === 'rp') move = 'lp';
    else if (move === 'l')  move = 'r';
    else if (move === 'lp') move = 'rp';
    else if (move === 'f')  move = 'b';
    else if (move === 'fp') move = 'bp';
    else if (move === 'b')  move = 'f';
    else if (move === 'bp') move = 'fp';
    else if (move === 'm')  move = 'mp';
    else if (move === 'mp') move = 'm';
  } else if (f === 'R') {
    if (move === 'r')  move = 'b';
    else if (move === 'rp') move = 'bp';
    else if (move === 'l')  move = 'f';
    else if (move === 'lp') move = 'fp';
    else if (move === 'f')  move = 'r';
    else if (move === 'fp') move = 'rp';
    else if (move === 'b')  move = 'l';
    else if (move === 'bp') move = 'lp';
    else if (move === 'm')  move = 'dmp';
    else if (move === 'mp') move = 'dm';
  } else if (f === 'L') {
    if (move === 'r')  move = 'f';
    else if (move === 'rp') move = 'fp';
    else if (move === 'l')  move = 'b';
    else if (move === 'lp') move = 'bp';
    else if (move === 'f')  move = 'l';
    else if (move === 'fp') move = 'lp';
    else if (move === 'b')  move = 'r';
    else if (move === 'bp') move = 'rp';
    else if (move === 'm')  move = 'dm';
    else if (move === 'mp') move = 'dmp';
  }

  switch (move) {
    case 'r':  return rotateRubik(2, 0, false);
    case 'rp': return rotateRubik(2, 0, true);
    case 'l':  return rotateRubik(0, 0, true);
    case 'lp': return rotateRubik(0, 0, false);
    case 'u':  return rotateRubik(0, 1, true);
    case 'up': return rotateRubik(0, 1, false);
    case 'd':  return rotateRubik(2, 1, false);
    case 'dp': return rotateRubik(2, 1, true);
    case 'f':  return rotateRubik(2, 2, true);
    case 'fp': return rotateRubik(2, 2, false);
    case 'b':  return rotateRubik(0, 2, false);
    case 'bp': return rotateRubik(0, 2, true);
    case 'm':  return rotateRubik(1, 0, true);
    case 'mp': return rotateRubik(1, 0, false);
    case 'dm': return rotateRubik(1, 2, false);
    case 'dmp':return rotateRubik(1, 2, true);
  }
}

// ============================================================
//  UI construction
// ============================================================
function buildMoveButtons() {
  const labels = ['R', "R'", 'U', "U'", 'L', "L'", 'D', "D'", 'F', "F'", 'B', "B'", 'M', "M'"];

  for (const label of labels) {
    const b = createButton(label);
    b.addClass('rubikBtn');
    buttons.push(b);
  }

  buttons.forEach((b, i) => {
    const spacing = 70;
    const totalWidth = buttons.length * spacing;
    b.position(
      canvasWidth / 2 + i * spacing - totalWidth / 2,
      canvasHeight - 150
    );
    b.mousePressed(() => {
      const move = b.html().toLowerCase().replace("'", 'p');
      MoveRubik(move);
    });
  });
}

function buildFaceSelector() {
  faceSelector = createSelect();
  faceSelector.option('F');
  faceSelector.option('R');
  faceSelector.option('L');
  faceSelector.option('B');
  faceSelector.position(canvasWidth / 2 - 250, 130);
  faceSelector.changed(() => {
    faceSelector.elt.blur();
  })

  faceTitle = createP('Front Face');
  faceTitle.style('color', '#000');
  faceTitle.position(canvasWidth / 2 - 570, 100);
}

// ============================================================
//  Visuals
// ============================================================
function drawFaceArrow() {
  const s = Rubik.size;
  switch (faceSelector.value()) {
    case 'F':
      draw3DArrow(0, -s, s / 3, 0, -s, -s / 3);
      break;
    case 'B':
      draw3DArrow(0, -s, -s / 3, 0, -s, s / 3);
      break;
    case 'R':
      draw3DArrow(s / 3, -s, 0, -s / 3, -s, 0);
      break;
    case 'L':
      draw3DArrow(-s / 3, -s, 0, s / 3, -s, 0);
      break;
  }
}

function draw3DArrow(x1, y1, z1, x2, y2, z2, col = '#f00', weight = 10) {
  push();
  stroke(col);
  strokeWeight(weight);
  line(x1, y1, z1, x2, y2, z2);

  const yaw = Math.atan2(x2 - x1, z2 - z1);
  const pitch = Math.atan2(
    y2 - y1,
    Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
  );

  fill(col);
  translate(x2, y2, z2);
  rotateY(yaw);
  rotateX(-pitch + Math.PI / 2);
  noStroke();
  cone(weight * 2, weight * 4);
  pop();
}

// ============================================================
//  Helpers
// ============================================================
function GetAngle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function isLerpFinished(current, target, tolerance = 0.001) {
  return Math.abs(current - target) < tolerance;
}

// ============================================================
//  Input
// ============================================================
function keyPressed(e){
  if(e.key === 'd'){
    Debug = !Debug;
  }
  if(e.code === 'KeyR'){
    if(e.shiftKey)
      MoveRubik('rp')
    else
      MoveRubik('r')
  }
  if(e.code === 'KeyF'){
    if(e.shiftKey)
      MoveRubik('fp')
    else
      MoveRubik('f')
  }
  if(e.code === 'KeyL'){
    if(e.shiftKey)
      MoveRubik('lp')
    else
      MoveRubik('l')
  }
  if(e.code === 'KeyU'){
    if(e.shiftKey)
      MoveRubik('up')
    else
      MoveRubik('u')
  }
  if(e.code === 'KeyD'){
    if(e.shiftKey)
      MoveRubik('dp')
    else
      MoveRubik('d')
  }
  if(e.code === 'KeyB'){
    if(e.shiftKey)
      MoveRubik('bp')
    else
      MoveRubik('b')
  }
  if(e.code === 'KeyM'){
    if(e.shiftKey)
      MoveRubik('mp')
    else
      MoveRubik('m')
  }
}
