

# Admin Landing Page Customizer

## Overview

Create a new admin page at `/admin/landing-page` where the admin can customize the public landing page content: upload images for each section, toggle between "Aulas" and "Aluguel de Quadras" modes (or both), edit texts, and manage which sections are visible. The landing page reads these settings dynamically from the database.

## Database Changes

**New table: `landing_page_config`**
- `id` uuid PK
- `section_key` text UNIQUE (e.g. `hero`, `about`, `benefits`, `plans`, `faq`, etc.)
- `is_visible` boolean DEFAULT true
- `title` text nullable
- `subtitle` text nullable
- `content` jsonb nullable (flexible: bullet points, FAQ items, plan details, etc.)
- `image_url` text nullable
- `display_order` integer DEFAULT 0
- `updated_at` timestamptz DEFAULT now()

**New table: `landing_page_settings`** (single-row global config)
- `id` uuid PK
- `business_mode` text DEFAULT 'both' (`classes`, `rentals`, `both`)
- `hero_image_url` text nullable
- `whatsapp_number` text nullable
- `instagram_url` text nullable
- `youtube_url` text nullable
- `primary_cta_text` text DEFAULT 'Agende Sua Aula Grátis'
- `primary_cta_url` text DEFAULT '/cadastro'
- `updated_at` timestamptz DEFAULT now()

**Storage bucket:** `landing-images` for admin-uploaded section images.

**RLS:** Admin-only write, public read (landing page is public).

## Admin Page: `/admin/landing-page`

### Layout
- Tab-based interface with two tabs: **Configuracoes Gerais** and **Secoes**

### Tab 1 - General Settings
- Business mode selector (radio): "Apenas Aulas", "Apenas Aluguel", "Aulas + Aluguel"
- WhatsApp number input
- Instagram / YouTube URLs
- Primary CTA text and link
- Hero image upload (drag & drop to storage bucket)

### Tab 2 - Sections Manager
- Sortable list of all 11 sections
- Each section card shows: name, visibility toggle, image upload, edit button
- Edit opens a dialog to change title/subtitle/content per section
- Toggle visibility on/off per section

## Landing Page Changes

- On mount, fetch `landing_page_settings` and `landing_page_config` (public read)
- Conditionally render sections based on `is_visible`
- Use uploaded images from storage instead of Unsplash placeholders
- When `business_mode === 'rentals'`, swap copy from "aulas" to "aluguel de quadras" and show rental-specific plans/benefits/how-it-works
- When `business_mode === 'both'`, show both options with a toggle or dual sections

## Files to Create/Edit

| File | Change |
|---|---|
| Migration | Create `landing_page_settings`, `landing_page_config` tables + storage bucket + RLS |
| `src/pages/admin/LandingPageEditor.tsx` | **New** - Admin customization page |
| `src/pages/LandingPage.tsx` | Fetch config from DB, conditionally render sections and images |
| `src/layouts/AdminLayout.tsx` | Add "Landing Page" menu item under "Sistema" |
| `src/App.tsx` | Add route `/admin/landing-page` |

## Key Behaviors

- Admin uploads images via the editor; they go to the `landing-images` storage bucket
- Default seed data populates all 11 sections with current hardcoded content so nothing breaks
- Landing page gracefully falls back to defaults if no DB config exists yet
- Business mode affects: Hero copy, Benefits section, How It Works steps, Plans section, FAQ answers

