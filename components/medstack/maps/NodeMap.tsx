import React from 'react';
import Svg, { Line, Circle, Text as SvgText, Polygon } from 'react-native-svg';
import { COLORS } from '@/constants/medstack-colors';
import { SEV_META } from '@/lib/severity';
import type { Drug, Pair } from '@/types/medstack';

const LINE_WIDTH = 3;

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

function octagonPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

export default function NodeMap({
  drugs,
  pairs,
  labelFor,
  onSelectPair,
}: {
  drugs: Drug[];
  pairs: Pair[];
  labelFor: (name: string) => string;
  onSelectPair: (p: Pair) => void;
}) {
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
        const meta = SEV_META[p.severity];
        const x1 = pos[a].x,
          y1 = pos[a].y,
          x2 = pos[b].x,
          y2 = pos[b].y;
        const mx = (x1 + x2) / 2,
          my = (y1 + y2) / 2;
        return (
          <React.Fragment key={i}>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={meta.line} strokeWidth={LINE_WIDTH} onPress={() => onSelectPair(p)} />
            {p.severity === 'red' && (
              <React.Fragment>
                <Polygon points={octagonPoints(mx, my, 10)} fill={COLORS.red} stroke="#fff" strokeWidth={1.5} onPress={() => onSelectPair(p)} />
                <SvgText x={mx} y={my + 2.5} fontSize={5.5} fontWeight="700" fill="#fff" textAnchor="middle" onPress={() => onSelectPair(p)}>
                  STOP
                </SvgText>
              </React.Fragment>
            )}
          </React.Fragment>
        );
      })}
      {drugs.map((d, i) => {
        const label = labelFor(d.name);
        const short = label.length > 9 ? label.slice(0, 8) + '.' : label;
        return (
          <React.Fragment key={d.id}>
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
