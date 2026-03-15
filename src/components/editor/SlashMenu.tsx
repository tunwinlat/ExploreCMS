/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { Node, mergeAttributes, Editor, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

// --- SLASH MENU UI COMPONENT ---

export interface SlashMenuItem {
  title: string;
  description: string;
  command: (props: { editor: Editor; range: Range }) => void;
  icon: string;
}

interface CommandListProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

const CommandList = forwardRef((props: CommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        props.command(props.items[selectedIndex]);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) return null;

  return (
    <div className="slash-menu glass fade-in-up" autoFocus>
      <div className="slash-menu-header">Basic Blocks</div>
      <div className="slash-menu-list">
        {props.items.map((item, index) => (
          <button
            className={`slash-menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={index}
            onClick={() => props.command(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="slash-menu-icon">{item.icon}</div>
            <div className="slash-menu-text">
              <span className="slash-menu-title">{item.title}</span>
              <span className="slash-menu-desc">{item.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandList.displayName = 'CommandList';

// --- SLASH COMMAND UTILITIES ---

export const getSuggestionItems = ({ query }: { query: string }): SlashMenuItem[] => {
  return [
    {
      title: 'Heading 1',
      description: 'Big section heading.',
      icon: 'H1',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading.',
      icon: 'H2',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading.',
      icon: 'H3',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bulleted list.',
      icon: '•',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering.',
      icon: '1.',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'Checklist',
      description: 'Track tasks with a to-do list.',
      icon: '☑',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: 'Quote',
      description: 'Capture a quote.',
      icon: '"',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: 'Divider',
      description: 'Visually divide blocks.',
      icon: '—',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: 'Code Block',
      description: 'Capture a code snippet.',
      icon: '<>',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: 'Image',
      description: 'Upload an image.',
      icon: '🖼️',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        // We delete the slash command range, then trigger our custom external click handler
        editor.chain().focus().deleteRange(range).run();
        // A bit of a hack: dispatch a custom event that our parent component listens for
        document.dispatchEvent(new CustomEvent('tiptap:request-image-upload'));
      },
    },
    {
      title: 'YouTube',
      description: 'Embed a YouTube video.',
      icon: '▶',
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter YouTube URL:');
        if (url) {
          // Validate that the URL is a legitimate YouTube URL
          const ytPattern = /^https?:\/\/(www\.)?(youtube\.com\/(watch|embed|shorts)|youtu\.be\/)/i;
          if (!ytPattern.test(url)) {
            alert('Please enter a valid YouTube URL.');
            return;
          }
          editor.commands.setYoutubeVideo({ src: url });
        }
      },
    },
  ].filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()));
};

// --- TIPTAP EXTENSION REGISTRATION ---

const renderItems = () => {
  let component: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) return;

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },

    onUpdate: (props: any) => {
      component.updateProps(props);

      if (!props.clientRect) return;

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown: (props: any) => {
      if (props.event.key === 'Escape') {
        popup[0].hide();
        return true;
      }
      return (component.ref as any)?.onKeyDown(props);
    },

    onExit: () => {
      popup[0].destroy();
      component.destroy();
    },
  };
};

export const SlashCommandsExtension = Node.create({
  name: 'slashCommands',
  
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      } as Omit<SuggestionOptions, 'editor'>,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export const slashSuggestionConfig = {
  items: getSuggestionItems,
  render: renderItems,
};
