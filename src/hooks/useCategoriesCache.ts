import { useState, useCallback, useRef } from "react";
import { CategoryData } from "../services/categoryService";

interface CategoriesCacheEntry {
  data: CategoryData[];
  timestamp: number;
}

interface CategoriesCache {
  [key: string]: CategoriesCacheEntry;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const MAX_CACHE_SIZE = 10; // أقصى عدد من الإدخالات في الكاش

// إنشاء كاش عام مشترك بين جميع المكونات
let globalCategoriesCache: CategoriesCache = {};

export const useCategoriesCache = () => {
  const cacheRef = useRef<CategoriesCache>(globalCategoriesCache);
  const [isLoading, setIsLoading] = useState(false);

  // إنشاء مفتاح فريد للكاش
  const createCacheKey = useCallback((forceRefresh: boolean = false) => {
    return `categories-${forceRefresh ? "refresh" : "normal"}`;
  }, []);

  // تنظيف الكاش القديم
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    Object.keys(cache).forEach((key) => {
      if (now - cache[key].timestamp > CACHE_DURATION) {
        delete cache[key];
        delete globalCategoriesCache[key]; // تنظيف الكاش العام أيضاً
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
        delete globalCategoriesCache[key]; // تنظيف الكاش العام أيضاً
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
    (data: CategoryData[], forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);

      const cacheEntry: CategoriesCacheEntry = {
        data,
        timestamp: Date.now(),
      };

      cacheRef.current[key] = cacheEntry;
      globalCategoriesCache[key] = cacheEntry; // حفظ في الكاش العام أيضاً
    },
    [createCacheKey]
  );

  // مسح الكاش بالكامل
  const clearCache = useCallback(() => {
    cacheRef.current = {};
    globalCategoriesCache = {}; // مسح الكاش العام أيضاً
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
          delete globalCategoriesCache[key]; // مسح من الكاش العام أيضاً
        }
      });
    },
    [clearCache]
  );

  // إضافة تصنيف جديد للكاش
  const addCategoryToCache = useCallback(
    (newCategory: CategoryData, forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedCacheEntry: CategoriesCacheEntry = {
          ...cached,
          data: [...cached.data, newCategory].sort((a, b) => a.order - b.order),
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalCategoriesCache[key] = updatedCacheEntry;
      }
    },
    [createCacheKey]
  );

  // تحديث تصنيف في الكاش
  const updateCategoryInCache = useCallback(
    (
      categoryId: string,
      updatedCategory: CategoryData,
      forceRefresh: boolean = false
    ) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedCacheEntry: CategoriesCacheEntry = {
          ...cached,
          data: cached.data.map((cat) =>
            cat.id === categoryId ? updatedCategory : cat
          ),
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalCategoriesCache[key] = updatedCacheEntry;
      }
    },
    [createCacheKey]
  );

  // حذف تصنيف من الكاش
  const removeCategoryFromCache = useCallback(
    (categoryId: string, forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedCacheEntry: CategoriesCacheEntry = {
          ...cached,
          data: cached.data.filter((cat) => cat.id !== categoryId),
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalCategoriesCache[key] = updatedCacheEntry;
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
    addCategoryToCache,
    updateCategoryInCache,
    removeCategoryFromCache,
    getCacheStats,
    isLoading,
    setIsLoading,
  };
};
