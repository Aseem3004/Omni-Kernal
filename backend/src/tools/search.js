import { tavily } from "@tavily/core";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SUMMARY = "No summary was returned for this search.";

const stripHtml = (value = "") => {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeSearchResult = (result = {}, index, source) => {
  const link = result.url || result.link || "";
  const description = stripHtml(
    result.content ||
      result.rawContent ||
      result.snippet ||
      result.description ||
      "",
  );

  return {
    title: result.title || link || "Untitled result",
    description,
    link,
    url: link,
    value: description,
    displayedUrl: result.displayedUrl || result.displayedLink || link,
    position: index + 1,
    score: result.score,
    source,
  };
};

const parseDuckDuckGoResults = (raw) => {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const searchWithTavily = async (query, options) => {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const client = tavily({
    apiKey: process.env.TAVILY_API_KEY,
  });

  const response = await client.search(query, {
    includeAnswer: options.includeAnswer,
    maxResults: options.maxResults,
    searchDepth: "basic",
  });
  const results = (response.results || [])
    .slice(0, options.maxResults)
    .map((result, index) => normalizeSearchResult(result, index, "tavily"))
    .filter((result) => result.url);

  return {
    answer: response.answer || results[0]?.description || DEFAULT_SUMMARY,
    query: response.query || query,
    provider: "tavily",
    results,
  };
};

const searchWithDuckDuckGo = async (query, options, fallbackReason) => {
  const tool = new DuckDuckGoSearch({
    maxResults: options.maxResults,
  });
  const rawResults = await tool.invoke(query);
  const results = parseDuckDuckGoResults(rawResults)
    .slice(0, options.maxResults)
    .map((result, index) => normalizeSearchResult(result, index, "duckduckgo"))
    .filter((result) => result.url);

  return {
    answer: results[0]?.description || DEFAULT_SUMMARY,
    query,
    provider: "duckduckgo",
    fallbackReason,
    results,
  };
};

export const search = async (query, options = {}) => {
  if (!query || typeof query !== "string") {
    throw new Error("search requires a non-empty query.");
  }

  const searchOptions = {
    includeAnswer: options.includeAnswer ?? true,
    maxResults: options.maxResults ?? DEFAULT_MAX_RESULTS,
  };

  try {
    return await searchWithTavily(query, searchOptions);
  } catch (error) {
    const fallbackReason = error.message || "Tavily search failed.";

    try {
      return await searchWithDuckDuckGo(query, searchOptions, fallbackReason);
    } catch (fallbackError) {
      return {
        answer: DEFAULT_SUMMARY,
        query,
        provider: "duckduckgo",
        fallbackReason,
        error: fallbackError.message || "DuckDuckGo fallback failed.",
        results: [],
      };
    }
  }
};
