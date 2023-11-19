import { parse } from "@/common/lewis_and_short/ls_parser";
import { assert, assertEqual, checkPresent, envVar } from "@/common/assert";
import { XmlNode } from "@/common/xml/xml_node";
import { displayEntryFree } from "@/common/lewis_and_short/ls_display";
import {
  getOrths,
  isRegularOrth,
  mergeVowelMarkers,
} from "@/common/lewis_and_short/ls_orths";
import { extractOutline } from "@/common/lewis_and_short/ls_outline";
import { LatinDict } from "@/common/dictionaries/latin_dicts";
import { RawDictEntry, SqlDict } from "@/common/dictionaries/dict_storage";
import { XmlNodeSerialization } from "@/common/xml/xml_node_serialization";
import { DictOptions, Dictionary } from "@/common/dictionaries/dictionaries";
import { EntryOutline, EntryResult } from "@/common/dictionaries/dict_result";
import { ServerExtras } from "@/web/utils/rpc/server_rpc";
import { LatinWords } from "@/common/lexica/latin_words";
import { removeDiacritics } from "@/common/text_cleaning";
import { decodeMessage, encodeMessage } from "@/web/utils/rpc/parsing";

const REGISTRY = [XmlNodeSerialization.DEFAULT];

interface StoredEntryData {
  /** The disambiguation number for this entry, if applicable. */
  n?: string;
  /** The outline for this entry. */
  outline: EntryOutline;
  /** The root node for a marked up entry. */
  entry: XmlNode;
}

/** Exported only for unit tests. */
export namespace StoredEntryData {
  export function validator(t: unknown): t is StoredEntryData {
    // This is only used to restore from the SQL data so we don't need to check.
    return true;
  }

  export function fromEncoded(message: string): StoredEntryData {
    return decodeMessage(message, StoredEntryData.validator, REGISTRY);
  }

  export function toRawDictEntry(
    keys: string[],
    entry: StoredEntryData
  ): RawDictEntry {
    assertEqual(keys.filter((k) => k.includes(",")).length, 0);
    return {
      keys: keys.join(","),
      entry: encodeMessage(entry, REGISTRY),
    };
  }

  export function toEntryResult(entry: StoredEntryData): EntryResult {
    return { outline: entry.outline, entry: entry.entry };
  }
}

function* extractEntryData(rawFile: string): Generator<RawDictEntry> {
  let numHandled = 0;
  for (const root of parse(rawFile)) {
    if (numHandled % 1000 === 0) {
      console.debug(`Processed ${numHandled}`);
    }
    const orths = getOrths(root).map(mergeVowelMarkers);
    assert(orths.length > 0, `Expected > 0 orths\n${root.toString()}`);
    const regulars = orths.filter(isRegularOrth);
    const keys = regulars.length > 0 ? regulars : orths;
    const data: StoredEntryData = {
      entry: displayEntryFree(root),
      outline: extractOutline(root),
      n: root.getAttr("n"),
    };
    yield StoredEntryData.toRawDictEntry(keys, data);
    numHandled += 1;
  }
}

export class LewisAndShort implements Dictionary {
  readonly info = LatinDict.LewisAndShort;

  private readonly sqlDict: SqlDict;

  constructor(dbFile: string = checkPresent(process.env.LS_PROCESSED_PATH)) {
    this.sqlDict = new SqlDict(dbFile, ",");
  }

  async getEntry(
    input: string,
    extras?: ServerExtras | undefined,
    options?: DictOptions
  ): Promise<EntryResult[]> {
    const exactMatches: StoredEntryData[] = this.sqlDict
      .getRawEntry(input, extras)
      .map(StoredEntryData.fromEncoded);
    if (
      options?.handleInflections !== true ||
      process.env.LATIN_INFLECTION_DB === undefined
    ) {
      return exactMatches.map(StoredEntryData.toEntryResult);
    }

    const analyses = LatinWords.analysesFor(input);
    const inflectedResults: EntryResult[] = [];
    const exactResults: EntryResult[] = [];
    for (const analysis of analyses) {
      const lemmaChunks = analysis.lemma.split("#");
      const lemmaBase = lemmaChunks[0];

      const rawResults = this.sqlDict.getRawEntry(lemmaBase);
      const results: EntryResult[] = rawResults
        .map(StoredEntryData.fromEncoded)
        .filter((data) => {
          if (lemmaChunks.length === 1) {
            return true;
          }
          assertEqual(lemmaChunks.length, 2);
          return data.n === lemmaChunks[1];
        })
        .map((data) => ({
          ...StoredEntryData.toEntryResult(data),
          inflections: analysis.inflectedForms.flatMap((inflData) =>
            inflData.inflectionData.map((info) => ({
              lemma: analysis.lemma,
              form: inflData.form,
              data: info.inflection,
              usageNote: info.usageNote,
            }))
          ),
        }));
      // TODO: Currently, getRawEntry will ignore case, i.e
      // canis will also return inputs for Canis. Ignore this for
      // now but we should fix it later and handle case difference explicitly.
      if (lemmaBase === removeDiacritics(input)) {
        exactResults.push(...results);
      } else {
        inflectedResults.push(...results);
      }
    }

    const results: EntryResult[] = [];
    const idsSoFar = new Set<string>();
    for (const candidate of exactResults
      .concat(exactMatches)
      .concat(inflectedResults)) {
      const id = candidate.entry.getAttr("id")!;
      if (idsSoFar.has(id)) {
        continue;
      }
      idsSoFar.add(id);
      results.push(candidate);
    }
    return results;
  }

  async getCompletions(
    input: string,
    _extras?: ServerExtras | undefined
  ): Promise<string[]> {
    return this.sqlDict.getCompletions(input);
  }
}

export namespace LewisAndShort {
  export function processPerseusXml(rawFile: string): RawDictEntry[] {
    return [...extractEntryData(rawFile)];
  }

  export function saveToDb(
    dbPath: string = envVar("LS_PROCESSED_PATH"),
    rawFile: string = envVar("LS_PATH")
  ) {
    SqlDict.save(processPerseusXml(rawFile), dbPath);
  }

  export function create(
    processedFile: string = envVar("LS_PROCESSED_PATH")
  ): LewisAndShort {
    const start = performance.now();
    const result = new LewisAndShort(processedFile);
    const elapsed = (performance.now() - start).toFixed(3);
    console.debug(`LewisAndShort init: ${elapsed} ms`);
    return result;
  }
}
