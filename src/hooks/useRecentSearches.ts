import { useCallback, useState } from "react";

const KEY = "gh-recent";
const MAX = 8;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>(read);

  const add = useCallback((login: string) => {
    setRecent((prev) => {
      const next = [login, ...prev.filter((x) => x.toLowerCase() !== login.toLowerCase())].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((login: string) => {
    setRecent((prev) => {
      const next = prev.filter((x) => x !== login);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setRecent([]);
  }, []);

  return { recent, add, remove, clear };
}
