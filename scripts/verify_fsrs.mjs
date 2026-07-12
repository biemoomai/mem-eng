import assert from 'node:assert/strict';
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['10m'],
  relearning_steps: ['10m'],
});
const now = new Date('2026-07-11T00:00:00.000Z');
const card = createEmptyCard(now);
const next = (rating) => scheduler.next(card, now, rating).card;
const again = next(Rating.Again);
const hard = next(Rating.Hard);
const normal = next(Rating.Good);
const easy = next(Rating.Easy);

assert.equal(again.state, State.Learning, 'Again keeps a new card in learning.');
assert.equal(hard.state, State.Learning, 'Hard keeps a new card in learning.');
assert.equal(normal.state, State.Review, 'Normal graduates a new card to review.');
assert.equal(easy.state, State.Review, 'Easy graduates a new card to review.');
assert(again.due < hard.due, 'Again must be sooner than Hard.');
assert(hard.due < normal.due, 'Hard must be sooner than Normal.');
assert(normal.due < easy.due, 'Normal must be sooner than Easy.');

const reviewed = scheduler.next(normal, normal.due, Rating.Good).card;
assert.equal(reviewed.reps, 2, 'A second review increments FSRS repetitions.');
assert.equal(reviewed.state, State.Review, 'A successful mature review stays in review.');
assert(reviewed.due > normal.due, 'A successful mature review schedules in the future.');
assert(reviewed.stability > normal.stability, 'A successful mature review grows stability.');

console.log('FSRS verification passed:', {
  again: again.due.toISOString(),
  hard: hard.due.toISOString(),
  normal: normal.due.toISOString(),
  easy: easy.due.toISOString(),
  nextNormal: reviewed.due.toISOString(),
});
