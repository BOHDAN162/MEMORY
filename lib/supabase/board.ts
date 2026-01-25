import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardEdgeRecord, BoardNodeRecord, BoardViewport } from "@/lib/types";

export type BoardRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export const ensureBoardForUser = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: BoardRow | null; error: string | null }> => {
  const { data: existing, error: fetchError } = await supabase
    .from("boards")
    .select("id,user_id,title,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  if (existing) {
    return { data: existing as BoardRow, error: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("boards")
    .insert({ user_id: userId, title: "My board" })
    .select("id,user_id,title,created_at,updated_at")
    .single();

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  return { data: created as BoardRow, error: null };
};

export const fetchBoardNodes = async (
  supabase: SupabaseClient,
  boardId: string,
): Promise<{ data: BoardNodeRecord[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("board_nodes")
    .select("id,type,position,data,width,height,z_index")
    .eq("board_id", boardId);

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data:
      data?.map((row) => ({
        id: row.id as string,
        type: row.type as BoardNodeRecord["type"],
        position: row.position as BoardNodeRecord["position"],
        data: (row.data as BoardNodeRecord["data"]) ?? null,
        width: typeof row.width === "number" ? row.width : undefined,
        height: typeof row.height === "number" ? row.height : undefined,
        zIndex: typeof row.z_index === "number" ? row.z_index : undefined,
      })) ?? [],
    error: null,
  };
};

export const fetchBoardEdges = async (
  supabase: SupabaseClient,
  boardId: string,
): Promise<{ data: BoardEdgeRecord[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("board_edges")
    .select("id,source,target,data,style")
    .eq("board_id", boardId);

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data:
      data?.map((row) => ({
        id: row.id as string,
        source: row.source as string,
        target: row.target as string,
        data: (row.data as BoardEdgeRecord["data"]) ?? null,
        style: (row.style as BoardEdgeRecord["style"]) ?? null,
      })) ?? [],
    error: null,
  };
};

export const fetchBoardViewport = async (
  supabase: SupabaseClient,
  boardId: string,
): Promise<{ data: BoardViewport | null; error: string | null }> => {
  const { data, error } = await supabase
    .from("board_viewport")
    .select("viewport")
    .eq("board_id", boardId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data?.viewport) {
    return { data: null, error: null };
  }

  return { data: data.viewport as BoardViewport, error: null };
};

export const upsertBoardNodes = async (
  supabase: SupabaseClient,
  boardId: string,
  nodes: BoardNodeRecord[],
): Promise<{ error: string | null }> => {
  if (nodes.length === 0) return { error: null };

  const payload = nodes.map((node) => ({
    id: node.id,
    board_id: boardId,
    type: node.type,
    position: node.position,
    data: node.data ?? {},
    width: node.width ?? null,
    height: node.height ?? null,
    z_index: node.zIndex ?? 0,
  }));

  const { error } = await supabase.from("board_nodes").upsert(payload, { onConflict: "id" });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

export const deleteBoardNodes = async (
  supabase: SupabaseClient,
  boardId: string,
  ids: string[],
): Promise<{ error: string | null }> => {
  if (ids.length === 0) return { error: null };

  const { error } = await supabase.from("board_nodes").delete().eq("board_id", boardId).in("id", ids);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

export const upsertBoardEdges = async (
  supabase: SupabaseClient,
  boardId: string,
  edges: BoardEdgeRecord[],
): Promise<{ error: string | null }> => {
  if (edges.length === 0) return { error: null };

  const payload = edges.map((edge) => ({
    id: edge.id,
    board_id: boardId,
    source: edge.source,
    target: edge.target,
    data: edge.data ?? {},
    style: edge.style ?? {},
  }));

  const { error } = await supabase.from("board_edges").upsert(payload, { onConflict: "id" });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

export const deleteBoardEdges = async (
  supabase: SupabaseClient,
  boardId: string,
  ids: string[],
): Promise<{ error: string | null }> => {
  if (ids.length === 0) return { error: null };

  const { error } = await supabase.from("board_edges").delete().eq("board_id", boardId).in("id", ids);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

export const upsertBoardViewport = async (
  supabase: SupabaseClient,
  boardId: string,
  viewport: BoardViewport,
): Promise<{ error: string | null }> => {
  const { error } = await supabase.from("board_viewport").upsert({
    board_id: boardId,
    viewport,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};
