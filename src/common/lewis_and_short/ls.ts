import { parse } from "@/common/lewis_and_short/ls_parser";
import { assert, checkPresent } from "@/common/assert";
import { XmlNode } from "@/common/xml/xml_node";
import { displayEntryFree } from "@/common/lewis_and_short/ls_display";
import {
  getOrths,
  isRegularOrth,
  mergeVowelMarkers,
} from "@/common/lewis_and_short/ls_orths";
import { extractOutline } from "@/common/lewis_and_short/ls_outline";
import { LatinDict } from "@/common/dictionaries/latin_dicts";
import { SqlDict } from "@/common/dictionaries/dict_storage";
import { XmlNodeSerialization } from "@/common/xml/xml_node_serialization";
import { Dictionary } from "@/common/dictionaries/dictionaries";
import { EntryResult } from "@/common/dictionaries/dict_result";
import { ServerExtras } from "@/web/utils/rpc/server_rpc";

interface ProcessedLsEntry {
  keys: string[];
  entry: XmlNode;
}

interface RawLsEntry {
  keys: string;
  entry: string;
}

export class LewisAndShort implements Dictionary {
  readonly info = LatinDict.LewisAndShort;

  private readonly sqlDict: SqlDict;

  constructor(dbFile: string = checkPresent(process.env.LS_PROCESSED_PATH)) {
    this.sqlDict = new SqlDict(dbFile, ",");
  }

  async getEntry(
    input: string,
    extras?: ServerExtras | undefined
  ): Promise<EntryResult[]> {
    const entryNodes = this.sqlDict
      .getRawEntry(input, extras)
      .map(XmlNodeSerialization.DEFAULT.deserialize);
    return entryNodes.map((node) => ({
      entry: displayEntryFree(node),
      outline: extractOutline(node),
      inflections: [
        {
          lemma: "habeo",
          form: "habes",
          data: "2P singular present active indicative",
        },
      ],
    }));
  }

  async getCompletions(
    input: string,
    _extras?: ServerExtras | undefined
  ): Promise<string[]> {
    return this.sqlDict.getCompletions(input);
  }
}

export namespace LewisAndShort {
  export function processedToRaw(input: ProcessedLsEntry): RawLsEntry {
    for (const key of input.keys) {
      assert(!key.includes(","));
    }
    return {
      keys: input.keys.join(","),
      entry: XmlNodeSerialization.DEFAULT.serialize(input.entry),
    };
  }

  export function* createProcessedRaw(
    rawFile: string = checkPresent(process.env.LS_PATH)
  ): Generator<ProcessedLsEntry> {
    let numHandled = 0;
    for (const root of parse(rawFile)) {
      if (numHandled % 1000 === 0) {
        console.debug(`Processed ${numHandled}`);
      }
      const orths = getOrths(root).map(mergeVowelMarkers);
      assert(orths.length > 0, `Expected > 0 orths\n${root.toString()}`);
      const regulars = orths.filter(isRegularOrth);
      yield {
        keys: regulars.length > 0 ? regulars : orths,
        entry: root,
      };
      numHandled += 1;
    }
  }

  export function createProcessed(
    rawFile: string = checkPresent(process.env.LS_PATH, "LS_PATH")
  ): RawLsEntry[] {
    const result: RawLsEntry[] = [];
    for (const item of createProcessedRaw(rawFile)) {
      result.push(processedToRaw(item));
    }
    return result;
  }

  export function create(
    processedFile: string = checkPresent(
      process.env.LS_PROCESSED_PATH,
      "LS_PROCESSED_PATH environment variable."
    )
  ): LewisAndShort {
    const start = performance.now();
    const result = new LewisAndShort(processedFile);
    const elapsed = (performance.now() - start).toFixed(3);
    console.debug(`LewisAndShort init: ${elapsed} ms`);
    return result;
  }
}
