// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../atoms/button'. Did you m... Remove this comment to see the full error message
import { Button } from "../../atoms/button";
// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../molecules/notifications-... Remove this comment to see the full error message
import { NotificationsWatchMenu } from "../../molecules/notifications-watch-menu";
// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../molecules/language-menu'... Remove this comment to see the full error message
import { LanguageMenu } from "../../molecules/language-menu";

import { useUserData } from "../../../user-context";

import { Doc } from "../../../document/types";

import "./index.scss";

// @ts-expect-error ts-migrate(2792) FIXME: Cannot find module '../../molecules/collection'. D... Remove this comment to see the full error message
import { BookmarkContainer } from "../../molecules/collection";

export const ArticleActions = ({
  doc,
  showArticleActionsMenu,
  setShowArticleActionsMenu,
}: {
  doc: Doc;
  showArticleActionsMenu: boolean;
  setShowArticleActionsMenu: (show: boolean) => void;
}) => {
  const userData = useUserData();
  const isAuthenticated = userData && userData.isAuthenticated;
  const translations = doc.other_translations || [];
  const { native } = doc;

  function toggleArticleActionsMenu() {
    setShowArticleActionsMenu(!showArticleActionsMenu);
  }

  // @TODO we will need the following when including the language drop-down
  // const translations = doc.other_translations || [];

  return (
    (((translations && !!translations.length) || isAuthenticated) && (
      <>
        <div
          className={`article-actions${
            showArticleActionsMenu ? " show-actions" : ""
          }`}
        >
          <Button
            type="action"
            extraClasses="article-actions-toggle"
            onClickHandler={toggleArticleActionsMenu}
            icon={showArticleActionsMenu ? "cancel" : "ellipses"}
          >
            <span className="article-actions-dialog-heading">
              Article Actions
            </span>
          </Button>
          <ul className="article-actions-entries">
            <>
              {isAuthenticated && (
                <li className="article-actions-entry">
                  <NotificationsWatchMenu doc={doc} />
                </li>
              )}
              {isAuthenticated && (
                <li className="article-actions-entry">
                  <BookmarkContainer doc={doc} />
                </li>
              )}
              {translations && !!translations.length && (
                <li className="article-actions-entry">
                  <LanguageMenu
                    onClose={toggleArticleActionsMenu}
                    translations={translations}
                    native={native}
                  />
                </li>
              )}
            </>
          </ul>
        </div>
      </>
    )) ||
    null
  );
};
