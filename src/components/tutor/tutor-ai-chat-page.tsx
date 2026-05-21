"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TutorMaterial = {
  id: string;
  title: string;
  fileName: string;
  sessionId: string;
  sessionTitle: string;
  pageCount: number;
  chunkCount: number;
  createdAt: string;
};

type TutorChatSessionSummary = {
  id: string;
  title: string;
  messageCount: number;
  startedAt: string;
  lastActiveAt: string;
};

type TutorMessage = {
  id: string;
  senderType: "user" | "ai" | string;
  content: string;
  ragSources: unknown;
  responseTimeMs: number | null;
  createdAt: string;
};

type TutorChatSession = {
  id: string;
  courseId: string;
  selectedMaterialIds: string[];
  startedAt: string;
  lastActiveAt: string;
  messages: TutorMessage[];
};

type TutorOverview = {
  course: {
    id: string;
    title: string;
    description: string | null;
    isActive: boolean;
  };
  user: {
    academicLevel: "S1" | "S2" | "S3";
    role: string;
  };
  readyMaterials: TutorMaterial[];
  chatSessions: TutorChatSessionSummary[];
};

type RagSource = {
  chunkId: string;
  materialId: string;
  materialTitle: string;
  fileName: string;
  sessionTitle: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
  snippet: string;
};

type TutorAiChatPageProps = {
  courseId: string;
  backHref: string;
};

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
        <ChevronRight className={cn("size-3.5 transition-transform duration-200 text-muted-foreground/60", isOpen && "rotate-90 text-brand")} />
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

function sessionSummaryFromChat(session: TutorChatSession): TutorChatSessionSummary {
  const firstUserMessage = session.messages.find((message) => message.senderType === "user");

  return {
    id: session.id,
    title: firstUserMessage?.content.slice(0, 72) || "Chat baru",
    messageCount: session.messages.length,
    startedAt: session.startedAt,
    lastActiveAt: session.lastActiveAt,
  };
}

/* ================================================================
   Sidebar Toggle Icon — panel layout icon like Claude/ChatGPT
   ================================================================ */
function SidebarToggleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1.5" y="2.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="6.5" y1="2.5" x2="6.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function TutorAiChatPage({ courseId, backHref }: TutorAiChatPageProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

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
    creatingChat || (activeSession !== null && activeSession.messages.length === 0);

  // Search-filtered sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return chatSessions;
    const q = searchQuery.toLowerCase();
    return chatSessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [chatSessions, searchQuery]);

  const loadSession = useCallback(
    async (sessionId: string) => {
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

  // Scroll to bottom instantly when session loads or changes
  useEffect(() => {
    if (!loadingSession && activeSession) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.id, loadingSession]);

  // Smooth scroll for new messages
  useEffect(() => {
    if (!loadingSession && activeSession) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeSession?.messages.length, sending]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

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
        return;
      }
    }

    const pendingMessage: TutorMessage = {
      id: `pending-${Date.now()}`,
      senderType: "user",
      content: question,
      ragSources: null,
      responseTimeMs: null,
      createdAt: new Date().toISOString(),
    };

    setActiveSession({
      ...session,
      id: realSessionId,
      messages: [...session.messages, pendingMessage],
    });

    try {
      const response = await fetch(
        `/api/courses/${courseId}/tutor/sessions/${realSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: question }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Tutor AI gagal menjawab");

      setActiveSession(data);
      setChatSessions((sessions) => {
        const summary = sessionSummaryFromChat(data);
        const others = sessions.filter((item) => item.id !== summary.id);
        return [summary, ...others];
      });
    } catch (err) {
      setActiveSession({ ...session, id: realSessionId });
      setInput(question);
      toast.error(err instanceof Error ? err.message : "Tutor AI gagal menjawab");
    } finally {
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
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col bg-muted/30 transition-all duration-300 z-50 border-r",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:bg-background",
          sidebarOpen ? "w-72" : "w-16 max-md:-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className={cn("flex h-14 shrink-0 items-center", sidebarOpen ? "justify-between px-5" : "justify-center px-0")}>
          {sidebarOpen && <span className="text-lg font-bold truncate">Tutor AI Chat</span>}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Toggle sidebar"
              >
                <SidebarToggleIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{sidebarOpen ? "Tutup panel" : "Buka panel"}</TooltipContent>
          </Tooltip>
        </div>

        {/* Menu Items — New Chat & Search */}
        <div className="flex flex-col gap-2 px-3 mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={createNewChat}
                disabled={isNewChatDisabled}
                className={cn(
                  "flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors",
                  sidebarOpen ? "gap-4 px-4" : "justify-center px-0",
                  isNewChatDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted"
                )}
              >
                {creatingChat ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="size-4 shrink-0" />
                )}
                {sidebarOpen && <span className="truncate">New chat</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={sidebarOpen}>New chat</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setSearchOpen(true); setSearchQuery(""); }}
                className={cn(
                  "flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors hover:bg-muted",
                  sidebarOpen ? "gap-4 px-4" : "justify-center px-0"
                )}
              >
                <Search className="size-4 shrink-0" />
                {sidebarOpen && <span className="truncate">Search</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={sidebarOpen}>Search</TooltipContent>
          </Tooltip>
        </div>

        {/* Chats Label */}
        {sidebarOpen ? (
          <div className="mt-6 px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chats
            </span>
          </div>
        ) : (
          <div className="mt-6 mb-2 border-t mx-4" />
        )}

        {/* Session List */}
        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
          <div className="flex flex-col gap-1">
            {chatSessions.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                {sidebarOpen ? "Belum ada chat." : "-"}
              </div>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group/session relative flex items-center rounded-lg transition-colors",
                    activeSession?.id === session.id ? "bg-muted" : "hover:bg-muted/60",
                    !sidebarOpen && "justify-center h-11"
                  )}
                >
                  {renamingSessionId === session.id && sidebarOpen ? (
                    <div className="flex w-full items-center gap-1.5 px-3 py-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleRenameSession();
                          if (e.key === "Escape") setRenamingSessionId(null);
                        }}
                        autoFocus
                        className="min-w-0 flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                        disabled={savingRename}
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => void handleRenameSession()}
                        disabled={savingRename}
                      >
                        {savingRename ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setRenamingSessionId(null)}
                        disabled={savingRename}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => loadSession(session.id)}
                            className={cn(
                              "flex min-w-0 flex-1 items-center",
                              sidebarOpen ? "px-4 py-2.5 text-left" : "justify-center h-full w-full"
                            )}
                          >
                            {!sidebarOpen ? (
                              <MessageCircle className="size-4 shrink-0" />
                            ) : (
                              <span className="truncate text-sm">{session.title}</span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" hidden={sidebarOpen}>{session.title}</TooltipContent>
                      </Tooltip>

                      {/* More Actions — visible on hover */}
                      {sidebarOpen && (
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/session:opacity-100 data-[state=open]:opacity-100">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => { setRenamingSessionId(session.id); setRenameValue(session.title); }}>
                                  <Pencil className="mr-2 size-4" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteSessionId(session.id)}>
                                  <Trash2 className="mr-2 size-4" /> Hapus
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Footer — Back button */}
        <div className="shrink-0 px-3 pb-4 pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => router.push(backHref)}
                className={cn(
                  "flex h-11 w-full items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  sidebarOpen ? "gap-4 px-4" : "justify-center px-0"
                )}
              >
                <ArrowLeft className="size-4 shrink-0" />
                {sidebarOpen && <span className="truncate">Kembali ke course</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={sidebarOpen}>Kembali ke course</TooltipContent>
          </Tooltip>
        </div>
      </aside>

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
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pb-52 pt-4">
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

        {/* ==================== FLOATING INPUT AREA ==================== */}
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
                onClick={handleSend}
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
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[620px] p-6 sm:p-8">
          <DialogHeader className="pr-8">
            <DialogTitle>Konteks Materi</DialogTitle>
            <DialogDescription>
              Pilih dokumen PDF yang akan dijadikan sumber pengetahuan Tutor AI untuk menjawab pertanyaan di sesi chat ini.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-2">
            {readyMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
                Belum ada materi PDF yang siap digunakan untuk course ini.
              </div>
            ) : (
              readyMaterials.map((material) => {
                const isSelected = selectedMaterialSet.has(material.id);
                return (
                  <label
                    key={material.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-5 rounded-2xl border bg-background p-5 shadow-sm transition-all hover:bg-muted/40",
                      isSelected ? "border-brand ring-1 ring-brand/20" : "border-border"
                    )}
                  >
                    <div className="flex shrink-0 items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        disabled={!activeSession || savingContext}
                        onCheckedChange={(checked: boolean | "indeterminate") =>
                          void handleMaterialToggle(material.id, checked === true)
                        }
                        aria-label={`Aktifkan ${material.title}`}
                      />
                    </div>
                    
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <FileText className="size-6" />
                    </div>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold leading-tight text-foreground">
                        {material.title}
                      </span>
                      <span className="mt-1.5 block truncate text-sm text-muted-foreground">
                        Materi: {material.sessionTitle}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

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
