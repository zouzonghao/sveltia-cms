/* eslint-disable max-classes-per-file */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as encodeModule from './encode';

const { exportCanvasAsBlob } = encodeModule;

// Mock dependencies
vi.mock('$lib/services/app/dependencies', () => ({
  loadModule: vi.fn(),
}));

vi.mock('$lib/services/utils/media/image', () => ({
  RASTER_IMAGE_CONVERSION_FORMATS: ['webp', 'avif', 'jpeg'],
}));

// Mock the checkIfEncodingIsSupported function
// We'll mock this inline in tests as needed

describe('exportCanvasAsBlob', () => {
  /** @type {any} */
  let mockCanvas;
  /** @type {any} */
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      })),
    };

    mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn(() => mockContext),
      convertToBlob: vi.fn(),
    };

    // Mock OffscreenCanvas globally
    // @ts-ignore - Mock implementation doesn't need all properties
    /**
     * Mock OffscreenCanvas class for testing.
     */
    class MockOffscreenCanvas {
      /**
       * Constructor.
       */
      constructor() {
        this.getContext = vi.fn(() => mockContext);
        // Echo the requested type so that native encoding appears supported for any format
        this.convertToBlob = vi.fn(({ type: requestedType } = {}) =>
          Promise.resolve(new Blob([''], { type: requestedType ?? 'image/png' })),
        );
      }
    }

    // @ts-ignore - Assigning mock class to global
    global.OffscreenCanvas = MockOffscreenCanvas;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should use native canvas encoding when supported', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/webp' });

    mockCanvas.convertToBlob.mockResolvedValue(mockBlob);

    const result = await exportCanvasAsBlob(mockCanvas, { format: 'webp', quality: 85 });

    expect(result).toBe(mockBlob);
    expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/webp',
      quality: 0.85,
    });
  });

  test('should use default options when none provided', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/webp' });

    mockCanvas.convertToBlob.mockResolvedValue(mockBlob);

    const result = await exportCanvasAsBlob(mockCanvas);

    expect(result).toBe(mockBlob);
    expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/webp',
      quality: 0.85, // 85 / 100
    });
  });

  test('should handle jSquash fallback flow', async () => {
    const mockBlob = new Blob(['webp result'], { type: 'image/webp' });

    // Mock canvas to return a blob
    mockCanvas.convertToBlob.mockResolvedValue(mockBlob);

    // Test that the function returns a blob for webp format
    const result = await exportCanvasAsBlob(mockCanvas, { format: 'webp', quality: 90 });

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/webp');
  });

  test('should use jSquash encoding when native encoding is not supported', async () => {
    const { loadModule } = await import('$lib/services/app/dependencies');
    const mockEncodedBuffer = new Uint8Array([1, 2, 3, 4]);
    // Mock jSquash encode function
    const mockEncode = vi.fn(() => Promise.resolve(mockEncodedBuffer));

    vi.mocked(loadModule).mockResolvedValue({ default: mockEncode });

    // Create a new OffscreenCanvas mock that returns wrong type
    const wrongTypeContext = {
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      })),
    };

    // Mock OffscreenCanvas to return wrong type for AVIF (simulating unsupported encoding)
    // @ts-ignore - Mock implementation doesn't need all properties
    /**
     * Mock OffscreenCanvas class for testing unsupported encoding.
     */
    class MockOffscreenCanvasWithWrongType {
      /**
       * Constructor for MockOffscreenCanvasWithWrongType.
       * @param {number} width Canvas width.
       * @param {number} height Canvas height.
       */
      constructor(width, height) {
        if (width === 1 && height === 1) {
          // This is the check canvas - return wrong type
          this.getContext = vi.fn(() => wrongTypeContext);
          this.convertToBlob = vi.fn(() => Promise.resolve(new Blob([''], { type: 'image/png' })));
        } else {
          // This is the actual canvas
          this.getContext = vi.fn(() => mockContext);
          this.convertToBlob = vi.fn(() => Promise.resolve(new Blob([''], { type: 'image/avif' })));
        }
      }
    }

    // @ts-ignore - Assigning mock class to global
    global.OffscreenCanvas = MockOffscreenCanvasWithWrongType;

    const mockImageData = {
      data: new Uint8ClampedArray(400),
      width: 10,
      height: 10,
    };

    mockContext.getImageData.mockReturnValue(mockImageData);
    mockCanvas.width = 10;
    mockCanvas.height = 10;

    const result = await exportCanvasAsBlob(mockCanvas, { format: 'avif', quality: 90 });

    expect(loadModule).toHaveBeenCalledWith('@jsquash/avif', 'encode.js?module');
    expect(mockEncode).toHaveBeenCalledWith(mockImageData, { quality: 90 });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/avif');
    expect(await result.arrayBuffer()).toEqual(mockEncodedBuffer.buffer);
  });

  test('should throw when the jSquash encoder fails to load', async () => {
    const mockLoadModule = vi.fn(() => Promise.reject(new Error('jSquash load failed')));
    const { loadModule } = await import('$lib/services/app/dependencies');

    vi.mocked(loadModule).mockImplementation(mockLoadModule);

    // AVIF support has already been probed and cached as unsupported by the preceding test.
    // The encoder failure must not silently fall back to `convertToBlob()`, which would
    // produce a PNG blob with mismatched content
    await expect(exportCanvasAsBlob(mockCanvas, { format: 'avif', quality: 90 })).rejects.toThrow(
      'jSquash encoding failed for avif',
    );

    expect(mockCanvas.convertToBlob).not.toHaveBeenCalled();
  });

  test('should handle PNG format', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });

    mockCanvas.convertToBlob.mockResolvedValue(mockBlob);

    const result = await exportCanvasAsBlob(mockCanvas, { format: 'png', quality: 100 });

    expect(result).toBe(mockBlob);
    expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/png',
      quality: 1.0,
    });
  });

  test('should handle JPEG format', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    mockCanvas.convertToBlob.mockResolvedValue(mockBlob);

    const result = await exportCanvasAsBlob(mockCanvas, { format: 'jpeg', quality: 75 });

    expect(result).toBe(mockBlob);
    expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/jpeg',
      quality: 0.75,
    });
  });

  test('should skip jSquash for unsupported formats', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/bmp' });

    mockCanvas.convertToBlob.mockResolvedValue(mockBlob);

    const result = await exportCanvasAsBlob(mockCanvas, { format: 'bmp', quality: 85 });

    expect(result).toBe(mockBlob);
    expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/bmp',
      quality: 0.85,
    });
  });
});
