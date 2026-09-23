# VERA / Student Eligibility Proof Lab

## Product and user

VERA is a privacy-preserving student eligibility gate for campus services: students prove that they satisfy a published rule (for example, currently enrolled and aged 18+) without handing a verifier their date of birth, student ID, document, or wallet address. The primary audience is university students who are new to wallets and zero-knowledge proofs; secondary users are student-union and event administrators.

The central experience is a short, calm eight-step proof path: read the public requirement, load a local credential, inspect the privacy boundary, choose a disclosure scope, connect 1AM, generate a proof, wait for finality, and retain a public receipt. A public dashboard displays aggregate proof outcomes only. Gemini explains public policies and disclosure choices, but never receives a private witness or credential.

## Chosen visual direction: scientific field instrument

Treat the product like a precise, portable laboratory instrument rather than a crypto dashboard. The visual reference is a well-made field spectrometer: calibrated rulers, measurement readouts, labelled controls, deliberate whitespace, and a reassuring visible boundary between inputs and observed outputs. It is technical but gentle, designed to make students feel capable. There are no crypto gradients, glass cards, blockchain imagery, or generic neon terminal tropes.

Use the compact, high-contrast information discipline of the `ascii-hero` style prompt only as an inspiration for data legibility; do not adopt its black brutalist palette. This design system is the authority.

## Design tokens

### Color

- Canvas `#F4F1E8` — warm calibrated-paper background.
- Surface `#FBFAF6` — cards and sheets.
- Ink `#12221F` — primary text and instrument frame.
- Muted ink `#52625D` — annotations and secondary text.
- Rule `#BEC7BD` — thin technical borders and grid lines.
- Measurement blue `#215D6E` — interactive/current state.
- Verification green `#1D6D4F` — success and local/private-safe state.
- Signal amber `#B76C19` — disclosure review and pending state.
- Error red `#A93E36` — failed/rejected state.
- Private fill `#DDEBDF` — device-local/private zones.
- Public fill `#E0EBEE` — disclosed/public zones.
- Warning fill `#F3E4C8` — explicit disclosure zones.

Never use gradients. Use subtle paper noise only when it does not harm contrast.

### Typography

- Display: `DM Sans`, 600/700; compact, reassuring headings.
- Body: `DM Sans`, 400/500; 16px default, 1.5 line-height.
- Data/control: `IBM Plex Mono`, 500/600; for labels, states, IDs, values, and measurement ticks.
- Keep labels in uppercase with 0.08em tracking; avoid all-caps prose.

### Layout and spacing

- Four-point scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Desktop: a fixed 252px instrument rail, 12-column content grid, max width 1320px.
- Tablet: rail compresses to labelled icon row.
- Mobile: bottom navigation and a single column; the active proof control remains reachable above the thumb zone.
- Every major panel has a small labelled datum line, such as `01 / REQUIREMENT`.

### Borders, radius and surfaces

- Hairline borders: 1px solid `#BEC7BD`; active controls use 2px `#215D6E`.
- Radius: 6px for surfaces, 3px for compact controls, 999px only for status chips.
- Shadow: only a subtle `0 10px 24px rgba(18,34,31,.08)` for raised proof sheets; default panels stay flat.
- Use ruled divisions, small tick marks, and aligned mono labels instead of ornamental decoration.

### Components

- Buttons are solid, square-leaning, with a small arrow or action glyph. Primary is ink on canvas; secondary is surface with border. Destructive is red outline, never a solid red block.
- A privacy boundary card is split vertically: left private/local in green-tinted fill, right public/verifier in blue-tinted fill. A physical-looking sealed divider sits between them.
- Proof steps read as a calibrated vertical sequence: numbered stations, state dot, progress trace, and clear next action.
- Wallet panel shows provider, network, DUST state, and an explicit session-only disconnect action.
- Receipt displays a real receipt only after chain finalization; before that use an unambiguous pending instrument trace, never a fake hash.

## Motion and state behavior

- Use Framer Motion for 180–260ms ease-out panel transitions and 1.2s proof trace sweeps.
- Progress uses a moving measurement line, not a spinner. Respect `prefers-reduced-motion`: show static state changes and no repeating sweeps.
- Loading: `CALIBRATING PROOF INPUTS` with neutral trace.
- Success: green verification dot, one measured tick animation, receipt sheet appears.
- Rejection/error: red outlined diagnostic card with human explanation and recovery action.
- Insufficient DUST: amber diagnostic explaining what DUST is and a link/action to retry after funding.
- Proving/indexer errors: explicit stage labels and a safe retry; retain local data locally.

## Accessibility

- Meet WCAG AA contrast. All meaningful status colors pair with icon/text.
- Visible 3px blue focus ring offset by 3px.
- Never make a student’s private state colour-only; label it `LOCAL ONLY` and use a lock glyph.
- Use clear, plain-language explanations: “We check the rule without sending your student record.”

## Design target

Create the main `Proof Station` desktop screen. Include the instrument rail, a public policy calibration card, privacy boundary visualization, an eight-stage proof sequence, Gemini public-policy explainer, aggregate public metrics, and a proof receipt area in an idle safe state. It must be functional-looking, extremely legible, welcoming to students, and responsive.
