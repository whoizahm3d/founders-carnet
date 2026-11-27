import { api } from '@/lib/api';
import type {
  User,
  UserRole,
  LoginCredentials,
  RegisterData,
  BackendTokenResponse,
  BackendUserRead,
} from '@/types/auth';

const TOKEN_KEY = 'carnet_token';
const USER_KEY = 'carnet_user';
const REMEMBER_KEY = 'carnet_remember';

export interface AuthResponse {
  token: string;
  user: User;
}

const isBrowser = () => typeof window !== 'undefined';

/**
 * Session storage abstraction supporting Remember me:
 * - When Remember me is checked: writes to localStorage.
 * - When Remember me is unchecked: writes to sessionStorage.
 * - Reads check localStorage first, then sessionStorage.
 * - clear() removes tokens from both storages.
 */
export const authStorage = {
  isRemembered(): boolean {
    if (!isBrowser()) return false;
    try {
      return window.localStorage.getItem(REMEMBER_KEY) === 'true';
    } catch {
      return false;
    }
  },
  getToken(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  getUser(): User | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(USER_KEY) || window.sessionStorage.getItem(USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        id: typeof parsed.id === 'number' ? parsed.id : parseInt(String(parsed.id), 10) || 1,
        email: parsed.email || '',
        role: parsed.role as UserRole,
        fullName: parsed.fullName || parsed.full_name || '',
      };
    } catch {
      return null;
    }
  },
  setSession(token: string, user: User, rememberMe: boolean): void {
    if (!isBrowser()) return;
    try {
      if (rememberMe) {
        window.localStorage.setItem(TOKEN_KEY, token);
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.localStorage.setItem(REMEMBER_KEY, 'true');
        window.sessionStorage.removeItem(TOKEN_KEY);
        window.sessionStorage.removeItem(USER_KEY);
      } else {
        window.sessionStorage.setItem(TOKEN_KEY, token);
        window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        window.localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      /* storage quota or access restriction */
    }
  },
  clear(): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem(REMEMBER_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export function mapBackendUser(backendUser: BackendUserRead): User {
  return {
    id: typeof backendUser.id === 'number' ? backendUser.id : parseInt(String(backendUser.id), 10) || 1,
    email: backendUser.email,
    role: backendUser.role as UserRole,
    fullName: backendUser.full_name,
  };
}

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  // Step 1: Obtain bearer token (skip global 401 redirect so form can display error)
  const tokenRes = await api.post<BackendTokenResponse>(
    '/auth/login',
    {
      email: credentials.email,
      password: credentials.password,
    },
    { skipAuthRedirect: true }
  );

  // Step 2: Fetch current user profile using the issued token
  const userRes = await api.get<BackendUserRead>('/users/me', {
    token: tokenRes.access_token,
    skipAuthRedirect: true,
  });

  const user = mapBackendUser(userRes);
  authStorage.setSession(tokenRes.access_token, user, !!credentials.rememberMe);

  return {
    token: tokenRes.access_token,
    user,
  };
}

export async function registerApi(data: RegisterData): Promise<AuthResponse> {
  // Step 1: Register user with role, full name, and explicit consent
  await api.post<BackendUserRead>(`/auth/register/${data.role}`, {
    email: data.email,
    password: data.password,
    full_name: data.fullName.trim(),
    consent_accepted: data.agreedToTerms,
  });

  // Step 2: Authenticate newly created user
  try {
    return await loginApi({
      email: data.email,
      password: data.password,
      rememberMe: true,
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'Invalid credentials';
    throw new Error(`Account created successfully, but automatic sign-in failed: ${reason}. Please sign in.`);
  }
}

export async function logoutApi(): Promise<void> {
  const token = authStorage.getToken();
  try {
    if (token) {
      await api.post('/auth/logout', undefined, { token });
    }
  } catch {
    /* Ignore network or 401 errors during logout */
  } finally {
    authStorage.clear();
  }
}
