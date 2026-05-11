import { FirecrawlClient } from "firecrawl";

const DEFAULT_MARKDOWN_LIMIT = 12000;

const trimMarkdown = (markdown = "", limit = DEFAULT_MARKDOWN_LIMIT) => {
  const cleanMarkdown = String(markdown).trim();

  if (cleanMarkdown.length <= limit) {
    return cleanMarkdown;
  }

  return `${cleanMarkdown.slice(0, limit).trim()}\n\n...`;
};

export const scrape = async (url, options = {}) => {
  if (!url || typeof url !== "string") {
    throw new Error("scrape requires a URL.");
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const client = new FirecrawlClient({
    apiKey: process.env.FIRECRAWL_API_KEY,
    timeoutMs: options.timeout ?? 30000,
    maxRetries: 1,
  });
  const document = await client.scrape(url, {
    formats: ["markdown"],
    onlyMainContent: true,
    timeout: options.timeout ?? 30000,
  });
  const markdown = trimMarkdown(
    document.markdown || document.content || "",
    options.maxMarkdownChars,
  );

  if (!markdown) {
    throw new Error("Firecrawl returned no Markdown content.");
  }

  return {
    title: document.metadata?.title || document.title || url,
    description:
      document.metadata?.description ||
      `Clean Markdown extracted from ${document.metadata?.sourceURL || url}.`,
    link: document.metadata?.sourceURL || document.url || url,
    url: document.metadata?.sourceURL || document.url || url,
    markdown,
    value: markdown,
    metadata: document.metadata || {},
    source: "firecrawl",
  };
};
