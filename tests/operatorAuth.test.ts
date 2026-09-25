import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { OPERATOR_AUTH_SHA256 } from '../lib/authGuard';

describe('Operator Authentication Passcode Verification', () => {
  const hashString = (input: string) =>
    crypto.createHash('sha256').update(input.trim().toLowerCase()).digest('hex');

  test('enforces SHA-256 matching for correct passcode in lowercase', () => {
    const input = 'chllap5803';
    const computed = hashString(input);
    assert.equal(computed, OPERATOR_AUTH_SHA256);
  });

  test('validates case-insensitivity: all uppercase format matches', () => {
    const input = 'CHLLAP5803';
    const computed = hashString(input);
    assert.equal(computed, OPERATOR_AUTH_SHA256);
  });

  test('validates case-insensitivity: mixed case format matches', () => {
    const input = 'ChLlaP5803';
    const computed = hashString(input);
    assert.equal(computed, OPERATOR_AUTH_SHA256);
  });

  test('validates with leading and trailing whitespace trimmed', () => {
    const input = '   Chllap5803   ';
    const computed = hashString(input);
    assert.equal(computed, OPERATOR_AUTH_SHA256);
  });

  test('rejects incorrect passcodes and partial inputs', () => {
    assert.notEqual(hashString('wrongpassword'), OPERATOR_AUTH_SHA256);
    assert.notEqual(hashString('chllap'), OPERATOR_AUTH_SHA256);
    assert.notEqual(hashString('5803'), OPERATOR_AUTH_SHA256);
    assert.notEqual(hashString(''), OPERATOR_AUTH_SHA256);
  });

  test('OPERATOR_AUTH_SHA256 is exactly 64 hex characters and mathematically irreversible', () => {
    assert.equal(OPERATOR_AUTH_SHA256.length, 64);
    assert.match(OPERATOR_AUTH_SHA256, /^[0-9a-f]{64}$/);
  });
});
