"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TutorChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  handleSend: () => void | Promise<void>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function TutorChatInput({
  input,
  setInput,
  sending,
  handleSend,
  textareaRef,
}: TutorChatInputProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
      {/* Gradient fade */}
      <div className="pointer-events-none h-10 w-full bg-gradient-to-t from-background to-transparent" />

      {/* Input container */}
      <div className="w-full bg-background px-5 pb-4 pt-0">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[26px] border bg-card p-1.5 shadow-lg shadow-black/5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
              if (event.key === "ArrowUp" && !input.trim() && !sending) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Tulis pertanyaan..."
            disabled={sending}
            rows={1}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            size="icon"
            className="mb-0.5 size-10 shrink-0 rounded-full bg-brand text-black hover:bg-brand/90"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            aria-label="Kirim pertanyaan"
          >
            {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          Tutor AI bisa melakukan kesalahan. Cek informasi penting.
        </p>
      </div>
    </div>
  );
}
