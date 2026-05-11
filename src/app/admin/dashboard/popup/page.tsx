/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPopupConfig } from './popupActions'
import PopupEditor from './PopupEditor'

export default async function PopupPage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  const config = await getPopupConfig()

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Popup Toast</h1>
        <p className="admin-page-subtitle">Configure a popup message that appears to visitors on the homepage.</p>
      </header>

      <PopupEditor initialConfig={config} />
    </div>
  )
}
