// ---------------------------------------------------------------------------
// Horizon shared types. No `any` anywhere in the codebase — everything that
// crosses a boundary (Supabase rows, the AI generation payload, filter state)
// is typed here.
// ---------------------------------------------------------------------------

/** A full 10-step color ramp, 50 (lightest) → 900 (darkest). */
export type Palette = Record<
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
  string
>

export interface TypeStep {
  name: string
  size: string
  lineHeight: string
  weight: number
  usage: string
}

export interface ComponentSpec {
  type: string
  variants: string[]
  states: string[]
  specs: {
    height: string
    paddingX: string
    radius: string
    fontSize: string
  }
  guidelines: string
  /** Semantic token names this component reads (engine-assembled systems). */
  tokensUsed?: string[]
}

export interface DocSection {
  section: string
  content: string
}

// ---- Engine types (4-stage generation pipeline) ---------------------------

export type RadiusCharacter = 'sharp' | 'soft' | 'rounded' | 'pill'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type TypeRatio = 1.2 | 1.25 | 1.333

/** Stage 1 output — the small set of brand decisions the AI makes. */
export interface Decisions {
  personality: [string, string, string]
  primarySeed: string
  secondarySeed: string
  neutralTint: string
  fontFamily: string
  fontFamilyMono: string
  radiusCharacter: RadiusCharacter
  density: Density
  typeRatio: TypeRatio
  reasoning: string
}

/** A semantic design token that (optionally) references a primitive. */
export interface SemanticToken {
  name: string
  value: string
  ref: string | null
}

/**
 * The exact shape the AI must return (mirrors the system prompt in
 * /api/generate). Also used for shop-kit starter systems.
 */
export interface HorizonSystem {
  name: string
  description: string
  colors: {
    primary: Palette
    secondary: Palette
    neutral: Palette
    semantic: {
      success: string
      warning: string
      error: string
      info: string
    }
  }
  typography: {
    fontFamily: string
    fontFamilyMono?: string
    scale: TypeStep[]
  }
  spacing: {
    base: number
    scale: number[]
  }
  radius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  shadows: Array<{ name: string; value: string }>
  components: ComponentSpec[]
  documentation: DocSection[]
  /** Engine-generated systems only; older/kit systems omit these. */
  semanticTokens?: SemanticToken[]
  meta?: {
    generatedAt: string
    filters: GenerationFilters
    decisions: Decisions
  }
}

// ---- Database row types ----------------------------------------------------

export type ProjectSource = 'figma' | 'sketch' | 'xd' | 'ai' | 'kit'
export type ProjectStatus = 'draft' | 'in_review' | 'published' | 'rejected'
export type FolderKind = 'components' | 'templates' | 'assets' | 'documentation'
export type ReviewStage = 'copy' | 'tech' | 'accessibility' | 'design'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type UserRole =
  | 'designer'
  | 'tech'
  | 'copywriter'
  | 'accessibility'
  | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface Project {
  id: string
  owner_id: string
  title: string
  source: ProjectSource
  devices: string[]
  status: ProjectStatus
  created_at: string
}

export interface ProjectVersion {
  id: string
  project_id: string
  version_number: number
  label: string
  system_json: HorizonSystem
  created_at: string
}

export interface Folder {
  id: string
  project_id: string
  name: string
  kind: FolderKind
  created_at: string
}

export interface FileRow {
  id: string
  project_id: string
  folder_id: string | null
  name: string
  storage_path: string
  size_bytes: number
  created_at: string
}

export interface Review {
  id: string
  project_id: string
  stage: ReviewStage
  status: ReviewStatus
  note: string | null
  reviewed_at: string | null
  created_at: string
}

export interface ShopKit {
  id: string
  title: string
  author: string
  industry: string
  likes: number
  views: number
  cover_gradient: string
  starter_json: HorizonSystem | null
  is_free: boolean
  created_at: string
}

// ---- Generator filter state (single object, see generator page) -----------

export interface GenerationFilters {
  global: string[]
  components: string[]
  industry: string | null
  platform: string | null
  accessibility: string[]
  figma: string[]
  devices: string[]
}
