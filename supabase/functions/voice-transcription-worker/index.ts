import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Recording = {
  id: string;
  communication_log_id: string;
  facility_id: string;
  user_id: string | null;
  provider_recording_id: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | null;
  duration_ms: number | null;
  transcription_status: string;
  transcription_attempt_count: number;
  transcription_claim_token: string | null;
};

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
    String(Deno.env.get(name) || "").trim();

  if (!value) {
    throw new Error(
      `Required environment variable is missing: ${name}`,
    );
  }

  return value;
}

async function getFacilitySystemAccessToken(
  supabaseUrl: string,
  publishableKey: string,
  email: string,
  password: string,
): Promise<string> {
  const response =
    await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

  const body =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `facility_system authentication failed: ${response.status}`,
    );
  }

  const accessToken =
    String(
      body &&
      typeof body === "object" &&
      "access_token" in body
        ? body.access_token
        : "",
    ).trim();

  if (!accessToken) {
    throw new Error(
      "facility_system access token was not returned",
    );
  }

  return accessToken;
}

async function claimRecording(
  supabaseUrl: string,
  publishableKey: string,
  accessToken: string,
  recordingId: string | null = null,
): Promise<Recording | null> {
  const rpcName =
    recordingId
      ? "claim_communication_recording_transcription_by_id"
      : "claim_communication_recording_transcription";

  const requestBody =
    recordingId
      ? {
          p_recording_id: recordingId,
          p_stale_after_seconds: 300,
          p_max_attempts: 5,
        }
      : {
          p_stale_after_seconds: 300,
          p_max_attempts: 5,
        };

  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/${rpcName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(
          requestBody,
        ),
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `claim RPC failed: ${response.status} ${text}`,
    );
  }

  if (!text.trim()) {
    return null;
  }

  const value =
    JSON.parse(text);

  if (Array.isArray(value)) {
    return value.length > 0
      ? value[0] as Recording
      : null;
  }

  if (
    value === null ||
    typeof value !== "object" ||
    !("id" in value) ||
    !value.id
  ) {
    return null;
  }

  return value as Recording;
}

async function createSignedDownloadUrl(
  supabaseUrl: string,
  recording: Recording,
): Promise<string> {
  const serviceRoleKey =
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } =
    await supabase.storage
      .from(recording.storage_bucket)
      .createSignedUrl(
        recording.storage_path,
        60,
      );

  if (error) {
    throw new Error(
      `signed download failed: ${error.message}`,
    );
  }

  if (!data?.signedUrl) {
    throw new Error(
      "signed download URL was not returned",
    );
  }

  return data.signedUrl;
}

async function downloadRecording(
  signedUrl: string,
): Promise<ArrayBuffer> {
  const response =
    await fetch(signedUrl);

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `recording download failed: ${response.status} ${text}`,
    );
  }

  return await response.arrayBuffer();
}

async function transcribeRecording(
  audio: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const openAiApiKey =
    requireEnv("OPENAI_API_KEY");

  const sourceMimeType =
    String(mimeType || "")
      .trim()
      .toLowerCase();

  if (
    ![
      "audio/wave",
      "audio/wav",
      "audio/x-wav",
    ].includes(sourceMimeType)
  ) {
    throw new Error(
      "unsupported transcription audio MIME type",
    );
  }

  const normalizedMimeType =
    "audio/wav";

  const extension =
    "wav";

  const formData =
    new FormData();

  formData.append(
    "file",
    new Blob(
      [audio],
      {
        type: normalizedMimeType,
      },
    ),
    `recording.${extension}`,
  );

  formData.append(
  "model",
  "gpt-transcribe",
);

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: formData,
      },
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI transcription failed: ${response.status} ${responseText}`,
    );
  }

  let body: unknown;

  try {
    body =
      JSON.parse(responseText);
  } catch {
    throw new Error(
      "OpenAI transcription response was not valid JSON",
    );
  }

  const transcriptionText =
    String(
      body &&
      typeof body === "object" &&
      "text" in body
        ? body.text
        : "",
    ).trim();

  /*
   * A successful OpenAI response may legitimately contain
   * an empty transcription when no speech is detected.
   * Treat that as a completed transcription rather than
   * retrying the same recording until max attempts.
   */
  return transcriptionText;
}

async function completeRecording(
  supabaseUrl: string,
  publishableKey: string,
  accessToken: string,
  recording: Recording,
  transcriptionText: string,
): Promise<void> {
  const claimToken =
    String(
      recording.transcription_claim_token || "",
    ).trim();

  if (!claimToken) {
    throw new Error(
      "recording claim token is missing",
    );
  }

  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/complete_communication_recording_transcription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          p_recording_id: recording.id,
          p_claim_token: claimToken,
          p_transcription_text: transcriptionText,
        }),
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `complete RPC failed: ${response.status} ${text}`,
    );
  }
}

async function failRecording(
  supabaseUrl: string,
  publishableKey: string,
  accessToken: string,
  recording: Recording,
  errorMessage: string,
  retryable = true,
): Promise<void> {
  const claimToken =
    String(
      recording.transcription_claim_token || "",
    ).trim();

  if (!claimToken) {
    throw new Error(
      "recording claim token is missing",
    );
  }

  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/fail_communication_recording_transcription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          p_recording_id: recording.id,
          p_claim_token: claimToken,
          p_error: errorMessage,
          p_retryable: retryable,
          p_retry_delay_seconds: 30,
          p_max_attempts: 5,
        }),
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `fail RPC failed: ${response.status} ${text}`,
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "method_not_allowed",
      },
      405,
    );
  }

  try {
    const workerSecret =
      requireEnv(
        "RISENCARE_VOICE_TRANSCRIPTION_WORKER_SECRET",
      );

    const suppliedSecret =
      String(
        req.headers.get("x-risencare-worker-secret") ||
        "",
      );

    if (
      !suppliedSecret ||
      suppliedSecret !== workerSecret
    ) {
      return jsonResponse(
        {
          error: "unauthorized",
        },
        401,
      );
    }

    const supabaseUrl =
      requireEnv("SUPABASE_URL")
        .replace(/\/+$/, "");

    const publishableKey =
      requireEnv(
        "RISENCARE_SUPABASE_PUBLISHABLE_KEY",
      );

    const systemEmail =
      requireEnv(
        "RISENCARE_SYSTEM_EMAIL",
      );

    const systemPassword =
      requireEnv(
        "RISENCARE_SYSTEM_PASSWORD",
      );

    const accessToken =
      await getFacilitySystemAccessToken(
        supabaseUrl,
        publishableKey,
        systemEmail,
        systemPassword,
      );

    const requestBody =
      await req
        .json()
        .catch(() => ({}));

    const recordingId =
      String(
        requestBody &&
        typeof requestBody === "object" &&
        "recordingId" in requestBody
          ? requestBody.recordingId
          : "",
      ).trim();

    if (
      recordingId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(recordingId)
    ) {
      return jsonResponse(
        {
          error: "recording_id_invalid",
        },
        400,
      );
    }

    const recording =
      await claimRecording(
        supabaseUrl,
        publishableKey,
        accessToken,
        recordingId || null,
      );

    if (!recording) {
      return jsonResponse({
        status: "idle",
      });
    }

    try {
      const signedUrl =
  await createSignedDownloadUrl(
    supabaseUrl,
    recording,
  );

      const audio =
  await downloadRecording(
    signedUrl,
  );

const transcriptionText =
  await transcribeRecording(
    audio,
    recording.mime_type,
  );

      await completeRecording(
        supabaseUrl,
        publishableKey,
        accessToken,
        recording,
        transcriptionText,
      );

      return jsonResponse({
        status: "completed",
      });
    } catch (processingError) {
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : String(processingError);

      await failRecording(
        supabaseUrl,
        publishableKey,
        accessToken,
        recording,
        errorMessage,
        true,
      );

      console.error(
        "Voice transcription processing failed",
        errorMessage,
      );

      return jsonResponse(
        {
          status: "retry_scheduled",
          error: "transcription_processing_failed",
        },
        500,
      );
    }
  } catch (error) {
    console.error(
      "Voice transcription worker failed",
      error instanceof Error
        ? error.message
        : String(error),
    );

    return jsonResponse(
      {
        error: "worker_failed",
      },
      500,
    );
  }
});