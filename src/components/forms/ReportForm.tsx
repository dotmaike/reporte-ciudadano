'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle, Info, Loader2, MapPin, MapPinOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { useReportUpload } from '@/hooks/useReportUpload';
import { useToast } from '@/hooks/useToast';
import { isInServiceArea } from '@/lib/location';
import type { ReportFormValues } from '@/schemas/reportSchema';
import { reportSchema } from '@/schemas/reportSchema';

type LocationStatus = 'pending' | 'success' | 'error' | 'outside_area';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
};

export function ReportForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  const { isUploading, error: uploadError, uploadReport } = useReportUpload();
  const { isChecking, duplicates, checkForDuplicates, clearDuplicates } = useDuplicateCheck();
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      description: '',
      location: { lat: 0, lng: 0 },
    },
  });

  const { setValue, watch } = form;
  const imageFile = watch('image');
  const category = watch('category');
  const location = watch('location');

  // Handle image preview
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    } else {
      setPreview(null);
    }
  }, [imageFile]);

  // Get user's geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setValue('location', { lat: latitude, lng: longitude });

          // Check if location is within service area
          if (isInServiceArea(latitude, longitude)) {
            setLocationStatus('success');
          } else {
            setLocationStatus('outside_area');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationStatus('error');
          form.setError('location', {
            type: 'manual',
            message: 'No se pudo obtener la ubicación. Por favor, activa los permisos de GPS.',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    } else {
      setLocationStatus('error');
      form.setError('location', {
        type: 'manual',
        message: 'Geolocalización no es soportada por este navegador.',
      });
    }
  }, [setValue, form]);

  // Check for duplicates when location and category are set
  useEffect(() => {
    if (location.lat !== 0 && location.lng !== 0 && category) {
      // Reset duplicate state when location or category changes
      setShowDuplicateWarning(false);
      setConfirmedDuplicate(false);
      clearDuplicates();
    }
  }, [location.lat, location.lng, category, clearDuplicates]);

  const handleCheckDuplicates = async () => {
    if (location.lat === 0 || location.lng === 0 || !category) {
      toast({
        variant: 'destructive',
        title: 'Información incompleta',
        description: 'Por favor, selecciona una categoría y espera a que se obtenga tu ubicación.',
      });
      return;
    }

    const result = await checkForDuplicates(location.lat, location.lng, category);

    if (result.hasDuplicates) {
      setShowDuplicateWarning(true);
    } else {
      toast({
        variant: 'success',
        title: 'Sin duplicados',
        description: 'No se encontraron reportes similares en tu área.',
      });
    }
  };

  const onSubmit = async (data: ReportFormValues) => {
    // Check for duplicates before submitting (if not already confirmed)
    if (!confirmedDuplicate && location.lat !== 0 && category) {
      const result = await checkForDuplicates(location.lat, location.lng, category);

      if (result.hasDuplicates) {
        setShowDuplicateWarning(true);
        return; // Don't submit, show warning first
      }
    }

    const reportId = await uploadReport(data);
    if (reportId) {
      toast({
        variant: 'success',
        title: '¡Reporte enviado con éxito!',
        description: `Tu reporte ha sido registrado con el ID: ${reportId}`,
      });
      form.reset();
      setPreview(null);
      setShowDuplicateWarning(false);
      setConfirmedDuplicate(false);
      clearDuplicates();
    } else if (uploadError) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar el reporte',
        description: uploadError,
      });
    }
  };

  const handleConfirmSubmit = () => {
    setConfirmedDuplicate(true);
    setShowDuplicateWarning(false);
    form.handleSubmit(onSubmit)();
  };

  const renderLocationStatus = () => {
    switch (locationStatus) {
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Obteniendo ubicación...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <MapPin className="h-4 w-4" />
            <span>
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
            <CheckCircle className="h-4 w-4" />
          </div>
        );
      case 'outside_area':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-amber-600">
              <MapPin className="h-4 w-4" />
              <span>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
            </div>
            <p className="text-xs text-amber-600">
              Esta ubicación parece estar fuera del área de servicio de Coatepec.
            </p>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-destructive">
            <MapPinOff className="h-4 w-4" />
            <span>Error al obtener ubicación</span>
          </div>
        );
    }
  };

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Levantar Reporte Ciudadano</CardTitle>
        <CardDescription>Completa el formulario para enviar tu reporte.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría del Reporte</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pothole">Baches y Pavimento</SelectItem>
                      <SelectItem value="lighting">Alumbrado Público</SelectItem>
                      <SelectItem value="water_leak">Fugas de Agua</SelectItem>
                      <SelectItem value="garbage">Basura y Residuos</SelectItem>
                      <SelectItem value="civil_protection">Protección Civil</SelectItem>
                      <SelectItem value="animal_welfare">Bienestar Animal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe el problema detalladamente..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Evidencia Fotográfica</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file);
                      }}
                      {...rest}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {preview && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Vista previa de la imagen"
                  className="h-auto w-full rounded-md border"
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="location"
              render={() => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <div className="rounded-md border p-3 text-sm">{renderLocationStatus()}</div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duplicate Check Button */}
            {category && locationStatus === 'success' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckDuplicates}
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando duplicados...
                  </>
                ) : (
                  <>
                    <Info className="mr-2 h-4 w-4" />
                    Verificar si ya existe un reporte similar
                  </>
                )}
              </Button>
            )}

            {/* Duplicate Warning */}
            {showDuplicateWarning && duplicates.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-2 font-medium text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Posibles reportes duplicados encontrados</span>
                </div>
                <p className="mb-3 text-sm text-amber-700">
                  Se encontraron {duplicates.length} reporte(s) similar(es) en un radio de 50
                  metros:
                </p>
                <ul className="mb-4 space-y-2">
                  {duplicates.map((dup) => (
                    <li key={dup.id} className="rounded bg-white p-2 text-sm shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{dup.distance}m de distancia</span>
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          {STATUS_LABELS[dup.status] || dup.status}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{dup.description}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDuplicateWarning(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmSubmit}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    Enviar de todos modos
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4">
            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-status-error">
                <AlertTriangle className="h-4 w-4" />
                <p>Error: {uploadError}</p>
              </div>
            )}
            <Button
              type="submit"
              disabled={isUploading || isChecking || showDuplicateWarning}
              className="w-full bg-municipality-green hover:bg-municipality-green/90"
            >
              {(isUploading || isChecking) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUploading && 'Enviando Reporte...'}
              {isChecking && !isUploading && 'Verificando...'}
              {!isUploading && !isChecking && 'Enviar Reporte'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
