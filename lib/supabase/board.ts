import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardEdgeRecord, BoardNodeRecord, BoardViewport } from "@/lib/types";

export type BoardRow = {
  id: string;
  owner_user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const toEdgePayloadData = (edge: BoardEdgeRecord) => {
  const data: Record<string, unknown> = {};
  if (edge.data) {
    Object.assign(data, edge.data);
  }
  if (edge.style && Object.keys(edge.style).length > 0) {
    data.style = edge.style;
  }
  return data;
};

const parseEdgeData = (raw: unknown): { data: Record<string, unknown> | null; style: Record<string, unknown> | null } => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { data: null, style: null };
  }
  const { style, ...rest } = raw as Record<string, unknown>;
  const styleValue =
    style && typeof style === "object" && !Array.isArray(style) ? (style as Record<string, unknown>) : null;
  const dataValue = Object.keys(rest).length > 0 ? rest : null;
  return { data: dataValue, style: styleValue };
};

export const ensureBoardForUser = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: BoardRow | null; error: string | null }> => {
  const { data: existing, error: fetchError } = await supabase
    .from("boards")
    .select("id,owner_user_id,title,created_at,updated_at")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  if (existing) {
    return { data: existing as BoardRow, error: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("boards")
    .insert({ owner_user_id: userId, title: "My board" })
    .select("id,owner_user_id,title,created_at,updated_at")
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
    .select("id,type,x,y,data,width,height,rotation,z_index")
    .eq("board_id", boardId);

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data:
      data?.map((row) => ({
        id: row.id as string,
        type: row.type as BoardNodeRecord["type"],
        x: typeof row.x === "number" ? row.x : 0,
        y: typeof row.y === "number" ? row.y : 0,
        data: (row.data as BoardNodeRecord["data"]) ?? null,
        width: typeof row.width === "number" ? row.width : undefined,
        height: typeof row.height === "number" ? row.height : undefined,
        rotation: typeof row.rotation === "number" ? row.rotation : undefined,
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
    .select("id,source_node_id,target_node_id,label,data")
    .eq("board_id", boardId);

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data:
      data?.map((row) => {
        const parsed = parseEdgeData(row.data as BoardEdgeRecord["data"]);
        return {
          id: row.id as string,
          source: row.source_node_id as string,
          target: row.target_node_id as string,
          label: typeof row.label === "string" ? row.label : null,
          data: parsed.data,
          style: parsed.style,
        };
      }) ?? [],
    error: null,
  };
};

export const fetchBoardViewport = async (
  supabase: SupabaseClient,
  boardId: string,
): Promise<{ data: BoardViewport | null; error: string | null }> => {
  const { data, error } = await supabase
    .from("board_viewport")
    .select("x,y,zoom")
    .eq("board_id", boardId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: {
      x: typeof data.x === "number" ? data.x : 0,
      y: typeof data.y === "number" ? data.y : 0,
      zoom: typeof data.zoom === "number" ? data.zoom : 1,
    },
    error: null,
  };
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
    x: node.x,
    y: node.y,
    data: node.data ?? {},
    width: node.width ?? null,
    height: node.height ?? null,
    rotation: node.rotation ?? 0,
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
    source_node_id: edge.source,
    target_node_id: edge.target,
    label: edge.label ?? null,
    data: toEdgePayloadData(edge),
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
  const { error } = await supabase.from("board_viewport").upsert(
    {
      board_id: boardId,
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    },
    { onConflict: "board_id" },
  );

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};
