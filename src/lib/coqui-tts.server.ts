import { HfInference } from '@huggingface/inference';

let hf: HfInference | null = null;

export function getHfClient() {
  if (!hf) {
    const token = process.env.HF_TOKEN;
    // Even without a token, some models work with limited rate limits
    hf = new HfInference(token || "");
  }
  return hf;
}

export async function generateCoquiSpeech(text: string, language: string = "English"): Promise<string | null> {
  const client = getHfClient();
  
  try {
    // Mapping languages to reliable HF models (SpeechT5 is very stable on HF Free API)
    const modelMap: Record<string, string> = {
      "English": "microsoft/speecht5_tts", 
      "Hindi": "facebook/mms-tts-hin",
      "Tamil": "facebook/mms-tts-tam",
      "Telugu": "facebook/mms-tts-tel",
      "Bengali": "facebook/mms-tts-ben"
    };

    let model = modelMap[language] || "microsoft/speecht5_tts";

    console.log(`Generating Free AI speech using model: ${model}...`);

    // For SpeechT5, we need to provide a speaker embedding (vocoder)
    // But the simple textToSpeech task usually handles defaults if supported.
    // If the model is not warm, we try a fallback.
    
    try {
      const response = await client.textToSpeech({
        model: model,
        inputs: text,
      });

      // Convert Blob to base64
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } catch (err: any) {
      if (err?.message?.includes('No Inference Provider') && model === "microsoft/speecht5_tts") {
        console.log("SpeechT5 unavailable, trying fallback model...");
        const fallbackResponse = await client.textToSpeech({
          model: "facebook/fastspeech2-en-ljspeech",
          inputs: text,
        });
        const arrayBuffer = await fallbackResponse.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Hugging Face TTS failed:", error);
    return null;
  }
}
