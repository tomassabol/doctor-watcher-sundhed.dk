import { expect, test } from "bun:test";
import { fetchClinic, isAcceptingNewPatients, parseClinic } from "./clinic";

const sample = { Identifier: 4766, Navn: "Sydhavnens Lægehus", AabenForTilgang: false };

test("closed clinic is not accepting", () => {
  expect(isAcceptingNewPatients(parseClinic(sample))).toBe(false);
});

test("open clinic is accepting", () => {
  expect(isAcceptingNewPatients(parseClinic({ ...sample, AabenForTilgang: true }))).toBe(true);
});

test("unexpected shape throws instead of silently reporting closed", () => {
  expect(() => parseClinic({ Navn: "x" })).toThrow();
  expect(() => parseClinic(null)).toThrow();
});

test("non-2xx response throws", async () => {
  const fakeFetch = (async () => new Response("nope", { status: 503 })) as unknown as typeof fetch;
  expect(fetchClinic("4766", fakeFetch)).rejects.toThrow("HTTP 503");
});

test.skipIf(!process.env.LIVE)("live API returns a parseable clinic", async () => {
  const clinic = await fetchClinic("4766");
  expect(clinic.Identifier).toBe(4766);
  console.log("accepting:", isAcceptingNewPatients(clinic));
});
