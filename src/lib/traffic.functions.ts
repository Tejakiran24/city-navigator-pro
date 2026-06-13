import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findRoute, type GraphNode, type GraphRoad } from "@/lib/graph";

const routeSchema = z.object({
  sourceId: z.string().uuid(), destinationId: z.string().uuid(),
  algorithm: z.enum(["dijkstra", "astar", "bfs", "dfs"]),
  distance: z.number().min(0).max(100000), time: z.number().min(0).max(100000),
  junctionCount: z.number().int().min(0).max(10000), fuel: z.number().min(0).max(10000),
  traffic: z.enum(["low", "medium", "heavy", "closed"]), path: z.array(z.string().uuid()).max(10000),
});

export const getTrafficWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [nodes, roads, alerts, searches, saved, favorites, profile, roles, notifications] = await Promise.all([
      context.supabase.from("intersections").select("*").order("node_code"),
      context.supabase.from("roads").select("*").order("name"),
      context.supabase.from("traffic_alerts").select("*").eq("active", true).order("created_at", { ascending: false }),
      context.supabase.from("route_searches").select("*").order("created_at", { ascending: false }).limit(20),
      context.supabase.from("saved_routes").select("*").order("updated_at", { ascending: false }),
      context.supabase.from("favorite_locations").select("*").order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    const error = [nodes, roads, alerts, searches, saved, favorites, profile, roles, notifications].find((result) => result.error)?.error;
    if (error) throw new Error("Unable to load the traffic workspace.");
    return { nodes: nodes.data ?? [], roads: roads.data ?? [], alerts: alerts.data ?? [], searches: searches.data ?? [], saved: saved.data ?? [], favorites: favorites.data ?? [], notifications: notifications.data ?? [], profile: profile.data, isAdmin: roles.data?.some((item) => item.role === "admin") ?? false };
  });

export const calculateBestRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sourceId: z.string().uuid(), destinationId: z.string().uuid(), preference: z.enum(["fastest", "shortest"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const [nodes, roads] = await Promise.all([
      context.supabase.from("intersections").select("*"),
      context.supabase.from("roads").select("*"),
    ]);
    if (nodes.error || roads.error) throw new Error("Unable to calculate a route right now.");
    const result = findRoute(nodes.data as GraphNode[], roads.data as GraphRoad[], data.sourceId, data.destinationId, "astar", data.preference === "shortest" ? "distance" : "time");
    if (!result) throw new Error("No available route was found.");
    return result;
  });

export const recordRouteSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => routeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("route_searches").insert({ user_id: context.userId, source_id: data.sourceId, destination_id: data.destinationId, algorithm: data.algorithm, distance_km: data.distance, travel_time_minutes: data.time, junction_count: data.junctionCount, fuel_liters: data.fuel, traffic_status: data.traffic, path: data.path });
    if (error) throw new Error("Unable to record this route.");
    return { ok: true };
  });

export const saveRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => routeSchema.extend({ name: z.string().trim().min(1).max(80), favorite: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_routes").insert({ user_id: context.userId, name: data.name, source_id: data.sourceId, destination_id: data.destinationId, algorithm: data.algorithm, path: data.path, distance_km: data.distance, travel_time_minutes: data.time, is_favorite: data.favorite });
    if (error) throw new Error("Unable to save this route.");
    return { ok: true };
  });

export const deleteSavedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_routes").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Unable to delete this route.");
    return { ok: true };
  });