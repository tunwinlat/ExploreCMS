import { getSuggestionItems } from './SlashMenu';
import { Editor, Range } from '@tiptap/core';

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
    let mockRun: jest.Mock;
    let mockSetNode: jest.Mock;
    let mockDeleteRange: jest.Mock;
    let mockFocus: jest.Mock;
    let mockChain: jest.Mock;
    let mockToggleBulletList: jest.Mock;
    let mockToggleOrderedList: jest.Mock;
    let mockToggleTaskList: jest.Mock;
    let mockToggleBlockquote: jest.Mock;
    let mockSetHorizontalRule: jest.Mock;
    let mockToggleCodeBlock: jest.Mock;
    let mockSetYoutubeVideo: jest.Mock;

    beforeEach(() => {
      mockRun = jest.fn();
      mockSetNode = jest.fn().mockReturnValue({ run: mockRun });
      mockToggleBulletList = jest.fn().mockReturnValue({ run: mockRun });
      mockToggleOrderedList = jest.fn().mockReturnValue({ run: mockRun });
      mockToggleTaskList = jest.fn().mockReturnValue({ run: mockRun });
      mockToggleBlockquote = jest.fn().mockReturnValue({ run: mockRun });
      mockSetHorizontalRule = jest.fn().mockReturnValue({ run: mockRun });
      mockToggleCodeBlock = jest.fn().mockReturnValue({ run: mockRun });
      mockSetYoutubeVideo = jest.fn();

      mockDeleteRange = jest.fn().mockReturnValue({
        setNode: mockSetNode,
        toggleBulletList: mockToggleBulletList,
        toggleOrderedList: mockToggleOrderedList,
        toggleTaskList: mockToggleTaskList,
        toggleBlockquote: mockToggleBlockquote,
        setHorizontalRule: mockSetHorizontalRule,
        toggleCodeBlock: mockToggleCodeBlock,
        run: mockRun
      });
      mockFocus = jest.fn().mockReturnValue({ deleteRange: mockDeleteRange });
      mockChain = jest.fn().mockReturnValue({ focus: mockFocus });

      mockEditor = {
        chain: mockChain,
        commands: {
          setYoutubeVideo: mockSetYoutubeVideo
        }
      } as unknown as Editor;

      mockRange = {} as Range;
    });

    afterEach(() => {
      jest.clearAllMocks();
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

      const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent').mockImplementation(() => true);

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

      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('https://youtube.com/watch?v=123');

      items[0].command({ editor: mockEditor, range: mockRange });

      expect(mockDeleteRange).toHaveBeenCalledWith(mockRange);
      expect(mockRun).toHaveBeenCalled();
      expect(promptSpy).toHaveBeenCalledWith('Enter YouTube URL:');
      expect(mockSetYoutubeVideo).toHaveBeenCalledWith({ src: 'https://youtube.com/watch?v=123' });

      promptSpy.mockRestore();
    });

    it('does not set YouTube video if prompt is cancelled', () => {
      const items = getSuggestionItems({ query: 'YouTube' });

      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(null);

      items[0].command({ editor: mockEditor, range: mockRange });

      expect(promptSpy).toHaveBeenCalled();
      expect(mockSetYoutubeVideo).not.toHaveBeenCalled();

      promptSpy.mockRestore();
    });
  });
});
