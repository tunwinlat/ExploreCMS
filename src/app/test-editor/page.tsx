
'use client';
export const runtime = 'edge';

import TipTapEditor from '@/components/editor/TipTapEditor'

export default function TestEditorPage() {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Editor Test Page</h1>
            <TipTapEditor onChange={(val) => console.log(val)} />
        </div>
    )
}
