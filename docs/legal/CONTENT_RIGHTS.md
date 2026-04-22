# Content Rights & Attributions — MTG Sliver Tracker

_Last updated: 2026-04-22_

MTG Sliver Tracker ("the App") is an unofficial companion tool for players of Magic: The Gathering Commander. This page documents all third-party content, data, and software used by the App and the rights under which it is used.

---

## 1. Magic: The Gathering (Wizards of the Coast)

MTG Sliver Tracker is unofficial **Fan Content** permitted under the Wizards of the Coast [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). It is **not approved, endorsed, or affiliated with Wizards of the Coast LLC**.

All Magic: The Gathering card names, mana symbols, set symbols, expansion names, keyword abilities, and related trademarks are the property of Wizards of the Coast LLC, a subsidiary of Hasbro, Inc.

> **© Wizards of the Coast LLC.** Portions of the materials used are property of Wizards of the Coast. Used under the Fan Content Policy.

The App does not reproduce full card text, rules text, or card artwork beyond what is permitted for non-commercial companion tools. Users of the App are expected to own or have legal access to the physical or digital cards they track.

---

## 2. Card Data — Scryfall

Card names, color identity, partner legality, and art-crop image URLs used for commander lookup are retrieved from the [Scryfall API](https://scryfall.com/docs/api), operated by Scryfall, LLC.

- **Source:** https://scryfall.com
- **Licence of Scryfall's compiled dataset:** [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)
- **Terms of use:** https://scryfall.com/docs/api

The App complies with Scryfall's API usage guidelines:

- Requests are made with a descriptive `User-Agent` header identifying the App.
- Request pacing respects Scryfall's ~50–100 ms courtesy rate limit.
- Results are cached locally only for the user's convenience and are not redistributed.

> **Card data © Scryfall, LLC.** Card images originate from and are copyrighted by Wizards of the Coast.

---

## 3. Icons — Ionicons

Tab bar and UI iconography is provided by [Ionicons](https://ionic.io/ionicons), developed by Ionic and distributed under the [MIT License](https://github.com/ionic-team/ionicons/blob/main/LICENSE).

> © Ionic — Ionicons, used under the MIT License.

---

## 4. Typography — Google Fonts

The App uses the following typefaces, all licensed under the [SIL Open Font License 1.1 (OFL)](https://openfontlicense.org/):

| Font | Designer(s) | Used for |
|------|-------------|----------|
| Space Grotesk | Florian Karsten | Mystic Archive headings |
| Manrope | Mikhail Sharanda | Mystic Archive body |
| Big Shoulders Display | Patric King (Oh No Type Co.) | Mystic Archive display |
| Noto Serif | Google | Justice of the Light headings/body |
| Work Sans | Wei Huang | Justice of the Light body |

All fonts are distributed via [Google Fonts](https://fonts.google.com) under the OFL and embedded in the App for offline use, consistent with the licence.

---

## 5. Open-Source Software

The App is built on the following open-source frameworks and libraries. Full dependency and licence lists are available in the project's `package.json` and the `node_modules` disclosures on request.

| Component | Licence |
|-----------|---------|
| React Native | MIT |
| Expo + Expo Router | MIT |
| Drizzle ORM | Apache-2.0 |
| Clerk SDK for Expo | MIT |
| React Navigation | MIT |
| react-i18next | MIT |
| react-native-reanimated | MIT |
| react-native-gesture-handler | MIT |
| react-native-safe-area-context | MIT |

Additional dependencies are listed in `package.json`; each is used in accordance with its respective licence.

---

## 6. User-Generated Content

All player names, deck names, commander assignments, match results, life totals, counters, and related game data entered by users are the property of the user who created them. The App stores this data on behalf of the user and does not claim ownership.

Group features allow shared access to group-scoped content among invited members; invited members do not obtain ownership of the underlying data beyond the life of the group.

---

## 7. App Name, Branding, and Iconography

"MTG Sliver Tracker", the App icon, and any original artwork or graphic design produced for the App (excluding Wizards of the Coast IP noted above) are © About Agency, 2026. All rights reserved.

---

## 8. Contact

Questions about content rights, attribution, or licensing should be directed to:

**About Agency** — support@aboutagency.com

Takedown or attribution requests will be addressed within a reasonable timeframe.
