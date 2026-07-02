import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectWorkspace from '@/components/ProjectWorkspace'
import type {
  Project,
  Folder,
  FileRow,
  Review,
  ProjectVersion,
  ReviewStage,
  FolderKind,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

const STAGE_ORDER: Record<ReviewStage, number> = {
  copy: 0,
  tech: 1,
  accessibility: 2,
  design: 3,
}

const FOLDER_ORDER: Record<FolderKind, number> = {
  components: 0,
  templates: 1,
  assets: 2,
  documentation: 3,
}

export default async function ProjectPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project || project.owner_id !== user.id) notFound()

  const [foldersRes, filesRes, reviewsRes, versionsRes] = await Promise.all([
    supabase.from('folders').select('*').eq('project_id', params.id),
    supabase.from('files').select('*').eq('project_id', params.id),
    supabase.from('reviews').select('*').eq('project_id', params.id),
    supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', params.id)
      .order('version_number', { ascending: false }),
  ])

  const folders = ((foldersRes.data ?? []) as Folder[])
    .slice()
    .sort(
      (a, b) =>
        (FOLDER_ORDER[a.kind] ?? 99) - (FOLDER_ORDER[b.kind] ?? 99) ||
        a.created_at.localeCompare(b.created_at),
    )

  const reviews = ((reviewsRes.data ?? []) as Review[])
    .slice()
    .sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage])

  const meta = user.user_metadata as { full_name?: string } | undefined

  return (
    <ProjectWorkspace
      project={project as Project}
      initialFolders={folders}
      initialFiles={(filesRes.data ?? []) as FileRow[]}
      initialReviews={reviews}
      initialVersions={(versionsRes.data ?? []) as ProjectVersion[]}
      userName={meta?.full_name ?? user.email ?? null}
    />
  )
}
