import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  getQiblaDirection,
  parseQiblaCoordinate,
} from "../src/services/qibla.ts";

Deno.test("parseQiblaCoordinate validates input", () => {
  const parsed = parseQiblaCoordinate("-6.200000,106.816666");
  if (!parsed) throw new Error("coordinate parse failed");
  assertEquals(parsed.latitude, -6.2);
  assertEquals(parsed.longitude, 106.816666);
  assertEquals(parseQiblaCoordinate("abc"), null);
  assertEquals(parseQiblaCoordinate("-100,0"), null);
  assertEquals(parseQiblaCoordinate("0,200"), null);
});

Deno.test("getQiblaDirection returns expected degrees", () => {
  const coord = { latitude: -6.2, longitude: 106.816666 };
  const direction = getQiblaDirection(coord);
  assertAlmostEquals(direction, 295.15, 0.1);
});
