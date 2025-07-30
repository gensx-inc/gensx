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

    // Use Groq's Whisper API for transcription
    const groqFormData = new FormData();
    groqFormData.append(
      "file",
      new File([buffer], "audio.webm", { type: "audio/webm" }),
    );
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("response_format", "text");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqFormData,
      },
    );

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const transcription = await groqResponse.text();

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
