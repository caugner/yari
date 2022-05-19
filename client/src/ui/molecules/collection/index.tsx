// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module 'swr'. Did you mean to set the ... Remove this comment to see the full error message
import useSWR from "swr";
import { Doc } from "../../../document/types";
// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../../plus/collections'. Di... Remove this comment to see the full error message
import { BookmarkData } from "../../../plus/collections";
import { BookmarkMenu } from "./menu";

export interface BookmarkedData {
  bookmarked: BookmarkData;
  csrfmiddlewaretoken: string;
  subscription_limit_reached: boolean;
}

export function BookmarkContainer({ doc }: { doc: Doc }) {
  const apiURL = `/api/v1/plus/collection/?${new URLSearchParams({
    url: doc.mdn_url,
  }).toString()}`;
  const { data, isValidating, mutate } = useSWR<BookmarkedData>(
    apiURL,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status} on ${url}: ${text}`);
      }
      const data = await response.json();
      return data;
    }
  );

  return BookmarkMenu({ doc, data, isValidating, mutate });
}
