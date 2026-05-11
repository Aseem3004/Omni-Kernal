import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Code2,
  ExternalLink,
  Link2,
  SearchCheck,
  WalletCards,
} from "lucide-react";

const titleize = (key = "") => {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getValue = (data, matcher) => {
  const entry = Object.entries(data).find(([key, value]) => {
    return matcher(key.toLowerCase()) && value !== null && value !== undefined && value !== "";
  });

  return entry?.[1] ?? "";
};

const isUrlValue = (value) => {
  return typeof value === "string" && /^https?:\/\//i.test(value);
};

const getDisplayTitle = (data) => {
  return (
    getValue(data, (key) => key.includes("name") || key.includes("title")) ||
    getValue(data, (key) => key.includes("summary")) ||
    "Artifact"
  );
};

const getAgentIcon = (agent = "") => {
  const normalized = agent.toLowerCase();

  if (normalized.includes("planner")) {
    return CheckCircle2;
  }

  if (normalized.includes("research") || normalized.includes("executor")) {
    return SearchCheck;
  }

  return Bot;
};

const normalizeCode = (value) => {
  if (Array.isArray(value)) {
    return value.join("\n");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }

  return String(value ?? "");
};

const renderInlineMarkdown = (text) => {
  const parts = String(text).split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g);

  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);

    if (link) {
      return (
        <a
          key={`${part}-${index}`}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-2 transition hover:text-cyan-100"
        >
          {link[1]}
        </a>
      );
    }

    return part;
  });
};

function MarkdownBlock({ markdown }) {
  const lines = String(markdown)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, list) => line || list[index - 1]);

  return (
    <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
      <div className="space-y-3">
        {lines.map((line, index) => {
          if (!line.trim()) {
            return <div key={index} className="h-1" />;
          }

          if (/^#{1,3}\s+/.test(line)) {
            const depth = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#{1,3}\s+/, "");

            return (
              <p
                key={index}
                className={`font-semibold text-white ${
                  depth === 1 ? "text-base" : "text-sm"
                }`}
              >
                {renderInlineMarkdown(text)}
              </p>
            );
          }

          if (/^[-*]\s+/.test(line)) {
            return (
              <div key={index} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                <p>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</p>
              </div>
            );
          }

          if (/^\d+\.\s+/.test(line)) {
            return (
              <p key={index} className="pl-4">
                {renderInlineMarkdown(line)}
              </p>
            );
          }

          return <p key={index}>{renderInlineMarkdown(line)}</p>;
        })}
      </div>
    </div>
  );
}

const highlightCode = (code) => {
  const tokenPattern =
    /(\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|new|try|catch|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;

  return code.split(tokenPattern).map((part, index) => {
    if (!part) {
      return null;
    }

    let className = "text-slate-300";

    if (/^\/\//.test(part) || /^\/\*/.test(part)) {
      className = "text-slate-500";
    } else if (/^["'`]/.test(part)) {
      className = "text-emerald-200";
    } else if (/^\d/.test(part)) {
      className = "text-amber-200";
    } else if (/^(const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|new|try|catch|true|false|null|undefined)$/.test(part)) {
      className = "text-sky-200";
    }

    return (
      <span key={`${part}-${index}`} className={className}>
        {part}
      </span>
    );
  });
};

function CodeSnippet({ code }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-black/35">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-slate-500">
        <Code2 size={14} strokeWidth={1.8} />
        <span>Snippet</span>
      </div>
      <pre className="max-h-56 overflow-auto p-3 text-xs leading-5 text-sky-100">
        <code>{highlightCode(code)}</code>
      </pre>
    </div>
  );
}

export function UniversalArtifactCard({
  agent = "Agent",
  action = "found this",
  data,
  index = 0,
  animate = true,
}) {
  const artifact = data && typeof data === "object" ? data : { value: data };
  const AgentIcon = getAgentIcon(agent);
  const title = getDisplayTitle(artifact);
  const price = getValue(artifact, (key) => key.includes("price") || key.includes("cost"));
  const url =
    getValue(artifact, (key) => key === "url" || key.includes("link")) ||
    Object.values(artifact).find(isUrlValue);
  const code = getValue(artifact, (key) => key.includes("code") || key.includes("snippet"));
  const markdown = getValue(artifact, (key) => key.includes("markdown"));
  const details = Object.entries(artifact).filter(([key, value]) => {
    const normalizedKey = key.toLowerCase();

    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !normalizedKey.startsWith("__") &&
      normalizedKey !== "url" &&
      !normalizedKey.includes("link") &&
      !normalizedKey.includes("markdown") &&
      !normalizedKey.includes("code") &&
      !normalizedKey.includes("snippet")
    );
  });

  const MotionArticle = animate ? motion.article : "article";
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 14, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.98 },
        transition: {
          type: "spring",
          stiffness: 420,
          damping: 28,
          delay: Math.min(index * 0.06, 0.36),
        },
      }
    : {};

  return (
    <MotionArticle
      {...motionProps}
      className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/10 text-sky-100">
            <AgentIcon size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">
              {agent} {action}
            </p>
            <h3 className="mt-1 break-words text-base font-semibold leading-6 text-white">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {price && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs font-medium text-emerald-100">
              <WalletCards size={13} strokeWidth={1.8} />
              {price}
            </span>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Open link"
              aria-label="Open artifact link"
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink size={15} strokeWidth={1.8} />
            </a>
          )}
        </div>
      </div>

      {details.length > 0 && (
        <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 sm:grid-cols-2">
          {details.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs uppercase text-slate-600">
                {isUrlValue(value) && <Link2 size={12} strokeWidth={1.8} />}
                {titleize(key)}
              </dt>
              <dd className="mt-0.5 break-words">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {code && <CodeSnippet code={normalizeCode(code)} />}
      {markdown && <MarkdownBlock markdown={markdown} />}
    </MotionArticle>
  );
}
