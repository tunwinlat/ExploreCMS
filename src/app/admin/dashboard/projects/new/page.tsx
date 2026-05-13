/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import ProjectEditor from '../ProjectEditor'

export default async function NewProjectPage() {
  const session = await verifySession()
  if (!session) return null

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="admin-page-title">New Project</h1>
        <p className="admin-page-subtitle">Add a project to your showcase.</p>
      </header>
      <ProjectEditor />
    </div>
  )
}

export const runtime = 'edge';
