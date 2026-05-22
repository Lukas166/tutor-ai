"use client";

import { useEffect, type ReactNode } from "react";
import { ArrowUp, Check, Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TutorChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  recording: boolean;
  recordingLevels: number[];
  handleSend: () => void | Promise<void>;
  handleStop: () => void;
  handleStartRecording: () => void | Promise<void>;
  handleCancelRecording: () => void;
  handleConfirmRecording: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const RECORDING_BAR_COUNT = 96;
const EMPTY_RECORDING_LEVELS = Array.from({ length: RECORDING_BAR_COUNT }, () => 0);

function InputButtonTooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="gap-2 rounded-lg px-2.5 py-1.5">
        <span>{label}</span>
        {shortcut && (
          <kbd
            data-slot="kbd"
            className="rounded bg-background/15 px-1.5 py-0.5 font-sans text-[10px] leading-none text-background/90"
          >
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function TutorChatInput({
  input,
  setInput,
  sending,
  recording,
  recordingLevels,
  handleSend,
  handleStop,
  handleStartRecording,
  handleCancelRecording,
  handleConfirmRecording,
  textareaRef,
}: TutorChatInputProps) {
  const submitDisabled = !input.trim() && !recording;
  const visualLevels =
    recordingLevels.length === RECORDING_BAR_COUNT ? recordingLevels : EMPTY_RECORDING_LEVELS;

  useEffect(() => {
    function handleInputShortcut(event: KeyboardEvent) {
      if (event.isComposing) return;

      if (recording && event.key === "Escape") {
        event.preventDefault();
        handleCancelRecording();
        return;
      }

      if (recording && event.key === "Enter") {
        event.preventDefault();
        handleConfirmRecording();
        return;
      }

      if (sending && event.key === "Escape") {
        event.preventDefault();
        handleStop();
      }
    }

    window.addEventListener("keydown", handleInputShortcut);
    return () => window.removeEventListener("keydown", handleInputShortcut);
  }, [handleCancelRecording, handleConfirmRecording, handleStop, recording, sending]);

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
      {/* Gradient fade */}
      <div className="pointer-events-none h-10 w-full bg-gradient-to-t from-background to-transparent" />

      {/* Input container */}
      <div className="w-full bg-background px-5 pb-4 pt-0">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[26px] border bg-card p-1.5 pr-3 shadow-lg shadow-black/5">
          <div className="min-h-11 flex-1">
            {recording ? (
              <div className="flex h-11 min-w-0 items-center px-4">
                <div className="flex h-9 min-w-0 flex-1 items-center justify-between gap-0.5 overflow-hidden" aria-hidden="true">
                  {visualLevels.map((level, index) => (
                    <span
                      key={index}
                      className="w-0.5 shrink-0 rounded-full bg-black/70 transition-[height] duration-150"
                      style={{
                        height: `${3 + Math.round(level * 31)}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (sending) return;
                    void handleSend();
                  }
                }}
                placeholder="Tulis pertanyaan..."
                rows={1}
                className="block box-border h-11 min-h-11 max-h-40 w-full resize-none overflow-hidden bg-transparent px-4 py-[11px] text-sm leading-[22px] outline-none placeholder:text-muted-foreground"
              />
            )}
          </div>
          <InputButtonTooltip
            label={recording ? "Cancel" : "Voice input"}
            shortcut={recording ? "Esc" : undefined}
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-11 shrink-0 rounded-full border-0 bg-transparent text-black shadow-none hover:bg-muted hover:text-black"
              onClick={recording ? handleCancelRecording : () => void handleStartRecording()}
              disabled={sending}
              aria-label={recording ? "Cancel" : "Voice input"}
            >
              {recording ? <X className="size-5" /> : <Mic className="size-5" />}
            </Button>
          </InputButtonTooltip>
          {sending ? (
            <InputButtonTooltip label="Stop generating" shortcut="Esc">
              <Button
                size="icon"
                className="size-11 shrink-0 rounded-full bg-brand text-black hover:bg-brand/90"
                onClick={handleStop}
                aria-label="Stop generating"
              >
                <Square className="size-4 fill-current" />
              </Button>
            </InputButtonTooltip>
          ) : (
            <InputButtonTooltip
              label={recording ? "Finish" : "Send Prompt"}
              shortcut={recording ? "Enter" : "Enter"}
            >
              <Button
                size="icon"
                variant={recording ? "ghost" : "default"}
                className={cn(
                  "size-11 shrink-0 rounded-full text-black",
                  recording
                    ? "border-0 bg-transparent shadow-none hover:bg-muted hover:text-black"
                    : "bg-brand hover:bg-brand/90"
                )}
                onClick={recording ? handleConfirmRecording : () => void handleSend()}
                disabled={submitDisabled}
                aria-label={recording ? "Finish recording" : "Send Prompt"}
              >
                {recording ? <Check className="size-5" /> : <ArrowUp className="size-5" />}
              </Button>
            </InputButtonTooltip>
          )}
        </div>

        {/* Disclaimer */}
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          Tutor AI bisa saja melakukan kesalahan. Cek kembali materimu.
        </p>
      </div>
    </div>
  );
}
