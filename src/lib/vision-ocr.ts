import "server-only";

import { ImageAnnotatorClient } from "@google-cloud/vision";
import { getGoogleServiceAccountCredentials } from "@/lib/firebase/admin";

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (visionClient) return visionClient;
  const credentials = getGoogleServiceAccountCredentials();
  visionClient = new ImageAnnotatorClient({
    projectId: credentials.projectId,
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey,
    },
  });
  return visionClient;
}

export async function detectReceiptText(image: Buffer): Promise<string> {
  const [result] = await getVisionClient().textDetection({
    image: { content: image.toString("base64") },
  });
  return result.fullTextAnnotation?.text ?? result.textAnnotations?.[0]?.description ?? "";
}
