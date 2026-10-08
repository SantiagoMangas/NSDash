import { post } from "@/lib/api/client";

interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  must_change_password: boolean;
  role: "admin" | "coach";
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", {
    email,
    password,
  });
}
