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
    const onSpeechStartRef = useRef(onSpeechStart);

    // Keep the latest callback without triggering effect restarts
    useEffect(() => {
        onSpeechStartRef.current = onSpeechStart;
    }, [onSpeechStart]);

    const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = "pt-PT";
        // To allow natural typing/capture we can use continuous=false,
        // but to ensure it stays open while speaking, we might use true,
        // though false works well for "push/click to talk"
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onaudiostart = () => {
            if (onSpeechStartRef.current) onSpeechStartRef.current();
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
                // Avoid aborting actively listening instance on unmount unless needed, but cleanup is essential
                recognitionRef.current.abort();
            }
        };
    }, [isSupported]);

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
