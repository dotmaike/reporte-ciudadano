import imageCompression from 'browser-image-compression';
import { collection, doc, setDoc } from 'firebase/firestore';
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
  createdAt: Date;
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
      const { image, ...dataWithoutImage } = data;
      const geohash = encodeGeohash(data.location.lat, data.location.lng);

      const reportData: ReportData = {
        ...dataWithoutImage,
        id: reportId,
        imageUrl, // Presigned URL (will expire, but imageKey is stored for refresh)
        imageKey, // Storage key for generating new presigned URLs
        geohash, // For proximity-based duplicate detection
        status: 'pending',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'reports', reportId), reportData);

      setIsUploading(false);
      return reportId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al subir el reporte';
      setError(errorMessage);
      setIsUploading(false);
      console.error(error);
      return null;
    }
  };

  return { isUploading, error, uploadReport };
};
