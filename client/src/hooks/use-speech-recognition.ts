import { useState, useEffect, useRef, useCallback } from "react";

interface UseSpeechRecognitionReturn {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    isSupported: boolean;
}

export function useSpeechRecognition(onSpeechStart?: () => void, onFinalResult?: (text: string) => void): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const recognitionRef = useRef<any>(null);
    const onSpeechStartRef = useRef(onSpeechStart);
    const onFinalResultRef = useRef(onFinalResult);

    useEffect(() => {
        onSpeechStartRef.current = onSpeechStart;
        onFinalResultRef.current = onFinalResult;
    }, [onSpeechStart, onFinalResult]);

    const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = "pt-PT";
        recognition.continuous = true; // Keeps listening until manually stopped
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript("");
        };

        recognition.onaudiostart = () => {
            if (onSpeechStartRef.current) onSpeechStartRef.current();
        };

        recognition.onresult = (event: any) => {
            let currentInterim = "";
            let currentFinal = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const chunk = event.results[i];
                if (chunk.isFinal) {
                    currentFinal += chunk[0].transcript;
                } else {
                    currentInterim += chunk[0].transcript;
                }
            }

            setTranscript(currentInterim);

            if (currentFinal.trim() && onFinalResultRef.current) {
                onFinalResultRef.current(currentFinal.trim());
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
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
