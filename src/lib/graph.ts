export type Algorithm = "dijkstra" | "astar" | "bfs" | "dfs";
export type OptimizeFor = "distance" | "time";

export interface GraphNode {
  id: string;
  name: string;
  node_code: string;
  latitude: number;
  longitude: number;
}

export interface GraphRoad {
  id: string;
  name: string;
  start_node: string;
  end_node: string;
  distance_km: number;
  base_time_minutes: number;
  traffic_weight: number;
  traffic_level: "low" | "medium" | "heavy" | "closed";
  bidirectional: boolean;
}

export interface SearchStep {
  current: string;
  frontier: string[];
  visited: string[];
}

export interface RouteResult {
  path: string[];
  visited: string[];
  distance: number;
  time: number;
  fuel: number;
  traffic: "low" | "medium" | "heavy" | "closed";
  algorithm: Algorithm;
  steps?: SearchStep[];
}

const radians = (value: number) => (value * Math.PI) / 180;
const heuristic = (a: GraphNode, b: GraphNode) => {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function findRoute(nodes: GraphNode[], roads: GraphRoad[], source: string, target: string, algorithm: Algorithm, optimize: OptimizeFor = "time"): RouteResult | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Array<{ node: string; road: GraphRoad }>>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  roads.filter((road) => road.traffic_level !== "closed" && byId.has(road.start_node) && byId.has(road.end_node)).forEach((road) => {
    adjacency.get(road.start_node)?.push({ node: road.end_node, road });
    if (road.bidirectional) adjacency.get(road.end_node)?.push({ node: road.start_node, road });
  });
  const parent = new Map<string, { previous: string; road: GraphRoad }>();
  const visited: string[] = [];
  const steps: SearchStep[] = [];

  if (algorithm === "bfs" || algorithm === "dfs") {
    const frontier = [source];
    const seen = new Set([source]);
    while (frontier.length) {
      const traceFrontier = [...frontier];
      const current = algorithm === "bfs" ? frontier.shift() : frontier.pop();
      if (!current) break;
      visited.push(current);
      steps.push({
        current,
        frontier: traceFrontier,
        visited: [...visited],
      });
      if (current === target) break;
      for (const edge of adjacency.get(current) ?? []) {
        if (!seen.has(edge.node)) {
          seen.add(edge.node);
          parent.set(edge.node, { previous: current, road: edge.road });
          frontier.push(edge.node);
        }
      }
    }
  } else {
    const costs = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
    const open = new Set([source]);
    costs.set(source, 0);
    while (open.size) {
      const traceFrontier = Array.from(open);
      let current = "";
      let best = Number.POSITIVE_INFINITY;
      open.forEach((id) => {
        const node = byId.get(id);
        const goal = byId.get(target);
        const estimate = algorithm === "astar" && node && goal ? heuristic(node, goal) : 0;
        const score = (costs.get(id) ?? Infinity) + estimate;
        if (score < best) { best = score; current = id; }
      });
      if (!current) break;
      open.delete(current);
      visited.push(current);
      steps.push({
        current,
        frontier: traceFrontier,
        visited: [...visited],
      });
      if (current === target) break;
      for (const edge of adjacency.get(current) ?? []) {
        const weight = optimize === "distance" ? Number(edge.road.distance_km) : Number(edge.road.base_time_minutes) * Number(edge.road.traffic_weight);
        const next = (costs.get(current) ?? Infinity) + weight;
        if (next < (costs.get(edge.node) ?? Infinity)) {
          costs.set(edge.node, next);
          parent.set(edge.node, { previous: current, road: edge.road });
          open.add(edge.node);
        }
      }
    }
  }

  if (source !== target && !parent.has(target)) return null;
  const path = [target];
  const pathRoads: GraphRoad[] = [];
  let cursor = target;
  while (cursor !== source) {
    const step = parent.get(cursor);
    if (!step) return null;
    pathRoads.unshift(step.road);
    cursor = step.previous;
    path.unshift(cursor);
  }
  const distance = pathRoads.reduce((sum, road) => sum + Number(road.distance_km), 0);
  const time = pathRoads.reduce((sum, road) => sum + Number(road.base_time_minutes) * Number(road.traffic_weight), 0);
  const levels = pathRoads.map((road) => road.traffic_level);
  const traffic = levels.includes("heavy") ? "heavy" : levels.includes("medium") ? "medium" : "low";
  return { path, visited, distance, time, fuel: distance / 12, traffic, algorithm, steps };
}