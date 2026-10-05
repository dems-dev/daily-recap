// Deep-merges a JSON patch { id: {...}, en: {...} } into messages/*.json.
// Usage: node scripts/merge-messages.cjs patch.json
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS build script */
const fs = require("fs");
const patch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v;
  }
  return a;
};
for (const [locale, values] of Object.entries(patch)) {
  const file = `messages/${locale}.json`;
  const current = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(file, JSON.stringify(merge(current, values), null, 2) + "\n");
}
