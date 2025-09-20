import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Images,
  Upload,
  Trash2,
  CheckCircle,
  Circle,
  ArrowRight,
  Search,
  Eye,
  Loader2,
  AlertCircle,
  Star,
  User,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useImageLibrary,
  PredefinedImage,
} from "../context/ImageLibraryContext";
import CloudinaryImageUpload from "../components/forms/CloudinaryImageUpload";
import { CloudinaryImageData } from "../services/imageUploadService";
import imageUploadService from "../services/imageUploadService";
import ImageModal from "../components/ui/ImageModal";
import { useModal } from "../hooks/useModal";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Modal from "../components/ui/Modal";

const ImageLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    predefinedImages,
    categories,
    userImages,
    selectedImages,
    selectImage,
    unselectImage,
    isImageSelected,
    addUserImage,
    removeUserImage,
    loadPredefinedImages,
    error,
  } = useImageLibrary();

  const [activeTab, setActiveTab] = useState<"predefined" | "user">(
    "predefined"
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImageForView, setSelectedImageForView] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<string>("");
  const [showSelectedSidebar, setShowSelectedSidebar] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUserImages, setSelectedUserImages] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  const imageModal = useModal();
  const deleteConfirmModal = useModal();
  const deleteMultipleConfirmModal = useModal();
  const deleteAllConfirmModal = useModal();
  const uploadModal = useModal({
    closeOnEscape: !isUploading,
    closeOnBackdropClick: !isUploading,
  });
  const [imageToDelete, setImageToDelete] =
    useState<CloudinaryImageData | null>(null);

  // تحديد الصفحة المرجعية للعودة إليها
  const getReturnPath = (): string => {
    // فحص الـ referrer أو state من التنقل
    const state = location.state as { from?: string } | null;
    const referrer = state?.from || document.referrer;

    // إذا كان هناك referrer، فحص إذا كان من الصفحات المسموحة
    if (referrer) {
      const url = new URL(referrer, window.location.origin);
      const pathname = url.pathname;

      // فحص الصفحات المسموحة
      if (pathname === "/customizer") {
        return "/customizer";
      }
      if (pathname.startsWith("/edit-order/")) {
        return pathname;
      }
      if (pathname.startsWith("/admin/orders/") && pathname.endsWith("/edit")) {
        return pathname;
      }
    }

    // إذا لم نجد صفحة مرجعية صحيحة، العودة للـ customizer كافتراضي
    return "/customizer";
  };

  const handleNavigateToDesign = () => {
    const returnPath = getReturnPath();
    navigate(returnPath);
  };
  useEffect(() => {
    const preloadVisibleImages = async () => {
      // تحميل الصور المرئية فقط (أول 20 صورة)
      const visiblePredefined = predefinedImages.slice(0, 20);

      // تحميل الصور بشكل متوازي مع أولوية للصور الأولى
      const preloadPromises = visiblePredefined.map((image, index) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.loading = "eager";
          img.decoding = index < 10 ? "sync" : "async";
          img.fetchPriority = index < 10 ? "high" : "auto";

          // تحسين URL للصور لتحميل أسرع
          const optimizedUrl = image.url.includes("upload/")
            ? image.url.replace("upload/", "upload/q_auto,f_auto,w_300,h_300/")
            : image.url;

          img.src = optimizedUrl;

          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });

      // تحميل الصور بشكل متوازي
      await Promise.allSettled(preloadPromises);
    };

    if (predefinedImages.length > 0) {
      preloadVisibleImages();
    }
  }, [predefinedImages]);

  const handleImageUpload = (imageData: CloudinaryImageData) => {
    addUserImage(imageData);
    selectImage(imageData, "user");
    uploadModal.closeModal();
  };

  const handleDeleteUserImage = async (image: CloudinaryImageData) => {
    setImageToDelete(image);
    deleteConfirmModal.openModal();
  };

  // دالة مساعدة للتحقق من وجود الصورة في الخادم
  const checkImageExists = async (
    publicId: string
  ): Promise<{
    exists: boolean;
    message: string;
    imageInfo?: CloudinaryImageData;
  }> => {
    try {
      const imageInfo = await imageUploadService.getImageInfo(publicId);
      if (imageInfo) {
        return {
          exists: true,
          message: "الصورة موجودة في الخادم",
          imageInfo,
        };
      } else {
        return {
          exists: false,
          message: "الصورة غير موجودة في الخادم",
        };
      }
    } catch (error) {
      console.error(`Error checking image existence for ${publicId}:`, error);
      return {
        exists: false,
        message: "فشل في التحقق من وجود الصورة في الخادم",
      };
    }
  };

  // دالة مساعدة لإعادة محاولة حذف الصورة من الخادم
  const retryDeleteFromServer = async (
    publicId: string,
    maxRetries: number = 2
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await imageUploadService.deleteImageWithDetails(
          publicId
        );
        if (result.success) {
          return result;
        }
        console.log(
          `Attempt ${attempt} failed for image ${publicId}:`,
          result.message
        );
      } catch (error) {
        console.log(`Attempt ${attempt} error for image ${publicId}:`, error);
      }

      // انتظار قصير قبل المحاولة التالية
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: false,
      message: `فشل في حذف الصورة بعد ${maxRetries} محاولات`,
      error: "MAX_RETRIES_EXCEEDED",
    };
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;

    setIsDeleting(imageToDelete.publicId);
    setDeletingStatus("جاري التحقق من وجود الصورة...");

    try {
      // التحقق من وجود الصورة في الخادم أولاً
      const checkResult = await checkImageExists(imageToDelete.publicId);

      if (!checkResult.exists) {
        setDeletingStatus(`${checkResult.message}، سيتم حذفها من المكتبة فقط`);
        removeUserImage(imageToDelete.publicId);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return;
      }

      setDeletingStatus("جاري حذف الصورة من الخادم...");

      // محاولة حذف الصورة من الخادم مع إعادة المحاولة
      const deleteResult = await retryDeleteFromServer(imageToDelete.publicId);

      setDeletingStatus("جاري حذف الصورة من المكتبة...");

      // حذف الصورة من المكتبة المحلية في جميع الحالات
      removeUserImage(imageToDelete.publicId);

      if (deleteResult.success) {
        console.log(
          `Image ${imageToDelete.publicId} removed from server, library and design`
        );
        setDeletingStatus("تم حذف الصورة بنجاح!");
        // انتظار قصير لعرض رسالة النجاح
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.log(
          `Image ${imageToDelete.publicId} removed from library and design (server deletion failed: ${deleteResult.message})`
        );
        setDeletingStatus("تم حذف الصورة من المكتبة، لكن فشل الحذف من الخادم");

        // عرض رسالة تحذيرية للمستخدم مع خيار إعادة المحاولة
        const shouldRetry = confirm(
          `تم حذف الصورة من المكتبة، لكن فشل الحذف من الخادم.\n\nالسبب: ${deleteResult.message}\n\nهل تريد إعادة المحاولة؟`
        );

        if (shouldRetry) {
          setDeletingStatus("جاري إعادة المحاولة...");
          const retryResult = await retryDeleteFromServer(
            imageToDelete.publicId,
            3
          );
          if (retryResult.success) {
            setDeletingStatus("تم حذف الصورة من الخادم بنجاح!");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            setDeletingStatus(
              `فشل في حذف الصورة من الخادم مرة أخرى: ${retryResult.message}`
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      setDeletingStatus("حدث خطأ أثناء حذف الصورة");
      // حتى في حالة الخطأ، نحذف الصورة من المكتبة المحلية
      removeUserImage(imageToDelete.publicId);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setIsDeleting(null);
      setDeletingStatus("");
      setImageToDelete(null);
      deleteConfirmModal.closeModal();
    }
  };

  const handleToggleImageSelection = (publicId: string) => {
    setSelectedUserImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(publicId)) {
        newSet.delete(publicId);
      } else {
        newSet.add(publicId);
      }
      return newSet;
    });
  };

  const handleSelectAllUserImages = () => {
    if (selectedUserImages.size === filteredUserImages.length) {
      setSelectedUserImages(new Set());
    } else {
      setSelectedUserImages(
        new Set(filteredUserImages.map((img) => img.publicId))
      );
    }
  };

  const handleDeleteSelectedImages = async () => {
    if (selectedUserImages.size === 0) return;

    setIsDeletingMultiple(true);
    try {
      const imagesToDelete = Array.from(selectedUserImages);

      // حذف الصور من localStorage فقط (لا نحذف من Cloudinary)
      imagesToDelete.forEach((publicId) => {
        removeUserImage(publicId);
      });

      setSelectedUserImages(new Set());
      setIsSelectionMode(false);

      console.log(`Removed ${imagesToDelete.length} images from localStorage`);
    } catch (error) {
      console.error("Error deleting selected images:", error);
      alert("حدث خطأ أثناء حذف الصور المحددة");
    } finally {
      setIsDeletingMultiple(false);
      deleteMultipleConfirmModal.closeModal();
    }
  };

  const handleDeleteAllUserImages = async () => {
    setIsDeletingMultiple(true);
    try {
      // حذف جميع الصور من localStorage فقط
      const allImageIds = userImages.map((img) => img.publicId);
      allImageIds.forEach((publicId) => {
        removeUserImage(publicId);
      });

      setSelectedUserImages(new Set());
      setIsSelectionMode(false);

      console.log(`Removed all ${allImageIds.length} images from localStorage`);
    } catch (error) {
      console.error("Error deleting all images:", error);
      alert("حدث خطأ أثناء حذف جميع الصور");
    } finally {
      setIsDeletingMultiple(false);
      deleteAllConfirmModal.closeModal();
    }
  };

  const handleImageSelect = (
    image: PredefinedImage | CloudinaryImageData,
    source: "predefined" | "user"
  ) => {
    const imageId =
      source === "predefined"
        ? (image as PredefinedImage).id
        : (image as CloudinaryImageData).publicId;
    if (isImageSelected(imageId)) {
      unselectImage(imageId);
    } else {
      selectImage(image, source);
    }
  };

  const handleViewImage = (imageUrl: string) => {
    setSelectedImageForView(imageUrl);
    imageModal.openModal();
  };

  const filteredPredefinedImages = predefinedImages.filter((image) => {
    const matchesSearch =
      image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (image.description &&
        image.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      image.categoryId === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredUserImages = userImages.filter((image) =>
    image.publicId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getIconComponent = (iconId: string) => {
    const iconMap: {
      [key: string]: React.ComponentType<{ className?: string }>;
    } = {
      folder: Images,
      star: Star,
      shapes: Images,
      type: User,
      image: Images,
    };
    return iconMap[iconId] || Images;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-4 sm:py-8 mobile-content-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-4 sm:mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-[#563660] rounded-xl flex items-center justify-center">
              <Images className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-light text-gray-900">
              مكتبة الصور
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            اختر الصور التي تريد استخدامها في تصميم جاكيتك من مجموعتنا الجاهزة
            أو ارفع صورك الخاصة
          </p>
        </motion.div>

        {selectedImages.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-sm sm:text-base text-green-800 font-medium">
                  تم تحديد {selectedImages.length} صورة للاستخدام في التصميم
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowSelectedSidebar(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                >
                  عرض المحددة
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={handleNavigateToDesign}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-[#563660] text-white rounded-lg hover:bg-[#4b2e55] transition-colors text-xs sm:text-sm"
                >
                  انتقل للتصميم
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:flex-1 lg:max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="ابحث في الصور..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#563660] focus:border-transparent transition-all text-sm sm:text-base"
              />
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <button
                onClick={() => setActiveTab("predefined")}
                className={`flex-1 lg:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                  activeTab === "predefined"
                    ? "bg-[#563660] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">الشعارات الجاهزة</span>
                <span className="sm:hidden">جاهزة</span>
                <span className="hidden sm:inline">
                  ({predefinedImages.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("user")}
                className={`flex-1 lg:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                  activeTab === "user"
                    ? "bg-[#563660] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">صوري</span>
                <span className="sm:hidden">صوري</span>
                <span className="hidden sm:inline">({userImages.length})</span>
              </button>
            </div>
          </div>

          {activeTab === "predefined" && categories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                فلترة حسب التصنيف
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategoryFilter === "all"
                      ? "bg-[#563660] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Images className="w-4 h-4" />
                  الكل ({predefinedImages.length})
                </button>
                {categories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const categoryCount = predefinedImages.filter(
                    (img) => img.categoryId === category.id
                  ).length;

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryFilter(category.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategoryFilter === category.id
                          ? "text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={{
                        backgroundColor:
                          selectedCategoryFilter === category.id
                            ? category.color
                            : undefined,
                      }}
                    >
                      <IconComponent className="w-4 h-4" />
                      {category.name} ({categoryCount})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === "predefined" && (
                <div key="predefined">
                  {error ? (
                    <div className="text-center py-12 sm:py-20">
                      <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                        خطأ في التحميل
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-4 px-4">
                        {error}
                      </p>
                      <button
                        onClick={loadPredefinedImages}
                        className="px-4 py-2 bg-[#563660] text-white rounded-lg hover:bg-[#4b2e55] transition-colors text-sm sm:text-base"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : filteredPredefinedImages.length === 0 ? (
                    <div className="text-center py-12 sm:py-20">
                      <Images className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                        لا توجد صور
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 px-4">
                        لم نجد صور تطابق بحثك
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
                      {filteredPredefinedImages.map((image) => (
                        <div
                          key={image.id}
                          className="relative group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                        >
                          <div className="aspect-square p-2 sm:p-4">
                            <img
                              src={image.url}
                              alt={image.name}
                              className="w-full h-full object-contain"
                              loading="eager"
                              decoding="async"
                            />
                          </div>

                          <div className="p-2 sm:p-3 border-t border-gray-100">
                            <h3 className="font-medium text-gray-900 text-xs sm:text-sm truncate mb-1">
                              {image.name}
                            </h3>
                            <div className="flex items-center gap-1 mb-1">
                              {image.category && (
                                <>
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: image.category.color,
                                    }}
                                  />
                                  <p className="text-xs text-gray-500 truncate">
                                    {image.category.name}
                                  </p>
                                </>
                              )}
                            </div>
                            {image.description && (
                              <p className="text-xs text-gray-400 truncate">
                                {image.description}
                              </p>
                            )}
                          </div>

                          <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                            <button
                              onClick={() =>
                                handleImageSelect(image, "predefined")
                              }
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isImageSelected(image.id)
                                  ? "bg-[#563660] border-[#563660] text-white"
                                  : "bg-white border-gray-300 hover:border-[#563660]"
                              }`}
                            >
                              {isImageSelected(image.id) && (
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                            </button>
                          </div>

                          <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleViewImage(image.url)}
                              className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                              title="عرض"
                            >
                              <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "user" && (
                <div key="user" className="space-y-6">
                  <div className="bg-gradient-to-r from-[#563660] to-[#7e4a8c] rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 text-white">
                    <h3 className="text-lg sm:text-xl font-semibold mb-6 flex items-center gap-3">
                      <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
                      رفع صور جديدة
                    </h3>
                    <div className="text-center">
                      <p className="text-sm sm:text-base mb-4 opacity-90">
                        اسحب صورتك هنا أو انقر لاختيار ملف من جهازك
                      </p>
                      <button
                        onClick={uploadModal.openModal}
                        className="w-full sm:w-64 py-3 bg-white text-[#563660] rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base font-medium shadow-md"
                      >
                        اختر صورة للرفع
                      </button>
                      <p className="text-xs mt-4 opacity-80">
                        الحد الأقصى: 10MB | الأنواع: JPG, PNG, WEBP
                      </p>
                    </div>
                    <Modal
                      isOpen={uploadModal.isOpen}
                      shouldRender={uploadModal.shouldRender}
                      onClose={isUploading ? () => {} : uploadModal.closeModal}
                      title="رفع شعار"
                      size="sm"
                      showCloseButton={!isUploading}
                    >
                      <CloudinaryImageUpload
                        onImageSelect={handleImageUpload}
                        multiple={false}
                        placeholder="اسحب الصورة هنا أو انقر للاختيار"
                        acceptedFormats={[
                          "image/jpeg",
                          "image/jpg",
                          "image/png",
                          "image/webp",
                        ]}
                        maxFileSize={10}
                        aspectRatio={1}
                        cropTitle="اقتطاع الصورة"
                        onUploadStateChange={setIsUploading}
                        autoAddToLibrary={true}
                      />
                      <div className="text-xs text-gray-500 text-center">
                        <p>• الحد الأقصى: 10MB | الأنواع: JPG, PNG, WEBP</p>
                      </div>
                    </Modal>
                  </div>

                  {userImages.length === 0 ? (
                    <div className="text-center py-12 sm:py-20 bg-white rounded-xl shadow-sm border border-gray-200">
                      <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                        لا توجد صور مرفوعة
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 px-4">
                        ابدأ برفع صورك الخاصة لاستخدامها في التصميم
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* أدوات التحكم في الحذف */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-gray-900">
                              صوري ({userImages.length})
                            </h3>
                            {isSelectionMode && (
                              <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                {selectedUserImages.size} محددة
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto">
                            {!isSelectionMode ? (
                              <>
                                <button
                                  onClick={() => setIsSelectionMode(true)}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  تحديد للحذف
                                </button>
                                <button
                                  onClick={deleteAllConfirmModal.openModal}
                                  disabled={userImages.length === 0}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  حذف الكل
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={handleSelectAllUserImages}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                >
                                  {selectedUserImages.size ===
                                  filteredUserImages.length ? (
                                    <>
                                      <X className="w-4 h-4" />
                                      إلغاء التحديد
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      تحديد الكل
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={deleteMultipleConfirmModal.openModal}
                                  disabled={selectedUserImages.size === 0}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  حذف المحددة ({selectedUserImages.size})
                                </button>
                                <button
                                  onClick={() => {
                                    setIsSelectionMode(false);
                                    setSelectedUserImages(new Set());
                                  }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                >
                                  <X className="w-4 h-4" />
                                  إلغاء
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
                        {filteredUserImages.map((image) => (
                          <div
                            key={image.publicId}
                            className={`relative group bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${
                              isSelectionMode
                                ? selectedUserImages.has(image.publicId)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-blue-300"
                                : "border-gray-200"
                            }`}
                            onClick={() => {
                              if (isSelectionMode) {
                                handleToggleImageSelection(image.publicId);
                              }
                            }}
                          >
                            <div className="aspect-square p-2 sm:p-4">
                              <img
                                src={image.url}
                                alt={image.publicId}
                                className="w-full h-full object-contain"
                                loading="eager"
                                decoding="async"
                              />
                            </div>

                            <div className="p-2 sm:p-3 border-t border-gray-100">
                              <h3 className="font-medium text-gray-900 text-xs sm:text-sm truncate mb-1">
                                {image.publicId.split("/").pop()}
                              </h3>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{image.format.toUpperCase()}</span>
                                <span>{formatFileSize(image.size)}</span>
                              </div>
                              {!isSelectionMode && (
                                <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                                  <button
                                    onClick={() =>
                                      handleImageSelect(image, "user")
                                    }
                                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isImageSelected(image.publicId)
                                        ? "bg-[#563660] border-[#563660] text-white"
                                        : "bg-white border-gray-300 hover:border-[#563660]"
                                    }`}
                                  >
                                    {isImageSelected(image.publicId) && (
                                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    )}
                                  </button>
                                </div>
                              )}

                              {isSelectionMode && (
                                <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                                  <div
                                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                      selectedUserImages.has(image.publicId)
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-300"
                                    }`}
                                  >
                                    {selectedUserImages.has(image.publicId) && (
                                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    )}
                                  </div>
                                </div>
                              )}

                              {!isSelectionMode && (
                                <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewImage(image.url);
                                    }}
                                    className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                                    title="عرض"
                                  >
                                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUserImage(image);
                                    }}
                                    disabled={isDeleting === image.publicId}
                                    className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
                                    title="حذف من الخادم"
                                  >
                                    {isDeleting === image.publicId ? (
                                      <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                الصور المحددة
              </h3>

              {selectedImages.length === 0 ? (
                <div className="text-center py-8">
                  <Circle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">لم تحدد أي صور بعد</p>
                  <p className="text-gray-500 text-xs mt-1">
                    انقر على الصور لتحديدها
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedImages.map((image) => (
                    <div
                      key={image.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-10 h-10 object-contain rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {image.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {image.source === "predefined"
                            ? "شعار جاهز"
                            : "صورة مرفوعة"}
                        </p>
                      </div>
                      <button
                        onClick={() => unselectImage(image.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length > 0 && (
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleNavigateToDesign}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#563660] text-white font-medium rounded-lg hover:bg-[#4b2e55] transition-colors"
                  >
                    استخدم في التصميم
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      selectedImages.forEach((image) =>
                        unselectImage(image.id)
                      );
                    }}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    مسح التحديد
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showSelectedSidebar && (
            <div className="fixed inset-y-0 right-0 w-4/5 sm:w-80 bg-white z-50 overflow-y-auto shadow-lg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900">
                    المحددة ({selectedImages.length})
                  </h3>
                  <button
                    onClick={() => setShowSelectedSidebar(false)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedImages.length === 0 ? (
                  <div className="text-center py-8">
                    <Circle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">لم تحدد أي صور بعد</p>
                    <p className="text-gray-500 text-xs mt-1">
                      انقر على الصور لتحديدها
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {selectedImages.map((image) => (
                        <div
                          key={image.id}
                          className="bg-gray-50 rounded-lg overflow-hidden"
                        >
                          <div className="aspect-square p-2">
                            <img
                              src={image.url}
                              alt={image.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="p-2 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-900 truncate mb-1">
                              {image.name}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {image.source === "predefined"
                                  ? "جاهز"
                                  : "مرفوعة"}
                              </p>
                              <button
                                onClick={() => unselectImage(image.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          handleNavigateToDesign();
                          setShowSelectedSidebar(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#563660] text-white font-medium rounded-lg hover:bg-[#4b2e55] transition-colors text-sm"
                      >
                        استخدم في التصميم
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          selectedImages.forEach((image) =>
                            unselectImage(image.id)
                          );
                        }}
                        className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        مسح التحديد
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        <ImageModal
          isOpen={imageModal.isOpen}
          shouldRender={imageModal.shouldRender}
          onClose={imageModal.closeModal}
          imageUrl={selectedImageForView}
          showDownload={true}
          showZoom={true}
        />

        <ConfirmationModal
          isOpen={deleteConfirmModal.isOpen}
          onClose={deleteConfirmModal.closeModal}
          onConfirm={confirmDeleteImage}
          title="تأكيد حذف الصورة"
          message={
            deletingStatus
              ? deletingStatus
              : "سيتم حذف هذه الصورة نهائياً من مكتبتك ومن الخادم (Cloudinary)، وسيتم إزالتها تلقائياً من أي تصميم يستخدمها حالياً. لا يمكن التراجع عن هذا الإجراء."
          }
          confirmText={isDeleting ? "جاري الحذف..." : "نعم، احذف"}
          cancelText="إلغاء"
          type="danger"
          isLoading={!!isDeleting}
        />

        {/* نافذة تأكيد حذف الصور المحددة */}
        <ConfirmationModal
          isOpen={deleteMultipleConfirmModal.isOpen}
          onClose={deleteMultipleConfirmModal.closeModal}
          onConfirm={handleDeleteSelectedImages}
          title="تأكيد حذف الصور المحددة"
          message={`سيتم حذف ${selectedUserImages.size} صورة من مكتبتك المحلية فقط (لن يتم حذفها من الخادم). سيتم إزالتها تلقائياً من أي تصميم يستخدمها حالياً.`}
          confirmText={`نعم، احذف ${selectedUserImages.size} صورة`}
          cancelText="إلغاء"
          type="warning"
          isLoading={isDeletingMultiple}
        />

        {/* نافذة تأكيد حذف جميع الصور */}
        <ConfirmationModal
          isOpen={deleteAllConfirmModal.isOpen}
          onClose={deleteAllConfirmModal.closeModal}
          onConfirm={handleDeleteAllUserImages}
          title="تأكيد حذف جميع الصور"
          message={`سيتم حذف جميع صورك (${userImages.length} صورة) من مكتبتك المحلية فقط (لن يتم حذفها من الخادم). سيتم إزالتها تلقائياً من أي تصميم يستخدمها حالياً.`}
          confirmText={`نعم، احذف جميع الصور (${userImages.length})`}
          cancelText="إلغاء"
          type="danger"
          isLoading={isDeletingMultiple}
        />
      </div>
    </div>
  );
};

export default ImageLibraryPage;
