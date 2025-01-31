import { MutableRefObject } from "react";
import * as React from "react";

import { checkPresent } from "@/common/assert";
import { XmlNode } from "@/common/xml/xml_node";
import {
  ClickableTooltip,
  SectionLinkTooltip,
} from "@/web/client/pages/tooltips";
import { DictInfo } from "@/common/dictionaries/dictionaries";
import { LatinDict } from "@/common/dictionaries/latin_dicts";
import { InflectionData } from "@/common/dictionaries/dict_result";
import { FontSizes } from "@/web/client/styling/styles";
import {
  DictContext,
  DictContextOptions,
} from "@/web/client/pages/dictionary/dict_context";
import { NavHelper } from "@/web/client/router/router_v2";
import { ClientPaths } from "@/web/client/routing/client_paths";
import {
  DictRoute,
  useDictRouter,
} from "@/web/client/pages/dictionary/dictionary_routing";

export const QUICK_NAV_ANCHOR = "QNA";
export const QNA_EMBEDDED = "QNAEmbedded";

export const SCROLL_JUMP: ScrollIntoViewOptions = {
  behavior: "auto",
  block: "start",
};
export const SCROLL_SMOOTH: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "start",
};

interface HelpRowConfig {
  left: XmlNode;
  right: string;
}
const SAMPLE_HOVER_NODE = new XmlNode(
  "span",
  [
    ["class", "lsHover"],
    ["title", "Click away to dismiss"],
  ],
  ["Underlined"]
);
const SAMPLE_HEADWORD = new XmlNode(
  "span",
  [["class", "lsOrth"]],
  ["Headword"]
);
const SAMPLE_GRAMMAR = new XmlNode("span", [["class", "lsGrammar"]], ["Usage"]);
const SAMPLE_QUOTE = new XmlNode("span", [["class", "lsQuote"]], ["Quote"]);
const SAMPLE_AUTHOR = new XmlNode(
  "span",
  [["class", "lsBibl"]],
  [new XmlNode("span", [["class", "lsAuthor"]], ["Author"]), " Work"]
);
const SAMPLE_SECTION_HEADER = new XmlNode(
  "span",
  [
    ["class", "lsSenseBullet"],
    ["senseid", "tutorialExample"],
  ],
  [" A. "]
);
const HELP_ROWS: HelpRowConfig[] = [
  {
    left: SAMPLE_HOVER_NODE,
    right:
      "You can click on underlined words to open a tooltip with more information. Try clicking on this one!",
  },
  {
    left: SAMPLE_HEADWORD,
    right: "The headwords or main entries in the dictionary.",
  },
  { left: SAMPLE_GRAMMAR, right: "Technical notes on grammar or usage" },
  {
    left: SAMPLE_QUOTE,
    right: "A quote, usually showing an example of the word in a real text.",
  },
  {
    left: SAMPLE_AUTHOR,
    right:
      "A citation showing the author, work, or passage from which an example is taken.",
  },
  {
    left: SAMPLE_SECTION_HEADER,
    right:
      "Click on grey section headers to copy links directly to a particular section of a long article.",
  },
];

function HelpSectionRow(props: { row: number } & HelpRowConfig) {
  const gridRow = props.row + 1;
  return (
    <>
      <span style={{ gridRow, gridColumn: 1 }}>{xmlNodeToJsx(props.left)}</span>
      <span style={{ gridRow, gridColumn: 2 }}>{props.right}</span>
    </>
  );
}
function HelpSectionRows(props: { configs: HelpRowConfig[] }) {
  return (
    <>
      {props.configs.map(({ left, right }, i) => (
        <HelpSectionRow key={i} row={i} left={left} right={right} />
      ))}
    </>
  );
}

export function DictHelpSection() {
  return (
    <>
      <div
        style={{
          display: "grid",
          columnGap: "8px",
          rowGap: "8px",
          marginTop: "12px",
        }}>
        <HelpSectionRows configs={HELP_ROWS} />
      </div>
      <div style={{ marginTop: "12px" }}>
        Please report typos or other bugs by clicking on the flag icon in the
        top bar.
      </div>
    </>
  );
}

function ShLink(props: { text: string; query: string }) {
  const { nav } = useDictRouter();
  const { fromInternalLink } = React.useContext(DictContext);

  return (
    <span
      className="dLink"
      onClick={() => {
        if (fromInternalLink) {
          fromInternalLink.current = true;
        }
        nav.to({
          path: ClientPaths.DICT_PAGE.path,
          query: props.query,
          dicts: LatinDict.SmithAndHall,
        });
      }}>
      {props.text}
    </span>
  );
}

function onLatinWordClick(
  nav: NavHelper<DictRoute>,
  dictContext: DictContextOptions,
  word: string
) {
  if (dictContext.setInitial !== undefined) {
    dictContext.setInitial(word);
  } else {
    if (dictContext.fromInternalLink) {
      dictContext.fromInternalLink.current = true;
    }
    nav.to({
      path: ClientPaths.DICT_PAGE.path,
      query: word,
      dicts: LatinDict.LewisAndShort,
      inflectedSearch: true,
    });
  }
}

function LatLink(props: { word: string; orig?: string }) {
  const { nav } = useDictRouter();
  const dictContext = React.useContext(DictContext);

  return (
    <span
      className="latWord"
      onClick={() => onLatinWordClick(nav, dictContext, props.word)}>
      {props.orig || props.word}
    </span>
  );
}

function transformClassAttr(value: string, isEmbedded: boolean) {
  return value
    .split(" ")
    .map((chunk) => {
      if (!isEmbedded || chunk !== QUICK_NAV_ANCHOR) {
        return chunk;
      }
      return QNA_EMBEDDED;
    })
    .join(" ");
}

export function xmlNodeToJsx(
  root: XmlNode,
  highlightId?: string,
  sectionRef?: MutableRefObject<HTMLElement | null>,
  key?: string,
  isEmbedded?: boolean
): JSX.Element {
  const children = root.children.map((child, i) => {
    if (typeof child === "string") {
      return child;
    }
    return xmlNodeToJsx(
      child,
      highlightId,
      sectionRef,
      child.getAttr("id") || `${i}`,
      isEmbedded
    );
  });
  const props: { [propKey: string]: any } = {};
  if (key !== undefined) {
    props.key = key;
  }
  let titleText: string | undefined = undefined;
  let className: string | undefined = undefined;
  for (const [attrKey, value] of root.attrs) {
    if (attrKey === "class") {
      className = transformClassAttr(value, isEmbedded === true);
      props.className = className;
      continue;
    }
    if (attrKey === "title") {
      titleText = value;
      continue;
    }
    props[attrKey] = value;
  }

  if (titleText !== undefined) {
    function hoverForwardedNode(forwardProps: any, forwardRef: any) {
      const allProps = { ...props, ...forwardProps };
      allProps["ref"] = forwardRef;
      return React.createElement(root.name, allProps, children);
    }
    const ForwardedNode = React.forwardRef<HTMLElement>(hoverForwardedNode);
    return (
      <ClickableTooltip
        titleText={titleText}
        className={className}
        ChildFactory={ForwardedNode}
        key={key}
      />
    );
  } else if (className === "lsSenseBullet") {
    function senseForwardedNode(forwardProps: any, forwardRef: any) {
      const allProps = { ...props, ...forwardProps };
      allProps["ref"] = forwardRef;
      return React.createElement(root.name, allProps, children);
    }
    const ForwardedNode = React.forwardRef<HTMLElement>(senseForwardedNode);
    return (
      <SectionLinkTooltip
        forwarded={ForwardedNode}
        className={className}
        id={checkPresent(
          root.getAttr("senseid"),
          "lsSenseBullet must have senseid!"
        )}
        key={key}
      />
    );
  } else if (className === "dLink") {
    const target = root.getAttr("to");
    const text = root.getAttr("text");
    return (
      <ShLink
        query={target || "undefined"}
        text={text || "undefined"}
        key={key}
      />
    );
  } else if (className === "latWord") {
    const word = root.getAttr("to")!;
    const orig = root.getAttr("orig");
    return <LatLink word={word} orig={orig} key={key} />;
  } else {
    if (root.getAttr("id") === highlightId && highlightId !== undefined) {
      props["className"] = "highlighted";
      props["ref"] = sectionRef!;
    }
    return React.createElement(root.name, props, children);
  }
}

export namespace SearchSettings {
  const SEARCH_SETTINGS_KEY = "SEARCH_SETTINGS_KEY";

  export function store(dicts: DictInfo[]) {
    const keys = dicts.map((dict) => dict.key);
    sessionStorage.setItem(SEARCH_SETTINGS_KEY, keys.join(";"));
  }

  export function retrieve(): DictInfo[] {
    const stored = sessionStorage.getItem(SEARCH_SETTINGS_KEY)?.split(";");
    const rawDicts =
      stored === undefined
        ? LatinDict.AVAILABLE
        : LatinDict.AVAILABLE.filter((d) => stored.includes(d.key));
    return rawDicts;
  }
}

export interface ElementAndKey {
  element: JSX.Element;
  key: string;
  inflections?: InflectionData[];
}

export function InflectionDataSection(props: {
  inflections: InflectionData[];
  textScale?: number;
}) {
  const byForm = new Map<string, [string, string | undefined][]>();
  for (const data of props.inflections) {
    if (!byForm.has(data.form)) {
      byForm.set(data.form, []);
    }
    byForm.get(data.form)!.push([data.data, data.usageNote]);
  }
  const formatted: [string, string[]][] = Array.from(byForm.entries()).map(
    ([form, data]) => [
      form,
      data
        .sort(([_1, a], [_2, b]) =>
          a === undefined ? -1 : b === undefined ? 1 : a.localeCompare(b)
        )
        .map(
          ([inflection, usage]) =>
            inflection + (usage === undefined ? "" : ` (${usage})`)
        ),
    ]
  );

  return (
    <>
      {formatted.map(([form, inflections]) => (
        <div
          style={{
            fontSize: FontSizes.SECONDARY * ((props.textScale || 100) / 100),
            paddingBottom: 3,
          }}
          key={form}>
          <span className="lsOrth">{form}</span>:
          {inflections.length === 1 ? (
            ` ${inflections[0]}`
          ) : (
            <ul style={{ margin: 0 }} aria-label="Inflections">
              {[...new Set(inflections)].map((inflection) => (
                <li style={{ lineHeight: "normal" }} key={inflection}>
                  {inflection}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}
