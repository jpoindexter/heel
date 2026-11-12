import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  accountId: "1ab142627b6fa8e6c36dae2ed2f8ed4f",
  worker: {
    name: "heel-feedback",
    entrypoint: "./worker.ts",
    compatibilityDate: "2026-11-12",
    workersDev: true,
    env: {
      DB: bindings.d1({ name: "heel-feedback", id: "cef5f543-249d-404e-ae17-83d31e0c97eb" }),
      REPORT_LIMITER: bindings.rateLimit({ namespace: "2001", simple: { limit: 5, period: 60 } }),
      EMAIL: bindings.sendEmail({ destinationAddress: "jason@theft.studio" }),
      FEEDBACK_FROM: bindings.text("feedback@reports.theft.studio"),
    },
  },
});
