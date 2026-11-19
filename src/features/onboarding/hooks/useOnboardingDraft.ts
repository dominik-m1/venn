import { useEffect, useReducer, useRef } from 'react';
import {
  draftReducer,
  emptyDraft,
  type DraftAction,
} from '@/features/onboarding/model/onboarding-flow';
import {
  readOnboardingDraft,
  saveOnboardingDraft,
} from '@/features/onboarding/storage/onboarding-storage';

export function useOnboardingDraft() {
  const [draft, dispatch] = useReducer(draftReducer, emptyDraft);
  const [ready, markReady] = useReducer(() => true, false);
  const current = useRef(emptyDraft);
  const hydrated = useRef(false);

  useEffect(() => {
    // Read only after hydration, before any write (including in Strict Mode).
    const restored = readOnboardingDraft();
    current.current = restored;
    dispatch({ type: 'restore', draft: restored });
    hydrated.current = true;
    markReady();
  }, []);

  function update(action: Exclude<DraftAction, { type: 'restore' }>) {
    if (!hydrated.current) return;
    const next = draftReducer(current.current, action);
    if (next === current.current) return;
    current.current = next;
    dispatch(action);
    // Save in the event itself, so an immediate reload cannot lose the edit.
    saveOnboardingDraft(next);
  }

  return { draft, getCurrent: () => current.current, ready, update };
}
