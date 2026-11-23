import test from 'node:test';
import assert from 'node:assert/strict';
import { earnsFullMarkBonus, adjustPointsSchema } from './points.js';
import { homeFor } from './roles.js';

const due = new Date('2026-12-01T23:59:00Z');
test('full mark on time earns bonus', () => assert.equal(earnsFullMarkBonus(100, new Date('2026-11-30T10:00:00Z'), due), true));
test('full mark exactly at deadline earns bonus', () => assert.equal(earnsFullMarkBonus(100, due, due), true));
test('late full mark does not', () => assert.equal(earnsFullMarkBonus(100, new Date('2026-12-02T00:00:00Z'), due), false));
test('90% on time does not', () => assert.equal(earnsFullMarkBonus(90, new Date('2026-11-30T10:00:00Z'), due), false));
test('adjustment needs a reason and non-zero delta', () => {
  const id = '7b0c1e2a-0a6c-4f3a-9d57-0c2f4a7e5b11';
  assert.equal(adjustPointsSchema.safeParse({ studentId: id, delta: 0, reason: 'abc' }).success, false);
  assert.equal(adjustPointsSchema.safeParse({ studentId: id, delta: 5, reason: '' }).success, false);
  assert.equal(adjustPointsSchema.safeParse({ studentId: id, delta: -5, reason: 'duplicate award' }).success, true);
});
test('role homes', () => { assert.equal(homeFor('student'), '/learn'); assert.equal(homeFor('super_admin'), '/platform'); });
