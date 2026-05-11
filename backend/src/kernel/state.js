import { randomUUID } from "node:crypto";
import { Annotation } from "@langchain/langgraph";

const appendArray = (left = [], right = []) => {
  if (!right) {
    return left;
  }

  return left.concat(Array.isArray(right) ? right : [right]);
};

const mergeObject = (left = {}, right = {}) => ({
  ...left,
  ...right,
});

export const TASK_STATUS = {
  PLANNING: "planning",
  EXECUTING: "executing",
  REVIEWING: "reviewing",
  COMPLETE: "complete",
};

export const OmniKernelState = Annotation.Root({
  messages: Annotation({
    reducer: appendArray,
    default: () => [],
  }),

  currentTask: Annotation({
    reducer: mergeObject,
    default: () => ({
      goal: "",
      steps: [],
      currentStepIndex: 0,
      status: TASK_STATUS.PLANNING,
      isComplete: false,
      review: "",
    }),
  }),

  agentLogs: Annotation({
    reducer: appendArray,
    default: () => [],
  }),

  artifacts: Annotation({
    reducer: appendArray,
    default: () => [],
  }),
});

export const createAgentLog = (agent, message, metadata = {}) => ({
  id: randomUUID(),
  agent,
  message,
  metadata,
  timestamp: new Date().toISOString(),
});

export const createInitialKernelState = (userInput) => ({
  messages: [
    {
      role: "user",
      content: userInput,
    },
  ],
  currentTask: {
    goal: userInput,
    steps: [],
    currentStepIndex: 0,
    status: TASK_STATUS.PLANNING,
    isComplete: false,
    review: "",
  },
  agentLogs: [
    createAgentLog("kernel", "Task received.", {
      goal: userInput,
    }),
  ],
  artifacts: [],
});
