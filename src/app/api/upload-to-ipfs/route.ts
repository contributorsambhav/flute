// api/upload-to-ipfs.ts
import { NextRequest, NextResponse } from 'next/server';

// Upload file to Pinata IPFS
async function uploadToPinata(buffer: Buffer, filename?: string) {
  if (!process.env.PINATA_JWT) {
    throw new Error('Missing Pinata credentials. Set PINATA_JWT environment variable');
  }

  const formData = new FormData();
  const blob = new Blob([buffer]);
  formData.append('file', blob, filename || 'file');

  // Optional: Add pinata options
  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });
  formData.append('pinataOptions', pinataOptions);

  // Optional: Add pinata metadata
  const pinataMetadata = JSON.stringify({
    name: filename || 'Uploaded File',
  });
  formData.append('pinataMetadata', pinataMetadata);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata IPFS upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

// Upload JSON data to Pinata IPFS
async function uploadJSONToPinata(jsonData: any, name?: string) {
  if (!process.env.PINATA_JWT) {
    throw new Error('Missing Pinata credentials. Set PINATA_JWT environment variable');
  }

  const data = {
    pinataContent: jsonData,
    pinataMetadata: {
      name: name || 'metadata.json',
    },
    pinataOptions: {
      cidVersion: 0,
    }
  };

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata IPFS JSON upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: 'PINATA_JWT environment variable must be set' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Uploading file:', file.name, 'Size:', file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
        
    // Upload image to IPFS via Pinata
    const imageCid = await uploadToPinata(buffer, file.name);
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageCid}`;
    // Alternative gateway: `https://ipfs.io/ipfs/${imageCid}`

    console.log('Image uploaded successfully:', imageCid);

    if (metadata) {
      try {
        const metadataObj = JSON.parse(metadata);
        const metadataWithImage = {
          ...metadataObj,
          image: imageUrl
        };

        // Upload metadata to IPFS via Pinata
        const metadataCid = await uploadJSONToPinata(metadataWithImage, 'metadata.json');
        const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;
        // Alternative gateway: `https://ipfs.io/ipfs/${metadataCid}`

        console.log('Metadata uploaded successfully:', metadataCid);

        return NextResponse.json({
          imageUrl,
          metadataUrl,
          imageCid,
          metadataCid
        });
      } catch (parseError) {
        console.error('Error parsing metadata:', parseError);
        return NextResponse.json(
          { error: 'Invalid metadata JSON' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      imageUrl,
      imageCid
    });

  } catch (error) {
    console.error('IPFS upload error:', error);
        
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
    return NextResponse.json(
      {
        error: 'Failed to upload to IPFS',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}