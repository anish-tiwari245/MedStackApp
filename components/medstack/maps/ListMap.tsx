import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/medstack-colors';
import { SEV_META, sortBySeverityDesc } from '@/lib/severity';
import type { Pair } from '@/types/medstack';

export default function ListMap({
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
            <View style={[styles.gradeBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.gradeText, { color: meta.ink }]}>{meta.grade}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pairNames}>
                {labelFor(p.drugA)} + {labelFor(p.drugB)}
              </Text>
              <Text style={styles.pairSummary} numberOfLines={2}>
                {p.summary}
              </Text>
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
  gradeBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 15, fontWeight: '700' },
  pairNames: { fontSize: 14, fontWeight: '600', color: COLORS.ink, textTransform: 'capitalize' },
  pairSummary: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2, lineHeight: 16 },
});
