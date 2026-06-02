const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const changelogPath = path.join(repoRoot, "public", "changelog.html");
const genaiPath = path.join(repoRoot, "server", "node_modules", "@google", "genai");
let GoogleGenAI = null;

try {
  ({ GoogleGenAI } = require(genaiPath));
} catch (err) {
  GoogleGenAI = null;
}

function runGitLog() {
  const output = execSync('git log --date=short --pretty=format:"%h|%ad|%s"', {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...messageParts] = line.split("|");
      return {
        hash,
        date,
        message: messageParts.join("|").trim(),
      };
    });
}

function normalizeTitle(message) {
  const cleaned = message
    .replace(/^(feat|fix|chore|refactor|docs|style|perf|test|build|ci)(\(.+\))?!?:/i, "")
    .replace(/^\s*-\s*/g, "")
    .trim();
  if (!cleaned) {
    return message.trim();
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function classifyCommit(message) {
  const lower = message.toLowerCase();
  if (lower.includes("breaking") || /!$/.test(message.trim()) || /!:/g.test(message)) {
    return "breaking";
  }
  if (/(fix|bug|hotfix|patch|regression|error)/i.test(message)) {
    return "fix";
  }
  if (/(feat|feature|add|added|implement|introduce|launch|enable)/i.test(message)) {
    return "feature";
  }
  if (/(refactor|chore|docs|style|perf|test|build|ci|deploy|config|cleanup|format)/i.test(message)) {
    return "chore";
  }
  return "chore";
}

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLongDate(dateObj) {
  return dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildCard(commit, typeLabel, className) {
  const title = normalizeTitle(commit.message);
  const description = commit.description || commit.message;
  return `
        <article class="changelog-card">
          <header>
            <span class="tag ${className}">${typeLabel}</span>
            <span class="date">${commit.date}</span>
          </header>
          <h3>${title}</h3>
          <p>${description}</p>
          <span class="meta">Commit: ${commit.hash}</span>
        </article>`;
}

function buildCards(commits, typeLabel, className) {
  if (commits.length === 0) {
    return `
        <article class="changelog-card empty">
          <header>
            <span class="tag ${className}">${typeLabel}</span>
            <span class="date">None</span>
          </header>
          <h3>No ${typeLabel.toLowerCase()} changes recorded</h3>
          <p>No ${typeLabel.toLowerCase()} updates surfaced in the current commit history.</p>
        </article>`;
  }
  return commits.map((commit) => buildCard(commit, typeLabel, className)).join("");
}

function buildHighlights(features, fixes, chores) {
  const picks = [...features, ...fixes, ...chores].slice(0, 3);
  if (picks.length === 0) {
    return "<li>No recent highlights available.</li>";
  }
  return picks
    .map((commit) => `<li>${normalizeTitle(commit.message)}</li>`)
    .join("\n          ");
}

function generateChangelog(commits) {
  const grouped = {
    feature: [],
    fix: [],
    breaking: [],
    chore: [],
  };

  commits.forEach((commit) => {
    const type = classifyCommit(commit.message);
    grouped[type].push({
      ...commit,
      date: formatDate(commit.date),
    });
  });

  const lastUpdated = formatLongDate(new Date());
  const highlightItems = buildHighlights(grouped.feature, grouped.fix, grouped.chore);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="shortcut icon" href="./ruta-logo.svg" type="image/x-icon">
  <link rel="stylesheet" href="./styles.css">
  <link rel="stylesheet" href="./changelog.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&display=swap">
  <title>Ruta | Changelog</title>
</head>
<body>
  <header class="changelog-header">
    <div class="header-inner">
      <div class="logo-container">
        <img src="./ruta-logo.svg" alt="Ruta logo">
        <h1>Ruta</h1>
      </div>
      <div class="header-right">
        <a class="changelog-link" href="./index.html">Back to App</a>
      </div>
    </div>
  </header>

  <main class="changelog-main">
    <section class="changelog-hero">
      <div class="hero-copy">
        <p class="hero-badge">PRODUCT UPDATES</p>
        <h1>Changelog</h1>
        <p class="hero-subtitle">A clean, curated summary of the most important changes across Ruta.</p>
        <div class="hero-meta">
          <span class="meta-pill">Last updated: ${lastUpdated}</span>
          <span class="meta-pill">${commits.length} commits summarized</span>
        </div>
      </div>
      <div class="hero-panel">
        <h2>Highlights</h2>
        <ul>
          ${highlightItems}
        </ul>
      </div>
    </section>

    <section class="changelog-section" id="features">
      <div class="section-heading">
        <h2>Features</h2>
        <p>New capabilities and visible product improvements.</p>
      </div>
      <div class="changelog-grid">
${buildCards(grouped.feature, "Feature", "tag-feature")}
      </div>
    </section>

    <section class="changelog-section" id="fixes">
      <div class="section-heading">
        <h2>Bug Fixes</h2>
        <p>Quality improvements, stability fixes, and behavior corrections.</p>
      </div>
      <div class="changelog-grid">
${buildCards(grouped.fix, "Fix", "tag-fix")}
      </div>
    </section>

    <section class="changelog-section" id="breaking">
      <div class="section-heading">
        <h2>Breaking Changes</h2>
        <p>API or behavior shifts requiring migration steps.</p>
      </div>
      <div class="changelog-grid">
${buildCards(grouped.breaking, "Breaking", "tag-breaking")}
      </div>
    </section>

    <section class="changelog-section" id="chore">
      <div class="section-heading">
        <h2>Chores & Refactors</h2>
        <p>Maintenance work and deployment updates.</p>
      </div>
      <div class="changelog-grid">
${buildCards(grouped.chore, "Chore", "tag-chore")}
      </div>
    </section>
  </main>
</body>
</html>
`;
}

async function buildGeminiDescription(ai, title, message) {
  const prompt = `Write one concise changelog description sentence (max 18 words). Do not repeat the title.\nTitle: "${title}"\nCommit message: "${message}"\nOutput only the description.`;
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  const text = (result && result.text) || "";
  return text.trim() || message;
}

async function enrichDescriptions(commits) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!GoogleGenAI || !apiKey) {
    return commits.map((commit) => ({
      ...commit,
      description: commit.message,
    }));
  }

  const ai = new GoogleGenAI({ apiKey });
  const enriched = [];

  for (const commit of commits) {
    const title = normalizeTitle(commit.message);
    try {
      const description = await buildGeminiDescription(ai, title, commit.message);
      enriched.push({ ...commit, description });
    } catch (err) {
      enriched.push({ ...commit, description: commit.message });
    }
  }

  return enriched;
}

async function main() {
  const commits = runGitLog();
  const enrichedCommits = await enrichDescriptions(commits);
  const html = generateChangelog(enrichedCommits);
  fs.writeFileSync(changelogPath, html, "utf8");
  console.log("Changelog updated at public/changelog.html");
}

main().catch((err) => {
  console.error("Failed to generate changelog:", err.message);
  process.exit(1);
});
