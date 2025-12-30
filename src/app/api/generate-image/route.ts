import { NextRequest, NextResponse } from "next/server";

type GenerateImageRequestBody = {
  prompt: string;
  style?: string;
};

const API_KEY = process.env.pollinations_server_secret_key!;

export async function POST(req: NextRequest) {
  try {
    console.log("Received image generation request");
    const { prompt, style } = (await req.json()) as GenerateImageRequestBody;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt required" },
        { status: 400 }
      );
    }

    const styleMap: Record<string, string> = {
      realistic: "photorealistic, ultra detailed",
      fantasy: "fantasy art, cinematic lighting",
      cyberpunk: "cyberpunk, neon lights, futuristic",
      abstract: "abstract, geometric, modern art",
      minimalist: "minimalist, clean composition",
    };

    const finalPrompt = [
      prompt,
      styleMap[style ?? ""] ?? styleMap.realistic,
      "high quality digital art",
    ].join(", ");

    // Using turbo model with the new gen.pollinations.ai endpoint
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
      finalPrompt
    )}?width=512&height=512&seed=${Math.floor(Math.random() * 1e6)}&nologo=true&model=turbo`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Pollinations error:", text);
      return NextResponse.json(
        { error: "Generation failed", details: text },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64}`,
      prompt: finalPrompt,
      model: "turbo",
      service: "Pollinations (Authenticated)",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}