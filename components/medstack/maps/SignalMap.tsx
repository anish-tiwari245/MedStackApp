import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/medstack-colors';
import { SEV_META, sortBySeverityDesc } from '@/lib/severity';
import type { Pair, Severity } from '@/types/medstack';

const DIM: Record<Severity, string> = { red: '#4a2b28', yellow: '#4a3c22', green: '#2a4235' };

function TrafficLight({ severity }: { severity: Severity }) {
  return (
    <View style={styles.housing}>
      <View style={[styles.bulb, { backgroundColor: severity === 'red' ? COLORS.red : DIM.red }]} />
      <View style={[styles.bulb, { backgroundColor: severity === 'yellow' ? COLORS.amber : DIM.yellow }]} />
      <View style={[styles.bulb, { backgroundColor: severity === 'green' ? COLORS.green : DIM.green }]} />
    </View>
  );
}

export default function SignalMap({
  pairs,
  selected,
  labelFor,
  onSelectPair,
}: {
  pairs: Pair[];
  selected: Pair | null;
  labelFor: (name: string) => string;
  onSelectPair: (p: Pair) => void;
}) {
  const sorted = sortBySeverityDesc(pairs);

  return (
    <View style={{ gap: 8 }}>
      {sorted.map((p, i) => {
        const meta = SEV_META[p.severity];
        const isActive = selected && selected.drugA === p.drugA && selected.drugB === p.drugB;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onSelectPair(p)}
            style={[styles.row, isActive && { borderColor: meta.line }]}
          >
            <TrafficLight severity={p.severity} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pairNames}>
                {labelFor(p.drugA)} + {labelFor(p.drugB)}
              </Text>
              <Text style={[styles.signalLabel, { color: meta.ink }]}>{meta.label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 12,
  },
  housing: {
    backgroundColor: '#1c2320',
    borderRadius: 8,
    padding: 5,
    gap: 4,
  },
  bulb: { width: 14, height: 14, borderRadius: 7 },
  pairNames: { fontSize: 14, fontWeight: '600', color: COLORS.ink, textTransform: 'capitalize' },
  signalLabel: { fontSize: 12, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
});
