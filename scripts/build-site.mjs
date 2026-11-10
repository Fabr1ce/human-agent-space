import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked, Renderer } from "marked";
import { listAdapters } from "../dist/src/adapters/registry.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(repositoryRoot, "site-dist");
const pages = [
  { source: "README.md", destination: "README.html", title: "Human-Agent Space" },
  {
    source: "docs/ADAPTERS.md",
    destination: "docs/ADAPTERS.html",
    title: "Built-in Agent Adapters",
  },
];
const adapterStartMarker = "<!-- HAS:BEGIN-ADAPTERS -->";
const adapterEndMarker = "<!-- HAS:END-ADAPTERS -->";
const repositorySourceUrl =
  "https://github.com/Fabr1ce/human-agent-space/blob/main/";
const renderer = new Renderer();

renderer.html = ({ text }) => escapeHtml(text);

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function validateAdapterDocumentation(adapters, documentation) {
  const start = documentation.indexOf(adapterStartMarker);
  const end = documentation.indexOf(adapterEndMarker);

  if (start < 0 || end <= start) {
    throw new Error("Adapter documentation is missing its registry markers.");
  }

  const section = documentation.slice(start, end);
  const headings = [...section.matchAll(/^## (.+)$/gm)];
  const documentedLabels = headings.map(([, label]) => label).sort();
  const adapterLabels = adapters.map(({ label }) => label).sort();

  if (
    documentedLabels.length !== adapterLabels.length ||
    documentedLabels.some((label, index) => label !== adapterLabels[index])
  ) {
    throw new Error(
      `Adapter documentation does not match the registry. Registry: ${adapterLabels.join(", ")}. Documented: ${documentedLabels.join(", ")}.`,
    );
  }

  for (const [index, heading] of headings.entries()) {
    const adapter = adapters.find(({ label }) => label === heading[1]);
    const capabilities = adapter.capabilities();
    const nextHeading = headings[index + 1];
    const body = section.slice(
      heading.index + heading[0].length,
      nextHeading?.index ?? section.length,
    );
    const verification =
      capabilities.verified[0].toUpperCase() + capabilities.verified.slice(1);
    const capabilitySummary =
      `**Capabilities:** path-scoped rules: ${capabilities.pathScopedRules ? "yes" : "no"}; ` +
      `native skills: ${capabilities.nativeSkills ? "yes" : "no"}.`;

    for (const root of [capabilities.instructionRoot, capabilities.skillRoot]) {
      if (!body.includes(root)) {
        throw new Error(
          `Adapter documentation for ${adapter.label} is missing ${root}.`,
        );
      }
    }

    if (!body.includes(`**Verification:** ${verification}`)) {
      throw new Error(
        `Adapter documentation for ${adapter.label} has stale verification status.`,
      );
    }

    if (!body.includes(capabilitySummary)) {
      throw new Error(
        `Adapter documentation for ${adapter.label} has stale capability information.`,
      );
    }
  }
}

function resolveLinks(html) {
  return html.replace(/href="([^"]+)"/g, (_match, href) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) {
      return `href="${href}"`;
    }

    const [path, ...fragmentParts] = href.split("#");
    const fragment = fragmentParts.length > 0 ? `#${fragmentParts.join("#")}` : "";
    const target =
      path === "docs/ADAPTERS.md"
        ? "docs/ADAPTERS.html"
        : `${repositorySourceUrl}${path}`;
    return `href="${target}${fragment}"`;
  });
}

function renderPage(title, destination, content) {
  const prefix = destination.startsWith("docs/") ? "../" : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Human-Agent Space project documentation.">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${prefix}docs.css">
  </head>
  <body>
    <nav aria-label="Site navigation">
      <a href="${prefix}index.html">Home</a>
      <a href="${prefix}README.html">Project documentation</a>
      <a href="${prefix}docs/ADAPTERS.html">Supported agents</a>
    </nav>
    <main>
${content}
    </main>
  </body>
</html>
`;
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const adapters = listAdapters();
const adapterDocumentation = await readFile(
  join(repositoryRoot, "docs/ADAPTERS.md"),
  "utf8",
);
validateAdapterDocumentation(adapters, adapterDocumentation);
const publishedAdapterDocumentation = adapterDocumentation
  .replace(adapterStartMarker, "")
  .replace(adapterEndMarker, "");

const landingPage = await readFile(
  join(repositoryRoot, "site/index.html"),
  "utf8",
);
const adapterListPlaceholder = "<!-- GENERATED_ADAPTERS -->";
if (!landingPage.includes(adapterListPlaceholder)) {
  throw new Error("Homepage is missing the generated adapter list placeholder.");
}
const renderedAdapterList = adapters
  .map(({ label }) => `      <li>${escapeHtml(label)}</li>`)
  .join("\n");
await writeFile(
  join(outputDirectory, "index.html"),
  landingPage.replace(adapterListPlaceholder, renderedAdapterList),
);
await copyFile(
  join(repositoryRoot, "site/docs.css"),
  join(outputDirectory, "docs.css"),
);

for (const page of pages) {
  const source =
    page.source === "docs/ADAPTERS.md"
      ? publishedAdapterDocumentation
      : await readFile(join(repositoryRoot, page.source), "utf8");
  const content = resolveLinks(marked.parse(source, { renderer }));
  const destination = join(outputDirectory, page.destination);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, renderPage(page.title, page.destination, content));
}
