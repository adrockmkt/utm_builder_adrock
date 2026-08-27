import test from 'node:test';
import assert from 'node:assert/strict';

import { getBulkImportRowStatusView, getBulkImportTutorialSteps, getBulkValidationStatusMessage } from './bulkImportUi.js';

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

test('bulk import warning status asks for careful validation in red', () => {
  const view = getBulkImportRowStatusView('warning');

  assert.equal(view.label, 'Valide com atenção');
  assert.equal(view.tone, 'red');
});

test('bulk import error status is highlighted in red', () => {
  const view = getBulkImportRowStatusView('error');

  assert.equal(view.label, 'Erro');
  assert.equal(view.tone, 'red');
});

test('bulk validation message asks attention when warnings exist', () => {
  const message = getBulkValidationStatusMessage({ canSave: true, warningRows: 2 });

  assert.equal(message, 'Valide com atenção: há avisos na prévia antes de salvar o lote.');
});
