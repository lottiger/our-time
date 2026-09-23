import type { ChildState, Configuration, Session, Task } from './models';

export function taskElapsed(child: ChildState, taskId: string, now: number): number {
  return (child.spentMs[taskId] ?? 0) + (child.activeTask?.taskId === taskId
    ? Math.max(0, now - child.activeTask.startedAt) : 0);
}

/** Each child works serially, but children work in parallel: take MAX, never SUM,
 * of their unfinished work. Each task contributes max(0, estimate - time spent).
 * Switching banks elapsed time and pauses that task, without resetting its estimate.
 * Completed tasks contribute zero. Overdue tasks contribute zero while the fixed
 * deadline keeps approaching, consuming free time live. Idle selection time also
 * consumes time. Early completion releases unused estimated work only insofar as
 * it reduces the family's longest remaining workload. Ticks only repaint the UI;
 * persisted absolute timestamps remain authoritative after suspension/reopening.
 */
export function remainingWork(child: ChildState, tasks: Task[], now: number): number {
  return tasks.reduce((sum, task) => sum + (child.completedTaskIds.includes(task.id)
    ? 0 : Math.max(0, task.estimatedMs - taskElapsed(child, task.id, now))), 0);
}
export function calculate(session: Session, now: number) {
  const tasks = session.configuration.routine.tasks;
  const requiredMs = Math.max(0, ...session.childStates.map(child => remainingWork(child, tasks, now)));
  const untilDeadlineMs = Math.max(0, session.deadlineAt - now);
  return { requiredMs, untilDeadlineMs, ourTimeMs: Math.max(0, untilDeadlineMs - requiredMs),
    allReady: session.childStates.every(child => tasks.every(task => child.completedTaskIds.includes(task.id))),
    departureReached: now >= session.deadlineAt };
}
export function deadlineToday(time: string, now: number): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}
export function startSession(configuration: Configuration, now: number): Session {
  const deadlineAt = deadlineToday(configuration.routine.deadlineTime, now);
  if (deadlineAt === null || deadlineAt <= now) throw new Error('Choose a departure time later today.');
  if (configuration.children.length < 1 || configuration.children.length > 4) {
    throw new Error('Choose between one and four children.');
  }
  if (configuration.children.some(c => !c.name.trim()) || configuration.routine.tasks.some(t => t.estimatedMs <= 0)) {
    throw new Error('Add a name for each child and an estimate for every task.');
  }
  return { startedAt: now, deadlineAt, configuration: JSON.parse(JSON.stringify(configuration)),
    freeTimeStartedAt: null, childStates: configuration.children.map(child => ({
      childId: child.id, completedTaskIds: [], spentMs: {}, activeTask: null,
    })) };
}
export function changeTask(session: Session, childId: string, taskId: string | null, now: number): Session {
  return { ...session, childStates: session.childStates.map(child => {
    if (child.childId !== childId || child.activeTask?.taskId === taskId) return child;
    if (taskId && (!session.configuration.routine.tasks.some(t => t.id === taskId) || child.completedTaskIds.includes(taskId))) return child;
    const spentMs = { ...child.spentMs };
    if (child.activeTask) spentMs[child.activeTask.taskId] = taskElapsed(child, child.activeTask.taskId, now);
    return { ...child, spentMs, activeTask: taskId ? { taskId, startedAt: now } : null };
  }) };
}
export function completeTask(session: Session, childId: string, now: number): Session {
  const taskId = session.childStates.find(c => c.childId === childId)?.activeTask?.taskId;
  if (!taskId) return session;
  const paused = changeTask(session, childId, null, now);
  return { ...paused, childStates: paused.childStates.map(child => child.childId === childId
    ? { ...child, completedTaskIds: [...child.completedTaskIds, taskId] } : child) };
}
export function reopenTask(session: Session, childId: string, taskId: string): Session {
  return { ...session, childStates: session.childStates.map(child => child.childId === childId
    ? { ...child, completedTaskIds: child.completedTaskIds.filter(id => id !== taskId) } : child) };
}
export function formatTime(ms: number): string {
  return `${Math.ceil(Math.max(0, ms) / 60000)} min`;
}
