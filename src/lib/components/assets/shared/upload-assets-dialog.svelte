<script>
  import { _ } from '@sveltia/i18n';
  import { Alert, Dialog, FilePicker, Toast } from '@sveltia/ui';
  import mime from 'mime';
  import { untrack } from 'svelte';

  import DropZone from '$lib/components/assets/shared/drop-zone.svelte';
  import { uploadingAssets } from '$lib/services/assets';
  import { targetAssetFolder } from '$lib/services/assets/folders';
  import {
    showAssetOverlay,
    showUploadAssetsDialog,
    uploadDialogAccept,
  } from '$lib/services/assets/view';
  import { env } from '$lib/services/user/env.svelte';
  import { getPastedImageFiles, markPasteEventHandled } from '$lib/services/utils/clipboard';

  /** @type {FilePicker | undefined} */
  let filePicker = $state();
  const pasteToast = $state({
    show: false,
    message: /** @type {string | undefined} */ (undefined),
  });

  const { originalAssets } = $derived($uploadingAssets);
  // Use the first asset because replacement only supports one asset for now
  const originalAsset = $derived(originalAssets?.[0]);
  const multiple = $derived(!originalAsset);
  const accept = $derived(
    originalAsset ? (mime.getType(originalAsset.name) ?? undefined) : $uploadDialogAccept,
  );

  /**
   * Update the asset list, which will show the confirmation dialog.
   * @param {File[]} files Selected files.
   */
  const onSelect = (files) => {
    if (!files.length) {
      return;
    }

    $uploadingAssets = {
      folder: originalAsset ? originalAsset.folder : $targetAssetFolder,
      files,
      originalAssets,
      // Remember the constraint so that adding more files to the batch narrows the same way
      accept,
    };
    $showUploadAssetsDialog = false;
  };

  /**
   * Handle a paste keyboard shortcut while the dialog is open.
   * @param {ClipboardEvent} event Paste event.
   */
  const onPaste = (event) => {
    if (!env.hasMouse || !$showUploadAssetsDialog) {
      return;
    }

    // The confirmation dialog’s own paste listener must not consume the same event again
    markPasteEventHandled(event);

    const pastedFiles = getPastedImageFiles(event);

    if (pastedFiles.length) {
      onSelect(pastedFiles);
    } else {
      Object.assign(pasteToast, { message: _('no_image_in_clipboard'), show: true });
    }
  };

  $effect(() => {
    // Open the file picker directly if drag & drop is not supported (on mobile)
    if (!env.hasMouse && $showUploadAssetsDialog) {
      filePicker?.open();
    }
  });

  $effect(() => {
    if (!$showAssetOverlay) {
      $showUploadAssetsDialog = false;
    }
  });

  $effect(() => {
    if (!$showUploadAssetsDialog) {
      // A replacement request is written to the store before this dialog opens, and consumed by
      // `onSelect` above. Dismissing the dialog would otherwise leave it behind, and the next
      // ordinary upload would be treated as a replacement of that asset — with the wrong dialog
      // title, a single-file picker and an `accept` list restricted to the asset’s own type.
      // `onSelect` stores the files before it closes the dialog, so a non-empty list here means a
      // selection was made and the request is still in use.
      untrack(() => {
        if (!$uploadingAssets.files.length && $uploadingAssets.originalAssets) {
          $uploadingAssets = { folder: undefined, files: [] };
        }

        // Likewise, don’t leave an `accept` override behind for the next ordinary upload
        $uploadDialogAccept = undefined;
      });
    }
  });
</script>

<svelte:window onpaste={onPaste} />

{#if env.hasMouse}
  <Dialog
    title={originalAsset
      ? _('replace_x', { values: { name: originalAsset.name } })
      : _('upload_assets')}
    bind:open={$showUploadAssetsDialog}
    showOk={false}
  >
    <!--
      Dropped files are not filtered by `accept` here: `<UploadAssetsConfirmDialog>` checks the
      format once the files have been processed, which is the only point a transformation could
      have changed it. The attribute still narrows the file picker.
    -->
    <DropZone
      showUploadButton={true}
      {accept}
      {multiple}
      filterDroppedFiles={false}
      onDrop={({ files }) => {
        onSelect(files);
      }}
    />
  </Dialog>
{:else}
  <FilePicker
    bind:this={filePicker}
    {accept}
    {multiple}
    onSelect={({ files }) => {
      onSelect(files);
    }}
    onCancel={() => {
      $showUploadAssetsDialog = false;
    }}
  />
{/if}

<Toast bind:show={pasteToast.show}>
  <Alert status="error">{pasteToast.message}</Alert>
</Toast>
