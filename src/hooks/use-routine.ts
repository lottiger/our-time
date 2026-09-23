import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { SavedState } from '../domain/models';
import { loadState, saveState } from '../storage/persistence';

export function useRoutine() {
  const [state, setState] = useState<SavedState | null>(null);
  const latest = useRef<SavedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const revision = useRef(0);
  const persist = useCallback((next: SavedState) => {
    const id = ++revision.current;
    void saveState(next).then(() => { if (id === revision.current) setError(null); })
      .catch(() => { if (id === revision.current) setError('Changes could not be saved. Keep the app open and try again.'); });
  }, []);
  const reload = useCallback(() => {
    setError(null);
    void loadState().then(data => { latest.current = data; setState(data); })
      .catch(() => setError('Your saved morning could not be loaded. Please try again.'));
  }, []);
  useEffect(reload, [reload]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    const subscription = AppState.addEventListener('change', status => {
      setNow(Date.now());
      if (status !== 'active' && latest.current) persist(latest.current);
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [persist]);
  const update = useCallback((action: (previous: SavedState) => SavedState) => {
    if (!latest.current) return;
    const next = action(latest.current);
    latest.current = next; setState(next); setNow(Date.now()); persist(next);
  }, [persist]);
  return { state, now, error, update, retry: () => latest.current ? persist(latest.current) : reload() };
}
