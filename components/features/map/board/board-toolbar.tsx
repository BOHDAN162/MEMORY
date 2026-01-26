import {
  ArrowUpRight,
  CornerDownLeft,
  CornerUpLeft,
  Grid2X2,
  Hand,
  Image as ImageIcon,
  Link2,
  MousePointer2,
  RectangleHorizontal,
  Redo2,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  View,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { BoardTool } from "@/components/features/map/board/board-types";

type BoardToolbarProps = {
  activeTool: BoardTool;
  onToolChange: (tool: BoardTool) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onFitView: () => void;
  onToggleSnap: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canDelete: boolean;
  canReorder: boolean;
  snapToGrid: boolean;
  saveState: "idle" | "saving" | "saved" | "error" | "offline";
  saveMessage: string;
};

const TOOL_ITEMS: Array<{
  tool: BoardTool;
  label: string;
  icon: typeof MousePointer2;
  shortcut: string;
}> = [
  { tool: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { tool: "hand", label: "Hand", icon: Hand, shortcut: "H" },
  { tool: "text", label: "Text", icon: Type, shortcut: "T" },
  { tool: "sticky", label: "Sticky", icon: StickyNote, shortcut: "N" },
  { tool: "card", label: "Card", icon: RectangleHorizontal, shortcut: "C" },
  { tool: "image", label: "Image", icon: ImageIcon, shortcut: "I" },
  { tool: "frame", label: "Frame", icon: Square, shortcut: "F" },
  { tool: "connect", label: "Connect", icon: Link2, shortcut: "L" },
];

export const BoardToolbar = ({
  activeTool,
  onToolChange,
  onDelete,
  onUndo,
  onRedo,
  onSave,
  onBringToFront,
  onSendToBack,
  onFitView,
  onToggleSnap,
  canUndo,
  canRedo,
  canDelete,
  canReorder,
  snapToGrid,
  saveState,
  saveMessage,
}: BoardToolbarProps) => {
  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-border/80 bg-background/90 p-3 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {TOOL_ITEMS.map(({ tool, label, icon: Icon, shortcut }) => {
          const isActive = activeTool === tool;
          return (
            <button
              key={tool}
              type="button"
              onClick={() => onToolChange(tool)}
              className={buttonVariants({
                variant: isActive ? "primary" : "soft",
                size: "sm",
                className: "relative flex items-center gap-2",
              })}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {shortcut}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="soft"
          className="h-9 gap-2"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="h-4 w-4" />
          Undo
          <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            ⌘Z
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="soft"
          className="h-9 gap-2"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 className="h-4 w-4" />
          Redo
          <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            ⇧⌘Z
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="soft"
          className={cn("h-9 gap-2", canDelete && "text-destructive")}
          onClick={onDelete}
          disabled={!canDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button
          type="button"
          size="sm"
          variant="soft"
          className="h-9 gap-2"
          onClick={onBringToFront}
          disabled={!canReorder}
        >
          <ArrowUpRight className="h-4 w-4" />
          Front
        </Button>
        <Button
          type="button"
          size="sm"
          variant="soft"
          className="h-9 gap-2"
          onClick={onSendToBack}
          disabled={!canReorder}
        >
          <CornerDownLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" size="sm" variant="primary" className="h-9 gap-2" onClick={onSave}>
          <CornerUpLeft className="h-4 w-4" />
          Сохранить
        </Button>
        <Button type="button" size="sm" variant="soft" className="h-9 gap-2" onClick={onFitView}>
          <View className="h-4 w-4" />
          Fit
          <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            0
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={snapToGrid ? "primary" : "soft"}
          className="h-9 gap-2"
          onClick={onToggleSnap}
        >
          <Grid2X2 className="h-4 w-4" />
          Snap
        </Button>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold",
            saveState === "saving" && "bg-primary/10 text-primary",
            saveState === "saved" && "bg-emerald-500/15 text-emerald-300",
            saveState === "error" && "bg-destructive/15 text-destructive",
            saveState === "offline" && "bg-destructive/15 text-destructive",
            saveState === "idle" && "bg-muted/40 text-muted-foreground",
          )}
        >
          {saveMessage}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>V — Select</span>
        <span>H — Hand</span>
        <span>T — Text</span>
        <span>N — Sticky</span>
        <span>C — Card</span>
        <span>L — Connect</span>
        <span>Delete — Remove</span>
      </div>
    </div>
  );
};
