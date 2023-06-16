import { describe, expect, test } from "@jest/globals";
import express from "express";
import fs from "fs";
import request from "supertest";

import { entriesByPrefix, lsCall } from "@/web/api_routes";
import { setupServer, WebServerParams } from "./web_server";
import path from "path";
import { TelemetryLogger } from "./telemetry/telemetry";
import { MacronizeApi, ReportApi } from "./utils/rpc/routes";
import { encodeMessage } from "./utils/rpc/parsing";

console.debug = jest.fn();

const TEMP_DIR = "web_server_test_ts";
const TEMP_FILE = `${TEMP_DIR}/sample.html`;
const TEMP_INDEX_FILE = `${TEMP_DIR}/index.html`;

beforeAll(() => {
  fs.mkdirSync(TEMP_DIR);
  fs.writeFileSync(TEMP_FILE, "<!DOCTYPE html>\n<html></html>");
  fs.writeFileSync(TEMP_INDEX_FILE, "<!DOCTYPE html>\n<html></html>");
});

afterAll(() => {
  try {
    fs.unlinkSync(TEMP_FILE);
  } catch (e) {}
  try {
    fs.unlinkSync(TEMP_INDEX_FILE);
  } catch (e) {}
  try {
    fs.rmdirSync(TEMP_DIR);
  } catch (e) {}
});

const fileIssueReportResults: (() => Promise<any>)[] = [];

function getServer(): express.Express {
  const app = express();
  const params: WebServerParams = {
    webApp: app,
    macronizer: (a) => Promise.resolve(a + "2"),
    lsDict: (a) => Promise.resolve(`${a} def`),
    entriesByPrefix: (a) => Promise.resolve([a]),
    buildDir: path.resolve(TEMP_DIR),
    fileIssueReport: (a) =>
      (fileIssueReportResults.pop() || (() => Promise.resolve(a)))(),
    telemetry: Promise.resolve(TelemetryLogger.NoOp),
  };
  setupServer(params);
  return app;
}

describe("WebServer", () => {
  const app = getServer();

  test("handles macronize route", async () => {
    const response = await request(app)
      .post(MacronizeApi.path)
      .send(encodeMessage("testPostPleaseIgnore"))
      .set("Content-Type", "text/plain; charset=utf-8");

    expect(response.status).toBe(200);
    expect(response.text).toContain(`testPostPleaseIgnore2`);
  });

  test("handles macronize route with bad data", async () => {
    const response = await request(app)
      .post(MacronizeApi.path)
      .send(encodeMessage({ data: "testPostPleaseIgnore" }))
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.text).toContain("Error extracting input");
  });

  it("handles report route", async () => {
    const response = await request(app)
      .post(ReportApi.path)
      .send(encodeMessage("testPostPleaseIgnore"))
      .set("Content-Type", "text/plain; charset=utf-8");

    expect(response.status).toBe(200);
  });

  test("handles LS dict route", async () => {
    const response = await request(app).get(lsCall("Caesar"));

    expect(response.status).toBe(200);
    expect(response.text).toBe(`Caesar def`);
  });

  test("handles LS completion route", async () => {
    const response = await request(app).get(entriesByPrefix("Caesar"));

    expect(response.status).toBe(200);
    expect(JSON.parse(response.text)).toStrictEqual(["Caesar"]);
  });

  test("sends out requests to index", async () => {
    const response = await request(app).get("/notEvenRemotelyReal");

    expect(response.status).toBe(200);
    expect(response.type).toBe("text/html");
    expect(response.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });

  test("sends out index without cache", async () => {
    const response = await request(app).get("/index.html");

    expect(response.status).toBe(200);
    expect(response.type).toBe("text/html");
    expect(response.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });
});
