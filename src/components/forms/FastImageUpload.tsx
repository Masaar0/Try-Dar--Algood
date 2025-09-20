import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  AlertCircle,
  FileImage,
  Loader2,
  Cloud,
  CheckCircle,
} from "lucide-react";
import imageUploadService, {
  CloudinaryImageData,
} from "../../services/imageUploadService";

interface FastImageUploadProps {
  onImageSelect: (imageData: CloudinaryImageData) => void;
  acceptedFormats?: string[];
  maxFileSize?: number; // بالميجابايت
  className?: string;
  placeholder?: string;
}

const FastImageUpload: React.FC<FastImageUploadProps> = ({
  onImageSelect,
  acceptedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  maxFileSize = 10,
  className = "",
  placeholder = "اسحب وأفلت الصورة هنا أو انقر للاختيار",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImage, setUploadedImage] =
    useState<CloudinaryImageData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // التحقق من صحة الملف
  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `نوع الملف غير مدعوم: ${file.name}`;
    }

    if (file.size > maxFileSize * 1024 * 1024) {
      return `حجم الملف كبير جداً: ${file.name}`;
    }

    return null;
  };

  // معالجة رفع الملفات مع الرفع الفوري
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      // رفع فوري مع إرجاع رابط مؤقت فوراً والرفع في الخلفية
      const { tempUrl: instantUrl, uploadPromise } =
        await imageUploadService.uploadWithInstantResponse(file);

      // إضافة الصورة فوراً باستخدام الرابط المؤقت
      const tempImageData = {
        url: instantUrl,
        publicId: `temp-${Date.now()}`,
        width: 0,
        height: 0,
        format: file.type.split("/")[1],
        size: file.size,
        createdAt: new Date().toISOString(),
      };

      // إضافة الصورة فوراً
      setUploadedImage(tempImageData);
      onImageSelect(tempImageData);

      // استبدال الرابط المؤقت بالرابط النهائي عند اكتمال الرفع
      uploadPromise
        .then((finalImageData) => {
          // تحديث الصورة بالرابط النهائي
          setUploadedImage(finalImageData);
          onImageSelect(finalImageData);

          // تنظيف الرابط المؤقت
          URL.revokeObjectURL(instantUrl);
        })
        .catch((error) => {
          console.error("Upload failed:", error);
          setError("فشل في رفع الصورة");
          // تنظيف الرابط المؤقت في حالة الفشل
          URL.revokeObjectURL(instantUrl);
        });
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error instanceof Error ? error.message : "حدث خطأ أثناء رفع الصورة"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // معالجة السحب والإفلات
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // معالجة اختيار الملف من المتصفح
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  };

  // فتح متصفح الملفات
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      {/* منطقة السحب والإفلات */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
          ${isUploading ? "pointer-events-none opacity-50" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* أيقونة الرفع */}
        <div className="flex justify-center mb-4">
          {isUploading ? (
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          ) : uploadedImage ? (
            <CheckCircle className="w-12 h-12 text-green-500" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400" />
          )}
        </div>

        {/* النص التوضيحي */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            {isUploading
              ? "جاري الرفع..."
              : uploadedImage
              ? "تم الرفع بنجاح!"
              : "رفع صورة سريع"}
          </p>

          <p className="text-sm text-gray-500">{placeholder}</p>

          {/* معلومات الملفات المقبولة */}
          <p className="text-xs text-gray-400">
            الأنواع المدعومة:{" "}
            {acceptedFormats.map((type) => type.split("/")[1]).join(", ")}
            <br />
            الحد الأقصى: {maxFileSize}MB
          </p>
        </div>

        {/* رسالة الخطأ */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* معاينة الصورة المرفوعة */}
        {uploadedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4"
          >
            <div className="relative inline-block">
              <img
                src={uploadedImage.url}
                alt="الصورة المرفوعة"
                className="w-32 h-32 object-cover rounded-lg border-2 border-green-200"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">تم رفع الصورة بنجاح!</p>
          </motion.div>
        )}
      </div>

      {/* إدخال الملف المخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default FastImageUpload;
