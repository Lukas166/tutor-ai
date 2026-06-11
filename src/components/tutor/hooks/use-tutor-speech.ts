import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Audio visualization helpers ─────────────────────────────────────

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const RECORDING_LEVEL_COUNT = 96;
const EMPTY_RECORDING_LEVELS = Array.from(
  { length: RECORDING_LEVEL_COUNT },
  () => 0
);

// ── MediaRecorder MIME type detection ───────────────────────────────
// Prioritized list — pick the first one the browser supports.
// Chrome/Edge → webm, Safari → mp4, Firefox → ogg/webm.
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

function detectSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";

  for (const mimeType of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

// ── Hook ────────────────────────────────────────────────────────────

type UseTutorSpeechProps = {
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  courseId: string;
};

export function useTutorSpeech({
  input,
  setInput,
  sending,
  courseId,
}: UseTutorSpeechProps) {
  // ── MediaRecorder refs ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingBaseInputRef = useRef("");
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Audio visualization refs ──
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);

  // ── State ──
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingLevels, setRecordingLevels] =
    useState<number[]>(EMPTY_RECORDING_LEVELS);

  // ── Release mic stream ──
  const releaseStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  // ── Meter cleanup (does NOT release mic — that's separate) ──
  const stopRecordingMeter = useCallback(() => {
    if (recordingAnimationFrameRef.current !== null) {
      cancelAnimationFrame(recordingAnimationFrameRef.current);
      recordingAnimationFrameRef.current = null;
    }

    recordingAnalyserRef.current = null;

    void recordingAudioContextRef.current?.close();
    recordingAudioContextRef.current = null;
    setRecordingLevels(EMPTY_RECORDING_LEVELS);
  }, []);

  // ── Start audio level visualization from an existing stream ──
  const startRecordingMeter = useCallback(
    (stream: MediaStream) => {
      stopRecordingMeter();

      const AudioContextCtor =
        window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!AudioContextCtor) return;

      const audioContext = new AudioContextCtor();
      
      // Prevent mobile Safari from suspending the context
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5; // Lower = faster reaction to voice

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const timeData = new Uint8Array(analyser.fftSize);
      let lastLevelPushAt = 0;

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
        const nextLevel =
          rms < 0.006 ? 0 : Math.min(1, (rms - 0.006) / 0.11);
        const now = performance.now();

        // 50ms interval = ~20 FPS for smoother, more responsive animation
        if (now - lastLevelPushAt >= 50) {
          lastLevelPushAt = now;
          setRecordingLevels((previousLevels) => {
            const levels =
              previousLevels.length === RECORDING_LEVEL_COUNT
                ? previousLevels
                : EMPTY_RECORDING_LEVELS;
            return [...levels.slice(1), nextLevel];
          });
        }

        recordingAnimationFrameRef.current =
          requestAnimationFrame(updateLevels);
      };

      updateLevels();
    },
    [stopRecordingMeter]
  );

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      releaseStream();
      stopRecordingMeter();
    };
  }, [releaseStream, stopRecordingMeter]);

  // ── Start recording ──────────────────────────────────────────────
  async function handleStartRecording() {
    if (sending || recording || transcribing) return;

    if (typeof MediaRecorder === "undefined") {
      toast.error(
        "Browser ini tidak mendukung perekaman suara. Coba gunakan Chrome atau Edge."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Browser belum mendukung akses mikrofon.");
      return;
    }

    const mimeType = detectSupportedMimeType();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, recorderOptions);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recordingStreamRef.current = stream;
      recordingBaseInputRef.current = input;

      // Collect chunks every second — stable on mobile and long recordings
      recorder.start(1000);
      setRecording(true);

      // Waveform visualization (enabled on all devices)
      try {
        startRecordingMeter(stream);
      } catch {
        setRecordingLevels(EMPTY_RECORDING_LEVELS);
      }
    } catch (err) {
      releaseStream();
      toast.error(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Izin mikrofon ditolak. Aktifkan izin mic di browser."
          : "Gagal memulai mikrofon."
      );
    }
  }

  // ── Cancel recording ─────────────────────────────────────────────
  function handleCancelRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.stop();
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    stopRecordingMeter();
    releaseStream();
    setRecording(false);
    setInput(recordingBaseInputRef.current);
  }

  // ── Confirm recording → send to server for transcription ─────────
  async function handleConfirmRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    // Stop recorder and wait for final data chunk
    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        resolve(new Blob(audioChunksRef.current, { type }));
      };
      recorder.stop();
    });

    mediaRecorderRef.current = null;
    stopRecordingMeter();
    releaseStream();
    setRecording(false);

    // Validate minimum audio content
    if (audioBlob.size < 100) {
      toast.error("Rekaman terlalu pendek. Coba bicara lebih lama.");
      return;
    }

    // ── Upload to server for Groq Whisper transcription ──
    setTranscribing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const ext = getFileExtension(audioBlob.type);
      const formData = new FormData();
      formData.append("file", audioBlob, `recording.${ext}`);

      const response = await fetch(
        `/api/courses/${courseId}/tutor/transcribe`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error || "Gagal memproses rekaman suara."
        );
      }

      const { text } = await response.json();

      if (!text || !text.trim()) {
        toast.info("Tidak terdeteksi suara. Coba bicara lebih jelas.");
        return;
      }

      const baseInput = recordingBaseInputRef.current.trim();
      setInput([baseInput, text.trim()].filter(Boolean).join(" "));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memproses rekaman suara."
      );
      setInput(recordingBaseInputRef.current);
    } finally {
      setTranscribing(false);
      audioChunksRef.current = [];
      abortControllerRef.current = null;
    }
  }

  return {
    recording,
    transcribing,
    recordingLevels,
    handleStartRecording,
    handleCancelRecording,
    handleConfirmRecording,
  };
}
