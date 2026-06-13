import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, BellRing, Clock3, MapPinned, Navigation, Route as RouteIcon, ShieldCheck, Sparkles } from "lucide-react";
import { lazy, Suspense } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

const TrafficMap = lazy(() => {
  if (typeof window === "undefined") {
    return Promise.resolve({ default: () => <div className="city-grid size-full" /> });
  }
  return import("@/components/traffic-map").then((module) => ({ default: module.TrafficMap }));
});
const previewLocations = [
  { id: "times", name: "Times Square", latitude: 40.758, longitude: -73.9855 },
  { id: "central", name: "Grand Central", latitude: 40.7527, longitude: -73.9772 },
  { id: "park", name: "Central Park", latitude: 40.7678, longitude: -73.9819 },
  { id: "empire", name: "Empire State", latitude: 40.7484, longitude: -73.9857 },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UrbanFlow Navigation | Navigate Smarter" },
      { name: "description", content: "Real-time traffic intelligence and route optimization for faster, calmer city journeys." },
      { property: "og:title", content: "UrbanFlow Navigation | Navigate Smarter" },
      { property: "og:description", content: "Live traffic, smarter routes, and city-wide travel intelligence in one navigation platform." },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [{ icon: RouteIcon, title: "Smarter routes", text: "Live road conditions shape every journey before you leave." }, { icon: Activity, title: "Traffic intelligence", text: "See congestion, incidents, closures, and peak-hour pressure at a glance." }, { icon: ShieldCheck, title: "Reliable guidance", text: "Clear ETAs, route summaries, and proactive alerts keep every trip on track." }];
  return <main className="min-h-screen overflow-hidden bg-background text-foreground">
    <header className="fixed inset-x-0 top-0 z-[1000] border-b border-border bg-background/75 backdrop-blur-xl"><nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link to="/" className="flex items-center gap-3 font-display text-lg font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"><Navigation className="size-5 -rotate-12" /></span>UrbanFlow</Link><div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"><a href="#platform" className="hover:text-foreground">Platform</a><a href="#intelligence" className="hover:text-foreground">Traffic intelligence</a><a href="#insights" className="hover:text-foreground">Insights</a></div><Button asChild variant="hero"><Link to="/auth">Open navigator <ArrowRight /></Link></Button></nav></header>
    <section className="relative min-h-[92vh] pt-16 city-grid"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_35%),linear-gradient(to_bottom,transparent,var(--background))]" /><div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:py-32">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}><span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary"><Sparkles className="size-3" /> Live city intelligence</span><h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-6xl lg:text-7xl">Navigate Smarter.<br/><span className="text-primary">Travel Faster.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Real-time traffic intelligence and route optimization for modern cities.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild variant="hero" size="xl"><Link to="/auth">Plan a journey <ArrowRight /></Link></Button><Button asChild variant="glass" size="xl"><a href="#intelligence">Explore live insights</a></Button></div><div className="mt-10 flex flex-wrap gap-7 text-sm text-muted-foreground"><span><b className="text-2xl text-foreground">87%</b><br/>City flow</span><span><b className="text-2xl text-foreground">12 min</b><br/>Average trip</span><span><b className="text-2xl text-foreground">24/7</b><br/>Live monitoring</span></div></motion.div>
      <motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .15 }} className="glass-panel relative aspect-[4/3] overflow-hidden rounded-3xl bg-map"><Suspense fallback={<div className="city-grid size-full"/>}><TrafficMap locations={previewLocations} route={["empire","central","times","park"]} interactive={false}/></Suspense><div className="glass-panel absolute left-5 top-5 z-[500] rounded-2xl p-4"><p className="text-xs text-muted-foreground">Fastest arrival</p><p className="mt-1 font-display text-2xl font-semibold text-foreground">14 min</p><span className="text-xs text-success">● Traffic moving well</span></div><div className="glass-panel absolute bottom-5 right-5 z-[500] flex items-center gap-3 rounded-2xl p-4"><Clock3 className="text-primary"/><div><p className="text-xs text-muted-foreground">Arrival</p><b>08:42 AM</b></div></div></motion.div>
    </div></section>
    <section id="platform" className="mx-auto max-w-7xl px-4 py-24 sm:px-6"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Built for real journeys</p><h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">One calm view of the road ahead.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="glass-panel rounded-2xl p-7 transition-transform hover:-translate-y-1"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon/></span><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-2 leading-7 text-muted-foreground">{text}</p></article>)}</div></section>
    <section id="intelligence" className="border-y border-border bg-map py-24 text-primary-foreground"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-12 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Traffic intelligence</p><h2 className="mt-3 text-4xl font-semibold">Know what is happening before it slows you down.</h2><p className="mt-5 max-w-xl leading-7 opacity-65">Live congestion, road closures, accident alerts, traffic hotspots, and peak-hour forecasts in one clear operational view.</p></div><div className="grid grid-cols-2 gap-3">{["Live congestion","Incident alerts","Road closures","Peak forecasts"].map((name,i)=><div key={name} className="rounded-2xl border border-border bg-card/10 p-5"><span className="text-xs text-primary">0{i+1}</span><h3 className="mt-7 font-semibold">{name}</h3></div>)}</div></div></div></section>
    <section id="insights" className="mx-auto max-w-7xl px-4 py-24 sm:px-6"><div className="glass-panel grid overflow-hidden rounded-3xl lg:grid-cols-2"><div className="p-8 sm:p-12"><BellRing className="text-warning"/><h2 className="mt-6 text-4xl font-semibold">Your city.<br/>Your clearest route.</h2><p className="mt-4 leading-7 text-muted-foreground">Journey history, saved destinations, traffic analytics, proactive notifications, and smart route planning stay together across every device.</p><Button asChild variant="hero" size="xl" className="mt-8"><Link to="/auth">Open UrbanFlow</Link></Button></div><div className="min-h-80 bg-map p-8"><div className="grid h-full grid-cols-2 gap-4">{[["Routes planned","1,284"],["Average delay","6.2 min"],["Network flow","87%"],["Active alerts","03"]].map(([label,value])=><div key={label} className="rounded-2xl border border-border bg-card/10 p-5 text-primary-foreground"><p className="text-xs opacity-55">{label}</p><b className="mt-5 block font-display text-3xl">{value}</b></div>)}</div></div></div></section>
    <footer className="border-t border-border py-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:px-6"><span className="flex items-center gap-2 font-display text-foreground"><MapPinned className="size-4 text-primary"/> UrbanFlow Navigation</span><span>Real-time intelligence for modern cities</span></div></footer>
  </main>;
}
