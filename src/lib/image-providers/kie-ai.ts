import "server-only";
import type { ImageGenerationProvider, GenerateDesignInput, EditDesignInput, GenerateDesignResult } from "./types";

const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

export type KieModel = "nano-banana-pro" | "flux-kontext-pro" | "flux-kontext-max";

interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data?: { taskId: string };
}

interface KieRecordInfoResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    state: "waiting" | "queuing" | "generating" | "success" | "fail";
    resultJson?: string;
    failMsg?: string;
  };
}

/**
 * Each kie.ai model has its own input field naming. docs.kie.ai's prose
 * and example payloads disagree with each other in places, so these
 * shapes are the ones confirmed against real `createTask` calls during
 * Phase 5's model comparison — not copied from a docs page untested.
 * Notably, nano-banana-pro's task failed with "Internal Error" when
 * `aspect_ratio`/`resolution` were included (likely "auto" isn't a valid
 * enum value for this model despite being valid for nano-banana-edit) —
 * omitting them and sending only `prompt` + `image_input` succeeded.
 */
function buildInput(model: KieModel, params: { prompt: string; imageUrl: string; aspectRatio?: string }): Record<string, unknown> {
  if (model === "nano-banana-pro") {
    return {
      prompt: params.prompt,
      image_input: [params.imageUrl],
    };
  }
  return {
    prompt: params.prompt,
    input_image: params.imageUrl,
    aspect_ratio: params.aspectRatio,
    output_format: "png",
  };
}

async function createTask(model: KieModel, input: Record<string, unknown>, apiKey: string): Promise<string> {
  const res = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  const json = (await res.json()) as KieCreateTaskResponse;
  if (!res.ok || json.code !== 200 || !json.data?.taskId) {
    throw new Error(`kie.ai createTask failed (${res.status}): ${json.msg ?? "unknown error"}`);
  }
  return json.data.taskId;
}

async function pollTask(taskId: string, apiKey: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await res.json()) as KieRecordInfoResponse;
    const state = json.data?.state;

    if (state === "success") {
      const result = JSON.parse(json.data?.resultJson ?? "{}") as { resultUrls?: string[] };
      const url = result.resultUrls?.[0];
      if (!url) throw new Error("kie.ai task succeeded but returned no result URL.");
      return url;
    }
    if (state === "fail") {
      throw new Error(`kie.ai task failed: ${json.data?.failMsg ?? "unknown error"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("kie.ai task timed out waiting for a result.");
}

export class KieAiImageProvider implements ImageGenerationProvider {
  readonly providerId = "kie.ai";
  readonly model: KieModel;

  constructor(model?: KieModel) {
    this.model = model ?? (process.env.KIE_AI_MODEL as KieModel) ?? "nano-banana-pro";
  }

  private get apiKey(): string {
    const key = process.env.KIE_AI_API_KEY;
    if (!key) throw new Error("KIE_AI_API_KEY is not set.");
    return key;
  }

  private async runEdit(prompt: string, imageUrl: string, aspectRatio?: string): Promise<GenerateDesignResult> {
    const input = buildInput(this.model, { prompt, imageUrl, aspectRatio });
    const taskId = await createTask(this.model, input, this.apiKey);
    const resultUrl = await pollTask(taskId, this.apiKey);
    return { imageUrl: resultUrl, provider: this.providerId, model: this.model, raw: { taskId } };
  }

  generateDesign(input: GenerateDesignInput) {
    return this.runEdit(input.prompt, input.sourceImageUrl, input.aspectRatio);
  }

  regenerateDesign(input: GenerateDesignInput) {
    return this.runEdit(input.prompt, input.sourceImageUrl, input.aspectRatio);
  }

  editDesign(input: EditDesignInput) {
    return this.runEdit(input.prompt, input.previousImageUrl, input.aspectRatio);
  }
}
