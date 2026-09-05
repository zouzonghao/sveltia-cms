import { describe, expect, it } from 'vitest';

import { getPastedImageFiles, isPasteEventHandled, markPasteEventHandled } from './clipboard';

describe('paste event guard', () => {
  it('should mark an event as handled and report it back', () => {
    const event = /** @type {ClipboardEvent} */ (/** @type {any} */ ({}));

    expect(isPasteEventHandled(event)).toBe(false);

    markPasteEventHandled(event);

    expect(isPasteEventHandled(event)).toBe(true);
  });

  it('should track events independently', () => {
    const event1 = /** @type {ClipboardEvent} */ (/** @type {any} */ ({}));
    const event2 = /** @type {ClipboardEvent} */ (/** @type {any} */ ({}));

    markPasteEventHandled(event1);

    expect(isPasteEventHandled(event1)).toBe(true);
    expect(isPasteEventHandled(event2)).toBe(false);
  });
});

describe('utils/clipboard', () => {
  describe('getPastedImageFiles', () => {
    /**
     * Create a paste event-like object holding the given files.
     * @param {File[]} files Files in the clipboard.
     * @returns {ClipboardEvent} Event-like object.
     */
    const makeEvent = (files) =>
      /** @type {ClipboardEvent} */ (/** @type {any} */ ({ clipboardData: { files } }));

    it('should extract image files and rename them with a timestamp', () => {
      const image = new File(['abc'], 'image.png', { type: 'image/png' });

      const files = getPastedImageFiles(
        makeEvent([image, new File(['x'], 'a.txt', { type: 'text/plain' })]),
      );

      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('image/png');
      expect(files[0].name).toMatch(/^pasted-image-\d+-1\.png$/);
    });

    it('should number multiple pasted images', () => {
      const files = getPastedImageFiles(
        makeEvent([
          new File(['abc'], 'image.png', { type: 'image/png' }),
          new File(['def'], 'image.jpeg', { type: 'image/jpeg' }),
        ]),
      );

      expect(files).toHaveLength(2);
      expect(files[0].name).toMatch(/-1\.png$/);
      expect(files[1].name).toMatch(/-2\.jpeg$/);
    });

    it('should return an empty array when the clipboard holds no image', () => {
      expect(getPastedImageFiles(makeEvent([]))).toEqual([]);
    });

    it('should return an empty array when clipboard data is missing', () => {
      const event = /** @type {ClipboardEvent} */ (/** @type {any} */ ({ clipboardData: null }));

      expect(getPastedImageFiles(event)).toEqual([]);
    });
  });
});
