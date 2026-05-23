"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessageCircle,
  Search,
  Settings2,
} from "lucide-react";
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
import { TutorChatInput, type TutorPanelMode } from "./tutor-chat-input";
import { TutorChatContextDialog } from "./tutor-chat-context-dialog";

import type { TutorAiChatPageProps } from "./tutor-chat-types";
import { useTutorChat } from "./hooks/use-tutor-chat";
import { useTutorSpeech } from "./hooks/use-tutor-speech";

const CHAT_INPUT_MIN_HEIGHT = 44;

export function TutorAiChatPage({ courseId, backHref }: TutorAiChatPageProps) {
  const router = useRouter();
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [panelMode, setPanelMode] = useState<TutorPanelMode>("chat");

  const {
    overview,
    chatSessions,
    activeSession,
    loadingOverview,
    loadingSession,
    creatingChat,
    sending,
    savingContext,
    
    renamingSessionId,
    setRenamingSessionId,
    renameValue,
    setRenameValue,
    savingRename,
    
    deleteSessionId,
    setDeleteSessionId,
    deletingSession,

    readyMaterials,
    selectedMaterialSet,
    isNewChatDisabled,

    loadOverview,
    loadSession,
    createNewChat,
    handleMaterialToggle,
    handleRenameSession,
    handleDeleteSession,
    handleStop,
    handleSend,
  } = useTutorChat({ courseId, input, setInput });

  const {
    recording,
    recordingLevels,
    handleStartRecording,
    handleCancelRecording,
    handleConfirmRecording,
  } = useTutorSpeech({ input, setInput, sending });

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // Search-filtered sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return chatSessions;
    const q = searchQuery.toLowerCase();
    return chatSessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [chatSessions, searchQuery]);

  // Helper to scroll to the latest messages
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
  }, [activeSession, loadingSession, scrollToMessages]);

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
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 px-5">
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

        {/* Messages area */}
        {panelMode === "chat" ? (
          <TutorChatMessages
            activeSession={activeSession}
            loadingSession={loadingSession}
            sending={sending}
            scrollContainerRef={scrollContainerRef}
            messagesEndRef={messagesEndRef}
          />
        ) : (
          <div className="flex-1 bg-white" aria-label="Area avatar kosong" />
        )}

        {/* ==================== FLOATING INPUT AREA ==================== */}
        <TutorChatInput
          input={input}
          setInput={setInput}
          panelMode={panelMode}
          setPanelMode={setPanelMode}
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
