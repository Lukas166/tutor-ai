import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import React from "react";

export interface UserSelectionItem {
  id: string;
  name: string;
  email: string;
  badge?: string | null;
  subText?: string | null;
}

interface UserSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: (query: string) => void;
  
  availableItems: UserSelectionItem[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  
  emptyStateIcon: React.ReactNode;
  emptyStateText: string;
  itemNoun: string;
  
  submitLabel: string;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function UserSelectionDialog({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder,
  searchInput,
  onSearchInputChange,
  onSearch,
  availableItems,
  selectedIds,
  onSelectedIdsChange,
  emptyStateIcon,
  emptyStateText,
  itemNoun,
  submitLabel,
  onSubmit,
  isSubmitting,
}: UserSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-6 border-b bg-muted/30 pr-16 shrink-0">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 bg-background shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearch(searchInput);
                  }
                }}
                className="pl-9 bg-background"
              />
            </div>
            <div className="mt-4 flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`selectAll-${title.replace(/\s+/g, "")}`}
                  checked={availableItems.length > 0 && selectedIds.length === availableItems.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectedIdsChange(availableItems.map((item) => item.id));
                    } else {
                      onSelectedIdsChange([]);
                    }
                  }}
                />
                <Label
                  htmlFor={`selectAll-${title.replace(/\s+/g, "")}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Pilih Semua
                </Label>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 max-h-[55vh] overflow-y-auto bg-muted/5 pr-6">
            {availableItems.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
                <div className="mb-4 opacity-20">{emptyStateIcon}</div>
                <p className="text-base">{emptyStateText}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectedIdsChange(
                        selectedIds.includes(item.id)
                          ? selectedIds.filter((id) => id !== item.id)
                          : [...selectedIds, item.id]
                      );
                    }}
                    className="flex items-center space-x-3 p-4 rounded-xl border bg-background hover:border-brand/50 hover:shadow-sm cursor-pointer transition-all"
                  >
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) => {
                        onSelectedIdsChange(
                          checked
                            ? [...selectedIds, item.id]
                            : selectedIds.filter((id) => id !== item.id)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {item.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {item.badge && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md border text-[10px] shrink-0">
                            {item.badge}
                          </span>
                        )}
                        <span className="truncate">{item.subText ? item.subText : item.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="m-0 px-6 py-4 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground font-medium">
            {selectedIds.length} dari {availableItems.length} {itemNoun} terpilih
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10">
              Batal
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || selectedIds.length === 0}
              className="h-10 bg-brand text-white hover:bg-brand/80 transition-all active:scale-[0.98]"
            >
              {isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
