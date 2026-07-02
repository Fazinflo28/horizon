import type { Density } from '@/lib/types'

export type FontSizeToken = 'bodySmall' | 'bodyLarge' | 'titleSmall'

export interface Blueprint {
  type: string
  parts: string[]
  variants: string[]
  states: string[]
  /**
   * paddingX is a spacing-scale INDEX (0-based). It is resolved to a px value
   * in assemble.ts, which is where the computed spacing scale lives.
   */
  sizing: (d: Density) => {
    height: string
    paddingX: number
    fontSize: FontSizeToken
  }
}

const byDensity =
  (compact: string, comfortable: string, spacious: string) =>
  (d: Density): string =>
    d === 'compact' ? compact : d === 'spacious' ? spacious : comfortable

const INTERACTIVE = ['default', 'hover', 'focus', 'pressed', 'disabled']
const INPUT_STATES = ['default', 'hover', 'focus', 'filled', 'error', 'disabled']

export const BLUEPRINTS: Record<string, Blueprint> = {
  button: {
    type: 'Button',
    parts: ['container', 'label', 'leading-icon', 'trailing-icon'],
    variants: ['primary', 'secondary', 'tertiary', 'ghost', 'danger'],
    states: ['default', 'hover', 'focus', 'pressed', 'disabled', 'loading'],
    sizing: (d) => ({
      height: byDensity('36px', '40px', '44px')(d),
      paddingX: 4,
      fontSize: 'bodySmall',
    }),
  },
  iconbutton: {
    type: 'Icon Button',
    parts: ['container', 'icon'],
    variants: ['primary', 'secondary', 'ghost'],
    states: INTERACTIVE,
    sizing: (d) => ({
      height: byDensity('36px', '40px', '44px')(d),
      paddingX: 2,
      fontSize: 'bodySmall',
    }),
  },
  floatingbuttonfab: {
    type: 'Floating Button (FAB)',
    parts: ['container', 'icon'],
    variants: ['primary', 'secondary'],
    states: ['default', 'hover', 'focus', 'pressed'],
    sizing: (d) => ({
      height: byDensity('48px', '56px', '64px')(d),
      paddingX: 4,
      fontSize: 'titleSmall',
    }),
  },
  extendedfab: {
    type: 'Extended FAB',
    parts: ['container', 'icon', 'label'],
    variants: ['primary', 'secondary'],
    states: ['default', 'hover', 'focus', 'pressed'],
    sizing: (d) => ({
      height: byDensity('48px', '56px', '64px')(d),
      paddingX: 5,
      fontSize: 'bodyLarge',
    }),
  },
  splitbutton: {
    type: 'Split Button',
    parts: ['primary-action', 'divider', 'trigger', 'menu'],
    variants: ['primary', 'secondary'],
    states: ['default', 'hover', 'focus', 'pressed', 'disabled'],
    sizing: (d) => ({
      height: byDensity('36px', '40px', '44px')(d),
      paddingX: 4,
      fontSize: 'bodySmall',
    }),
  },
  togglebutton: {
    type: 'Toggle Button',
    parts: ['container', 'label', 'icon'],
    variants: ['single', 'grouped'],
    states: ['selected', 'unselected', 'hover', 'focus', 'disabled'],
    sizing: (d) => ({
      height: byDensity('36px', '40px', '44px')(d),
      paddingX: 4,
      fontSize: 'bodySmall',
    }),
  },
  textfield: {
    type: 'Text Field',
    parts: ['container', 'label', 'input', 'helper-text', 'leading-icon', 'trailing-icon'],
    variants: ['outlined', 'filled'],
    states: INPUT_STATES,
    sizing: (d) => ({
      height: byDensity('44px', '48px', '52px')(d),
      paddingX: 4,
      fontSize: 'bodyLarge',
    }),
  },
  dropdownselect: {
    type: 'Dropdown / Select',
    parts: ['container', 'label', 'trigger', 'value', 'chevron', 'menu', 'option'],
    variants: ['outlined', 'filled'],
    states: ['default', 'hover', 'focus', 'open', 'disabled'],
    sizing: (d) => ({
      height: byDensity('44px', '48px', '52px')(d),
      paddingX: 4,
      fontSize: 'bodyLarge',
    }),
  },
  combobox: {
    type: 'Combobox',
    parts: ['container', 'input', 'chevron', 'listbox', 'option'],
    variants: ['outlined', 'filled'],
    states: ['default', 'focus', 'open', 'disabled'],
    sizing: (d) => ({
      height: byDensity('44px', '48px', '52px')(d),
      paddingX: 4,
      fontSize: 'bodyLarge',
    }),
  },
  checkbox: {
    type: 'Checkbox',
    parts: ['box', 'check-indicator', 'label'],
    variants: ['default', 'indeterminate'],
    states: ['unchecked', 'checked', 'focus', 'disabled'],
    sizing: (d) => ({
      height: byDensity('18px', '18px', '20px')(d),
      paddingX: 2,
      fontSize: 'bodySmall',
    }),
  },
  radiobutton: {
    type: 'Radio Button',
    parts: ['circle', 'dot', 'label'],
    variants: ['default'],
    states: ['unselected', 'selected', 'focus', 'disabled'],
    sizing: (d) => ({
      height: byDensity('18px', '18px', '20px')(d),
      paddingX: 2,
      fontSize: 'bodySmall',
    }),
  },
  slider: {
    type: 'Slider',
    parts: ['track', 'filled-track', 'thumb', 'value-label'],
    variants: ['continuous', 'stepped'],
    states: ['default', 'hover', 'focus', 'dragging', 'disabled'],
    sizing: (d) => ({
      height: byDensity('24px', '28px', '32px')(d),
      paddingX: 0,
      fontSize: 'bodySmall',
    }),
  },
  rangeslider: {
    type: 'Range Slider',
    parts: ['track', 'filled-range', 'thumb-min', 'thumb-max'],
    variants: ['continuous', 'stepped'],
    states: ['default', 'hover', 'focus', 'dragging', 'disabled'],
    sizing: (d) => ({
      height: byDensity('24px', '28px', '32px')(d),
      paddingX: 0,
      fontSize: 'bodySmall',
    }),
  },
  datepicker: {
    type: 'Date Picker',
    parts: ['input', 'calendar', 'day-cell', 'header', 'nav'],
    variants: ['single', 'range'],
    states: ['default', 'focus', 'open', 'selected', 'disabled'],
    sizing: (d) => ({
      height: byDensity('44px', '48px', '52px')(d),
      paddingX: 4,
      fontSize: 'bodyLarge',
    }),
  },
  rating: {
    type: 'Rating',
    parts: ['container', 'star', 'label'],
    variants: ['star', 'heart'],
    states: ['empty', 'filled', 'hover', 'readonly'],
    sizing: (d) => ({
      height: byDensity('24px', '28px', '32px')(d),
      paddingX: 1,
      fontSize: 'bodySmall',
    }),
  },
  tabs: {
    type: 'Tabs',
    parts: ['tab-list', 'tab', 'active-indicator', 'panel'],
    variants: ['underline', 'pill'],
    states: ['active', 'inactive', 'hover', 'focus', 'disabled'],
    sizing: (d) => ({
      height: byDensity('40px', '44px', '48px')(d),
      paddingX: 4,
      fontSize: 'bodySmall',
    }),
  },
  appbar: {
    type: 'App Bar',
    parts: ['container', 'leading', 'title', 'actions'],
    variants: ['default', 'prominent'],
    states: ['default', 'scrolled'],
    sizing: (d) => ({
      height: byDensity('56px', '64px', '72px')(d),
      paddingX: 4,
      fontSize: 'titleSmall',
    }),
  },
  navigationbar: {
    type: 'Navigation Bar',
    parts: ['container', 'item', 'icon', 'label', 'indicator'],
    variants: ['default'],
    states: ['active', 'inactive'],
    sizing: (d) => ({
      height: byDensity('56px', '64px', '72px')(d),
      paddingX: 2,
      fontSize: 'bodySmall',
    }),
  },
  navigationrail: {
    type: 'Navigation Rail',
    parts: ['container', 'item', 'icon', 'label'],
    variants: ['default'],
    states: ['active', 'inactive'],
    sizing: (d) => ({
      height: byDensity('56px', '56px', '64px')(d),
      paddingX: 2,
      fontSize: 'bodySmall',
    }),
  },
  sidebar: {
    type: 'Sidebar',
    parts: ['container', 'item', 'icon', 'label', 'group-header'],
    variants: ['expanded', 'collapsed'],
    states: ['active', 'inactive', 'hover'],
    sizing: () => ({ height: 'auto', paddingX: 3, fontSize: 'bodySmall' }),
  },
  breadcrumb: {
    type: 'Breadcrumb',
    parts: ['container', 'item', 'separator'],
    variants: ['default'],
    states: ['current', 'link', 'hover'],
    sizing: () => ({ height: 'auto', paddingX: 0, fontSize: 'bodySmall' }),
  },
  menu: {
    type: 'Menu',
    parts: ['container', 'item', 'icon', 'label', 'shortcut', 'divider'],
    variants: ['default'],
    states: ['default', 'hover', 'focus', 'disabled'],
    sizing: () => ({ height: 'auto', paddingX: 3, fontSize: 'bodySmall' }),
  },
  contextmenu: {
    type: 'Context Menu',
    parts: ['container', 'item', 'icon', 'label', 'shortcut', 'submenu'],
    variants: ['default'],
    states: ['default', 'hover', 'disabled'],
    sizing: () => ({ height: 'auto', paddingX: 3, fontSize: 'bodySmall' }),
  },
  card: {
    type: 'Card',
    parts: ['container', 'media', 'header', 'body', 'footer'],
    variants: ['elevated', 'outlined', 'filled'],
    states: ['default', 'hover'],
    sizing: () => ({ height: 'auto', paddingX: 5, fontSize: 'bodyLarge' }),
  },
  accordion: {
    type: 'Accordion',
    parts: ['container', 'header', 'icon', 'panel'],
    variants: ['single', 'multiple'],
    states: ['expanded', 'collapsed', 'hover', 'focus'],
    sizing: () => ({ height: 'auto', paddingX: 4, fontSize: 'bodyLarge' }),
  },
  badge: {
    type: 'Badge',
    parts: ['container', 'label'],
    variants: ['neutral', 'brand', 'success', 'warning', 'error'],
    states: ['default'],
    sizing: (d) => ({
      height: byDensity('20px', '22px', '24px')(d),
      paddingX: 2,
      fontSize: 'bodySmall',
    }),
  },
  chip: {
    type: 'Chip',
    parts: ['container', 'label', 'leading-icon', 'remove-icon'],
    variants: ['assist', 'filter', 'input'],
    states: ['default', 'hover', 'selected', 'disabled'],
    sizing: (d) => ({
      height: byDensity('28px', '32px', '36px')(d),
      paddingX: 3,
      fontSize: 'bodySmall',
    }),
  },
  divider: {
    type: 'Divider',
    parts: ['line'],
    variants: ['horizontal', 'vertical'],
    states: ['default'],
    sizing: () => ({ height: '1px', paddingX: 0, fontSize: 'bodySmall' }),
  },
  list: {
    type: 'List',
    parts: ['container', 'item'],
    variants: ['default', 'divided'],
    states: ['default'],
    sizing: () => ({ height: 'auto', paddingX: 4, fontSize: 'bodyLarge' }),
  },
  listitem: {
    type: 'List Item',
    parts: ['container', 'leading', 'content', 'trailing'],
    variants: ['one-line', 'two-line', 'three-line'],
    states: ['default', 'hover', 'selected', 'disabled'],
    sizing: (d) => ({
      height: byDensity('48px', '56px', '64px')(d),
      paddingX: 4,
      fontSize: 'bodyLarge',
    }),
  },
  datagrid: {
    type: 'Data Grid',
    parts: ['table', 'header', 'row', 'cell', 'pagination'],
    variants: ['default', 'striped'],
    states: ['default', 'hover', 'selected', 'sorted'],
    sizing: () => ({ height: 'auto', paddingX: 3, fontSize: 'bodySmall' }),
  },
  carousel: {
    type: 'Carousel',
    parts: ['viewport', 'slide', 'controls', 'indicators'],
    variants: ['default', 'cards'],
    states: ['default', 'active'],
    sizing: () => ({ height: 'auto', paddingX: 0, fontSize: 'bodyLarge' }),
  },
  alert: {
    type: 'Alert',
    parts: ['container', 'icon', 'title', 'body', 'action'],
    variants: ['info', 'success', 'warning', 'error'],
    states: ['default'],
    sizing: () => ({ height: 'auto', paddingX: 4, fontSize: 'bodyLarge' }),
  },
  toast: {
    type: 'Toast',
    parts: ['container', 'icon', 'message', 'action', 'close'],
    variants: ['info', 'success', 'warning', 'error'],
    states: ['entering', 'visible', 'leaving'],
    sizing: () => ({ height: 'auto', paddingX: 4, fontSize: 'bodySmall' }),
  },
  dialog: {
    type: 'Dialog',
    parts: ['overlay', 'container', 'title', 'body', 'actions'],
    variants: ['standard', 'destructive'],
    states: ['open', 'closed'],
    sizing: () => ({ height: 'auto', paddingX: 5, fontSize: 'bodyLarge' }),
  },
  modal: {
    type: 'Modal',
    parts: ['overlay', 'container', 'header', 'body', 'footer', 'close'],
    variants: ['standard', 'fullscreen'],
    states: ['open', 'closed'],
    sizing: () => ({ height: 'auto', paddingX: 5, fontSize: 'bodyLarge' }),
  },
  popover: {
    type: 'Popover',
    parts: ['container', 'arrow', 'content'],
    variants: ['default'],
    states: ['open', 'closed'],
    sizing: () => ({ height: 'auto', paddingX: 4, fontSize: 'bodySmall' }),
  },
  tooltip: {
    type: 'Tooltip',
    parts: ['container', 'arrow', 'label'],
    variants: ['default'],
    states: ['visible', 'hidden'],
    sizing: () => ({ height: 'auto', paddingX: 2, fontSize: 'bodySmall' }),
  },
  banner: {
    type: 'Banner',
    parts: ['container', 'icon', 'message', 'actions'],
    variants: ['info', 'promotional'],
    states: ['default'],
    sizing: () => ({ height: 'auto', paddingX: 4, fontSize: 'bodyLarge' }),
  },
  progressbar: {
    type: 'Progress Bar',
    parts: ['track', 'indicator', 'label'],
    variants: ['determinate', 'indeterminate'],
    states: ['default'],
    sizing: (d) => ({
      height: byDensity('4px', '6px', '8px')(d),
      paddingX: 0,
      fontSize: 'bodySmall',
    }),
  },
  skeletonloader: {
    type: 'Skeleton Loader',
    parts: ['shimmer-block'],
    variants: ['text', 'circle', 'rect'],
    states: ['loading'],
    sizing: () => ({ height: 'auto', paddingX: 0, fontSize: 'bodySmall' }),
  },
}

export function normalizeType(display: string): string {
  return display.toLowerCase().replace(/[^a-z0-9]/g, '')
}
