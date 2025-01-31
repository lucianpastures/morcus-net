import Settings from "@mui/icons-material/Settings";
import MenuBook from "@mui/icons-material/MenuBookOutlined";
import { DictionaryViewV2 } from "@/web/client/pages/dictionary/dictionary_v2";
import {
  InfoText,
  NavIcon,
  SettingsText,
} from "@/web/client/pages/library/reader_utils";
import { exhaustiveGuard } from "@/common/misc_utils";
import { NumberSelector } from "@/web/client/components/generic/selectors";

export interface EmbeddedDictionaryProps {
  /** The word to look up in the dictionary, if any. */
  dictWord?: string;
  /**
   * The setter to use for `dictWord`. This is called if interactions
   * within the embedded dictionary request a new word.
   */
  setDictWord: (word: string) => any;
  /** The scale (for display size) to use for the dictionary. */
  scale: number;
  /**
   * The message to display in the instruction text for the dictionary.
   * This should instruct the user what action to perform on a word in
   * the main panel to get a dictionary lookup.
   */
  dictActionMessage?: string;
}

export function EmbeddedDictionary(
  props: EmbeddedDictionaryProps
): JSX.Element {
  const action = props.dictActionMessage || "Click on";
  return props.dictWord === undefined ? (
    <InfoText
      text={`${action} a word for dictionary and inflection lookups.`}
    />
  ) : (
    <DictionaryViewV2
      embedded
      initial={props.dictWord}
      textScale={props.scale}
      embeddedOptions={{ hideableOutline: true }}
      setInitial={props.setDictWord}
    />
  );
}

export interface MobileReaderSettings {
  /** Whether swipe navigation is enabled. */
  swipeNavigation?: boolean;
  /** A setter for swipe nagivation */
  setSwipeNavigation?: (v: boolean) => any;
  /** Whether side tap navigation is enabled. */
  tapNavigation?: boolean;
  /** A setter for side tab nagivation */
  setTapNavigation?: (v: boolean) => any;
}
export function MobileReaderSettingsSections(props: MobileReaderSettings) {
  const {
    swipeNavigation,
    setSwipeNavigation,
    tapNavigation,
    setTapNavigation,
  } = props;
  const hasSwipeNav =
    swipeNavigation !== undefined && setSwipeNavigation !== undefined;
  const hasTapNav =
    tapNavigation !== undefined && setTapNavigation !== undefined;
  const hasNavSettings = hasSwipeNav || hasTapNav;
  if (!hasNavSettings) {
    return null;
  }

  return (
    <details open>
      <summary>
        <SettingsText message="Navigation" />
      </summary>
      {hasSwipeNav && (
        <div>
          <input
            type="checkbox"
            id="swipeNav"
            name="swipeNav"
            checked={swipeNavigation}
            onChange={(e) => setSwipeNavigation(e.target.checked)}
          />
          <label htmlFor="swipeNav" className="text md">
            Swipe to change page
          </label>
        </div>
      )}
      {hasTapNav && (
        <div>
          <input
            type="checkbox"
            id="tapNav"
            name="tapNav"
            checked={tapNavigation}
            onChange={(e) => setTapNavigation(e.target.checked)}
          />
          <label htmlFor="tapNav" className="text md">
            Tap edge to change page [Beta]
          </label>
        </div>
      )}
    </details>
  );
}

export interface DesktopReaderSettings {
  /** The total width setting for the reader. */
  totalWidth?: number;
  /** A setter for the total width of the reader. */
  setTotalWidth?: (width: number) => any;
  /** The width of the main column of the reader. */
  mainWidth?: number;
  /** A setter for the width of the main column of the reader. */
  setMainWidth?: (width: number) => any;
}
export interface ReaderSettingsProps
  extends DesktopReaderSettings,
    MobileReaderSettings {
  /** The scale to use for the elements in the reader. */
  scale: number;
  /** The scale of the main column of the reader. */
  mainScale: number;
  /** A setter for the scale of the main column of the reader. */
  setMainScale: (width: number) => any;
  /** The scale of the side column of the reader. */
  sideScale: number;
  /** A setter for the scale of the side column of the reader. */
  setSideScale: (width: number) => any;
}
export function ReaderSettings(props: ReaderSettingsProps) {
  const {
    totalWidth,
    setTotalWidth,
    mainWidth,
    setMainWidth,
    mainScale,
    setMainScale,
    sideScale,
    setSideScale,
  } = props;
  const hasTotalWidth = totalWidth !== undefined && setTotalWidth !== undefined;
  const hasMainWidth = mainWidth !== undefined && setMainWidth !== undefined;
  const hasLayoutSettings = hasTotalWidth || hasMainWidth;
  const mainLabel = hasLayoutSettings ? "Main column" : "Main panel";
  const sideLabel = hasLayoutSettings ? "Side column" : "Drawer";
  return (
    <>
      {hasLayoutSettings && (
        <details open>
          <summary>
            <SettingsText message="Layout settings" />
          </summary>
          {hasTotalWidth && (
            <NumberSelector
              value={totalWidth}
              setValue={setTotalWidth}
              label="Total width"
              min={0}
              max={3}
              step={1}
            />
          )}
          {hasMainWidth && (
            <NumberSelector
              value={mainWidth}
              setValue={setMainWidth}
              label="Main width"
              min={32}
              max={80}
              step={8}
            />
          )}
        </details>
      )}
      <MobileReaderSettingsSections {...props} />
      <details open>
        <summary>
          <SettingsText message={`${mainLabel} settings`} />
        </summary>
        <NumberSelector
          value={mainScale}
          setValue={setMainScale}
          label="Text size"
          tag={mainLabel}
          min={50}
          max={150}
          step={10}
        />
      </details>
      <details open>
        <summary>
          <SettingsText message={`${sideLabel} settings`} />
        </summary>
        <NumberSelector
          value={sideScale}
          setValue={setSideScale}
          label="Text size"
          tag={sideLabel}
          min={50}
          max={150}
          step={10}
        />
      </details>
    </>
  );
}

export type SideTabType = string;
interface ReaderSideNavIconProps<T> {
  Icon: JSX.Element;
  tab: T;
  onTabClicked: (t: T) => any;
  currentlySelected: T;
}
function ReaderSideNavIcon<T extends SideTabType>(
  props: ReaderSideNavIconProps<T>
) {
  const isSelected = props.currentlySelected === props.tab;
  return (
    <NavIcon
      Icon={props.Icon}
      label={props.tab}
      onClick={() => props.onTabClicked(props.tab)}
      extraClasses={isSelected ? ["selectedSidePanelTab"] : undefined}
    />
  );
}

const TAB_DICT = "Dictionary";
const TAB_SETTINGS = "Reader settings";
export const DEFAULT_SIDEBAR_TAB_CONFIGS: ReaderInternalTabConfig<DefaultSidebarTab>[] =
  [
    { tab: TAB_DICT, Icon: <MenuBook /> },
    { tab: TAB_SETTINGS, Icon: <Settings /> },
  ];
export type DefaultSidebarTab = typeof TAB_DICT | typeof TAB_SETTINGS;
export function isDefaultSidebarTab(x: unknown): x is DefaultSidebarTab {
  return x === TAB_DICT || x === TAB_SETTINGS;
}
export interface ReaderInternalTabConfig<T> {
  /** The icon to display in the tab. */
  Icon: JSX.Element;
  /** The identifier for this tab. */
  tab: T;
}
export interface ReaderInternalNavbarProps<T> {
  /** The tabs to display in the bar. */
  tabs: ReaderInternalTabConfig<T>[];
  /** The currently selected tab. */
  currentTab: T;
  /** The callback invoked to set the currently selected tab. */
  setCurrentTab: (t: T) => any;
  /** Which special component the navbar is nested in. */
  location?: "Drawer";
}
export function ReaderInternalNavbar<T extends SideTabType>(
  props: ReaderInternalNavbarProps<T>
) {
  return (
    <div
      className={
        props.location === "Drawer" ? "readerMobileBottomBar" : "readerIconBar"
      }>
      {props.tabs.map((tab) => (
        <ReaderSideNavIcon
          Icon={tab.Icon}
          tab={tab.tab}
          key={tab.tab}
          onTabClicked={props.setCurrentTab}
          currentlySelected={props.currentTab}
        />
      ))}
    </div>
  );
}

export interface DefaultReaderSidebarContentProps<T>
  extends ReaderSettingsProps {
  currentTab: DefaultSidebarTab | T;
  setCurrentTab: (tab: DefaultSidebarTab | T) => any;
  dictWord?: string;
  setDictWord: (word: string) => any;
  dictActionMessage?: string;
}
export function DefaultReaderSidebarContent(
  props: DefaultReaderSidebarContentProps<never>
) {
  const tab = props.currentTab;
  switch (tab) {
    case "Reader settings":
      return <ReaderSettings {...props} />;
    case "Dictionary":
      return (
        <EmbeddedDictionary
          dictWord={props.dictWord}
          setDictWord={(target) => {
            props.setCurrentTab("Dictionary");
            props.setDictWord(target);
          }}
          scale={props.sideScale}
          dictActionMessage={props.dictActionMessage}
        />
      );
    default:
      return exhaustiveGuard(tab);
  }
}
