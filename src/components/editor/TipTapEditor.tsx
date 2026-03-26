/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { useCallback, useRef, useState, useEffect } from 'react'

import { SlashCommandsExtension, slashSuggestionConfig } from './SlashMenu'
import './editor.css'

interface TipTapEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export default function TipTapEditor({ initialContent = '', onChange, editable = true }: TipTapEditorProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return null
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      return data.url
    } catch (e) {
      console.error('Failed to upload image', e)
      return null
    } finally {
      setUploading(false)
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true }),
      Youtube.configure({ inline: false, width: 800, height: 450 }),
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: false }),
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      SlashCommandsExtension.configure({
        suggestion: slashSuggestionConfig
      })
    ],
    immediatelyRender: false,
    editable,
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Output Markdown instead of HTML for native Markdown storage
      const markdown = (editor.storage as any).markdown?.getMarkdown?.() || editor.getHTML()
      onChange(markdown)
    },
    editorProps: {
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          handleImageUpload(file).then(url => {
            if (url) {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = schema.nodes.image.create({ src: url });
              const transaction = view.state.tr.insert(coordinates?.pos || 0, node);
              view.dispatch(transaction);
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          handleImageUpload(file).then(url => {
            if (url) {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            }
          });
          return true;
        }
        return false;
      }
    }
  })

  // Listen for the custom event from our Slash Command
  useEffect(() => {
    const handleRequestImageUpload = () => {
      fileInputRef.current?.click();
    };
    document.addEventListener('tiptap:request-image-upload', handleRequestImageUpload);
    return () => document.removeEventListener('tiptap:request-image-upload', handleRequestImageUpload);
  }, []);

  const addImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await handleImageUpload(e.target.files[0])
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) {
      return // cancelled
    }
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // Validate URL protocol to prevent javascript: XSS
    try {
      const urlObj = new URL(url, window.location.origin)
      if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
        alert('Only http, https, and mailto links are allowed.')
        return
      }
    } catch {
      // Allow relative URLs starting with /
      if (!url.startsWith('/')) {
        alert('Please enter a valid URL.')
        return
      }
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
      
      {editor && (
        <div className="editor-toolbar fade-in-up">
          <button type="button" aria-label="Bold" aria-pressed={editor.isActive('bold')} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>B</button>
          <button type="button" aria-label="Italic" aria-pressed={editor.isActive('italic')} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}>I</button>
          <button type="button" aria-label="Strike" aria-pressed={editor.isActive('strike')} title="Strike" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}>S</button>
          <div className="divider" style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
          <button type="button" aria-label="Add Link" aria-pressed={editor.isActive('link')} title="Add Link" onClick={setLink} className={editor.isActive('link') ? 'active' : ''}>🔗</button>
          <div className="divider" style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
          <button type="button" aria-label="Align Left" aria-pressed={editor.isActive({ textAlign: 'left' })} title="Align Left" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''}>⬅</button>
          <button type="button" aria-label="Align Center" aria-pressed={editor.isActive({ textAlign: 'center' })} title="Align Center" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''}>↔</button>
          <button type="button" aria-label="Align Right" aria-pressed={editor.isActive({ textAlign: 'right' })} title="Align Right" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''}>➡</button>
          
          <div style={{ flex: 1 }}></div>

          <button type="button" aria-label={uploading ? 'Uploading Image' : 'Add Image'} title="Add Image" onClick={addImageClick} disabled={uploading}>
            {uploading ? 'Uploading...' : '🖼️ Add Image'}
          </button>
        </div>
      )}

      {/* Hidden input to support programmatic file dialog popup from Slash Command */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      <div style={{ flex: 1, borderTop: 'none', padding: '1rem 0', minHeight: '400px' }}>
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  )
}
