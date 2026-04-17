const fs = require("fs");
const path = require("path");

const root = process.cwd();
const REPO = process.env.GITHUB_REPOSITORY || "Pedrospecian/br-remote-devs-talents";
const BASE_URL = `https://github.com/${REPO}/blob/main`;

const GROUPS = {
  ".NET Development": [".NET"],
  "Frontend Development": ["Angular", "React", "Vue"],
  "Backend Development": ["Java", "NodeJs", "Python"],
  "Mobile Development": ["Flutter", "React Native", "iOS"],
  "DevOps and Infrastructure": ["Cloud Platform Engineer", "Devops", "SRE"],
  "Database and Data": ["Oracle"],
  "Quality Assurance": ["QA"],
};

const techToGroup = {};
for (const [group, techs] of Object.entries(GROUPS)) {
  for (const tech of techs) techToGroup[tech] = group;
}

// --- Scan ---
const SKIP = new Set(["node_modules", "scripts", ".github", ".git"]);
const groups = {};
for (const g of Object.keys(GROUPS)) groups[g] = {};

fs.readdirSync(root).forEach((tech) => {
  const techPath = path.join(root, tech);
  if (!fs.statSync(techPath).isDirectory()) return;
  if (SKIP.has(tech)) return;
  if (tech.startsWith(".") && !techToGroup[tech]) return;

  const group = techToGroup[tech];
  if (!group) return;

  const techData = (groups[group][tech] = {});

  fs.readdirSync(techPath).forEach((entry) => {
    const entryPath = path.join(techPath, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      const files = fs.readdirSync(entryPath).filter((f) => f.endsWith(".pdf"));
      if (files.length) techData[entry] = files;
    } else if (entry.endsWith(".pdf")) {
      (techData["_root"] = techData["_root"] || []).push(entry);
    }
  });

  if (!Object.keys(techData).length) delete groups[group][tech];
});

for (const g of Object.keys(groups)) {
  if (!Object.keys(groups[g]).length) delete groups[g];
}

// --- Helpers ---
function formatName(file) {
  return file
    .replace(/\.pdf$/i, "")
    .replace(/^CV[\s.]/i, "")
    .replace(/^Resume\s/i, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+Resume\b.*/i, "")
    .replace(/\s+CV\b.*/i, "")
    .replace(/\s+curriculum\b.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUrl(tech, level, file) {
  const parts = level === "_root" ? [tech, file] : [tech, level, file];
  return `${BASE_URL}/${parts.map(encodeURIComponent).join("/")}`;
}

// --- Build markdown ---
const lines = ["## Complete Talent Directory", ""];

for (const [group, techs] of Object.entries(groups)) {
  lines.push(`### ${group}`, "");

  for (const [tech, levels] of Object.entries(techs)) {
    if (Object.keys(techs).length > 1) lines.push(`#### ${tech}`, "");

    lines.push("| Developer | Level | Resume |", "| :--- | :--- | :--- |");

    for (const [level, files] of Object.entries(levels)) {
      for (const file of files) {
        lines.push(
          `| ${formatName(file)} | ${level === "_root" ? "—" : level} | [View](${buildUrl(tech, level, file)}) |`
        );
      }
    }

    lines.push("");
  }
}

const section = lines.join("\n");

// --- Patch README ---
const readmePath = path.join(root, "README.md");
const readme = fs.readFileSync(readmePath, "utf8");

const start = readme.indexOf("## Complete Talent Directory");
const end = readme.indexOf("\n## ", start + 1);

if (start === -1) {
  console.error("Section not found in README.md");
  process.exit(1);
}

const patched =
  readme.slice(0, start) +
  section +
  "\n" +
  (end !== -1 ? readme.slice(end) : "");

fs.writeFileSync(readmePath, patched);
console.log("README.md updated");
