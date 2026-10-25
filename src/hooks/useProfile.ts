import { useEffect, useState } from "react";
import {
  fetchEvents,
  fetchRepos,
  fetchUser,
  GitHubError,
  type GHEvent,
  type GHRepo,
  type GHUser,
} from "@/lib/github";

export interface Load<T> {
  status: "idle" | "loading" | "done" | "error";
  data?: T;
  error?: GitHubError;
}

const idle = <T,>(): Load<T> => ({ status: "idle" });
const loading = <T,>(): Load<T> => ({ status: "loading" });

function toError(e: unknown): GitHubError {
  return e instanceof GitHubError ? e : new GitHubError("other", "Something went wrong while talking to GitHub.");
}

/**
 * Loads the profile first (so "user not found" fails fast), then repos and
 * events in parallel — each section renders as soon as its own data arrives.
 * `refreshKey` lets the caller re-run after e.g. adding an access token.
 */
export function useProfile(login: string | null, refreshKey = 0) {
  const [user, setUser] = useState<Load<GHUser>>(idle);
  const [repos, setRepos] = useState<Load<GHRepo[]>>(idle);
  const [events, setEvents] = useState<Load<GHEvent[]>>(idle);

  useEffect(() => {
    if (!login) {
      setUser(idle());
      setRepos(idle());
      setEvents(idle());
      return;
    }

    const ctrl = new AbortController();
    const { signal } = ctrl;
    setUser(loading());
    setRepos(loading());
    setEvents(loading());

    (async () => {
      let u: GHUser;
      try {
        u = await fetchUser(login, signal);
      } catch (e) {
        if (signal.aborted) return;
        const err = toError(e);
        setUser({ status: "error", error: err });
        setRepos(idle());
        setEvents(idle());
        return;
      }
      if (signal.aborted) return;
      setUser({ status: "done", data: u });

      const reposP = fetchRepos(u.login, signal).then(
        (data) => !signal.aborted && setRepos({ status: "done", data }),
        (e) => !signal.aborted && setRepos({ status: "error", error: toError(e) }),
      );
      const eventsP = fetchEvents(u.login, signal).then(
        (data) => !signal.aborted && setEvents({ status: "done", data }),
        (e) => !signal.aborted && setEvents({ status: "error", error: toError(e) }),
      );
      await Promise.all([reposP, eventsP]);
    })();

    return () => ctrl.abort();
  }, [login, refreshKey]);

  return { user, repos, events };
}
