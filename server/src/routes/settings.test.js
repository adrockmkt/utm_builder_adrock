import assert from 'node:assert/strict';
import test from 'node:test';

import { toBrandSettings, toPublicBrandSettings } from './settings.js';

test('toPublicBrandSettings omits database-backed image data URLs from anonymous responses', () => {
  assert.deepEqual(toPublicBrandSettings({}), {
    appName: 'Ad Rock UTM Builder',
    topLogoUrl: 'adrock-logo.png',
    topLogoSize: 56,
    funGifUrl: '',
    funGifSize: 128
  });
});

test('toBrandSettings keeps full brand data for authenticated settings', () => {
  const settings = {
    app_name: 'UTM Builder - Seje parametrizador!',
    top_logo_url: 'data:image/png;base64,abc123',
    fun_gif_url: 'data:image/gif;base64,abc123'
  };

  assert.equal(toBrandSettings(settings).topLogoUrl, 'data:image/png;base64,abc123');
  assert.equal(toBrandSettings(settings).funGifUrl, 'data:image/gif;base64,abc123');
});
