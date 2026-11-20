import { useEffect, useReducer, useRef } from 'react';
import {
  type DraftAction,
  draftReducer,
  emptyDraft,
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
    const restored = readOnboardingDraft();
    current.current = restored;
    dispatch({ type: 'restore', draft: restored });
    hydrated.current = true;
    markReady();
  }, []);

  function update(action: Exclude<DraftAction, { type: 'restore' }>) {
    if (!hydrated.current) {
      return;
    }
    const next = draftReducer(current.current, action);
    if (next === current.current) {
      return;
    }
    current.current = next;
    dispatch(action);
    saveOnboardingDraft(next);
  }

  return { draft, getCurrent: () => current.current, ready, update };
}
