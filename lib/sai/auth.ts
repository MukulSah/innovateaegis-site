export const SAI_AUTH_COOKIE = "sai_auth";
export const SAI_USER_COOKIE = "sai_user";

export const DEFAULT_CREDENTIALS = {
  username: "admin",
  password: "admin",
} as const;

export interface AuthSession {
  id: string;
  username: string;
  name: string;
  role: "owner" | "employee";
  title: string;
  department: string;
}

export const OWNER_SESSION: AuthSession = {
  id: "owner-1",
  username: "admin",
  name: "Founder",
  role: "owner",
  title: "Owner & CEO",
  department: "Executive",
};

export function validateCredentials(username: string, password: string): boolean {
  return (
    username === DEFAULT_CREDENTIALS.username &&
    password === DEFAULT_CREDENTIALS.password
  );
}
