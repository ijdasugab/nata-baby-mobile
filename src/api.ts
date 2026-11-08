import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { AuthSession, Child, Measurement } from "./types";

const configuredUrl = Constants.expoConfig?.extra?.apiUrl;
export const API_URL = typeof configuredUrl === "string" ? configuredUrl : "http://localhost:3000";

const ACCESS_KEY = "nata_baby_access_token";
const REFRESH_KEY = "nata_baby_refresh_token";

type RequestOptions = {
  token?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function saveSession(session: AuthSession) {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, session.accessToken],
    [REFRESH_KEY, session.refreshToken]
  ]);
}

export async function loadToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

/** Rotasi refresh token: server mencabut yang lama dan mengirim yang baru. */
async function refreshToken(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(REFRESH_KEY);
  if (!stored) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: stored })
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken) return null;

    await AsyncStorage.multiSet([
      [ACCESS_KEY, data.accessToken],
      [REFRESH_KEY, data.refreshToken ?? stored]
    ]);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  // Akses kedaluwarsa setelah 15 menit. Coba perbarui sekali, lalu ulangi.
  if (response.status === 401 && retry && !path.startsWith("/api/auth/")) {
    const fresh = await refreshToken();
    if (fresh) {
      return request<T>(path, { ...options, token: fresh }, false);
    }
    await clearSession();
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      message = errorBody.message ?? message;
    } catch {
      // Body kosong, pakai pesan bawaan.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type ChildImmunization = {
  id: string;
  givenDate: string | null;
  location: string | null;
  immunizationMaster?: { vaccineName: string; recommendedAgeMonth: number | null } | null;
};

export type ChildMilestone = {
  id: string;
  achieved: boolean | null;
  achievedDate: string | null;
  milestoneMaster: { milestoneText: string; ageMonth: number; category: string | null };
};

export type MasterImmunization = {
  id: string;
  vaccineName: string;
  recommendedAgeMonth: number | null;
  description: string | null;
};

export type MasterMilestone = {
  id: string;
  ageMonth: number;
  category: string | null;
  milestoneText: string;
};

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
      body: { email, password, fullName }
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
  immunizations(token: string, childId: string) {
    return request<ChildImmunization[]>(`/api/children/${childId}/immunizations`, { token });
  },
  milestones(token: string, childId: string) {
    return request<ChildMilestone[]>(`/api/children/${childId}/milestones`, { token });
  },
  masterImmunizations(token: string) {
    return request<MasterImmunization[]>("/api/master-data/immunizations", { token });
  },
  masterMilestones(token: string) {
    return request<MasterMilestone[]>("/api/master-data/milestones", { token });
  },
  markReminder(token: string, childId: string, reminderId: string, isDone: boolean) {
    return request(`/api/children/${childId}/reminders/${reminderId}/done`, {
      token,
      method: "PATCH",
      body: { isDone }
    });
  }
};
