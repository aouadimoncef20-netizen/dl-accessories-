---
name: Serene Editorial Luxe
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#4f4447'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#817477'
  outline-variant: '#d3c3c6'
  surface-tint: '#785560'
  primary: '#785560'
  on-primary: '#ffffff'
  primary-container: '#f6c8d5'
  on-primary-container: '#75515d'
  inverse-primary: '#e8bbc8'
  secondary: '#645c5f'
  on-secondary: '#ffffff'
  secondary-container: '#e7dde0'
  on-secondary-container: '#686163'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#d3d4d4'
  on-tertiary-container: '#5a5b5c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e3'
  primary-fixed-dim: '#e8bbc8'
  on-primary-fixed: '#2d131d'
  on-primary-fixed-variant: '#5e3d48'
  secondary-fixed: '#eae0e3'
  secondary-fixed-dim: '#cec4c7'
  on-secondary-fixed: '#1f1a1d'
  on-secondary-fixed-variant: '#4b4548'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 32px
  margin-desktop: 64px
  margin-mobile: 20px
  section-gap: 120px
---

## Brand & Style

This design system embodies a "Soft-Minimalist Editorial" aesthetic, merging the precision of high-end technology interfaces with the tactile, warm soul of Japanese and Korean lifestyle curation. The brand personality is quiet yet confident—prioritizing breathability, intentionality, and a feminine elegance that feels premium but never unapproachable.

The visual direction follows a **Modern Minimalist** movement infused with **Soft-Tactile** elements. It draws heavily from editorial magazine layouts where white space is treated as a structural component rather than a void. The emotional response should be one of immediate calm and clarity, evoking the feeling of walking into a high-end, sun-drenched boutique.

## Colors

The palette is anchored in high-reflectance neutrals and sophisticated warm tones. 

- **Primary Background (#FFFFFF):** Used for the main canvas to ensure a "pure" and expansive feel.
- **Secondary Background (#FDF2F5):** Applied to large structural sections or container backgrounds to provide subtle depth without breaking the minimalist flow.
- **Accent (#F6C8D5):** Used sparingly for call-to-actions, active states, and highlights to maintain its "precious" quality.
- **Typography:** Primary text uses a rich, softened black (#1A1A1A) for high legibility, while secondary text (#6B6B6B) provides a gentle hierarchy.
- **Functional Colors:** Success and error states are desaturated and soft, ensuring they inform the user without disrupting the calm aesthetic.

## Typography

The typography strategy relies on the contrast between a romantic, high-contrast Serif and a friendly, modern Sans-Serif.

- **Headlines:** Playfair Display provides an editorial, fashion-forward authority. Use large sizes with tighter letter-spacing for a luxury magazine feel.
- **Body & Interface:** Plus Jakarta Sans is chosen for its soft terminals and generous x-height, which maintains the "warm" brand attribute even in functional areas.
- **Leading:** Line heights are intentionally generous (1.7x to 1.8x for body text) to ensure the content "breathes" and feels effortless to read.
- **Labels:** Small labels use increased letter spacing and uppercase styling to provide a structured, organized feel to product metadata.

## Layout & Spacing

This design system utilizes a **Fixed Grid** approach for desktop to preserve the editorial composition, transitioning to a **Fluid** model for mobile.

- **Whitespace:** Emphasize "macro-white space." Vertical gaps between major sections should be expansive (120px+) to create a sense of luxury and unhurried browsing.
- **Rhythm:** An 8px base unit drives all padding and margins. 
- **Grid:** A 12-column grid with wide 32px gutters allows for asymmetrical layouts reminiscent of high-end lookbooks.
- **Mobile:** On smaller screens, margins reduce to 20px, but internal padding within cards remains generous to maintain the "soft" feel.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Ambient Shadows** rather than heavy borders or dark fills.

- **Shadows:** Shadows are extremely diffused, using the Accent color (#F6C8D5) at 5-10% opacity rather than pure black. This creates a "glow" effect rather than a traditional drop shadow.
- **Glassmorphism:** Use subtle backdrop blurs (20px+) on navigation bars and floating overlays to maintain a sense of lightness and transparency.
- **Depth:** Elements on the secondary background (#FDF2F5) should appear to be resting gently on the surface, while primary cards on white backgrounds should use soft shadows to appear slightly lifted.

## Shapes

The shape language is defined by "Organic Precision." All corners are rounded to remove visual tension.

- **Base Radius:** 0.5rem (8px) for small interactive elements like inputs and small buttons.
- **Large Radius (rounded-lg):** 1rem (16px) for product cards and primary containers.
- **Extra Large (rounded-xl):** 1.5rem (24px) for featured editorial sections and hero imagery.
- **Buttons:** Use fully pill-shaped (rounded-full) buttons for primary actions to lean into the "cute" and "soft" attributes.

## Components

### Buttons
- **Primary:** Pill-shaped, #F6C8D5 background, #1A1A1A text. No border. Soft "pink-tinted" shadow on hover.
- **Secondary:** Pill-shaped, #FFFFFF background, 1px #EFEFEF border.
- **Tertiary/Ghost:** Text-only with a subtle underline effect on hover, using Label-MD typography.

### Cards
- **Product Cards:** No borders. Use the Secondary Background (#FDF2F5) or a subtle 4px blur shadow. Content inside should have at least 24px of internal padding.
- **Editorial Cards:** Large, full-bleed imagery with Playfair Display overlay.

### Input Fields
- Softly rounded (8px). Background color #FFFFFF with a 1px #EFEFEF border. On focus, the border transitions to #F6C8D5 with a 4px soft outer glow.

### Chips & Tags
- Used for categories (e.g., "New In," "Limited"). Small, pill-shaped, using the Accent color at 20% opacity with #1A1A1A text.

### Selection Controls
- **Checkboxes/Radios:** Circular for both to maintain the soft aesthetic. Use #F6C8D5 for the active state.
- **Lists:** Clean, no dividers where possible. Use vertical whitespace (16px-24px) to separate items instead of lines.