export async function generateCoquiSpeech(text: string, language: string = "English"): Promise<string | null> {
  try {
    const response = await fetch('/api/tts/coqui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    const data = await response.json();
    if (!response.ok && !data.audio) return null;
    return data.audio;
  } catch (error) {
    console.error("Client Coqui TTS failed:", error);
    return null;
  }
}
