# Cactus fork

Personal fork of [Sveltia CMS](https://github.com/sveltia/sveltia-cms) with a small patch set on
top of the upstream `v0.205.4` tag. The `cactus` branch is the only maintained branch; do not
merge it back into `main` so that `main` stays identical to upstream for clean rebases.

## Changes

- **AVIF and JPEG output formats for image transformations.** Upstream only allows
  `format: webp` in `media_libraries.*.config.transformations`. This fork unlocks `avif` and
  `jpeg` as well. AVIF has no native browser encoding, so it is encoded with the
  `@jsquash/avif` WASM library loaded from UNPKG at runtime (slower than native WebP encoding,
  especially for large images).
- **Encoder failure now fails the transformation.** Upstream silently falls back to
  `canvas.convertToBlob()` when the jSquash encoder fails, which produces a PNG blob with
  mismatched content for formats like AVIF. This fork throws instead, and the original file is
  uploaded as is.
- **GIFs skip the catch-all `raster_image` transformation.** Re-encoding would flatten an
  animated GIF to a single frame. An explicit `transformations.gif` block still applies.

Patch files (keep this list minimal for easy rebases):

- `src/lib/services/utils/media/image/index.js`
- `src/lib/services/utils/media/image/encode.js`
- `src/lib/services/integrations/media-libraries/default/index.js`
- `src/lib/types/public.js`
- `package.json` (`@jsquash/avif`, `@jsquash/jpeg` version pins)
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

The build artifact is served via jsDelivr, e.g.
`https://cdn.jsdelivr.net/gh/zouzonghao/sveltia-cms@v0.205.4-cactus.1/package/dist/sveltia-cms.js`.
Always pin the tag, never the branch: jsDelivr caches branches for ~12 hours and tags are
immutable.

## Syncing with upstream

```sh
git fetch upstream --tags
git rebase v0.206.0   # or whichever tag to move to
pnpm install && pnpm test && pnpm build
# then release as above with a new tag
```
