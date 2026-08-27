import test from 'node:test';
import assert from 'node:assert/strict';

import { getBulkImportTutorialSteps } from './bulkImportUi.js';

test('bulk import tutorial starts after campaign is selected or created', () => {
  const steps = getBulkImportTutorialSteps();

  assert.deepEqual(steps.map((step) => step.title), ['1. Modelo', '2. Upload']);
  assert.equal(steps.some((step) => step.title.includes('Campanha')), false);
});
