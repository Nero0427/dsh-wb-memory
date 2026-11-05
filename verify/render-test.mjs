import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectWorkbuddyRoot, readSources, renderInjectText, sourceStamp } from "../src/lib/render.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = detectWorkbuddyRoot();
console.log("root =", root);
if (!root) process.exit(1);

const sources = readSources(root);
console.log("files =", Object.keys(sources.files).join(","), "| topics =", sources.topics.length, "| missing =", sources.missing.join(",") || "无");

const result = renderInjectText(sources, { maxBytes: 60000, topicsMode: "index", projectMemory: true });
const out = path.join(here, "preview.md");
fs.writeFileSync(out, result.text, "utf8");

console.log("bytes =", result.bytes, "/", result.maxBytes, "| truncated =", result.truncated);
console.log("sections =", { soul: result.stats.soul, user: result.stats.user, memory: result.stats.memory });
console.log("stamp =", new Date(sourceStamp(root)).toISOString());
console.log("written ->", out);
