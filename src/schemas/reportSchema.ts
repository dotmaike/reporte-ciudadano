import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const reportSchema = z.object({
  category: z.enum(
    ['pothole', 'lighting', 'water_leak', 'garbage', 'civil_protection', 'animal_welfare'],
    {
      required_error: 'Por favor, selecciona una categoría.',
    },
  ),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres.')
    .max(500, 'La descripción no puede exceder los 500 caracteres.'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  image: z
    .instanceof(File, { message: 'Se requiere una imagen.' })
    .refine((file) => file.size <= MAX_FILE_SIZE, 'El tamaño máximo de la imagen es 5MB.')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Solo se aceptan formatos .jpg, .jpeg, .png y .webp.',
    ),
});

export type ReportFormValues = z.infer<typeof reportSchema>;
