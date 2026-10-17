// Pure helper: how far back must the history service look to satisfy every
// enabled rule in a pack. Kept pure so it can be unit-tested and so the DB layer
// never has to understand the rule DSL.

import type { Condition, HistorySelector, RulesPack } from "./schemas";

function visit(
  condition: Condition,
  visitSelector: (selector: HistorySelector) => void
): void {
  if ("history" in condition) {
    visitSelector(condition.history);
    return;
  }
  if ("field" in condition) return;
  const group = condition;
  for (const child of group.all ?? group.any ?? []) {
    visit(child, visitSelector);
  }
}

/** Max `window_minutes` over enabled rules (section 7). 0 when none use history. */
export function requiredHistoryWindow(pack: RulesPack): number {
  let max = 0;
  for (const rule of pack.rules) {
    if (!rule.enabled) continue;
    visit(rule.when, (selector) => {
      max = Math.max(max, selector.window_minutes);
    });
  }
  return max;
}

/** Distinct history selectors (scope + window + filter ignored) a pack needs. */
export function collectHistoryWindows(
  pack: RulesPack
): Array<{ scope: HistorySelector["scope"]; windowMinutes: number }> {
  const seen = new Map<string, { scope: HistorySelector["scope"]; windowMinutes: number }>();
  for (const rule of pack.rules) {
    if (!rule.enabled) continue;
    visit(rule.when, (selector) => {
      const key = `${selector.scope}:${selector.window_minutes}`;
      if (!seen.has(key)) {
        seen.set(key, {
          scope: selector.scope,
          windowMinutes: selector.window_minutes,
        });
      }
    });
  }
  return Array.from(seen.values());
}
