import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCoquiSpeech } from '@/src/lib/coqui-tts';

interface VoiceAssistantProps {
  text: string;
  autoSpeak?: boolean;
  language?: string;
}

const cleanText = (t: string) => {
  // Remove leading numbers like "1. ", "1) ", etc.
  return t.replace(/^\d+[\.\)]\s*/, '').trim();
};

export function VoiceAssistant({ text, autoSpeak = false, language = "English" }: VoiceAssistantProps) {
  // VOICE SYSTEM PAUSED DUE TO BUDGET CONSTRAINTS
  const isPaused = true;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceType, setVoiceType] = useState<'coqui' | 'fallback'>('coqui');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const lastRequestIdRef = useRef<number>(0);
  const speakTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopSpeaking = () => {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore
      }
      sourceNodeRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speak = async () => {
    if (isPaused) {
      setStatusMessage("Voice features are currently paused to save costs.");
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }
    if (muted || !text) return;
    
    const cleanedText = cleanText(text);
    if (!cleanedText) return;

    // Add a race to handle slow API responses
    const fetchWithTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), ms)
      );
      return Promise.race([promise, timeout]);
    };

    const requestId = ++lastRequestIdRef.current;
    stopSpeaking();
    setIsLoading(true);
    setVoiceType('coqui');

    let currentError: string | null = null;

    try {
      // Use Coqui TTS (Free AI - Server Side)
      let base64Audio: string | null = null;
      try {
        base64Audio = await fetchWithTimeout(generateCoquiSpeech(cleanedText, language), 15000);
      } catch (e) {
        console.warn("Coqui TTS timed out or failed");
        currentError = "Coqui AI: Connection timed out";
      }

      if (base64Audio) {
        setVoiceType('coqui');
        setStatusMessage(null);
      } else {
        currentError = "Coqui AI: Failed to generate speech";
        setStatusMessage(currentError);
      }
      
      if (requestId !== lastRequestIdRef.current) return;
      
      if (!base64Audio || base64Audio.startsWith("ERROR_")) {
        throw new Error(currentError || "Voice generation failed");
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      // Use decodeAudioData for MP3/MPEG format from ElevenLabs
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      if (requestId !== lastRequestIdRef.current) return;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (requestId === lastRequestIdRef.current) {
          setIsSpeaking(false);
        }
      };
      
      sourceNodeRef.current = source;
      source.start();
      setIsSpeaking(true);
      console.log(`Playing ${voiceType} Voice`);
    } catch (error) {
      console.warn("High-quality Speech failed, falling back to browser TTS:", error);
      setVoiceType('fallback');
      
      if (!currentError) {
        setStatusMessage("AI Quota hit or Key missing - Using standard voice");
      } else {
        setStatusMessage(currentError);
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
      
      if (requestId === lastRequestIdRef.current) {
        const startBrowserTTS = () => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanedText);
          
          const voices = window.speechSynthesis.getVoices();
          const langCodeMap: Record<string, string> = {
            "Hindi": "hi-IN",
            "Bengali": "bn-IN",
            "Tamil": "ta-IN",
            "Telugu": "te-IN",
            "English": "en-US"
          };
          
          const targetLang = langCodeMap[language] || "en-US";
          utterance.lang = targetLang;
          
          let voice = voices.find(v => v.lang.startsWith(targetLang) && (v.name.includes('Google') || v.name.includes('Natural'))) 
                     || voices.find(v => v.lang.startsWith(targetLang));
          
          // If no voice found for target language, try to find any voice that supports the language
          if (!voice) {
            voice = voices.find(v => v.lang.includes(targetLang.split('-')[0]));
          }

          if (voice) {
            utterance.voice = voice;
          } else if (language === "Hindi") {
            console.warn("No Hindi voice found in browser. Fallback will be poor.");
          }
          utterance.pitch = 1.0;
          utterance.rate = 0.95;
          console.log("Playing Fallback Voice:", voice?.name || "Default");

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            startBrowserTTS();
            window.speechSynthesis.onvoiceschanged = null;
          };
        } else {
          startBrowserTTS();
        }
      }
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (autoSpeak && text) {
      // Debounce speech to prevent rapid-fire quota hits
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = setTimeout(() => {
        speak();
      }, 100); // Reduced from 500ms to 100ms for faster response
    }
    return () => stopSpeaking();
  }, [text, autoSpeak]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isPaused) {
            setStatusMessage("Voice system paused. Check 'System Info' for details.");
            setTimeout(() => setStatusMessage(null), 5000);
            return;
          }
          if (isSpeaking) {
            stopSpeaking();
          } else {
            speak();
          }
        }}
        disabled={isLoading}
        className={isPaused ? "text-stone-300 cursor-not-allowed" : muted ? "text-muted-foreground" : voiceType === 'fallback' ? "text-orange-500" : "text-green-500"}
        title={isPaused ? "Voice system paused" : voiceType === 'fallback' ? "Using standard voice" : "Using Coqui TTS (Free AI)"}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSpeaking ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>
      {isSpeaking && (
        <div className="flex gap-1 items-center">
          <div className="w-1 h-4 bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-4 bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-4 bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          {voiceType === 'fallback' && <span className="text-[10px] text-orange-500 font-medium ml-1">Standard</span>}
          {voiceType === 'coqui' && (
            <span className="text-[10px] text-green-500 font-medium">Coqui (Free)</span>
          )}
        </div>
      )}
      {statusMessage && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground animate-pulse">
            {statusMessage}
          </span>
          {voiceType === 'fallback' && (
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-[10px] text-blue-500"
              onClick={(e) => {
                e.stopPropagation();
                speak();
              }}
            >
              Retry Coqui
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
