import type { Score } from "autoevals";

/**
 * The title lands in a narrow sidebar row, so the prompt's "3-6 words, no
 * quotes, no punctuation, no markdown" is a hard layout constraint rather than
 * a style preference. Each rule is scored separately so a regression tells you
 * which one broke.
 */
export function titleFormat({ output }: { output: string }): Score {
  const title = output.trim();
  const words = title.split(/\s+/).filter(Boolean);
  const checks = {
    wordCount: words.length >= 3 && words.length <= 6,
    noQuotes: !/^["'`]|["'`]$/.test(title),
    noTrailingPunctuation: !/[.!?,;:]$/.test(title),
    noMarkdown: !/[*_#[\]`]/.test(title),
    singleLine: !title.includes("\n"),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    name: "title_format",
    score: passed / Object.keys(checks).length,
    metadata: { ...checks, wordCount: words.length, title },
  };
}

export function mentionsDestination({ output, expected }: { output: string; expected?: string }): Score {
  const name = "mentions_destination";
  if (!expected) return { name, score: null, metadata: { skipped: "case names no destination" } };
  return {
    name,
    score: output.toLowerCase().includes(expected.toLowerCase()) ? 1 : 0,
    metadata: { expected, title: output },
  };
}
