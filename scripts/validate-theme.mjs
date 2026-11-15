import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  const full = path.join(root, relativePath);
  const text = fs.readFileSync(full, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function channel(hex, index) {
  return parseInt(hex.slice(index, index + 2), 16) / 255;
}

function linear(value) {
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.slice(1, 7);
  const red = linear(channel(h, 0));
  const green = linear(channel(h, 2));
  const blue = linear(channel(h, 4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function opaque(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function foregroundOf(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.foreground === "string") return value.foreground;
  return null;
}

const pkg = readJson("package.json");
const themePath = "themes/north-pole-color-theme.json";
const theme = readJson(themePath);

if (pkg) {
  if (pkg.version !== "1.0.0") fail(`expected version 1.0.0, found ${pkg.version}`);
  if (pkg.license !== "MIT") fail("package.json license must be MIT");
  if (pkg.author !== "Matthew Finley") fail("package.json author must be Matthew Finley");
  if (!pkg.scripts?.test || !pkg.scripts?.package || !pkg.scripts?.preview) {
    fail("package.json is missing test, package, or preview scripts");
  }
  if (!pkg.devDependencies?.["@vscode/vsce"]) {
    fail("package.json is missing the @vscode/vsce dev dependency");
  }
  const contributed = pkg.contributes?.themes?.[0];
  if (contributed?.path !== `./${themePath}`) {
    fail("package.json does not point at the North Pole theme file");
  }
  if (contributed?.uiTheme !== "vs-dark") fail("North Pole must stay a dark theme");
}

if (theme) {
  if (theme.name !== "North Pole" || theme.type !== "dark") {
    fail("theme name and type must be North Pole / dark");
  }
  if (theme.semanticHighlighting !== true) {
    fail("semantic highlighting must be enabled");
  }

  const editorBackground = theme.colors?.["editor.background"];
  const editorForeground = theme.colors?.["editor.foreground"];
  if (editorBackground !== "#101816") {
    fail("editor background should stay polar night #101816");
  }
  if (!editorForeground || !opaque(editorForeground)) {
    fail("editor foreground must be an opaque hex color");
  } else if (contrast(editorForeground, editorBackground) < 7) {
    fail("editor text contrast is below 7:1");
  }
  if (!theme.colors?.["editor.selectionBackground"]) {
    fail("editor.selectionBackground is missing, so selections do not follow the theme");
  }

  const deprecated = [
    "activityBar.dropBackground",
    "editorGroup.dropBackground",
    "inputOption.activeBorder",
    "list.focusBackground",
    "list.focusForeground",
    "editorIndentGuide.background",
    "editorIndentGuide.activeBackground",
  ];
  for (const key of deprecated) {
    if (key in theme.colors) fail(`deprecated color id still set: ${key}`);
  }

  const textPairs = [
    ["button.foreground", "button.background"],
    ["activityBarBadge.foreground", "activityBarBadge.background"],
    ["badge.foreground", "badge.background"],
    ["statusBar.debuggingForeground", "statusBar.debuggingBackground"],
    ["statusBarItem.remoteForeground", "statusBarItem.remoteBackground"],
    ["statusBarItem.prominentForeground", "statusBarItem.prominentBackground"],
    ["editorLineNumber.foreground", "editor.background"],
    ["tab.inactiveForeground", "tab.inactiveBackground"],
    ["sideBar.foreground", "sideBar.background"],
    ["activityBar.inactiveForeground", "activityBar.background"],
    ["panelTitle.inactiveForeground", "panel.background"],
  ];
  for (const [fgKey, bgKey] of textPairs) {
    const fg = theme.colors[fgKey];
    const bg = theme.colors[bgKey];
    if (!opaque(fg) || !opaque(bg)) {
      fail(`${fgKey} on ${bgKey} must both be opaque hex colors`);
      continue;
    }
    const ratio = contrast(fg, bg);
    if (ratio < 4.5) {
      fail(`${fgKey} on ${bgKey} contrast is ${ratio.toFixed(2)}:1`);
    }
  }

  const seenScopes = new Set();
  for (const rule of theme.tokenColors ?? []) {
    if (!rule.scope) {
      fail(`token rule "${rule.name}" has no scope`);
      continue;
    }
    const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
    for (const scope of scopes) {
      if (seenScopes.has(scope)) fail(`duplicate token scope: ${scope}`);
      seenScopes.add(scope);
    }
    const foreground = foregroundOf(rule.settings);
    if (!foreground) continue;
    if (!opaque(foreground)) {
      fail(`token "${rule.name}" foreground must be opaque`);
      continue;
    }
    if (foreground.toLowerCase() === "#333333") {
      fail("comment-era #333333 is unreadable on this background");
    }
    const ratio = contrast(foreground, editorBackground);
    if (ratio < 4.5) {
      fail(`token "${rule.name}" contrast is ${ratio.toFixed(2)}:1`);
    }
  }

  for (const [name, value] of Object.entries(theme.semanticTokenColors ?? {})) {
    const foreground = foregroundOf(value);
    if (!foreground || !opaque(foreground)) continue;
    const ratio = contrast(foreground, editorBackground);
    if (ratio < 4.5) {
      fail(`semantic token "${name}" contrast is ${ratio.toFixed(2)}:1`);
    }
  }
}

const html = fs.readFileSync(path.join(root, "site/index.html"), "utf8");
for (const hex of ["#101816", "#ff6b81", "#5ee0a0", "#d9a441", "#e7f6ef", "#8eaa9c"]) {
  if (!html.includes(hex)) fail(`preview page is missing theme color ${hex}`);
}

const icon = fs.readFileSync(path.join(root, "img/icon.svg"));
const favicon = fs.readFileSync(path.join(root, "site/favicon.svg"));
if (!icon.equals(favicon)) fail("site favicon drifted from img/icon.svg");

const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
if (!license.includes("Copyright (c) 2026 Matthew Finley")) {
  fail("LICENSE must copyright 2026 Matthew Finley");
}
if (!license.includes("Permission is hereby granted, free of charge")) {
  fail("LICENSE must be the MIT license");
}

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (!readme.includes("npm run preview") || !readme.includes("North Pole")) {
  fail("README must explain what North Pole is and how to preview it");
}

if (fs.existsSync(path.join(root, "themes/original.json"))) {
  fail("unused starter theme themes/original.json should not ship");
}

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("North Pole theme checks passed.");
