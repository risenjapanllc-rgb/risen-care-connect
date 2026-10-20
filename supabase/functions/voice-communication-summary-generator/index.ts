import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function requireEnv(name: string): string {
  const value =
    String(
      Deno.env.get(name) || "",
    ).trim();

  if (!value) {
    throw new Error(
      `Required environment variable is missing: ${name}`,
    );
  }

  return value;
}

async function authenticateFacilitySystem(
  authorization: string,
): Promise<boolean> {
  const supabaseUrl =
    requireEnv("SUPABASE_URL")
      .replace(/\/+$/, "");

  const publishableKey =
    requireEnv(
      "RISENCARE_SUPABASE_PUBLISHABLE_KEY",
    );

  const response =
    await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          apikey:
            publishableKey,
          Authorization:
            authorization,
        },
      },
    );

  if (!response.ok) {
    return false;
  }

  const user =
    await response
      .json()
      .catch(() => null);

  if (
    !user ||
    typeof user !== "object" ||
    Array.isArray(user)
  ) {
    return false;
  }

  const appMetadata =
    "app_metadata" in user &&
    user.app_metadata &&
    typeof user.app_metadata === "object" &&
    !Array.isArray(user.app_metadata)
      ? user.app_metadata
      : null;

  if (
    appMetadata === null ||
    !("risencare_role" in appMetadata)
  ) {
    return false;
  }

  const role =
    String(
      appMetadata.risencare_role || "",
    ).trim();

  return (
    role === "facility_system" ||
    role === "connector_trust_boundary"
  );
}


function extractSummary(
  body: unknown,
): string {
  if (
    body &&
    typeof body === "object" &&
    "output_text" in body &&
    typeof body.output_text === "string"
  ) {
    const summary =
      body.output_text.trim();

    if (summary) {
      return summary;
    }
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("output" in body) ||
    !Array.isArray(body.output)
  ) {
    return "";
  }

  for (const item of body.output) {
    if (
      !item ||
      typeof item !== "object" ||
      !("content" in item) ||
      !Array.isArray(item.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        content &&
        typeof content === "object" &&
        "type" in content &&
        content.type === "output_text" &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        const summary =
          content.text.trim();

        if (summary) {
          return summary;
        }
      }
    }
  }

  return "";
}

async function generateSummary(
  transcript: string,
): Promise<string> {
  const openAiApiKey =
    requireEnv(
      "OPENAI_API_KEY",
    );

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model:
            "gpt-6-luna",
          input: [
            {
              role:
                "system",
              content:
                "あなたは福祉現場の通話記録を要約するアシスタントです。" +
                "文字起こしに書かれている事実だけを使い、" +
                "推測や情報の追加をせず、簡潔な日本語で要約してください。" +
                "日時・依頼・連絡事項・対応内容など重要な事実を優先してください。",
            },
            {
              role:
                "user",
              content:
                transcript,
            },
          ],
        }),
      },
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI summary failed: ${response.status} ${responseText}`,
    );
  }

  let body: unknown;

  try {
    body =
      JSON.parse(
        responseText,
      );
  } catch {
    throw new Error(
      "OpenAI summary response was not valid JSON",
    );
  }

  const summary =
    extractSummary(
      body,
    );

  if (!summary) {
    throw new Error(
      "OpenAI summary text was not returned",
    );
  }

  return summary;
}

Deno.serve(
  async (
    req: Request,
  ) => {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          error:
            "method_not_allowed",
        },
        405,
      );
    }

    const authorization =
      String(
        req.headers.get(
          "authorization",
        ) || "",
      ).trim();

    if (
      !authorization
        .toLowerCase()
        .startsWith(
          "bearer ",
        )
    ) {
      return jsonResponse(
        {
          error:
            "unauthorized",
        },
        401,
      );
    }

    const authorized =
      await authenticateFacilitySystem(
        authorization,
      ).catch(() => false);

    if (!authorized) {
      return jsonResponse(
        {
          error:
            "unauthorized",
        },
        401,
      );
    }

    try {
      const requestBody =
        await req
          .json()
          .catch(
            () => ({}),
          );

      const transcript =
        String(
          requestBody &&
          typeof requestBody ===
            "object" &&
          "transcript" in
            requestBody
            ? requestBody.transcript
            : "",
        ).trim();

      if (!transcript) {
        return jsonResponse(
          {
            error:
              "transcript_required",
          },
          422,
        );
      }

      const summary =
        await generateSummary(
          transcript,
        );

      return jsonResponse(
        {
          status:
            "generated",
          summary,
        },
      );
    } catch (error) {
      console.error(
        "Voice communication summary generation failed",
        error instanceof Error
          ? error.message
          : String(error),
      );

      return jsonResponse(
        {
          error:
            "summary_generation_failed",
        },
        500,
      );
    }
  },
);
