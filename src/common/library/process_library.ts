import {
  LibraryWorkMetadata,
  ProcessedWork,
} from "@/common/library/library_types";
import { processTei } from "@/common/library/process_work";
import { parseCtsTeiXml } from "@/common/xml/tei_utils";
import { XmlNodeSerialization } from "@/common/xml/xml_node_serialization";
import { parseRawXml } from "@/common/xml/xml_utils";
import { parseMessage, stringifyMessage } from "@/web/utils/rpc/parsing";
import fs from "fs";
import { readFile } from "fs/promises";

export const LIB_DEFAULT_DIR = "library_processed";
const LIBRARY_INDEX = "morcus_library_index.json";
// TODO: We should just crawl some root.
const ALL_WORKS = [
  "texts/latin/perseus/data/phi0448/phi001/phi0448.phi001.perseus-lat2.xml",
];

interface LibraryIndex {
  [workId: string]: [string, LibraryWorkMetadata];
}

export function processLibrary(
  outputDir: string = LIB_DEFAULT_DIR,
  works: string[] = ALL_WORKS
) {
  const index: LibraryIndex = {};
  for (const workPath of works) {
    // We should use the Perseus URN instead.
    const workId = workPath
      .split("/")
      .slice(-1)[0]
      .replace(/\.[^/.]+$/, "");
    const tei = parseCtsTeiXml(parseRawXml(fs.readFileSync(workPath)));
    const metadata: LibraryWorkMetadata = {
      id: workId,
      author: tei.info.author,
      name: tei.info.title,
    };
    const result = processTei(tei);
    const encoded = stringifyMessage(result, [XmlNodeSerialization.DEFAULT]);
    const outputPath = `${outputDir}/${workId}`;
    index[workId] = [outputPath, metadata];
    fs.writeFileSync(outputPath, encoded);
    console.log("Wrote processed file to %s", outputPath);
  }
  fs.writeFileSync(`${outputDir}/${LIBRARY_INDEX}`, JSON.stringify(index));
}

const indices = new Map<string, Promise<LibraryIndex>>();

async function getIndex(
  resultDir: string = LIB_DEFAULT_DIR
): Promise<LibraryIndex> {
  if (!indices.has(resultDir)) {
    indices.set(
      resultDir,
      readFile(`${resultDir}/${LIBRARY_INDEX}`).then((v) =>
        JSON.parse(v.toString())
      )
    );
  }
  return indices.get(resultDir)!;
}

export async function retrieveWorksList(
  resultDir: string = LIB_DEFAULT_DIR
): Promise<LibraryWorkMetadata[]> {
  const index = await getIndex(resultDir);
  return Object.values(index).map(([_k, v]) => v);
}

export async function retrieveWorkStringified(
  workId: string,
  resultDir: string = LIB_DEFAULT_DIR
): Promise<string> {
  const index = await getIndex(resultDir);
  const workPath = index[workId];
  if (workPath === undefined) {
    return Promise.reject({ status: 404, message: `Invalid id: ${workId}` });
  }
  return (await readFile(workPath[0])).toString();
}

export async function retrieveWork(
  workId: string,
  resultDir: string = LIB_DEFAULT_DIR
): Promise<ProcessedWork> {
  return parseMessage(
    await retrieveWorkStringified(workId, resultDir),
    ProcessedWork.isMatch,
    [XmlNodeSerialization.DEFAULT]
  );
}
