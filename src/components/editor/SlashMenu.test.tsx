/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @vitest-environment jsdom
 */
import { getSuggestionItems } from './SlashMenu';
import { Editor, Range } from '@tiptap/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getSuggestionItems', () => {
  it('returns all items when query is empty', () => {
    const items = getSuggestionItems({ query: '' });
    expect(items.length).toBeGreaterThan(0);
    expect(items.some(item => item.title === 'Heading 1')).toBe(true);
    expect(items.some(item => item.title === 'Bullet List')).toBe(true);
  });

  it('filters items by title prefix (case-insensitive)', () => {
    const items = getSuggestionItems({ query: 'HeAd' });
    expect(items.length).toBe(3); // Heading 1, Heading 2, Heading 3
    expect(items.every(item => item.title.startsWith('Heading'))).toBe(true);
  });

  it('filters items by prefix correctly', () => {
    const items = getSuggestionItems({ query: 'bul' });
    expect(items.length).toBe(1);
    expect(items[0].title).toBe('Bullet List');
  });

  it('returns empty array when no items match', () => {
    const items = getSuggestionItems({ query: 'xyz' });
    expect(items.length).toBe(0);
  });

  describe('commands execution', () => {
    let mockEditor: any;
    let mockRange: any;
    let mockRun: ReturnType<typeof vi.fn>;
    let mockSetNode: ReturnType<typeof vi.fn>;
    let mockDeleteRange: ReturnType<typeof vi.fn>;
    let mockFocus: ReturnType<typeof vi.fn>;
    let mockChain: ReturnType<typeof vi.fn>;
    let mockToggleBulletList: ReturnType<typeof vi.fn>;
    let mockToggleOrderedList: ReturnType<typeof vi.fn>;
    let mockToggleTaskList: ReturnType<typeof vi.fn>;
    let mockToggleBlockquote: ReturnType<typeof vi.fn>;
    let mockSetHorizontalRule: ReturnType<typeof vi.fn>;
    let mockToggleCodeBlock: ReturnType<typeof vi.fn>;
    let mockSetYoutubeVideo: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockRun = vi.fn();
      mockSetNode = vi.fn().mockReturnValue({ run: mockRun });
      mockToggleBulletList = vi.fn().mockReturnValue({ run: mockRun });
      mockToggleOrderedList = vi.fn().mockReturnValue({ run: mockRun });
      mockToggleTaskList = vi.fn().mockReturnValue({ run: mockRun });
      mockToggleBlockquote = vi.fn().mockReturnValue({ run: mockRun });
      mockSetHorizontalRule = vi.fn().mockReturnValue({ run: mockRun });
      mockToggleCodeBlock = vi.fn().mockReturnValue({ run: mockRun });
      mockSetYoutubeVideo = vi.fn();

      mockDeleteRange = vi.fn().mockReturnValue({
        setNode: mockSetNode,
        toggleBulletList: mockToggleBulletList,
        toggleOrderedList: mockToggleOrderedList,
        toggleTaskList: mockToggleTaskList,
        toggleBlockquote: mockToggleBlockquote,
        setHorizontalRule: mockSetHorizontalRule,
        toggleCodeBlock: mockToggleCodeBlock,
        run: mockRun
      });
      mockFocus = vi.fn().mockReturnValue({ deleteRange: mockDeleteRange });
      mockChain = vi.fn().mockReturnValue({ focus: mockFocus });

      mockEditor = {
        chain: mockChain,
        commands: {
          setYoutubeVideo: mockSetYoutubeVideo
        }
      } as unknown as Editor;

      mockRange = {} as Range;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('executes Heading 1 command correctly', () => {
      const items = getSuggestionItems({ query: 'Heading 1' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockChain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockDeleteRange).toHaveBeenCalledWith(mockRange);
      expect(mockSetNode).toHaveBeenCalledWith('heading', { level: 1 });
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Heading 2 command correctly', () => {
      const items = getSuggestionItems({ query: 'Heading 2' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockSetNode).toHaveBeenCalledWith('heading', { level: 2 });
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Heading 3 command correctly', () => {
      const items = getSuggestionItems({ query: 'Heading 3' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockSetNode).toHaveBeenCalledWith('heading', { level: 3 });
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Bullet List command correctly', () => {
      const items = getSuggestionItems({ query: 'Bullet List' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockToggleBulletList).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Numbered List command correctly', () => {
      const items = getSuggestionItems({ query: 'Numbered List' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockToggleOrderedList).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Checklist command correctly', () => {
      const items = getSuggestionItems({ query: 'Checklist' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockToggleTaskList).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Quote command correctly', () => {
      const items = getSuggestionItems({ query: 'Quote' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockToggleBlockquote).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Divider command correctly', () => {
      const items = getSuggestionItems({ query: 'Divider' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockSetHorizontalRule).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Code Block command correctly', () => {
      const items = getSuggestionItems({ query: 'Code Block' });
      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockToggleCodeBlock).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('executes Image command and dispatches event', () => {
      const items = getSuggestionItems({ query: 'Image' });

      const dispatchEventSpy = vi.spyOn(document, 'dispatchEvent').mockImplementation(() => true);

      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockDeleteRange).toHaveBeenCalledWith(mockRange);
      expect(mockRun).toHaveBeenCalled();

      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('tiptap:request-image-upload');

      dispatchEventSpy.mockRestore();
    });

    it('executes YouTube command correctly when user provides URL', () => {
      const items = getSuggestionItems({ query: 'YouTube' });

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://youtube.com/watch?v=123');

      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockDeleteRange).toHaveBeenCalledWith(mockRange);
      expect(mockRun).toHaveBeenCalled();
      expect(promptSpy).toHaveBeenCalledWith('Enter YouTube URL:');
      expect(mockSetYoutubeVideo).toHaveBeenCalledWith({ src: 'https://youtube.com/watch?v=123' });

      promptSpy.mockRestore();
    });

    it('does not set YouTube video if prompt is cancelled', () => {
      const items = getSuggestionItems({ query: 'YouTube' });

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      items[0].command({ editor: mockEditor, range: mockRange });

      expect(promptSpy).toHaveBeenCalled();
      expect(mockSetYoutubeVideo).not.toHaveBeenCalled();

      promptSpy.mockRestore();
    });
  });
});
