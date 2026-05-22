import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  webkitAudioContext?: typeof AudioContext;
};

const RECORDING_LEVEL_COUNT = 96;
const EMPTY_RECORDING_LEVELS = Array.from({ length: RECORDING_LEVEL_COUNT }, () => 0);

type UseTutorSpeechProps = {
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
};

export function useTutorSpeech({ input, setInput, sending }: UseTutorSpeechProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingBaseInputRef = useRef("");
  const recordingFinalTranscriptRef = useRef("");
  const recordingConfirmedRef = useRef(false);
  const recordingRef = useRef(false);
  
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordingLevels, setRecordingLevels] = useState<number[]>(EMPTY_RECORDING_LEVELS);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const stopRecordingMeter = useCallback(() => {
    if (recordingAnimationFrameRef.current !== null) {
      cancelAnimationFrame(recordingAnimationFrameRef.current);
      recordingAnimationFrameRef.current = null;
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    recordingAnalyserRef.current = null;

    void recordingAudioContextRef.current?.close();
    recordingAudioContextRef.current = null;
    setRecordingLevels(EMPTY_RECORDING_LEVELS);
  }, []);

  const startRecordingMeter = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser belum mendukung akses mikrofon.");
    }

    stopRecordingMeter();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextConstructor =
      window.AudioContext ?? (window as SpeechRecognitionWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Browser belum mendukung visualisasi audio.");
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const timeData = new Uint8Array(analyser.fftSize);
    let lastLevelPushAt = 0;

    recordingStreamRef.current = stream;
    recordingAudioContextRef.current = audioContext;
    recordingAnalyserRef.current = analyser;

    const updateLevels = () => {
      const currentAnalyser = recordingAnalyserRef.current;
      if (!currentAnalyser) return;

      currentAnalyser.getByteTimeDomainData(timeData);

      let rmsTotal = 0;
      for (let index = 0; index < timeData.length; index += 1) {
        const centeredValue = (timeData[index] - 128) / 128;
        rmsTotal += centeredValue * centeredValue;
      }

      const rms = Math.sqrt(rmsTotal / timeData.length);
      const nextLevel = rms < 0.006 ? 0 : Math.min(1, (rms - 0.006) / 0.11);
      const now = performance.now();

      if (now - lastLevelPushAt >= 90) {
        lastLevelPushAt = now;
        setRecordingLevels((previousLevels) => {
          const levels =
            previousLevels.length === RECORDING_LEVEL_COUNT
              ? previousLevels
              : EMPTY_RECORDING_LEVELS;
          return [...levels.slice(1), nextLevel];
        });
      }

      recordingAnimationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  }, [stopRecordingMeter]);

  const stopRecording = useCallback(
    (keepTranscript: boolean) => {
      recordingConfirmedRef.current = keepTranscript;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setRecording(false);
      stopRecordingMeter();

      if (!keepTranscript) {
        setInput(recordingBaseInputRef.current);
      }
    },
    [stopRecordingMeter, setInput]
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      stopRecordingMeter();
    };
  }, [stopRecordingMeter]);

  async function handleStartRecording() {
    if (sending || recording) return;

    const SpeechRecognition =
      (window as SpeechRecognitionWindow).SpeechRecognition ??
      (window as SpeechRecognitionWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech to text belum didukung di browser ini. Coba gunakan Chrome atau Edge.");
      return;
    }

    recordingBaseInputRef.current = input;
    recordingFinalTranscriptRef.current = "";
    recordingConfirmedRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "id-ID";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = recordingFinalTranscriptRef.current;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      recordingFinalTranscriptRef.current = finalTranscript;
      const baseInput = recordingBaseInputRef.current.trim();
      const spokenText = `${finalTranscript} ${interimTranscript}`.trim();
      setInput([baseInput, spokenText].filter(Boolean).join(" "));
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        toast.error("Izin mikrofon ditolak. Aktifkan izin mic di browser.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error("Rekaman suara gagal diproses.");
      }
      stopRecording(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
      stopRecordingMeter();
      if (!recordingConfirmedRef.current && !recordingFinalTranscriptRef.current.trim()) {
        setInput(recordingBaseInputRef.current);
      }
    };

    try {
      await startRecordingMeter();
      recognitionRef.current = recognition;
      setRecording(true);
      recognition.start();
    } catch (err) {
      recognitionRef.current = null;
      setRecording(false);
      stopRecordingMeter();
      toast.error(err instanceof Error ? err.message : "Gagal memulai mikrofon");
    }
  }

  function handleCancelRecording() {
    recordingFinalTranscriptRef.current = "";
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setRecording(false);
    stopRecordingMeter();
    setInput(recordingBaseInputRef.current);
  }

  function handleConfirmRecording() {
    stopRecording(true);
  }

  return {
    recording,
    recordingLevels,
    stopRecording,
    handleStartRecording,
    handleCancelRecording,
    handleConfirmRecording,
  };
}
