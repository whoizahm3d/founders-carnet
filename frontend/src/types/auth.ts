export type UserRole = 'founder' | 'talent' | 'mentor' | 'investor' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthSession {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  agreedToTerms: boolean;
}

export interface BackendUserRead {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export interface BackendTokenResponse {
  access_token: string;
  token_type: string;
}
