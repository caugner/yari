import "./index.scss";
// @ts-expect-error ts-migrate(1259) FIXME: Module '"/Users/claas/github/mdn/yari/node_modules... Remove this comment to see the full error message
import React from "react";

type SubmenuItem = {
  component?: () => JSX.Element;
  description?: string;
  extraClasses?: string | null;
  hasIcon?: boolean;
  iconClasses?: string;
  label?: string;
  subText?: string;
  url?: string;
  dot?: string;
};

export type MenuEntry = {
  id: string;
  items: SubmenuItem[];
  label: string;
  to?: string;
};

export const Submenu = ({
  menuEntry,
  defaultHidden = false,
  isDropdown = false,
  submenuId,
  extraClasses,
}: {
  menuEntry: MenuEntry;
  defaultHidden?: boolean;
  isDropdown?: boolean;
  submenuId?: string;
  extraClasses?: string;
}) => {
  return (
    <ul
      id={submenuId}
      className={`${isDropdown ? "dropdown-list" : "submenu"} ${menuEntry.id} ${
        defaultHidden ? "hidden" : ""
      } ${extraClasses || ""}`}
      role="menu"
      aria-labelledby={`${menuEntry.id}-button`}
    >
      {menuEntry.items &&
        menuEntry.items.map((item, index) => {
          const key = `${menuEntry.id}-${index}`;
          return (
            <li
              key={key}
              role="menuitem"
              className={`${item.extraClasses || ""} ${
                isDropdown ? "dropdown-item" : ""
              }`}
            >
              {item.component ? (
                <item.component key={key} />
              ) : item.url ? (
                <a
                  href={item.url}
                  className={`submenu-item ${
                    item.url.startsWith("https://") ? "external" : ""
                  }`}
                  role="menuitem"
                >
                  {item.hasIcon && <div className={item.iconClasses} />}
                  {item.dot && (
                    <span className="visually-hidden submenu-item-dot">
                      {item.dot}
                    </span>
                  )}
                  <div className="submenu-content-container">
                    <div className="submenu-item-heading">{item.label}</div>
                    {item.description && (
                      <p className="submenu-item-description">
                        {item.description}
                      </p>
                    )}
                    {item.subText && (
                      <span className="submenu-item-subtext">
                        {item.subText}
                      </span>
                    )}
                  </div>
                </a>
              ) : (
                <div key={key} className="submenu-item">
                  {item.hasIcon && <div className={item.iconClasses} />}
                  <div className="submenu-content-container">
                    <div className="submenu-item-heading">{item.label}</div>
                    {item.description && (
                      <p className="submenu-item-description">
                        {item.description}
                      </p>
                    )}
                    {item.subText && (
                      <span className="submenu-item-subtext">
                        {item.subText}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
    </ul>
  );
};
