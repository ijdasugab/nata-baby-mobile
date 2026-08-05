export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  roles: string[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type Child = {
  id: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  birthDate: string;
  birthWeightKg?: string | number | null;
  birthLengthCm?: string | number | null;
  measurements?: Measurement[];
  reminders?: Reminder[];
};

export type Measurement = {
  id: string;
  measuredAt: string;
  ageInDays?: number | null;
  ageInMonths?: string | number | null;
  weightKg?: string | number | null;
  heightCm?: string | number | null;
  headCircumferenceCm?: string | number | null;
  weightForAgeStatus?: string | null;
  heightForAgeStatus?: string | null;
  weightForHeightStatus?: string | null;
  headCircumferenceStatus?: string | null;
  notes?: string | null;
};

export type Reminder = {
  id: string;
  title: string;
  reminderType?: string | null;
  reminderDate: string;
  isDone?: boolean | null;
  notes?: string | null;
};
