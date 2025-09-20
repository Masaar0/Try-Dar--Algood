import { useState, useCallback, useRef } from "react";
import { PredefinedImageData } from "../services/predefinedImagesService";
import { CategoryData } from "../services/categoryService";

interface PredefinedImagesCacheEntry {
  images: PredefinedImageData[];
  categories: CategoryData[];
  timestamp: number;
}

interface PredefinedImagesCache {
  [key: string]: PredefinedImagesCacheEntry;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const MAX_CACHE_SIZE = 10; // أقصى عدد من الإدخالات في الكاش

// إنشاء كاش عام مشترك بين جميع المكونات
let globalPredefinedImagesCache: PredefinedImagesCache = {};

export const usePredefinedImagesCache = () => {
  const cacheRef = useRef<PredefinedImagesCache>(globalPredefinedImagesCache);
  const [isLoading, setIsLoading] = useState(false);

  // إنشاء مفتاح فريد للكاش
  const createCacheKey = useCallback((forceRefresh: boolean = false) => {
    return `predefined-images-${forceRefresh ? "refresh" : "normal"}`;
  }, []);

  // تنظيف الكاش القديم
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    Object.keys(cache).forEach((key) => {
      if (now - cache[key].timestamp > CACHE_DURATION) {
        delete cache[key];
        delete globalPredefinedImagesCache[key]; // تنظيف الكاش العام أيضاً
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
        delete globalPredefinedImagesCache[key]; // تنظيف الكاش العام أيضاً
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
    (
      images: PredefinedImageData[],
      categories: CategoryData[],
      forceRefresh: boolean = false
    ) => {
      const key = createCacheKey(forceRefresh);

      const cacheEntry: PredefinedImagesCacheEntry = {
        images,
        categories,
        timestamp: Date.now(),
      };

      cacheRef.current[key] = cacheEntry;
      globalPredefinedImagesCache[key] = cacheEntry; // حفظ في الكاش العام أيضاً
    },
    [createCacheKey]
  );

  // مسح الكاش بالكامل
  const clearCache = useCallback(() => {
    cacheRef.current = {};
    globalPredefinedImagesCache = {}; // مسح الكاش العام أيضاً
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
          delete globalPredefinedImagesCache[key]; // مسح من الكاش العام أيضاً
        }
      });
    },
    [clearCache]
  );

  // تحديث صورة محددة في الكاش
  const updateImageInCache = useCallback(
    (
      imageId: string,
      updatedImage: PredefinedImageData,
      forceRefresh: boolean = false
    ) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedImages = cached.images.map((img) =>
          img.id === imageId ? updatedImage : img
        );

        const updatedCacheEntry: PredefinedImagesCacheEntry = {
          ...cached,
          images: updatedImages,
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalPredefinedImagesCache[key] = updatedCacheEntry;
      }
    },
    [createCacheKey]
  );

  // إضافة صورة جديدة للكاش
  const addImageToCache = useCallback(
    (newImage: PredefinedImageData, forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedCacheEntry: PredefinedImagesCacheEntry = {
          ...cached,
          images: [newImage, ...cached.images],
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalPredefinedImagesCache[key] = updatedCacheEntry;
      }
    },
    [createCacheKey]
  );

  // حذف صورة من الكاش
  const removeImageFromCache = useCallback(
    (imageId: string, forceRefresh: boolean = false) => {
      const key = createCacheKey(forceRefresh);
      const cached = cacheRef.current[key];

      if (cached) {
        const updatedImages = cached.images.filter((img) => img.id !== imageId);

        const updatedCacheEntry: PredefinedImagesCacheEntry = {
          ...cached,
          images: updatedImages,
          timestamp: Date.now(),
        };

        cacheRef.current[key] = updatedCacheEntry;
        globalPredefinedImagesCache[key] = updatedCacheEntry;
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
    updateImageInCache,
    addImageToCache,
    removeImageFromCache,
    getCacheStats,
    isLoading,
    setIsLoading,
  };
};
