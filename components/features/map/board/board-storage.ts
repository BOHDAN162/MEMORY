import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteBoardEdges,
  deleteBoardNodes,
  ensureBoardForUser,
  fetchBoardEdges,
  fetchBoardNodes,
  fetchBoardViewport,
  upsertBoardEdges,
  upsertBoardNodes,
  upsertBoardViewport,
} from "@/lib/supabase/board";
import type { BoardEdgeRecord, BoardNodeRecord, BoardViewport } from "@/lib/types";

export type BoardStorageError = {
  message: string;
  missingTables: boolean;
};

export type BoardStorageData = {
  boardId: string;
  nodes: BoardNodeRecord[];
  edges: BoardEdgeRecord[];
  viewport: BoardViewport;
};

const isMissingTableError = (message: string) =>
  message.includes("Could not find the table") ||
  message.includes("relation \"boards\" does not exist") ||
  message.includes("relation \"board_nodes\" does not exist") ||
  message.includes("relation \"board_edges\" does not exist") ||
  message.includes("relation \"board_viewport\" does not exist");

const toStorageError = (message: string): BoardStorageError => ({
  message,
  missingTables: isMissingTableError(message),
});

export const loadBoardStorage = async (): Promise<
  { data: BoardStorageData; error: null } | { data: null; error: BoardStorageError }
> => {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { data: null, error: { message: "Supabase client is not configured.", missingTables: false } };
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    return { data: null, error: { message: "Not authenticated", missingTables: false } };
  }

  const boardResult = await ensureBoardForUser(supabase, authUser.user.id);

  if (boardResult.error || !boardResult.data) {
    return {
      data: null,
      error: boardResult.error ? toStorageError(boardResult.error) : { message: "Unable to ensure board", missingTables: false },
    };
  }

  const [nodesResult, edgesResult, viewportResult] = await Promise.all([
    fetchBoardNodes(supabase, boardResult.data.id),
    fetchBoardEdges(supabase, boardResult.data.id),
    fetchBoardViewport(supabase, boardResult.data.id),
  ]);

  if (nodesResult.error) {
    return { data: null, error: toStorageError(nodesResult.error) };
  }

  if (edgesResult.error) {
    return { data: null, error: toStorageError(edgesResult.error) };
  }

  if (viewportResult.error) {
    return { data: null, error: toStorageError(viewportResult.error) };
  }

  return {
    data: {
      boardId: boardResult.data.id,
      nodes: nodesResult.data,
      edges: edgesResult.data,
      viewport: viewportResult.data ?? { x: 0, y: 0, zoom: 1 },
    },
    error: null,
  };
};

export const persistBoardStorage = async ({
  boardId,
  nodes,
  edges,
  viewport,
  deletedNodeIds,
  deletedEdgeIds,
}: {
  boardId: string;
  nodes: BoardNodeRecord[];
  edges: BoardEdgeRecord[];
  viewport: BoardViewport;
  deletedNodeIds: string[];
  deletedEdgeIds: string[];
}): Promise<{ error: BoardStorageError | null }> => {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { error: { message: "Supabase client is not configured.", missingTables: false } };
  }

  const [nodesResult, edgesResult, viewportResult, deleteNodesResult, deleteEdgesResult] = await Promise.all([
    upsertBoardNodes(supabase, boardId, nodes),
    upsertBoardEdges(supabase, boardId, edges),
    upsertBoardViewport(supabase, boardId, viewport),
    deleteBoardNodes(supabase, boardId, deletedNodeIds),
    deleteBoardEdges(supabase, boardId, deletedEdgeIds),
  ]);

  const errorMessage =
    nodesResult.error ||
    edgesResult.error ||
    viewportResult.error ||
    deleteNodesResult.error ||
    deleteEdgesResult.error ||
    null;

  if (errorMessage) {
    return { error: toStorageError(errorMessage) };
  }

  return { error: null };
};
