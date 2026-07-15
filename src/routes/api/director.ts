import { createFileRoute } from "@tanstack/react-router";
import { streamObject } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { ArtworkPlanSchema, PLANNER_SYSTEM_PROMPT } from "@/domain/director/schema";

type DirectorRequestBody = {
  prompt?: unknown;
  model?: unknown;
};

export const Route = createFileRoute("/api/director")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        let body: DirectorRequestBody;
        try {
          body = (await request.json()) as DirectorRequestBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const prompt =
          typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) {
          return new Response("prompt required", { status: 400 });
        }

        // "terra" — quality plan; "luna" — fast draft. Both GPT-5.6.
        const modelChoice =
          body.model === "luna"
            ? "openai/gpt-5.6-luna"
            : "openai/gpt-5.6-terra";

        // OpenAI structured output needs strict json_schema — enable it
        // on the provider or the SDK falls back to json_object which
        // doesn't enforce the schema shape.
        const gateway = createLovableAiGatewayProvider(key, {
          structuredOutputs: true,
        });

        try {
          const result = streamObject({
            model: gateway(modelChoice),
            schema: ArtworkPlanSchema,
            system: PLANNER_SYSTEM_PROMPT,
            prompt,
            providerOptions: {
              // GPT-5.6 on the chat path must have reasoning_effort=none
              // when tools/structured output are involved.
              lovable: { reasoningEffort: "none" },
            },
          });

          // toTextStreamResponse streams the JSON as it is generated;
          // client accumulates the buffer and parses with parsePartialJson
          // to feed the store progressively.
          return result.toTextStreamResponse();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(`director_failed: ${message}`, { status: 500 });
        }
      },
    },
  },
});
