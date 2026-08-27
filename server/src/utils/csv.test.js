import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv.js';

test('toCsv escapes values that spreadsheet apps could execute as formulas', () => {
  const csv = toCsv(
    [
      { name: '=IMPORTXML("https://example.com")' },
      { name: '+SUM(1,2)' },
      { name: '-10+20' },
      { name: '@HYPERLINK("https://example.com")' }
    ],
    [{ key: 'name', label: 'Nome' }]
  );

  assert.match(csv, /'=IMPORTXML/);
  assert.match(csv, /"'\+SUM\(1,2\)"/);
  assert.match(csv, /'-10\+20/);
  assert.match(csv, /'@HYPERLINK/);
});
