# Brand Standards & Visual Design Guide
**Owner:** John Bricks F. Ireneo — Software Developer & IT Operations  
**Design System:** *Swiss Editorial Engineering*

---

## 1. Design Philosophy (Anti-AI-Cliché Rules)
1. **No Neon / Dark-Glow Templates:** Avoid `#090e1a` backgrounds, radial cyan/purple glow blobs, glassmorphism blur navbars, and gradient-filled buttons.
2. **No Fake Placeholders:** Never render `"Add screenshot here"` boxes. Projects without public screenshots (e.g., NDA enterprise tools) must use structured **Architecture / Impact Spec** blocks instead.
3. **No Pill-Tag Spam:** Replace `border-radius: 999px` rainbow/cyan pill chips with quiet `4px` monospace tags or inline hairline-separated labels.
4. **Hairline Structure Over Heavy Shadows:** Use `1px solid` borders and generous whitespace (`24px`–`64px`) instead of drop-shadows or glowing borders.
5. **Human Voice:** Write direct, concrete engineering descriptions (what was built, how it works, measurable outcome)—no generic AI buzzwords.

---

## 2. Color Palette

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--bg` | `#F7F6F2` | Primary page canvas (warm off-white paper) |
| `--surface` | `#FFFFFF` | Elevated cards, media frames, modal/lightbox |
| `--surface-subtle` | `#EFECE4` | Muted panels, code/spec backgrounds, hover states |
| `--ink` | `#161615` | Primary headings and body copy |
| `--ink-muted` | `#575651` | Secondary descriptions, metadata, captions |
| `--border` | `#DFDDD4` | Hairline dividers, card borders, table rules |
| `--accent` | `#1E4D3B` | Primary brand accent (deep forest green — buttons, active states, key numbers) |
| `--accent-soft` | `#E7F0EC` | Subtle accent highlight background |

---

## 3. Typography
- **Display & UI Sans:** `"Plus Jakarta Sans"`, `"Segoe UI"`, `-apple-system`, `sans-serif`
  - Hero `h1`: `clamp(2.1rem, 4.2vw, 3.25rem)`, weight `700`, line-height `1.1`, letter-spacing `-0.03em`
  - Section `h2`: `1.35rem`, weight `700`, letter-spacing `-0.02em`
  - Body: `0.95rem`–`1rem`, line-height `1.6`
- **Monospace Metadata:** `"JetBrains Mono"`, `"Consolas"`, monospace
  - Used for project index numbers (`01`–`07`), dates, metrics, KPI labels, and tech stack tags (`0.75rem`).

---

## 4. Layout & Spacing Rules
- **Container:** `max-width: 1080px`, `padding: 0 24px`
- **Border Radius:** Strictly restrained (`6px` for cards/buttons, `4px` for tech tags)
- **Hero Layout:** 2-column asymmetric split (`1.4fr / 0.85fr` on desktop):
  - Left: Role kicker, bold statement headline, concise 2-sentence bio, and primary/secondary CTAs.
  - Right: Hairline-ruled **Quick Facts Ledger** (Current Role, Experience, Focus Areas, Location).
- **Project Cards:**
  - Projects with real media (`Dugtong Buhay` screenshot, `Real LIFE` live portal, `Nivadelir` Canva deck, `Uptime Kuma` SLA metrics) display clean framed previews or structured KPI grids.
  - NDA case studies (`AwareIM Merger`, `Workflow Automation`, `UMak Coursework`) render clean **Spec / Outcome** cards with index number (`01`), problem-to-solution summary, and stack tags—zero empty screenshot boxes.
- **Interactive States:** Subtle border darkening (`#B9B6AA`) and clean `1px` underline links; lightbox zoom for real project screenshots.

---

## 5. Content & NDA Compliance
- Keep client/employer names NDA-safe (`Appergence Software OPC`, genericized enterprise suite labels).
- Always pair metrics with real context (e.g., `22 services · 25s poll · 98.3%–99.97% SLA · 3 alert channels`).
- Keep live links (`mailto:`, LinkedIn, Canva pitch deck, local portal demo) clearly labeled and accessible (`target="_blank" rel="noopener noreferrer"`).
