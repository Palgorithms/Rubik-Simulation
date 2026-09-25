// ============================================================
//  Cube.js
//  A single cubie of the Rubik's cube.
//  Each Cube knows its position (x,y,z), its logical face
//  indices (fX,fY,fZ), its current visual rotation (rX,rY,rZ),
//  and the list of stickers attached to its visible faces.
// ============================================================

class Cube {
  static Instances = [];
  static ID = 0;

  /**
   * @param {number} x,y,z    world position
   * @param {number} fX,fY,fZ logical face indices (0..level-1)
   * @param {number} size     edge length
   * @param {number} color    body color
   * @param {Array}  stickers list of {face, color}
   * @param {number} stickerRatio ratio of sticker size to cube size
   */
  constructor(x = 0, y = 0, z = 0, fX = 0, fY = 0, fZ = 0,
              size = 300, color = 200, stickers = [], stickerRatio = 0.9) {
    this.id = Cube.ID++;
    this.x = x;
    this.y = y;
    this.z = z;

    this.fX = fX;
    this.fY = fY;
    this.fZ = fZ;

    this.rX = 0;
    this.rY = 0;
    this.rZ = 0;

    this.size = size;
    this.color = color;
    this.stickerRatio = stickerRatio;

    this.stickers = [];
    this.makeStickers(stickers);

    Cube.Instances.push(this);
  }

  // -------------------- Stickers --------------------
  /**
   * Given a list of {face, color}, create sticker records
   * positioned relative to this cube.
   */
  makeStickers(stickers) {
    for (const s of stickers) {
      const pos = Cube.faceOffset(s.face, this.size);
      this.stickers.push({
        face: s.face,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        color: s.color,
      });
    }
  }

  /** Recompute each sticker's local position from its face. */
  updateStickers() {
    for (const s of this.stickers) {
      const pos = Cube.faceOffset(s.face, this.size);
      s.x = pos.x;
      s.y = pos.y;
      s.z = pos.z;
    }
  }

  /**
   * Offset of a face's sticker from the cube's center.
   * @param {string} face one of 'f','b','u','d','l','r'
   * @param {number} size cube edge length
   */
  static faceOffset(face, size) {
    const h = size / 2 + 1; // +1 to avoid z-fighting with the body
    switch (face) {
      case 'f': return { x: 0,  y: 0,  z:  h };
      case 'b': return { x: 0,  y: 0,  z: -h };
      case 'r': return { x:  h,  y: 0,  z: 0  };
      case 'l': return { x: -h,  y: 0,  z: 0  };
      case 'u': return { x: 0,  y: -h, z: 0  };
      case 'd': return { x: 0,  y:  h, z: 0  };
      default:  return { x: 0,  y: 0,  z: 0  };
    }
  }

  // -------------------- Rendering --------------------
  static renderAll() {
    for (const c of Cube.Instances) {
      push();

      translate(c.x, c.y, c.z);
      rotateX(c.rX);
      rotateY(c.rY);
      rotateZ(c.rZ);

      // Body
      stroke(0);
      fill(c.color);
      box(c.size);

      // Stickers
      noStroke();
      for (const s of c.stickers) {
        push();
        translate(s.x, s.y, s.z);
        fill(s.color);

        // Orient the sticker plane toward its face
        if (s.face === 'r' || s.face === 'l') rotateY(Math.PI / 2);
        else if (s.face === 'u' || s.face === 'd') rotateX(Math.PI / 2);

        plane(c.size * c.stickerRatio);
        pop();
      }

      pop();
    }
  }

  // -------------------- Transform --------------------
  /** Set absolute position and orientation. */
  moveCube(x, y, z, rX, rY, rZ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rX = rX;
    this.rY = rY;
    this.rZ = rZ;
  }

  // -------------------- Face Tracking --------------------
  /**
   * After a face rotation, rotate the logical faces of every
   * sticker and apply a permanent visual rotation, so the
   * cube looks like it "snapped" to the new orientation.
   */
  resetOrientation(rotatedFace) {
    const remap = (from, to) => {
      for (const s of this.stickers) {
        if (s.face === from) s.face = to;
      }
    };

    switch (rotatedFace) {
      // Rotations around the Y axis (right / left face)
      case 'r':
        this.rotateFaces([['f', 'l'], ['l', 'b'], ['b', 'r'], ['r', 'f']]);
        this.updateStickers();
        this.rY += Math.PI / 2;
        break;
      case 'l':
        this.rotateFaces([['f', 'r'], ['r', 'b'], ['b', 'l'], ['l', 'f']]);
        this.updateStickers();
        this.rY -= Math.PI / 2;
        break;

      // Rotations around the X axis (up / down face)
      case 'u':
        this.rotateFaces([['f', 'd'], ['d', 'b'], ['b', 'u'], ['u', 'f']]);
        this.updateStickers();
        this.rX += Math.PI / 2;
        break;
      case 'd':
        this.rotateFaces([['f', 'u'], ['u', 'b'], ['b', 'd'], ['d', 'f']]);
        this.updateStickers();
        this.rX -= Math.PI / 2;
        break;

      // Rotations around the Z axis (front-right / front-left)
      case 'fr':
        this.rotateFaces([['u', 'r'], ['r', 'd'], ['d', 'l'], ['l', 'u']]);
        this.updateStickers();
        this.rZ -= Math.PI / 2;
        break;
      case 'fl':
        this.rotateFaces([['u', 'l'], ['l', 'd'], ['d', 'r'], ['r', 'u']]);
        this.updateStickers();
        this.rZ += Math.PI / 2;
        break;
    }
  }

  /** Helper: apply a set of face remappings. */
  rotateFaces(pairs) {
    for (const s of this.stickers) {
      for (const [from, to] of pairs) {
        if (s.face === from) { s.face = to; break; }
      }
    }
  }
}