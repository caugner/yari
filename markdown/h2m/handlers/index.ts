const trimTrailingLines = require("trim-trailing-lines");
import type { Node } from "unist";

import { h, MDNode } from "../h";
import { asArray, toPrettyHTML, wrapText } from "../utils";
import { cards } from "./cards";
import { dl } from "./dl";
import { tables } from "./tables";
import { code, wrap } from "./rehype-remark-utils";
import { toText } from "./to-text";
import { QueryAndTransform } from "./utils";
import { Element, Literal } from "hast";

/**
 * Some nodes like **strong** or __emphasis__ can't have leading/trailing spaces
 * This function extracts those and returns them as text nodes instead.
 */
const extractSpacing = (node: MDNode<"emphasis" | "strong">) => {
  let pre = "";
  let post = "";

  node = {
    ...node,
    children: node.children.map((child, i) => {
      const isFirst = i == 0;
      const isLast = i + 1 == node.children.length;

      if (child.type != "text" || !(isFirst || isLast)) {
        return child;
      }

      const { value } = child;
      const isNotSpace = (s) => !!s.trim();

      if (isFirst) {
        pre = value.slice(0, value.split("").findIndex(isNotSpace));
      }
      if (isLast) {
        post = value.slice(
          value.length - value.split("").reverse().findIndex(isNotSpace)
        );
      }

      return {
        ...child,
        value: value.slice(pre.length, value.length - post.length),
      };
    }),
  };

  return [pre, node, post]
    .filter(Boolean)
    .map((s) => (typeof s == "string" ? h("text", s) : s));
};

export const handlers: QueryAndTransform[] = [
  // Start of non-element types
  // Need to stay above the other handlers, to ensure others only receive
  // elements as arguments (as all other `node.type`s are filtered out here)
  [(node: Node) => node.type == "root", "root"],

  [
    (node: Node) => node.type == "text",
    (node, t, opts) =>
      h("text", wrapText((node as unknown as Literal).value, opts)),
  ],

  [
    (node: Node) => node.type == "comment",
    (node, t, opts) =>
      h(
        "html",
        "<!--" + wrapText((node as unknown as Literal).value, opts) + "-->"
      ),
  ],
  // End of non-element types

  ...tables,
  ...cards,

  [["html", "head", "body"], (node, t) => wrap(t(node))],

  [
    {
      is: ["h1", "h2", "h3", "h4", "h5"],
      canHave: "id",
      canHaveClass: ["example", "name", "highlight-spanned"],
    },
    (node, t) =>
      h("heading", t(node, { shouldWrap: true, singleLine: true }), {
        depth: (Number(node.tagName.charAt(1)) as 1 | 2 | 3 | 4 | 5) || 1,
      }),
  ],

  [
    { is: "div", canHaveClass: ["twocolumns", "threecolumns", "noinclude"] },
    (node, t) => t(node),
  ],

  [
    {
      is: ["span", "small"],
      canHave: "id",
      canHaveClass: [
        "pl-s",
        "highlight-span",
        "objectBox",
        "objectBox-string",
        "devtools-monospace",
        "message-body",
        "message-flex-body",
        "message-body-wrapper",
        "blob-code-inner",
        "blob-code-marker",
      ],
    },
    (node, t) => t(node),
  ],

  [{ is: "p", canHaveClass: ["brush:", "js"] }, "paragraph"],
  [
    "br",
    (node, t, { shouldWrap, singleLine }) =>
      shouldWrap
        ? singleLine
          ? h("html", toPrettyHTML(node))
          : h("break")
        : h("text", "\n"),
  ],

  [
    {
      is: "a",
      has: "href",
      canHave: ["title", "rel", "target"],
      canHaveClass: ["link-https", "mw-redirect", "external", "external-icon"],
    },
    (node, t) =>
      h("link", t(node), {
        title: (node.properties.title as string | undefined) || null,
        url: node.properties.href as string | undefined,
      }),
  ],

  [
    { is: ["ul", "ol"], canHaveClass: "threecolumns" },
    (node, t) => {
      const ordered = node.tagName == "ol";
      return h("list", t(node), {
        ordered,
        start: ordered
          ? (node.properties.start as number | undefined) || 1
          : null,
        spread: false,
      });
    },
  ],

  [
    { is: "li", canHave: "id" },
    (node, t) => {
      const content = wrap(t(node));
      return h("listItem", content, { spread: content.length > 1 });
    },
  ],

  // Turn <code><a href="/some-link">someCode</a></code> into [`someCode`](/someLink) (other way around)
  [
    (node) =>
      node.tagName == "code" &&
      // inline code currently has padding on MDN, thus multiple adjacent tags
      // would appear to have a space in between, hence we don't convert to it.
      node.children.length == 1 &&
      node.children.some(
        (child) =>
          child.type == "element" && ["a", "strong"].includes(child.tagName)
      ),
    (node) =>
      node.children.map((child: Element) => {
        switch (child.tagName) {
          case "a":
            return h("link", h("inlineCode", toText(child)), {
              title: (child.properties as any).title || null,
              url: (child.properties as any).href,
            });

          case "strong":
            return h("strong", h("inlineCode", toText(child)));

          default:
            return h("inlineCode", toText(child));
        }
      }),
  ],

  [
    "code",
    (node, t, opts) => {
      const targetNode =
        node.children.length == 1 &&
        "tagName" in node.children[0] &&
        node.children[0].tagName == "var"
          ? node.children[0]
          : node;
      return h(
        "inlineCode",
        trimTrailingLines(
          wrapText(toText(targetNode, { allowedElements: ["var"] }), opts)
        )
      );
    },
  ],

  [
    { is: "pre", canHaveClass: ["eval", "notranslate", "syntaxbox"] },
    (node, t, opts) => code(node, opts),
  ],

  ...[
    "js",
    "html",
    "css",
    "json",
    "svg",
    "plain",
    "cpp",
    "java",
    "bash",
    "php",
    "xml",
    "glsl",
    "python",
    "sql",
    "example-good",
    "example-bad",
    // @ts-expect-error ts-migrate(2550) FIXME: Property 'flatMap' does not exist on type 'string[... Remove this comment to see the full error message
  ].flatMap((lang) =>
    // shows up with/without semicolon
    ["brush:" + lang, `brush:${lang};`, lang, lang + ";"].map(
      (hasClass) =>
        [
          {
            is: "pre",
            hasClass,
            canHaveClass: [
              "brush:",
              "brush",
              "example-good",
              "example-bad",
              "hidden",
              "no-line-numbers",
              "line-numbers",
              "notranslate",
              "language-css",
              (className) => className.startsWith("highlight"),
              (className) =>
                className.startsWith("[") && className.endsWith("]"),
            ],
          },
          (node, t, opts) => [
            h(
              "code",
              trimTrailingLines(
                wrapText(toText(node, { allowedElements: ["var"] }), opts)
              ),
              {
                lang: lang.startsWith("example") ? "plain" : lang,
                meta: asArray(node.properties.className)
                  .filter(
                    (c) =>
                      typeof c == "string" &&
                      (c.startsWith("example-") || c === "hidden")
                  )
                  .join(" "),
              }
            ),
          ],
        ] as QueryAndTransform
    )
  ),

  [
    {
      is: "img",
      has: "src",
      canHave: ["title", "alt"],
      canHaveClass: "internal",
    },
    (node) => {
      const { src, title, alt } = node.properties;
      return h("image", null, {
        url: src as string,
        title: (title as string | undefined) || null,
        alt: (alt as string | undefined) || "",
      });
    },
  ],

  [{ is: "math", canHave: "display" }, (node) => h("html", toPrettyHTML(node))],

  ["blockquote", (node, t) => h("blockquote", wrap(t(node)))],

  [{ is: ["i", "em"] }, (node, t) => extractSpacing(h("emphasis", t(node)))],
  [{ is: ["b", "strong"] }, (node, t) => extractSpacing(h("strong", t(node)))],

  [
    "q",
    (node, t) => [
      { type: "text", value: '"' },
      ...asArray(t(node)),
      { type: "text", value: '"' },
    ],
  ],

  dl,

  ...["summary", "seoSummary"].map(
    (className) =>
      [
        { hasClass: className },
        (node, t, { summary }) => {
          const trimIntoSingleLine = (text) =>
            text.replace(/\s\s+/g, " ").trim();
          if (
            !summary ||
            trimIntoSingleLine(toText(node, { throw: false })) !=
              trimIntoSingleLine(summary)
          ) {
            return null;
          }
          return node.tagName == "div" || node.tagName == "p"
            ? h(
                "paragraph",
                // @ts-expect-error ts-migrate(2550) FIXME: Property 'flatMap' does not exist on type 'MDNodeU... Remove this comment to see the full error message
                t(node).flatMap((node) =>
                  node.type == "paragraph" ? node.children : node
                )
              )
            : t(node);
        },
      ] as QueryAndTransform
  ),

  ["var", (node, t) => h("emphasis", t(node))],
  ["dfn", (node, t) => h("emphasis", t(node))],
  [{ is: "abbr", canHave: "title" }, (node, t) => t(node)],
];
