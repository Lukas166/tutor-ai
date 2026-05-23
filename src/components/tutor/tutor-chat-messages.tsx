"use client";

import {
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronRight,
  Copy,
  FileText,
  Loader2,
  Square,
  Volume2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RagSource, TutorChatSession, TutorMessage } from "./tutor-chat-types";

function getMessageSources(message: TutorMessage): RagSource[] {
  if (!message.ragSources || typeof message.ragSources !== "object") return [];
  const sources = (message.ragSources as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) return [];

  return sources.filter((source): source is RagSource => {
    return (
      typeof source === "object" &&
      source !== null &&
      "chunkId" in source &&
      "materialTitle" in source
    );
  });
}

function getUniqueSources(sources: RagSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.materialId}-${source.pageNumber}-${source.chunkIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type TutorSpeechLanguage = "id" | "en";

const TUTOR_SPEECH_LANGS: Record<TutorSpeechLanguage, string> = {
  id: "id-ID",
  en: "en-US",
};
const AVAILABLE_TUTOR_VOICE_ORDER: Record<TutorSpeechLanguage, string[]> = {
  id: ["Google Bahasa Indonesia"],
  en: ["Google UK English Female", "Microsoft Zira - English (United States)"],
};
const NATURAL_VOICE_HINTS = ["natural", "neural", "online", "premium", "enhanced"];
const FEMALE_VOICE_HINTS: Record<TutorSpeechLanguage, string[]> = {
  id: ["siti", "damayanti", "gadis"],
  en: ["jenny", "samantha", "zira", "aria", "victoria"],
};
const MALE_VOICE_HINTS = ["ardi", "david", "mark"];
const INDONESIAN_WORD_HINTS = [
  "adalah",
  "akan",
  "atau",
  "dalam",
  "dan",
  "dengan",
  "dari",
  "di",
  "ini",
  "itu",
  "jika",
  "karena",
  "ke",
  "pada",
  "sebagai",
  "tidak",
  "untuk",
  "yang",
];
const ENGLISH_WORD_HINTS = [
  "a",
  "an",
  "and",
  "are",
  "as",
  "because",
  "for",
  "from",
  "if",
  "in",
  "is",
  "not",
  "of",
  "or",
  "that",
  "the",
  "then",
  "this",
  "to",
  "with",
];
const TUTOR_SPEECH_RATE = 1.15;
const TUTOR_SPEECH_PITCH = 1;

function prepareSpeechText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_#>~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBrowserVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 500);

    function handleVoicesChanged() {
      window.clearTimeout(timeoutId);
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
  });
}

function countWordHints(words: string[], hints: string[]) {
  const hintSet = new Set(hints);
  return words.reduce((total, word) => total + (hintSet.has(word) ? 1 : 0), 0);
}

function detectSpeechLanguage(text: string): TutorSpeechLanguage {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const englishScore = countWordHints(words, ENGLISH_WORD_HINTS);
  const indonesianScore = countWordHints(words, INDONESIAN_WORD_HINTS);

  return englishScore > indonesianScore ? "en" : "id";
}

function getLanguageScore(voice: SpeechSynthesisVoice, language: TutorSpeechLanguage) {
  const name = voice.name.toLowerCase();
  const voiceLang = voice.lang.toLowerCase();

  if (language === "id") {
    if (voiceLang.startsWith("id")) return 80;
    if (name.includes("indonesia") || name.includes("bahasa indonesia")) return 60;
    return 0;
  }

  if (voiceLang.startsWith("en")) return 80;
  if (name.includes("english")) return 60;
  return 0;
}

function getNaturalScore(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  const keywordScore = NATURAL_VOICE_HINTS.reduce(
    (total, hint) => total + (name.includes(hint) ? 18 : 0),
    0
  );

  return keywordScore + (voice.localService ? 0 : 8) + (voice.default ? 2 : 0);
}

function getVoiceToneScore(voice: SpeechSynthesisVoice, language: TutorSpeechLanguage) {
  const name = voice.name.toLowerCase();
  const femaleScore = FEMALE_VOICE_HINTS[language].some((hint) => name.includes(hint)) ? 30 : 0;
  const malePenalty = MALE_VOICE_HINTS.some((hint) => name.includes(hint)) ? -50 : 0;

  return femaleScore + malePenalty;
}

function chooseAvailableTutorVoice(voices: SpeechSynthesisVoice[], language: TutorSpeechLanguage) {
  const voiceNames = AVAILABLE_TUTOR_VOICE_ORDER[language].map((name) => name.toLowerCase());

  for (const voiceName of voiceNames) {
    const voice =
      voices.find((candidate) => candidate.name.toLowerCase() === voiceName) ??
      voices.find((candidate) => candidate.name.toLowerCase().includes(voiceName));

    if (voice) return voice;
  }

  return null;
}

function scoreTutorVoice(voice: SpeechSynthesisVoice, language: TutorSpeechLanguage) {
  const languageScore = getLanguageScore(voice, language);
  const naturalScore = getNaturalScore(voice);
  const toneScore = getVoiceToneScore(voice, language);

  return {
    language: languageScore,
    natural: naturalScore,
    tone: toneScore,
    total: languageScore + naturalScore + toneScore,
  };
}

function chooseTutorVoice(voices: SpeechSynthesisVoice[], language: TutorSpeechLanguage) {
  const scoredVoices = voices
    .map((voice) => ({
      voice,
      score: scoreTutorVoice(voice, language),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  const selectedVoice =
    chooseAvailableTutorVoice(voices, language) ??
    scoredVoices.find(({ score }) => score.language > 0)?.voice ??
    scoredVoices[0]?.voice ??
    null;

  console.table(
    scoredVoices.map(({ voice, score }) => ({
      selected: voice === selectedVoice ? "yes" : "",
      name: voice.name,
      lang: voice.lang,
      local: voice.localService,
      default: voice.default,
      score: score.total,
      language: score.language,
      natural: score.natural,
      tone: score.tone,
    }))
  );

  return selectedVoice;
}

function MessageSources({ sources }: { sources: RagSource[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border/50 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3.5 transition-transform duration-200 text-muted-foreground/60",
            isOpen && "rotate-90 text-brand"
          )}
        />
        <span>Sumber ({sources.length})</span>
      </button>

      {isOpen && (
        <div className="mt-2.5 flex flex-col gap-3 pl-2 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          {sources.map((source) => (
            <div
              key={source.chunkId}
              className="flex flex-col gap-1 px-1 py-1 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <FileText className="size-3.5 shrink-0 text-brand" />
                <span className="truncate">
                  {source.materialTitle} - hal. {source.pageNumber}
                </span>
              </div>
              {source.snippet && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/80 italic">
                  &quot;{source.snippet}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function extractTextFromReactNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromReactNode).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTextFromReactNode(node.props.children);
  }
  return "";
}

function CopyBlockButton({
  content,
  label = "Copy",
  copiedLabel = "Copied!",
  className,
}: {
  content: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("size-7", className)}
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : label}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? copiedLabel : label}</TooltipContent>
    </Tooltip>
  );
}

type MarkdownPreProps = ComponentPropsWithoutRef<"pre"> & {
  node?: unknown;
  children?: ReactNode;
};

function MarkdownPre({ node, children, ...props }: MarkdownPreProps) {
  void node;
  const codeElement = Array.isArray(children) ? children[0] : children;
  let codeString = "";
  let language = "";
  if (isValidElement<{ children?: ReactNode; className?: string }>(codeElement)) {
    codeString = extractTextFromReactNode(codeElement.props.children).replace(/\n$/, "");
    const match = /language-(\w+)/.exec(codeElement.props.className || "");
    if (match) language = match[1];
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl bg-zinc-950 dark:bg-zinc-900 border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 dark:bg-zinc-950 border-b border-border/50">
        <span className="text-xs font-mono font-medium text-zinc-400">{language || "text"}</span>
        <CopyBlockButton 
          content={codeString} 
          label="Copy code" 
          copiedLabel="Copied!" 
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        />
      </div>
      <div className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <pre {...props} className={cn(props.className, "!m-0 !bg-transparent !p-0 font-mono text-zinc-50")}>
          {children}
        </pre>
      </div>
    </div>
  );
}

type MarkdownTableProps = ComponentPropsWithoutRef<"table"> & {
  node?: unknown;
  children?: ReactNode;
};

function MarkdownTable({ node, children, ...props }: MarkdownTableProps) {
  void node;
  const tableRef = useRef<HTMLTableElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!tableRef.current) return;
    try {
      const html = tableRef.current.outerHTML;
      let tsv = "";
      const rows = tableRef.current.querySelectorAll("tr");
      rows.forEach((row) => {
        const cols = row.querySelectorAll("td, th");
        const rowData = Array.from(cols).map((col) => {
          return (col as HTMLElement).innerText.replace(/\n/g, " ").trim();
        });
        tsv += rowData.join("\t") + "\n";
      });

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        try {
          const item = new ClipboardItem({
            "text/plain": new Blob([tsv], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          });
          await navigator.clipboard.write([item]);
        } catch {
          await navigator.clipboard.writeText(tsv);
        }
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tabel");
    }
  };

  return (
    <div className="group relative my-6">
      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 bg-background/50 backdrop-blur-sm text-muted-foreground hover:bg-muted hover:text-foreground border-none"
              onClick={handleCopy}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy table"}</TooltipContent>
        </Tooltip>
      </div>
      <div className="w-full overflow-x-auto">
        <table ref={tableRef} {...props} className={cn(props.className, "w-full")}>
          {children}
        </table>
      </div>
    </div>
  );
}

export type TutorChatMessagesProps = {
  activeSession: TutorChatSession | null;
  loadingSession: boolean;
  sending: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

export function TutorChatMessages({
  activeSession,
  loadingSession,
  sending,
  scrollContainerRef,
  messagesEndRef,
}: TutorChatMessagesProps) {
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRequestIdRef = useRef(0);
  const copiedTimeoutRef = useRef<number | null>(null);
  const lastMessage = activeSession?.messages[activeSession.messages.length - 1];
  const isStreamingEmpty = sending && lastMessage?.senderType === "ai" && !lastMessage.content;
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const cancelCurrentSpeech = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    if (speechUtteranceRef.current) {
      speechUtteranceRef.current.onend = null;
      speechUtteranceRef.current.onerror = null;
    }

    window.speechSynthesis.cancel();
    speechUtteranceRef.current = null;
  }, []);

  const stopSpeech = useCallback(() => {
    speechRequestIdRef.current += 1;
    cancelCurrentSpeech();
    setSpeakingMessageId(null);
  }, [cancelCurrentSpeech]);

  useEffect(() => {
    return () => {
      speechRequestIdRef.current += 1;
      cancelCurrentSpeech();
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, [cancelCurrentSpeech]);

  async function handleCopyMessage(message: TutorMessage) {
    try {
      const plainText = message.content;
      let htmlContent = "";

      const element = document.getElementById(`markdown-content-${message.id}`);
      if (element) {
        const clone = element.cloneNode(true) as HTMLElement;
        // Remove streaming cursor from copied HTML if present
        const cursor = clone.querySelector(".animate-pulse");
        if (cursor) cursor.remove();
        
        // Wrap in a div to ensure it's a valid HTML block when pasted
        htmlContent = `<div>${clone.innerHTML}</div>`;
      }

      if (htmlContent && typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        try {
          const clipboardItem = new ClipboardItem({
            "text/plain": new Blob([plainText], { type: "text/plain" }),
            "text/html": new Blob([htmlContent], { type: "text/html" }),
          });
          await navigator.clipboard.write([clipboardItem]);
        } catch {
          // Fallback if writing multiple formats fails
          await navigator.clipboard.writeText(plainText);
        }
      } else {
        await navigator.clipboard.writeText(plainText);
      }

      setCopiedMessageId(message.id);

      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopiedMessageId(null);
        copiedTimeoutRef.current = null;
      }, 1500);
    } catch {
      toast.error("Gagal menyalin jawaban Tutor AI.");
    }
  }

  async function handleSpeakMessage(message: TutorMessage) {
    if (speakingMessageId === message.id) {
      stopSpeech();
      return;
    }

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      return;
    }

    const text = prepareSpeechText(message.content);
    if (!text) return;

    const requestId = speechRequestIdRef.current + 1;
    speechRequestIdRef.current = requestId;
    cancelCurrentSpeech();
    setSpeakingMessageId(message.id);

    const voices = await getBrowserVoices();
    if (speechRequestIdRef.current !== requestId) return;
    if (voices.length === 0) {
      stopSpeech();
      toast.error("Browser ini tidak menyediakan voice TTS.");
      return;
    }

    const speechLanguage = detectSpeechLanguage(text);
    const selectedVoice = chooseTutorVoice(voices, speechLanguage);
    if (!selectedVoice) {
      stopSpeech();
      toast.error("Tidak ada voice TTS yang bisa dipakai di browser ini.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang || TUTOR_SPEECH_LANGS[speechLanguage];
    utterance.rate = TUTOR_SPEECH_RATE;
    utterance.pitch = TUTOR_SPEECH_PITCH;
    utterance.volume = 1;
    utterance.onend = () => {
      if (speechRequestIdRef.current === requestId) stopSpeech();
    };
    utterance.onerror = () => {
      if (speechRequestIdRef.current === requestId) stopSpeech();
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-6 px-5 pb-8 pt-4">
        {loadingSession ? (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-20 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-16 w-1/2 rounded-2xl" />
            <Skeleton className="h-28 w-3/4 rounded-2xl" />
          </div>
        ) : !activeSession ? (
          <div className="min-h-[60vh]" aria-hidden="true" />
        ) : activeSession.messages.length === 0 ? (
          <div className="min-h-[60vh]" aria-hidden="true" />
        ) : (
          activeSession.messages.map((message) => {
            const isUser = message.senderType === "user";
            const sources = getUniqueSources(getMessageSources(message));
            const isStreaming = sending && message.id.startsWith("streaming-");

            // Skip rendering empty streaming messages — show spinner below instead
            if (isStreaming && !message.content) return null;

            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "rounded-2xl text-sm leading-relaxed",
                    isUser
                      ? "max-w-[85%] bg-primary px-4 py-3 text-primary-foreground"
                      : "w-full py-1 text-foreground"
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  ) : (
                    <>
                      <div 
                        id={`markdown-content-${message.id}`}
                        className="prose prose-base max-w-none break-words dark:prose-invert"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                          rehypePlugins={[rehypeRaw, rehypeKatex]}
                          components={{
                            pre: MarkdownPre,
                            table: MarkdownTable,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {isStreaming && (
                          <span className="inline-block h-4 w-0.5 animate-pulse bg-brand align-text-bottom" />
                        )}
                      </div>

                      {!isStreaming && message.content.trim() && (
                        <div className="mt-3 flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className={cn(
                                  "size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
                                  speakingMessageId === message.id && "bg-muted text-foreground"
                                )}
                                onClick={() => void handleSpeakMessage(message)}
                                aria-label={
                                  speakingMessageId === message.id
                                    ? "Hentikan audio Tutor AI"
                                    : "Dengarkan jawaban Tutor AI"
                                }
                              >
                                {speakingMessageId === message.id ? (
                                  <Square className="size-3.5 fill-current" />
                                ) : (
                                  <Volume2 className="size-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {speakingMessageId === message.id ? "Stop" : "Speak"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className={cn(
                                  "size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
                                  copiedMessageId === message.id && "text-foreground"
                                )}
                                onClick={() => void handleCopyMessage(message)}
                                aria-label="Salin jawaban Tutor AI"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="size-4" />
                                ) : (
                                  <Copy className="size-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {copiedMessageId === message.id ? "Copied" : "Copy Response"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </>
                  )}

                  {!isUser && !isStreaming && <MessageSources sources={sources} />}
                </div>
              </div>
            );
          })
        )}

        {isStreamingEmpty && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Tutor AI sedang menjawab...
            </div>
          </div>
        )}
        {/* Clearance for floating input area */}
        <div className="h-28" aria-hidden="true" />
        <div ref={messagesEndRef} />

        {/* Spacer: provides scroll room so user's message can appear at top when sending */}
        {sending && <div className="min-h-[60vh]" aria-hidden="true" />}
      </div>
    </div>
  );
}
