import { useContext, useEffect } from "react";
import { useLocale } from "../../hooks";
// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../ui/atoms/container'. Did... Remove this comment to see the full error message
import Container from "../../ui/atoms/container";
// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../ui/molecules/tabs'. Did ... Remove this comment to see the full error message
import Tabs from "../../ui/molecules/tabs";

import {
  searchFiltersContext,
  SearchFiltersProvider,
} from "../contexts/search-filters";
import "./index.scss";

import { useUserData } from "../../user-context";
import { TabVariant, TAB_INFO, useCurrentTab } from "../common/tabs";
import { PlusTabs } from "../common/plus-tabs";
// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../common'. Did you mean to se... Remove this comment to see the full error message
import { NotSignedIn } from "../common";

function NotificationsLayout() {
  const locale = useLocale();
  const userData = useUserData();

  const {
    selectedTerms,
    selectedFilter,
    selectedSort,
    setSelectedTerms,
    setSelectedSort,
    setSelectedFilter,
  } = useContext(searchFiltersContext);

  const currentTab = useCurrentTab(locale);

  useEffect(() => {
    setSelectedTerms("");
    setSelectedSort("");
    setSelectedFilter("");
  }, [currentTab, setSelectedTerms, setSelectedSort, setSelectedFilter]);

  const showTabs = userData && userData.isAuthenticated;
  const isAuthed = userData?.isAuthenticated;

  const tabsForRoute = [
    TAB_INFO[TabVariant.NOTIFICATIONS],
    TAB_INFO[TabVariant.STARRED],
    TAB_INFO[TabVariant.WATCHING],
  ].map((val) => {
    return { ...val, path: `/${locale}${val?.path}` };
  });

  return (
    <>
      <header className="plus-header">
        <Container>
          <h1>Notifications</h1>
        </Container>
        <Tabs tabs={tabsForRoute} />
      </header>
      {showTabs && (
        <Container>
          <>
            <PlusTabs
              currentTab={currentTab}
              selectedTerms={selectedTerms}
              selectedFilter={selectedFilter}
              selectedSort={selectedSort}
            />
          </>
        </Container>
      )}
      {!userData && !isAuthed && <NotSignedIn />}
    </>
  );
}

export default function Notifications() {
  return (
    <SearchFiltersProvider>
      <NotificationsLayout />
    </SearchFiltersProvider>
  );
}
