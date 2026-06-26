import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@tischtennis_player_names_v1';
const MAX_NAMES = 300;

export function usePlayerNames() {
  const [knownNames, setKnownNames] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) setKnownNames(JSON.parse(data));
    });
  }, []);

  const saveNames = useCallback(async (names: string[]) => {
    const trimmed = names.map(n => n.trim()).filter(Boolean);
    if (!trimmed.length) return;
    setKnownNames(prev => {
      const merged = Array.from(new Set([...trimmed, ...prev])).slice(0, MAX_NAMES);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const getSuggestions = useCallback((query: string, skip: string[] = []): string[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return knownNames
      .filter(n => n.toLowerCase().startsWith(q) && !skip.includes(n))
      .slice(0, 6);
  }, [knownNames]);

  return { saveNames, getSuggestions };
}
