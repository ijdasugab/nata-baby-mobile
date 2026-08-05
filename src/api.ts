import Constants from "expo-constants";
import type { AuthSession, Child, Measurement } from "./types";

const configuredUrl = Constants.expoConfig?.extra?.apiUrl;
export const API_URL = typeof configuredUrl === "string" ? configuredUrl : "http://localhost:3000";

type RequestOptions = {
  token?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      message = errorBody.message ?? message;
    } catch {
      // Keep fallback message when API returns an empty body.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });
  },
  register(fullName: string, email: string, password: string) {
    return request<AuthSession>("/api/auth/register", {
      method: "POST",
      body: { fullName, email, password }
    });
  },
  children(token: string) {
    return request<Child[]>("/api/children", { token });
  },
  child(token: string, childId: string) {
    return request<Child>(`/api/children/${childId}`, { token });
  },
  createChild(token: string, body: {
    fullName: string;
    gender: "MALE" | "FEMALE";
    birthDate: string;
    birthWeightKg?: number;
    birthLengthCm?: number;
  }) {
    return request<Child>("/api/children", { token, method: "POST", body });
  },
  measurements(token: string, childId: string) {
    return request<Measurement[]>(`/api/children/${childId}/measurements`, { token });
  },
  createMeasurement(token: string, childId: string, body: {
    measuredAt: string;
    weightKg?: number;
    heightCm?: number;
    headCircumferenceCm?: number;
    notes?: string;
  }) {
    return request<Measurement>(`/api/children/${childId}/measurements`, {
      token,
      method: "POST",
      body
    });
  },
  markReminder(token: string, childId: string, reminderId: string, isDone: boolean) {
    return request(`/api/children/${childId}/reminders/${reminderId}/done`, {
      token,
      method: "PATCH",
      body: { isDone }
    });
  }
};
