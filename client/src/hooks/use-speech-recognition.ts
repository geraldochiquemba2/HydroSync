import { useState, useEffect, useRef, useCallback } from "react";

interface UseSpeechRecognitionReturn {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    isSupported: boolean;
}

export function useSpeechRecognition(onSpeechStart?: () => void): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const recognitionRef = useRef<any>(null);

    const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = "pt-PT";
        recognition.continuous = false; // We want it to stop after a single sentence for push-to-talk style, or true for continuous
        recognition.interimResults = true; // Provides real-time typing effect

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onaudiostart = () => {
            if (onSpeechStart) onSpeechStart();
        };

        recognition.onresult = (event: any) => {
            let currentTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                currentTranscript += event.results[i][0].transcript;
            }
            setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error !== 'no-speech') {
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [isSupported, onSpeechStart]);

    const startListening = useCallback(() => {
        if (!isSupported) return;
        setTranscript("");
        try {
            recognitionRef.current?.start();
        } catch (e) {
            console.warn("Recognition already started");
        }
    }, [isSupported]);

    const stopListening = useCallback(() => {
        if (!isSupported) return;
        recognitionRef.current?.stop();
    }, [isSupported]);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported
    };
}
