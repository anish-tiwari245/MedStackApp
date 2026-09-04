import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import * as Speech from 'expo-speech';

const BACKEND_URL = 'http://192.168.1.244:8080';

const COLORS = {
  bg: '#f4f6f4',
  surface: '#ffffff',
  ink: '#1c2b27',
  inkSoft: '#5a6b66',
  inkFaint: '#8b9a95',
  line: '#dde5e1',
  teal: '#0f766e',
  red: '#c2453b',
  redSoft: '#f6e3e1',
  redInk: '#8f2f28',
  amber: '#c98a1e',
  amberSoft: '#f7ecd6',
  amberInk: '#8a5e12',
  green: '#3f8f6b',
  greenSoft: '#dcefe4',
  greenInk: '#2c6b4e',
};

async function post(path: string, body: any) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

const api = {
  scan: (image: string, mimeType: string) => post('/api/scan', { image, mimeType }),
  stackCheck: (drugs: string[]) => post('/api/stack-check', { drugs }),
};

type Drug = { name: string; dosage?: string | null; frequency?: string | null; days?: string[] };
type Pair = { drugA: string; drugB: string; severity: 'red' | 'yellow' | 'green'; summary: string; action: string; sourceUrl?: string };
type Rect = { left: number; top: number; width: number; height: number };

const SEED: Drug[] = [
  { name: 'metformin', dosage: '500 mg', frequency: '2x daily', days: [] },
  { name: 'lisinopril', dosage: '10 mg', frequency: 'daily', days: [] },
  { name: 'atorvastatin', dosage: '20 mg', frequency: 'daily', days: [] },
];

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

const STEPS = [
  { target: null as string | null, tab: 'stack', title: 'Welcome to MedStack', body: "Point your phone at a pill bottle and we'll map how your medications interact. Quick tour first." },
  { target: 'scan', tab: 'scan', title: 'Scan', body: "Add a medication by photographing its label, or enter it manually if the camera isn't available." },
  { target: 'stack', tab: 'stack', title: 'Stack', body: 'Every medication you have added, color-coded by its most serious known interaction.' },
  { target: 'map', tab: 'map', title: 'Map', body: 'Tap any line between two medications for a plain-English explanation of the risk.' },
  { target: null as string | null, tab: 'map', legend: true, title: 'Reading the safety map', body: 'This example stack shows all three. Each line is color-coded:' },
];

export default function HomeScreen() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardStep, setOnboardStep] = useState(0);
  const [tab, setTab] = useState<'scan' | 'stack' | 'map'>('stack');
  const [drugs, setDrugs] = useState<Drug[]>(SEED);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [summary, setSummary] = useState({ red: 0, amber: 0, green: 0 });
  const [loading, setLoading] = useState(false);

  const appRef = useRef<View>(null);
  const scanBtnRef = useRef<View>(null);
  const stackBtnRef = useRef<View>(null);
  const mapBtnRef = useRef<View>(null);
  const [targetRects, setTargetRects] = useState<Record<string, Rect | null>>({});
  const [appHeight, setAppHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    if (!showOnboarding) return;
    setTab(STEPS[onboardStep].tab as any);
  }, [showOnboarding, onboardStep]);

  useEffect(() => {
    if (!showOnboarding) return;
    const timer = setTimeout(() => {
      if (!appRef.current) return;
      appRef.current.measureInWindow((ax, ay) => {
        const rel = (ref: React.RefObject<View>, cb: (r: Rect | null) => void) => {
          if (!ref.current) return cb(null);
          ref.current.measureInWindow((x, y, w, h) => cb({ left: x - ax, top: y - ay, width: w, height: h }));
        };
        rel(scanBtnRef, (scan) => rel(stackBtnRef, (stack) => rel(mapBtnRef, (map) => {
          setTargetRects({ scan, stack, map });
        })));
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [showOnboarding, onboardStep, tab]);

  function finishOnboarding() {
    setShowOnboarding(false);
    setDrugs([]);
    setPairs([]);
    setSummary({ red: 0, amber: 0, green: 0 });
    setTab('scan');
  }

  const recheck = useCallback(async (list: Drug[]) => {
    if (list.length < 2) {
      setPairs([]);
      setSummary({ red: 0, amber: 0, green: 0 });
      return;
    }
    setLoading(true);
    try {
      const data = await api.stackCheck(list.map((d) => d.name));
      setPairs(data.pairs || []);
      setSummary({
        red: data.summary?.red || 0,
        amber: data.summary?.yellow || 0,
        green: data.summary?.green || 0,
      });
    } catch (e) {
      // keep last known state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recheck(drugs);
  }, []);

  function addDrug(d: Drug) {
    if (!d?.name) return;
    setDrugs((prev) => {
      if (prev.some((x) => x.name.toLowerCase() === d.name.toLowerCase())) return prev;
      const next = [...prev, { ...d, days: d.days || [] }];
      recheck(next);
      return next;
    });
    setTab('map');
  }

  function removeDrug(name: string) {
    setDrugs((prev) => {
      const next = prev.filter((x) => x.name.toLowerCase() !== name.toLowerCase());
      recheck(next);
      return next;
    });
  }

  function updateDrugDays(name: string, days: string[]) {
    setDrugs((prev) =>
      prev.map((x) => (x.name.toLowerCase() === name.toLowerCase() ? { ...x, days } : x))
    );
  }

  return (
    <View style={styles.app} ref={appRef} onLayout={(e) => setAppHeight(e.nativeEvent.layout.height)}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          Med<Text style={styles.brandEm}>Stack</Text>
        </Text>
        <Text style={styles.brandTag}>SAFETY MAP</Text>
      </View>

      <View style={styles.body}>
        {tab === 'scan' && <ScanScreen onAdd={addDrug} />}
        {tab === 'stack' && (
          <StackScreen
            drugs={drugs}
            pairs={pairs}
            summary={summary}
            onRemove={removeDrug}
            onUpdateDays={updateDrugDays}
            onGoScan={() => setTab('scan')}
          />
        )}
        {tab === 'map' && <MapScreen drugs={drugs} pairs={pairs} loading={loading} />}

        {tab !== 'scan' && (
          <Text style={styles.disclaimer}>
            MedStack is a prototype, not medical advice. Always confirm with a doctor or pharmacist.
          </Text>
        )}
      </View>

      <View style={styles.tabbar}>
        <View ref={scanBtnRef} style={{ flex: 1 }}>
          <TabButton label="Scan" icon="scan" active={tab === 'scan'} onPress={() => !showOnboarding && setTab('scan')} />
        </View>
        <View ref={stackBtnRef} style={{ flex: 1 }}>
          <TabButton label="Stack" icon="stack" active={tab === 'stack'} onPress={() => !showOnboarding && setTab('stack')} />
        </View>
        <View ref={mapBtnRef} style={{ flex: 1 }}>
          <TabButton label="Map" icon="map" active={tab === 'map'} onPress={() => !showOnboarding && setTab('map')} />
        </View>
      </View>

      {showOnboarding && (
        <Onboarding
          step={onboardStep}
          targetRects={targetRects}
          appHeight={appHeight}
          onNext={() => setOnboardStep((n) => n + 1)}
          onSkip={finishOnboarding}
          onFinish={finishOnboarding}
        />
      )}
    </View>
  );
}

function IconCam({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 4l1.5 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4L9.5 4z" />
      <Circle cx="12" cy="13" r="3.2" />
    </Svg>
  );
}

function IconList({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

function IconMap({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="7" r="2.4" />
      <Circle cx="18" cy="9" r="2.4" />
      <Circle cx="11" cy="18" r="2.4" />
      <Path d="M7.7 8.6l2.6 7.4M16.2 10.6l-3.6 5.6M8 7.4l8 1.4" />
    </Svg>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: 'scan' | 'stack' | 'map'; active: boolean; onPress: () => void }) {
  const color = active ? COLORS.teal : COLORS.inkFaint;
  return (
    <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
      {icon === 'scan' && <IconCam color={color} />}
      {icon === 'stack' && <IconList color={color} />}
      {icon === 'map' && <IconMap color={color} />}
      <Text style={[styles.tabLabel, active && { color: COLORS.teal, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Onboarding({
  step,
  targetRects,
  appHeight,
  onNext,
  onSkip,
  onFinish,
}: {
  step: number;
  targetRects: Record<string, Rect | null>;
  appHeight: number;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const s = STEPS[step];
  const rect = s.target ? targetRects[s.target] : null;
  const isLast = step === STEPS.length - 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,18,16,0.72)' }]} pointerEvents="none" />
      {rect && (
        <View
          style={{
            position: 'absolute',
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: COLORS.teal,
            backgroundColor: 'transparent',
          }}
          pointerEvents="none"
        />
      )}

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          ...(rect ? { top: Math.max(60, rect.top - 200) } : { top: appHeight / 2 - 140 }),
        }}
      >
        <View style={[styles.card, { padding: 20, backgroundColor: '#fff' }]}>
          <Text style={[styles.eyebrow, { color: COLORS.teal, marginBottom: 6 }]}>
            STEP {step + 1} OF {STEPS.length}
          </Text>
          <Text style={styles.onboardTitle}>{s.title}</Text>
          <Text style={[styles.onboardBody, { marginBottom: (s as any).legend ? 12 : 18 }]}>{s.body}</Text>

          {(s as any).legend && (
            <View style={{ gap: 8, marginBottom: 18 }}>
              <LegendRow color={COLORS.red} label="Red" desc="Dangerous - avoid or needs medical supervision" />
              <LegendRow color={COLORS.amber} label="Yellow" desc="Use caution, monitor" />
              <LegendRow color={COLORS.green} label="Green" desc="No known interaction" />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!isLast && (
              <TouchableOpacity style={[styles.btnGhost, { flex: 1, marginTop: 0 }]} onPress={onSkip}>
                <Text style={styles.btnGhostText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, marginTop: 0 }]} onPress={isLast ? onFinish : onNext}>
              <Text style={styles.btnPrimaryText}>{isLast ? 'Get started' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function LegendRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text style={{ fontSize: 13.5, color: COLORS.ink }}>
        <Text style={{ fontWeight: '700' }}>{label}</Text> - <Text style={{ color: COLORS.inkSoft }}>{desc}</Text>
      </Text>
    </View>
  );
}

function ScanScreen({ onAdd }: { onAdd: (d: Drug) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'idle' | 'live' | 'reading'>('live');
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState('');
  const [mDose, setMDose] = useState('');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.eyebrow}>ADD A MEDICATION</Text>
        <Text style={styles.h2}>We need camera access</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnPrimaryText}>Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={() => setManual(true)}>
          <Text style={styles.btnGhostText}>Enter manually instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current) return;
    setStatus('reading');
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      const result = await api.scan(dataUrl, 'image/jpeg');
      onAdd({ name: result.drug, dosage: result.dosage, frequency: result.frequency });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message + ' - try again or enter manually.');
    } finally {
      setStatus('live');
    }
  };

  const addManual = () => {
    if (!mName.trim()) return;
    onAdd({ name: mName.trim().toLowerCase(), dosage: mDose.trim() || null });
    setMName('');
    setMDose('');
  };

  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <Text style={styles.eyebrow}>ADD A MEDICATION</Text>

      {!manual && (
        <View style={[styles.card, { flex: 1, marginTop: 10, overflow: 'hidden' }]}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          <View style={{ padding: 12, gap: 8 }}>
            <TouchableOpacity style={styles.btnPrimaryFull} onPress={capture} disabled={status === 'reading'}>
              {status === 'reading' ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Scan label</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setManual(true)}>
              <Text style={styles.btnGhostText}>Enter manually instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {manual && (
        <View style={[styles.card, { marginTop: 10, padding: 18, gap: 12 }]}>
          <View>
            <Text style={styles.eyebrow}>MEDICATION NAME</Text>
            <TextInput style={styles.input} value={mName} onChangeText={setMName} placeholder="e.g. warfarin" placeholderTextColor={COLORS.inkFaint} />
          </View>
          <View>
            <Text style={styles.eyebrow}>DOSAGE (OPTIONAL)</Text>
            <TextInput style={styles.input} value={mDose} onChangeText={setMDose} placeholder="e.g. 5 mg" placeholderTextColor={COLORS.inkFaint} />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={addManual}>
            <Text style={styles.btnPrimaryText}>Add to stack</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setManual(false)}>
            <Text style={styles.btnGhostText}>Use camera instead</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function worstFor(name: string, pairs: Pair[]) {
  const rank: any = { green: 0, yellow: 1, red: 2 };
  let worst = 'green';
  pairs.forEach((p) => {
    if ([p.drugA, p.drugB].map((d) => d.toLowerCase()).includes(name.toLowerCase())) {
      if (rank[p.severity] > rank[worst]) worst = p.severity;
    }
  });
  return worst as 'red' | 'yellow' | 'green';
}
const SEV_COLOR: any = { red: COLORS.red, yellow: COLORS.amber, green: COLORS.green };

function StackScreen({
  drugs,
  pairs,
  summary,
  onRemove,
  onUpdateDays,
  onGoScan,
}: {
  drugs: Drug[];
  pairs: Pair[];
  summary: any;
  onRemove: (n: string) => void;
  onUpdateDays: (n: string, d: string[]) => void;
  onGoScan: () => void;
}) {
  if (drugs.length === 0) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.h2}>No medications yet</Text>
        <Text style={styles.subtle}>Scan a pill bottle to start building this person's safety map.</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={onGoScan}>
          <Text style={styles.btnPrimaryText}>Scan first bottle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ paddingTop: 8 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.eyebrow}>CURRENT STACK - {drugs.length}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {summary.red > 0 && <Chip color="red" text={`${summary.red} red`} />}
          {summary.amber > 0 && <Chip color="amber" text={`${summary.amber} caution`} />}
          {summary.green > 0 && <Chip color="green" text={`${summary.green} safe`} />}
        </View>
      </View>

      <View style={{ gap: 10, marginTop: 12 }}>
        {drugs.map((d) => {
          const sev = worstFor(d.name, pairs);
          const days = d.days || [];
          return (
            <View key={d.name} style={[styles.card, { padding: 14, borderLeftWidth: 3, borderLeftColor: SEV_COLOR[sev] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drugName}>{d.name}</Text>
                  <Text style={styles.subtle}>{[d.dosage, d.frequency].filter(Boolean).join(' - ') || 'No dosage recorded'}</Text>
                </View>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: SEV_COLOR[sev] }} />
                <TouchableOpacity onPress={() => onRemove(d.name)}>
                  <Text style={{ color: COLORS.inkFaint, fontSize: 18 }}>x</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginRight: 2 }}>Days:</Text>
                {DAYS.map((day) => {
                  const on = days.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      onPress={() => onUpdateDays(d.name, on ? days.filter((k) => k !== day.key) : [...days, day.key])}
                      style={[styles.dayDot, on && { backgroundColor: COLORS.teal, borderColor: COLORS.teal }]}
                    >
                      <Text style={[styles.dayDotText, on && { color: '#fff' }]}>{day.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                {days.length === 0 && <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginLeft: 4 }}>every day</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Chip({ color, text }: { color: 'red' | 'amber' | 'green'; text: string }) {
  const bg = { red: COLORS.redSoft, amber: COLORS.amberSoft, green: COLORS.greenSoft }[color];
  const ink = { red: COLORS.redInk, amber: COLORS.amberInk, green: COLORS.greenInk }[color];
  const dot = { red: COLORS.red, amber: COLORS.amber, green: COLORS.green }[color];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <View style={[styles.chipDot, { backgroundColor: dot }]} />
      <Text style={{ color: ink, fontSize: 12, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}

function rank(s: string) {
  return ({ green: 0, yellow: 1, red: 2 } as any)[s] ?? 0;
}

function MapScreen({ drugs, pairs, loading }: { drugs: Drug[]; pairs: Pair[]; loading: boolean }) {
  const [selected, setSelected] = useState<Pair | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const hasGroups = drugs.some((d) => d.days && d.days.length);

  const viewDrugs = dayFilter ? drugs.filter((d) => !d.days?.length || d.days.includes(dayFilter)) : drugs;
  const viewNames = new Set(viewDrugs.map((d) => d.name.toLowerCase()));
  const viewPairs = dayFilter
    ? pairs.filter((p) => viewNames.has(p.drugA.toLowerCase()) && viewNames.has(p.drugB.toLowerCase()))
    : pairs;
  const summary = viewPairs.reduce(
    (acc: any, p) => {
      acc[p.severity] = (acc[p.severity] || 0) + 1;
      return acc;
    },
    { red: 0, yellow: 0, green: 0 }
  );
  const hottest = [...viewPairs].sort((a, b) => rank(b.severity) - rank(a.severity))[0];
  const active = selected || hottest;

  if (drugs.length < 2) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.h2}>Add at least two medications</Text>
        <Text style={styles.subtle}>The safety map draws a line the moment two drugs could interact.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ paddingTop: 8 }}>
      {hasGroups && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setDayFilter(null)} style={[styles.dayChip, !dayFilter && styles.dayChipActive]}>
            <Text style={[styles.dayChipText, !dayFilter && styles.dayChipTextActive]}>All</Text>
          </TouchableOpacity>
          {DAYS.map((d) => (
            <TouchableOpacity key={d.key} onPress={() => setDayFilter(d.key)} style={[styles.dayChip, dayFilter === d.key && styles.dayChipActive]}>
              <Text style={[styles.dayChipText, dayFilter === d.key && styles.dayChipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.rowBetween}>
        <Text style={styles.eyebrow}>SAFETY MAP</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {summary.red > 0 && <Chip color="red" text={`${summary.red} red`} />}
          {summary.yellow > 0 && <Chip color="amber" text={`${summary.yellow}`} />}
          {summary.green > 0 && <Chip color="green" text={`${summary.green}`} />}
        </View>
      </View>

      <View style={[styles.card, { marginTop: 10, padding: 8 }]}>
        {loading && <Text style={styles.loadingText}>Checking live interactions...</Text>}
        <SafetyGraph drugs={viewDrugs} pairs={viewPairs} onSelectPair={setSelected} />
        <Text style={styles.mapHint}>Tap any colored line for details</Text>
      </View>

      {active && <DetailCard pair={active} />}
    </ScrollView>
  );
}

const SEV_META: any = {
  red: { label: 'Dangerous', bg: COLORS.redSoft, ink: COLORS.redInk, dot: COLORS.red, line: COLORS.red },
  yellow: { label: 'Use caution', bg: COLORS.amberSoft, ink: COLORS.amberInk, dot: COLORS.amber, line: COLORS.amber },
  green: { label: 'No known issue', bg: COLORS.greenSoft, ink: COLORS.greenInk, dot: COLORS.green, line: COLORS.green },
};

function layout(n: number, cx: number, cy: number, r: number) {
  if (n === 1) return [{ x: cx, y: cy }];
  const pts = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function SafetyGraph({ drugs, pairs, onSelectPair }: { drugs: Drug[]; pairs: Pair[]; onSelectPair: (p: Pair) => void }) {
  const W = 340,
    H = 340,
    cx = W / 2,
    cy = H / 2;
  const R = drugs.length <= 2 ? 70 : drugs.length <= 4 ? 95 : 110;
  const pos = layout(drugs.length, cx, cy, R);
  const index = new Map(drugs.map((d, i) => [d.name.toLowerCase(), i]));

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={W}>
      {pairs.map((p, i) => {
        const a = index.get(p.drugA.toLowerCase());
        const b = index.get(p.drugB.toLowerCase());
        if (a == null || b == null) return null;
        const meta = SEV_META[p.severity] || SEV_META.green;
        return (
          <Line
            key={i}
            x1={pos[a].x}
            y1={pos[a].y}
            x2={pos[b].x}
            y2={pos[b].y}
            stroke={meta.line}
            strokeWidth={p.severity === 'red' ? 3 : p.severity === 'yellow' ? 2 : 1}
            strokeDasharray={p.severity === 'yellow' ? '6,5' : undefined}
            onPress={() => onSelectPair(p)}
          />
        );
      })}
      {drugs.map((d, i) => {
        const short = d.name.length > 9 ? d.name.slice(0, 8) + '.' : d.name;
        return (
          <React.Fragment key={d.name}>
            <Circle cx={pos[i].x} cy={pos[i].y} r={30} fill="#fff" stroke={COLORS.inkFaint} strokeWidth={2} />
            <SvgText x={pos[i].x} y={pos[i].y - 1} fontSize={11} fontWeight="600" fill={COLORS.ink} textAnchor="middle">
              {short}
            </SvgText>
            {!!d.dosage && (
              <SvgText x={pos[i].x} y={pos[i].y + 12} fontSize={8.5} fill={COLORS.inkFaint} textAnchor="middle">
                {d.dosage}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function DetailCard({ pair }: { pair: Pair }) {
  const meta = SEV_META[pair.severity] || SEV_META.green;
  const [spoken, setSpoken] = useState(false);
  const line = `${pair.drugA} and ${pair.drugB}. ${pair.summary} ${pair.action}`;

  const toggleSpeak = () => {
    if (spoken) {
      Speech.stop();
      setSpoken(false);
    } else {
      Speech.speak(line);
      setSpoken(true);
    }
  };

  return (
    <View style={[styles.card, { marginTop: 14, padding: 18, borderTopWidth: 3, borderTopColor: meta.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={[styles.chip, { backgroundColor: meta.bg }]}>
          <View style={[styles.chipDot, { backgroundColor: meta.dot }]} />
          <Text style={{ color: meta.ink, fontSize: 12, fontWeight: '500' }}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.pairTitle}>
        {pair.drugA} + {pair.drugB}
      </Text>
      <Text style={styles.pairSummary}>{pair.summary}</Text>
      <Text style={styles.pairAction}>
        <Text style={{ fontWeight: '600', color: COLORS.ink }}>What to do: </Text>
        {pair.action}
      </Text>
      <TouchableOpacity style={[styles.btnGhost, { width: '100%' }]} onPress={toggleSpeak}>
        <Text style={styles.btnGhostText}>{spoken ? 'Stop' : 'Read this aloud'}</Text>
      </TouchableOpacity>
      {!!pair.sourceUrl && <Text style={styles.sourceLink}>Source</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 54,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  brand: { fontSize: 23, fontWeight: '400', color: COLORS.ink, fontFamily: 'Georgia' },
  brandEm: { fontStyle: 'italic', color: COLORS.teal },
  brandTag: { fontSize: 11, color: COLORS.inkFaint, letterSpacing: 0.5 },
  body: { flex: 1, paddingHorizontal: 18 },
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: COLORS.inkFaint, textTransform: 'uppercase' },
  h2: { fontSize: 19, fontWeight: '400', color: COLORS.ink, textAlign: 'center', fontFamily: 'Georgia', paddingHorizontal: 10 },
  subtle: { fontSize: 13, color: COLORS.inkSoft, textAlign: 'center' },
  drugName: { fontSize: 15, fontWeight: '600', color: COLORS.ink, textTransform: 'capitalize' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnPrimary: {
    backgroundColor: COLORS.teal,
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    alignSelf: 'center',
  },
  btnPrimaryFull: {
    backgroundColor: COLORS.teal,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnGhost: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnGhostText: { color: COLORS.ink, fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    marginTop: 6,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  errorText: { color: COLORS.redInk, fontSize: 12.5, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  loadingText: { textAlign: 'center', fontSize: 12, color: COLORS.inkFaint, paddingVertical: 6 },
  mapHint: { textAlign: 'center', fontSize: 11.5, color: COLORS.inkFaint, paddingVertical: 8 },
  pairTitle: { fontSize: 18, fontWeight: '500', color: COLORS.ink, textTransform: 'capitalize', marginBottom: 8 },
  pairSummary: { fontSize: 14.5, lineHeight: 21, color: COLORS.ink, marginBottom: 10 },
  pairAction: { fontSize: 13.5, lineHeight: 20, color: COLORS.inkSoft, marginBottom: 12 },
  sourceLink: { textAlign: 'center', fontSize: 11.5, color: COLORS.teal, marginTop: 10 },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.bg,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabBtn: { alignItems: 'center', gap: 4 },
  tabDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.inkFaint },
  tabLabel: { fontSize: 11, fontWeight: '500', color: COLORS.inkFaint },
  disclaimer: { fontSize: 11, color: COLORS.inkFaint, textAlign: 'center', lineHeight: 16, paddingTop: 16 },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: { fontSize: 10.5, fontWeight: '600', color: COLORS.inkFaint },
  dayChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, marginRight: 6 },
  dayChipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  dayChipText: { fontSize: 12, fontWeight: '500', color: COLORS.inkSoft },
  dayChipTextActive: { color: '#fff' },
  onboardTitle: { fontSize: 19, color: COLORS.ink, marginBottom: 8, fontWeight: '400', fontFamily: 'Georgia' },
  onboardBody: { fontSize: 14, lineHeight: 21.7, color: COLORS.inkSoft },
});