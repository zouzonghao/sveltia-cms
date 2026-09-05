# Cactus fork

Personal fork of [Sveltia CMS](https://github.com/sveltia/sveltia-cms) with a small patch set on top of the upstream `v0.205.4` tag. The `cactus` branch is the only maintained branch; do not merge it back into `main` so that `main` stays identical to upstream for clean rebases.

Remotes: `origin` → this fork, `upstream` → `sveltia/sveltia-cms` (read-only, for fetching updates).

## Changes

- **AVIF and JPEG output formats for image transformations.** Upstream only allows `format: webp` in `media_libraries.*.config.transformations`. This fork unlocks `avif` and `jpeg` as well. AVIF has no native browser encoding, so it is encoded with the `@jsquash/avif` WASM library loaded from UNPKG at runtime (slower than native WebP encoding, especially for large images).
- **Encoder failure now fails the transformation.** Upstream silently falls back to `canvas.convertToBlob()` when the jSquash encoder fails, which produces a PNG blob with mismatched content for formats like AVIF. This fork throws instead, and the original file is uploaded as is.
- **GIFs skip the catch-all `raster_image` transformation.** Re-encoding would flatten an animated GIF to a single frame. An explicit `transformations.gif` block still applies.
- **Content-hash deduplication on upload.** Files whose Git object ID matches an existing asset in the target folder (or an earlier file in the same batch) are shown in a warning section of the upload confirmation dialog and skipped, so no duplicate commit is created. See `getDuplicatedFiles` in `src/lib/services/assets/index.js`.
- **Clipboard paste in the upload flow.** The desktop upload dialog accepts Ctrl/Cmd+V (a window paste listener; the drop zone description mentions the shortcut), and the confirmation dialog accepts pasting more images into the pending batch. Pasted files are renamed `pasted-image-<timestamp>-<n>.<ext>`. A WeakSet guard keeps a single paste event from being consumed by both listeners, which used to add the image twice and flag the copy as a duplicate. See `src/lib/services/utils/clipboard.js`.
- **Adding more files to a pending batch.** The upload confirmation dialog has an Add More Files button; manually removed files stay removed when the batch is reprocessed (tracked by name and size, which survive reprocessing), and the picker is narrowed by the same `accept` constraint the batch was started with.
- **Image-only upload launcher on mobile.** On small screens the asset list shows a single floating button (`add_photo_alternate`) that opens the picker with `accept="image/*"`, so Android offers the gallery/photo picker instead of the generic file manager; the generic upload button remains on desktop. The override travels through the `uploadDialogAccept` store and, once files are selected, with the batch in `uploadingAssets`.
- **Chinese strings bundled in production.** The fork adds translation keys that the upstream locale files on the CDN don’t have, so `zh-CN` is bundled with the app instead of being fetched (and falling back to English for the fork keys).
- **Image quality tiers in the app settings.** The Media panel of the CMS settings dialog (avatar menu → Settings) offers upload quality tiers (automatic / 70 / 60 / 50). A tier overrides the `quality` values of the raster image transformations from the configuration for uploads on that browser, effective immediately without a rebuild. Applied in `getDefaultMediaLibraryOptions`, so the media library and the entry editor image fields behave the same.
- **Taller rich-text body editor.** The editable area starts at a 40vh min-height with a 20vh bottom padding (rich-text and plain-text modes alike), so the last lines can be scrolled above the bottom edge — and above the on-screen keyboard on mobile. Nested editor components stay compact.

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
- `src/lib/components/assets/list/primary-toolbar.svelte` (image-only FAB on mobile)
- `src/lib/components/settings/panels/media-panel.svelte` (image quality tiers)
- `src/lib/components/contents/details/fields/rich-text/rich-text-editor.svelte` (taller editor
  with bottom breathing room)
- `package.json` + `pnpm-lock.yaml` (`@jsquash/avif`, `@jsquash/jpeg` version pins)
- `src/lib/locales/en-US.yaml` + `src/lib/locales/zh-CN.yaml` (new keys)
- corresponding `*.test.js` files

## Release

```sh
pnpm install
pnpm test && pnpm check && pnpm build
git add -f package/dist/sveltia-cms.js
git commit -m 'Add CDN build artifact'
git tag vX.Y.Z-cactus.N          # match the upstream version it is based on, e.g. v0.206.0-cactus.1
git push origin cactus --tags
```

The build artifact is served via jsDelivr, e.g. `https://cdn.jsdelivr.net/gh/zouzonghao/sveltia-cms@v0.205.4-cactus.7/package/dist/sveltia-cms.js`. Always pin the tag, never the branch: jsDelivr caches branches for ~12 hours and tags are immutable. After releasing, update the script URL in the blog theme (`public/admin/index.html`).

## Syncing with upstream

Upstream releases frequently (often several per week). The fork keeps its patches as a thin layer
of commits, so moving to a new upstream version is a rebase; expect conflicts only in the patch
files listed above — resolve them by re-applying the fork’s intent onto the new upstream code
(`git checkout --ours` is usually wrong here; the incoming side is upstream).

```sh
# 0. One-time setup (already configured)
#    git remote add upstream https://github.com/sveltia/sveltia-cms.git

# 1. Fetch upstream and fast-forward main so it stays identical to upstream
git fetch upstream --tags
git checkout main && git merge --ff-only upstream/main && git push origin main

# 2. Rebase the fork commits onto the target upstream tag.
#    Drop the old 'Add CDN build artifact' commits while replaying (they are 2 MB binary
#    snapshots that would slow the rebase down); a fresh artifact is built in step 4.
git checkout cactus
git rebase -i v0.206.0           # or whichever tag to move to; `drop` the artifact commits

# 3. Resolve conflicts in the patch files, then make sure everything still holds
pnpm install && pnpm test && pnpm check

# 4. Build, commit a fresh artifact and release with a NEW tag (never move an existing tag)
pnpm build
git add -f package/dist/sveltia-cms.js
git commit -m 'Add CDN build artifact for v0.206.0-cactus.1'
git tag v0.206.0-cactus.1
git push -f origin cactus --tags  # force: the rebase rewrote history

# 5. Point the blog theme at the new tag (public/admin/index.html) and deploy it
```

Notes:

- After a force push, the old tags keep pointing at pre-rebase commits. That is fine — jsDelivr
  serves their cached trees, and the theme always pins one specific current tag.
- If upstream ever implements one of these features natively (AVIF support, upload
  deduplication, …), drop the corresponding fork commits during the rebase instead of resolving
  conflicts against them.
- `pnpm check` includes cspell, ESLint, Prettier, stylelint, svelte-check and the locale
  consistency check; the repo requires full test coverage for touched files, so keep the
  `*.test.js` files in sync while resolving conflicts.
