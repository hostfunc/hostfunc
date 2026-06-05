import assert from "node:assert/strict";
import test from "node:test";

import {
  HERO_SCENE,
  type HubKind,
  NODE_COLOR,
  type NodeKind,
  buildHubEdges,
  hubById,
  seededRng,
} from "./scene-graph";

test("every node connects to an existing hub", () => {
  const hubIds = new Set(HERO_SCENE.hubs.map((h) => h.id));
  for (const node of HERO_SCENE.nodes) {
    assert.ok(hubIds.has(node.hub), `node ${node.id} references unknown hub: ${node.hub}`);
  }
});

test("hub ids are unique and cover ide/terminal/agent", () => {
  const ids = HERO_SCENE.hubs.map((h) => h.id);
  assert.equal(new Set(ids).size, ids.length);
  const expected: HubKind[] = ["ide", "terminal", "agent"];
  for (const id of expected) {
    assert.ok(ids.includes(id), `missing hub: ${id}`);
  }
});

test("node ids are unique", () => {
  const ids = HERO_SCENE.nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("node positions and scales are finite", () => {
  for (const node of HERO_SCENE.nodes) {
    for (const coord of node.position) {
      assert.ok(Number.isFinite(coord), `non-finite position on ${node.id}`);
    }
    assert.ok(Number.isFinite(node.scale) && node.scale > 0, `bad scale on ${node.id}`);
  }
});

test("color-by-kind is total over NodeKind", () => {
  const kinds: NodeKind[] = ["core", "connector", "scratch"];
  for (const kind of kinds) {
    assert.match(NODE_COLOR[kind], /^#[0-9a-f]{6}$/i, `missing color for ${kind}`);
  }
});

test("buildHubEdges resolves one spoke per node and flags ephemeral edges", () => {
  const resolved = buildHubEdges(HERO_SCENE);
  assert.equal(resolved.length, HERO_SCENE.nodes.length);
  const ephemeralCount = resolved.filter((e) => e.ephemeral).length;
  assert.ok(ephemeralCount > 0, "expected at least one ephemeral (scratch) spoke");
  for (const edge of resolved) {
    assert.equal(edge.from.length, 3);
    assert.equal(edge.to.length, 3);
    assert.match(edge.color, /^#[0-9a-f]{6}$/i);
  }
});

test("buildHubEdges drops nodes whose hub is missing", () => {
  const resolved = buildHubEdges({
    nodes: [{ id: "a", label: "a", kind: "core", hub: "ide", position: [0, 0, 0], scale: 1 }],
    hubs: [],
  });
  assert.equal(resolved.length, 0);
});

test("hubById finds hubs and returns undefined for misses", () => {
  assert.equal(hubById(HERO_SCENE, "ide")?.id, "ide");
  assert.equal(hubById({ nodes: [], hubs: [] }, "agent"), undefined);
});

test("seededRng is deterministic and in range", () => {
  const a = seededRng(42);
  const b = seededRng(42);
  for (let i = 0; i < 16; i++) {
    const v = a();
    assert.equal(v, b(), "same seed must produce same sequence");
    assert.ok(v >= 0 && v < 1, "value out of [0,1)");
  }
  assert.notEqual(seededRng(1)(), seededRng(2)(), "different seeds should differ");
});
