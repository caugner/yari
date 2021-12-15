import { Link, useLocation } from "react-router-dom";

import Container from "../../atoms/container";

import "./index.scss";

type TabItem = {
  component?: () => JSX.Element;
  extraClasses?: string;
  label: string;
  path: string;
};

export default function Tabs({ tabs }: { tabs: TabItem[] }) {
  const location = useLocation();

  return (
    <nav className="tabs">
      <Container>
        <ul>
          {tabs.map((tab: TabItem) => {
            const currentCheck = location.pathname === tab.path;

            return (
              <li>
                <Link to={tab.path} aria-current={currentCheck}>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </nav>
  );
}
