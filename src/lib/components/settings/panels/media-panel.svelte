<script>
  import { _ } from '@sveltia/i18n';
  import { SelectButton, SelectButtonGroup } from '@sveltia/ui';

  import ApiKeyInput from '$lib/components/settings/controls/api-key-input.svelte';
  import { allCloudStorageServices } from '$lib/services/integrations/media-libraries/cloud';
  import {
    allStockAssetProviders,
    getStockAssetMediaLibraryOptions,
  } from '$lib/services/integrations/media-libraries/stock';
  import { AUTO_PREF_VALUE, prefs } from '$lib/services/user/prefs.svelte';
  import { makeLink } from '$lib/services/utils/string';

  /**
   * @import { MediaLibraryService, SettingsPanelOnChangeArgs } from '$lib/types/private';
   * @import { StockAssetProviderName } from '$lib/types/public';
   */

  /**
   * @typedef {object} Props
   * @property {(detail: SettingsPanelOnChangeArgs) => void} [onChange] `change` event handler.
   */

  /** @type {Props} */
  let {
    /* eslint-disable prefer-const */
    onChange = undefined,
    /* eslint-enable prefer-const */
  } = $props();

  /** Upload quality tiers; `AUTO_PREF_VALUE` follows the site configuration. */
  const qualityTiers = [AUTO_PREF_VALUE, 70, 60, 50];

  const enabledStockAssetProviderEntries = $derived.by(() => {
    const { providers = [] } = getStockAssetMediaLibraryOptions();

    return /** @type {[StockAssetProviderName, MediaLibraryService][]} */ (
      Object.entries(allStockAssetProviders)
    ).filter(([serviceId, { authType }]) => providers.includes(serviceId) && authType !== 'none');
  });

  const enabledCloudServiceEntries = $derived(
    Object.entries(allCloudStorageServices).filter(
      ([, { isEnabled, authType }]) => (isEnabled?.() ?? true) && authType !== 'widget',
    ),
  );
</script>

<section>
  <h3>{_('prefs.media.image_compression.title')}</h3>
  <p>{_('prefs.media.image_compression.description')}</p>
  <div role="none">
    <SelectButtonGroup
      aria-label={_('prefs.media.image_compression.title')}
      onChange={(event) => {
        const { value } = event.detail;

        prefs.imageQuality = value === AUTO_PREF_VALUE ? undefined : value;
      }}
    >
      {#each qualityTiers as value (value)}
        <SelectButton
          variant="tertiary"
          label={
            value === AUTO_PREF_VALUE
              ? _('automatic')
              : _(`prefs.media.image_compression.quality_${value}`)
          }
          {value}
          selected={
            value === AUTO_PREF_VALUE
              ? prefs.imageQuality === undefined
              : prefs.imageQuality === value
          }
        />
      {/each}
    </SelectButtonGroup>
  </div>
</section>
<section>
  <h3>{_('prefs.media.cloud_storage.api_keys.title')}</h3>
  <p>
    {@html makeLink(
      enabledCloudServiceEntries.length
        ? _('prefs.media.cloud_storage.api_keys.description')
        : _('prefs.media.cloud_storage.no_services'),
      'https://sveltiacms.app/en/docs/media',
    )}
  </p>
  {#each enabledCloudServiceEntries as [serviceId, service] (serviceId)}
    {@const label = service.serviceLabel}
    <section>
      <h4>{label}</h4>
      <div role="none">
        <ApiKeyInput
          {serviceId}
          {service}
          ariaLabel={_('prefs.media.cloud_storage.field_label', { values: { service: label } })}
          {onChange}
        />
      </div>
    </section>
  {/each}
</section>
<section>
  <h3>{_('prefs.media.stock_photos.api_keys.title')}</h3>
  <p>
    {@html makeLink(
      enabledStockAssetProviderEntries.length
        ? _('prefs.media.stock_photos.api_keys.description')
        : _('prefs.media.stock_photos.no_services'),
      'https://sveltiacms.app/en/docs/integrations/stock-photos',
    )}
  </p>
  {#each enabledStockAssetProviderEntries as [serviceId, service] (serviceId)}
    {@const label = service.serviceLabel}
    <section>
      <h4>{label}</h4>
      <div role="none">
        <ApiKeyInput
          {serviceId}
          {service}
          ariaLabel={_('prefs.media.stock_photos.field_label', { values: { service: label } })}
          {onChange}
        />
      </div>
    </section>
  {/each}
</section>
