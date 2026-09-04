import { COLORS } from '@/constants/medstack-colors';
import type { Pair, Severity } from '@/types/medstack';

export const SEV_META: Record<Severity, { label: string; grade: string; bg: string; ink: string; dot: string; line: string }> = {
  red: { label: 'STOP', grade: 'F', bg: COLORS.redSoft, ink: COLORS.redInk, dot: COLORS.red, line: COLORS.red },
  yellow: { label: 'Use caution', grade: 'C', bg: COLORS.amberSoft, ink: COLORS.amberInk, dot: COLORS.amber, line: COLORS.amber },
  green: { label: 'No known issue', grade: 'A', bg: COLORS.greenSoft, ink: COLORS.greenInk, dot: COLORS.green, line: COLORS.green },
};

export function severityRank(s: Severity) {
  return { green: 0, yellow: 1, red: 2 }[s];
}

export function worstFor(name: string, pairs: Pair[]): Severity {
  let worst: Severity = 'green';
  pairs.forEach((p) => {
    if ([p.drugA, p.drugB].map((d) => d.toLowerCase()).includes(name.toLowerCase())) {
      if (severityRank(p.severity) > severityRank(worst)) worst = p.severity;
    }
  });
  return worst;
}

export function sortBySeverityDesc(pairs: Pair[]): Pair[] {
  return [...pairs].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}
