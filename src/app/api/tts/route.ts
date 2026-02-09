import { NextRequest, NextResponse } from "next/server"
import { textToSpeech } from "@/lib/tts"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, lang, voiceName, tag } = body

    if (!text || !lang) {
      return NextResponse.json(
        { error: "text and lang are required" },
        { status: 400 }
      )
    }

    const result = await textToSpeech(text, {
      lang,
      voiceName: voiceName || "",
      tag: tag || "word",
      mode: "link",
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.err || "TTS generation failed" },
        { status: 500 }
      )
    }

    // Return audio buffer as binary using ArrayBuffer for compatibility with NextResponse
    const buffer = result.buffer as Buffer
    const uint8Array = new Uint8Array(buffer)
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": uint8Array.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("TTS API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
