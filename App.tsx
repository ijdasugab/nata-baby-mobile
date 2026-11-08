import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Fragment, useMemo, useState } from "react";
import {
  Pressable,
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from "react-native-svg";
import babyAvatarSource from "./assets/app-icon-baby.png";
import babyCrawlSource from "./assets/crawling-baby.png";
import babyGreetingSource from "./assets/girl-baby.png";
import { api, loadToken } from "./src/api";
import { formatAge, formatNumber, growthSeries, useBabyData, type BabyData } from "./src/useBabyData";

/** Props bersama yang dibawa setiap layar dari hook data. */
type ScreenProps = {
  data: BabyData;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Token untuk aksi tulis. Login sudah dilakukan hook saat memuat. */
async function ensureTokenForSave(): Promise<string> {
  const token = await loadToken();
  if (!token) throw new Error("Sesi tidak ditemukan. Buka ulang aplikasi.");
  return token;
}

type ScreenName = "home" | "growth" | "add" | "milestone" | "immunization" | "profile";
type GrowthMetric = "weight" | "height" | "head";
type AddMetric = "weight" | "height" | "head";


const MILESTONE_THUMBS = [
  require("./assets/milestone-green.png"),
  require("./assets/milestone-blue.png"),
  require("./assets/milestone-yellow.png")
];

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("home");
  const [growthMetric, setGrowthMetric] = useState<GrowthMetric>("weight");
  const [addMetric, setAddMetric] = useState<AddMetric>("weight");
  const { data, loading, error, reload } = useBabyData();

  // P2-3: angka di layar datang dari API, bukan objek hardcode. Saat memuat
  // atau gagal, layar mengatakan apa adanya.
  const content = useMemo(() => {
    const props = { data, loading, error, reload };
    if (screen === "growth") {
      return <GrowthScreen {...props} metric={growthMetric} onMetricChange={setGrowthMetric} onBack={() => setScreen("home")} />;
    }
    if (screen === "add") {
      return <AddDataScreen {...props} metric={addMetric} onMetricChange={setAddMetric} onBack={() => setScreen("home")} />;
    }
    if (screen === "milestone") {
      return <MilestoneScreen {...props} onBack={() => setScreen("home")} />;
    }
    if (screen === "immunization") {
      return <ImmunizationScreen {...props} onBack={() => setScreen("home")} />;
    }
    if (screen === "profile") {
      return <ProfileScreen {...props} onBack={() => setScreen("home")} />;
    }
    return <HomeScreen {...props} onNavigate={setScreen} />;
  }, [addMetric, data, error, growthMetric, loading, reload, screen]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.app}>
        <StatusBar style="dark" />
        {content}
        <BottomNav active={screen} onNavigate={setScreen} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/** Ringkasan angka terakhir dari riwayat pengukuran. */
function latestValues(data: BabyData) {
  const latest = data.measurements[0] ?? null;
  return {
    latest,
    weight: latest ? formatNumber(latest.weightKg, 2) : "-",
    height: latest ? formatNumber(latest.heightCm, 1) : "-",
    head: latest ? formatNumber(latest.headCircumferenceCm, 1) : "-",
    achieved: data.milestones.filter((item) => item.achieved).length
  };
}

/** Banner status saat data belum siap. */
function DataStatus({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry?: () => void }) {
  if (loading) {
    return (
      <View style={styles.tipsCard}>
        <Text style={styles.bodyText}>Memuat data dari server...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.tipsCard}>
        <View style={styles.tipsText}>
          <Text style={styles.tipsLabel}>Tidak bisa memuat data</Text>
          <Text style={styles.bodyText}>{error}</Text>
        </View>
      </View>
    );
  }
  if (onRetry) return null;
  return null;
}

function HomeScreen({ data, loading, error, onNavigate }: ScreenProps & { onNavigate: (screen: ScreenName) => void }) {
  const { achieved, head, height, weight } = latestValues(data);
  const child = data.child;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <Text style={styles.brandTitle}>Nata Baby</Text>
        <Pressable style={styles.bellButton} onPress={() => onNavigate("immunization")}>
          <Ionicons name="notifications-outline" size={24} color={colors.navy} />
          {data.masterImmunizations.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{data.masterImmunizations.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.greetingCard}>
        <View style={styles.greetingCopy}>
          <Text style={styles.greetingTitle}>Halo, Mama!</Text>
          <Text style={styles.bodyText}>Yuk, cek perkembangan si kecil hari ini.</Text>
        </View>
        <BabyIllustration />
      </View>

      <DataStatus loading={loading} error={error} />

      <Pressable style={styles.profileCard} onPress={() => onNavigate("profile")}>
        <BabyAvatar />
        <View style={styles.profileText}>
          <Text style={styles.babyName}>{child?.fullName ?? "Belum ada data anak"} <Text style={styles.heart}>♥</Text></Text>
          <Text style={styles.mutedText}>{child ? formatAge(child.birthDate) : "-"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color="#717A9A" />
      </Pressable>

      <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
      <View style={styles.metricGrid}>
        <MetricCard title="Berat Badan" value={weight} unit="kg" delta={achieved ? "Terakhir dicatat" : "Belum ada"} icon="trending-up" tone="green" />
        <MetricCard title="Tinggi Badan" value={height} unit="cm" delta="Terakhir dicatat" icon="body-outline" tone="blue" />
        <MetricCard title="Lingkar Kepala" value={head} unit="cm" delta="Terakhir dicatat" icon="happy-outline" tone="orange" />
        <MetricCard title="Milestone" value={String(achieved)} unit="pencapaian" delta="Lihat detail" icon="star" tone="yellow" onPress={() => onNavigate("milestone")} />
      </View>

      <View style={styles.tipsCard}>
        <View style={styles.tipsText}>
          <Text style={styles.tipsLabel}>Tips hari ini</Text>
          <Text style={styles.bodyStrong}>Ajak bayi bermain tummy{"\u00A0"}time 15 menit setiap hari.</Text>
        </View>
        <BabyCrawl />
      </View>
    </ScrollView>
  );
}

function GrowthScreen({ data, loading, error, metric, onMetricChange, onBack }: ScreenProps & {
  metric: GrowthMetric;
  onMetricChange: (metric: GrowthMetric) => void;
  onBack: () => void;
}) {
  const title = metric === "weight" ? "Berat Badan" : metric === "height" ? "Tinggi Badan" : "Lingkar Kepala";
  const latest = data.measurements[0] ?? null;
  const value = !latest
    ? "-"
    : metric === "weight"
      ? formatNumber(latest.weightKg, 2)
      : metric === "height"
        ? formatNumber(latest.heightCm, 1)
        : formatNumber(latest.headCircumferenceCm, 1);
  const unit = metric === "weight" ? "kg" : "cm";
  const points = growthSeries(data.measurements, metric);
  const statusLabel = metric === "weight"
    ? latest?.weightForAgeStatus
    : metric === "height"
      ? latest?.heightForAgeStatus
      : latest?.headCircumferenceStatus;

  return (
    <ScreenFrame title="Grafik Pertumbuhan" onBack={onBack}>
      <View style={styles.segmented}>
        <Chip label="Berat Badan" active={metric === "weight"} onPress={() => onMetricChange("weight")} />
        <Chip label="Tinggi Badan" active={metric === "height"} onPress={() => onMetricChange("height")} />
        <Chip label="Lingkar Kepala" active={metric === "head"} onPress={() => onMetricChange("head")} />
      </View>

      <View style={styles.metricHero}>
        <View>
          <Text style={styles.bigValue}>{value}<Text style={styles.bigUnit}> {unit}</Text></Text>
          <Text style={styles.mutedText}>{data.child ? formatAge(data.child.birthDate) : "-"}</Text>
        </View>
        <View style={styles.deltaPill}>
          <Text style={styles.deltaPillText}>{points.length} catatan</Text>
        </View>
      </View>

      {points.length >= 2 ? (
        <GrowthChart title={title} points={points} value={`${value} ${unit}`} />
      ) : (
        <View style={styles.percentileCard}>
          <Text style={styles.bodyText}>
            {loading ? "Memuat grafik..." : "Grafik butuh minimal dua catatan pengukuran."}
          </Text>
        </View>
      )}

      <View style={styles.percentileCard}>
        <View>
          <Text style={styles.cardTitle}>Status gizi</Text>
          <Text style={styles.primaryText}>{statusLabel ?? "Belum dihitung"}</Text>
        </View>
        <Text style={styles.percentileValue}>{latest?.weightForAgeZ !== undefined && latest?.weightForAgeZ !== null ? `${formatNumber(latest.weightForAgeZ, 2)} SD` : "-"}</Text>
      </View>
      {error ? <Text style={styles.mutedText}>{error}</Text> : null}
    </ScreenFrame>
  );
}

function MilestoneScreen({ data, loading, error, onBack }: ScreenProps & { onBack: () => void }) {
  const achievedCount = data.milestones.filter((item) => item.achieved).length;
  const rows = data.milestones.slice(0, 20);

  return (
    <ScreenFrame title="Milestone" onBack={onBack}>
      <View style={styles.categoryRow}>
        <Chip label="Semua" active onPress={() => undefined} />
        <Chip label="Motorik Kasar" onPress={() => undefined} />
        <Chip label="Motorik Halus" onPress={() => undefined} />
        <Chip label="Bahasa" onPress={() => undefined} />
      </View>

      <View style={styles.achievementCard}>
        <View pointerEvents="none" style={styles.confettiLayer}>
          <View style={[styles.confettiDot, styles.confettiDotBlue]} />
          <View style={[styles.confettiDot, styles.confettiDotPink]} />
          <View style={[styles.confettiDash, styles.confettiDashYellow]} />
          <View style={[styles.confettiDash, styles.confettiDashBlue]} />
          <Ionicons name="star" size={14} color="#FF5F92" style={styles.confettiStarRight} />
          <Ionicons name="star" size={12} color="#7CB8F7" style={styles.confettiStarLeft} />
          <Ionicons name="sparkles" size={13} color="#FFC76B" style={styles.confettiSparkleTop} />
          <Ionicons name="sparkles" size={12} color="#FF8DB0" style={styles.confettiSparkleBottom} />
        </View>
        <TrophyIllustration />
        <Text style={styles.achievementTitle}>Hebat!</Text>
        <Text style={styles.achievementCopy}>
          {data.child?.fullName ?? "Si kecil"} telah mencapai{"\n"}{achievedCount} milestone!
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Terbaru</Text>
      {rows.length === 0 ? (
        <Text style={styles.mutedText}>
          {loading ? "Memuat milestone..." : error ?? "Belum ada milestone tercatat."}
        </Text>
      ) : (
        <View style={styles.listStack}>
          {rows.map((item, index) => (
            <View key={item.id} style={styles.listItem}>
              <MilestoneThumb source={MILESTONE_THUMBS[index % MILESTONE_THUMBS.length]} />
              <View style={styles.listText}>
                <Text style={styles.itemTitle}>{item.milestoneMaster.milestoneText}</Text>
                <Text style={styles.mutedText}>
                  {item.milestoneMaster.ageMonth} bulan
                  {item.milestoneMaster.category ? ` · ${item.milestoneMaster.category}` : ""}
                </Text>
              </View>
              <View style={[styles.checkIcon, item.achieved ? styles.checkSuccess : styles.checkWarning]}>
                <Ionicons name={item.achieved ? "checkmark" : "time-outline"} size={18} color="#FFFFFF" />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenFrame>
  );
}

function ImmunizationScreen({ data, loading, error, onBack }: ScreenProps & { onBack: () => void }) {
  const given = data.immunizations.filter((item) => item.givenDate);
  const nextUp = data.masterImmunizations.find(
    (master) => !given.some((item) => item.immunizationMaster?.vaccineName === master.vaccineName)
  );

  return (
    <ScreenFrame title="Imunisasi" onBack={onBack}>
      <View style={styles.twoTabs}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>Jadwal</Text>
        </View>
        <View style={styles.tabIdle}>
          <Text style={styles.tabIdleText}>Riwayat</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Selanjutnya</Text>
      {nextUp ? (
        <View style={styles.upcomingCard}>
          <View style={styles.vaccineBubble}>
            <Ionicons name="medical" size={30} color="#FFFFFF" />
          </View>
          <View style={styles.listText}>
            <Text style={styles.itemTitle}>{nextUp.vaccineName}</Text>
            <Text style={styles.mutedText}>Usia {nextUp.recommendedAgeMonth ?? 0} bulan</Text>
            {nextUp.description ? <Text style={styles.mutedText}>{nextUp.description}</Text> : null}
          </View>
        </View>
      ) : (
        <Text style={styles.mutedText}>
          {loading ? "Memuat jadwal..." : error ?? "Semua vaksin pada daftar sudah tercatat."}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Riwayat Imunisasi</Text>
      {given.length === 0 ? (
        <Text style={styles.mutedText}>Belum ada imunisasi tercatat.</Text>
      ) : (
        <View style={styles.listStack}>
          {given.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="medical-outline" size={22} color="#3E98E8" />
              </View>
              <View style={styles.listText}>
                <Text style={styles.itemTitle}>{item.immunizationMaster?.vaccineName ?? "Vaksin"}</Text>
                <Text style={styles.mutedText}>
                  {item.givenDate ? new Date(item.givenDate).toLocaleDateString("id-ID") : "-"}
                  {item.location ? ` · ${item.location}` : ""}
                </Text>
              </View>
              <View style={styles.checkSuccess}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenFrame>
  );
}

function AddDataScreen({ data, loading, metric, onMetricChange, onBack, reload }: ScreenProps & {
  metric: AddMetric;
  onMetricChange: (metric: AddMetric) => void;
  onBack: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const child = data.child;

  async function handleSave() {
    if (!child) {
      setMessage("Belum ada data anak yang bisa diisi.");
      return;
    }
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Isi angka yang valid dulu.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      // P2-3: simpan sungguhan ke API, bukan tombol tanpa aksi.
      const created = await api.createMeasurement((await ensureTokenForSave()), child.id, {
        measuredAt: new Date().toISOString().slice(0, 10),
        ...(metric === "weight" ? { weightKg: parsed } : {}),
        ...(metric === "height" ? { heightCm: parsed } : {}),
        ...(metric === "head" ? { headCircumferenceCm: parsed } : {})
      });
      setAmount("");
      setMessage(
        created.weightForAgeStatus || created.heightForAgeStatus
          ? `Tersimpan. Status: ${created.weightForAgeStatus ?? created.heightForAgeStatus}`
          : "Tersimpan."
      );
      reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  const unit = metric === "weight" ? "kg" : "cm";

  return (
    <ScreenFrame title="Tambah Data" onBack={onBack}>
      <View style={styles.addTypeRow}>
        <AddType label="Berat Badan" icon="scale-outline" active={metric === "weight"} onPress={() => onMetricChange("weight")} />
        <AddType label="Tinggi Badan" icon="body-outline" active={metric === "height"} onPress={() => onMetricChange("height")} />
        <AddType label="Lingkar Kepala" icon="sync-outline" active={metric === "head"} onPress={() => onMetricChange("head")} />
      </View>

      <Gauge value={amount === "" ? "-" : amount} unit={unit} />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={`Nilai dalam ${unit}`}
          placeholderTextColor="#9AA3BD"
        />
      </View>

      {message ? <Text style={styles.mutedText}>{message}</Text> : null}
      {loading ? <Text style={styles.mutedText}>Memuat data anak...</Text> : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Ionicons name="checkmark" size={22} color="#FFFFFF" />
        <Text style={styles.saveButtonText}>{saving ? "Menyimpan..." : "Simpan Data"}</Text>
      </Pressable>
    </ScreenFrame>
  );
}

function ProfileScreen({ data, onBack }: ScreenProps & { onBack: () => void }) {
  const child = data.child;
  return (
    <ScreenFrame title="Profil" onBack={onBack}>
      <View style={styles.profileDetailCard}>
        <BabyAvatar large />
        <Text style={styles.babyName}>{child?.fullName ?? "Belum ada data anak"} <Text style={styles.heart}>♥</Text></Text>
        <Text style={styles.mutedText}>{child ? formatAge(child.birthDate) : "-"}</Text>
        <Text style={styles.bodyText}>Profil dan catatan si kecil akan dikembangkan setelah UI utama stabil.</Text>
      </View>
    </ScreenFrame>
  );
}

function ScreenFrame({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={23} color={colors.navy} />
        </Pressable>
        <Text style={styles.screenTitle}>{title}</Text>
        <View style={styles.topBarSpacer} />
      </View>
      {children}
    </ScrollView>
  );
}

function MetricCard({ title, value, unit, delta, icon, tone, onPress }: {
  title: string;
  value: string;
  unit: string;
  delta: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "green" | "blue" | "orange" | "yellow";
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.metricCard, toneStyle(tone).card]} onPress={onPress}>
      <View style={styles.metricTop}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.metricIcon, toneStyle(tone).icon]}>
          <Ionicons name={icon} size={22} color={toneStyle(tone).color} />
        </View>
      </View>
      <Text style={styles.metricValue}>{value}<Text style={styles.metricUnit}> {unit}</Text></Text>
      <Text style={[styles.metricDelta, { color: toneStyle(tone).color }]}>{delta}</Text>
    </Pressable>
  );
}

function Shortcut({ title, icon, tone, onPress }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "pink" | "yellow" | "blue" | "purple";
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.shortcut} onPress={onPress}>
      <View style={[styles.shortcutIcon, shortcutTone(tone)]}>
        <Ionicons name={icon} size={28} color={colors.navy} />
      </View>
      <Text style={styles.shortcutText}>{title}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AddType({ label, icon, active, onPress }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.addType} onPress={onPress}>
      <View style={[styles.addTypeIcon, active && styles.addTypeIconActive]}>
        <Ionicons name={icon} size={27} color={active ? colors.primary : "#7F86A4"} />
      </View>
      <Text style={[styles.addTypeText, active && styles.addTypeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BottomNav({ active, onNavigate }: { active: ScreenName; onNavigate: (screen: ScreenName) => void }) {
  const items: Array<{ label: string; screen: ScreenName; icon: keyof typeof Ionicons.glyphMap }> = [
    { label: "Beranda", screen: "home", icon: "home" },
    { label: "Pertumbuhan", screen: "growth", icon: "stats-chart" },
    { label: "Milestone", screen: "milestone", icon: "star-outline" },
    { label: "Profil", screen: "profile", icon: "person-outline" }
  ];

  return (
    <View style={styles.bottomNav}>
      {items.slice(0, 2).map((item) => (
        <Pressable key={item.screen} style={styles.navItem} onPress={() => onNavigate(item.screen)}>
          <Ionicons name={item.icon} size={22} color={active === item.screen ? colors.primary : "#7A83A0"} />
          <Text style={[styles.navText, active === item.screen && styles.navTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.navAddButton} onPress={() => onNavigate("add")}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>
      {items.slice(2).map((item) => (
        <Pressable key={item.screen} style={styles.navItem} onPress={() => onNavigate(item.screen)}>
          <Ionicons name={item.icon} size={22} color={active === item.screen ? colors.primary : "#7A83A0"} />
          <Text style={[styles.navText, active === item.screen && styles.navTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TrophyIllustration() {
  return (
    <Svg width={108} height={88} viewBox="0 0 108 88" style={styles.trophySvg}>
      <Defs>
        <LinearGradient id="trophyGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD96A" />
          <Stop offset="0.55" stopColor="#FFC64D" />
          <Stop offset="1" stopColor="#F8A93B" />
        </LinearGradient>
        <LinearGradient id="trophyBase" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#344270" />
          <Stop offset="1" stopColor="#17223B" />
        </LinearGradient>
      </Defs>
      <Path d="M24 28 C13 29 8 36 10 44 C12 53 24 55 33 49 L31 39 C26 43 19 42 18 38 C17 34 21 32 27 32 Z" fill="#FFC64D" />
      <Path d="M84 28 C95 29 100 36 98 44 C96 53 84 55 75 49 L77 39 C82 43 89 42 90 38 C91 34 87 32 81 32 Z" fill="#FFC64D" />
      <Path d="M30 20 H78 C77 49 66 60 54 60 C42 60 31 49 30 20 Z" fill="url(#trophyGold)" />
      <Ellipse cx="54" cy="20" rx="27" ry="10" fill="#FFD96A" />
      <Ellipse cx="54" cy="19" rx="19" ry="6" fill="#FFE18A" opacity="0.65" />
      <Path d="M54 31 L58 40 L68 40 L60 46 L63 56 L54 50 L45 56 L48 46 L40 40 L50 40 Z" fill="#FFF0B2" opacity="0.95" />
      <Path d="M47 60 H61 V68 H47 Z" fill="#F8A93B" />
      <Rect x="39" y="68" width="30" height="8" rx="3" fill="#FFC64D" />
      <Rect x="32" y="74" width="44" height="12" rx="4" fill="url(#trophyBase)" />
      <Rect x="40" y="77" width="28" height="6" rx="2" fill="#FFD464" />
    </Svg>
  );
}

function GrowthChart({ title, points, value }: {
  title: string;
  points: Array<{ x: number; y: number }>;
  value: string;
}) {
  const width = 300;
  const height = 210;
  const left = 30;
  const top = 18;
  const chartWidth = 246;
  const chartHeight = 144;

  // Skala dihitung dari data nyata, bukan rentang tetap, supaya garis tidak
  // menempel di tepi saat berat atau tinggi anak di luar 4 sampai 10.
  const ys = points.map((point) => point.y);
  const xs = points.map((point) => point.x);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const pad = Math.max((rawMax - rawMin) * 0.2, 0.5);
  const min = rawMin - pad;
  const max = rawMax + pad;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const spanX = maxX - minX || 1;

  const toX = (x: number) => left + ((x - minX) / spanX) * chartWidth;
  const toY = (y: number) => top + chartHeight - ((y - min) / (max - min)) * chartHeight;

  const coords = points.map((point) => `${toX(point.x)},${toY(point.y)}`);
  const last = points[points.length - 1];
  const selectedX = toX(last.x);
  const selectedY = toY(last.y);
  const ticks = [min, min + (max - min) / 3, min + ((max - min) * 2) / 3, max];
  const labels = [points[0], ...(points.length > 2 ? [points[Math.floor(points.length / 2)]] : []), last];

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.26" />
            <Stop offset="1" stopColor={colors.primarySoft} stopOpacity="0.04" />
          </LinearGradient>
        </Defs>
        {ticks.map((tick) => {
          const y = toY(tick);
          return (
            <Fragment key={tick}>
              <Line x1={left} y1={y} x2={left + chartWidth} y2={y} stroke="#E8DDE5" strokeDasharray="5 6" strokeWidth="1" />
              <SvgText x={4} y={y + 4} fill="#6B7280" fontSize="11">{tick.toFixed(1)}</SvgText>
            </Fragment>
          );
        })}
        <Path d={`M ${coords.join(" L ")} L ${left + chartWidth} ${top + chartHeight} L ${left} ${top + chartHeight} Z`} fill="url(#chartFill)" />
        <Polyline points={coords.join(" ")} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <Circle key={`${title}-${index}`} cx={toX(point.x)} cy={toY(point.y)} r="4" fill={colors.primary} stroke="#FFFFFF" strokeWidth="2" />
        ))}
        <Line x1={selectedX} y1={selectedY} x2={selectedX} y2={top + chartHeight} stroke={colors.primary} strokeDasharray="5 6" strokeWidth="1.4" />
        <Circle cx={selectedX} cy={selectedY} r="7" fill="#FFFFFF" stroke={colors.primary} strokeWidth="3" />
        <Path d={`M ${selectedX - 30} ${selectedY - 49} Q ${selectedX - 30} ${selectedY - 58} ${selectedX - 20} ${selectedY - 58} L ${selectedX + 25} ${selectedY - 58} Q ${selectedX + 35} ${selectedY - 58} ${selectedX + 35} ${selectedY - 48} L ${selectedX + 35} ${selectedY - 27} Q ${selectedX + 35} ${selectedY - 18} ${selectedX + 25} ${selectedY - 18} L ${selectedX + 4} ${selectedY - 18} L ${selectedX} ${selectedY - 11} L ${selectedX - 4} ${selectedY - 18} L ${selectedX - 20} ${selectedY - 18} Q ${selectedX - 30} ${selectedY - 18} ${selectedX - 30} ${selectedY - 28} Z`} fill={colors.primary} />
        <SvgText x={selectedX + 2} y={selectedY - 33} fill="#FFFFFF" fontSize="13" fontWeight="700" textAnchor="middle">{value}</SvgText>
        {labels.map((point, index) => (
          <SvgText
            key={`label-${index}`}
            x={toX(point.x)}
            y={top + chartHeight + 22}
            fill={colors.navy}
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            {Math.round(point.x)} bln
          </SvgText>
        ))}
        <SvgText x={4} y={top - 3} fill="#6B7280" fontSize="11">{title === "Berat Badan" ? "kg" : "cm"}</SvgText>
      </Svg>
    </View>
  );
}

function Gauge({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.gaugeWrap}>
      <Svg width="100%" height={210} viewBox="0 0 320 210">
        <Path d="M 36 168 A 124 124 0 0 1 284 168" stroke={colors.primarySoft} strokeWidth="12" strokeLinecap="round" fill="none" />
        <Path d="M 36 168 A 124 124 0 0 1 160 44" stroke={colors.primary} strokeWidth="12" strokeLinecap="round" fill="none" />
        <Line x1="160" y1="44" x2="160" y2="76" stroke={colors.primary} strokeWidth="5" strokeLinecap="round" />
        <Circle cx="160" cy="44" r="5" fill={colors.primary} />
        <SvgText x="84" y="118" fill="#59627E" fontSize="18" textAnchor="middle">7.6</SvgText>
        <SvgText x="123" y="91" fill="#59627E" fontSize="18" textAnchor="middle">7.7</SvgText>
        <SvgText x="160" y="76" fill="#59627E" fontSize="18" textAnchor="middle">7.8</SvgText>
        <SvgText x="201" y="91" fill="#59627E" fontSize="18" textAnchor="middle">7.9</SvgText>
        <SvgText x="239" y="118" fill="#59627E" fontSize="18" textAnchor="middle">8.0</SvgText>
        <SvgText x="160" y="160" fill={colors.navy} fontSize="40" fontWeight="800" textAnchor="middle">{value}<SvgText fontSize="18"> {unit}</SvgText></SvgText>
      </Svg>
    </View>
  );
}

function BabyAvatar({ large }: { large?: boolean }) {
  return (
    <Image
      source={babyAvatarSource}
      style={[styles.avatarPhoto, large && styles.avatarPhotoLarge]}
      resizeMode="cover"
    />
  );
}

function BabyIllustration() {
  return (
    <Image
      source={babyGreetingSource}
      style={styles.greetingImage}
      resizeMode="contain"
    />
  );
}

function BabyCrawl() {
  return (
    <Image source={babyCrawlSource} style={styles.crawlImage} resizeMode="contain" />
  );
}

function MilestoneThumb({ source }: { source: ImageSourcePropType }) {
  return (
    <Image source={source} style={styles.milestoneThumb} resizeMode="cover" />
  );
}

function toneStyle(tone: "green" | "blue" | "orange" | "yellow") {
  const map = {
    green: { card: styles.metricGreen, icon: styles.metricGreenIcon, color: colors.success },
    blue: { card: styles.metricBlue, icon: styles.metricBlueIcon, color: colors.secondary },
    orange: { card: styles.metricOrange, icon: styles.metricOrangeIcon, color: "#F2A44A" },
    yellow: { card: styles.metricYellow, icon: styles.metricYellowIcon, color: colors.warning }
  };
  return map[tone];
}

function shortcutTone(tone: "pink" | "yellow" | "blue" | "purple") {
  const map = {
    pink: styles.shortcutPink,
    yellow: styles.shortcutYellow,
    blue: styles.shortcutBlue,
    purple: styles.shortcutPurple
  };
  return map[tone];
}

const colors = {
  primary: "#FF5F92",
  primarySoft: "#FFE6EF",
  secondary: "#7CB8F7",
  success: "#61C982",
  warning: "#FFC76B",
  bg: "#FFF8F6",
  card: "#FFFFFF",
  navy: "#17223B",
  muted: "#6B7280"
};

const shadow = {
  shadowColor: "#1E293B",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 30,
  elevation: 6
};

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 112,
    gap: 18
  },
  screenContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 112,
    gap: 22
  },
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2
  },
  brandTitle: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#FFE3EC",
    ...shadow
  },
  badge: {
    position: "absolute",
    right: 5,
    top: 5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  greetingCard: {
    minHeight: 118,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    paddingLeft: 22,
    borderRadius: 24,
    backgroundColor: "#FFF3EC",
    borderWidth: 1,
    borderColor: "#FFD8C8",
    ...shadow
  },
  greetingCopy: {
    width: "56%",
    zIndex: 1,
    gap: 8
  },
  greetingTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800"
  },
  bodyText: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 22
  },
  bodyStrong: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  profileCard: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.card,
    ...shadow
  },
  profileText: {
    flex: 1
  },
  babyName: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: "800"
  },
  heart: {
    color: colors.primary
  },
  mutedText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800"
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metricCard: {
    width: "48%",
    minHeight: 124,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    ...shadow
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "800"
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  metricValue: {
    marginTop: 9,
    color: "#050B22",
    fontSize: 30,
    fontWeight: "800"
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: "800"
  },
  metricDelta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700"
  },
  metricGreen: {
    backgroundColor: "#F2FFF8",
    borderColor: "#CFEFDC"
  },
  metricBlue: {
    backgroundColor: "#F4FAFF",
    borderColor: "#CFE6FF"
  },
  metricOrange: {
    backgroundColor: "#FFF9F0",
    borderColor: "#FFE4C5"
  },
  metricYellow: {
    backgroundColor: "#FFF7EF",
    borderColor: "#FFE1C8"
  },
  metricGreenIcon: {
    backgroundColor: "#DDF8E8"
  },
  metricBlueIcon: {
    backgroundColor: "#DFF0FF"
  },
  metricOrangeIcon: {
    backgroundColor: "#FFEBCF"
  },
  metricYellowIcon: {
    backgroundColor: "#FFF0BF"
  },
  tipsCard: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFEFF4",
    borderWidth: 1,
    borderColor: "#FFD0DD"
  },
  tipsText: {
    flex: 1,
    gap: 6
  },
  tipsLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  shortcutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  shortcut: {
    flex: 1,
    alignItems: "center",
    gap: 8
  },
  shortcutIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    ...shadow
  },
  shortcutPink: {
    backgroundColor: "#FFE6EF"
  },
  shortcutYellow: {
    backgroundColor: "#FFF8D9"
  },
  shortcutBlue: {
    backgroundColor: "#E7F4FF"
  },
  shortcutPurple: {
    backgroundColor: "#F2EFFF"
  },
  shortcutText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15
  },
  topBar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  screenTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800"
  },
  topBarSpacer: {
    width: 38
  },
  segmented: {
    minHeight: 42,
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 21,
    backgroundColor: "#F5F1F6"
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8
  },
  chip: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "transparent"
  },
  chipActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  chipText: {
    color: "#59627E",
    fontSize: 12,
    fontWeight: "800"
  },
  chipTextActive: {
    color: "#FFFFFF"
  },
  metricHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  bigValue: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: "800"
  },
  bigUnit: {
    fontSize: 18
  },
  deltaPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#DDF8E8"
  },
  deltaPillText: {
    color: "#229B55",
    fontWeight: "800"
  },
  chartWrap: {
    minHeight: 220,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8
  },
  percentileCard: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#FFEFF4"
  },
  primaryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  percentileValue: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "800"
  },
  achievementCard: {
    minHeight: 154,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: "#FFF5ED",
    borderWidth: 1,
    borderColor: "#FFD8BF"
  },
  trophySvg: {
    width: 108,
    height: 88,
    zIndex: 2
  },
  achievementTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
    zIndex: 2
  },
  achievementCopy: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    zIndex: 2
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject
  },
  confettiDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4
  },
  confettiDotBlue: {
    left: 74,
    top: 46,
    backgroundColor: "#7CB8F7"
  },
  confettiDotPink: {
    right: 66,
    bottom: 55,
    backgroundColor: "#FF8DB0"
  },
  confettiDash: {
    position: "absolute",
    width: 18,
    height: 5,
    borderRadius: 3
  },
  confettiDashYellow: {
    left: 96,
    top: 28,
    backgroundColor: "#FFC76B",
    transform: [{ rotate: "28deg" }]
  },
  confettiDashBlue: {
    right: 86,
    top: 48,
    backgroundColor: "#7CB8F7",
    transform: [{ rotate: "-22deg" }]
  },
  confettiStarRight: {
    position: "absolute",
    right: 34,
    top: 26
  },
  confettiStarLeft: {
    position: "absolute",
    left: 48,
    bottom: 62
  },
  confettiSparkleTop: {
    position: "absolute",
    left: 124,
    top: 46
  },
  confettiSparkleBottom: {
    position: "absolute",
    right: 104,
    bottom: 42
  },
  listStack: {
    gap: 10
  },
  listItem: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#F1E7EE"
  },
  listText: {
    flex: 1
  },
  itemTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19
  },
  checkIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  checkSuccess: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success
  },
  checkWarning: {
    backgroundColor: colors.warning
  },
  twoTabs: {
    alignSelf: "center",
    width: 220,
    minHeight: 38,
    flexDirection: "row",
    padding: 4,
    borderRadius: 19,
    backgroundColor: "#F5F1F6"
  },
  tabActive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  tabIdle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActiveText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  tabIdleText: {
    color: "#59627E",
    fontWeight: "800"
  },
  upcomingCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFF0F7"
  },
  vaccineBubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9DBC",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5
  },
  duePill: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFE2EB"
  },
  duePillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F4FF"
  },
  addTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addType: {
    flex: 1,
    alignItems: "center",
    gap: 8
  },
  addTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EEF6"
  },
  addTypeIconActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#FFB4CB"
  },
  addTypeText: {
    color: "#59627E",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  addTypeTextActive: {
    color: colors.primary
  },
  gaugeWrap: {
    minHeight: 220,
    justifyContent: "center"
  },
  inputRow: {
    marginTop: 4
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD4E2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    fontSize: 18,
    color: colors.navy
  },
  saveButton: {
    height: 58,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  profileDetailCard: {
    alignItems: "center",
    gap: 10,
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.card,
    ...shadow
  },
  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 76,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.card,
    ...shadow
  },
  navItem: {
    width: 70,
    alignItems: "center",
    gap: 4
  },
  navText: {
    color: "#7A83A0",
    fontSize: 11,
    fontWeight: "800"
  },
  navTextActive: {
    color: colors.primary
  },
  navAddButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10
  },
  avatarPhoto: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "transparent"
  },
  avatarPhotoLarge: {
    width: 96,
    height: 96,
    borderRadius: 30
  },
  greetingImage: {
    position: "absolute",
    right: -10,
    bottom: -8,
    width: 178,
    height: 158
  },
  crawlImage: {
    width: 124,
    height: 110,
    marginRight: -4,
    marginBottom: -10
  },
  milestoneThumb: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F4FAFF",
    zIndex: 1
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: "#FFC5D8"
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 32
  },
  face: {
    width: "78%",
    height: "72%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "#FFD9C3",
    marginBottom: -3
  },
  hair: {
    position: "absolute",
    top: -4,
    left: 16,
    width: 24,
    height: 16,
    borderRadius: 10,
    backgroundColor: "#6B351E",
    transform: [{ rotate: "-22deg" }]
  },
  eyeLeft: {
    position: "absolute",
    top: 22,
    left: 15,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4C2A1D"
  },
  eyeRight: {
    position: "absolute",
    top: 22,
    right: 15,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4C2A1D"
  },
  smile: {
    position: "absolute",
    left: 20,
    bottom: 13,
    width: 14,
    height: 7,
    borderBottomWidth: 2,
    borderBottomColor: "#C25A51",
    borderRadius: 9
  },
  babyIllustration: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
    backgroundColor: "#FFD7E3",
    borderTopLeftRadius: 60,
    borderBottomLeftRadius: 60
  },
  bow: {
    position: "absolute",
    top: 9,
    right: 26,
    width: 25,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF7DA4",
    transform: [{ rotate: "18deg" }]
  },
  crawlWrap: {
    width: 112,
    height: 68,
    justifyContent: "flex-end"
  },
  crawlHead: {
    position: "absolute",
    right: 38,
    bottom: 28,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFD9C3"
  },
  crawlHair: {
    position: "absolute",
    top: -5,
    left: 13,
    width: 18,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#6B351E"
  },
  crawlBody: {
    position: "absolute",
    right: 6,
    bottom: 12,
    width: 62,
    height: 34,
    borderRadius: 18,
    backgroundColor: "#7CB8F7"
  },
  sparkleOne: {
    position: "absolute",
    left: 14,
    top: 18,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  sparkleTwo: {
    position: "absolute",
    left: 36,
    top: 34,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.secondary
  },
  miniBabyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEFDF4"
  }
});
