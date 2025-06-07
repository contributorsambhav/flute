// app/api/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, style } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Style enhancements
    const stylePrompts: Record<string, string> = {
      realistic: 'photorealistic, high detail, professional photography, 8k resolution',
      abstract: 'abstract art, geometric shapes, vibrant colors, modern art style',
      cyberpunk: 'cyberpunk aesthetic, neon lights, futuristic, dark atmosphere, synthwave style',
      fantasy: 'fantasy art, magical elements, ethereal lighting, mystical atmosphere',
      minimalist: 'minimalist design, clean lines, simple composition, elegant style'
    };

    const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}, high quality digital art`;

    // Pollinations.ai - completely free, no API key needed
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}`;

    try {
      // Fetch the image to convert to base64
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch generated image');
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      return NextResponse.json({
        imageUrl: dataUrl,
        prompt: enhancedPrompt,
        style: style,
        service: 'Pollinations AI (Free)'
      });

    } catch (fetchError) {
      // If direct fetch fails, return the URL for direct loading
      return NextResponse.json({
        imageUrl: imageUrl,
        prompt: enhancedPrompt,
        style: style,
        service: 'Pollinations AI (Free)',
        note: 'Direct URL - image loads directly in browser'
      });
    }

  } catch (error) {
    console.error('Error generating image:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate images.' },
    { status: 405 }
  );
}