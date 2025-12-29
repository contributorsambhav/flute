import { NextRequest, NextResponse } from "next/server";

/**
 * Upload file (binary) to Pinata IPFS
 */
async function uploadToPinata(buffer: Buffer, filename?: string): Promise<string> {
  if (!process.env.PINATA_JWT) {
    throw new Error(
      "Missing Pinata credentials. Set PINATA_JWT environment variable",
    );
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)]);

  formData.append("file", blob, filename ?? "file");

  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 0 }),
  );

  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: filename ?? "Uploaded File" }),
  );

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Pinata IPFS upload failed: ${response.status} - ${errorText}`,
    );
  }

  const result: { IpfsHash: string } = await response.json();
  return result.IpfsHash;
}

/**
 * Upload JSON metadata to Pinata IPFS
 */
async function uploadJSONToPinata(
  jsonData: Record<string, unknown>,
  name?: string,
): Promise<string> {
  if (!process.env.PINATA_JWT) {
    throw new Error(
      "Missing Pinata credentials. Set PINATA_JWT environment variable",
    );
  }

  const payload = {
    pinataContent: jsonData,
    pinataMetadata: {
      name: name ?? "metadata.json",
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Pinata IPFS JSON upload failed: ${response.status} - ${errorText}`,
    );
  }

  const result: { IpfsHash: string } = await response.json();
  return result.IpfsHash;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT environment variable must be set" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    const metadataRaw = formData.get("metadata");

    console.log("Uploading file:", file.name, "Size:", file.size);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload image
    const imageCid = await uploadToPinata(buffer, file.name);
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageCid}`;

    if (typeof metadataRaw === "string") {
      try {
        const parsedMetadata = JSON.parse(metadataRaw) as Record<string, unknown>;

        const metadataWithImage: Record<string, unknown> = {
          ...parsedMetadata,
          image: imageUrl,
        };

        const metadataCid = await uploadJSONToPinata(
          metadataWithImage,
          "metadata.json",
        );

        const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;

        return NextResponse.json({
          imageUrl,
          metadataUrl,
          imageCid,
          metadataCid,
        });
      } catch (parseError: unknown) {
        console.error(
          "Error parsing metadata:",
          parseError instanceof Error ? parseError.message : parseError,
        );

        return NextResponse.json(
          { error: "Invalid metadata JSON" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      imageUrl,
      imageCid,
    });
  } catch (error: unknown) {
    console.error(
      "IPFS upload error:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error: "Failed to upload to IPFS",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
