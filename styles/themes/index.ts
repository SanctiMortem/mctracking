export type { AppTheme, ThemeId, ThemeColors, ThemeShadows, ThemeTypography, ThemeRadius } from './types';
export { mysticArchive } from './mysticArchive';
export { justiceOfTheLight } from './justiceOfTheLight';

import type { AppTheme, ThemeId } from './types';
import { mysticArchive } from './mysticArchive';
import { justiceOfTheLight } from './justiceOfTheLight';

export const themes: Record<ThemeId, AppTheme> = {
  'mystic-archive': mysticArchive,
  'justice-of-the-light': justiceOfTheLight,
};

export const themeList: AppTheme[] = [mysticArchive, justiceOfTheLight];
