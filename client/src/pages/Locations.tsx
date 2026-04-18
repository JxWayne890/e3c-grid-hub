import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Location } from "@shared/types";
import { MapPin, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page";

function LocationsContent() {
  const orgQuery = useCrmOrg();
  const { data: locations } = trpc.locations.list.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: employees } = trpc.hr.listEmployees.useQuery(undefined, { enabled: !!orgQuery.data });

  const empCountByLocation: Record<number, number> = {};
  for (const e of (employees ?? []) as any[]) {
    if (e.location_id) empCountByLocation[e.location_id] = (empCountByLocation[e.location_id] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Physical Footprint"
        eyebrowIcon={MapPin}
        title="Locations"
        subtitle={`${locations?.length ?? 0} active location${(locations?.length ?? 0) === 1 ? "" : "s"} — rates, capacity, and amenities`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(locations ?? []).map((l: any) => {
          const used = empCountByLocation[l.id] ?? 0;
          const pct = l.capacity ? Math.min(Math.round((used / l.capacity) * 100), 100) : 0;
          return (
            <div key={l.id} className="group rounded-xl p-5 bg-surface/60 backdrop-blur-sm border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
              <div>
                <p className="text-foreground font-semibold">{l.name}</p>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {l.address}, {l.city}, {l.state} {l.zip}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="text-foreground font-medium">{used} / {l.capacity}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "oklch(0.78 0.12 75)" }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-2 border border-white/5 bg-background/40">
                  <p className="text-muted-foreground text-[10px] uppercase">Hourly</p>
                  <p className="text-foreground text-sm font-semibold">${Number(l.hourly_rate).toFixed(0)}</p>
                </div>
                <div className="rounded-lg p-2 border border-white/5 bg-background/40">
                  <p className="text-muted-foreground text-[10px] uppercase">Daily</p>
                  <p className="text-foreground text-sm font-semibold">${Number(l.daily_rate).toFixed(0)}</p>
                </div>
                <div className="rounded-lg p-2 border border-white/5 bg-background/40">
                  <p className="text-muted-foreground text-[10px] uppercase">Monthly</p>
                  <p className="text-foreground text-sm font-semibold">${Number(l.monthly_rate).toFixed(0)}</p>
                </div>
              </div>

              {Array.isArray(l.amenities) && l.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {l.amenities.map((a: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground">
                      <Zap className="w-2.5 h-2.5" /> {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Locations() {
  return <CrmLayout><LocationsContent /></CrmLayout>;
}
