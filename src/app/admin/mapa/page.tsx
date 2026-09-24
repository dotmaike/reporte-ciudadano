'use client';

import type { Timestamp } from 'firebase/firestore';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  BarChart3,
  Bell,
  List,
  Loader2,
  Map,
  MapPin,
  MessageSquare,
  Share2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { DynamicLocationMap } from '@/components/maps/DynamicLocationMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAdminDate } from '@/lib/dates';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

type ReportStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

type Report = {
  id: string;
  category: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  imageUrl?: string;
  status: ReportStatus;
  createdAt: Timestamp | Date;
};

const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Baches',
  lighting: 'Alumbrado',
  water_leak: 'Fuga de Agua Potable',
  garbage: 'Basura',
  civil_protection: 'Protección Civil',
  animal_welfare: 'Bienestar Animal',
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  pending: 'border-red-200 bg-red-50 text-red-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-slate-300 bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Nuevo',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
};

export default function AdminMapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const fallbackTimer = window.setTimeout(() => {
      setLoading(false);
    }, 3500);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        window.clearTimeout(fallbackTimer);
        const nextReports: Report[] = [];
        for (const reportDoc of querySnapshot.docs) {
          nextReports.push({ id: reportDoc.id, ...reportDoc.data() } as Report);
        }
        setReports(nextReports);
        setSelectedReportId((current) => current ?? nextReports[0]?.id ?? null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(fallbackTimer);
        setReports([]);
        setSelectedReportId(null);
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0],
    [reports, selectedReportId],
  );

  const stats = useMemo(() => {
    const urgent = reports.filter((report) => report.status === 'pending').length;
    const pending = reports.filter((report) => report.status !== 'resolved').length;
    return { urgent, pending };
  }, [reports]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <Loader2 className="h-8 w-8 animate-spin text-municipality-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#134c35] text-white">
        <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="relative h-7 w-7 shrink-0">
                <span className="absolute left-0 top-0 h-4 w-4 bg-[#c8aa6a]" />
                <span className="absolute bottom-0 right-0 h-4 w-4 bg-[#c8aa6a]" />
              </div>
              <span className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                Coatepec Admin
              </span>
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              <TopNav href="/admin/mapa" label="Mapa" active />
              <TopNav href="/admin" label="Reportes" />
              <TopNav href="/admin" label="Estadísticas" />
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Bell className="h-5 w-5" />
            <div className="hidden h-8 w-px bg-white/20 sm:block" />
            <div className="hidden text-right sm:block">
              <p className="font-semibold">Admin Municipal</p>
              <p className="text-sm text-white/65">Obras Públicas</p>
            </div>
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-5rem)] grid-cols-1 lg:grid-cols-[5rem_1fr_34rem]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="flex flex-col items-center gap-8 py-8 text-slate-400">
            <Map className="h-7 w-7 text-municipality-green" />
            <List className="h-6 w-6" />
            <Users className="h-6 w-6" />
            <BarChart3 className="h-6 w-6" />
          </div>
        </aside>

        <section className="relative min-h-[520px] overflow-hidden bg-[#efe1d3]">
          {selectedReport ? (
            <DynamicLocationMap
              lat={selectedReport.location.lat}
              lng={selectedReport.location.lng}
              zoom={15}
              className="h-full min-h-[calc(100vh-5rem)]"
            />
          ) : (
            <div className="flex h-full min-h-[calc(100vh-5rem)] items-center justify-center text-slate-500">
              No hay reportes georreferenciados.
            </div>
          )}

          <div className="absolute left-3 right-3 top-3 z-[500] rounded-lg border border-slate-200 bg-white p-4 shadow-lg sm:left-5 sm:right-auto sm:top-5 sm:w-80 sm:p-5">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Resumen de actividad
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-3xl font-bold text-red-800">{stats.urgent}</p>
                <p className="text-sm text-slate-700">Urgentes</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <p className="text-3xl font-bold text-[#b68f4a]">{stats.pending}</p>
                <p className="text-sm text-slate-700">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-[500] flex justify-center rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg sm:bottom-5 sm:left-5 sm:right-auto">
            <LegendDot className="bg-red-800" label="Crítico" />
            <LegendDot className="bg-[#b68f4a]" label="Atención" />
            <LegendDot className="bg-municipality-green" label="Resuelto" />
          </div>
        </section>

        <aside className="min-w-0 border-l border-slate-200 bg-white">
          {selectedReport ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b border-slate-200 p-6">
                <div>
                  <Badge className={cn('mb-3 border', STATUS_BADGE[selectedReport.status])}>
                    {STATUS_LABELS[selectedReport.status]}
                  </Badge>
                  <p className="text-sm font-medium text-slate-400">
                    #{selectedReport.id.slice(0, 8)}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                    {CATEGORY_LABELS[selectedReport.category] || selectedReport.category}
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {selectedReport.location.lat.toFixed(5)},{' '}
                    {selectedReport.location.lng.toFixed(5)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Cerrar detalle">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {selectedReport.imageUrl && (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedReport.imageUrl}
                      alt="Evidencia del reporte"
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                )}
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-slate-950">
                    Descripción del ciudadano
                  </h2>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 leading-7 text-slate-700">
                    {selectedReport.description}
                  </p>
                </section>
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-slate-950">Historial</h2>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-municipality-green">
                      Recibido por sistema
                    </span>
                    <br />
                    {formatAdminDate(selectedReport.createdAt)}
                  </p>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-5 sm:grid-cols-2">
                <Button variant="outline" className="h-12 rounded-lg">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contactar
                </Button>
                <Button variant="outline" className="h-12 rounded-lg">
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
                <Button className="h-12 rounded-lg bg-municipality-green font-semibold hover:bg-municipality-green/90 sm:col-span-2">
                  Asignar a cuadrilla
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-slate-500">Selecciona un reporte del mapa.</div>
          )}
        </aside>
      </main>
    </div>
  );
}

function TopNav({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg px-4 py-3 text-lg transition',
        active ? 'bg-white/12 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
      )}
    >
      {label}
    </Link>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2 px-3">
      <span className={cn('h-3 w-3 rounded-full', className)} />
      {label}
    </span>
  );
}
