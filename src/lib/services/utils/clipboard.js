/**
 * Paste events already consumed by a handler. Both the Upload Assets dialog and its confirmation
 * dialog listen for `paste` on `window`: the first handler synchronously opens the confirmation
 * dialog by storing the files, and the second handler would then see that dialog open and append
 * the same files again. Marking the event keeps a single paste from being handled twice,
 * regardless of the listener registration order.
 * @type {WeakSet<ClipboardEvent>}
 */
const handledPasteEvents = new WeakSet();

/**
 * Mark a paste event as consumed.
 * @param {ClipboardEvent} event Paste event.
 */
export const markPasteEventHandled = (event) => {
  handledPasteEvents.add(event);
};

/**
 * Check whether a paste event has already been consumed by another handler.
 * @param {ClipboardEvent} event Paste event.
 * @returns {boolean} Result.
 */
export const isPasteEventHandled = (event) => handledPasteEvents.has(event);

/**
 * Get a normalized file extension for the given file or blob.
 * @param {File | Blob} file File or blob.
 * @returns {string} Extension without the leading dot.
 */
const getExtension = (file) =>
  file.type.split('/')[1]?.replace('+xml', '') ??
  (file instanceof File ? file.name.split('.').pop() : undefined) ??
  'png';

/**
 * Get image files from a paste event’s clipboard data. The files are renamed with a timestamp
 * so repeatedly pasted screenshots don’t collide under a generic name like `image.png`.
 * @param {ClipboardEvent} event Paste event.
 * @returns {File[]} Image files found in the clipboard.
 */
export const getPastedImageFiles = (event) => {
  const files = [...(event.clipboardData?.files ?? [])].filter(({ type }) =>
    type.startsWith('image/'),
  );

  const timestamp = Date.now();

  return files.map(
    (file, index) =>
      new File([file], `pasted-image-${timestamp}-${index + 1}.${getExtension(file)}`, {
        type: file.type,
        lastModified: file.lastModified,
      }),
  );
};
