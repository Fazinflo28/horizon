import type { GenerationFilters } from '@/lib/types'

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for every filter option array. Imported by the
// generator panels AND by /api/generate so the UI and the AI prompt can never
// drift apart.
// ---------------------------------------------------------------------------

export interface PanelGroup {
  heading: string
  items: string[]
}

// ---- GLOBAL panel ----------------------------------------------------------
// Five columns. The Shape column stacks a second "Spacing" group beneath it.
export const GLOBAL_COLUMNS: PanelGroup[][] = [
  [
    {
      heading: 'Colour',
      items: [
        'Primary',
        'Secondary',
        'Tertiary',
        'Error',
        'Warning',
        'Info',
        'Background',
        'Inverse Colors',
        'Neutral Palette',
      ],
    },
  ],
  [
    {
      heading: 'Typography',
      items: [
        'Display Large',
        'Display Medium',
        'Display Small',
        'Headline Small',
        'Title Large',
        'Title Small',
        'Body Large',
        'Body Small',
      ],
    },
  ],
  [
    { heading: 'Shape', items: ['Corner Radius', 'Border Width', 'Border Style'] },
    { heading: 'Spacing', items: ['4pt Scale', '8pt Scale', '12pt Scale', '16pt Scale'] },
  ],
  [{ heading: 'Icons', items: ['Filled', 'Outlined', 'Rounded', 'Sharp', 'Two Tone'] }],
  [{ heading: 'Grid', items: ['8 Columns', '16 Columns', '24 Columns'] }],
]

// 25 items → pill reads "25 Global" on load (matches the mockup).
export const GLOBAL_DEFAULT_CHECKED: string[] = [
  // Colour (7)
  'Secondary',
  'Tertiary',
  'Warning',
  'Info',
  'Background',
  'Inverse Colors',
  'Neutral Palette',
  // Typography (7)
  'Display Large',
  'Display Medium',
  'Display Small',
  'Headline Small',
  'Title Large',
  'Title Small',
  'Body Small',
  // Shape (2)
  'Corner Radius',
  'Border Style',
  // Spacing (4)
  '4pt Scale',
  '8pt Scale',
  '12pt Scale',
  '16pt Scale',
  // Icons (3)
  'Filled',
  'Rounded',
  'Sharp',
  // Grid (2)
  '16 Columns',
  '24 Columns',
]

// ---- COMPONENT panel -------------------------------------------------------
export const COMPONENT_COLUMNS: PanelGroup[][] = [
  [
    {
      heading: 'Action',
      items: [
        'Button',
        'Icon Button',
        'Floating Button (FAB)',
        'Extended FAB',
        'Split Button',
        'Toggle Button',
      ],
    },
  ],
  [
    {
      heading: 'Inputs',
      items: [
        'Text Field',
        'Dropdown / Select',
        'Combobox',
        'Checkbox',
        'Radio Button',
        'Slider',
        'Range Slider',
        'Date Picker',
        'Rating',
      ],
    },
  ],
  [
    {
      heading: 'Navigation',
      items: [
        'Tabs',
        'App Bar',
        'Navigation Bar',
        'Navigation Rail',
        'Sidebar',
        'Breadcrumb',
        'Menu',
        'Context Menu',
      ],
    },
  ],
  [
    {
      heading: 'Data Display',
      items: [
        'Card',
        'Accordion',
        'Badge',
        'Chip',
        'Divider',
        'List',
        'List Item',
        'Data Grid',
        'Carousel',
      ],
    },
  ],
  [
    {
      heading: 'Feedback',
      items: [
        'Alert',
        'Toast',
        'Dialog',
        'Modal',
        'Popover',
        'Tooltip',
        'Banner',
        'Progress Bar',
        'Skeleton Loader',
      ],
    },
  ],
]

// 31 items → pill reads "31 Component" on load (matches the mockup).
export const COMPONENT_DEFAULT_CHECKED: string[] = [
  // Action (4)
  'Icon Button',
  'Floating Button (FAB)',
  'Split Button',
  'Toggle Button',
  // Inputs (7)
  'Text Field',
  'Dropdown / Select',
  'Checkbox',
  'Radio Button',
  'Slider',
  'Range Slider',
  'Rating',
  // Navigation (7)
  'Tabs',
  'App Bar',
  'Navigation Bar',
  'Navigation Rail',
  'Breadcrumb',
  'Menu',
  'Context Menu',
  // Data Display (7)
  'Card',
  'Badge',
  'Chip',
  'List',
  'List Item',
  'Data Grid',
  'Carousel',
  // Feedback (6)
  'Toast',
  'Dialog',
  'Popover',
  'Tooltip',
  'Banner',
  'Progress Bar',
]

// ---- SIMPLE panels (chips) -------------------------------------------------
export const INDUSTRY_OPTIONS: string[] = [
  'E-commerce',
  'SaaS',
  'Enterprise',
  'Banking & FinTech',
  'Healthcare',
  'Travel & Hospitality',
  'Insurance',
  'Telecommunications',
  'Automotive',
  'Agency',
]

export const PLATFORM_OPTIONS: string[] = ['Web', 'iOS', 'Android', 'Cross-platform']

export const ACCESSIBILITY_OPTIONS: string[] = [
  'WCAG AA',
  'WCAG AAA',
  'High Contrast',
  'Reduced Motion',
]

export const FIGMA_OPTIONS: string[] = ['Export as Variables', 'Export as Styles']

export const DEVICE_OPTIONS: string[] = ['Desktop', 'Mobile', 'Tablet']

// ---- SHOP industry filter (label spelling matches the mockup: "Saas") ------
// Comparison against kit.industry is case-insensitive so "Saas" matches "SaaS".
export const SHOP_INDUSTRIES: string[] = [
  'E-commerce',
  'Saas',
  'Enterprise',
  'Banking & FinTech',
  'Healthcare',
  'Travel & Hospitality',
  'Insurance',
  'Telecommunications',
  'Automotive',
  'Agency',
]

/** Fresh filter state with the 25/31 defaults pre-checked (new arrays each call). */
export function createInitialFilters(): GenerationFilters {
  return {
    global: [...GLOBAL_DEFAULT_CHECKED],
    components: [...COMPONENT_DEFAULT_CHECKED],
    industry: null,
    platform: null,
    accessibility: [],
    figma: [],
    devices: [],
  }
}
