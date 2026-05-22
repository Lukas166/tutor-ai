"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessageCircle,
  Search,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { TutorChatSidebar, SidebarToggleIcon } from "./tutor-chat-sidebar";
import { TutorChatMessages } from "./tutor-chat-messages";
import { TutorChatInput } from "./tutor-chat-input";
import { TutorChatContextDialog } from "./tutor-chat-context-dialog";

import type {
  TutorChatSessionSummary,
  TutorMessage,
  TutorChatSession,
  TutorOverview,
  TutorAiChatPageProps,
} from "./tutor-chat-types";

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
const CHAT_INPUT_MIN_HEIGHT = 44;



export function TutorAiChatPage({ courseId, backHref }: TutorAiChatPageProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingBaseInputRef = useRef("");
  const recordingFinalTranscriptRef = useRef("");
  const recordingConfirmedRef = useRef(false);
  const recordingRef = useRef(false);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const [overview, setOverview] = useState<TutorOverview | null>(null);
  const [chatSessions, setChatSessions] = useState<TutorChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<TutorChatSession | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.id ?? null;
  }, [activeSession?.id]);
  const [input, setInput] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingLevels, setRecordingLevels] = useState<number[]>(EMPTY_RECORDING_LEVELS);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);
  const sendingRef = useRef(false);
  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);
  const [savingContext, setSavingContext] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Rename state
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  // Delete state
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);

  const readyMaterials = overview?.readyMaterials ?? [];
  const selectedMaterialIds = useMemo(
    () => activeSession?.selectedMaterialIds ?? [],
    [activeSession]
  );
  const selectedMaterialSet = useMemo(
    () => new Set(selectedMaterialIds),
    [selectedMaterialIds]
  );

  // Check if new chat should be disabled (active session has 0 messages)
  const isNewChatDisabled =
    creatingChat || sending || (activeSession !== null && activeSession.messages.length === 0);

  // Search-filtered sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return chatSessions;
    const q = searchQuery.toLowerCase();
    return chatSessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [chatSessions, searchQuery]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      if (sendingRef.current) {
        toast("Harap tunggu Tutor AI membalas sebelum pindah chat");
        return;
      }
      if (activeSessionIdRef.current === sessionId) return;
      setLoadingSession(true);
      try {
        const response = await fetch(`/api/courses/${courseId}/tutor/sessions/${sessionId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat chat");
        setActiveSession(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat chat");
      } finally {
        setLoadingSession(false);
      }
    },
    [courseId]
  );

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/tutor`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat Tutor AI");

      setOverview(data);
      setChatSessions(data.chatSessions);

      if (data.chatSessions.length > 0 && !activeSessionIdRef.current) {
        await loadSession(data.chatSessions[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat Tutor AI");
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, [courseId, loadSession]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // Helper to scroll to the latest messages (used on session load/switch)
  const scrollToMessages = useCallback((behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({
      block: "end",
      behavior: behavior === "smooth" ? "smooth" : "instant",
    });
  }, []);

  // Scroll to latest messages when session loads or changes
  useEffect(() => {
    if (!loadingSession && activeSession) {
      scrollToMessages("auto");

      const timer1 = setTimeout(() => scrollToMessages("auto"), 50);
      const timer2 = setTimeout(() => scrollToMessages("auto"), 150);
      const timer3 = setTimeout(() => scrollToMessages("auto"), 400);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [activeSession?.id, loadingSession, scrollToMessages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      if (!input) {
        textarea.style.height = `${CHAT_INPUT_MIN_HEIGHT}px`;
        return;
      }

      textarea.style.height = "auto";
      const measuredHeight = textarea.scrollHeight;
      const nextHeight =
        measuredHeight <= CHAT_INPUT_MIN_HEIGHT + 8
          ? CHAT_INPUT_MIN_HEIGHT
          : Math.min(measuredHeight, 160);

      textarea.style.height = `${nextHeight}px`;
    }
  }, [input]);

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
    [stopRecordingMeter]
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      stopRecordingMeter();
    };
  }, [stopRecordingMeter]);

  useEffect(() => {
    if (recordingRef.current) {
      stopRecording(false);
    }
  }, [activeSession?.id, stopRecording]);

  async function createNewChat() {
    const dummyId = `new-${Date.now()}`;
    const newSession: TutorChatSession = {
      id: dummyId,
      courseId: courseId as string,
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      messages: [],
      selectedMaterialIds: overview?.readyMaterials.map((m) => m.id) || [],
    };
    setActiveSession(newSession);

    // Add dummy to list so it's focused in the sidebar
    setChatSessions((prev) => {
      const cleaned = prev.filter((s) => !s.id.startsWith("new-"));
      return [
        {
          id: dummyId,
          title: "Chat baru",
          messageCount: 0,
          startedAt: newSession.startedAt,
          lastActiveAt: newSession.lastActiveAt,
        },
        ...cleaned,
      ];
    });

    return newSession;
  }

  async function updateContext(nextSelectedMaterialIds: string[]) {
    if (!activeSession) return;

    const previousSession = activeSession;
    setActiveSession({
      ...activeSession,
      selectedMaterialIds: nextSelectedMaterialIds,
    });
    setSavingContext(true);

    try {
      const response = await fetch(
        `/api/courses/${courseId}/tutor/sessions/${activeSession.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedMaterialIds: nextSelectedMaterialIds }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan konteks");
      setActiveSession(data);
    } catch (err) {
      setActiveSession(previousSession);
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan konteks");
    } finally {
      setSavingContext(false);
    }
  }

  async function handleMaterialToggle(materialId: string, checked: boolean) {
    const nextIds = checked
      ? Array.from(new Set([...selectedMaterialIds, materialId]))
      : selectedMaterialIds.filter((id) => id !== materialId);

    await updateContext(nextIds);
  }

  async function handleRenameSession() {
    if (!renamingSessionId || savingRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingSessionId(null);
      return;
    }

    setSavingRename(true);
    try {
      const response = await fetch(
        `/api/courses/${courseId}/tutor/sessions/${renamingSessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal mengubah nama");

      setChatSessions((sessions) =>
        sessions.map((s) =>
          s.id === renamingSessionId ? { ...s, title: trimmed } : s
        )
      );
      toast.success("Nama chat berhasil diubah");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah nama");
    } finally {
      setSavingRename(false);
      setRenamingSessionId(null);
    }
  }

  async function handleDeleteSession() {
    if (!deleteSessionId || deletingSession) return;

    setDeletingSession(true);
    try {
      const response = await fetch(
        `/api/courses/${courseId}/tutor/sessions/${deleteSessionId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menghapus chat");

      setChatSessions((sessions) => sessions.filter((s) => s.id !== deleteSessionId));

      if (activeSession?.id === deleteSessionId) {
        const remaining = chatSessions.filter((s) => s.id !== deleteSessionId);
        if (remaining.length > 0) {
          await loadSession(remaining[0].id);
        } else {
          await createNewChat();
        }
      }

      toast.success("Chat berhasil dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus chat");
    } finally {
      setDeletingSession(false);
      setDeleteSessionId(null);
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }

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

  async function handleSend() {
    const question = input.trim();
    if (!question || sending) return;

    let session = activeSession;
    if (!session) {
      session = await createNewChat();
      if (!session) return;
    }

    setInput("");
    setSending(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const pendingMessage: TutorMessage = {
      id: `pending-${Date.now()}`,
      senderType: "user",
      content: question,
      ragSources: null,
      responseTimeMs: null,
      createdAt: new Date().toISOString(),
    };

    const streamingAiMessage: TutorMessage = {
      id: `streaming-${Date.now()}`,
      senderType: "ai",
      content: "",
      ragSources: null,
      responseTimeMs: null,
      createdAt: new Date().toISOString(),
    };

    // Optimistically update UI IMMEDIATELY with user message + empty AI placeholder
    setActiveSession({
      ...session,
      messages: [...session.messages, pendingMessage, streamingAiMessage],
    });

    // Scroll user's message to the TOP of the viewport (ChatGPT-style)
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${pendingMessage.id}`);
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    });

    let realSessionId = session.id;
    const isNewSession = session.id.startsWith("new-");

    // Jika temporary session (frontend-only), buat dulu di DB
    if (isNewSession) {
      try {
        const response = await fetch(`/api/courses/${courseId}/tutor/sessions`, {
          method: "POST",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal membuat sesi baru");
        
        realSessionId = data.id;
        
        // Simpan context material yang dipilih user di frontend
        if (session.selectedMaterialIds.length > 0) {
          await fetch(`/api/courses/${courseId}/tutor/sessions/${realSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedMaterialIds: session.selectedMaterialIds }),
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal membuat sesi baru");
        setInput(question);
        setSending(false);
        setActiveSession(session); // Revert optimistic message
        return;
      }
    }

    try {
      const response = await fetch(
        `/api/courses/${courseId}/tutor/sessions/${realSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: question }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Tutor AI gagal menjawab");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream tidak tersedia");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let ragSources: unknown = null;
      let responseTimeMs: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));

              if (eventType === "text") {
                accumulatedText += data.text;
                // Update the streaming message in place
                setActiveSession((prev) => {
                  if (!prev) return prev;
                  const messages = [...prev.messages];
                  const lastMsg = messages[messages.length - 1];
                  if (lastMsg && lastMsg.id === streamingAiMessage.id) {
                    messages[messages.length - 1] = {
                      ...lastMsg,
                      content: accumulatedText,
                    };
                  }
                  return { ...prev, messages };
                });
              } else if (eventType === "metadata") {
                ragSources = data.ragSources;
                responseTimeMs = data.responseTimeMs;
              } else if (eventType === "done") {
                // Finalize the streaming message
                setActiveSession((prev) => {
                  if (!prev) return prev;
                  const sessionId = isNewSession ? realSessionId : prev.id;
                  const messages = prev.messages.map((msg) => {
                    if (msg.id === pendingMessage.id) {
                      return { ...msg, id: `user-${Date.now()}` };
                    }
                    if (msg.id === streamingAiMessage.id) {
                      return {
                        ...msg,
                        id: `ai-${Date.now()}`,
                        content: accumulatedText.trim(),
                        ragSources,
                        responseTimeMs,
                      };
                    }
                    return msg;
                  });
                  return { ...prev, id: sessionId, messages };
                });
                setChatSessions((sessions) => {
                  const sid = isNewSession ? realSessionId : session.id;
                  const summary: TutorChatSessionSummary = {
                    id: sid,
                    title: question.slice(0, 72),
                    messageCount: (session.messages.length || 0) + 2,
                    startedAt: session.startedAt,
                    lastActiveAt: new Date().toISOString(),
                  };
                  const others = sessions.filter(
                    (item) => item.id !== sid && item.id !== session.id
                  );
                  return [summary, ...others];
                });
              } else if (eventType === "error") {
                throw new Error(data.error ?? "Tutor AI gagal menjawab");
              }
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message !== "Tutor AI gagal menjawab") {
                // JSON parse error, ignore
              } else {
                throw parseError;
              }
            }
            eventType = "";
          }
        }
      }
    } catch (err) {
      // Don't show error toast if user intentionally aborted
      const isAborted = err instanceof DOMException && err.name === "AbortError";
      setActiveSession((prev) => {
        if (!prev) return prev;
        if (isAborted) {
          // Keep whatever content was streamed so far, finalize the message
          const messages = prev.messages.map((msg) => {
            if (msg.id === streamingAiMessage.id) {
              return msg.content
                ? { ...msg, id: `ai-stopped-${Date.now()}` }
                : null;
            }
            return msg;
          }).filter((msg): msg is TutorMessage => msg !== null);
          return { ...prev, id: isNewSession ? realSessionId : prev.id, messages };
        }
        // Remove the streaming AI message on error
        const messages = prev.messages.filter(
          (msg) => msg.id !== streamingAiMessage.id
        );
        return { ...prev, id: isNewSession ? realSessionId : prev.id, messages };
      });
      if (!isAborted) {
        setInput(question);
        toast.error(err instanceof Error ? err.message : "Tutor AI gagal menjawab");
      }
    } finally {
      abortControllerRef.current = null;
      setSending(false);
    }
  }

  // ==================== LOADING STATE ====================
  if (loadingOverview) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="size-8 animate-spin text-brand" />
        <p className="text-sm font-medium text-muted-foreground">Memuat Tutor AI...</p>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (!overview) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4 bg-background p-8 text-center text-muted-foreground">
        <MessageCircle className="size-12 text-muted-foreground/50" strokeWidth={1.5} />
        <p>Course tidak ditemukan atau Anda belum enroll.</p>
        <Button variant="outline" onClick={() => router.push(backHref)}>
          Kembali ke Course
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* ==================== SIDEBAR ==================== */}
      {/* ==================== SIDEBAR ==================== */}
      <TutorChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        chatSessions={chatSessions}
        activeSession={activeSession}
        creatingChat={creatingChat}
        isNewChatDisabled={isNewChatDisabled}
        setSearchOpen={setSearchOpen}
        setSearchQuery={setSearchQuery}
        createNewChat={createNewChat}
        loadSession={loadSession}
        renamingSessionId={renamingSessionId}
        setRenamingSessionId={setRenamingSessionId}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        savingRename={savingRename}
        handleRenameSession={handleRenameSession}
        setDeleteSessionId={setDeleteSessionId}
        backHref={backHref}
      />

      {/* ==================== MAIN CHAT AREA ==================== */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Header — clean, no border */}
        <header className="flex h-14 shrink-0 items-center gap-3 px-5">
          {/* Sidebar toggle (shown on mobile when sidebar is hidden) */}
          {!sidebarOpen && (
            <div className="md:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSidebarOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Open sidebar"
                  >
                    <SidebarToggleIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Buka panel</TooltipContent>
              </Tooltip>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {overview.course.title}
            </p>
          </div>

          {/* Context Materi button — top right */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={async () => {
                  if (!activeSession) {
                    const session = await createNewChat();
                    if (!session) return;
                  }
                  setSettingsOpen(true);
                }}
                disabled={creatingChat}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Context Materi"
              >
                <Settings2 className="size-5" />
                {savingContext && <Loader2 className="absolute size-5 animate-spin" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Context Materi ({readyMaterials.length} PDF)
            </TooltipContent>
          </Tooltip>
        </header>

        {/* Messages area — only this scrolls */}
        <TutorChatMessages
          activeSession={activeSession}
          loadingSession={loadingSession}
          sending={sending}
          scrollContainerRef={scrollContainerRef}
          messagesEndRef={messagesEndRef}
        />

        {/* ==================== FLOATING INPUT AREA ==================== */}
        <TutorChatInput
          input={input}
          setInput={setInput}
          sending={sending}
          recording={recording}
          recordingLevels={recordingLevels}
          handleSend={handleSend}
          handleStop={handleStop}
          handleStartRecording={handleStartRecording}
          handleCancelRecording={handleCancelRecording}
          handleConfirmRecording={handleConfirmRecording}
          textareaRef={textareaRef}
        />
      </main>

      {/* ==================== SEARCH DIALOG ==================== */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Cari Chat</DialogTitle>
            <DialogDescription>Cari sesi chat berdasarkan judul atau isi pesan pertama.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari chat..."
                autoFocus
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
              {filteredSessions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery.trim() ? "Tidak ditemukan." : "Belum ada chat."}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      void loadSession(session.id);
                      setSearchOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                      activeSession?.id === session.id && "bg-muted font-medium"
                    )}
                  >
                    <MessageCircle className="mr-3 size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{session.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* ==================== CONTEXT MATERI DIALOG ==================== */}
      <TutorChatContextDialog
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        readyMaterials={readyMaterials}
        selectedMaterialSet={selectedMaterialSet}
        activeSession={activeSession}
        savingContext={savingContext}
        handleMaterialToggle={handleMaterialToggle}
      />

      {/* ==================== DELETE CONFIRMATION ==================== */}
      <AlertDialog
        open={!!deleteSessionId}
        onOpenChange={(open) => !open && setDeleteSessionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus chat ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Chat beserta semua pesannya akan dihapus secara permanen. Tindakan ini tidak
              bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSession}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSession();
              }}
              disabled={deletingSession}
            >
              {deletingSession ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
