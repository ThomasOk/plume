import { useSyncExternalStore } from 'react';
import { isSoundEnabled, setSoundEnabled, subscribeToSoundPreference } from '@/lib/sounds';

export const useSoundPreference = () => {
  const enabled = useSyncExternalStore(subscribeToSoundPreference, isSoundEnabled);
  return { enabled, setEnabled: setSoundEnabled };
};
