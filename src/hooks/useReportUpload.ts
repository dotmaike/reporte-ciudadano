import imageCompression from 'browser-image-compression';
import { collection, doc } from 'firebase/firestore';
import { useState } from 'react';

import { db } from '@/lib/firebase';
import { encodeGeohash } from '@/lib/location';
import type { ReportFormValues } from '@/schemas/reportSchema';

type ReportData = Omit<ReportFormValues, 'image'> & {
  id: string;
  imageUrl: string;
  imageKey: string;
  geohash: string;
  status: string;
};

export const useReportUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadReport = async (data: ReportFormValues) => {
    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Compress the image to WebP format before upload
      const options = {
        maxWidthOrHeight: 1280,
        maxSizeMB: 0.5,
        useWebWorker: true,
        fileType: 'image/webp',
        quality: 0.7,
      };
      const compressedFile = await imageCompression(data.image, options);

      // Generate a unique report ID
      const reportId = doc(collection(db, 'reports')).id;

      // Step 2: Upload image via server-side API route
      // This keeps B2 credentials secure on the server
      const formData = new FormData();
      formData.append('file', compressedFile, `${reportId}.webp`);
      formData.append('reportId', reportId);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Error al subir la imagen');
      }

      const { imageUrl, key: imageKey } = await uploadResponse.json();

      // Step 3: Save the report metadata to Firebase Firestore
      const { image: _image, ...dataWithoutImage } = data;
      const geohash = encodeGeohash(data.location.lat, data.location.lng);

      const reportData: ReportData = {
        ...dataWithoutImage,
        id: reportId,
        imageUrl, // Presigned URL (will expire, but imageKey is stored for refresh)
        imageKey, // Storage key for generating new presigned URLs
        geohash, // For proximity-based duplicate detection
        status: 'pending',
      };

      const reportResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          category: reportData.category,
          description: reportData.description,
          location: reportData.location,
          imageUrl: reportData.imageUrl,
          imageKey: reportData.imageKey,
          geohash: reportData.geohash,
        }),
      });

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json();
        throw new Error(errorData.error || 'Error al guardar el reporte');
      }

      return reportId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al subir el reporte';
      setError(errorMessage);
      console.error(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, error, uploadReport };
};
