// news-image-20261126: THE WORLD front page for Thursday 26 November 2026.
//
// The entry is a broadsheet image (entry.png, 1024x1024) summing up the
// day's world news: the Houthi claim of a strike on Saudi Arabia's Ras
// Tanura refinery and the Brent crude jump to $94.61, Trump's new tariff
// salvo on 14 trading partners and the Nasdaq slide, plus the day's other
// stories. This program simply copies that image to /output/entry.png.
//
// Node 22, standard library only. No network access, no randomness, no
// clock reads: the same input bytes always produce the same output bytes,
// so two runs agree byte for byte.
//
// Local check (outside the grader container), where MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A PNG starts with these 8 bytes and ends with the 12-byte IEND chunk.
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IEND_CHUNK = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const WANTED_WIDTH = 1024;
const WANTED_HEIGHT = 1024;
const BYTE_LIMIT = 1024 * 1024;

function fail(message) {
  process.stderr.write("main.ts: " + message + "\n");
  process.exit(1);
}

// Check a buffer is a complete PNG of the size the competition allows.
// Returns a description of the first problem found, or null when it is fine.
function checkPng(bytes, name) {
  if (bytes.length < SIGNATURE.length + IEND_CHUNK.length + 25) {
    return name + " is too short to be a PNG (" + bytes.length + " bytes)";
  }
  if (!bytes.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
    return name + " does not begin with the PNG signature";
  }
  if (!bytes.subarray(bytes.length - IEND_CHUNK.length).equals(IEND_CHUNK)) {
    return name + " does not end with the IEND trailer";
  }
  if (bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString("latin1") !== "IHDR") {
    return name + " has no valid IHDR chunk";
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== WANTED_WIDTH || height !== WANTED_HEIGHT) {
    return name + " is " + width + "x" + height + ", expected " +
      WANTED_WIDTH + "x" + WANTED_HEIGHT;
  }
  if (bytes.length > BYTE_LIMIT) {
    return name + " is " + bytes.length + " bytes, over the 1 MiB limit";
  }
  return null;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const folder = dirname(fileURLToPath(import.meta.url));
const sourceFile = join(folder, "entry.png");
const outputFolder = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const outputFile = join(outputFolder, "entry.png");

// Never let the destination be the source itself: writing the copy over
// the original would destroy the entry if anything failed halfway.
if (outputFile === sourceFile) {
  fail("output path is the same as the source entry.png (" + sourceFile + ")");
}

if (!existsSync(sourceFile)) {
  fail("entry.png is missing next to main.ts (" + sourceFile + ")");
}

let original;
try {
  original = readFileSync(sourceFile);
} catch (err) {
  fail("cannot read " + sourceFile + ": " + err.message);
}
const originalProblem = checkPng(original, "entry.png");
if (originalProblem !== null) {
  fail(originalProblem);
}

try {
  mkdirSync(outputFolder, { recursive: true });
} catch (err) {
  fail("cannot create " + outputFolder + ": " + err.message);
}
try {
  writeFileSync(outputFile, original);
} catch (err) {
  fail("cannot write " + outputFile + ": " + err.message);
}

let written;
try {
  written = readFileSync(outputFile);
} catch (err) {
  fail("cannot read back " + outputFile + ": " + err.message);
}
const writtenProblem = checkPng(written, "copied entry.png");
if (writtenProblem !== null) {
  fail(writtenProblem);
}
if (written.length !== original.length) {
  fail("copy size changed: source " + original.length + " bytes, copy " +
    written.length + " bytes");
}
if (sha256(written) !== sha256(original)) {
  fail("copy bytes differ from source (sha256 mismatch)");
}

process.stdout.write(
  "wrote " + outputFile + " (" + written.length + " bytes, " +
  WANTED_WIDTH + "x" + WANTED_HEIGHT + " PNG, sha256 " + sha256(written) + ")\n",
);
