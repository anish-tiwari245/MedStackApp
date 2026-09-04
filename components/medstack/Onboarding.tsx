import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/medstack-colors';
import { sharedStyles } from '@/styles/shared';
import type { MapType } from '@/types/medstack';

export type Rect = { left: number; top: number; width: number; height: number };

export const STEPS = [
  { target: null as string | null, tab: 'stack', title: 'Welcome to MedStack', body: "Point your phone at a pill bottle and we'll map how your medications interact. Quick tour first." },
  { target: 'scan', tab: 'scan', title: 'Scan', body: "Add a medication by photographing its label, or enter it manually if the camera isn't available." },
  { target: 'stack', tab: 'stack', title: 'Stack', body: 'Every medication you add, color-coded by its most serious known interaction. Group them however you like - by time of day, by prescriber, or not at all.' },
  { target: 'map', tab: 'map', title: 'Map', body: 'Tap any medication pair for a plain-English explanation of the risk.' },
  { target: null as string | null, tab: 'map', legend: true, title: 'Reading the safety map', body: 'This example stack shows all three. Each pair is color-coded:' },
  { target: null as string | null, tab: 'map', picker: true, title: 'Choose how you see it', body: 'Pick the map style you like best - you can switch anytime from the Map tab.' },
];

const MAP_OPTIONS: { type: MapType; title: string; body: string }[] = [
  { type: 'node', title: 'Node map', body: 'The connected web view - dots for medications, lines for interactions.' },
  { type: 'list', title: 'Relationship list', body: 'Every pair listed plainly with a letter grade, A to F.' },
  { type: 'signal', title: 'Traffic signals', body: 'Each interaction shown as a red, yellow, or green signal.' },
];

export default function Onboarding({
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
  onFinish: (mapType: MapType) => void;
}) {
  const [mapType, setMapType] = useState<MapType>('node');
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
          ...(rect ? { top: Math.max(60, rect.top - 200) } : { top: appHeight / 2 - 160 }),
        }}
      >
        <View style={[sharedStyles.card, { padding: 20, backgroundColor: '#fff' }]}>
          <Text style={[sharedStyles.eyebrow, { color: COLORS.teal, marginBottom: 6 }]}>
            STEP {step + 1} OF {STEPS.length}
          </Text>
          <Text style={styles.onboardTitle}>{s.title}</Text>
          <Text style={[styles.onboardBody, { marginBottom: (s as any).legend || (s as any).picker ? 12 : 18 }]}>{s.body}</Text>

          {(s as any).legend && (
            <View style={{ gap: 8, marginBottom: 18 }}>
              <LegendRow color={COLORS.red} label="STOP" desc="Avoid, or needs medical supervision" />
              <LegendRow color={COLORS.amber} label="Yellow" desc="Use caution, monitor" />
              <LegendRow color={COLORS.green} label="Green" desc="No known interaction" />
            </View>
          )}

          {(s as any).picker && (
            <View style={{ gap: 8, marginBottom: 18 }}>
              {MAP_OPTIONS.map((opt) => {
                const active = mapType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    onPress={() => setMapType(opt.type)}
                    style={[styles.mapOption, active && styles.mapOptionActive]}
                  >
                    <View style={[styles.mapOptionDot, active && { backgroundColor: COLORS.teal, borderColor: COLORS.teal }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mapOptionTitle}>{opt.title}</Text>
                      <Text style={styles.mapOptionBody}>{opt.body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!isLast && (
              <TouchableOpacity style={[sharedStyles.btnGhost, { flex: 1, marginTop: 0 }]} onPress={onSkip}>
                <Text style={sharedStyles.btnGhostText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[sharedStyles.btnPrimary, { flex: 1, marginTop: 0 }]}
              onPress={isLast ? () => onFinish(mapType) : onNext}
            >
              <Text style={sharedStyles.btnPrimaryText}>{isLast ? 'Get started' : 'Next'}</Text>
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

const styles = StyleSheet.create({
  onboardTitle: { fontSize: 19, color: COLORS.ink, marginBottom: 8, fontWeight: '400', fontFamily: 'Georgia' },
  onboardBody: { fontSize: 14, lineHeight: 21.7, color: COLORS.inkSoft },
  mapOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  mapOptionActive: { borderColor: COLORS.teal, backgroundColor: '#eef6f4' },
  mapOptionDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, marginTop: 2 },
  mapOptionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  mapOptionBody: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2, lineHeight: 17 },
});
