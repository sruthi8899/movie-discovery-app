import { useEffect, useState } from 'react';

// Delays reflecting a fast-changing value (e.g. every keystroke in the
// search box) until it has stopped changing for `delayMs`. This is the
// frontend half of "avoid unnecessary requests" / "user changes search
// quickly": without it, every keystroke would fire its own network request.
export function useDebounce(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
