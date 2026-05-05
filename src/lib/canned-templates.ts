// Single source of truth for the "first turn" coaching templates we surface as
// click-to-fill suggestions in the chat panel.
//
// Why centralized: the chat panel renders these as clickable scaffolding
// (useful coaching), but the /api/chat route ALSO needs to detect when a
// user submitted one verbatim — that's a copy-paste, not authored thinking,
// and Ash should push back. Both files importing the same array means
// detection stays in sync if a template is ever edited.

export type FirstTurnSuggestion = { label: string; text: string };

export const FIRST_TURN_SUGGESTIONS: FirstTurnSuggestion[] = [
  {
    label: 'Clarify the objective',
    text: "Before I structure my approach, let me clarify the objective. Are we maximizing profit, revenue, market share, or something else? And over what time horizon?",
  },
  {
    label: 'Restate + ask for context',
    text: "So just to play back: the client wants me to evaluate <restate>. A few clarifying questions before I dive in: 1) What's the time horizon? 2) Any constraints I should know about? 3) Is there a specific dimension they care about most?",
  },
  {
    label: 'State a structure',
    text: "Here's how I'd approach this. I'd break the problem into 3 branches: (1) <branch 1>, (2) <branch 2>, (3) <branch 3>. I'd want to start with <branch 1> because <reason>. Does that structure work for you?",
  },
  {
    label: 'Ask for data',
    text: "To start, I'd like to understand the situation better. Can you share any data on revenue trends, cost structure, or competitive position?",
  },
];

// Pre-trimmed, deduplicated set of the literal template strings — used by the
// chat route handler to do an O(1) exact-match check on user turns.
export const CANNED_TEMPLATE_STRINGS: ReadonlySet<string> = new Set(
  FIRST_TURN_SUGGESTIONS.map((s) => s.text.trim())
);

export function isCannedTemplate(userMessage: string): boolean {
  try {
    return CANNED_TEMPLATE_STRINGS.has(userMessage.trim());
  } catch {
    // Defensive: if anything weird happens with the input, fall through to
    // normal behavior — never block a real chat call on detection.
    return false;
  }
}
