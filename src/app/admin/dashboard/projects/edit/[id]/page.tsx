/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import ProjectEditor from '../../ProjectEditor'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return null

  const { id } = await params

  let project: any = null
  try {
    project = await (prisma as any).project.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
    })
  } catch (e) {
    console.error('Failed to load project:', e)
  }

  if (!project) notFound()

  const data = {
    ...project,
    techTags: (() => { try { return JSON.parse(project.techTags || '[]') } catch { return [] } })(),
  }

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="admin-page-title">Edit Project</h1>
        <p className="admin-page-subtitle">Update &ldquo;{project.title}&rdquo;</p>
      </header>
      <ProjectEditor initialData={data} />
    </div>
  )
}

export const runtime = 'edge';
