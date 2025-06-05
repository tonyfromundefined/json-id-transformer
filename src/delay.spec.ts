import { expect, test } from "vitest";
import { delay } from "./delay";

test("넘겨준 ms만큼의 시간이 지난 뒤 Promise가 resolve됩니다", async () => {
  const t1 = performance.now();
  await delay(100);
  const t2 = performance.now();

  expect(t2 - t1).toBeGreaterThan(100);
});
