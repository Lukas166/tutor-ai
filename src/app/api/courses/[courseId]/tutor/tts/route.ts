import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient, type ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { z } from "zod/v4";

import { requireTutorUser, tutorErrorResponse } from "@/lib/tutor-ai/route-helpers";

type TutorTtsRouteContext = {
  params: Promise<{ courseId: string }>;
};

const DEFAULT_ELEVENLABS_VOICE_ID = "hpp4J3VqNfWAUOO0d1Us";
const DEFAULT_ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_ELEVENLABS_OUTPUT_FORMAT: ElevenLabs.TextToSpeechConvertRequestOutputFormat =
  "mp3_22050_32";

const ttsSchema = z.object({
  text: z.string().trim().min(1, "Teks tidak boleh kosong").max(1200),
});

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getElevenLabsClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY belum diatur di .env.");
  }

  return new ElevenLabsClient({ apiKey });
}

function getElevenLabsOutputFormat(): ElevenLabs.TextToSpeechConvertRequestOutputFormat {
  return (
    (process.env
      .ELEVENLABS_OUTPUT_FORMAT as ElevenLabs.TextToSpeechConvertRequestOutputFormat) ||
    DEFAULT_ELEVENLABS_OUTPUT_FORMAT
  );
}

export async function POST(request: NextRequest, context: TutorTtsRouteContext) {
  const { error } = await requireTutorUser(request);
  if (error) return error;

  await context.params;

  const parsed = ttsSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const client = getElevenLabsClient();
    const audio = await client.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID,
      {
        text: parsed.data.text,
        modelId: process.env.ELEVENLABS_TTS_MODEL || DEFAULT_ELEVENLABS_MODEL_ID,
        outputFormat: getElevenLabsOutputFormat(),
      }
    );

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[avatar-tts] ElevenLabs gagal membuat audio.", err);
    return tutorErrorResponse(err, "Gagal membuat audio avatar");
  }
}
