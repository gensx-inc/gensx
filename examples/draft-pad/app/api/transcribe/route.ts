import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 401 },
      );
    }

    const groq = new Groq({
      apiKey: groqApiKey,
    });

    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Convert File to Buffer for Groq API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transcription = await groq.audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: "audio/webm" }),
      model: "whisper-large-v3",
      response_format: "text",
    });

    return NextResponse.json({
      text: transcription,
      success: true,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
