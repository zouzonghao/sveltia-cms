<script>
  import { _ } from '@sveltia/i18n';
  import { Button, Icon } from '@sveltia/ui';

  import { canCreateAsset, targetAssetFolder } from '$lib/services/assets/folders';
  import { showUploadAssetsDialog, uploadDialogAccept } from '$lib/services/assets/view';
  import { openAuthoring } from '$lib/services/workflow/open-authoring';

  /**
   * @typedef {object} Props
   * @property {string} [label] Button label. If `undefined`, the button will be iconic.
   * @property {string} [accept] `accept` override for the file picker, e.g. `image/*` to make
   * mobile platforms offer the gallery picker.
   * @property {string} [icon] Icon name.
   * @property {string} [ariaLabelKey] I18n key for the accessible label.
   */

  /** @type {Props} */
  let {
    /* eslint-disable prefer-const */
    label = undefined,
    accept = undefined,
    icon = 'cloud_upload',
    ariaLabelKey = 'upload_assets',
    /* eslint-enable prefer-const */
  } = $props();

  // Uploading to the media library commits straight to the configured branch rather than going
  // through review, so it’s not something an Open Authoring contributor can do. An asset attached
  // to an entry is committed with that entry, so it’s unaffected
  const disabled = $derived($openAuthoring || !canCreateAsset($targetAssetFolder));
</script>

<Button
  variant="primary"
  iconic={!label}
  {disabled}
  {label}
  aria-label={_(ariaLabelKey)}
  onclick={() => {
    $uploadDialogAccept = accept;
    $showUploadAssetsDialog = true;
  }}
>
  {#snippet startIcon()}
    <Icon {icon} />
  {/snippet}
</Button>
