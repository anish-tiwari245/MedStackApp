import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { COLORS } from '@/constants/medstack-colors';
import { sharedStyles } from '@/styles/shared';
import { SEV_META } from '@/lib/severity';
import type { Pair } from '@/types/medstack';

export default function DetailCard({ pair, labelFor }: { pair: Pair; labelFor: (name: string) => string }) {
  const meta = SEV_META[pair.severity];
  const [spoken, setSpoken] = useState(false);
  const nameA = labelFor(pair.drugA);
  const nameB = labelFor(pair.drugB);
  const line = `${nameA} and ${nameB}. ${pair.summary} ${pair.action}`;

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
    <View style={[sharedStyles.card, styles.wrap, { borderTopColor: meta.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={[sharedStyles.chip, { backgroundColor: meta.bg }]}>
          <View style={[sharedStyles.chipDot, { backgroundColor: meta.dot }]} />
          <Text style={{ color: meta.ink, fontSize: 12, fontWeight: '700' }}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.pairTitle}>
        {nameA} + {nameB}
      </Text>
      <Text style={styles.pairSummary}>{pair.summary}</Text>
      <Text style={styles.pairAction}>
        <Text style={{ fontWeight: '600', color: COLORS.ink }}>What to do: </Text>
        {pair.action}
      </Text>
      <TouchableOpacity style={[sharedStyles.btnGhost, { width: '100%' }]} onPress={toggleSpeak}>
        <Text style={sharedStyles.btnGhostText}>{spoken ? 'Stop' : 'Read this aloud'}</Text>
      </TouchableOpacity>
      {!!pair.sourceUrl && <Text style={styles.sourceLink}>Source</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, padding: 18, borderTopWidth: 3 },
  pairTitle: { fontSize: 18, fontWeight: '500', color: COLORS.ink, textTransform: 'capitalize', marginBottom: 8 },
  pairSummary: { fontSize: 14.5, lineHeight: 21, color: COLORS.ink, marginBottom: 10 },
  pairAction: { fontSize: 13.5, lineHeight: 20, color: COLORS.inkSoft, marginBottom: 12 },
  sourceLink: { textAlign: 'center', fontSize: 11.5, color: COLORS.teal, marginTop: 10 },
});
