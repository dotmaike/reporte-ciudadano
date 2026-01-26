'use client';

import type { Timestamp } from 'firebase/firestore';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { Calendar, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { formatAdminDate } from '@/lib/dates';
import { db } from '@/lib/firebase';

type ReportStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

type Report = {
  id: string;
  category: string;
  description: string;
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
  pothole: 'Baches y Pavimento',
  lighting: 'Alumbrado Público',
  water_leak: 'Fugas de Agua',
  garbage: 'Basura y Residuos',
  civil_protection: 'Protección Civil',
  animal_welfare: 'Bienestar Animal',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
};

const STATUS_VARIANTS: Record<ReportStatus, string> = {
  pending: 'bg-status-pending text-black',
  in_progress: 'bg-blue-500 text-white',
  resolved: 'bg-status-resolved text-white',
  rejected: 'bg-status-error text-white',
};

export default function AdminPage() {
  const [reports, setReports] = useState<ReportWithFreshUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [refreshingUrls, setRefreshingUrls] = useState(false);
  const { toast } = useToast();

  // Refresh presigned URL for a single image
  const refreshImageUrl = useCallback(async (imageKey: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/image?key=${encodeURIComponent(imageKey)}`);
      if (!response.ok) {
        throw new Error('Failed to refresh image URL');
      }
      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error refreshing image URL:', error);
      return null;
    }
  }, []);

  // Refresh all presigned URLs for reports that have imageKey
  const refreshAllImageUrls = useCallback(
    async (reportsToRefresh: Report[]) => {
      setRefreshingUrls(true);
      const refreshedReports: ReportWithFreshUrl[] = [];

      for (const report of reportsToRefresh) {
        if (report.imageKey) {
          const freshUrl = await refreshImageUrl(report.imageKey);
          refreshedReports.push({
            ...report,
            freshImageUrl: freshUrl ?? report.imageUrl,
          });
        } else {
          // Legacy reports without imageKey - use stored imageUrl
          refreshedReports.push({ ...report, freshImageUrl: report.imageUrl });
        }
      }

      setReports(refreshedReports);
      setRefreshingUrls(false);
    },
    [refreshImageUrl],
  );

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const reportsData: Report[] = [];
        for (const doc of querySnapshot.docs) {
          reportsData.push({ id: doc.id, ...doc.data() } as Report);
        }

        // Refresh presigned URLs for all reports
        await refreshAllImageUrls(reportsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching reports:', error);
        toast({
          variant: 'destructive',
          title: 'Error al cargar reportes',
          description: error.message,
        });
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [toast, refreshAllImageUrls]);

  const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      toast({
        variant: 'success',
        title: 'Estado actualizado',
        description: `El reporte ha sido marcado como "${STATUS_LABELS[newStatus]}"`,
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

  // Get the best available image URL for a report
  const getImageUrl = (report: ReportWithFreshUrl): string => {
    return report.freshImageUrl ?? report.imageUrl;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-municipality-green" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-municipality-green">
              Panel de Administración
            </h1>
            <p className="text-muted-foreground">
              Gestiona los reportes ciudadanos de Coatepec, Veracruz
            </p>
          </div>
          {refreshingUrls && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Actualizando imágenes...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-muted-foreground">No hay reportes disponibles</p>
          </div>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {CATEGORY_LABELS[report.category] || report.category}
                    </CardTitle>
                    <CardDescription className="mt-1">ID: {report.id.slice(0, 8)}</CardDescription>
                  </div>
                  <Badge className={STATUS_VARIANTS[report.status]}>
                    {STATUS_LABELS[report.status]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Image */}
                {(report.imageUrl || report.freshImageUrl) && (
                  <div className="relative aspect-video cursor-pointer overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(report)}
                      alt="Evidencia del reporte"
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      onClick={() => setSelectedImage(getImageUrl(report))}
                    />
                  </div>
                )}

                {/* Description */}
                <p className="line-clamp-3 text-sm text-foreground">{report.description}</p>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <a
                    href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)}
                  </a>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>{formatAdminDate(report.createdAt)}</span>
                </div>

                {/* Status Update */}
                <div className="border-t pt-2">
                  <label className="mb-2 block text-sm font-medium">Cambiar Estado:</label>
                  <Select
                    value={report.status}
                    onValueChange={(value: ReportStatus) => updateReportStatus(report.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="Vista ampliada"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
