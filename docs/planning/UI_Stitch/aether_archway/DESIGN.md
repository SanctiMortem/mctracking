# Design System: The Mystic Archive

## 1. Overview & Creative North Star
**Creative North Star: "The Relic Narrative"**

This design system moves beyond the utility of a standard tracker to create an immersive, editorial experience that feels like a living artifact. We are not building a spreadsheet; we are building a digital grimoire. By combining the aggressive, high-contrast readability of *MTG Arena* with the sophisticated depth of high-end luxury interfaces, we evoke the feeling of "Commanding" a game.

To break the "template" look, the system utilizes **Intentional Asymmetry** and **Tonal Depth**. We prioritize a "High-End Editorial" layout where massive, display-scale typography overlaps subtle, textured backgrounds. We reject rigid boxes in favor of organic layering, ensuring the UI feels integrated into the game's atmosphere rather than floating on top of it.

---

## 2. Colors & Surface Architecture

### The WUBRG & Amber Palette
The palette is rooted in the five colors of Magic, but anchored by a sophisticated, deep-earth neutral system.

*   **Primary (Amber/Gold):** `#eebf73` / `#c99e55`. This is your "Legendary" accent. Use it for critical path actions (CTAs) and to highlight active game states.
*   **WUBRG Integration:** Use the functional tokens (Secondary for Blue, Tertiary for Red/Pink hues) to represent mana identities, but always prioritize the `surface` tokens for the container to maintain a premium feel.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning. 
Structure is defined solely through:
1.  **Background Color Shifts:** A `surface-container-low` card sitting on a `surface` background.
2.  **Shadow-Defined Edges:** Subtle ambient glows that suggest a boundary without drawing a line.
3.  **Negative Space:** Using the spacing scale to create mental groupings.

### The "Glass & Gradient" Rule
To achieve the *MTG Arena* "soul," use **Glassmorphism** for floating gameplay elements (e.g., life counters, commander tax popups). 
*   **Technique:** Use `surface-container` colors at 70% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** Apply a linear gradient from `primary` to `primary_container` (at a 135-degree angle) for high-importance buttons to give them a metallic, embossed weight.

---

## 3. Typography
Typography is our primary tool for storytelling. We use a "Display-First" approach to mimic the iconic look of card headers.

*   **Display & Headlines (Space Grotesk):** This is our "Card Name" font. It is bold, modern, and high-impact. Use `display-lg` for life totals and `headline-md` for Phase transitions (e.g., "UPKEEP").
*   **Body & Labels (Manrope):** A clean, technical sans-serif that provides "Rules Text" clarity. It balances the aggression of the display face with geometric precision.
*   **Hierarchy Tip:** Never center-align everything. Use left-aligned headlines with right-aligned metadata to create an "Editorial Grid" that feels intentional and custom.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering** rather than structural lines.
*   **Base:** `surface` (The deep navy/black abyss).
*   **Level 1 (Sections):** `surface-container-low` (Subtle lift for player zones).
*   **Level 2 (Cards/Interactive):** `surface-container-highest` (High-contrast focus).

### Ambient Shadows
When a container must "float" (e.g., a modal to add mana), use an **Ambient Glow**:
*   **Color:** Use a 10% opacity version of `primary` (Amber).
*   **Setting:** 0px Y-offset, 20px Blur. This creates a "magical" radiance rather than a heavy industrial shadow.

### The "Ghost Border" Fallback
If contrast is needed for accessibility (e.g., a button in a low-light state), use a **Ghost Border**: `outline-variant` at 15% opacity. It should feel like a suggestion of an edge, not a hard stop.

---

## 5. Components

### Buttons (The "Spell" System)
*   **Primary:** Filled with the `primary` (Amber) gradient. Text is `on_primary` (Dark Brown). No border. Roundedness: `md` (0.375rem).
*   **Secondary:** `surface-container-highest` background with a `primary` text color. Use this for "Cast" actions that are not game-ending.
*   **Tertiary:** Ghost style. No background, `on_surface` text, used for "Cancel" or "Settings."

### Cards & Lists (The "Library" Layout)
*   **Requirement:** Forbid all divider lines.
*   **Separation:** Use `surface-container-low` for the list background and `surface-container-highest` for the individual list items.
*   **Interaction:** On tap, the card should scale down slightly (98%) and increase its "Ambient Glow."

### Gameplay Inputs (The "Counter" System)
*   **Life Totals:** Use `display-lg`. The number should have a subtle `primary` outer glow when the value changes.
*   **Mana Trackers:** Use circular containers with the specific WUBRG hex codes. When a value is `0`, the container should drop to 20% opacity to "deactivate" the visual weight.

### Chips (Mana Symbols & Tags)
*   Small, pill-shaped (`full` roundedness). 
*   Background: `surface-variant`.
*   Text: `on_surface_variant` in `label-sm` caps.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** allow typography to overlap the edge of containers slightly to create a bespoke, "designed" feel.
*   **Do** use `primary_container` for interactive states (Hover/Press) to create a "pulsing" effect.
*   **Do** use high-contrast scales—if a headline is big, make it *massive*.

### Don’t:
*   **Don't** use pure black `#000000`. Use the `surface` token (`#1c1102`) to maintain the "textured dark navy" richness.
*   **Don't** use standard "Material Design" shadows. They feel too "SaaS" and not "Magic."
*   **Don't** use divider lines between player names. Use vertical white space and subtle background shifts.
*   **Don't** use more than one `primary` action per screen. The Amber color must remain rare and "Legendary."