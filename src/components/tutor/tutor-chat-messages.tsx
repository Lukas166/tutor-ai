"use client";

import { useState } from "react";
import { ChevronRight, FileText, Loader2, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { Skeleton } from "@/components/ui/skeleton";
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
                  "{source.snippet}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
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
  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pb-28 pt-4">
        {loadingSession ? (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-20 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-16 w-1/2 rounded-2xl" />
            <Skeleton className="h-28 w-3/4 rounded-2xl" />
          </div>
        ) : !activeSession ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand/10">
              <MessageCircle className="size-8 text-brand" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">
                Mulai bertanya tentang materi course.
              </p>
              <p className="mt-1.5 text-sm">
                Chat baru akan memakai semua PDF ready sebagai konteks default.
              </p>
            </div>
          </div>
        ) : activeSession.messages.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand/10">
              <MessageCircle className="size-8 text-brand" strokeWidth={1.5} />
            </div>
            <p className="text-sm">Ajukan pertanyaan tentang materi PDF course ini.</p>
          </div>
        ) : (
          activeSession.messages.map((message) => {
            const isUser = message.senderType === "user";
            const sources = getUniqueSources(getMessageSources(message));

            return (
              <div
                key={message.id}
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
                    <div className="prose prose-sm max-w-none break-words dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {!isUser && <MessageSources sources={sources} />}
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Tutor AI sedang menjawab...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
