import { WithTimestamps } from './common';

/**
 * Authentication and Profile types
 */

export interface Profile extends WithTimestamps {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  chosenLlmModelId?: string;
}

export interface ProfileWithModel extends Profile {
  chosenLlmModel?: LlmModel;
  gemWallet?: {
    totalGems: number;
    paidGems: number;
    freeDailyGems: number;
    freePromoGems: number;
  };
}

export interface LlmModel extends WithTimestamps {
  id: string;
  name: string;
  slug: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  gemCostPerMessage: number;
  isActive: boolean;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  chosenLlmModelId?: string;
}

export interface AuthResponse {
  session: Session;
  profile: ProfileWithModel;
}
