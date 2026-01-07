const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dirs = ["sdks", "packages", "objects", "snippets", "workers", "startups", "integrations"];
const results = [];

for (const dir of dirs) {
  try {
    const files = execSync(`find ${dir} -maxdepth 3 -name "package.json" -not -path "*/node_modules/*"`, {encoding: "utf-8"})
      .trim()
      .split("\n")
      .filter(Boolean);

    for (const file of files) {
      try {
        const pkg = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (pkg.private !== true && pkg.name) {
          results.push({
            name: pkg.name,
            version: pkg.version || "0.0.0",
            description: (pkg.description || "-").substring(0, 70),
            dir: path.dirname(file).split("/")[0]
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
}

results.sort((a, b) => a.name.localeCompare(b.name));

console.log("| Package | Version | Description |");
console.log("|---------|---------|-------------|");
for (const r of results) {
  console.log(`| \`${r.name}\` | ${r.version} | ${r.description} |`);
}
console.log(`\n**Total: ${results.length} packages**`);
