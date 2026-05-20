# Common UI/UX Issue Patterns — Reference Library

This file is a lookup table for frequent issues. When you encounter one in an audit, use this
entry as the base for your diagnosis and expand with specifics from the actual UI.

---

## LAYOUT & HIERARCHY

### H1 — Hierarchy Collapse
**Pattern**: Multiple elements share the same font size, weight, and color — nothing stands out.  
**User impact**: Users can't tell what's important. They spend extra time scanning, lose patience, and may miss the primary CTA.  
**Fix**: Establish a 3-level hierarchy: dominant (large/bold), secondary (medium/regular), supporting (small/light). Use a 1.25–1.618× type scale ratio.

### H2 — No Clear CTA Above the Fold
**Pattern**: The primary action (sign up, buy, start) is below the viewport on first load.  
**User impact**: Users who don't scroll — roughly 50–80% on landing pages — never see the action. Direct conversions drop.  
**Fix**: Move the primary CTA to within the first 600px of vertical space. Pair it with a value proposition headline.

### H3 — Centered Body Text
**Pattern**: Long paragraphs of body copy are center-aligned.  
**User impact**: The ragged left edge destroys the reading rhythm. Users slow down, re-fixate, and often give up mid-paragraph.  
**Fix**: Only center text under ~3 words (headlines, labels). All body copy: left-aligned (LTR languages).

### H4 — Grid Inconsistency
**Pattern**: Elements align to different implicit grids — some 8px-based, some 12px-based, some arbitrary.  
**User impact**: The UI feels "off" without users knowing why. Subconscious distrust in product quality.  
**Fix**: Pick one grid (8px or 4px base) and use multiples of it for all spacing.

---

## TYPOGRAPHY

### T1 — Body Text Too Small on Mobile
**Pattern**: Body font size is 12–14px on mobile screens.  
**User impact**: Users over 40, users with vision impairment, and users in bright sunlight physically cannot read the content without zooming. They leave.  
**Fix**: Minimum 16px for body text on mobile. Use `clamp()` for fluid type scaling: `font-size: clamp(1rem, 2.5vw, 1.25rem)`.

### T2 — Line Length Too Wide
**Pattern**: Body text spans 100–120 characters per line on desktop.  
**User impact**: The eye loses track of where the next line starts. Reading fatigue sets in within 2–3 paragraphs.  
**Fix**: Cap body text width: `max-width: 65ch`. For narrow content areas, aim for 50–65ch.

### T3 — No Typographic Contrast
**Pattern**: Headers and body text are the same weight (e.g., all `font-weight: 400`).  
**User impact**: The page feels flat. Users can't skim to find relevant sections.  
**Fix**: Use `font-weight: 700` or higher for headings, `400–500` for body, `300–400` for captions.

### T4 — Too Many Fonts
**Pattern**: 3+ different typefaces on one page.  
**User impact**: The UI feels amateurish and untrustworthy. Brand perception suffers.  
**Fix**: Max 2 font families — one for display/headings, one for body. Use weight and size variation within the same family for variety.

---

## COLOR & CONTRAST

### C1 — Low Contrast Text (WCAG Failure)
**Pattern**: Text color and background color have a contrast ratio below 4.5:1.  
**User impact**: Users with low vision, cataracts, or in bright outdoor light physically cannot read the content. Legal accessibility risk.  
**Fix**: Use a contrast checker (https://webaim.org/resources/contrastchecker/). Target ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI components.

### C2 — Color as the Only Differentiator
**Pattern**: "Red = error, green = success" with no other visual difference (no icon, no label).  
**User impact**: ~8% of men have red-green color blindness and cannot distinguish the states.  
**Fix**: Add icons (✗ / ✓), text labels ("Error" / "Success"), or patterns in addition to color.

### C3 — Oversaturated Accent Colors
**Pattern**: CTAs and highlights use a 100% saturation color (e.g., pure `#FF0000`).  
**User impact**: Eye strain after 30+ seconds. The color screams at the user instead of guiding them.  
**Fix**: Reduce saturation 15–30%. `#FF0000` → `#E53E3E`. Pure primary colors rarely appear in polished product design.

### C4 — Conflicting Brand Colors
**Pattern**: 5+ colors all used at similar prominence.  
**User impact**: The brand feels chaotic and untrustworthy. Users can't form a mental model of what's important.  
**Fix**: Define a palette: 1 primary action color, 1 neutral family (3–5 shades), 1–2 semantic colors (error, success). Everything else is decoration.

---

## ACCESSIBILITY

### A1 — Missing Alt Text
**Pattern**: `<img>` elements without `alt` attributes, or with `alt=""` on meaningful images.  
**User impact**: Screen reader users get no information. Images conveying meaning are invisible to them.  
**Fix**: Add descriptive `alt` for meaningful images. Use `alt=""` only for decorative images.

### A2 — No Focus Ring
**Pattern**: `:focus` styles removed with `outline: none` without a custom replacement.  
**User impact**: Keyboard-only users (including power users and people with motor disabilities) cannot tell where they are on the page. Navigation becomes impossible.  
**Fix**: Never remove focus outlines without replacing them. Use `:focus-visible` with a 2px offset ring: `outline: 2px solid #4F46E5; outline-offset: 2px;`

### A3 — Tiny Touch Targets
**Pattern**: Buttons, links, or icons smaller than 44×44px on mobile.  
**User impact**: Users with large thumbs, motor impairments, or in motion mis-tap constantly. Task completion rates drop.  
**Fix**: `min-height: 44px; min-width: 44px` on all interactive elements. For icon-only buttons, use padding to increase the hit area.

### A4 — Form Inputs Without Labels
**Pattern**: Input fields use only `placeholder` text, no `<label>`.  
**User impact**: Once the user starts typing, the placeholder disappears and they forget what the field is for. Screen readers can't announce the field purpose.  
**Fix**: Always use `<label for="inputId">`. Visually hidden labels are acceptable but must exist in the DOM.

### A5 — Skipped Heading Hierarchy
**Pattern**: Page jumps from `<h1>` to `<h3>`, skipping `<h2>`.  
**User impact**: Screen reader users navigating by headings get a broken outline. "Where am I?" becomes unanswerable.  
**Fix**: Headings must be sequential. If you want smaller text, control it with CSS — not by using a lower heading level.

---

## NAVIGATION

### N1 — Ambiguous Link/Button Labels
**Pattern**: CTAs or navigation links say "Click here", "Learn more", "Submit" with no context.  
**User impact**: Users can't predict where they'll land. Cognitive overhead increases. Screen readers reading out all links in a list get "click here... click here... click here..."  
**Fix**: Describe the destination or action: "Download the report", "Start your free trial", "Go to account settings".

### N2 — No Active State in Navigation
**Pattern**: The current page's nav item looks identical to non-active items.  
**User impact**: Users lose their sense of location within the app. "Where am I?" anxiety leads to back-button abuse and disorientation.  
**Fix**: Apply a distinct active state: underline, bold weight, background highlight, or color change on the current nav item.

### N3 — Hidden Mobile Navigation
**Pattern**: Hamburger menu with no label or is positioned in a non-standard location.  
**User impact**: First-time mobile users can't find navigation. 20–40% of users don't recognize unlabeled hamburger icons.  
**Fix**: Add a "Menu" text label next to the hamburger icon. Consider a persistent bottom navigation bar for apps with 4–5 primary sections.

---

## MICRO-INTERACTIONS & FEEDBACK

### M1 — No Loading State
**Pattern**: Clicking a button triggers an async action (API call, form submit) with no visual feedback.  
**User impact**: Users don't know if their action registered. They click again (double submit), or abandon the action thinking it's broken.  
**Fix**: Disable the button on click and show a spinner or "Loading..." text. For < 200ms operations, a brief disabled state is sufficient.

### M2 — Inline Form Validation Missing
**Pattern**: Form errors only appear after the user clicks Submit.  
**User impact**: The user fills out 10 fields, submits, sees 3 errors, has to hunt back through the form. Frustration peaks and abandonment spikes.  
**Fix**: Validate on `blur` (when field loses focus). Show success/error indicators per-field. Don't validate on every keystroke — that feels hostile.

### M3 — No Empty State
**Pattern**: A list, table, or feed shows a blank white area when there's no data.  
**User impact**: Users are confused — is it loading? Did it break? They don't know what to do next.  
**Fix**: Design an empty state with: an illustration or icon, a friendly message explaining why it's empty, and a clear CTA to fill it ("Add your first project →").

### M4 — Destructive Actions Without Confirmation
**Pattern**: "Delete" or "Remove" buttons immediately execute without a confirmation step.  
**User impact**: Accidental deletions with no recovery path. Users lose data and trust in the product.  
**Fix**: Show a confirmation dialog: "Are you sure? This cannot be undone." with clearly labeled "Cancel" and "Delete" buttons (danger style on the destructive one).

---

## COGNITIVE LOAD

### CL1 — Too Many Options
**Pattern**: Navigation menus, dropdowns, or dashboards with 10+ items at the same visual level.  
**User impact**: Hick's Law: decision time increases logarithmically with the number of options. Users freeze, pick randomly, or leave.  
**Fix**: Group items into 5–7 categories. Move rarely used options to a secondary level. Use progressive disclosure.

### CL2 — Icon-Only Buttons (No Labels)
**Pattern**: Toolbars or action areas use icons only, with no text labels or tooltips.  
**User impact**: Non-power users (the majority) cannot figure out what icons mean. Task completion fails.  
**Fix**: Add text labels beneath or beside icons. If space is constrained, add `title` attributes and accessible tooltips on hover.

### CL3 — Wall of Text
**Pattern**: Long, unbroken paragraphs of content with no visual breaks.  
**User impact**: Users skim rather than read. Key information buried in paragraph 4 is missed. Perceived reading effort discourages engagement.  
**Fix**: Break content with subheadings every 3–5 sentences, use short paragraphs (2–4 sentences), and use bullet points for list-type information.

---

## MOBILE & RESPONSIVENESS

### R1 — Horizontal Overflow
**Pattern**: Elements extend beyond the viewport width on mobile, causing horizontal scroll.  
**User impact**: The layout feels broken and unprofessional. Side-scrolling is disorienting on non-carousel content.  
**Fix**: Add `overflow-x: hidden` to the body, and `max-width: 100%` to images and embeds. Debug with: `* { outline: 1px solid red }` to find the offending element.

### R2 — Fixed-Width Elements
**Pattern**: `width: 600px` on a container inside a 375px mobile viewport.  
**User impact**: Content is cropped or forces horizontal scroll.  
**Fix**: Replace fixed widths with `max-width` + `width: 100%` or use responsive utilities.

### R3 — Hover-Only Interactions
**Pattern**: Dropdown menus or tooltip content only exposed on `:hover`.  
**User impact**: Touch screen users (mobile, tablet) can't trigger hover states. Content is permanently inaccessible.  
**Fix**: Add `click`/`tap` event handlers alongside hover for all interactive states.

---

## FORMS

### F1 — Unclear Required vs. Optional Fields
**Pattern**: No visual distinction between required and optional form fields.  
**User impact**: Users either over-fill (wasting time) or under-fill (causing validation errors) without knowing what's needed.  
**Fix**: Mark required fields with `*` (with a legend "* required") or explicitly label optional fields with "(optional)".

### F2 — Poor Error Message Copy
**Pattern**: Validation errors say "Invalid input" or "Error in field 3".  
**User impact**: Users don't know what went wrong or how to fix it. They guess, fail again, and abandon.  
**Fix**: Be specific and human: "Please enter a valid email address (e.g. name@example.com)" or "Password must be at least 8 characters".

### F3 — Single-Column Form on Desktop
**Pattern**: A long form is presented as a single narrow column on a wide desktop layout.  
**User impact**: The form feels cramped and endless on large screens. The empty space on either side feels wasteful and unprofessional.  
**Fix**: For forms with 6+ fields, consider a max-width of 600–700px centered, or a 2-column layout for related field pairs (First Name / Last Name, City / ZIP).