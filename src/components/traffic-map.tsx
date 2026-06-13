import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface MapRoad {
  id: string;
  start_node: string;
  end_node: string;
  name: string;
  traffic_level: "low" | "medium" | "heavy" | "closed";
}

function FitRoute({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points as LatLngBoundsExpression, { padding: [56, 56] });
  }, [map, points]);
  return null;
}

function MapClickHandler({ onClick, enabled }: { onClick?: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled && onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function TrafficMap({
  locations,
  roads = [],
  route = [],
  interactive = true,
  editorMode = false,
  onMapClick,
  highlightedNodes = null,
}: {
  locations: MapLocation[];
  roads?: MapRoad[];
  route?: string[];
  interactive?: boolean;
  editorMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  highlightedNodes?: { current: string | null; frontier: string[]; visited: string[] } | null;
}) {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const fallback: LatLngExpression = [40.758, -73.9855];
  const center: LatLngExpression = locations.length
    ? [locations.reduce((sum, item) => sum + item.latitude, 0) / locations.length, locations.reduce((sum, item) => sum + item.longitude, 0) / locations.length]
    : fallback;
  const routePoints = route.flatMap((id) => {
    const location = byId.get(id);
    return location ? ([[location.latitude, location.longitude]] as LatLngExpression[]) : [];
  });
  const trafficColor = (level: MapRoad["traffic_level"]) => level === "closed" ? "#ef4444" : level === "heavy" ? "#f43f5e" : level === "medium" ? "#f59e0b" : "#22c55e";

  const getMarkerColor = (id: string) => {
    if (highlightedNodes) {
      if (highlightedNodes.current === id) return "#ec4899"; // Pink for current
      if (highlightedNodes.frontier.includes(id)) return "#eab308"; // Yellow for frontier
      if (highlightedNodes.visited.includes(id)) return "#3b82f6"; // Blue for visited
    }
    return route.includes(id) ? "#10b8b0" : "#0b2a3c";
  };

  const getMarkerRadius = (id: string) => {
    if (highlightedNodes) {
      if (highlightedNodes.current === id) return 10;
      if (highlightedNodes.frontier.includes(id) || highlightedNodes.visited.includes(id)) return 7;
    }
    return route.includes(id) ? 7 : 4;
  };

  return (
    <MapContainer center={center} zoom={13} zoomControl={interactive} dragging={interactive} scrollWheelZoom={interactive} attributionControl={interactive} className="size-full">
      <TileLayer attribution="&copy; OpenStreetMap contributors &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <MapClickHandler onClick={onMapClick} enabled={editorMode} />
      {roads.map((road) => {
        const start = byId.get(road.start_node);
        const end = byId.get(road.end_node);
        if (!start || !end) return null;
        return <Polyline key={road.id} positions={[[start.latitude, start.longitude], [end.latitude, end.longitude]]} pathOptions={{ color: trafficColor(road.traffic_level), weight: 5, opacity: 0.72 }} />;
      })}
      {routePoints.length > 1 && !highlightedNodes && <Polyline positions={routePoints} pathOptions={{ color: "#10b8b0", weight: 8, opacity: 1, dashArray: "12 10", lineCap: "round" }} />}
      {locations.map((location) => (
        <CircleMarker key={location.id} center={[location.latitude, location.longitude]} radius={getMarkerRadius(location.id)} pathOptions={{ color: "#f6fafb", fillColor: getMarkerColor(location.id), fillOpacity: 1, weight: 2 }}>
          <Popup><strong>{location.name}</strong></Popup>
        </CircleMarker>
      ))}
      {routePoints.length > 1 && <FitRoute points={routePoints} />}
    </MapContainer>
  );
}