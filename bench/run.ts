import { Bench } from "tinybench";
import { sanitize } from "../src/core/sanitize.js";

function makeShallow() {
  return { userId: 123, password: "secret123", accessToken: "abc123", name: "John Doe" };
}

function makeDeep(depth: number) {
  let obj: Record<string, unknown> = { value: "bottom", password: "secret" };
  for (let i = 0; i < depth; i++) {
    obj = { nested: obj, password: "secret", index: i };
  }
  return obj;
}

function makeLargeArray(size: number) {
  return Array.from({ length: size }, (_, i) => ({ id: i, password: "secret", token: "abc" }));
}

function makeSizedObject(approxBytes: number) {
  const obj: Record<string, unknown> = {};
  let bytes = 0;
  let i = 0;
  while (bytes < approxBytes) {
    const key = `field_${i}`;
    const value = i % 5 === 0 ? "secret-value" : `plain value number ${i}`;
    obj[key] = value;
    bytes += key.length + String(value).length;
    i++;
  }
  obj.password = "secret123";
  return obj;
}

function makeCircular() {
  const obj: Record<string, unknown> = { name: "root", password: "secret" };
  obj.self = obj;
  obj.child = { parent: obj, token: "abc" };
  return obj;
}

async function run() {
  const bench = new Bench({ time: 300 });

  const shallow = makeShallow();
  const deep = makeDeep(15);
  const largeArray = makeLargeArray(10_000);
  const size10kb = makeSizedObject(10 * 1024);
  const size100kb = makeSizedObject(100 * 1024);
  const circular = makeCircular();

  bench
    .add("shallow object", () => {
      sanitize(shallow);
    })
    .add("deeply nested object (depth 15)", () => {
      sanitize(deep);
    })
    .add("large array (10,000 items)", () => {
      sanitize(largeArray);
    })
    .add("10 KB object", () => {
      sanitize(size10kb);
    })
    .add("100 KB object", () => {
      sanitize(size100kb);
    })
    .add("circular object", () => {
      sanitize(circular);
    });

  await bench.run();

  console.table(bench.table());
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
