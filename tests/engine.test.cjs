const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initialState } = require('../.test-build/models.js');
const { calculate, changeTask, completeTask, reopenTask, taskElapsed, startSession, deadlineToday } = require('../.test-build/engine.js');
const M = 60000;
function fixture() {
  const configuration = initialState().configuration;
  configuration.children = [{ id: 'child-1', name: '' }, { id: 'child-2', name: '' }];
  configuration.children.forEach((c, i) => c.name = `Child ${i}`);
  configuration.routine.tasks = configuration.routine.tasks.slice(0, 2).map(t => ({ ...t, estimatedMs: 8 * M }));
  return { startedAt: 0, deadlineAt: 50 * M, configuration, freeTimeStartedAt: null,
    childStates: configuration.children.map(c => ({ childId: c.id, completedTaskIds: [], spentMs: {}, activeTask: null })) };
}
test('equal work is parallel, not added together', () => assert.equal(calculate(fixture(), 0).ourTimeMs, 34 * M));
test('setup starts with one child and sessions support one through four children', () => {
  assert.equal(initialState().configuration.children.length, 1);
  const now = new Date(2026, 8, 8, 7).getTime();
  for (const count of [1, 2, 3, 4]) {
    const configuration = fixture().configuration;
    configuration.children = Array.from({ length: count }, (_, i) => ({ id: `child-${i + 1}`, name: `Child ${i + 1}`, color: 'blue' }));
    const session = startSession(configuration, now);
    assert.equal(session.childStates.length, count);
    assert.equal(session.configuration.children[0].color, 'blue');
    assert.equal(calculate(session, now).requiredMs, 16 * M);
  }
  for (const count of [0, 5]) {
    const configuration = fixture().configuration;
    configuration.children = Array.from({ length: count }, (_, i) => ({ id: `${i}`, name: 'Child' }));
    assert.throws(() => startSession(configuration, now), /one and four/);
  }
});
test('child with more unfinished work determines family estimate', () => {
  const s = fixture(); s.childStates[0].completedTaskIds = ['dress'];
  assert.equal(calculate(s, 0).requiredMs, 16 * M);
});
test('different task orders and independent simultaneous tasks', () => {
  let s = changeTask(fixture(), 'child-1', 'teeth', 0);
  s = changeTask(s, 'child-2', 'dress', 0);
  s = completeTask(s, 'child-1', 5 * M);
  assert.equal(s.childStates[1].activeTask.taskId, 'dress');
  s = completeTask(s, 'child-2', 5 * M);
  assert.equal(calculate(s, 5 * M).requiredMs, 8 * M);
});
test('early completion releases unused estimate when it reduces maximum work', () => {
  let s = changeTask(fixture(), 'child-1', 'dress', 0);
  s.childStates[1].completedTaskIds = ['dress'];
  const before = calculate(s, 5 * M).ourTimeMs;
  s = completeTask(s, 'child-1', 5 * M);
  assert.equal(calculate(s, 5 * M).ourTimeMs - before, 3 * M);
});
test('overdue active tasks consume OUR TIME live', () => {
  let s = changeTask(fixture(), 'child-1', 'dress', 0);
  s = changeTask(s, 'child-2', 'dress', 0);
  assert.equal(calculate(s, 9 * M).ourTimeMs, calculate(s, 8 * M).ourTimeMs - M);
});
test('one child ready leaves only the other workload', () => {
  const s = fixture(); s.childStates[0].completedTaskIds = ['dress', 'teeth'];
  assert.equal(calculate(s, 0).requiredMs, 16 * M);
  assert.equal(calculate(s, 0).allReady, false);
});
test('everyone ready makes all remaining time OUR TIME', () => {
  const s = fixture(); s.childStates.forEach(c => c.completedTaskIds = ['dress', 'teeth']);
  assert.equal(calculate(s, 10 * M).ourTimeMs, 40 * M);
  assert.equal(calculate(s, 10 * M).allReady, true);
});
test('free time clamps at zero before departure', () => assert.equal(calculate(fixture(), 40 * M).ourTimeMs, 0));
test('deadline reached and passed never displays negative values', () => {
  for (const now of [50 * M, 60 * M]) {
    const result = calculate(fixture(), now);
    assert.equal(result.ourTimeMs, 0); assert.equal(result.untilDeadlineMs, 0);
    assert.equal(result.departureReached, true);
  }
});
test('absolute timestamps survive backgrounding and JSON restoration without ticks', () => {
  const s = changeTask(fixture(), 'child-1', 'dress', M);
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(taskElapsed(restored.childStates[0], 'dress', 6 * M), 5 * M);
  assert.deepEqual(calculate(restored, 20 * M), calculate(s, 20 * M));
});
test('switching banks work and only selected task continues accumulating time', () => {
  let s = changeTask(fixture(), 'child-1', 'dress', 0);
  s = changeTask(s, 'child-1', null, 3 * M);
  s = changeTask(s, 'child-1', 'teeth', 4 * M);
  s = changeTask(s, 'child-1', 'dress', 6 * M);
  assert.equal(taskElapsed(s.childStates[0], 'dress', 7 * M), 4 * M);
  assert.equal(taskElapsed(s.childStates[0], 'teeth', 7 * M), 2 * M);
  assert.equal(s.deadlineAt, 50 * M);
});
test('completed task cannot restart and repeated completion is harmless', () => {
  let s = changeTask(fixture(), 'child-1', 'dress', 0);
  s = completeTask(s, 'child-1', M);
  assert.deepEqual(completeTask(s, 'child-1', M), s);
  assert.deepEqual(changeTask(s, 'child-1', 'dress', M), s);
});
test('deadline is explicitly today, never silently moved to tomorrow', () => {
  const now = new Date(2026, 8, 8, 9).getTime();
  assert.ok(deadlineToday('08:00', now) < now);
  assert.equal(deadlineToday('24:00', now), null);
  assert.throws(() => startSession(fixture().configuration, now), /later today/);
});

test('reopening after everyone is ready restores remaining work and preserves spent time', () => {
  const s = fixture();
  s.childStates.forEach(c => c.completedTaskIds = ['dress', 'teeth']);
  s.childStates[0].spentMs.dress = 3 * M;
  const reopened = reopenTask(s, 'child-1', 'dress');
  assert.equal(calculate(reopened, 10 * M).allReady, false);
  assert.equal(calculate(reopened, 10 * M).ourTimeMs, 35 * M);
  assert.equal(reopened.deadlineAt, s.deadlineAt);
  assert.equal(taskElapsed(reopened.childStates[0], 'dress', 10 * M), 3 * M);
  assert.deepEqual(s.childStates[0].completedTaskIds, ['dress', 'teeth']);
  assert.equal(reopened.childStates[1], s.childStates[1]);
  const resumed = changeTask(reopened, 'child-1', 'dress', 10 * M);
  assert.equal(taskElapsed(resumed.childStates[0], 'dress', 11 * M), 4 * M);
});

test('reopening preserves another active task and is safe to repeat', () => {
  let s = changeTask(fixture(), 'child-1', 'dress', 0);
  s = completeTask(s, 'child-1', M);
  s = changeTask(s, 'child-1', 'teeth', 2 * M);
  const reopened = reopenTask(s, 'child-1', 'dress');
  assert.deepEqual(reopened.childStates[0].activeTask, s.childStates[0].activeTask);
  assert.equal(taskElapsed(reopened.childStates[0], 'teeth', 4 * M), 2 * M);
  assert.deepEqual(reopenTask(reopened, 'child-1', 'dress'), reopened);
});
