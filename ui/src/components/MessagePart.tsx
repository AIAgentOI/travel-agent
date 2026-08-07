import ReactMarkdown from "react-markdown";
import { isToolUIPart, getToolName, type UIMessage } from "ai";

type Part = UIMessage["parts"][number];

const TOOL_LABELS: Record<string, [running: string, done: string]> = {
  geocode: ["Looking up location…", "Located destination"],
  weather: ["Checking the forecast…", "Checked the forecast"],
  attractions: ["Finding things to do…", "Found things to do"],
  budget: ["Estimating costs…", "Estimated costs"],
  updateProfile: ["Saving your preferences…", "Saved your preferences"],
};

function toolLabel(toolName: string, state: string): string {
  const done = state === "output-available" || state === "output-error";
  const labels = TOOL_LABELS[toolName];
  if (labels) return done ? labels[1] : labels[0];
  return done ? `used ${toolName}` : `using ${toolName}`;
}

export function MessagePart({ part }: { part: Part }) {
  if (part.type === "text") {
    return <ReactMarkdown>{part.text}</ReactMarkdown>;
  }

  if (isToolUIPart(part)) {
    const done = part.state === "output-available" || part.state === "output-error";
    return (
      <span className={`tool-indicator ${done ? "done" : "running"}`}>
        {toolLabel(getToolName(part), part.state)}
      </span>
    );
  }

  return null;
}
