import { randomUUID } from "node:crypto";
import { ChatGroq } from "@langchain/groq";
import { END, START, StateGraph } from "@langchain/langgraph";
import {
  OmniKernelState,
  TASK_STATUS,
  createAgentLog,
  createInitialKernelState,
} from "./state.js";
import {
  emitAgentScreenshot,
  emitAgentUpdate,
  emitDataRefined,
  emitFileCreated,
} from "../socket/index.js";
import {
  formatJsonSheet,
  formatMarkdownReport,
  saveExportFile,
} from "../services/fileService.js";
import { scrape } from "../tools/scraper.js";
import { search } from "../tools/search.js";

let model = null;

const getModel = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required to run Groq tasks.");
  }

  if (!model) {
    model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0.2,
    });
  }

  return model;
};

const getLastUserMessage = (messages = []) => {
  const userMessage = [...messages].reverse().find((message) => {
    return message.role === "user" || message._getType?.() === "human";
  });

  return typeof userMessage?.content === "string" ? userMessage.content : "";
};

const extractJson = (content) => {
  const text = Array.isArray(content)
    ? content.map((part) => part.text ?? "").join("\n")
    : String(content ?? "");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const rawJson = fenced?.[1] ?? text;
  const firstBrace = rawJson.indexOf("{");
  const lastBrace = rawJson.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Model response did not include a JSON object.");
  }

  return JSON.parse(rawJson.slice(firstBrace, lastBrace + 1));
};

const extractJsonArray = (content) => {
  const text = Array.isArray(content)
    ? content.map((part) => part.text ?? "").join("\n")
    : String(content ?? "");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const rawJson = fenced?.[1] ?? text;
  const firstBracket = rawJson.indexOf("[");
  const lastBracket = rawJson.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1) {
    throw new Error("Model response did not include a JSON array.");
  }

  return JSON.parse(rawJson.slice(firstBracket, lastBracket + 1));
};

const getSocketId = (config = {}) => {
  return config.configurable?.socketId;
};

const emitKernelLog = (socketId, agent, status, message, extra = {}) => {
  emitAgentUpdate(socketId, {
    agent,
    status,
    message,
    ...extra,
  });
};

const emitKernelError = (socketId, agent, message, extra = {}) => {
  emitKernelLog(socketId, agent, "error", message, {
    type: "error",
    ...extra,
  });
};

const emitToolStatusFrame = (socketId, { url, source, message }) => {
  emitAgentScreenshot(socketId, {
    url,
    source,
    status: "thinking",
    message,
    capturedAt: new Date().toISOString(),
  });
};

const extractSearchQuery = async ({ goal, currentStep }) => {
  const response = await getModel().invoke([
    [
      "system",
      [
        "You turn a research task into a concise Google search query.",
        "Use the user's goal and the current execution step.",
        "Return only JSON with this shape:",
        '{"query":"short search query"}',
      ].join("\n"),
    ],
    [
      "human",
      JSON.stringify(
        {
          goal,
          currentStep,
        },
        null,
        2,
      ),
    ],
  ]);

  const parsed = extractJson(response.content);
  const query = typeof parsed.query === "string" ? parsed.query.trim() : "";

  return query || currentStep || goal;
};

const formatSearchResults = (query, results) => {
  if (results.length === 0) {
    return `No organic search results found for: ${query}`;
  }

  return [
    `Search query: ${query}`,
    "",
    ...results.map((result, index) => {
      return [
        `${index + 1}. ${result.title}`,
        `URL: ${result.url}`,
        result.description ? `Summary: ${result.description}` : null,
        result.answer ? `Answer: ${result.answer}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n");
};

const normalizeHotelRecord = (hotel = {}) => ({
  hotelName: String(hotel.hotelName ?? hotel["Hotel Name"] ?? "").trim(),
  pricePerNight: String(
    hotel.pricePerNight ?? hotel["Price per Night"] ?? "",
  ).trim(),
  rating: String(hotel.rating ?? hotel.Rating ?? "").trim(),
  topReview: String(hotel.topReview ?? hotel["Top Review"] ?? "").trim(),
  bookingLink: String(hotel.bookingLink ?? hotel["Booking Link"] ?? "").trim(),
});

const normalizeSearchArtifact = (result = {}) => ({
  title: String(result.title ?? "Search result").trim(),
  description: String(result.description ?? result.answer ?? "").trim(),
  summary: String(result.description ?? result.answer ?? "").trim(),
  link: String(result.link ?? result.url ?? "").trim(),
  url: String(result.url ?? result.link ?? "").trim(),
  value: String(result.value ?? result.description ?? result.answer ?? "").trim(),
  source: String(result.source ?? "search").trim(),
  position: result.position ?? "",
});

const createSearchArtifacts = (searchResponse = {}) => {
  const sourceArtifacts = (searchResponse.results || [])
    .slice(0, 5)
    .map((result) =>
      normalizeSearchArtifact({
        ...result,
        answer: searchResponse.answer,
      }),
    );

  if (sourceArtifacts.length === 0) {
    return [
      {
        title: "No search results returned",
        summary:
          searchResponse.error ||
          searchResponse.fallbackReason ||
          "The search providers did not return results for this query.",
        source: searchResponse.provider || "search",
      },
    ];
  }

  return [
    {
      title: "AI Search Summary",
      summary: searchResponse.answer || sourceArtifacts[0].summary,
      source: searchResponse.provider || "search",
      sourceCount: sourceArtifacts.length,
    },
    ...sourceArtifacts,
  ];
};

const shouldScrapeForStep = ({ goal = "", currentStep = "", result }) => {
  if (!result?.url) {
    return false;
  }

  const text = `${goal} ${currentStep}`.toLowerCase();
  const requestsDeepRead =
    /\b(analy[sz]e|analysis|deep|scrape|crawl|read|extract|summari[sz]e|specific site|website|web page|homepage|documentation|docs|article|source|compare|review)\b/.test(
      text,
    );
  const resultLooksRelevant = Number(result.score || 0) >= 0.55 || result.position === 1;
  const lacksDetail = String(result.description || "").length < 450;

  return requestsDeepRead || (resultLooksRelevant && lacksDetail);
};

const selectScrapeTarget = ({ goal = "", currentStep = "", results = [] }) => {
  if (results.length === 0) {
    return null;
  }

  return (
    results.find((result) =>
      shouldScrapeForStep({ goal, currentStep, result }),
    ) || null
  );
};

const normalizeUniversalArtifact = (artifact = {}) => {
  const link = artifact.link || artifact.url || artifact.bookingLink || "";

  return {
    title:
      artifact.title ||
      artifact.hotelName ||
      artifact.name ||
      artifact.url ||
      "Artifact",
    description:
      artifact.description ||
      artifact.summary ||
      artifact.topReview ||
      artifact.value ||
      "",
    link,
    url: link,
    value:
      artifact.value ||
      artifact.pricePerNight ||
      artifact.price ||
      artifact.cost ||
      artifact.description ||
      artifact.summary ||
      "",
    price: artifact.price || artifact.pricePerNight || artifact.cost || "",
    markdown: artifact.markdown,
    source: artifact.source,
    position: artifact.position,
  };
};

const createScrapeArtifact = (scrapeResult = {}) => ({
  title: `Page Read: ${scrapeResult.title || scrapeResult.url}`,
  description: scrapeResult.description || `Clean Markdown extracted from ${scrapeResult.url}.`,
  summary: scrapeResult.description || `Clean Markdown extracted from ${scrapeResult.url}.`,
  link: scrapeResult.url,
  url: scrapeResult.url,
  value: scrapeResult.markdown,
  markdown: scrapeResult.markdown,
  source: scrapeResult.source || "firecrawl",
});

const refineHotelResults = async ({ goal, currentStep, searchQuery, results }) => {
  if (results.length === 0) {
    return [];
  }

  const response = await getModel().invoke([
    [
      "system",
      [
        "You are the Executor inside Omni-Kernel.",
        "Extract clean structured data from AI-native search results.",
        "Return only a JSON array. Each object must use exactly these keys:",
        "hotelName, pricePerNight, rating, topReview, bookingLink.",
        "Fields map to: Hotel Name, Price per Night, Rating, Top Review, and Booking Link.",
        "Use the result URL as bookingLink when it appears to be a booking or hotel page.",
        "If a field is not present in the search result text, use an empty string.",
        "Do not invent prices, ratings, reviews, or links.",
      ].join("\n"),
    ],
    [
      "human",
      JSON.stringify(
        {
          goal,
          currentStep,
          searchQuery,
          searchResults: results,
        },
        null,
        2,
      ),
    ],
  ]);

  const parsed = extractJsonArray(response.content);

  return (Array.isArray(parsed) ? parsed : [])
    .map(normalizeHotelRecord)
    .filter((hotel) => hotel.hotelName || hotel.bookingLink);
};

const plannerNode = async (state, config) => {
  const socketId = getSocketId(config);

  emitKernelLog(
    socketId,
    "Planner",
    "thinking",
    "Analyzing the user goal and creating a step list.",
  );

  const userInput = state.currentTask.goal || getLastUserMessage(state.messages);

  const response = await getModel().invoke([
    [
      "system",
      [
        "You are the Planner Manager inside Omni-Kernel.",
        "Break the user's goal into a concise ordered step list for a researcher agent.",
        "Return only JSON with this shape:",
        '{"steps":["step one","step two"]}',
      ].join("\n"),
    ],
    ["human", userInput],
  ]);

  const parsed = extractJson(response.content);
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.filter((step) => typeof step === "string" && step.trim())
    : [];

  const safeSteps = steps.length > 0 ? steps : [userInput];

  emitKernelLog(
    socketId,
    "Planner",
    "completed",
    `Created ${safeSteps.length} execution step(s).`,
  );

  return {
    messages: [
      {
        role: "assistant",
        name: "planner",
        content: `Created ${safeSteps.length} execution step(s).`,
      },
    ],
    currentTask: {
      goal: userInput,
      steps: safeSteps,
      currentStepIndex: 0,
      status: TASK_STATUS.EXECUTING,
      isComplete: false,
    },
    agentLogs: [
      createAgentLog("planner", "Step list created.", {
        steps: safeSteps,
      }),
    ],
  };
};

const executorNode = async (state, config) => {
  const socketId = getSocketId(config);
  const { steps = [], currentStepIndex = 0 } = state.currentTask;
  const currentStep = steps[currentStepIndex];

  emitKernelLog(
    socketId,
    "Executor",
    "thinking",
    currentStep
      ? `Executing step ${currentStepIndex + 1}: ${currentStep}`
      : "Checking for the next executable step.",
  );

  if (!currentStep) {
    emitKernelLog(
      socketId,
      "Executor",
      "completed",
      "No executable step was found.",
    );

    return {
      currentTask: {
        status: TASK_STATUS.REVIEWING,
      },
      agentLogs: [
        createAgentLog("executor", "No executable step was found."),
      ],
    };
  }

  const searchQuery = await extractSearchQuery({
    goal: state.currentTask.goal,
    currentStep,
  });

  emitKernelLog(
    socketId,
    "Executor",
    "thinking",
    `Searching the web for: ${searchQuery}`,
  );
  emitToolStatusFrame(socketId, {
    url: `omni://search?q=${encodeURIComponent(searchQuery)}`,
    source: "tavily",
    message: `Searching with Tavily: ${searchQuery}`,
  });

  let searchResponse;

  try {
    searchResponse = await search(searchQuery, {
      includeAnswer: true,
      maxResults: 5,
    });
  } catch (error) {
    emitKernelError(
      socketId,
      "Executor",
      `Search failed: ${error.message || "Unknown search error."}`,
    );
    throw error;
  }

  if (searchResponse.error) {
    emitKernelError(socketId, "Executor", searchResponse.error, {
      provider: searchResponse.provider,
      fallbackReason: searchResponse.fallbackReason,
    });
  } else if (searchResponse.fallbackReason) {
    emitKernelLog(
      socketId,
      "Executor",
      "completed",
      `Tavily fallback used: ${searchResponse.fallbackReason}`,
    );
  }

  const searchCardItems = createSearchArtifacts(searchResponse);

  emitDataRefined(socketId, {
    agent: "Researcher",
    action: "found this",
    items: searchCardItems.map(normalizeUniversalArtifact),
  });

  const searchResults = searchResponse.results.map((result) => ({
    ...result,
    answer: searchResponse.answer,
  }));
  let scrapeArtifact = null;
  const scrapeTarget = selectScrapeTarget({
    goal: state.currentTask.goal,
    currentStep,
    results: searchResults,
  });

  if (scrapeTarget) {
    emitKernelLog(
      socketId,
      "Scraper",
      "thinking",
      `Reading ${scrapeTarget.url} with Firecrawl.`,
    );
    emitToolStatusFrame(socketId, {
      url: scrapeTarget.url,
      source: "firecrawl",
      message: `Reading page with Firecrawl: ${scrapeTarget.title}`,
    });

    try {
      const scrapeResult = await scrape(scrapeTarget.url);
      scrapeArtifact = normalizeUniversalArtifact(
        createScrapeArtifact(scrapeResult),
      );

      emitDataRefined(socketId, {
        agent: "Scraper",
        action: "read this",
        items: [scrapeArtifact],
      });

      emitKernelLog(
        socketId,
        "Scraper",
        "completed",
        `Extracted clean Markdown from ${scrapeResult.url}.`,
      );
    } catch (error) {
      emitKernelError(
        socketId,
        "Scraper",
        `Firecrawl failed: ${error.message || "Unable to scrape source."}`,
        {
          url: scrapeTarget.url,
        },
      );
    }
  }

  if (!scrapeTarget && searchResults.length > 0) {
    emitToolStatusFrame(socketId, {
      url: searchResults[0].url,
      source: searchResponse.provider,
      message: `Search result selected: ${searchResults[0].title}`,
    });
  }

  const enrichedSearchResults = scrapeArtifact
    ? [
        {
          title: scrapeArtifact.title,
          url: scrapeArtifact.url,
          description: String(scrapeArtifact.markdown || scrapeArtifact.value || "").slice(0, 4000),
          source: scrapeArtifact.source,
        },
        ...searchResults,
      ]
    : searchResults;

  let refinedHotels = [];

  try {
    refinedHotels = await refineHotelResults({
      goal: state.currentTask.goal,
      currentStep,
      searchQuery,
      results: enrichedSearchResults,
    });
  } catch (error) {
    emitKernelError(
      socketId,
      "Executor",
      `Artifact refinement failed: ${error.message || "Unable to refine results."}`,
    );
  }

  const formattedResults = formatSearchResults(searchQuery, searchResults);
  const cardItems =
    refinedHotels.length > 0
      ? refinedHotels.map(normalizeUniversalArtifact)
      : scrapeArtifact
        ? [...searchCardItems.map(normalizeUniversalArtifact), scrapeArtifact]
        : searchCardItems.map(normalizeUniversalArtifact);

  const artifact = {
    id: randomUUID(),
    type: "agent-data-refined",
    agent: "Researcher",
    stepIndex: currentStepIndex,
    step: currentStep,
    query: searchQuery,
    searchProvider: searchResponse.provider,
    searchAnswer: searchResponse.answer,
    fallbackReason: searchResponse.fallbackReason,
    sourceResults: searchResults,
    scrapedSource: scrapeArtifact,
    content: cardItems,
    createdAt: new Date().toISOString(),
  };

  if (refinedHotels.length > 0) {
    emitDataRefined(socketId, {
      agent: artifact.agent,
      action: "refined this",
      items: refinedHotels.map(normalizeUniversalArtifact),
    });
  }

  emitKernelLog(
    socketId,
    "Executor",
    "completed",
    `Refined ${cardItems.length} artifact(s) from ${searchResults.length} ${searchResponse.provider} source(s) for: ${searchQuery}`,
    {
      artifacts: [artifact],
    },
  );

  return {
    messages: [
      {
        role: "assistant",
        name: "executor",
        content:
          refinedHotels.length > 0
            ? JSON.stringify(refinedHotels, null, 2)
            : formattedResults,
      },
    ],
    currentTask: {
      currentStepIndex: currentStepIndex + 1,
      status: TASK_STATUS.REVIEWING,
    },
    agentLogs: [
      createAgentLog("executor", "Step executed.", {
        stepIndex: currentStepIndex,
        step: currentStep,
      }),
    ],
    artifacts: [artifact],
  };
};

const reviewerNode = async (state, config) => {
  const socketId = getSocketId(config);
  const { goal, steps = [], currentStepIndex = 0 } = state.currentTask;
  const completedSteps = steps.slice(0, currentStepIndex);
  const remainingSteps = steps.slice(currentStepIndex);

  emitKernelLog(
    socketId,
    "Reviewer",
    "thinking",
    "Reviewing progress and deciding whether more research is needed.",
  );

  const response = await getModel().invoke([
    [
      "system",
      [
        "You are the Reviewer inside Omni-Kernel.",
        "Decide if the task is complete based on completed steps and artifacts.",
        "If unexecuted steps remain, request more research.",
        "Return only JSON with this shape:",
        '{"isComplete":true,"review":"short reason"}',
      ].join("\n"),
    ],
    [
      "human",
      JSON.stringify(
        {
          goal,
          completedSteps,
          remainingSteps,
          artifacts: state.artifacts,
        },
        null,
        2,
      ),
    ],
  ]);

  const parsed = extractJson(response.content);
  const hasRemainingSteps = currentStepIndex < steps.length;
  const isComplete = !hasRemainingSteps || Boolean(parsed.isComplete);
  const review = parsed.review || (isComplete ? "Task complete." : "More research needed.");
  emitKernelLog(
    socketId,
    "Reviewer",
    "completed",
    review,
    isComplete ? { artifacts: state.artifacts } : {},
  );

  return {
    messages: [
      {
        role: "assistant",
        name: "reviewer",
        content: review,
      },
    ],
    currentTask: {
      status: isComplete ? TASK_STATUS.COMPLETE : TASK_STATUS.EXECUTING,
      isComplete,
      review,
    },
    agentLogs: [
      createAgentLog("reviewer", review, {
        isComplete,
        completedStepCount: completedSteps.length,
        remainingStepCount: remainingSteps.length,
      }),
    ],
  };
};

const routeAfterReview = (state) => {
  return state.currentTask.isComplete ? "writer" : "executor";
};

const shouldWriteJsonSheet = (state) => {
  const goal = String(state.currentTask.goal || "").toLowerCase();
  return /\b(json|spreadsheet|sheet|table|structured data|dataset)\b/.test(goal);
};

const writerNode = async (state, config) => {
  const socketId = getSocketId(config);
  const wantsJson = shouldWriteJsonSheet(state);
  const filename = wantsJson ? "research_report.json" : "research_report.md";
  const content = wantsJson
    ? formatJsonSheet({
        goal: state.currentTask.goal,
        review: state.currentTask.review,
        artifacts: state.artifacts,
      })
    : formatMarkdownReport({
        goal: state.currentTask.goal,
        review: state.currentTask.review,
        artifacts: state.artifacts,
      });

  emitKernelLog(
    socketId,
    "Writer",
    "thinking",
    `Formatting verified research into ${filename}.`,
  );

  const exportRecord = await saveExportFile({
    filename,
    content,
    goal: state.currentTask.goal,
    review: state.currentTask.review,
    artifacts: state.artifacts,
  });

  emitFileCreated(socketId, {
    filename: exportRecord.filename,
    metadata: exportRecord,
  });

  emitKernelLog(
    socketId,
    "System",
    "completed",
    `[System]: Deliverable generated at ${exportRecord.path}.`,
    {
      exportFile: exportRecord,
    },
  );

  return {
    messages: [
      {
        role: "assistant",
        name: "writer",
        content: `[System]: Deliverable generated at ${exportRecord.path}.`,
      },
    ],
    currentTask: {
      status: TASK_STATUS.COMPLETE,
      isComplete: true,
      exportFile: exportRecord,
    },
    agentLogs: [
      createAgentLog("writer", "Deliverable generated.", {
        filename: exportRecord.filename,
        path: exportRecord.path,
      }),
    ],
  };
};

export const buildKernelGraph = () => {
  const workflow = new StateGraph(OmniKernelState)
    .addNode("planner", plannerNode)
    .addNode("executor", executorNode)
    .addNode("reviewer", reviewerNode)
    .addNode("writer", writerNode)
    .addEdge(START, "planner")
    .addEdge("planner", "executor")
    .addEdge("executor", "reviewer")
    .addConditionalEdges("reviewer", routeAfterReview, {
      executor: "executor",
      writer: "writer",
    })
    .addEdge("writer", END);

  return workflow.compile();
};

export const kernelGraph = buildKernelGraph();

export const runKernelTask = async (userInput, socketId, options = {}) => {
  return kernelGraph.invoke(createInitialKernelState(userInput), {
    ...options,
    configurable: {
      ...options.configurable,
      socketId,
    },
  });
};
