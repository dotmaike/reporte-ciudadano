'use client';

import type { Timestamp } from 'firebase/firestore';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Download,
  HelpCircle,
  List,
  Loader2,
  Map,
  MapPin,
  MoreVertical,
  Search,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { formatAdminDate, formatDate } from '@/lib/dates';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

type ReportStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

type Report = {
  id: string;
  category: string;
  description: string;
  geohash?: string;
  location: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  imageKey?: string;
  status: ReportStatus;
  createdAt: Timestamp | Date;
};

type ReportWithFreshUrl = Report & {
  freshImageUrl?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Baches',
  lighting: 'Alumbrado',
  water_leak: 'Fuga de Agua',
  garbage: 'Basura',
  civil_protection: 'Protección Civil',
  animal_welfare: 'Bienestar Animal',
};

const CATEGORY_BADGE: Record<string, string> = {
  pothole: 'bg-slate-200 text-slate-800',
  lighting: 'bg-amber-100 text-amber-800',
  water_leak: 'bg-blue-100 text-blue-800',
  garbage: 'bg-orange-100 text-orange-800',
  civil_protection: 'bg-violet-100 text-violet-800',
  animal_welfare: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  pending: 'border-red-200 bg-red-50 text-red-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-slate-300 bg-slate-100 text-slate-600',
};

export default function AdminPage() {
  const [reports, setReports] = useState<ReportWithFreshUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingUrls, setRefreshingUrls] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [selectedReport, setSelectedReport] = useState<ReportWithFreshUrl | null>(null);
  const { toast } = useToast();

  const refreshImageUrl = useCallback(async (imageKey: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/image?key=${encodeURIComponent(imageKey)}`);
      if (!response.ok) {
        throw new Error('No se pudo refrescar la URL de imagen');
      }
      const data = await response.json();
      return data.imageUrl;
    } catch {
      return null;
    }
  }, []);

  const refreshAllImageUrls = useCallback(
    async (reportsToRefresh: Report[]) => {
      setRefreshingUrls(true);
      const refreshedReports = await Promise.all(
        reportsToRefresh.map(async (report) => {
          if (!report.imageKey) {
            return { ...report, freshImageUrl: report.imageUrl };
          }

          const freshUrl = await refreshImageUrl(report.imageKey);
          return {
            ...report,
            freshImageUrl: freshUrl ?? report.imageUrl,
          };
        }),
      );

      setReports(refreshedReports);
      setRefreshingUrls(false);
    },
    [refreshImageUrl],
  );

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const fallbackTimer = window.setTimeout(() => {
      setLoading(false);
    }, 3500);

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        window.clearTimeout(fallbackTimer);
        const reportsData: Report[] = [];
        for (const reportDoc of querySnapshot.docs) {
          reportsData.push({ id: reportDoc.id, ...reportDoc.data() } as Report);
        }

        setReports(reportsData.map((report) => ({ ...report, freshImageUrl: report.imageUrl })));
        setLoading(false);
        void refreshAllImageUrls(reportsData);
      },
      (error) => {
        window.clearTimeout(fallbackTimer);
        setReports([]);
        toast({
          variant: 'destructive',
          title: 'Error al cargar reportes',
          description: error.message,
        });
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [refreshAllImageUrls, toast]);

  const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      toast({
        variant: 'success',
        title: 'Estado actualizado',
        description: `Marcado como "${STATUS_LABELS[newStatus]}"`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al actualizar el reporte';
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: errorMessage,
      });
    }
  };

  const filteredReports = useMemo(() => {
    const queryText = search.trim().toLowerCase();

    return reports.filter((report) => {
      const category = CATEGORY_LABELS[report.category] || report.category;
      const matchesText =
        queryText.length === 0 ||
        report.id.toLowerCase().includes(queryText) ||
        category.toLowerCase().includes(queryText) ||
        report.description.toLowerCase().includes(queryText) ||
        (report.geohash || '').toLowerCase().includes(queryText);

      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'pending').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return { total, pending, inProgress, resolved };
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
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col bg-[#134c35] text-white lg:flex">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="relative h-7 w-7">
              <span className="absolute left-0 top-0 h-4 w-4 bg-[#c8aa6a]" />
              <span className="absolute bottom-0 right-0 h-4 w-4 bg-[#c8aa6a]" />
            </div>
            <p className="text-2xl font-semibold tracking-tight">Coatepec Admin</p>
          </div>

          <nav className="space-y-1 px-3 py-5">
            <SidebarItem href="/admin" icon={BarChart3} label="Dashboard" />
            <SidebarItem href="/admin" icon={List} label="Reportes" active />
            <SidebarItem href="/admin/mapa" icon={Map} label="Mapa" />
            <SidebarItem href="/admin" icon={Users} label="Usuarios" />
            <SidebarItem href="/admin" icon={BarChart3} label="Estadísticas" />
          </nav>

          <div className="mt-auto border-t border-white/10 p-4">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-sm text-white/80">Admin General</p>
              <p className="text-xs text-white/60">admin@coatepec.gob.mx</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white/95">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-10">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">
                Gestión de Reportes Ciudadanos
              </h1>
              <div className="flex shrink-0 items-center gap-3 text-slate-600 sm:gap-5">
                <Bell className="h-5 w-5" />
                <div className="hidden h-7 w-px bg-slate-200 sm:block" />
                <span className="hidden items-center gap-2 text-lg sm:inline-flex">
                  <HelpCircle className="h-5 w-5" /> Ayuda
                </span>
              </div>
            </div>
          </header>

          <section className="min-w-0 space-y-6 px-4 py-5 md:px-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total reportes"
                value={stats.total.toLocaleString()}
                note="Reportes registrados"
                color="border-b-[#1d5c40]"
                icon={<List className="h-10 w-10 text-slate-200" />}
              />
              <StatCard
                title="Pendientes"
                value={stats.pending.toLocaleString()}
                note="Requiere atención"
                color="border-b-[#b42318]"
                icon={<AlertCircle className="h-10 w-10 text-slate-200" />}
              />
              <StatCard
                title="En proceso"
                value={stats.inProgress.toLocaleString()}
                note="Actualmente trabajando"
                color="border-b-[#b68f4a]"
                icon={<Wrench className="h-10 w-10 text-slate-200" />}
              />
              <StatCard
                title="Resueltos"
                value={stats.resolved.toLocaleString()}
                note={
                  stats.total > 0
                    ? `${Math.round((stats.resolved / stats.total) * 100)}% tasa de éxito`
                    : 'Sin datos'
                }
                color="border-b-[#16a34a]"
                icon={<CheckCircle2 className="h-10 w-10 text-emerald-100" />}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por Folio, GeoHash o Categoría..."
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[11rem_auto]">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as 'all' | ReportStatus)}
                  >
                    <SelectTrigger className="h-12 w-full rounded-xl">
                      <SelectValue placeholder="Filtrar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En proceso</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="h-12 rounded-xl px-4">
                    <Download className="mr-2 h-4 w-4" /> Exportar
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-200 md:hidden">
                {filteredReports.length === 0 && (
                  <div className="px-5 py-10 text-center text-slate-500">
                    No hay reportes para los filtros seleccionados.
                  </div>
                )}
                {filteredReports.map((report) => (
                  <MobileReportCard
                    key={report.id}
                    report={report}
                    onSelect={() => setSelectedReport(report)}
                    onStatusChange={updateReportStatus}
                  />
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-[#f7f8fa] text-sm uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Folio</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4">Ubicación (GeoHash)</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Estatus</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No hay reportes para los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="border-t border-slate-200 text-base">
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-800">
                          #{report.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={cn(
                              'rounded-full px-3 py-1 text-base font-medium',
                              CATEGORY_BADGE[report.category] || 'bg-slate-100 text-slate-700',
                            )}
                          >
                            {CATEGORY_LABELS[report.category] || report.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-slate-600 hover:underline"
                          >
                            <MapPin className="h-4 w-4" />
                            {report.geohash ||
                              `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
                          </a>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                          {formatDate(report.createdAt, 'dd MMM yyyy, HH:mm')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Badge
                            className={cn(
                              'rounded-lg border px-3 py-1 text-base font-medium',
                              STATUS_BADGE[report.status],
                            )}
                          >
                            {STATUS_LABELS[report.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={report.status}
                              onValueChange={(value: ReportStatus) =>
                                updateReportStatus(report.id, value)
                              }
                            >
                              <SelectTrigger className="h-10 w-40 rounded-lg text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="in_progress">En proceso</SelectItem>
                                <SelectItem value="resolved">Resuelto</SelectItem>
                                <SelectItem value="rejected">Rechazado</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedReport(report)}
                              className="h-9 w-9 text-slate-500"
                              aria-label={`Ver detalles de ${report.id.slice(0, 8)}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <p>
                  {filteredReports.length === 0
                    ? 'No hay resultados'
                    : `Mostrando 1 a ${filteredReports.length} de ${reports.length} resultados`}
                </p>
                {refreshingUrls && (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Actualizando imágenes...
                  </span>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {selectedReport && (
        <ReportInspector
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={updateReportStatus}
        />
      )}
    </div>
  );
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xl transition',
        active ? 'bg-white/12 text-white' : 'text-white/85 hover:bg-white/10',
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

function StatCard({
  title,
  value,
  note,
  color,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        color,
        'border-b-4',
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
        {icon}
      </div>
      <p className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{value}</p>
      <p className="mt-2 text-base text-slate-600">{note}</p>
    </article>
  );
}

function MobileReportCard({
  report,
  onSelect,
  onStatusChange,
}: {
  report: ReportWithFreshUrl;
  onSelect: () => void;
  onStatusChange: (reportId: string, newStatus: ReportStatus) => Promise<void>;
}) {
  return (
    <article className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">#{report.id.slice(0, 8)}</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(report.createdAt, 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
        <Badge className={cn('rounded-lg border px-3 py-1 text-sm', STATUS_BADGE[report.status])}>
          {STATUS_LABELS[report.status]}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Badge
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium',
            CATEGORY_BADGE[report.category] || 'bg-slate-100 text-slate-700',
          )}
        >
          {CATEGORY_LABELS[report.category] || report.category}
        </Badge>
        <a
          href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 text-sm text-slate-500 hover:underline"
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {report.geohash ||
              `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
          </span>
        </a>
      </div>

      <p className="line-clamp-2 text-sm leading-6 text-slate-600">{report.description}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <Select
          value={report.status}
          onValueChange={(value: ReportStatus) => onStatusChange(report.id, value)}
        >
          <SelectTrigger className="h-11 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En proceso</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={onSelect} className="h-11 rounded-xl">
          Detalles
        </Button>
      </div>
    </article>
  );
}

function ReportInspector({
  report,
  onClose,
  onStatusChange,
}: {
  report: ReportWithFreshUrl;
  onClose: () => void;
  onStatusChange: (reportId: string, newStatus: ReportStatus) => Promise<void>;
}) {
  const imageUrl = report.freshImageUrl ?? report.imageUrl;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 p-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border-red-200 bg-red-50 text-red-700">
              {STATUS_LABELS[report.status]}
            </Badge>
            <span className="text-sm font-medium text-slate-400">#{report.id.slice(0, 8)}</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-950">
            {CATEGORY_LABELS[report.category] || report.category}
          </h2>
          <a
            href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:underline"
          >
            <MapPin className="h-4 w-4" />
            {report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)}
          </a>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {imageUrl && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Evidencia del reporte"
              className="aspect-video w-full object-cover"
            />
          </div>
        )}

        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-950">Descripción del ciudadano</h3>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 leading-7 text-slate-700">
            {report.description}
          </p>
        </section>

        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-950">Estatus operativo</h3>
          <Select
            value={report.status}
            onValueChange={(value: ReportStatus) => onStatusChange(report.id, value)}
          >
            <SelectTrigger className="h-12 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En proceso</SelectItem>
              <SelectItem value="resolved">Resuelto</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-950">Historial</h3>
          <div className="space-y-3 border-l border-slate-200 pl-4">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-municipality-green">Recibido por sistema</span>
              <br />
              {formatAdminDate(report.createdAt)}
            </p>
            <p className="text-sm text-slate-400">Pendiente de asignación a cuadrilla</p>
          </div>
        </section>
      </div>

      <div className="border-t border-slate-200 p-6">
        <Button className="h-12 w-full rounded-lg bg-municipality-green text-base font-semibold hover:bg-municipality-green/90">
          Asignar a cuadrilla
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
