import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { 
  Activity, AlertTriangle, BarChart3, Bell, Bookmark, Building2, 
  ChevronRight, Clock3, Gauge, LogOut, Map as MapIcon, Menu, 
  Navigation, Route as RouteIcon, Shield, Trash2, Users, X, 
  Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Network, 
  Sliders, RefreshCw, Eye, Sparkles, CheckCircle, HelpCircle
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findRoute, type GraphNode, type GraphRoad, type RouteResult, type Algorithm } from "@/lib/graph";
import { calculateBestRoute, deleteSavedRoute, getTrafficWorkspace, recordRouteSearch, saveRoute } from "@/lib/traffic.functions";

const TrafficMap = lazy(() => import("@/components/traffic-map").then((module) => ({ default: module.TrafficMap })));

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "UrbanFlow Navigation | Live Traffic" }, { name: "description", content: "Plan faster journeys with live traffic intelligence and route guidance." }] }),
  component: Dashboard,
});

type View = "map" | "analytics" | "saved" | "alerts" | "admin";
const trafficChart = [{ t: "06:00", flow: 34 }, { t: "09:00", flow: 82 }, { t: "12:00", flow: 58 }, { t: "15:00", flow: 69 }, { t: "18:00", flow: 92 }, { t: "21:00", flow: 45 }];

const ALGORITHM_LABELS: Record<Algorithm, string> = {
  astar: "Dynamic Heuristic Route",
  dijkstra: "Standard Shortest Route",
  bfs: "Minimum Junctions Route",
  dfs: "Alternative Exploration Route"
};

function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchWorkspace = useServerFn(getTrafficWorkspace);
  const record = useServerFn(recordRouteSearch);
  const save = useServerFn(saveRoute);
  const remove = useServerFn(deleteSavedRoute);
  const { data, isLoading, error } = useQuery({ queryKey: ["traffic-workspace"], queryFn: () => fetchWorkspace() });
  
  const [view, setView] = useState<View>("map");
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Custom client-side graph states
  const [customNodes, setCustomNodes] = useState<GraphNode[]>([]);
  const [customRoads, setCustomRoads] = useState<GraphRoad[]>([]);
  const [hasInitializedGraph, setHasInitializedGraph] = useState(false);
  
  // Navigation states
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [preference, setPreference] = useState<"fastest" | "shortest">("fastest");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [routeName, setRouteName] = useState("");
  const [activeAlgorithm, setActiveAlgorithm] = useState<Algorithm>("astar");

  // Graph editor states
  const [pendingNodeCoords, setPendingNodeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  
  const [newRoadStart, setNewRoadStart] = useState("");
  const [newRoadEnd, setNewRoadEnd] = useState("");
  const [newRoadName, setNewRoadName] = useState("");
  const [newRoadDistance, setNewRoadDistance] = useState("2.5");
  const [newRoadTime, setNewRoadTime] = useState("5.0");
  const [newRoadTraffic, setNewRoadTraffic] = useState<"low" | "medium" | "heavy" | "closed">("low");
  const [newRoadBi, setNewRoadBi] = useState(true);

  // Visual Solver Playback states
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isSolving, setIsSolving] = useState(false);
  const [solverSpeed, setSolverSpeed] = useState(600); // ms
  
  // Auto simulation states
  const [autoSimulate, setAutoSimulate] = useState(false);

  useEffect(() => { document.documentElement.classList.add("dark"); }, []);

  // Initialize graph from DB once loaded
  useEffect(() => {
    if (data?.nodes && data?.roads && !hasInitializedGraph) {
      setCustomNodes(data.nodes as GraphNode[]);
      setCustomRoads(data.roads as GraphRoad[]);
      setHasInitializedGraph(true);
    }
  }, [data, hasInitializedGraph]);

  // Set default source & destination once custom nodes are available
  useEffect(() => {
    if (customNodes.length && !source) {
      setSource(customNodes[0].id);
      setDestination(customNodes[customNodes.length - 1].id);
    }
  }, [customNodes, source]);

  // Playback timer execution
  useEffect(() => {
    let timer: any;
    if (isSolving && result?.steps && result.steps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= (result.steps?.length ?? 0) - 1) {
            setIsSolving(false);
            return prev;
          }
          return prev + 1;
        });
      }, solverSpeed);
    }
    return () => clearInterval(timer);
  }, [isSolving, result?.steps, solverSpeed]);

  // Auto traffic simulation engine
  useEffect(() => {
    if (!autoSimulate || !customRoads.length) return;
    const interval = setInterval(() => {
      const trafficLevels: Array<"low" | "medium" | "heavy" | "closed"> = ["low", "medium", "heavy", "closed"];
      const weightMap = { low: 1.0, medium: 1.5, heavy: 2.5, closed: 99.0 };
      
      setCustomRoads(prev => {
        const next = [...prev];
        const numToChange = Math.min(2, next.length);
        for (let i = 0; i < numToChange; i++) {
          const idx = Math.floor(Math.random() * next.length);
          const randLevel = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
          next[idx] = {
            ...next[idx],
            traffic_level: randLevel,
            traffic_weight: weightMap[randLevel]
          };
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [autoSimulate, customRoads.length]);

  const handleCalculateRoute = () => {
    if (!source || !destination || source === destination) return;
    
    setIsSolving(false);
    setCurrentStepIndex(-1);

    const route = findRoute(customNodes, customRoads, source, destination, activeAlgorithm, preference === "shortest" ? "distance" : "time");
    
    if (route) {
      setResult(route);
      record({ 
        data: { 
          sourceId: source, 
          destinationId: destination, 
          algorithm: route.algorithm, 
          distance: route.distance, 
          time: route.time, 
          junctionCount: route.path.length, 
          fuel: route.fuel, 
          traffic: route.traffic, 
          path: route.path 
        } 
      }).then(() => queryClient.invalidateQueries({ queryKey: ["traffic-workspace"] }))
        .catch(e => console.log("History logging skipped:", e));
    } else {
      setResult(null);
      alert("No routes could be established between these junctions.");
    }
  };

  const handleRoadTrafficChange = (roadId: string, level: "low" | "medium" | "heavy" | "closed") => {
    const weightMap = { low: 1.0, medium: 1.5, heavy: 2.5, closed: 99.0 };
    setCustomRoads(prev => prev.map(road => {
      if (road.id === roadId) {
        return {
          ...road,
          traffic_level: level,
          traffic_weight: weightMap[level]
        };
      }
      return road;
    }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPendingNodeCoords({ lat, lng });
  };

  const handleAddNode = () => {
    if (!pendingNodeCoords || !newNodeName.trim()) return;
    const code = `JUNC_${Math.floor(100 + Math.random() * 900)}`;
    const newNode: GraphNode = {
      id: crypto.randomUUID(),
      name: newNodeName.trim(),
      node_code: code,
      latitude: pendingNodeCoords.lat,
      longitude: pendingNodeCoords.lng
    };
    setCustomNodes(prev => [...prev, newNode]);
    setNewNodeName("");
    setPendingNodeCoords(null);
  };

  const handleDeleteNode = (id: string) => {
    setCustomNodes(prev => prev.filter(n => n.id !== id));
    setCustomRoads(prev => prev.filter(r => r.start_node !== id && r.end_node !== id));
    if (source === id) setSource("");
    if (destination === id) setDestination("");
  };

  const handleDeleteRoad = (id: string) => {
    setCustomRoads(prev => prev.filter(r => r.id !== id));
  };

  const handleResetGraph = () => {
    if (data) {
      setCustomNodes(data.nodes as GraphNode[]);
      setCustomRoads(data.roads as GraphRoad[]);
      setPendingNodeCoords(null);
      setResult(null);
      setCurrentStepIndex(-1);
      setIsSolving(false);
    }
  };

  const handleAddRoad = () => {
    if (!newRoadStart || !newRoadEnd || newRoadStart === newRoadEnd) {
      alert("Please choose distinct junctions.");
      return;
    }
    const weightMap = { low: 1.0, medium: 1.5, heavy: 2.5, closed: 99.0 };
    const newRoad: GraphRoad = {
      id: crypto.randomUUID(),
      name: newRoadName.trim() || `${customNodes.find(n => n.id === newRoadStart)?.name} → ${customNodes.find(n => n.id === newRoadEnd)?.name}`,
      start_node: newRoadStart,
      end_node: newRoadEnd,
      distance_km: parseFloat(newRoadDistance) || 2.5,
      base_time_minutes: parseFloat(newRoadTime) || 5.0,
      traffic_level: newRoadTraffic,
      traffic_weight: weightMap[newRoadTraffic],
      bidirectional: newRoadBi
    };
    setCustomRoads(prev => [...prev, newRoad]);
    setNewRoadName("");
  };

  const nodeMap = useMemo(() => new Map(customNodes.map((node) => [node.id, node])), [customNodes]);

  const alternatives = useMemo(() => {
    if (!source || !destination || !customNodes.length || !customRoads.length) return null;
    const algs: Algorithm[] = ["astar", "dijkstra", "bfs", "dfs"];
    const res: Record<Algorithm, RouteResult | null> = {
      astar: null,
      dijkstra: null,
      bfs: null,
      dfs: null
    };
    algs.forEach(alg => {
      try {
        res[alg] = findRoute(customNodes, customRoads, source, destination, alg, preference === "shortest" ? "distance" : "time");
      } catch (e) {
        res[alg] = null;
      }
    });
    return res;
  }, [source, destination, preference, customNodes, customRoads]);

  const activeRoute = useMemo(() => {
    if (!alternatives) return null;
    return alternatives[activeAlgorithm] || result;
  }, [alternatives, activeAlgorithm, result]);

  // Solver Highlight Snapshot
  const currentStepSnapshot = useMemo(() => {
    if (currentStepIndex >= 0 && activeRoute?.steps) {
      const step = activeRoute.steps[currentStepIndex];
      return {
        current: step.current,
        frontier: step.frontier,
        visited: step.visited
      };
    }
    return null;
  }, [currentStepIndex, activeRoute]);

  // Graph structural metrics
  const degreeCentrality = useMemo(() => {
    const counts: Record<string, number> = {};
    customNodes.forEach(n => counts[n.id] = 0);
    customRoads.forEach(r => {
      if (counts[r.start_node] !== undefined) counts[r.start_node]++;
      if (counts[r.end_node] !== undefined) counts[r.end_node]++;
    });
    return Object.entries(counts)
      .map(([id, degree]) => ({
        id,
        name: customNodes.find(n => n.id === id)?.name || "Unknown",
        degree
      }))
      .sort((a, b) => b.degree - a.degree);
  }, [customNodes, customRoads]);

  const isGraphConnected = useMemo(() => {
    if (customNodes.length === 0) return true;
    const adj = new Map<string, string[]>();
    customNodes.forEach(n => adj.set(n.id, []));
    customRoads.forEach(r => {
      if (r.traffic_level !== "closed") {
        adj.get(r.start_node)?.push(r.end_node);
        if (r.bidirectional) adj.get(r.end_node)?.push(r.start_node);
      }
    });

    const visitedSet = new Set<string>();
    const startNode = customNodes[0].id;
    const queue = [startNode];
    visitedSet.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adj.get(current) || [];
      for (const n of neighbors) {
        if (!visitedSet.has(n)) {
          visitedSet.add(n);
          queue.push(n);
        }
      }
    }
    return visitedSet.size === customNodes.length;
  }, [customNodes, customRoads]);

  const adjacencyListStr = useMemo(() => {
    return customNodes.map(node => {
      const edges = customRoads.filter(r => 
        (r.start_node === node.id || (r.bidirectional && r.end_node === node.id)) && 
        r.traffic_level !== "closed"
      ).map(r => {
        const destId = r.start_node === node.id ? r.end_node : r.start_node;
        const destNode = customNodes.find(n => n.id === destId);
        return `${destNode?.name || "Junction"} (${r.distance_km}km)`;
      });
      return `${node.name} ➔ [${edges.join(", ") || "No connections"}]`;
    }).join("\n");
  }, [customNodes, customRoads]);

  const matrixHeaders = customNodes;
  const matrixCells = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};
    customNodes.forEach(n1 => {
      matrix[n1.id] = {};
      customNodes.forEach(n2 => {
        if (n1.id === n2.id) {
          matrix[n1.id][n2.id] = "0";
        } else {
          matrix[n1.id][n2.id] = "∞";
        }
      });
    });

    customRoads.forEach(r => {
      if (r.traffic_level !== "closed") {
        const dist = `${r.distance_km} km`;
        matrix[r.start_node][r.end_node] = dist;
        if (r.bidirectional) {
          matrix[r.end_node][r.start_node] = dist;
        }
      }
    });
    return matrix;
  }, [customNodes, customRoads]);

  const saveMutation = useMutation({ 
    mutationFn: () => activeRoute ? save({ data: { sourceId: source, destinationId: destination, algorithm: activeRoute.algorithm, distance: activeRoute.distance, time: activeRoute.time, junctionCount: activeRoute.path.length, fuel: activeRoute.fuel, traffic: activeRoute.traffic, path: activeRoute.path, name: routeName.trim() || `${nodeMap.get(source)?.name} → ${nodeMap.get(destination)?.name}`, favorite: false } }) : Promise.resolve({ ok: false }), 
    onSuccess: () => { setRouteName(""); queryClient.invalidateQueries({ queryKey: ["traffic-workspace"] }); } 
  });
  
  const deleteMutation = useMutation({ 
    mutationFn: (id: string) => remove({ data: { id } }), 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["traffic-workspace"] }) 
  });
  
  const signOut = async () => { 
    await queryClient.cancelQueries(); 
    queryClient.clear(); 
    await supabase.auth.signOut(); 
    navigate({ to: "/auth", replace: true }); 
  };

  const items: Array<{ id: View; label: string; icon: typeof MapIcon; admin?: boolean }> = [
    { id: "map", label: "Live City map", icon: MapIcon }, 
    { id: "analytics", label: "Traffic insights", icon: BarChart3 }, 
    { id: "saved", label: "Saved routes", icon: Bookmark }, 
    { id: "alerts", label: "Alerts", icon: AlertTriangle }, 
    { id: "admin", label: "Admin console", icon: Shield, admin: true },
  ];

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <div className="grid min-h-screen place-items-center bg-background p-4"><div className="glass-panel rounded-2xl p-8 text-center"><AlertTriangle className="mx-auto text-danger"/><h1 className="mt-3 text-xl">Navigation unavailable</h1><p className="text-muted-foreground">Please refresh and try again.</p></div></div>;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-[1000] flex w-72 flex-col border-r border-sidebar-border bg-sidebar p-4 transition-transform lg:sticky lg:translate-x-0`}>
        <div className="flex h-14 items-center justify-between px-2">
          <div className="flex items-center gap-3 font-display text-lg font-semibold"><LogoMark/>UrbanFlow</div>
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(false)}><X/></Button>
        </div>
        <nav className="mt-8 space-y-1">
          {items.filter((item) => !item.admin || data.isAdmin).map(({id,label,icon:Icon}) => (
            <Button key={id} variant={view === id ? "secondary" : "ghost"} className="h-11 w-full justify-start rounded-xl font-medium" onClick={() => { setView(id); setMobileOpen(false); }}>
              <Icon/>{label}{view === id && <ChevronRight className="ml-auto"/>}
            </Button>
          ))}
        </nav>
        
        {/* City status summary widget */}
        <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Network statistics</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total junctions</span><b>{customNodes.length}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active edges</span><b>{customRoads.filter(r => r.traffic_level !== 'closed').length}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active alerts</span><b>{data.alerts.length}</b></div>
            <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-success">
              <span className="size-2 animate-pulse rounded-full bg-success"/>Live network connected
            </div>
          </div>
        </div>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start text-danger hover:bg-danger/10" onClick={signOut}><LogOut/>Sign out</Button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-[900] bg-background/80 lg:hidden" onClick={() => setMobileOpen(false)}/>} 
      
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-[800] grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6 h-16">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileOpen(true)}><Menu/></Button>
            <div className="min-w-0">
              <h1 className="truncate font-display font-semibold text-lg">{items.find((item) => item.id === view)?.label}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">City-wide traffic intelligence & path simulator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="icon" aria-label="Notifications" onClick={() => setView("alerts")} className="relative">
              <Bell/>
              <span className="absolute right-1 top-1 size-2 rounded-full bg-primary"/>
            </Button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{data.profile?.display_name ?? "Urban Navigator"}</p>
              <p className="text-xs text-muted-foreground">{data.isAdmin ? "System administrator" : "City traveler"}</p>
            </div>
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
              {(data.profile?.display_name ?? "U").charAt(0)}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 sm:p-5">
            {view === "map" && (
              <MapWorkspace 
                nodes={customNodes} 
                roads={customRoads} 
                source={source} 
                destination={destination} 
                setSource={setSource} 
                setDestination={setDestination} 
                preference={preference} 
                setPreference={setPreference} 
                result={activeRoute} 
                calculate={handleCalculateRoute} 
                calculating={false} 
                routeName={routeName} 
                setRouteName={setRouteName} 
                saveRoute={() => saveMutation.mutate()} 
                saving={saveMutation.isPending} 
                alternatives={alternatives} 
                activeAlgorithm={activeAlgorithm} 
                setActiveAlgorithm={setActiveAlgorithm} 
                onRoadTrafficChange={handleRoadTrafficChange}
                
                // Editor props
                editorMode={editorMode}
                setEditorMode={setEditorMode}
                pendingNodeCoords={pendingNodeCoords}
                setPendingNodeCoords={setPendingNodeCoords}
                newNodeName={newNodeName}
                setNewNodeName={setNewNodeName}
                handleAddNode={handleAddNode}
                newRoadStart={newRoadStart}
                setNewRoadStart={setNewRoadStart}
                newRoadEnd={newRoadEnd}
                setNewRoadEnd={setNewRoadEnd}
                newRoadName={newRoadName}
                setNewRoadName={setNewRoadName}
                newRoadDistance={newRoadDistance}
                setNewRoadDistance={setNewRoadDistance}
                newRoadTime={newRoadTime}
                setNewRoadTime={setNewRoadTime}
                newRoadTraffic={newRoadTraffic}
                setNewRoadTraffic={setNewRoadTraffic}
                newRoadBi={newRoadBi}
                setNewRoadBi={setNewRoadBi}
                handleAddRoad={handleAddRoad}
                handleDeleteNode={handleDeleteNode}
                handleDeleteRoad={handleDeleteRoad}
                handleResetGraph={handleResetGraph}
                handleMapClick={handleMapClick}

                // Solver props
                currentStepIndex={currentStepIndex}
                setCurrentStepIndex={setCurrentStepIndex}
                isSolving={isSolving}
                setIsSolving={setIsSolving}
                solverSpeed={solverSpeed}
                setSolverSpeed={setSolverSpeed}
                highlightedNodes={currentStepSnapshot}

                // Auto simulation props
                autoSimulate={autoSimulate}
                setAutoSimulate={setAutoSimulate}

                // Theory props
                degreeCentrality={degreeCentrality}
                isGraphConnected={isGraphConnected}
                adjacencyListStr={adjacencyListStr}
                matrixHeaders={matrixHeaders}
                matrixCells={matrixCells}
              />
            )} 
            {view === "analytics" && <Analytics data={data}/>} 
            {view === "saved" && <SavedRoutes data={data} nodeMap={nodeMap} onDelete={(id) => deleteMutation.mutate(id)}/>} 
            {view === "alerts" && <Alerts data={data}/>} 
            {view === "admin" && <Admin data={data} onRoadTrafficChange={handleRoadTrafficChange}/>}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function LogoMark() { return <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[var(--shadow-glow)]"><Navigation className="size-5 -rotate-12"/></span>; }
function LoadingScreen() { return <div className="min-h-screen bg-background p-5"><div className="mx-auto grid max-w-7xl animate-pulse gap-4 lg:grid-cols-[320px_1fr]"><div className="h-[620px] rounded-3xl bg-muted"/><div className="h-[620px] rounded-3xl bg-muted"/></div></div>; }

function MapWorkspace(props: {
  nodes: GraphNode[];
  roads: GraphRoad[];
  source: string;
  destination: string;
  setSource: (v: string) => void;
  setDestination: (v: string) => void;
  preference: "fastest" | "shortest";
  setPreference: (v: "fastest" | "shortest") => void;
  result: RouteResult | null;
  calculate: () => void;
  calculating: boolean;
  routeError?: string;
  routeName: string;
  setRouteName: (v: string) => void;
  saveRoute: () => void;
  saving: boolean;
  alternatives: Record<Algorithm, RouteResult | null> | null;
  activeAlgorithm: Algorithm;
  setActiveAlgorithm: (v: Algorithm) => void;
  onRoadTrafficChange: (roadId: string, level: "low" | "medium" | "heavy" | "closed") => void;

  editorMode: boolean;
  setEditorMode: (v: boolean) => void;
  pendingNodeCoords: { lat: number; lng: number } | null;
  setPendingNodeCoords: (v: { lat: number; lng: number } | null) => void;
  newNodeName: string;
  setNewNodeName: (v: string) => void;
  handleAddNode: () => void;
  newRoadStart: string;
  setNewRoadStart: (v: string) => void;
  newRoadEnd: string;
  setNewRoadEnd: (v: string) => void;
  newRoadName: string;
  setNewRoadName: (v: string) => void;
  newRoadDistance: string;
  setNewRoadDistance: (v: string) => void;
  newRoadTime: string;
  setNewRoadTime: (v: string) => void;
  newRoadTraffic: "low" | "medium" | "heavy" | "closed";
  setNewRoadTraffic: (v: "low" | "medium" | "heavy" | "closed") => void;
  newRoadBi: boolean;
  setNewRoadBi: (v: boolean) => void;
  handleAddRoad: () => void;
  handleDeleteNode: (id: string) => void;
  handleDeleteRoad: (id: string) => void;
  handleResetGraph: () => void;
  handleMapClick: (lat: number, lng: number) => void;

  currentStepIndex: number;
  setCurrentStepIndex: (v: number) => void;
  isSolving: boolean;
  setIsSolving: (v: boolean) => void;
  solverSpeed: number;
  setSolverSpeed: (v: number) => void;
  highlightedNodes: { current: string | null; frontier: string[]; visited: string[] } | null;

  autoSimulate: boolean;
  setAutoSimulate: (v: boolean) => void;

  degreeCentrality: Array<{ id: string; name: string; degree: number }>;
  isGraphConnected: boolean;
  adjacencyListStr: string;
  matrixHeaders: GraphNode[];
  matrixCells: Record<string, Record<string, string>>;
}) {
  const [activeTab, setActiveTab] = useState<"plan" | "edit" | "solver" | "theory">("plan");
  const destinationName = props.nodes.find((node) => node.id === props.destination)?.name;
  const arrival = props.result ? new Date(Date.now() + props.result.time * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  
  // Set matrix type toggle
  const [matrixType, setMatrixType] = useState<"list" | "matrix">("list");

  return (
    <div className="grid min-h-[calc(100vh-6.5rem)] gap-4 xl:grid-cols-[380px_1fr]">
      {/* Sidebar Control Panel */}
      <section className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col gap-4 max-h-[calc(100vh-8.5rem)] overflow-y-auto custom-scrollbar">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/50 rounded-xl border border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg py-1.5 text-xs font-semibold ${activeTab === "plan" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("plan")}
          >
            <Navigation className="size-3.5 mr-1" /> Plan
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg py-1.5 text-xs font-semibold ${activeTab === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("edit")}
          >
            <Plus className="size-3.5 mr-1" /> Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg py-1.5 text-xs font-semibold ${activeTab === "solver" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("solver")}
          >
            <Play className="size-3.5 mr-1" /> Solver
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg py-1.5 text-xs font-semibold ${activeTab === "theory" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("theory")}
          >
            <Network className="size-3.5 mr-1" /> Theory
          </Button>
        </div>

        {/* Tab 1: PLAN */}
        {activeTab === "plan" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Smart route planner</p>
              <h2 className="mt-1 text-xl font-bold">Where are you going?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Live weights are updated automatically.</p>
              
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-muted-foreground">
                  STARTING POINT
                  <Select value={props.source} onValueChange={props.setSource}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {props.nodes.map(n=><SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
                
                <label className="block text-xs font-semibold text-muted-foreground">
                  DESTINATION
                  <Select value={props.destination} onValueChange={props.setDestination}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {props.nodes.map(n=><SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
                
                <label className="block text-xs font-semibold text-muted-foreground">
                  ROUTE PREFERENCE
                  <Select value={props.preference} onValueChange={(value)=>props.setPreference(value as "fastest"|"shortest")}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fastest">Fastest arrival</SelectItem>
                      <SelectItem value="shortest">Shortest distance</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <Button 
                  variant="hero" 
                  size="lg" 
                  className="w-full rounded-xl mt-2 font-semibold" 
                  onClick={props.calculate} 
                  disabled={props.calculating || !props.source || props.source === props.destination}
                >
                  <Navigation className="mr-1.5 size-4" />{props.calculating ? "Finding best route…" : "Calculate best route"}
                </Button>
              </div>
            </div>

            {/* Simulated Live engine switch */}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Auto-Recalculate Traffic</h3>
                <p className="text-[10px] text-muted-foreground">Reroutes automatically on fluctuating traffic weights.</p>
              </div>
              <Button 
                variant={props.autoSimulate ? "secondary" : "outline"} 
                size="sm" 
                className="h-8 rounded-lg text-xs" 
                onClick={() => props.setAutoSimulate(!props.autoSimulate)}
              >
                {props.autoSimulate ? "Active" : "Simulate"}
              </Button>
            </div>

            {/* Grid Traffic Simulator list */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-1">Interactive Congestion Tweaker</h3>
              <p className="text-xs text-muted-foreground mb-3">Adjust individual road congestion weights in real-time.</p>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {props.roads.map(road => (
                  <div key={road.id} className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-lg gap-2">
                    <span className="font-medium truncate max-w-44" title={road.name}>{road.name}</span>
                    <Select value={road.traffic_level} onValueChange={(val) => props.onRoadTrafficChange(road.id, val as any)}>
                      <SelectTrigger className="h-7 w-24 text-[10px] rounded-md shrink-0"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (1.0x)</SelectItem>
                        <SelectItem value="medium">Medium (1.5x)</SelectItem>
                        <SelectItem value="heavy">Heavy (2.5x)</SelectItem>
                        <SelectItem value="closed">Closed (99.0x)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Algorithms Comparison */}
            {props.result && props.alternatives && (
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-1">Routing Strategy Options</h3>
                <p className="text-xs text-muted-foreground mb-3">Compare distance and junction exploration cost details.</p>
                <div className="space-y-1.5">
                  {(["astar", "dijkstra", "bfs", "dfs"] as Algorithm[]).map((algName) => {
                    const algResult = props.alternatives?.[algName];
                    if (!algResult) return null;
                    const isActive = props.activeAlgorithm === algName;
                    return (
                      <button
                        key={algName}
                        onClick={() => props.setActiveAlgorithm(algName)}
                        className={`w-full flex items-center justify-between text-xs p-3 rounded-xl border text-left transition-all ${
                          isActive 
                            ? "bg-primary/10 border-primary text-primary font-semibold shadow-md" 
                            : "bg-muted/30 border-transparent hover:bg-muted/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block font-medium truncate">{ALGORITHM_LABELS[algName]}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {algResult.visited.length} nodes processed
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block font-medium">{Math.round(algResult.time)} min</span>
                          <span className="text-[10px] text-muted-foreground">{algResult.distance.toFixed(1)} km</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: EDIT GRAPH */}
        {activeTab === "edit" && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Visual Topology Editor</p>
              <h2 className="mt-1 text-xl font-bold">Design City Grid</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click directly on the map to place a new junction.</p>
            </div>

            {/* Map click prompt container */}
            {props.pendingNodeCoords ? (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 space-y-2">
                <div className="flex justify-between font-semibold text-primary">
                  <span>Create Junction</span>
                  <button onClick={() => props.setPendingNodeCoords(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Location: Lat {props.pendingNodeCoords.lat.toFixed(5)}, Lng {props.pendingNodeCoords.lng.toFixed(5)}
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. Central Station" 
                    value={props.newNodeName} 
                    onChange={e => props.setNewNodeName(e.target.value)} 
                    className="h-8 text-xs bg-background"
                  />
                  <Button size="sm" className="h-8 rounded-lg" onClick={props.handleAddNode}>Create</Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border rounded-xl p-3 text-center text-muted-foreground py-4">
                <p>💡 Map editing is active. Click anywhere on the dark map background to drop a new node pin.</p>
              </div>
            )}

            {/* Add Road edge form */}
            <div className="border-t border-border pt-3 space-y-3">
              <h3 className="text-sm font-semibold">Establish Road Link</h3>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Start</span>
                    <Select value={props.newRoadStart} onValueChange={props.setNewRoadStart}>
                      <SelectTrigger className="h-8 text-[11px] rounded-lg mt-0.5"><SelectValue placeholder="Select..."/></SelectTrigger>
                      <SelectContent>
                        {props.nodes.map(n=><SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </label>
                  
                  <label>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">End</span>
                    <Select value={props.newRoadEnd} onValueChange={props.setNewRoadEnd}>
                      <SelectTrigger className="h-8 text-[11px] rounded-lg mt-0.5"><SelectValue placeholder="Select..."/></SelectTrigger>
                      <SelectContent>
                        {props.nodes.map(n=><SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Distance (km)</span>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={props.newRoadDistance} 
                      onChange={e => props.setNewRoadDistance(e.target.value)} 
                      className="h-8 mt-0.5 text-xs"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Travel Time (min)</span>
                    <Input 
                      type="number" 
                      step="0.5" 
                      value={props.newRoadTime} 
                      onChange={e => props.setNewRoadTime(e.target.value)} 
                      className="h-8 mt-0.5 text-xs"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Road Name (Optional)</span>
                  <Input 
                    placeholder="e.g. Ring Road Link" 
                    value={props.newRoadName} 
                    onChange={e => props.setNewRoadName(e.target.value)} 
                    className="h-8 mt-0.5 text-xs"
                  />
                </label>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={props.newRoadBi} 
                      onChange={e => props.setNewRoadBi(e.target.checked)} 
                      className="rounded accent-primary" 
                    />
                    <span>Two-Way Road</span>
                  </label>
                  <Button size="sm" className="h-8 rounded-lg" onClick={props.handleAddRoad} disabled={!props.newRoadStart || !props.newRoadEnd || props.newRoadStart === props.newRoadEnd}>
                    Add Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Custom structure cleanup actions */}
            <div className="border-t border-border pt-3 flex gap-2">
              <Button variant="outline" size="sm" className="w-full h-8 text-[11px] rounded-lg" onClick={props.handleResetGraph}>
                <RefreshCw className="mr-1 size-3" /> Reset Grid to Defaults
              </Button>
            </div>

            {/* List of custom added junctions */}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Manage Grid Junctions</h4>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{props.nodes.length} total</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {props.nodes.map(node => (
                  <div key={node.id} className="flex justify-between items-center bg-muted/30 p-2 rounded-lg text-[11px]">
                    <span className="font-medium truncate max-w-44">{node.name}</span>
                    <button 
                      onClick={() => props.handleDeleteNode(node.id)}
                      className="text-muted-foreground hover:text-danger p-0.5 rounded hover:bg-muted"
                      title="Delete Node"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: VISUAL PLAYBACK SOLVER */}
        {activeTab === "solver" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Frontier Explorer</p>
              <h2 className="mt-1 text-xl font-bold">Route Path Solver</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Visualize step-by-step frontier node evaluation in real-time.</p>
            </div>

            {!props.result ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                <HelpCircle className="mx-auto size-8 mb-2 opacity-50" />
                <p className="text-xs">Plan a routing journey inside the <strong>Plan</strong> tab first to visualize solver playback steps.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Active algorithm strategy display */}
                <div className="bg-muted/40 p-3 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Strategy</span>
                  <p className="text-sm font-semibold text-primary">{ALGORITHM_LABELS[props.activeAlgorithm]}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Evaluates neighbors based on {props.activeAlgorithm === "astar" ? "heuristic air-distance + road time weight" : props.activeAlgorithm === "dijkstra" ? "cumulative road travel cost" : props.activeAlgorithm === "bfs" ? "shallowest road junction count" : "depth-first search frontier order"}.
                  </p>
                </div>

                {/* Solver Controls */}
                <div className="space-y-3 bg-muted/20 border border-border p-3 rounded-xl">
                  <div className="flex justify-between items-center text-[11px] font-medium text-muted-foreground">
                    <span>Step Progress</span>
                    <span>
                      {props.currentStepIndex + 1} / {props.result.steps?.length ?? 0}
                    </span>
                  </div>

                  {/* Step Timeline slider */}
                  <input 
                    type="range" 
                    min="-1" 
                    max={(props.result.steps?.length ?? 0) - 1} 
                    value={props.currentStepIndex} 
                    onChange={e => {
                      props.setCurrentStepIndex(parseInt(e.target.value));
                      props.setIsSolving(false);
                    }}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />

                  {/* Player Buttons */}
                  <div className="flex justify-center items-center gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="size-8 rounded-lg"
                      onClick={() => {
                        props.setIsSolving(false);
                        props.setCurrentStepIndex(-1);
                      }}
                      title="Rewind to start"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="size-8 rounded-lg"
                      onClick={() => {
                        props.setIsSolving(false);
                        props.setCurrentStepIndex(prev => Math.max(-1, prev - 1));
                      }}
                      disabled={props.currentStepIndex <= -1}
                      title="Step Backward"
                    >
                      <SkipBack className="size-3.5" />
                    </Button>
                    <Button 
                      variant={props.isSolving ? "secondary" : "hero"} 
                      size="icon" 
                      className="size-10 rounded-lg shadow-md"
                      onClick={() => props.setIsSolving(!props.isSolving)}
                      disabled={props.currentStepIndex >= (props.result.steps?.length ?? 0) - 1 && !props.isSolving}
                      title={props.isSolving ? "Pause Solver" : "Play Solver"}
                    >
                      {props.isSolving ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="size-8 rounded-lg"
                      onClick={() => {
                        props.setIsSolving(false);
                        props.setCurrentStepIndex(prev => Math.min((props.result?.steps?.length ?? 0) - 1, prev + 1));
                      }}
                      disabled={props.currentStepIndex >= (props.result.steps?.length ?? 0) - 1}
                      title="Step Forward"
                    >
                      <SkipForward className="size-3.5" />
                    </Button>
                  </div>

                  {/* Speed playback selector */}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Speed</span>
                      <span>{(1000 / props.solverSpeed).toFixed(1)}x ({props.solverSpeed}ms)</span>
                    </div>
                    <input 
                      type="range" 
                      min="150" 
                      max="1500" 
                      step="50" 
                      value={props.solverSpeed} 
                      onChange={e => props.setSolverSpeed(parseInt(e.target.value))}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Solver state values description */}
                {props.currentStepIndex >= 0 && props.result.steps?.[props.currentStepIndex] && (
                  <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 space-y-2">
                    <p className="font-semibold text-primary">Evaluate Step Info</p>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Current Node:</span>
                        <strong className="text-foreground">
                          {props.nodes.find(n => n.id === props.result?.steps?.[props.currentStepIndex]?.current)?.name || "Target"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Frontier Open Set:</span>
                        <strong className="text-foreground">
                          {props.result.steps[props.currentStepIndex].frontier.length} junctions
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Visited Nodes:</span>
                        <strong className="text-foreground">
                          {props.result.steps[props.currentStepIndex].visited.length} junctions
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Color Legend */}
                <div className="bg-muted/30 border border-border p-3 rounded-xl space-y-1.5 text-[10px]">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Color Legends</p>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#ec4899]" />
                    <span>Evaluating node (focus)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#eab308]" />
                    <span>Frontier (open queue)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#3b82f6]" />
                    <span>Visited nodes (closed list)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: GRAPH THEORY METRICS */}
        {activeTab === "theory" && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Structural Analytics</p>
              <h2 className="mt-1 text-xl font-bold">Graph Theory Panel</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Explore topological configurations and centrality metrics.</p>
            </div>

            {/* Centrality & Connectivity Card */}
            <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Grid Connectivity:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${props.isGraphConnected ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {props.isGraphConnected ? "Fully Connected Grid" : "Isolated Junctions Detected"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                {props.isGraphConnected 
                  ? "All nodes have at least one reachable road path connecting them to the rest of the city grid." 
                  : "Some intersections cannot reach the main grid. Review road connections."}
              </p>
            </div>

            {/* Hub Centrality list */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Degree Centrality Hubs</h3>
              <div className="bg-muted/20 border border-border rounded-xl p-3 space-y-2">
                {props.degreeCentrality.slice(0, 4).map((item, idx) => (
                  <div key={item.id} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-border/40 last:border-b-0 last:pb-0">
                    <span className="font-medium truncate max-w-44">{idx + 1}. {item.name}</span>
                    <span className="text-primary font-semibold">{item.degree} links</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix / List toggle button */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">Graph Representation</h3>
                <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border">
                  <button 
                    onClick={() => setMatrixType("list")} 
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${matrixType === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Adjacency List
                  </button>
                  <button 
                    onClick={() => setMatrixType("matrix")} 
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${matrixType === "matrix" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Matrix
                  </button>
                </div>
              </div>

              {matrixType === "list" ? (
                <pre className="bg-card/60 p-3 rounded-xl border border-border text-[10px] leading-relaxed overflow-x-auto max-h-56 font-mono text-muted-foreground custom-scrollbar">
                  {props.adjacencyListStr}
                </pre>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-card/60 max-h-56 overflow-auto custom-scrollbar">
                  <table className="w-full text-left font-mono text-[9px] border-collapse min-w-[280px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="p-1.5 font-bold border-r border-border shrink-0 text-center sticky top-0 bg-muted/50">Node</th>
                        {props.matrixHeaders.map(h => (
                          <th key={h.id} className="p-1.5 font-bold text-center truncate max-w-[50px] sticky top-0 bg-muted/50" title={h.name}>
                            {h.name.slice(0, 5)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {props.matrixHeaders.map(rowNode => (
                        <tr key={rowNode.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-1.5 font-bold border-r border-border sticky left-0 bg-card/60 max-w-[60px] truncate" title={rowNode.name}>
                            {rowNode.name.slice(0, 5)}
                          </td>
                          {props.matrixHeaders.map(colNode => {
                            const val = props.matrixCells[rowNode.id]?.[colNode.id] || "∞";
                            const isZero = val === "0";
                            const isInf = val === "∞";
                            return (
                              <td 
                                key={colNode.id} 
                                className={`p-1.5 text-center ${isZero ? "text-muted-foreground/30" : isInf ? "text-danger/40" : "text-primary font-bold"}`}
                              >
                                {val.replace(" km", "")}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Route details card (persistent when planned) */}
        {props.result && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="border-t border-border pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Path Details</p>
                <b className="mt-1 block text-2xl text-primary">{Math.round(props.result.time)} min</b>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${props.result.traffic === "heavy" ? "bg-danger/15 text-danger" : "bg-success/15 text-success"}`}>
                {props.result.traffic === "heavy" ? "Heavy congestion" : props.result.traffic === "medium" ? "Moderate flow" : "Clear flow"}
              </span>
            </div>
            
            <div className="mt-3.5 grid grid-cols-3 gap-2">
              {[[`${props.result.distance.toFixed(1)} km`,`Distance`],[arrival,"Arrival"],[`${(props.result.fuel).toFixed(1)} L`,`Fuel`]].map(([value,label])=>(
                <div key={label} className="rounded-xl bg-muted/60 p-2 text-center border border-border/40">
                  <b className="block text-xs text-foreground">{value}</b>
                  <small className="text-[9px] text-muted-foreground leading-none">{label}</small>
                </div>
              ))}
            </div>
            
            <div className="mt-3 flex gap-2">
              <Input placeholder="Name this route" value={props.routeName} onChange={e=>props.setRouteName(e.target.value)} maxLength={80} className="h-9 text-xs bg-muted/30" />
              <Button variant="glass" size="icon" onClick={props.saveRoute} disabled={props.saving} aria-label="Save route" className="h-9 w-9 rounded-lg"><Bookmark className="size-4"/></Button>
            </div>
          </motion.div>
        )}
      </section>

      {/* Main Map View Area */}
      <section className="relative min-h-[560px] overflow-hidden rounded-3xl border border-border bg-map">
        <Suspense fallback={<div className="grid size-full place-items-center text-sm text-muted-foreground">Loading live map…</div>}>
          <TrafficMap 
            locations={props.nodes} 
            roads={props.roads} 
            route={props.currentStepIndex >= 0 ? [] : (props.result?.path ?? [])} 
            editorMode={activeTab === "edit"}
            onMapClick={props.handleMapClick}
            highlightedNodes={props.highlightedNodes}
          />
        </Suspense>
        
        {/* Floating map controls info */}
        <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
          <span className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] backdrop-blur-xl font-medium">
            <span className="text-success">●</span> Live Grid Monitor
          </span>
          <span className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] backdrop-blur-xl font-medium">
            {props.roads.filter(r=>r.traffic_level==='heavy').length} heavy bottlenecks
          </span>
          {activeTab === "edit" && (
            <span className="rounded-full border border-primary bg-primary/20 text-primary px-3 py-1.5 text-[11px] backdrop-blur-xl font-semibold animate-pulse">
              🛠 Editor Mode Active
            </span>
          )}
        </div>
        
        {props.result && (
          <div className="absolute bottom-4 left-4 right-4 z-[500] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card/90 p-3.5 backdrop-blur-xl sm:left-auto sm:w-80">
            <div className="min-w-0">
              <p className="truncate text-[10px] text-muted-foreground font-semibold uppercase">Continue to {destinationName}</p>
              <b className="text-lg">Arrival: {arrival}</b>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <RouteIcon className="size-5" />
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

type Workspace = Awaited<ReturnType<typeof getTrafficWorkspace>>;
function Analytics({data}:{data:Workspace}) { 
  const avg = data.searches.length ? Math.round(data.searches.reduce((sum,item)=>sum+Number(item.travel_time_minutes),0)/data.searches.length) : 0; 
  const stats=[
    [RouteIcon,data.searches.length,"Journeys calculated"],
    [Clock3,`${avg} min`,"Average travel duration"],
    [AlertTriangle,data.alerts.length,"Active incidents"],
    [Bookmark,data.saved.length,"Bookmarked routes"]
  ] as const; 
  
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([Icon,value,label])=>(
          <article key={label} className="glass-panel rounded-2xl p-5 border border-border">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5"/></span>
            <b className="mt-4 block font-display text-2xl">{value}</b>
            <p className="text-xs text-muted-foreground">{label}</p>
          </article>
        ))}
      </div>
      
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="glass-panel rounded-2xl p-5 border border-border">
          <h2 className="text-lg font-bold">Grid Load by Hour</h2>
          <p className="text-xs text-muted-foreground mb-4">City congestion forecast metrics</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficChart}>
                <defs>
                  <linearGradient id="flow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45}/>
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="t" stroke="var(--muted-foreground)" style={{fontSize: 10}}/>
                <YAxis stroke="var(--muted-foreground)" style={{fontSize: 10}}/>
                <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,fontSize:11}}/>
                <Area type="monotone" dataKey="flow" stroke="var(--primary)" fill="url(#flow)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        
        <section className="glass-panel rounded-2xl p-5 border border-border flex flex-col">
          <h2 className="text-lg font-bold">Calculation Log History</h2>
          <p className="text-xs text-muted-foreground mb-4">Audit history of client searches</p>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-64 custom-scrollbar">
            {data.searches.slice(0,6).map((item)=>(
              <div key={item.id} className="flex gap-2.5 border-b border-border/50 pb-3 last:border-b-0">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"/>
                <div className="text-xs min-w-0">
                  <p className="font-semibold text-foreground truncate">{ALGORITHM_LABELS[item.algorithm as Algorithm] || item.algorithm}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {Number(item.distance_km).toFixed(1)} km · {Math.round(Number(item.travel_time_minutes))} min · {item.junction_count} nodes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  ); 
}

function SavedRoutes({data,nodeMap,onDelete}:{data:Workspace;nodeMap:Map<string,GraphNode>;onDelete:(id:string)=>void}) { 
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Bookmarked Routes</h2>
        <p className="text-xs text-muted-foreground">Frequent commutes stored locally in database.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.saved.length ? data.saved.map(route => (
          <article key={route.id} className="glass-panel rounded-2xl p-4 transition-all hover:-translate-y-0.5 border border-border space-y-3">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <RouteIcon className="size-4.5" />
              </span>
              <Button variant="ghost" size="icon" onClick={() => onDelete(route.id)} aria-label="Delete route" className="size-7 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger">
                <Trash2 className="size-4"/>
              </Button>
            </div>
            
            <div>
              <span className="text-[9px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {ALGORITHM_LABELS[route.algorithm as Algorithm] || route.algorithm}
              </span>
              <h3 className="mt-2 text-md font-bold text-foreground leading-tight truncate">{route.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nodeMap.get(route.source_id)?.name || "Start"} ➔ {nodeMap.get(route.destination_id)?.name || "End"}
              </p>
            </div>
            
            <div className="flex gap-4 text-xs pt-1.5 border-t border-border/40 text-muted-foreground">
              <span>Distance: <b className="text-foreground">{Number(route.distance_km).toFixed(1)} km</b></span>
              <span>Time: <b className="text-foreground">{Math.round(Number(route.travel_time_minutes))} min</b></span>
            </div>
          </article>
        )) : (
          <div className="glass-panel rounded-2xl p-10 text-center md:col-span-2 xl:col-span-3 border border-border">
            <Bookmark className="mx-auto size-8 text-muted-foreground opacity-50 mb-2"/>
            <h3 className="font-bold text-md">No saved journeys</h3>
            <p className="text-xs text-muted-foreground mt-1">Plan a journey on the Live Map tab and click bookmark to save.</p>
          </div>
        )}
      </div>
    </div>
  ); 
}

function Alerts({data}:{data:Workspace}) { 
  const items = data.alerts.map(alert=>({id:alert.id,title:alert.title,message:alert.description,category:alert.category})); 
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Incidents & Intelligence</h2>
        <p className="text-xs text-muted-foreground">Real-time alerts affecting travel congestion.</p>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <section className="glass-panel rounded-2xl p-4 border border-border space-y-3">
          <div className="space-y-2">
            {items.map(item => (
              <article key={item.id} className="rounded-xl border border-border bg-muted/20 p-3.5 flex items-start gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning shrink-0">
                  <AlertTriangle className="size-4.5" />
                </span>
                <div className="text-xs min-w-0">
                  <h3 className="font-bold text-foreground leading-snug">{item.title}</h3>
                  <span className="text-[9px] capitalize bg-muted px-1.5 py-0.5 rounded text-muted-foreground inline-block mt-1">{item.category.replaceAll("_"," ")}</span>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{item.message}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        
        <section className="glass-panel rounded-2xl p-5 border border-border space-y-5">
          <h3 className="text-md font-bold">Standard Commute Congestion Peaks</h3>
          <div className="space-y-4">
            {[["Morning Rush Hours","08:00–10:00",82],["Midday Lunch Traffic","12:00–14:00",61],["Evening Commute Rush","17:00–19:30",94]].map(([label,time,value])=>(
              <div key={String(label)} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span>{label}</span>
                  <span className="text-muted-foreground">{time}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-warning" style={{width:`${value}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  ); 
}

function Admin({data, onRoadTrafficChange}:{data:Workspace; onRoadTrafficChange?: (roadId: string, level: "low" | "medium" | "heavy" | "closed") => void}) {
  const stats=[
    {Icon:Users,value:"Active Node Grid",label:"Management console"},
    {Icon:Building2,value:data.roads.length,label:"Managed city links"},
    {Icon:Gauge,value:"87% Efficiency",label:"Average network rate"},
    {Icon:AlertTriangle,value:data.alerts.length,label:"Reported accidents"}
  ];
  
  return (
    <div className="space-y-5">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Operations</p>
        <h2 className="text-xl font-bold">System Dashboard</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Control live database elements and system parameters.</p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({Icon,value,label})=>(
          <article key={label} className="glass-panel rounded-2xl p-5 border border-border">
            <Icon className="text-primary size-5 mb-4"/>
            <b className="block text-xl font-bold leading-tight">{value}</b>
            <span className="text-xs text-muted-foreground mt-1 block">{label}</span>
          </article>
        ))}
      </div>
      
      <section className="glass-panel overflow-x-auto rounded-2xl p-5 border border-border">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-md font-bold">Network Roads Database</h3>
          <Button variant="hero" size="sm" className="h-8 rounded-lg text-xs">Export Grid PDF</Button>
        </div>
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/80">
            <tr>
              <th className="pb-2">Road Link Name</th>
              <th>Distance</th>
              <th>Typical Duration</th>
              <th>Traffic status</th>
              <th>Operational Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.roads.map(road=>(
              <tr key={road.id} className="border-t border-border/40 hover:bg-muted/10">
                <td className="py-3 font-semibold text-foreground">{road.name}</td>
                <td>{Number(road.distance_km).toFixed(1)} km</td>
                <td>{Number(road.base_time_minutes)} min</td>
                <td className="py-1.5">
                  <Select value={road.traffic_level} onValueChange={(val) => onRoadTrafficChange?.(road.id, val as any)}>
                    <SelectTrigger className="h-8 w-28 text-[11px] rounded-lg bg-muted/40"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Flow</SelectItem>
                      <SelectItem value="medium">Medium Flow</SelectItem>
                      <SelectItem value="heavy">Heavy Flow</SelectItem>
                      <SelectItem value="closed">Closed Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td>{Math.max(12,Math.round(100/Number(road.traffic_weight)))}% flow rate</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}