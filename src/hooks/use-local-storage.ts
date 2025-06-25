
'use client';

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // This effect runs once on mount on the client-side to get the value from localStorage.
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.log('Error reading from localStorage', error);
      setStoredValue(initialValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);


  const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
    // This allows value to be a function, matching the useState API.
    setStoredValue(currentValue => {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.log('Error writing to localStorage', error);
        }
        return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
