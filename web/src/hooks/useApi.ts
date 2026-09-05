import { useEffect, useState } from "react";

export type AsyncState<T> =
  { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: unknown };

// Runs `fetcher` once per mount and reports { status, data, error }.
//
// Deliberately has no dependency array: a caller whose request depends on a
// changing value remounts with a `key` instead. That resets the state to
// loading for free, rather than setting it synchronously in an effect and
// briefly showing the previous page's data under the new URL.
export function useApi<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });

  useEffect(() => {
    // StrictMode runs effects twice in development, and a slow response can
    // arrive after unmount either way.
    let ignore = false;
    fetcher().then(
      (data) => !ignore && setState({ status: "ready", data }),
      (error: unknown) => !ignore && setState({ status: "error", error }),
    );
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
