# Cactus fork

Personal fork of [Sveltia CMS](https://github.com/sveltia/sveltia-cms) with a small patch set on top of the upstream `v0.205.4` tag. The `cactus` branch is the only maintained branch; do not merge it back into `main` so that `main` stays identical to upstream for clean rebases.

## Changes

- **AVIF and JPEG output formats for image transformations.** Upstream only allows `format: webp` in `media_libraries.*.config.transformations`. This fork unlocks `avif` and `jpeg` as well. AVIF has no native browser encoding, so it is encoded with the `@jsquash/avif` WASM library loaded from UNPKG at runtime (slower than native WebP encoding, especially for large images).
- **Encoder failure now fails the transformation.** Upstream silently falls back to `canvas.convertToBlob()` when the jSquash encoder fails, which produces a PNG blob with mismatched content for formats like AVIF. This fork throws instead, and the original file is uploaded as is.
- **GIFs skip the catch-all `raster_image` transformation.** Re-encoding would flatten an animated GIF to a single frame. An explicit `transformations.gif` block still applies.
- **Content-hash deduplication on upload.** Files whose Git object ID matches an existing asset in the target folder (or an earlier file in the same batch) are shown in a warning section of the upload confirmation dialog and skipped, so no duplicate commit is created. See `getDuplicatedFiles` in `src/lib/services/assets/index.js`.
- **Clipboard paste in the upload flow.** The desktop upload dialog accepts Ctrl/Cmd+V (paste event) and has a Paste Image button (async Clipboard API); the confirmation dialog also accepts pasting more images into the pending batch. Pasted files are renamed `pasted-image-<timestamp>-<n>.<ext>`. See `src/lib/services/utils/clipboard.js`.
- **Adding more files to a pending batch.** The upload confirmation dialog has an Add More Files button; manually removed files stay removed when the batch is reprocessed.
- **Image-specific upload launcher on mobile.** The asset list shows a second floating button (`add_photo_alternate`) that opens the picker with `accept="image/*"`, so Android offers the gallery/photo picker instead of the generic file manager. The override travels through the `uploadDialogAccept` store and is cleared when the dialog closes.
- **Chinese strings bundled in production.** The fork adds translation keys that the upstream locale files on the CDN don’t have, so `zh-CN` is bundled with the app instead of being fetched (and falling back to English for the fork keys).
- **Image quality tiers in the app settings.** The Media panel of the CMS settings dialog (avatar menu → Settings) offers upload quality tiers (automatic / 70 / 60 / 50). A tier overrides the `quality` values of the raster image transformations from the configuration for uploads on that browser, effective immediately without a rebuild.

Patch files (keep this list minimal for easy rebases):

- `src/lib/services/utils/media/image/index.js`
- `src/lib/services/utils/media/image/encode.js`
- `src/lib/services/integrations/media-libraries/default/index.js`
- `src/lib/types/public.js` + `src/lib/types/private.js` (`imageQuality` preference)
- `src/lib/services/app/i18n.js` (zh-CN strings bundled in production)
- `src/lib/services/assets/index.js` (content dedup helper)
- `src/lib/services/assets/view/index.js` (`uploadDialogAccept` store)
- `src/lib/services/utils/clipboard.js` (new file)
- `src/lib/components/assets/shared/upload-assets-dialog.svelte` (paste, accept override)
- `src/lib/components/assets/shared/upload-assets-confirm-dialog.svelte` (dedup section, add-more, paste)
- `src/lib/components/assets/shared/upload-assets-preview.svelte` (`onRemove` callback)
- `src/lib/components/assets/toolbar/upload-assets-button.svelte` (accept/icon props)
- `src/lib/components/assets/list/primary-toolbar.svelte` (second FAB)
- `src/lib/components/settings/panels/media-panel.svelte` (image quality tiers)
- `package.json` (`@jsquash/avif`, `@jsquash/jpeg` version pins)
- `src/lib/locales/en-US.yaml` + `src/lib/locales/zh-CN.yaml` (new keys)
- corresponding `*.test.js` files

## Release

```sh
pnpm install
pnpm test && pnpm check && pnpm build
git add -f package/dist/sveltia-cms.js
git commit -m 'Add CDN build artifact'
git tag vX.Y.Z-cactus.N
git push origin cactus --tags
```

The build artifact is served via jsDelivr, e.g. `https://cdn.jsdelivr.net/gh/zouzonghao/sveltia-cms@v0.205.4-cactus.5/package/dist/sveltia-cms.js`. Always pin the tag, never the branch: jsDelivr caches branches for ~12 hours and tags are immutable.

## Syncing with upstream

```sh
git fetch upstream --tags
git rebase v0.206.0   # or whichever tag to move to
pnpm install && pnpm test && pnpm build
# then release as above with a new tag
```
