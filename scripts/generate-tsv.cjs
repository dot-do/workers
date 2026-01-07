const fs = require("fs");
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
            description: (pkg.description || "-").replace(/\t/g, " ").replace(/\n/g, " ")
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
}

results.sort((a, b) => a.name.localeCompare(b.name));

const tsv = ["name\tversion\tdescription", ...results.map(r => `${r.name}\t${r.version}\t${r.description}`)].join("\n");
fs.writeFileSync("packages.tsv", tsv);
console.log(`Created packages.tsv with ${results.length} packages`);
