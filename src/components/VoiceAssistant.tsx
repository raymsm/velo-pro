import React, { useEffect, useState, useCallback } from 'react';
import { Mic, MicOff, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceAssistantProps {
  onCommand: (command: string) => void;
}

export default function VoiceAssistant({ onCommand }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setSupported(true);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setFeedback('Listening_Protocol_Active...');
    };

    recognition.onresult = (event: any) => {
      try {
        const text = event.results[0][0].transcript.toLowerCase();
        setTranscript(text);
        setFeedback(`Recognized: "${text}"`);
        onCommand(text);
      } catch (e) {
        console.error("Speech parsing error", e);
      }
      
      // Auto-dismiss feedback
      setTimeout(() => setFeedback(null), 3000);
    };

    recognition.onerror = (event: any) => {
      // Don't error out on 'no-speech'
      if (event.error === 'no-speech') {
        setIsListening(false);
        setFeedback('No_Speech_Detected');
        setTimeout(() => setFeedback(null), 2000);
        return;
      }
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      setFeedback(`System_Error: ${event.error}`);
      setTimeout(() => setFeedback(null), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  if (!supported) return null;

  return (
    <div className="fixed top-20 right-4 z-[600] flex flex-col items-end gap-2">
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-primary/95 text-black px-4 py-2 rounded-sm font-mono text-[10px] uppercase font-bold shadow-2xl border border-black/20 flex flex-col gap-1"
          >
            <span>{feedback}</span>
            {isListening && transcript === '' && (
                <div className="text-[8px] text-gray-800 normal-case mt-1 border-t border-black/10 pt-1">
                    Try: "Start Ride", "Log Fuel", "Navigate to Gas Station"
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={startListening}
        disabled={isListening}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xl ${
          isListening 
            ? 'bg-red-600 animate-pulse scale-110' 
            : 'bg-[#1A1D21] border border-[#2A2D33] text-primary hover:border-primary/50'
        }`}
      >
        {isListening ? <Mic className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
        {isListening && (
           <motion.div 
            className="absolute inset-0 rounded-full border-2 border-red-500"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
           />
        )}
      </button>
    </div>
  );
}
