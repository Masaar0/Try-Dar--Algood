import { useState, useEffect, useCallback } from "react";
import pricingService, {
  PricingData,
  PricingBreakdown,
} from "../services/pricingService";
import { usePricingCache } from "./usePricingCache";

interface UsePricingReturn {
  pricingData: PricingData | null;
  isLoading: boolean;
  error: string | null;
  calculatePrice: (
    frontLogos: number,
    frontTexts: number,
    rightSideLogos: number,
    leftSideLogos: number,
    quantity?: number
  ) => Promise<{ totalPrice: number; breakdown: PricingBreakdown }>;
  refreshPricing: () => Promise<void>;
}

/**
 * Hook لإدارة التسعير من الباك إند مع نظام كاش متقدم
 */
export const usePricing = (): UsePricingReturn => {
  const { getFromCache, setCache } = usePricingCache();
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تحميل بيانات التسعير
  const loadPricing = useCallback(async () => {
    setError(null);

    try {
      // التحقق من الكاش أولاً
      const cached = getFromCache();

      if (cached) {
        setPricingData(cached.data);
        setIsLoading(false);
        return;
      }

      // إذا لم توجد في الكاش، تحميل من السيرفر
      setIsLoading(true);
      const data = await pricingService.getPricing();
      setPricingData(data);

      // حفظ في الكاش
      setCache(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "فشل في تحميل بيانات التسعير";
      setError(errorMessage);
      console.error("Error loading pricing:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getFromCache, setCache]);

  // حساب السعر
  const calculatePrice = useCallback(
    async (
      frontLogos: number,
      frontTexts: number,
      rightSideLogos: number,
      leftSideLogos: number,
      quantity: number = 1
    ) => {
      try {
        return await pricingService.calculatePrice(
          frontLogos,
          frontTexts,
          rightSideLogos,
          leftSideLogos,
          quantity
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "فشل في حساب السعر";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // إعادة تحميل بيانات التسعير
  const refreshPricing = useCallback(async () => {
    await loadPricing();
  }, [loadPricing]);

  // تحميل البيانات عند تحميل المكون
  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  return {
    pricingData,
    isLoading,
    error,
    calculatePrice,
    refreshPricing,
  };
};

export default usePricing;
