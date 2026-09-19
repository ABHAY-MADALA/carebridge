/** Build a local, indexed GLB from the CC0 MakeHuman hm08 graphical assets.
 * Run after downloading the three source files documented in public/models/README.md.
 * No MakeHuman application code is bundled or executed. */
import fs from "node:fs";
import { BufferGeometry, Float32BufferAttribute, Vector3, Box3 } from "three";

const base = fs.readFileSync("work/body-model/base.obj", "utf8");
let vertices = [], faces = [], group = "";
const joints = new Map();
for (const line of base.split("\n")) {
  const parts = line.trim().split(/\s+/);
  if (parts[0] === "v") vertices.push(parts.slice(1, 4).map(Number));
  if (parts[0] === "g") group = parts[1];
  if (parts[0] === "f") {
    const ids = parts.slice(1).map((p) => Number(p.split("/")[0]) - 1);
    if (group === "body") faces.push(ids);
    else if (group.startsWith("joint-")) joints.set(group, [...(joints.get(group) ?? []), ...ids]);
  }
}
for (const [file, weight] of [["male.target", 1], ["muscle.target", 0.7]]) {
  for (const line of fs.readFileSync(`work/body-model/${file}`, "utf8").split("\n")) {
    if (!/^\d/.test(line)) continue;
    const [i, x, y, z] = line.trim().split(/\s+/).map(Number);
    vertices[i][0] += x * weight; vertices[i][1] += y * weight; vertices[i][2] += z * weight;
  }
}
// Straighten the gently bent reference arms into a relaxed anatomical A pose.
// The distal adjustment blends continuously into the shoulder, keeping fingers.
for (const p of vertices) {
  const blend = Math.max(0, Math.min(1, (Math.abs(p[0]) - 2.25) / 2));
  p[2] -= blend * 1.55;
}
function joint(name) {
  const ids = [...new Set(joints.get(name))];
  return ids.reduce((sum, id) => sum.map((n, axis) => n + vertices[id][axis] / ids.length), [0, 0, 0]);
}
const eyes = [joint("joint-l-eye"), joint("joint-r-eye")];
// Strip helper meshes and unused vertices, then one Catmull–Clark subdivision.
const used = [...new Set(faces.flat())];
const remap = new Map(used.map((id, index) => [id, index]));
vertices = used.map((id) => vertices[id]);
faces = faces.map((face) => face.map((id) => remap.get(id)));
const avg = (points) => points.reduce((s, p) => s.map((x, a) => x + p[a] / points.length), [0, 0, 0]);
const facePoints = faces.map((f) => avg(f.map((i) => vertices[i])));
const edges = new Map(), vertexFaces = vertices.map(() => []), vertexEdges = vertices.map(() => []);
const edgeKey = (a, b) => `${Math.min(a, b)}:${Math.max(a, b)}`;
faces.forEach((f, fi) => f.forEach((a, i) => {
  vertexFaces[a].push(fi);
  const b = f[(i + 1) % f.length], key = edgeKey(a, b);
  if (!edges.has(key)) {
    edges.set(key, { a, b, faces: [] }); vertexEdges[a].push(key); vertexEdges[b].push(key);
  }
  edges.get(key).faces.push(fi);
}));
const smooth = vertices.map((p, i) => {
  const localEdges = vertexEdges[i].map((key) => edges.get(key));
  const boundary = localEdges.filter((e) => e.faces.length === 1);
  if (boundary.length) return p.map((x, a) => .75 * x + .25 * avg(boundary.map((e) => vertices[e.a === i ? e.b : e.a]))[a]);
  const f = avg(vertexFaces[i].map((fi) => facePoints[fi]));
  const r = avg(localEdges.map((e) => avg([vertices[e.a], vertices[e.b]])));
  const n = localEdges.length;
  return p.map((x, a) => (f[a] + 2 * r[a] + (n - 3) * x) / n);
});
for (const e of edges.values()) {
  e.index = smooth.length;
  smooth.push(avg([vertices[e.a], vertices[e.b], ...e.faces.map((fi) => facePoints[fi])]));
}
const faceOffset = smooth.length;
smooth.push(...facePoints);
const triangles = [];
faces.forEach((f, fi) => f.forEach((v, i) => {
  const next = edges.get(edgeKey(v, f[(i + 1) % f.length])).index;
  const prev = edges.get(edgeKey(v, f[(i + f.length - 1) % f.length])).index;
  triangles.push(v, next, faceOffset + fi, v, faceOffset + fi, prev);
}));
const box = new Box3().setFromPoints(smooth.map((p) => new Vector3(...p)));
const scale = 1.8 / (box.max.y - box.min.y);
const centerZ = (box.min.z + box.max.z) / 2;
const transform = (p) => [p[0] * scale, (p[1] - box.min.y) * scale, (p[2] - centerZ) * scale];
const positions = new Float32Array(smooth.flatMap(transform));
const geometry = new BufferGeometry();
geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
geometry.setIndex(triangles); geometry.computeVertexNormals(); geometry.computeBoundingBox();
const indices = new Uint32Array(triangles);
const normals = geometry.attributes.normal.array;
const buffers = [Buffer.from(positions.buffer), Buffer.from(normals.buffer), Buffer.from(indices.buffer)];
const offsets = [0, buffers[0].length, buffers[0].length + buffers[1].length];
const bin = Buffer.concat(buffers);
const doc = {
  asset: { version: "2.0", generator: "HealthThread model preparation", copyright: "MakeHuman graphical assets, CC0 1.0" },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: "CareBridgeHuman", mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2 }] }],
  buffers: [{ byteLength: bin.length }],
  bufferViews: buffers.map((b, i) => ({ buffer: 0, byteOffset: offsets[i], byteLength: b.length, target: i === 2 ? 34963 : 34962 })),
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
    { bufferView: 2, componentType: 5125, count: indices.length, type: "SCALAR" },
  ],
  extras: { eyes: eyes.map(transform) },
};
const jsonRaw = JSON.stringify(doc), json = Buffer.from(jsonRaw.padEnd(Math.ceil(jsonRaw.length / 4) * 4));
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const chunk = (data, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(data.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, data]); };
fs.writeFileSync("public/models/carebridge-human.glb", Buffer.concat([header, chunk(json, 0x4e4f534a), chunk(bin, 0x004e4942)]));
console.log({ vertices: positions.length / 3, triangles: indices.length / 3, bytes: bin.length, bounds: doc.accessors[0], eyes: doc.extras.eyes });
