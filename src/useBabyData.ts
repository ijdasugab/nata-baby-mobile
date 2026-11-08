/**
 * Sumber data untuk aplikasi mobile.
 *
 * P2-3: sebelumnya App.tsx memakai objek hardcode (`baby`, `growthPoints`,
 * `milestones`, `immunizations`). Sekarang semua angka datang dari API yang
 * sama dengan dashboard web.
 *
 * Kalau API mati, hook mengembalikan `error` dan layar menampilkan pesan.
 * Yang tidak boleh terjadi: menampilkan angka palsu seolah-olah data nyata.
 */

import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearSession,
  loadToken,
  saveSession,
  type ChildImmunization,
  type ChildMilestone,
  type MasterImmunization,
  type MasterMilestone
} from "./api";
import type { Child, Measurement } from "./types";

export type BabyData = {
  child: Child | null;
  measurements: Measurement[];
  milestones: ChildMilestone[];
  immunizations: ChildImmunization[];
  masterMilestones: MasterMilestone[];
  masterImmunizations: MasterImmunization[];
};

const EMPTY: BabyData = {
  child: null,
  measurements: [],
  milestones: [],
  immunizations: [],
  masterMilestones: [],
  masterImmunizations: []
};

export type BabyState = {
  data: BabyData;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Ambil token, login kalau belum ada. Kredensial dari env Expo. */
async function ensureToken(): Promise<string> {
  const existing = await loadToken();
  if (existing) return existing;

  const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
  const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Belum login. Isi EXPO_PUBLIC_DEMO_EMAIL dan EXPO_PUBLIC_DEMO_PASSWORD, atau login lewat layar Profil."
    );
  }

  const session = await api.login(email, password);
  await saveSession(session);
  return session.accessToken;
}

export function useBabyData(): BabyState {
  const [data, setData] = useState<BabyData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = await ensureToken();
        const children = await api.children(token);

        if (children.length === 0) {
          if (!cancelled) {
            setData(EMPTY);
            setError("Belum ada data anak. Tambahkan lewat dashboard web.");
          }
          return;
        }

        const child = children[0];
        const [measurements, milestones, immunizations, masterMilestones, masterImmunizations] =
          await Promise.all([
            api.measurements(token, child.id),
            api.milestones(token, child.id),
            api.immunizations(token, child.id),
            api.masterMilestones(token),
            api.masterImmunizations(token)
          ]);

        if (!cancelled) {
          setData({ child, measurements, milestones, immunizations, masterMilestones, masterImmunizations });
        }
      } catch (requestError) {
        if (cancelled) return;
        const message = requestError instanceof Error ? requestError.message : "Tidak bisa memuat data.";
        // Token ditolak server: bersihkan supaya percobaan berikutnya login ulang.
        if (message.toLowerCase().includes("token")) {
          await clearSession();
        }
        setError(message);
        setData(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { data, loading, error, reload };
}

/** Usia dalam bentuk "7 bulan 12 hari". */
export function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "-";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "-";

  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return "Belum lahir";

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000));

  if (years > 0 && rest > 0) return `${years} tahun ${rest} bulan`;
  if (years > 0) return `${years} tahun`;
  if (rest > 0) return `${rest} bulan ${days % 30} hari`;
  return `${days} hari`;
}

/** Desimal dari API bisa string, number, atau objek Decimal. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "d" in value) {
    const decimal = value as { s: number; e: number; d: number[] };
    const digits = decimal.d.join("");
    const parsed = Number(`${decimal.s < 0 ? "-" : ""}${digits}e${decimal.e - (digits.length - 1)}`);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatNumber(value: unknown, digits = 1): string {
  const num = toNumber(value);
  if (num === null) return "-";
  return num.toFixed(digits).replace(".", ",").replace(/,0+$/, "");
}

/** Titik grafik dari riwayat pengukuran, urut naik berdasarkan tanggal. */
export function growthSeries(
  measurements: Measurement[],
  metric: "weight" | "height" | "head"
): Array<{ x: number; y: number }> {
  const key =
    metric === "weight" ? "weightKg" : metric === "height" ? "heightCm" : "headCircumferenceCm";

  return measurements
    .map((item) => {
      const value = toNumber((item as unknown as Record<string, unknown>)[key]);
      const ageDays = item.ageInDays ?? null;
      if (value === null || ageDays === null) return null;
      return { x: ageDays / 30.4375, y: value };
    })
    .filter((point): point is { x: number; y: number } => point !== null)
    .sort((a, b) => a.x - b.x);
}
