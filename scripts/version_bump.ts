#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

import { parse } from "https://deno.land/std@0.170.0/flags/mod.ts";

/**
 * Version Bump Script for ApiMuslim
 * Usage:
 *   deno run scripts/version_bump.ts patch   # v3.0.0 -> v3.0.1
 *   deno run scripts/version_bump.ts minor   # v3.0.0 -> v3.0.1 -> v3.1.0
 *   deno run scripts/version_bump.ts major   # v3.0.0 -> v3.1.0 -> v4.0.0
 */

const args = parse(Deno.args);
const bumpType = args._[0]?.toString()?.toLowerCase() || "patch";

const configPath = "./src/config.ts";
const changelogPath = "./CHANGELOG.md";

// Read the current version from config.ts
const configFile = await Deno.readTextFile(configPath);
const versionMatch = configFile.match(/APP_VERSION = "(v\d+\.\d+\.\d+)"/);

if (!versionMatch) {
  console.error("Error: Could not find version in config.ts");
  Deno.exit(1);
}

const currentVersion = versionMatch[1];
console.log(`Current version: ${currentVersion}`);

// Parse the version numbers
const versionParts = currentVersion.substring(1).split(".").map(Number);
let [major, minor, patch] = versionParts;

// Increment based on bump type
switch (bumpType) {
  case "major":
    major++;
    minor = 0;
    patch = 0;
    break;
  case "minor":
    minor++;
    patch = 0;
    break;
  case "patch":
    patch++;
    break;
  default:
    console.error(
      `Error: Invalid bump type. Use 'major', 'minor', or 'patch'. Got: ${bumpType}`,
    );
    Deno.exit(1);
}

const newVersion = `v${major}.${minor}.${patch}`;
console.log(`New version: ${newVersion}`);

// Update the config file
const newConfigFile = configFile.replace(
  /APP_VERSION = "v\d+\.\d+\.\d+"/,
  `APP_VERSION = "${newVersion}"`,
);

await Deno.writeTextFile(configPath, newConfigFile);
console.log(`Updated ${configPath} to version ${newVersion}`);

// Update the changelog
try {
  const changelogContent = await Deno.readTextFile(changelogPath);
  const today = new Date().toISOString().split("T")[0];
  const newChangelogEntry =
    `## ${newVersion} — ${today}\n\n- Version bump to ${newVersion}\n\n${changelogContent}`;
  await Deno.writeTextFile(changelogPath, newChangelogEntry);
  console.log(`Updated ${changelogPath} with new version entry`);
} catch (error) {
  console.error(`Warning: Could not update changelog: ${error.message}`);
}

console.log(
  `Version successfully bumped from ${currentVersion} to ${newVersion}!`,
);
