/**
 * ManaSymbol — the original Scryfall mana symbols.
 *
 * Scryfall only hosts SVGs (svgs.scryfall.io/card-symbols/…) which React
 * Native's <Image> can't render directly. We pipe through images.weserv.nl —
 * a free public image CDN that rasterises the SVG to PNG on the fly — so we
 * can display them with the built-in <Image> component, no native modules
 * required.
 *
 * One pip per color in a card's Scryfall color_identity (W/U/B/R/G); empty
 * identity renders the 'C' (colorless) pip.
 */
import { Image, View } from 'react-native';

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

const SIZE_MAP = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 40,
} as const;

type SizeKey = keyof typeof SIZE_MAP;

function symbolUri(color: ManaColor, size: number): string {
  // weserv requires the host without protocol; we ask for PNG at 2x the
  // rendered size for crisp retina output.
  const pixel = size * 2;
  return `https://images.weserv.nl/?url=svgs.scryfall.io/card-symbols/${color}.svg&output=png&w=${pixel}&h=${pixel}`;
}

interface ManaSymbolProps {
  color: ManaColor;
  size?: SizeKey;
}

export function ManaSymbol({ color, size = 'sm' }: ManaSymbolProps) {
  const diameter = SIZE_MAP[size];
  return (
    <Image
      source={{ uri: symbolUri(color, diameter) }}
      style={{ width: diameter, height: diameter }}
      accessibilityLabel={`Mana ${color}`}
    />
  );
}

interface ManaIdentityRowProps {
  /** Subset of WUBRG; empty = colorless (renders a single 'C' pip) */
  colors: string[];
  size?: SizeKey;
  gap?: number;
}

export function ManaIdentityRow({ colors, size = 'sm', gap = 4 }: ManaIdentityRowProps) {
  if (colors.length === 0) {
    return (
      <View style={{ flexDirection: 'row' }}>
        <ManaSymbol color="C" size={size} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap }}>
      {(colors.filter(isManaColor) as ManaColor[]).map((c) => (
        <ManaSymbol key={c} color={c} size={size} />
      ))}
    </View>
  );
}

function isManaColor(c: string): c is ManaColor {
  return c === 'W' || c === 'U' || c === 'B' || c === 'R' || c === 'G' || c === 'C';
}
