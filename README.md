🪐 Omni-Kernel: The Agentic Virtual OS

Omni-Kernel is a high-performance, agent-driven Virtual Operating System (VOS) built to orchestrate autonomous AI agents. Unlike standard AI wrappers, Omni-Kernel uses a Kernel-Level Orchestration layer to manage a multi-agent state machine that plans, researches, verifies, and produces physical deliverables.

🚀 The Vision

Developed as a flagship project for Cubic Byte, Omni-Kernel explores the transition from "AI as a Chatbot" to "AI as an Infrastructure." It provides a glassmorphic desktop environment where AI agents collaborate in real-time to solve complex, multi-step goals.

🛠️ Technical Architecture

🧠 The Brain (Orchestration)

LangGraph State Machine: A cyclic graph architecture that manages agent hand-offs (Planner → Researcher → Reviewer → Writer).

Hybrid Inference: Powered by Groq (Llama 3.3-70B) for lightning-fast reasoning and Gemini 2.0 Flash for rigorous data verification.

📡 The Senses (Data Acquisition)

Tavily AI: Specialized AI search for high-signal retrieval.

Firecrawl: Deep-web scraping that converts raw HTML into LLM-ready Markdown.

💻 The Interface (Virtual Desktop)

React & Tailwind: A premium, responsive OS interface with window management.

Socket.io: Real-time bi-directional streaming of "Kernel Logs" and agent status pulses.

Zustand: Global state management for a seamless "Multi-Window" experience.

✨ Key Features

Autonomous File Production: The system concludes tasks by physically writing .md or .json reports to a virtual disk for user download.

Full Observability: A persistent Virtual Terminal provides a raw look into the agentic "thought process" and API interactions.

Self-Healing Loops: The Reviewer Node can re-trigger the Researcher if data quality is insufficient, ensuring high-reliability outputs.

Universal Artifact Cards: Dynamic UI components that render search results, code snippets, and data sheets.

📂 Project Structure

├── backend/
│   ├── src/kernel/       # LangGraph state logic & nodes
│   ├── src/tools/        # Tavily & Firecrawl integrations
│   ├── src/services/     # File system & persistence logic
│   └── exports/          # Autonomously generated reports
└── frontend/
    ├── src/components/   # Windowing system & OS components
    └── src/socket/       # Real-time event handlers


🛠️ Setup & Installation

Clone the repo: git clone https://github.com/your-username/omni-kernel.git

Install dependencies in both folders: npm install

Configure your .env with:

GROQ_API_KEY

GOOGLE_API_KEY

TAVILY_API_KEY

FIRECRAWL_API_KEY

Start the engine: npm start (backend) and npm run dev (frontend).

Founder: [Your Name] | Company: Cubic Byte
Technical Stack: React, Node.js, Socket.io, LangGraph, Groq, Gemini, Tavily, Firecrawl.
