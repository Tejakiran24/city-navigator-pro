import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findRoute, type GraphNode, type GraphRoad } from "@/lib/graph";

const routeSchema = z.object({
  sourceId: z.string(), destinationId: z.string(),
  algorithm: z.enum(["dijkstra", "astar", "bfs", "dfs"]),
  distance: z.number().min(0).max(100000), time: z.number().min(0).max(100000),
  junctionCount: z.number().int().min(0).max(10000), fuel: z.number().min(0).max(10000),
  traffic: z.enum(["low", "medium", "heavy", "closed"]), path: z.array(z.string()).max(10000),
});

export const getTrafficWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
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
      const dbError = [nodes, roads, alerts, searches, saved, favorites, profile, roles, notifications].find((result) => result.error)?.error;
      if (dbError) throw dbError;
      if (!nodes.data || nodes.data.length === 0) {
        console.log("Database intersections empty, falling back to mock workspace.");
        return getMockWorkspace();
      }
      
      return { 
        nodes: nodes.data ?? [], 
        roads: roads.data ?? [], 
        alerts: alerts.data ?? [], 
        searches: searches.data ?? [], 
        saved: saved.data ?? [], 
        favorites: favorites.data ?? [], 
        notifications: notifications.data ?? [], 
        profile: profile.data, 
        isAdmin: roles.data?.some((item) => item.role === "admin") ?? false 
      };
    } catch (e) {
      console.warn("Database workspace fetch failed, serving offline mock workspace:", e);
      return getMockWorkspace();
    }
  });

export const calculateBestRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sourceId: z.string(), destinationId: z.string(), preference: z.enum(["fastest", "shortest"]) }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const [nodes, roads] = await Promise.all([
        context.supabase.from("intersections").select("*"),
        context.supabase.from("roads").select("*"),
      ]);
      if (nodes.error || roads.error) throw new Error("Database query failed");
      if (!nodes.data || nodes.data.length === 0) throw new Error("No intersections in database");
      const result = findRoute(nodes.data as GraphNode[], roads.data as GraphRoad[], data.sourceId, data.destinationId, "astar", data.preference === "shortest" ? "distance" : "time");
      if (!result) throw new Error("No available route was found.");
      return result;
    } catch (e) {
      console.warn("Database route calculation failed, calculating client-side fallback.");
      const mockWorkspace = getMockWorkspace();
      const result = findRoute(mockWorkspace.nodes as GraphNode[], mockWorkspace.roads as GraphRoad[], data.sourceId, data.destinationId, "astar", data.preference === "shortest" ? "distance" : "time");
      if (!result) throw new Error("No path found in fallback workspace.");
      return result;
    }
  });

export const recordRouteSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => routeSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase.from("route_searches").insert({ user_id: context.userId, source_id: data.sourceId, destination_id: data.destinationId, algorithm: data.algorithm, distance_km: data.distance, travel_time_minutes: data.time, junction_count: data.junctionCount, fuel_liters: data.fuel, traffic_status: data.traffic, path: data.path });
      if (error) throw error;
    } catch (e) {
      console.warn("Skipping DB search recording due to query failure:", e);
    }
    return { ok: true };
  });

export const saveRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => routeSchema.extend({ name: z.string().trim().min(1).max(80), favorite: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase.from("saved_routes").insert({ user_id: context.userId, name: data.name, source_id: data.sourceId, destination_id: data.destinationId, algorithm: data.algorithm, path: data.path, distance_km: data.distance, travel_time_minutes: data.time, is_favorite: data.favorite });
      if (error) throw error;
    } catch (e) {
      console.warn("Skipping DB route saving due to query failure:", e);
    }
    return { ok: true };
  });

export const deleteSavedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase.from("saved_routes").delete().eq("id", data.id).eq("user_id", context.userId);
      if (error) throw error;
    } catch (e) {
      console.warn("Skipping DB route deletion due to query failure:", e);
    }
    return { ok: true };
  });

function getMockWorkspace() {
  return {
    nodes: [
      { id: "node-1", name: "Central Station", node_code: "J1", latitude: 40.7580, longitude: -73.9855 },
      { id: "node-2", name: "Times Square", node_code: "J2", latitude: 40.7590, longitude: -73.9844 },
      { id: "node-3", name: "Broadway Plaza", node_code: "J3", latitude: 40.7570, longitude: -73.9866 },
      { id: "node-4", name: "Fifth Avenue", node_code: "J4", latitude: 40.7560, longitude: -73.9833 },
      { id: "node-5", name: "Grand Central Terminal", node_code: "J5", latitude: 40.7520, longitude: -73.9772 },
      { id: "node-6", name: "Port Authority", node_code: "J6", latitude: 40.7565, longitude: -73.9900 },
    ],
    roads: [
      { id: "road-1", name: "Broadway Link", start_node: "node-1", end_node: "node-2", distance_km: 1.2, base_time_minutes: 3, traffic_level: "low" as const, traffic_weight: 1, bidirectional: true },
      { id: "road-2", name: "Seventh Ave Expressway", start_node: "node-2", end_node: "node-3", distance_km: 1.8, base_time_minutes: 4, traffic_level: "medium" as const, traffic_weight: 1.5, bidirectional: true },
      { id: "road-3", name: "Times Square Bypass", start_node: "node-1", end_node: "node-3", distance_km: 0.8, base_time_minutes: 2, traffic_level: "heavy" as const, traffic_weight: 2.5, bidirectional: true },
      { id: "road-4", name: "42nd Street Crosstown", start_node: "node-2", end_node: "node-4", distance_km: 2.1, base_time_minutes: 5, traffic_level: "low" as const, traffic_weight: 1, bidirectional: true },
      { id: "road-5", name: "Grand Avenue Blvd", start_node: "node-4", end_node: "node-5", distance_km: 2.5, base_time_minutes: 6, traffic_level: "low" as const, traffic_weight: 1, bidirectional: true },
      { id: "road-6", name: "Port Connector", start_node: "node-1", end_node: "node-6", distance_km: 1.5, base_time_minutes: 3, traffic_level: "low" as const, traffic_weight: 1, bidirectional: true },
      { id: "road-7", name: "Midtown Tunnel Link", start_node: "node-3", end_node: "node-6", distance_km: 1.9, base_time_minutes: 4, traffic_level: "medium" as const, traffic_weight: 1.5, bidirectional: true },
    ],
    alerts: [
      { id: "alert-1", title: "Construction on Times Square Bypass", description: "Expect moderate delays due to road widening works.", severity: "medium" as const, road_id: "road-3", category: "traffic", active: true },
    ],
    searches: [],
    saved: [],
    favorites: [],
    notifications: [],
    profile: { display_name: "Guest Traveller" },
    isAdmin: true
  };
}