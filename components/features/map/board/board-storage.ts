import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BoardEdgeRecord, BoardNodeRecord } from "@/lib/types";

export type BoardStorageError = {
  message: string;
  missingTables: boolean;
};

export type BoardStorageData = {
  boardId: string;
  nodes: BoardNodeRecord[];
  edges: BoardEdgeRecord[];
};

const isMissingTableError = (message: string) =>
  message.includes("Could not find the table") ||
  message.includes("relation \"boards\" does not exist") ||
  message.includes("relation \"board_nodes\" does not exist") ||
  message.includes("relation \"board_edges\" does not exist");

const toStorageError = (message: string): BoardStorageError => ({
  message,
  missingTables: isMissingTableError(message),
});

const ensureBoard = async (supabase: SupabaseClient, userId: string) => {
  const { data: existing, error } = await supabase
    .from("boards")
    .select("id,user_id,title")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: toStorageError(error.message) };
  }

  if (existing?.id) {
    return { data: existing as { id: string; user_id: string; title: string }, error: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("boards")
    .insert({ user_id: userId, title: "Моя доска" })
    .select("id,user_id,title")
    .single();

  if (insertError) {
    return { data: null, error: toStorageError(insertError.message) };
  }

  return { data: created as { id: string; user_id: string; title: string }, error: null };
};

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

  const boardResult = await ensureBoard(supabase, authUser.user.id);

  if (boardResult.error || !boardResult.data) {
    return { data: null, error: boardResult.error ?? { message: "Unable to ensure board", missingTables: false } };
  }

  const [nodesResult, edgesResult] = await Promise.all([
    supabase
      .from("board_nodes")
      .select("id,type,position,data,width,height,z_index")
      .eq("board_id", boardResult.data.id),
    supabase
      .from("board_edges")
      .select("id,source,target,data,style")
      .eq("board_id", boardResult.data.id),
  ]);

  if (nodesResult.error) {
    return { data: null, error: toStorageError(nodesResult.error.message) };
  }

  if (edgesResult.error) {
    return { data: null, error: toStorageError(edgesResult.error.message) };
  }

  const nodes: BoardNodeRecord[] =
    nodesResult.data?.map((row) => ({
      id: row.id as string,
      type: row.type as BoardNodeRecord["type"],
      position: row.position as BoardNodeRecord["position"],
      data: (row.data as BoardNodeRecord["data"]) ?? null,
      width: typeof row.width === "number" ? row.width : undefined,
      height: typeof row.height === "number" ? row.height : undefined,
      zIndex: typeof row.z_index === "number" ? row.z_index : undefined,
    })) ?? [];

  const edges: BoardEdgeRecord[] =
    edgesResult.data?.map((row) => ({
      id: row.id as string,
      source: row.source as string,
      target: row.target as string,
      data: (row.data as BoardEdgeRecord["data"]) ?? null,
      style: (row.style as BoardEdgeRecord["style"]) ?? null,
    })) ?? [];

  return {
    data: {
      boardId: boardResult.data.id,
      nodes,
      edges,
    },
    error: null,
  };
};

export const persistBoardStorage = async ({
  boardId,
  nodes,
  edges,
  deletedNodeIds,
  deletedEdgeIds,
}: {
  boardId: string;
  nodes: BoardNodeRecord[];
  edges: BoardEdgeRecord[];
  deletedNodeIds: string[];
  deletedEdgeIds: string[];
}): Promise<{ error: BoardStorageError | null }> => {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { error: { message: "Supabase client is not configured.", missingTables: false } };
  }

  const nodePayload = nodes.map((node) => ({
    id: node.id,
    board_id: boardId,
    type: node.type,
    position: node.position,
    data: node.data ?? {},
    width: node.width ?? null,
    height: node.height ?? null,
    z_index: node.zIndex ?? 0,
  }));

  const edgePayload = edges.map((edge) => ({
    id: edge.id,
    board_id: boardId,
    source: edge.source,
    target: edge.target,
    data: edge.data ?? {},
    style: edge.style ?? {},
  }));

  const [nodesResult, edgesResult, deleteNodesResult, deleteEdgesResult] = await Promise.all([
    nodePayload.length > 0
      ? supabase.from("board_nodes").upsert(nodePayload, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    edgePayload.length > 0
      ? supabase.from("board_edges").upsert(edgePayload, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    deletedNodeIds.length > 0
      ? supabase.from("board_nodes").delete().eq("board_id", boardId).in("id", deletedNodeIds)
      : Promise.resolve({ error: null }),
    deletedEdgeIds.length > 0
      ? supabase.from("board_edges").delete().eq("board_id", boardId).in("id", deletedEdgeIds)
      : Promise.resolve({ error: null }),
  ]);

  const errorMessage =
    nodesResult.error?.message ||
    edgesResult.error?.message ||
    deleteNodesResult.error?.message ||
    deleteEdgesResult.error?.message ||
    null;

  if (errorMessage) {
    return { error: toStorageError(errorMessage) };
  }

  return { error: null };
};
