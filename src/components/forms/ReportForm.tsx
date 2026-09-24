'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleDot,
  Droplets,
  ExternalLink,
  EyeOff,
  Home,
  Lightbulb,
  Loader2,
  MapPin,
  MapPinOff,
  Navigation,
  PawPrint,
  Send,
  Share2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { DynamicLocationMap } from '@/components/maps/DynamicLocationMap';
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
import { Textarea } from '@/components/ui/textarea';
import type { PotentialDuplicate } from '@/hooks/useDuplicateCheck';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { useReportUpload } from '@/hooks/useReportUpload';
import { useToast } from '@/hooks/useToast';
import { isInServiceArea } from '@/lib/location';
import { cn } from '@/lib/utils';
import type { ReportFormValues } from '@/schemas/reportSchema';
import { reportSchema } from '@/schemas/reportSchema';

type LocationStatus = 'pending' | 'success' | 'error' | 'outside_area';
type ReportStep = 1 | 2 | 3;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
};

const DUPLICATE_LEVEL_COPY = {
  possible: {
    title: 'Encontramos reportes parecidos',
    description:
      'Puede tratarse del mismo problema. Revisa las coincidencias antes de enviar uno nuevo.',
    badge: 'Posible duplicado',
    tone: 'amber',
  },
  likely: {
    title: 'Este reporte probablemente ya existe',
    description:
      'La ubicación, categoría y datos recientes coinciden con reportes activos cercanos.',
    badge: 'Duplicado probable',
    tone: 'red',
  },
} as const;

const CATEGORIES = [
  { value: 'pothole', label: 'Baches', icon: CircleDot },
  { value: 'lighting', label: 'Alumbrado', icon: Lightbulb },
  { value: 'water_leak', label: 'Fugas de Agua', icon: Droplets },
  { value: 'garbage', label: 'Basura', icon: Trash2 },
  { value: 'civil_protection', label: 'Protección Civil', icon: ShieldAlert },
  { value: 'animal_welfare', label: 'Bienestar Animal', icon: PawPrint },
] as const;

const STEP_COPY: Record<ReportStep, { eyebrow: string; title: string; description: string }> = {
  1: {
    eyebrow: 'Nueva solicitud',
    title: '¿Qué quieres reportar?',
    description: 'Selecciona la categoría institucional correspondiente.',
  },
  2: {
    eyebrow: 'Detalles del reporte',
    title: 'Ubicación y foto',
    description: 'Confirma la ubicación exacta y añade evidencia fotográfica.',
  },
  3: {
    eyebrow: 'Paso 3 de 3',
    title: 'Revisa tu reporte',
    description: 'Confirma que la información sea correcta antes de enviar tu solicitud oficial.',
  },
};

function buildFolio(reportId: string) {
  return `COA-${new Date().getFullYear()}-${reportId.slice(0, 4).toUpperCase()}`;
}

export function ReportForm() {
  const [step, setStep] = useState<ReportStep>(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const confirmedDuplicateRef = useRef(false);
  const [anonymous, setAnonymous] = useState(false);
  const [submittedFolio, setSubmittedFolio] = useState<string | null>(null);

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
  const currentStepCopy = STEP_COPY[step];
  const selectedCategory = useMemo(
    () => CATEGORIES.find((item) => item.value === category),
    [category],
  );

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(imageFile);
    } else {
      setPreview(null);
    }
  }, [imageFile]);

  const requestLocation = useCallback(() => {
    setLocationStatus('pending');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setValue('location', { lat: latitude, lng: longitude });
          setLocationStatus(isInServiceArea(latitude, longitude) ? 'success' : 'outside_area');
        },
        () => {
          setLocationStatus('error');
          form.setError('location', {
            type: 'manual',
            message: 'No se pudo obtener la ubicación. Activa los permisos de GPS.',
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
  }, [form, setValue]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (location.lat !== 0 && location.lng !== 0 && category) {
      setShowDuplicateWarning(false);
      confirmedDuplicateRef.current = false;
      clearDuplicates();
    }
  }, [location.lat, location.lng, category, clearDuplicates]);

  const goToStep = async (nextStep: ReportStep) => {
    if (nextStep > step) {
      const isValid = await validateStep(step);
      if (!isValid) return;
    }

    setStep(nextStep);
  };

  const validateStep = async (stepToValidate: ReportStep) => {
    if (stepToValidate === 1) {
      return form.trigger('category');
    }

    if (stepToValidate === 2) {
      const imageValid = await form.trigger('image');
      if (location.lat === 0 || location.lng === 0) {
        form.setError('location', {
          type: 'manual',
          message: 'Espera a que se obtenga tu ubicación.',
        });
        return false;
      }
      return imageValid;
    }

    return form.trigger('description');
  };

  const handleImageChange = (
    file: File | undefined,
    onChange: (value: File | undefined) => void,
  ) => {
    if (!file) {
      onChange(undefined);
      setPreview(null);
      form.clearErrors('image');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      form.setError('image', {
        type: 'manual',
        message: 'El tamaño máximo de la imagen es 5MB.',
      });
      onChange(undefined);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      form.setError('image', {
        type: 'manual',
        message: 'Solo se aceptan formatos .jpg, .jpeg, .png y .webp.',
      });
      onChange(undefined);
      return;
    }

    form.clearErrors('image');
    onChange(file);
  };

  const clearSelectedImage = () => {
    setValue('image', undefined as unknown as File, { shouldValidate: false });
    setPreview(null);
    form.clearErrors('image');
    setFileInputKey((value) => value + 1);
  };

  const onSubmit = async (data: ReportFormValues) => {
    if (!confirmedDuplicateRef.current && location.lat !== 0 && category) {
      const result = await checkForDuplicates(
        location.lat,
        location.lng,
        category,
        data.description,
      );

      if (result.hasDuplicates) {
        setShowDuplicateWarning(true);
        return;
      }
    }

    const reportId = await uploadReport(data);
    if (reportId) {
      setSubmittedFolio(buildFolio(reportId));
      form.reset();
      setPreview(null);
      setShowDuplicateWarning(false);
      confirmedDuplicateRef.current = false;
      clearDuplicates();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al enviar el reporte',
        description: uploadError ?? 'No se pudo completar el envío. Inténtalo de nuevo.',
      });
    }
  };

  const handleConfirmSubmit = () => {
    confirmedDuplicateRef.current = true;
    setShowDuplicateWarning(false);
    form.handleSubmit(onSubmit)();
  };

  const startNewReport = () => {
    setSubmittedFolio(null);
    setStep(1);
    setAnonymous(false);
    setFileInputKey((value) => value + 1);
    requestLocation();
  };

  if (submittedFolio) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
        <Card className="w-full rounded-3xl border-slate-200 bg-white p-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:p-10">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-municipality-green text-white shadow-lg sm:mb-10 sm:h-28 sm:w-28">
            <Check className="h-14 w-14 sm:h-16 sm:w-16" />
          </div>
          <CardTitle className="text-3xl font-semibold text-slate-950">
            ¡Reporte enviado con éxito!
          </CardTitle>
          <CardDescription className="mx-auto mt-4 max-w-sm text-lg leading-7 text-slate-500">
            Tu reporte está siendo procesado por las autoridades correspondientes.
          </CardDescription>

          <div className="my-10 rounded-2xl border border-[#d9c39f] bg-[#fbf7f0] p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b68f4a]">
              Folio
            </p>
            <p className="mt-3 break-words text-3xl font-bold tracking-[0.08em] text-[#8f1420] sm:text-4xl sm:tracking-[0.12em]">
              {submittedFolio}
            </p>
            <div className="my-6 h-px bg-[#e6d8c3]" />
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-municipality-green"
            >
              <Share2 className="h-4 w-4" />
              Compartir comprobante
            </button>
          </div>

          <div className="space-y-4">
            <Button className="h-14 w-full rounded-xl bg-municipality-green text-xl font-semibold hover:bg-municipality-green/90">
              Ver mis reportes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={startNewReport}
              className="h-14 w-full rounded-xl text-xl font-semibold"
            >
              <Home className="mr-2 h-5 w-5" />
              Volver al inicio
            </Button>
          </div>
        </Card>
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span className="relative h-5 w-5">
            <span className="absolute left-0 top-0 h-3 w-3 bg-slate-300" />
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-slate-300" />
          </span>
          Gobierno de Coatepec
        </p>
      </section>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <CardHeader className="space-y-5 border-b border-slate-200 bg-white pb-6">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              'text-sm font-semibold uppercase tracking-[0.16em]',
              step === 3 ? 'text-slate-400' : 'text-[#8f1420]',
            )}
          >
            {currentStepCopy.eyebrow}
          </p>
          <p className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {step === 3 ? 'Revisión final' : `Paso ${step} de 3`}
          </p>
        </div>
        <div className="h-1 w-full rounded-full bg-slate-200">
          <div
            className="h-1 rounded-full bg-municipality-green transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <div className="space-y-2">
          <CardTitle
            className={cn(
              'text-3xl font-semibold text-slate-950 sm:text-4xl',
              step === 3 && 'text-[#8f1420]',
            )}
          >
            {currentStepCopy.title}
          </CardTitle>
          <CardDescription className="text-xl leading-8 text-slate-500">
            {currentStepCopy.description}
          </CardDescription>
        </div>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-7 p-6">
            {step === 1 && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {CATEGORIES.map((categoryOption) => {
                          const Icon = categoryOption.icon;
                          const isActive = field.value === categoryOption.value;
                          return (
                            <button
                              key={categoryOption.value}
                              type="button"
                              onClick={() => field.onChange(categoryOption.value)}
                              className={cn(
                                'group relative flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border bg-[#f8f8f9] px-4 py-5 text-center transition-all sm:min-h-36',
                                isActive
                                  ? 'border-[#b68f4a] bg-white shadow-md ring-2 ring-[#edd8ac]'
                                  : 'border-transparent hover:border-slate-200 hover:bg-white',
                              )}
                            >
                              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#e7dcc8] bg-white text-[#9f1e2c]">
                                <Icon className="h-6 w-6" />
                              </span>
                              <span
                                className={cn(
                                  'text-xl font-medium text-slate-800',
                                  isActive && 'font-semibold text-municipality-green',
                                )}
                              >
                                {categoryOption.label}
                              </span>
                              {isActive && (
                                <span className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#b68f4a] text-white">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="location"
                  render={() => (
                    <FormItem>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <FormLabel className="text-xl font-semibold text-slate-950">
                          Ubicación
                        </FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={requestLocation}
                          className="gap-2 text-municipality-green"
                        >
                          <Navigation className="h-4 w-4" />
                          Refinar ubicación
                        </Button>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        {renderLocationStatus(locationStatus, location, requestLocation)}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { onChange, value: _value, ...rest } }) => (
                    <FormItem>
                      <FormLabel className="text-xl font-semibold text-slate-950">
                        Evidencia fotográfica
                      </FormLabel>
                      <FormControl>
                        <label
                          className={cn(
                            'relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#b68f4a] bg-white text-center transition hover:bg-[#fffaf2]',
                            preview && 'items-stretch overflow-hidden border-solid p-0',
                          )}
                        >
                          {preview ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview}
                                alt="Vista previa de la imagen"
                                className="h-64 w-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                  event.preventDefault();
                                  clearSelectedImage();
                                }}
                                className="absolute right-3 top-3 bg-white/95"
                              >
                                Quitar
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#f4ead8] text-[#b68f4a]">
                                <Camera className="h-6 w-6" />
                              </span>
                              <span className="text-2xl font-semibold text-slate-950">
                                Tomar foto
                              </span>
                              <span className="text-base text-slate-500">
                                Captura el problema claramente
                              </span>
                            </>
                          )}
                          <Input
                            key={fileInputKey}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            capture="environment"
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              handleImageChange(file, onChange);
                            }}
                            {...rest}
                          />
                        </label>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 3 && (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-[#f5eadb] sm:h-28 sm:w-28">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt="Evidencia seleccionada"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f2e7ea] text-[#8f1420]">
                          {selectedCategory ? (
                            <selectedCategory.icon className="h-5 w-5" />
                          ) : (
                            <CircleDot className="h-5 w-5" />
                          )}
                        </span>
                        <p className="text-2xl font-semibold text-slate-950">
                          {selectedCategory?.label}
                        </p>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-start gap-2 text-base text-slate-500 hover:underline"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </a>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="mt-4 inline-flex items-center gap-2 font-semibold text-municipality-green"
                      >
                        Editar ubicación o foto
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-slate-950">
                        Descripción adicional
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-44 rounded-2xl border-slate-200 bg-white text-lg leading-8"
                          placeholder="Proporciona detalles específicos que ayuden a las cuadrillas a identificar el problema rápidamente..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button
                  type="button"
                  onClick={() => setAnonymous((value) => !value)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left"
                >
                  <span className="flex items-center gap-4">
                    <EyeOff className="h-7 w-7 text-slate-400" />
                    <span>
                      <span className="block text-xl font-semibold text-slate-950">
                        Reporte anónimo
                      </span>
                      <span className="block text-base text-slate-500">
                        Tus datos personales se mantendrán privados
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      'relative h-8 w-14 rounded-full transition',
                      anonymous ? 'bg-municipality-green' : 'bg-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 h-6 w-6 rounded-full bg-white transition',
                        anonymous ? 'left-7' : 'left-1',
                      )}
                    />
                  </span>
                </button>

                {showDuplicateWarning && duplicates.length > 0 && (
                  <DuplicateWarning
                    duplicates={duplicates}
                    onCancel={() => setShowDuplicateWarning(false)}
                    onConfirm={handleConfirmSubmit}
                  />
                )}
              </>
            )}
          </CardContent>

          <CardFooter className="flex gap-3 border-t border-slate-200 bg-[#fafafa] p-4 sm:gap-4 sm:p-6">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((value) => (value - 1) as ReportStep)}
                className="h-14 flex-1 rounded-xl text-base font-semibold text-slate-500 sm:text-lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Atrás
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-14 flex-1 rounded-xl text-base font-semibold text-slate-500 sm:text-lg"
              >
                Cancelar
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={() => goToStep((step + 1) as ReportStep)}
                className="h-14 flex-[2] rounded-xl bg-municipality-green text-base font-semibold hover:bg-municipality-green/90 sm:text-lg"
              >
                Siguiente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isUploading || isChecking || showDuplicateWarning}
                className="h-14 flex-[2] rounded-xl bg-municipality-green text-base font-semibold hover:bg-municipality-green/90 sm:text-lg"
              >
                {(isUploading || isChecking) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isUploading && 'Enviando reporte...'}
                {isChecking && !isUploading && 'Verificando...'}
                {!isUploading && !isChecking && (
                  <>
                    Enviar reporte
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>

          {uploadError && (
            <div className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {uploadError}
            </div>
          )}
        </form>
      </Form>
    </Card>
  );
}

function DuplicateWarning({
  duplicates,
  onCancel,
  onConfirm,
}: {
  duplicates: PotentialDuplicate[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const strongestDuplicate = duplicates[0];
  if (!strongestDuplicate) return null;

  const copy =
    DUPLICATE_LEVEL_COPY[
      strongestDuplicate.level === 'likely' || strongestDuplicate.level === 'possible'
        ? strongestDuplicate.level
        : 'possible'
    ];
  const isLikely = strongestDuplicate.level === 'likely';

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-sm',
        isLikely ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50',
      )}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span
            className={cn(
              'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              isLikely ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p
              className={cn('text-lg font-semibold', isLikely ? 'text-red-950' : 'text-amber-950')}
            >
              {copy.title}
            </p>
            <p className={cn('mt-1 text-sm', isLikely ? 'text-red-800' : 'text-amber-800')}>
              {copy.description}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]',
            isLikely ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800',
          )}
        >
          {strongestDuplicate.confidence}% · {copy.badge}
        </span>
      </div>

      <ul className="mb-4 space-y-3">
        {duplicates.map((dup) => (
          <li
            key={dup.id}
            className="rounded-xl border border-white/80 bg-white p-3 text-sm shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-950">
                {dup.confidence}% coincidencia · {dup.distance} m
              </span>
              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {STATUS_LABELS[dup.status] || dup.status}
              </span>
            </div>
            <p className="mt-2 text-slate-600">{dup.description}</p>
            {dup.reasons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {dup.reasons.map((reason) => (
                  <span
                    key={`${dup.id}-${reason}`}
                    className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-12">
          Revisar mi reporte
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          className={cn(
            'h-12 text-white',
            isLikely ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-600 hover:bg-amber-700',
          )}
        >
          Enviar de todos modos
        </Button>
      </div>
    </div>
  );
}

function renderLocationStatus(
  locationStatus: LocationStatus,
  location: { lat: number; lng: number },
  requestLocation: () => void,
) {
  switch (locationStatus) {
    case 'pending':
      return (
        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Obteniendo ubicación...</span>
        </div>
      );
    case 'success':
    case 'outside_area':
      return (
        <div className="bg-white">
          <DynamicLocationMap lat={location.lat} lng={location.lng} />
          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8f8f9] text-[#8f1420]">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-950">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
                <p className="text-sm text-slate-500">
                  {locationStatus === 'outside_area'
                    ? 'Fuera del área estimada de servicio'
                    : 'Ubicación detectada'}
                </p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-municipality-green"
            >
              Ver mapa
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      );
    case 'error':
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
          <MapPinOff className="h-8 w-8 text-destructive" />
          <p className="font-semibold text-slate-950">No se pudo obtener tu ubicación</p>
          <Button type="button" variant="outline" onClick={requestLocation}>
            Reintentar ubicación
          </Button>
        </div>
      );
  }
}
