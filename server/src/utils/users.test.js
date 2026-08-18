import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidUserRole } from './users.js';

test('isValidUserRole accepts only supported access profiles', () => {
  assert.equal(isValidUserRole('admin'), true);
  assert.equal(isValidUserRole('editor'), true);
  assert.equal(isValidUserRole('viewer'), true);
  assert.equal(isValidUserRole('owner'), false);
  assert.equal(isValidUserRole(''), false);
  assert.equal(isValidUserRole(undefined), false);
});

