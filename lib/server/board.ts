import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureBoardForUser,
  fetchBoardEdges,
  fetchBoardNodes,
  fetchBoardViewport,
} from "@/lib/supabase/board";
import type { BoardEdgeRecord, BoardNodeRecord, BoardViewport, ServiceResponse } from "@/lib/types";

export type BoardData = {
  boardId: string;
  nodes: BoardNodeRecord[];
  edges: BoardEdgeRecord[];
  viewport: BoardViewport | null;
};

export const getCurrentUserBoardData = async (): Promise<ServiceResponse<BoardData>> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data: board, error: boardError } = await ensureBoardForUser(supabase, authUser.user.id);

  if (boardError || !board) {
    return { data: null, error: boardError ?? "Unable to create board." };
  }

  const [nodesResult, edgesResult, viewportResult] = await Promise.all([
    fetchBoardNodes(supabase, board.id),
    fetchBoardEdges(supabase, board.id),
    fetchBoardViewport(supabase, board.id),
  ]);

  if (nodesResult.error) {
    return { data: null, error: nodesResult.error };
  }

  if (edgesResult.error) {
    return { data: null, error: edgesResult.error };
  }

  if (viewportResult.error) {
    return { data: null, error: viewportResult.error };
  }

  return {
    data: {
      boardId: board.id,
      nodes: nodesResult.data,
      edges: edgesResult.data,
      viewport: viewportResult.data ?? null,
    },
    error: null,
  };
};
