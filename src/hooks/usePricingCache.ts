import { useState, useCallback, useRef } from "react";
import { PricingData } from "../services/pricingService";

interface PricingCacheEntry {
  data: PricingData;
  timestamp: number;
}

interface PricingCache {
  [key: string]: PricingCacheEntry;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const MAX_CACHE_SIZE = 10; // أقصى عدد من الإدخالات في الكاش

// إنشاء كاش عام مشترك بين جميع المكونات
let globalPricingCache: PricingCache = {};

export const usePricingCache = () => {
  const cacheRef = useRef<PricingCache>(globalPricingCache);
  const [isLoading, setIsLoading] = useState(false);

  // إنشاء مفتاح فريد للكاش
  const createCacheKey = useCallback((forceRefresh: boolean = false) => {
    return `pricing-${forceRefresh ? "refresh" : "normal"}`;
  }, []);

  // تنظيف الكاش القديم
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    Object.keys(cache).forEach((key) => {
      if (now - cache[key].timestamp > CACHE_DURATION) {
        delete cache[key];
        delete globalPricingCache[key]; // تنظيف الكاش العام أيضاً
      }
    });

    // إذا كان الكاش كبير جداً، احذف أقدم الإدخالات
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      const sortedKeys = keys.sort(
        (a, b) => cache[a].timestamp - cache[b].timestamp
      );
      const keysToDelete = sortedKeys.slice(0, keys.length - MAX_CACHE_SIZE);
      keysToDelete.forEach((key) => {
        delete cache[key];
        delete globalPricingCache[key]; // تنظيف الكاش العام أيضاً
      });
    }
  }, []);

  // الحصول على البيانات من الكاش
  const getFromCache = useCallback(
    (forceRefresh: boolean = false) => {
      cleanExpiredCache();

      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached;
      }

      return null;
    },
    [createCacheKey, cleanExpiredCache]
  );

  // حفظ البيانات في الكاش
  const setCache = useCallback(
    (data: PricingData, forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);

      const cacheEntry: PricingCacheEntry = {
        data,
        timestamp: Date.now(),
      };

      cacheRef.current[key] = cacheEntry;
      globalPricingCache[key] = cacheEntry; // حفظ في الكاش العام أيضاً
    },
    [createCacheKey]
  );

  // مسح الكاش بالكامل
  const clearCache = useCallback(() => {
    cacheRef.current = {};
    globalPricingCache = {}; // مسح الكاش العام أيضاً
  }, []);

  // مسح إدخالات محددة من الكاش
  const invalidateCache = useCallback(
    (pattern?: string) => {
      if (!pattern) {
        clearCache();
        return;
      }

      Object.keys(cacheRef.current).forEach((key) => {
        if (key.includes(pattern)) {
          delete cacheRef.current[key];
          delete globalPricingCache[key]; // مسح من الكاش العام أيضاً
        }
      });
    },
    [clearCache]
  );

  // تحديث بيانات التسعير في الكاش
  const updatePricingInCache = useCallback(
    (updatedPricing: PricingData, forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedCacheEntry: PricingCacheEntry = {
          ...cached,
          data: updatedPricing,
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalPricingCache[key] = updatedCacheEntry;
      }
    },
    [createCacheKey]
  );

  // الحصول على إحصائيات الكاش
  const getCacheStats = useCallback(() => {
    const cache = cacheRef.current;
    const keys = Object.keys(cache);
    const now = Date.now();

    return {
      totalEntries: keys.length,
      expiredEntries: keys.filter(
        (key) => now - cache[key].timestamp > CACHE_DURATION
      ).length,
      memoryUsage: JSON.stringify(cache).length,
    };
  }, []);

  return {
    getFromCache,
    setCache,
    clearCache,
    invalidateCache,
    updatePricingInCache,
    getCacheStats,
    isLoading,
    setIsLoading,
  };
};
