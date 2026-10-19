// Unit tests for the 2048 game rules.
// The original code uses browser globals, so the three rule files are loaded into
// an isolated vm context and the browser-facing collaborators are replaced by fakes
// (GameManager receives them through its constructor).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const RULE_FILES = ["tile.js", "grid.js", "game_manager.js"];
const LEFT = 3;
const RIGHT = 1;

function loadGame() {
  const context = vm.createContext({});
  for (const file of RULE_FILES) {
    const code = readFileSync(new URL(`../app/js/${file}`, import.meta.url), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  vm.runInContext(`
    function FakeInput() { this.handlers = {}; }
    FakeInput.prototype.on = function (event, fn) { this.handlers[event] = fn; };
    function FakeActuator() { this.calls = 0; }
    FakeActuator.prototype.actuate = function () { this.calls++; };
    FakeActuator.prototype.continueGame = function () {};
    function FakeStorage() { this.best = 0; this.state = null; }
    FakeStorage.prototype.getBestScore = function () { return this.best; };
    FakeStorage.prototype.setBestScore = function (s) { this.best = s; };
    FakeStorage.prototype.getGameState = function () { return this.state; };
    FakeStorage.prototype.setGameState = function (s) { this.state = s; };
    FakeStorage.prototype.clearGameState = function () { this.state = null; };
  `, context);
  return context;
}

// Builds a game whose board is exactly `rows` (rows[y][x], 0 = empty).
function gameWithBoard(rows) {
  const ctx = loadGame();
  const game = vm.runInContext("new GameManager(4, FakeInput, FakeActuator, FakeStorage)", ctx);
  game.grid = new ctx.Grid(4);
  game.score = 0;
  game.over = false;
  game.won = false;
  rows.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value) game.grid.insertTile(new ctx.Tile({ x, y }, value));
    }),
  );
  return game;
}

function row(game, y) {
  return [0, 1, 2, 3].map((x) => game.grid.cells[x][y]?.value ?? 0);
}

test("two equal tiles merge into one with the doubled value", () => {
  const game = gameWithBoard([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  game.move(LEFT);
  assert.equal(row(game, 0)[0], 4);
  assert.equal(game.score, 4);
});

test("a tile created by a merge does not merge again in the same move", () => {
  // 2+2 becomes 4 first; the existing 4 must slide next to it, not merge into 8.
  const game = gameWithBoard([
    [2, 2, 4, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  game.move(LEFT);
  assert.deepEqual(row(game, 0).slice(0, 2), [4, 4]);
  assert.equal(game.score, 4);
});

test("a move that changes nothing does not add a new tile", () => {
  const game = gameWithBoard([
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const before = JSON.stringify(game.grid.serialize());
  game.move(LEFT);
  assert.equal(JSON.stringify(game.grid.serialize()), before);
});

test("reaching the 2048 tile marks the game as won", () => {
  const game = gameWithBoard([
    [0, 0, 1024, 1024],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  game.move(RIGHT);
  assert.equal(row(game, 0)[3], 2048);
  assert.equal(game.won, true);
});

test("a full board without equal neighbours has no moves left", () => {
  const game = gameWithBoard([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);
  assert.equal(game.movesAvailable(), false);
});
