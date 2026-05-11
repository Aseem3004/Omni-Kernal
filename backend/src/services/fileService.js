import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const EXPORTS_DIR = path.resolve(__dirname, "../../exports");
const DEFAULT_REPORT_FILENAME = "research_report.md";
const ALLOWED_EXTENSIONS = new Set([".json", ".md"]);

const isAllowedExport = (filename) => {
  return ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase());
};

const sanitizeFilename = (filename = DEFAULT_REPORT_FILENAME) => {
  const safeName = path.basename(filename).replace(/[<>:"/\\|?*]/g, "_");
  return isAllowedExport(safeName) ? safeName : DEFAULT_REPORT_FILENAME;
};

const createDisplayName = (goal = "Research Report") => {
  const title = String(goal)
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return title || "Research Report";
};

const getArtifactItems = (artifact = {}) => {
  if (Array.isArray(artifact.content)) {
    return artifact.content;
  }

  if (Array.isArray(artifact.results)) {
    return artifact.results;
  }

  if (Array.isArray(artifact.sourceResults)) {
    return artifact.sourceResults;
  }

  return artifact.content ? [artifact.content] : [];
};

const stringifyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

export const formatMarkdownReport = ({ goal, review, artifacts = [] }) => {
  const lines = [
    `# ${createDisplayName(goal)}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Objective",
    "",
    goal || "No objective was provided.",
    "",
    "## Reviewer Summary",
    "",
    review || "Task verified by Reviewer.",
    "",
    "## Findings",
    "",
  ];

  if (artifacts.length === 0) {
    lines.push("No research artifacts were produced.", "");
  }

  artifacts.forEach((artifact, artifactIndex) => {
    const title = artifact.query || artifact.step || artifact.title || `Artifact ${artifactIndex + 1}`;
    const items = getArtifactItems(artifact);

    lines.push(`### ${artifactIndex + 1}. ${title}`, "");

    if (artifact.step) {
      lines.push(`Step: ${artifact.step}`, "");
    }

    if (artifact.searchAnswer) {
      lines.push(artifact.searchAnswer, "");
    }

    items.forEach((item, itemIndex) => {
      const itemTitle =
        item.title ||
        item.hotelName ||
        item.name ||
        item.url ||
        item.bookingLink ||
        `Finding ${itemIndex + 1}`;
      const link = item.url || item.link || item.bookingLink || "";
      const description =
        item.description || item.summary || item.topReview || item.value || "";

      lines.push(`- **${itemTitle}**`);

      if (description) {
        lines.push(`  - Detail: ${stringifyValue(description)}`);
      }

      if (item.price || item.pricePerNight || item.rating) {
        lines.push(
          `  - Metadata: ${[
            item.price || item.pricePerNight ? `Price: ${item.price || item.pricePerNight}` : "",
            item.rating ? `Rating: ${item.rating}` : "",
          ]
            .filter(Boolean)
            .join("; ")}`,
        );
      }

      if (link) {
        lines.push(`  - Source: ${link}`);
      }
    });

    lines.push("");
  });

  return lines.join("\n");
};

export const formatJsonSheet = ({ goal, review, artifacts = [] }) => {
  return JSON.stringify(
    {
      id: randomUUID(),
      displayName: `${createDisplayName(goal)}.json`,
      savedAt: new Date().toISOString(),
      goal,
      review,
      artifacts,
    },
    null,
    2,
  );
};

export const saveExportFile = async ({
  filename = DEFAULT_REPORT_FILENAME,
  content,
  goal = "",
  review = "",
  artifacts = [],
  contentType,
}) => {
  const safeFilename = sanitizeFilename(filename);
  const filePath = path.join(EXPORTS_DIR, safeFilename);
  const extension = path.extname(safeFilename).toLowerCase();

  await mkdir(EXPORTS_DIR, { recursive: true });
  await writeFile(filePath, content, "utf8");

  const fileStats = await stat(filePath);
  const record = {
    id: randomUUID(),
    filename: safeFilename,
    displayName: safeFilename,
    goal,
    review,
    savedAt: fileStats.mtime.toISOString(),
    artifactCount: Array.isArray(artifacts) ? artifacts.length : 0,
    size: fileStats.size,
    extension,
    contentType:
      contentType || (extension === ".json" ? "application/json" : "text/markdown"),
    path: `/exports/${safeFilename}`,
    downloadUrl: `/api/download/${encodeURIComponent(safeFilename)}`,
  };

  return record;
};

export const listExportFiles = async () => {
  const entries = await readdir(EXPORTS_DIR, { withFileTypes: true }).catch(
    (error) => {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    },
  );

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isAllowedExport(entry.name))
      .map(async (entry) => {
        const filePath = path.join(EXPORTS_DIR, entry.name);
        const fileStats = await stat(filePath);
        const extension = path.extname(entry.name).toLowerCase();
        let metadata = {};

        if (extension === ".json") {
          try {
            metadata = JSON.parse(await readFile(filePath, "utf8"));
          } catch {
            metadata = {};
          }
        }

        return {
          filename: entry.name,
          displayName: metadata.displayName || entry.name,
          goal: metadata.goal || "Saved deliverable",
          savedAt: metadata.savedAt || fileStats.mtime.toISOString(),
          artifactCount: Array.isArray(metadata.artifacts)
            ? metadata.artifacts.length
            : Number(metadata.artifactCount || 0),
          size: fileStats.size,
          extension,
          path: `/exports/${entry.name}`,
          downloadUrl: `/api/download/${encodeURIComponent(entry.name)}`,
        };
      }),
  );

  files.sort((left, right) => {
    return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
  });

  return files;
};

export const getExportFilePath = (filename) => {
  const safeFilename = sanitizeFilename(filename);

  if (safeFilename !== filename || !isAllowedExport(safeFilename)) {
    return null;
  }

  return path.join(EXPORTS_DIR, safeFilename);
};

export const readJsonExport = async (filename) => {
  const filePath = getExportFilePath(filename);

  if (!filePath || path.extname(filePath).toLowerCase() !== ".json") {
    throw Object.assign(new Error("Only JSON exports can be opened."), {
      statusCode: 400,
    });
  }

  return JSON.parse(await readFile(filePath, "utf8"));
};
