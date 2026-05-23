import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireTutorUser, tutorErrorResponse } from "@/lib/tutor-ai/route-helpers";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Groq free tier limit)

let groqClient: Groq | null = null;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum diatur di .env.");
  }

  groqClient ??= new Groq({ apiKey });
  return groqClient;
}

type TranscribeRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function POST(request: NextRequest, context: TranscribeRouteContext) {
  const { userId, error } = await requireTutorUser(request);
  if (error) return error;

  // courseId available for future logging/analytics
  await context.params;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File audio tidak ditemukan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File audio terlalu besar. Maksimal 25MB." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File audio kosong." },
        { status: 400 }
      );
    }

    const groq = getGroqClient();

    // Re-construct File to ensure clean instance for SDK compatibility
    const buffer = await file.arrayBuffer();
    const audioFile = new File([buffer], file.name, { type: file.type });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      temperature: 0,
      response_format: "json",
      prompt: "Transcribe exactly what is spoken. Do not translate.",
    });

    const text = transcription.text?.trim() || "";

    console.log(
      `[Transcribe API] User ${userId} — ${(file.size / 1024).toFixed(1)}KB → "${text.slice(0, 80)}${text.length > 80 ? "..." : ""}"`
    );

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[Transcribe API] Error:", err);
    return tutorErrorResponse(err, "Gagal memproses rekaman suara.");
  }
}
