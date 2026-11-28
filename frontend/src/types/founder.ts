/**
 * Shared TypeScript types for Founder workspace, Startups, Matching, Readiness, and Pitch.
 * Strictly aligned with backend schemas (backend/app/schemas.py, feature_schemas.py, verification_schemas.py)
 * and docs/report/main.tex data dictionary.
 */

export type StartupStage = 'idea' | 'mvp' | 'growth' | 'scaling';

export interface FounderProfileRead {
  id: number;
  bio: string | null;
  location: string | null;
  consent_version: string;
  consented_at: string;
}

export interface FounderProfileWrite {
  bio?: string | null;
  location?: string | null;
  consent_accepted: boolean;
}

export interface StartupRead {
  id: number;
  name: string;
  description: string;
  sector: string;
  stage: StartupStage;
  location: string;
  business_model: string;
  traction_summary: string;
  customer_count: number;
  monthly_revenue: number | null;
  skills: string[];
  funding_need_min: number | null;
  funding_need_max: number | null;
  is_verified: boolean;
}

export interface StartupCreate {
  name: string;
  description: string;
  sector: string;
  stage: StartupStage;
  location: string;
  business_model: string;
  traction_summary: string;
  customer_count: number;
  monthly_revenue?: number | null;
  skills?: string[];
  funding_need_min?: number | null;
  funding_need_max?: number | null;
}

export interface StartupUpdate {
  name?: string;
  description?: string;
  sector?: string;
  stage?: StartupStage;
  location?: string;
  business_model?: string;
  traction_summary?: string;
  customer_count?: number;
  monthly_revenue?: number | null;
  skills?: string[];
  funding_need_min?: number | null;
  funding_need_max?: number | null;
}

export type StartupVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface StartupVerificationRead {
  id: number;
  startup_id: number;
  status: StartupVerificationStatus;
  note: string;
  reason: string | null;
  reviewed_by_user_id: number | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface StartupVerificationRequestWrite {
  note: string;
}

export type DimensionKey =
  | 'problem_clarity'
  | 'market_definition'
  | 'differentiation'
  | 'business_model_coherence'
  | 'traction'
  | 'team'
  | 'scalability';

export interface DimensionResult {
  dimension: DimensionKey;
  score: number; // 1 to 5
  reasoning: string;
  next_action: string;
}

export interface ReadinessResult {
  dimensions: DimensionResult[];
  rubric_version: 'readiness-v1';
}

export interface ReadinessRead {
  id: number;
  startup_id: number;
  rubric_version: string;
  result: ReadinessResult;
  created_at: string;
}

export type MatchRequestStatus = 'recommended' | 'pending' | 'accepted' | 'declined';

export interface MatchRead {
  id: number;
  startup_id: number;
  startup_name: string;
  candidate_user_id: number;
  candidate_role: string;
  sector: string;
  location: string;
  semantic_similarity: number;
  score: number;
  factors: Record<string, number>;
  founder_accepted: boolean;
  candidate_accepted: boolean;
  mutual_acceptance: boolean;
  request_status: MatchRequestStatus;
  contact_email: string | null;
}

export interface PitchStart {
  startup_id: number;
  persona: string;
}

export interface PitchAnswer {
  answer: string;
}

export interface PitchTurnRead {
  turn_number: number;
  speaker: string;
  content: string;
}

export interface PitchScoreDetail {
  score: number;
  reasoning: string;
}

export interface PitchScores {
  clarity?: PitchScoreDetail;
  confidence?: PitchScoreDetail;
  content?: PitchScoreDetail;
  [key: string]: PitchScoreDetail | undefined;
}

export type PitchSessionStatus = 'active' | 'incomplete' | 'completed';

export interface PitchSessionRead {
  id: number;
  startup_id: number;
  persona: string;
  status: PitchSessionStatus;
  scores: PitchScores | null;
  rubric_version: string;
  created_at: string;
  completed_at: string | null;
  turns: PitchTurnRead[];
}
