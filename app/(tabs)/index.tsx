import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { COLORS } from '@/constants/medstack-colors';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import Auth from '@/components/medstack/Auth';
import Onboarding, { STEPS, type Rect } from '@/components/medstack/Onboarding';
import ScanScreen from '@/components/medstack/ScanScreen';
import StackScreen from '@/components/medstack/StackScreen';
import MapScreen from '@/components/medstack/MapScreen';
import type { Drug, Group, MapType, Pair, Summary, User } from '@/types/medstack';

const SEED: Drug[] = [
  { id: 'seed-1', name: 'metformin', dosage: '500 mg', frequency: '2x daily' },
  { id: 'seed-2', name: 'lisinopril', dosage: '10 mg', frequency: 'daily' },
  { id: 'seed-3', name: 'atorvastatin', dosage: '20 mg', frequency: 'daily' },
];

type Tab = 'scan' | 'stack' | 'map';

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomeScreen() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [selectedTab, setSelectedTab] = useState<Tab>('stack');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [summary, setSummary] = useState<Summary>({ red: 0, yellow: 0, green: 0 });
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState<MapType>('node');

  const tab: Tab = showOnboarding ? (STEPS[onboardStep].tab as Tab) : selectedTab;

  const appRef = useRef<View>(null);
  const scanBtnRef = useRef<View>(null);
  const stackBtnRef = useRef<View>(null);
  const mapBtnRef = useRef<View>(null);
  const [targetRects, setTargetRects] = useState<Record<string, Rect | null>>({});
  const [appHeight, setAppHeight] = useState(Dimensions.get('window').height);

  const recheck = useCallback(async (list: Drug[]) => {
    if (list.length < 2) {
      setPairs([]);
      setSummary({ red: 0, yellow: 0, green: 0 });
      return;
    }
    setLoading(true);
    try {
      const data = await api.stackCheck(list.map((d) => d.name));
      setPairs(data.pairs || []);
      setSummary({
        red: data.summary?.red || 0,
        yellow: data.summary?.yellow || 0,
        green: data.summary?.green || 0,
      });
    } catch {
      // keep last known state
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccountData = useCallback(
    async (u: User) => {
      const [savedDrugs, savedGroups, savedMapType, onboarded] = await Promise.all([
        storage.loadDrugs(u.id),
        storage.loadGroups(u.id),
        storage.loadMapType(u.id),
        storage.loadOnboarded(u.id),
      ]);
      setUser(u);
      setGroups(savedGroups);
      setMapType(savedMapType);
      if (!onboarded) {
        setDrugs(SEED);
        setShowOnboarding(true);
        setOnboardStep(0);
        setSelectedTab('stack');
        recheck(SEED);
      } else {
        setDrugs(savedDrugs);
        setShowOnboarding(false);
        recheck(savedDrugs);
      }
    },
    [recheck]
  );

  useEffect(() => {
    (async () => {
      const sessionId = await storage.loadSession();
      if (sessionId) {
        const users = await storage.loadUsers();
        const found = users.find((u) => u.id === sessionId);
        if (found) {
          await loadAccountData(found);
        }
      }
      setBooting(false);
    })();
  }, [loadAccountData]);

  useEffect(() => {
    if (!showOnboarding) return;
    const timer = setTimeout(() => {
      if (!appRef.current) return;
      appRef.current.measureInWindow((ax, ay) => {
        const rel = (ref: React.RefObject<View | null>, cb: (r: Rect | null) => void) => {
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

  const handleAuthed = useCallback(
    async (u: User) => {
      await storage.saveSession(u.id);
      await loadAccountData(u);
    },
    [loadAccountData]
  );

  const signOut = useCallback(async () => {
    await storage.saveSession(null);
    setUser(null);
    setDrugs([]);
    setGroups([]);
    setPairs([]);
    setSummary({ red: 0, yellow: 0, green: 0 });
    setSelectedTab('stack');
    setShowOnboarding(false);
  }, []);

  const finishOnboarding = useCallback(
    async (chosenMapType: MapType) => {
      setShowOnboarding(false);
      setDrugs([]);
      setPairs([]);
      setSummary({ red: 0, yellow: 0, green: 0 });
      setMapType(chosenMapType);
      setSelectedTab('scan');
      if (user) {
        await Promise.all([
          storage.saveOnboarded(user.id, true),
          storage.saveDrugs(user.id, []),
          storage.saveMapType(user.id, chosenMapType),
        ]);
      }
    },
    [user]
  );

  function addDrug(d: Omit<Drug, 'id'>) {
    if (!d?.name) return;
    setDrugs((prev) => {
      if (prev.some((x) => x.name.toLowerCase() === d.name.toLowerCase())) return prev;
      const next = [...prev, { ...d, id: newId() }];
      recheck(next);
      if (user) storage.saveDrugs(user.id, next);
      return next;
    });
    setSelectedTab('map');
  }

  function removeDrug(id: string) {
    setDrugs((prev) => {
      const next = prev.filter((x) => x.id !== id);
      recheck(next);
      if (user) storage.saveDrugs(user.id, next);
      return next;
    });
  }

  function renameDrug(id: string, displayName: string | null) {
    setDrugs((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, displayName } : x));
      if (user) storage.saveDrugs(user.id, next);
      return next;
    });
  }

  function assignGroup(drugId: string, groupId: string | null) {
    setDrugs((prev) => {
      const next = prev.map((x) => (x.id === drugId ? { ...x, groupId } : x));
      if (user) storage.saveDrugs(user.id, next);
      return next;
    });
  }

  function createGroup(name: string) {
    setGroups((prev) => {
      const next = [...prev, { id: newId(), name }];
      if (user) storage.saveGroups(user.id, next);
      return next;
    });
  }

  function deleteGroup(id: string) {
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== id);
      if (user) storage.saveGroups(user.id, next);
      return next;
    });
    setDrugs((prev) => {
      const next = prev.map((d) => (d.groupId === id ? { ...d, groupId: null } : d));
      if (user) storage.saveDrugs(user.id, next);
      return next;
    });
  }

  function changeMapType(t: MapType) {
    setMapType(t);
    if (user) storage.saveMapType(user.id, t);
  }

  const labelFor = useCallback(
    (name: string) => {
      const d = drugs.find((x) => x.name.toLowerCase() === name.toLowerCase());
      return d?.displayName || name;
    },
    [drugs]
  );

  if (booting) {
    return (
      <View style={[styles.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.teal} />
      </View>
    );
  }

  if (!user) {
    return <Auth onAuthed={handleAuthed} />;
  }

  return (
    <View style={styles.app} ref={appRef} onLayout={(e) => setAppHeight(e.nativeEvent.layout.height)}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            Med<Text style={styles.brandEm}>Stack</Text>
          </Text>
        </View>
        {!showOnboarding && (
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        {tab === 'scan' && <ScanScreen onAdd={addDrug} />}
        {tab === 'stack' && (
          <StackScreen
            drugs={drugs}
            groups={groups}
            pairs={pairs}
            summary={summary}
            onRemove={removeDrug}
            onRename={renameDrug}
            onCreateGroup={createGroup}
            onDeleteGroup={deleteGroup}
            onAssignGroup={assignGroup}
            onGoScan={() => setSelectedTab('scan')}
          />
        )}
        {tab === 'map' && (
          <MapScreen
            drugs={drugs}
            groups={groups}
            pairs={pairs}
            loading={loading}
            mapType={mapType}
            onChangeMapType={changeMapType}
            labelFor={labelFor}
          />
        )}

        {tab !== 'scan' && (
          <Text style={styles.disclaimer}>
            MedStack is a prototype, not medical advice. Always confirm with a doctor or pharmacist.
          </Text>
        )}
      </View>

      <View style={styles.tabbar}>
        <View ref={scanBtnRef} style={{ flex: 1 }}>
          <TabButton label="Scan" icon="scan" active={tab === 'scan'} onPress={() => !showOnboarding && setSelectedTab('scan')} />
        </View>
        <View ref={stackBtnRef} style={{ flex: 1 }}>
          <TabButton label="Stack" icon="stack" active={tab === 'stack'} onPress={() => !showOnboarding && setSelectedTab('stack')} />
        </View>
        <View ref={mapBtnRef} style={{ flex: 1 }}>
          <TabButton label="Map" icon="map" active={tab === 'map'} onPress={() => !showOnboarding && setSelectedTab('map')} />
        </View>
      </View>

      {showOnboarding && (
        <Onboarding
          step={onboardStep}
          targetRects={targetRects}
          appHeight={appHeight}
          onNext={() => setOnboardStep((n) => n + 1)}
          onSkip={() => finishOnboarding('node')}
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

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 54,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: { fontSize: 23, fontWeight: '400', color: COLORS.ink, fontFamily: 'Georgia' },
  brandEm: { fontStyle: 'italic', color: COLORS.teal },
  signOut: { fontSize: 12.5, color: COLORS.inkFaint, fontWeight: '500', marginBottom: 2 },
  body: { flex: 1, paddingHorizontal: 18 },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.bg,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabBtn: { alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '500', color: COLORS.inkFaint },
  disclaimer: { fontSize: 11, color: COLORS.inkFaint, textAlign: 'center', lineHeight: 16, paddingTop: 16 },
});
