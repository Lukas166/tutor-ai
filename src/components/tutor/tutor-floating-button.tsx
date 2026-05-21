"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TutorFloatingButtonProps = {
  href: string;
};

export function TutorFloatingButton({ href }: TutorFloatingButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="icon"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-brand text-black shadow-lg shadow-black/15 hover:bg-brand/90 focus-visible:ring-brand/50"
          aria-label="Buka Tutor AI Chat"
        >
          <Link href={href}>
            <MessageCircle />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8}>
        Tutor AI Chat
      </TooltipContent>
    </Tooltip>
  );
}
