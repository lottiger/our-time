export interface Child { id: string; name: string; color?: string }
export interface Task { id: string; title: string; icon: string; estimatedMs: number }
export interface Routine { id: string; name: string; deadlineTime: string; tasks: Task[] }
export interface Configuration { children: Child[]; routine: Routine }
export interface ChildState {
  childId: string;
  completedTaskIds: string[];
  spentMs: Record<string, number>;
  activeTask: { taskId: string; startedAt: number } | null;
}
export interface Session {
  startedAt: number;
  deadlineAt: number;
  configuration: Configuration;
  childStates: ChildState[];
  freeTimeStartedAt: number | null;
}
export interface SavedState { version: 1; configuration: Configuration; session: Session | null }

// Zero means the family has not supplied an estimate yet; no suggested durations.
export function initialState(): SavedState {
  return { version: 1, session: null, configuration: {
    children: [{ id: 'child-1', name: '', color: 'blue' }],
    routine: { id: 'morning', name: 'Morning', deadlineTime: '08:00', tasks: [
      { id: 'dress', title: 'Get dressed', icon: '👕', estimatedMs: 0 },
      { id: 'teeth', title: 'Brush teeth', icon: '🪥', estimatedMs: 0 },
      { id: 'toilet', title: 'Go pee', icon: '🚽', estimatedMs: 0 },
      { id: 'breakfast', title: 'Eat breakfast', icon: '🥣', estimatedMs: 0 },
      { id: 'hair', title: 'Brush hair', icon: 'comb', estimatedMs: 0 },
    ] },
  } };
}
