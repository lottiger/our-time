import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialState, type SavedState } from '../domain/models';

const KEY = 'our-time:v1';

export async function loadState(): Promise<SavedState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return initialState();
  const data = JSON.parse(raw);
  // Refuse unknown/corrupt data rather than silently overwriting an active morning.
  const validConfiguration = (c: any) => c && Array.isArray(c.children) && c.children.length > 0 &&
    c.children.every((child: any) => typeof child.id === 'string' && typeof child.name === 'string') &&
    c.routine && typeof c.routine.deadlineTime === 'string' && Array.isArray(c.routine.tasks) &&
    c.routine.tasks.length > 0 && c.routine.tasks.every((t: any) => typeof t.id === 'string' &&
      typeof t.title === 'string' && typeof t.icon === 'string' && Number.isFinite(t.estimatedMs) && t.estimatedMs >= 0);
  if (data.version !== 1 || !validConfiguration(data.configuration) ||
    (data.session !== null && (!data.session || !validConfiguration(data.session.configuration) ||
      !Number.isFinite(data.session.deadlineAt) || !Number.isFinite(data.session.startedAt) ||
      !Array.isArray(data.session.childStates) ||
      data.session.childStates.length !== data.session.configuration.children.length ||
      !data.session.childStates.every((c: any) => typeof c.childId === 'string' &&
        Array.isArray(c.completedTaskIds) && c.completedTaskIds.every((id: any) => typeof id === 'string') &&
        c.spentMs && Object.values(c.spentMs).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0) &&
        (c.activeTask === null || (typeof c.activeTask?.taskId === 'string' && Number.isFinite(c.activeTask.startedAt))))))) {
    throw new Error('Saved morning could not be read.');
  }
  return data as SavedState;
}

// Serialize writes: a slow earlier save must never replace a newer task selection.
let pending: Promise<void> = Promise.resolve();
export function saveState(state: SavedState): Promise<void> {
  const json = JSON.stringify(state);
  pending = pending.catch(() => {}).then(() => AsyncStorage.setItem(KEY, json));
  return pending;
}
