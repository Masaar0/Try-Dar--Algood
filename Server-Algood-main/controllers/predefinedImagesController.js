import cloudinary from "../config/cloudinary.js";
import PredefinedImageSchema from "../models/schemas/PredefinedImageSchema.js";
import CategoryModel from "../models/Category.js";

// البيانات الافتراضية للشعارات الجاهزة - تم إزالة جميع الشعارات الافتراضية
const DEFAULT_PREDEFINED_IMAGES = [];

/**
 * تهيئة الشعارات الافتراضية - لا توجد شعارات افتراضية حالياً
 */
export const initializeDefaultImages = async () => {
  try {
    // لا توجد شعارات افتراضية للتهيئة حالياً
    console.log("لا توجد شعارات افتراضية للتهيئة");
  } catch (error) {
    throw new Error("فشل في تهيئة الشعارات الجاهزة");
  }
};

// الحصول على جميع الشعارات الجاهزة (عام - بدون مصادقة)
export const getPredefinedImages = async (req, res) => {
  try {
    const images = await PredefinedImageSchema.find()
      .sort({ createdAt: -1 })
      .lean();

    const cleanImages = images.map((img) => ({
      ...img,
      _id: undefined,
    }));

    res.status(200).json({
      success: true,
      message: "تم الحصول على الشعارات الجاهزة بنجاح",
      data: cleanImages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء الحصول على الشعارات الجاهزة",
      error: "GET_PREDEFINED_IMAGES_FAILED",
    });
  }
};

// إضافة شعار جاهز جديد (يتطلب مصادقة المدير)
export const addPredefinedImage = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بإضافة شعارات جاهزة",
        error: "INSUFFICIENT_PERMISSIONS",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "لم يتم العثور على ملف للرفع",
        error: "NO_FILE_PROVIDED",
      });
    }

    const { name, categoryId, description } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "اسم الشعار ومعرف التصنيف مطلوبان",
        error: "MISSING_REQUIRED_FIELDS",
      });
    }

    const category = await CategoryModel.getCategoryById(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "التصنيف المحدد غير موجود",
        error: "CATEGORY_NOT_FOUND",
      });
    }

    const fileStr = `data:${
      req.file.mimetype
    };base64,${req.file.buffer.toString("base64")}`;

    const uploadOptions = {
      folder: "dar-aljoud/predefined-logos",
      resource_type: "image",
      quality: "100",
      fetch_format: "auto",
      flags: "progressive:none",
      transformation: [
        {
          width: 1000,
          height: 1000,
          crop: "limit",
          quality: "100",
        },
      ],
    };

    const result = await cloudinary.uploader.upload(fileStr, uploadOptions);

    const newImage = new PredefinedImageSchema({
      id: `logo-${Date.now()}`,
      url: result.secure_url,
      publicId: result.public_id,
      name: name.trim(),
      categoryId: categoryId.trim(),
      description: description?.trim() || "شعار جاهز للاستخدام",
      updatedBy: req.admin?.username || "admin",
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    });

    const savedImage = await newImage.save();

    res.status(201).json({
      success: true,
      message: "تم إضافة الشعار الجاهز بنجاح",
      data: {
        ...savedImage.toObject(),
        _id: undefined,
      },
    });
  } catch (error) {
    if (error.http_code) {
      return res.status(error.http_code).json({
        success: false,
        message: "خطأ في خدمة رفع الصور",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إضافة الشعار الجاهز",
      error: "ADD_PREDEFINED_IMAGE_FAILED",
    });
  }
};

// حذف شعار جاهز (يتطلب مصادقة المدير)
export const deletePredefinedImage = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بحذف شعارات جاهزة",
        error: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const { imageId } = req.params;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: "معرف الشعار مطلوب",
        error: "IMAGE_ID_REQUIRED",
      });
    }

    const imageToDelete = await PredefinedImageSchema.findOne({ id: imageId });

    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الشعار",
        error: "IMAGE_NOT_FOUND",
      });
    }

    try {
      await cloudinary.uploader.destroy(imageToDelete.publicId);
    } catch (cloudinaryError) {}

    await PredefinedImageSchema.deleteOne({ id: imageId });

    res.status(200).json({
      success: true,
      message: "تم حذف الشعار الجاهز بنجاح",
      data: {
        imageId,
        deletedImage: {
          ...imageToDelete.toObject(),
          _id: undefined,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الشعار الجاهز",
      error: "DELETE_PREDEFINED_IMAGE_FAILED",
    });
  }
};

// تحديث معلومات شعار جاهز (يتطلب مصادقة المدير)
export const updatePredefinedImage = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بتحديث شعارات جاهزة",
        error: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const { imageId } = req.params;
    const { name, categoryId, description } = req.body;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: "معرف الشعار مطلوب",
        error: "IMAGE_ID_REQUIRED",
      });
    }

    const existingImage = await PredefinedImageSchema.findOne({ id: imageId });

    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الشعار",
        error: "IMAGE_NOT_FOUND",
      });
    }

    const updatedImage = await PredefinedImageSchema.findOneAndUpdate(
      { id: imageId },
      {
        ...(name && { name: name.trim() }),
        ...(categoryId && { categoryId: categoryId.trim() }),
        ...(description && { description: description.trim() }),
        updatedAt: new Date(),
        updatedBy: req.admin?.username || "admin",
      },
      { new: true, lean: true }
    );

    res.status(200).json({
      success: true,
      message: "تم تحديث الشعار الجاهز بنجاح",
      data: {
        ...updatedImage,
        _id: undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث الشعار الجاهز",
      error: "UPDATE_PREDEFINED_IMAGE_FAILED",
    });
  }
};

// إعادة تعيين الشعارات الجاهزة إلى القيم الافتراضية (يتطلب مصادقة المدير)
export const resetPredefinedImages = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بإعادة تعيين الشعارات الجاهزة",
        error: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // حذف جميع الشعارات الموجودة
    await PredefinedImageSchema.deleteMany({});

    // لا توجد شعارات افتراضية حالياً
    res.status(200).json({
      success: true,
      message:
        "تم حذف جميع الشعارات الجاهزة بنجاح - لا توجد شعارات افتراضية حالياً",
      data: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إعادة تعيين الشعارات الجاهزة",
      error: "RESET_PREDEFINED_IMAGES_FAILED",
    });
  }
};

// الحصول على الشعارات حسب التصنيف (عام - بدون مصادقة)
export const getPredefinedImagesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "معرف التصنيف مطلوب",
        error: "CATEGORY_ID_REQUIRED",
      });
    }

    const images = await PredefinedImageSchema.find({ categoryId })
      .sort({ createdAt: -1 })
      .lean();

    const cleanImages = images.map((img) => ({
      ...img,
      _id: undefined,
    }));

    res.status(200).json({
      success: true,
      message: "تم الحصول على الشعارات بنجاح",
      data: cleanImages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء الحصول على الشعارات",
      error: "GET_IMAGES_BY_CATEGORY_FAILED",
    });
  }
};
// الحصول على الشعارات مع معلومات التصنيفات (عام - بدون مصادقة)
export const getPredefinedImagesWithCategories = async (req, res) => {
  try {
    const images = await PredefinedImageSchema.find()
      .sort({ createdAt: -1 })
      .lean();
    const categories = await CategoryModel.getCategories();

    const imagesWithCategories = images.map((image) => {
      const category = categories.find((cat) => cat.id === image.categoryId);
      return {
        ...image,
        _id: undefined,
        category: category
          ? {
              id: category.id,
              name: category.name,
              color: category.color,
              icon: category.icon,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "تم الحصول على الشعارات مع التصنيفات بنجاح",
      data: {
        images: imagesWithCategories,
        categories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء الحصول على الشعارات",
      error: "GET_IMAGES_WITH_CATEGORIES_FAILED",
    });
  }
};
