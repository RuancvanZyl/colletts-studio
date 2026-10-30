import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappLink, TOPIC_LABEL } from '../src/lib/threadTopics.ts';

test('a South African number becomes an international WhatsApp link', () => {
  assert.equal(whatsappLink('072 101 8463', 'Hi'), 'https://wa.me/27721018463?text=Hi');
  assert.equal(whatsappLink('+27 72 101 8463', 'Hi'), 'https://wa.me/27721018463?text=Hi');
  assert.equal(whatsappLink('0027721018463', 'Hi'), 'https://wa.me/27721018463?text=Hi');
});
test('no number, no link', () => {
  assert.equal(whatsappLink('', 'Hi'), null);
  assert.equal(whatsappLink(null, 'Hi'), null);
  assert.equal(whatsappLink('12', 'Hi'), null);
});
test('topics have plain names', () => {
  assert.equal(TOPIC_LABEL.quote, 'Quote and payment');
});
