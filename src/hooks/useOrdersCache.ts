import { useState, useCallback, useRef } from "react";
import { OrderData } from "../services/orderService";

interface CacheEntry {
  data: OrderData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: number;
  searchParams: string;
}

interface OrdersCache {
  [key: string]: CacheEntry;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const MAX_CACHE_SIZE = 50; // أقصى عدد من الإدخالات في الكاش

// إنشاء كاش عام مشترك بين جميع المكونات
let globalCache: OrdersCache = {};

export const useOrdersCache = () => {
  const cacheRef = useRef<OrdersCache>(globalCache);
  const [isLoading, setIsLoading] = useState(false);

  // إنشاء مفتاح فريد للكاش بناءً على المعاملات
  const createCacheKey = useCallback(
    (
      page: number,
      limit: number,
      status: string,
      search: string,
      includePending: boolean
    ) => {
      return `${page}-${limit}-${status}-${search}-${includePending}`;
    },
    []
  );

  // تنظيف الكاش القديم
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    Object.keys(cache).forEach((key) => {
      if (now - cache[key].timestamp > CACHE_DURATION) {
        delete cache[key];
        delete globalCache[key]; // تنظيف الكاش العام أيضاً
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
        delete globalCache[key]; // تنظيف الكاش العام أيضاً
      });
    }
  }, []);

  // الحصول على البيانات من الكاش
  const getFromCache = useCallback(
    (
      page: number,
      limit: number,
      status: string,
      search: string,
      includePending: boolean
    ) => {
      cleanExpiredCache();

      const key = createCacheKey(page, limit, status, search, includePending);
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
    (
      page: number,
      limit: number,
      status: string,
      search: string,
      includePending: boolean,
      data: OrderData[],
      pagination: {
        currentPage: number;
        totalPages: number;
        totalOrders: number;
        hasNext: boolean;
        hasPrev: boolean;
      }
    ) => {
      const key = createCacheKey(page, limit, status, search, includePending);

      const cacheEntry = {
        data,
        pagination,
        timestamp: Date.now(),
        searchParams: `${page}-${limit}-${status}-${search}-${includePending}`,
      };

      cacheRef.current[key] = cacheEntry;
      globalCache[key] = cacheEntry; // حفظ في الكاش العام أيضاً
    },
    [createCacheKey]
  );

  // مسح الكاش بالكامل
  const clearCache = useCallback(() => {
    cacheRef.current = {};
    globalCache = {}; // مسح الكاش العام أيضاً
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
          delete globalCache[key]; // مسح من الكاش العام أيضاً
        }
      });
    },
    [clearCache]
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
    getCacheStats,
    isLoading,
    setIsLoading,
  };
};
