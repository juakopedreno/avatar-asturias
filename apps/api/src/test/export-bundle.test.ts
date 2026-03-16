import { describe, expect, it } from "vitest";
import { ExportService } from "../modules/export/export.service";

describe("export bundle contract", () => {
  it("returns schema, manifest hashes and blocks", async () => {
    const service = new ExportService(
      {
        list: async () => [{ id: "a1", action: "update", detail: "ok" }],
      } as never,
      {
        getDashboard: async () => ({ statsData: { totalConversations: 2 } }),
      } as never,
      {
        getSettings: async () => ({ branding: { name: "A", primaryColor: "#000" } }),
      } as never,
      {
        getPolicy: async () => ({ tone: "Formal", responseStyle: "conversational" }),
      } as never,
      {
        listChunks: async () => [{ id: "k1", text: "dato" }],
      } as never,
    );

    const bundle = await service.exportBundle();
    expect(bundle.schemaVersion).toBe("1.0.0");
    expect(bundle).toHaveProperty("exportedAt");
    expect(bundle).toHaveProperty("knowledge");
    expect(bundle).toHaveProperty("config");
    expect(bundle).toHaveProperty("metrics");
    expect(bundle).toHaveProperty("logs");
    expect(bundle.manifest.blocks).toHaveProperty("knowledge");
    expect(bundle.manifest.blocks).toHaveProperty("config");
    expect(bundle.manifest.blocks).toHaveProperty("metrics");
    expect(bundle.manifest.blocks).toHaveProperty("logs");
    expect(typeof bundle.manifest.blocks.knowledge).toBe("string");
    expect(bundle.manifest.blocks.knowledge.length).toBeGreaterThan(10);
  });
});
