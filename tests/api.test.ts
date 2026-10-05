import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, expect, it } from "vitest";

const file = path.join(os.tmpdir(), `pahunch-api-${process.pid}.sqlite`);
process.env.PAHUNCH_DB = file;

afterAll(() => {
  for (const target of [file, `${file}-wal`, `${file}-shm`]) {
    if (fs.existsSync(target)) fs.rmSync(target);
  }
});

it("rejects a stale rider task through the HTTP action route", async () => {
  const { resetSingleton, getDb } = await import("../lib/db");
  const { POST } = await import("../app/api/act/route");
  const { applyScenario, getDemoState } = await import("../lib/server/service");
  resetSingleton();
  const database = getDb();
  applyScenario(database, { scenario: "stale_task" });
  const task = getDemoState(database, "PH-2406").selected?.currentTask;
  expect(task).toBeTruthy();

  const cancel = await POST(
    new Request("http://localhost/api/act", {
      method: "POST",
      body: JSON.stringify({ action: "submitReadiness", shipmentId: "PH-2406", choice: "cancel" }),
    }),
  );
  expect(cancel.status).toBe(200);

  const replay = await POST(
    new Request("http://localhost/api/act", {
      method: "POST",
      body: JSON.stringify({
        action: "confirmReceipt",
        shipmentId: "PH-2406",
        taskId: task?.id,
        revision: task?.revision,
        code: "8086",
      }),
    }),
  );
  expect(replay.status).toBe(409);
  const body = (await replay.json()) as { error: string };
  expect(body.error).toMatch(/no longer valid/);
  expect(getDemoState(database, "PH-2406").selected?.shipment.phase).toBe("cancelled");
  resetSingleton();
});
