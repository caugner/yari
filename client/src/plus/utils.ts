import { useLocation } from "react-router-dom";
import { useLocale } from "../hooks";
import { SWRResponse } from "swr";

/**
 * Returns the URL of the Plus product page, or, if we're
 * already there, the hash of the "Choose a plan" section.
 */
export function usePlusUrl(): string {
  const { pathname } = useLocation();
  const locale = useLocale();

  function normalizedUrl(url: string): string {
    return url.replace(/\/$/, "").toLowerCase();
  }

  let target = `/${locale}/plus`;

  if (normalizedUrl(target) === normalizedUrl(pathname)) {
    target = "#subscribe";
  }

  return target;
}

export function useLoading<T>(res: SWRResponse<T>) {
  return {
    ...res,
    isLoading: res.isValidating && !res.data && !res.error,
  };
}
