export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  roles?: string[];
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  user: AuthUser;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  status: AuthStatus;
  error: AuthError | null;
}
