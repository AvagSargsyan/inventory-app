import { useEffect, useState } from "react";

// Runs `fetcher` once per mount and reports { status, data, error }.
//
// Deliberately has no dependency array: a caller whose request depends on a
// changing value remounts with a `key` instead. That resets the state to
// loading for free, rather than setting it synchronously in an effect and
// briefly showing the previous page's data under the new URL.
export function useApi(fetcher) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    // StrictMode runs effects twice in development, and a slow response can
    // arrive after unmount either way.
    let ignore = false;
    fetcher().then(
      (data) => !ignore && setState({ status: "ready", data }),
      (error) => !ignore && setState({ status: "error", error }),
    );
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
