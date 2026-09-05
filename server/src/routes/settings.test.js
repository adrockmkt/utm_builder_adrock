import assert from 'node:assert/strict';
import test from 'node:test';

import { toBrandSettings } from './settings.js';

test('toBrandSettings keeps full brand data for authenticated settings', () => {
  const settings = {
    app_name: 'UTM Builder - Seje parametrizador!',
    top_logo_url: 'data:image/png;base64,abc123',
    fun_gif_url: 'data:image/gif;base64,abc123'
  };

  assert.equal(toBrandSettings(settings).topLogoUrl, 'data:image/png;base64,abc123');
  assert.equal(toBrandSettings(settings).funGifUrl, 'data:image/gif;base64,abc123');
});
