// src/lib/types/domain.ts

export type CaseIndustry =
  | 'consulting' | 'fmcg' | 'tech' | 'healthcare'
  | 'finance' | 'infra' | 'energy' | 'retail' | 'other';

export type CaseTypeEnum =
  | 'market_entry' | 'profitability' | 'mna' | 'pricing'
  | 'operations' | 'gtm' | 'estimation' | 'other';

export type CaseDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface InterviewerNote {
  trigger_keywords: string[];
  reveal_text: string;
}

export interface IdealStructureBranch {
  node: string;
  subnodes?: string[];
}

export interface IdealStructure {
  framework?: string;
  branches?: IdealStructureBranch[];
  key_insights?: string[];
}

export interface CaseRow {
  id: string;
  title: string;
  industry: CaseIndustry;
  case_type: CaseTypeEnum;
  difficulty: CaseDifficulty;
  source: string | null;
  casebook_id: string | null;
  problem_statement: string;
  interviewer_notes: InterviewerNote[];
  ideal_structure: IdealStructure;
  tags: string[];
  provenance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Per-turn playbook citations attached to interviewer turns.
 * Populated by `/api/chat` when the playbook retriever returns matches.
 *
 * §7.1 Trust UX — surfaced under Ash's turns as a quiet "see why" row,
 * grounding the AI's verdict in observed real-MBB practice. Optional and
 * additive: legacy transcripts without this field continue to render
 * unchanged.
 */
export interface InterviewerCitation {
  section: string;
  sourceUrl?: string;
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'interviewer';
  content: string;
  timestamp: string;
  citations?: InterviewerCitation[];
}

export interface CheatSheetState {
  framework: string | null;
  hypothesis: string | null;
  key_numbers: { label: string; value: string; unit?: string }[];
  decisions: string[];
  next_steps: string[];
  manual_notes: string | null;
  locked_fields: string[];
}

export interface ScoreBreakdown {
  structure: number;
  insight: number;
  speed: number;
  total: number;
  gaps: string[];
  strengths: string[];
}
