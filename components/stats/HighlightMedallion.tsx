/**
 * HighlightMedallion — the compass-dial badge on the left of each Pod
 * Highlight slide. Renders an outer amber ring with 12 evenly-spaced tick
 * marks, a darker inner disc with a soft radial gradient, and an outline
 * Feather icon centered inside. Pure SVG + a single <Feather> overlay; no
 * native deps beyond react-native-svg and @expo/vector-icons (both already
 * shipping in the bundle).
 */
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

import { Feather } from '@expo/vector-icons';

import { useTheme } from '@/contexts/ThemeContext';

interface HighlightMedallionProps {
  iconName: React.ComponentProps<typeof Feather>['name'];
  /** Overall outer diameter of the medallion in px. */
  size?: number;
}

export function HighlightMedallion({ iconName, size = 130 }: HighlightMedallionProps) {
  const { theme } = useTheme();
  const amber = theme.colors.accent.primary;          // #eebf73 (mystic archive)
  const amberFaint = amber + '55';
  const innerDark = theme.colors.background.primary;  // deep navy
  const innerLight = theme.colors.background.surface; // a shade lighter

  // Geometry — all in a 100×100 viewBox; render at any `size` and SVG scales.
  const cx = 50;
  const cy = 50;
  const outerR = 48;     // outer ring radius
  const innerR = 38;     // inner dark disc radius
  const tickInner = 41;  // tick mark inner end
  const tickOuter = 45;  // tick mark outer end
  const tickCount = 12;
  const iconSize = Math.round(size * 0.38);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="hmGrad" cx="50%" cy="30%" rx="60%" ry="60%">
            <Stop offset="0" stopColor={innerLight} stopOpacity="1" />
            <Stop offset="1" stopColor={innerDark} stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* Outer thin amber ring */}
        <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={amber} strokeWidth={1.2} />

        {/* Inner dark disc with subtle radial gradient + faint amber stroke */}
        <Circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="url(#hmGrad)"
          stroke={amberFaint}
          strokeWidth={0.5}
        />

        {/* 12 tick marks evenly spaced around the dial */}
        {Array.from({ length: tickCount }).map((_, i) => {
          const angle = (i / tickCount) * 2 * Math.PI - Math.PI / 2; // start at 12 o'clock
          const x1 = cx + Math.cos(angle) * tickInner;
          const y1 = cy + Math.sin(angle) * tickInner;
          const x2 = cx + Math.cos(angle) * tickOuter;
          const y2 = cy + Math.sin(angle) * tickOuter;
          return (
            <Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={amber}
              strokeWidth={0.7}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>

      {/* Icon overlay — absolutely centered on top of the SVG */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none"
      >
        <Feather name={iconName} size={iconSize} color={amber} />
      </View>
    </View>
  );
}
