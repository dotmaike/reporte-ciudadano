import { useCallback, useState } from 'react';

export interface PotentialDuplicate {
  id: string;
  category: string;
  description: string;
  status: string;
  distance: number;
  createdAt: string;
  confidence: number;
  level: DuplicateConfidenceLevel;
  reasons: string[];
  textSimilarity: number;
}

export type DuplicateConfidenceLevel = 'none' | 'possible' | 'likely';

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  level: DuplicateConfidenceLevel;
  confidence: number;
  reports: PotentialDuplicate[];
  radius?: number;
  strongRadius?: number;
  timeWindow?: number;
  thresholds?: {
    possible: number;
    likely: number;
  };
  message?: string;
}

export const useDuplicateCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkForDuplicates = useCallback(
    async (
      lat: number,
      lng: number,
      category: string,
      description?: string,
    ): Promise<DuplicateCheckResult> => {
      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch('/api/check-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ lat, lng, category, description }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error checking for duplicates');
        }

        const result: DuplicateCheckResult = await response.json();
        setDuplicates(result.reports);
        setIsChecking(false);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido al verificar duplicados';
        setError(errorMessage);
        setIsChecking(false);

        return {
          hasDuplicates: false,
          level: 'none',
          confidence: 0,
          reports: [],
          message: errorMessage,
        };
      }
    },
    [],
  );

  const clearDuplicates = useCallback(() => {
    setDuplicates([]);
    setError(null);
  }, []);

  return {
    isChecking,
    duplicates,
    error,
    checkForDuplicates,
    clearDuplicates,
  };
};
