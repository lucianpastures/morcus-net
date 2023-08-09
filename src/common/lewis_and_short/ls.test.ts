import fs from "fs";

import { LewisAndShort } from "@/common/lewis_and_short/ls";
import { XmlNode } from "@/common/xml_node";
import { LsResult } from "@/web/utils/rpc/ls_api_result";
import { SqlDict } from "@/common/dictionaries/dict_storage";

console.debug = jest.fn();

jest.mock("./ls_outline", () => ({
  ...jest.requireActual("./ls_outline"),
  extractOutline: jest.fn(() => "mockOutline"),
}));

const LS_SUBSET = "testdata/ls/subset_partial_orths.xml";
const TEMP_FILE = "ls.test.ts.tmp.txt";

const LS_DATA = [
  {
    keys: ["Julius"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "Julius"]],
      ["Gallia est omnis"]
    ).toString(),
  },
  {
    keys: ["Publius", "Naso"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "Publius"]],
      ["Non iterum repetenda suo"]
    ).toString(),
  },
  {
    keys: ["Naso"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "Naso"]],
      ["Pennisque levatus"]
    ).toString(),
  },
  {
    keys: ["īnō", "Ino"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "Ino"]],
      ["Ino edge case"]
    ).toString(),
  },
  {
    keys: ["quis"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "quisNormal"]],
      ["quisUnspecified"]
    ).toString(),
  },
  {
    keys: ["quĭs"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "quisBreve"]],
      ["quisShort"]
    ).toString(),
  },
  {
    keys: ["quīs"].join(","),
    entry: new XmlNode(
      "entryFree",
      [["id", "quisMacron"]],
      ["quisLong"]
    ).toString(),
  },
];

describe("LewisAndShort", () => {
  async function expectEntriesWithIds(
    promise: Promise<LsResult[]>,
    expected: string[]
  ) {
    const results = await promise;
    const ids = results.map((r) => r.entry.getAttr("id"));
    expect(ids).toStrictEqual(expected);
  }

  afterEach(() => {
    try {
      fs.unlinkSync(TEMP_FILE);
    } catch (e) {}
    try {
      fs.unlinkSync(`${TEMP_FILE}-shm`);
    } catch (e) {}
    try {
      fs.unlinkSync(`${TEMP_FILE}-wal`);
    } catch (e) {}
  });

  test("createProcessed writes element contents", () => {
    const lewisAndShort = LewisAndShort.createProcessed(LS_SUBSET);

    const result = lewisAndShort.filter((entry) =>
      entry.keys.includes("cāmus")
    );

    expect(result).toHaveLength(1);
    expect(result[0].entry).toContain("A muzzle");
  });

  test("createProcessed handles elements with alts", () => {
    const lewisAndShort = LewisAndShort.createProcessed(LS_SUBSET);

    const result = lewisAndShort.filter((entry) =>
      entry.keys.includes("attango")
    );

    expect(result).toHaveLength(1);
    const keys = result[0].keys.split(",");
    expect(keys).toHaveLength(2);
    expect(keys).toContain("adtango");
    expect(keys).toContain("attango");
  });

  test("createProcessed handles elements with only alts", () => {
    const lewisAndShort = LewisAndShort.createProcessed(LS_SUBSET);

    const result = lewisAndShort.filter((entry) => entry.keys.includes("abs-"));

    expect(result).toHaveLength(1);
    const keys = result[0].keys.split(",");
    expect(keys).toHaveLength(1);
    expect(keys).toContain("abs-");
  });

  test("createProcessed removes alts if full orths are present", () => {
    const lewisAndShort = LewisAndShort.createProcessed(LS_SUBSET);

    const result = lewisAndShort.filter((entry) =>
      entry.keys.includes("arruo")
    );

    expect(result).toHaveLength(1);
    expect(result[0].keys).toBe("arruo");
  });

  test("getEntry returns expected entries", async () => {
    SqlDict.save(LS_DATA, TEMP_FILE);
    const dict = LewisAndShort.create(TEMP_FILE);

    expectEntriesWithIds(dict.getEntry("Julius"), ["Julius"]);
    expectEntriesWithIds(dict.getEntry("Publius"), ["Publius"]);
  });

  test("getEntry returns expect outlines", async () => {
    SqlDict.save(LS_DATA, TEMP_FILE);
    const dict = LewisAndShort.create(TEMP_FILE);

    const outline = (await dict.getEntry("Julius")).map((r) => r.outline);

    expect(outline).toStrictEqual(["mockOutline"]);
  });
});
