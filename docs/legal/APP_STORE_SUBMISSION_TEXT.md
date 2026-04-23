# App Store Submission — Copy/Paste Reference

_Last updated: 2026-04-22_

This file contains ready-to-paste text for the iOS App Store Connect and Google Play Console review forms, specifically for **content rights and third-party content disclosures**.

Host [CONTENT_RIGHTS.md](./CONTENT_RIGHTS.md) publicly (e.g. GitHub Pages, Vercel static route, or company site) and reference its URL in both stores' submission metadata.

---

## iOS — App Store Connect

### "Content Rights Information" (App Information tab)

When prompted with:

> **Does your app contain, display, or access third-party content?**

Select: **Yes**

In the free-text field **"Content Rights Information"**, paste:

```
MTG Sliver Tracker is an unofficial companion tool for Magic: The Gathering Commander players.

Card data (names, color identity, commander legality, and art-crop image URLs) is retrieved from the Scryfall API under their publicly documented terms of use (https://scryfall.com/docs/api). Scryfall's compiled dataset is licensed under Creative Commons Attribution-NonCommercial 4.0 International. Requests are made with a descriptive User-Agent and respect Scryfall's rate-limit guidelines.

Magic: The Gathering is a trademark of Wizards of the Coast LLC. The app is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy (https://company.wizards.com/en/legal/fancontentpolicy) and is not approved or endorsed by Wizards of the Coast.

UI iconography uses Ionicons under the MIT License. Typography uses Google Fonts released under the SIL Open Font License 1.1.

All user-generated content (player names, deck names, match data) is owned by the user who entered it.

Full attribution and licensing details: https://mtg.aboutagency.mx/content-rights
```

> **Replace `https://mtg.aboutagency.mx/content-rights`** with the public URL where you host CONTENT_RIGHTS.md.

### Copyright field

Enter in the "Copyright" field (App Information tab):

```
© 2026 About Agency. Portions © Wizards of the Coast LLC under Fan Content Policy. Card data © Scryfall, LLC.
```

### Privacy Policy URL

Already shared — continue using the same URL.

### Support URL

```
https://mtg.aboutagency.mx/support
```

### Marketing URL (optional)

```
https://mtg.aboutagency.mx
```

### Trade Representative Contact Information

Not required unless distributing in South Korea.

### Age Rating

Recommend: **4+** (no objectionable content). During the questionnaire, answer "None" to all categories unless your app adds user-generated chat/messaging (it does not at MVP).

---

## Google Play — Play Console

### "App Content" → "Content rating" section

Use the IARC questionnaire. For this app:
- **Category:** Utility / Reference
- **User-generated content:** No (players enter their own game data; no user-to-user messaging or public posting)
- **Violence, sexual content, profanity, controlled substances, gambling:** All "No"

Expected rating: **Everyone** / **PEGI 3**.

### "App Content" → "Ads" section

If you ship with AdMob / Unity Ads: select **Yes, my app contains ads**. If you launch without ads, select **No** and update when you add monetisation.

### "Store listing" → "App details"

**Short description (80 chars):**

```
Track Magic: The Gathering Commander matches — life, counters, win stats.
```

**Full description (paste in the long description field):**

```
MTG Sliver Tracker is the fastest way to run a Commander night.

• Track life totals, poison counters, and commander damage for 2–4 players on one device.
• Persist every match — no more forgotten scores or disputed wins.
• Win-rate stats per player, deck, and commander — see who really owns the pod.
• Group mode for your regular playgroup with shared players and decks.
• Works offline at the table; syncs when you're back online.

Card data provided by Scryfall.

Unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved or endorsed by Wizards of the Coast. Magic: The Gathering is a trademark of Wizards of the Coast LLC.
```

### "Data safety" form — Third-party content disclosure

If asked to describe third-party content or data sources in free-text, paste:

```
Card data (names, color identity, art-crop image URLs) is fetched from the public Scryfall API (scryfall.com) under Creative Commons Attribution-NonCommercial 4.0 International. UI icons use Ionicons (MIT). Typography uses Google Fonts (SIL Open Font License 1.1). Full attribution at https://mtg.aboutagency.mx/content-rights.
```

### Copyright / ownership declaration

In the "App access" or equivalent ownership field:

```
© 2026 About Agency. Portions © Wizards of the Coast LLC under Fan Content Policy. Card data © Scryfall, LLC.
```

---

## What to replace before submitting

Search and replace across both stores:

| Placeholder | Replace with |
|-------------|--------------|
| `mtg.aboutagency.mx` | Your public domain (e.g. `mtgslivertracker.com` or `aboutagency.com/mtgsliver`) |
| `support@aboutagency.com` | `feedback@aboutagency.mx` |

---

## Checklist before hitting "Submit for Review"

- [ ] [CONTENT_RIGHTS.md](./CONTENT_RIGHTS.md) hosted and reachable at the URL referenced above
- [ ] Privacy Policy URL reachable (already shared)
- [ ] Support URL reachable
- [ ] Copyright string entered in both stores
- [ ] Content rights blurb pasted into iOS Content Rights Information
- [ ] Scryfall attribution present in description text
- [ ] Fan Content Policy disclaimer present in description text
- [ ] Icon 1024×1024 (iOS) and 512×512 (Play) uploaded
- [ ] Screenshots uploaded (see sizes in earlier checklist)
- [ ] Age rating questionnaire completed
