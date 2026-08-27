import test from 'node:test';
import assert from 'node:assert/strict';

import { getBulkImportTutorialSteps } from './bulkImportUi.js';

test('bulk import tutorial starts after campaign is selected or created', () => {
  const steps = getBulkImportTutorialSteps();

  assert.deepEqual(steps.map((step) => step.title), ['1. Modelo', '2. Upload']);
  assert.equal(steps.some((step) => step.title.includes('Campanha')), false);
});

test('bulk import upload step encourages upload after campaign selection', () => {
  const steps = getBulkImportTutorialSteps({ hasSelectedCampaign: true });
  const uploadStep = steps.find((step) => step.action === 'upload');

  assert.equal(uploadStep?.highlight, true);
  assert.equal(uploadStep?.readyMessage, '🙂 Beleza, siga com a subida do arquivo.');
});
