import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/medstack-colors';
import { sharedStyles } from '@/styles/shared';
import { sortBySeverityDesc } from '@/lib/severity';
import DetailCard from './DetailCard';
import NodeMap from './maps/NodeMap';
import ListMap from './maps/ListMap';
import SignalMap from './maps/SignalMap';
import type { Drug, Group, MapType, Pair } from '@/types/medstack';

const MAP_TABS: { type: MapType; label: string }[] = [
  { type: 'node', label: 'Node' },
  { type: 'list', label: 'List' },
  { type: 'signal', label: 'Signals' },
];

export default function MapScreen({
  drugs,
  groups,
  pairs,
  loading,
  mapType,
  onChangeMapType,
  labelFor,
}: {
  drugs: Drug[];
  groups: Group[];
  pairs: Pair[];
  loading: boolean;
  mapType: MapType;
  onChangeMapType: (t: MapType) => void;
  labelFor: (name: string) => string;
}) {
  const [groupId, setGroupId] = useState<'all' | string>('all');
  const [selected, setSelected] = useState<Pair | null>(null);

  const viewDrugs = groupId === 'all' ? drugs : drugs.filter((d) => d.groupId === groupId);
  const viewNames = useMemo(() => new Set(viewDrugs.map((d) => d.name.toLowerCase())), [viewDrugs]);
  const viewPairs = useMemo(
    () => (groupId === 'all' ? pairs : pairs.filter((p) => viewNames.has(p.drugA.toLowerCase()) && viewNames.has(p.drugB.toLowerCase()))),
    [pairs, viewNames, groupId]
  );
  const summary = useMemo(
    () =>
      viewPairs.reduce(
        (acc, p) => {
          acc[p.severity] += 1;
          return acc;
        },
        { red: 0, yellow: 0, green: 0 }
      ),
    [viewPairs]
  );
  const hottest = sortBySeverityDesc(viewPairs)[0];
  const active = (selected && viewPairs.includes(selected) ? selected : null) || hottest || null;

  if (drugs.length < 2) {
    return (
      <View style={sharedStyles.centerBox}>
        <Text style={sharedStyles.h2}>Add at least two medications</Text>
        <Text style={sharedStyles.subtle}>The safety map draws a connection the moment two drugs could interact.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ paddingTop: 8 }}>
      {groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <TouchableOpacity
            onPress={() => setGroupId('all')}
            style={[sharedStyles.filterChip, groupId === 'all' && sharedStyles.filterChipActive]}
          >
            <Text style={[sharedStyles.filterChipText, groupId === 'all' && sharedStyles.filterChipTextActive]}>All medications</Text>
          </TouchableOpacity>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => setGroupId(g.id)}
              style={[sharedStyles.filterChip, groupId === g.id && sharedStyles.filterChipActive]}
            >
              <Text style={[sharedStyles.filterChipText, groupId === g.id && sharedStyles.filterChipTextActive]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.eyebrow}>SAFETY MAP</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {summary.red > 0 && <Text style={[styles.sumText, { color: COLORS.redInk }]}>{summary.red} stop</Text>}
          {summary.yellow > 0 && <Text style={[styles.sumText, { color: COLORS.amberInk }]}>{summary.yellow} caution</Text>}
          {summary.green > 0 && <Text style={[styles.sumText, { color: COLORS.greenInk }]}>{summary.green} clear</Text>}
        </View>
      </View>

      <View style={styles.mapTypeRow}>
        {MAP_TABS.map((t) => {
          const isActive = mapType === t.type;
          return (
            <TouchableOpacity key={t.type} onPress={() => onChangeMapType(t.type)} style={[styles.mapTypeBtn, isActive && styles.mapTypeBtnActive]}>
              <Text style={[styles.mapTypeText, isActive && styles.mapTypeTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {viewDrugs.length < 2 ? (
        <View style={[sharedStyles.card, { marginTop: 10, padding: 24 }]}>
          <Text style={sharedStyles.subtle}>This group needs at least two medications to show a map.</Text>
        </View>
      ) : (
        <View style={[sharedStyles.card, { marginTop: 10, padding: mapType === 'node' ? 8 : 12 }]}>
          {loading && <Text style={styles.loadingText}>Checking live interactions...</Text>}
          {mapType === 'node' && <NodeMap drugs={viewDrugs} pairs={viewPairs} labelFor={labelFor} onSelectPair={setSelected} />}
          {mapType === 'list' && <ListMap pairs={viewPairs} selected={selected} labelFor={labelFor} onSelectPair={setSelected} />}
          {mapType === 'signal' && <SignalMap pairs={viewPairs} selected={selected} labelFor={labelFor} onSelectPair={setSelected} />}
          <Text style={styles.mapHint}>Tap any medication pair for details</Text>
        </View>
      )}

      {active && <DetailCard pair={active} labelFor={labelFor} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sumText: { fontSize: 12, fontWeight: '600' },
  mapTypeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 3,
    marginTop: 10,
  },
  mapTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  mapTypeBtnActive: { backgroundColor: COLORS.teal },
  mapTypeText: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft },
  mapTypeTextActive: { color: '#fff' },
  loadingText: { textAlign: 'center', fontSize: 12, color: COLORS.inkFaint, paddingVertical: 6 },
  mapHint: { textAlign: 'center', fontSize: 11.5, color: COLORS.inkFaint, paddingVertical: 8 },
});
