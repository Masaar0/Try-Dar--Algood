import cloudinary from "../config/cloudinary.js";

// رفع صورة واحدة
export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "لم يتم العثور على ملف للرفع",
        error: "NO_FILE_PROVIDED",
      });
    }

    const fileStr = `data:${
      req.file.mimetype
    };base64,${req.file.buffer.toString("base64")}`;

    const uploadOptions = {
      folder: "dar-aljoud/logos",
      resource_type: "image",
      quality: "100", // جودة عالية 100%
      fetch_format: "auto",
      flags: "progressive:none",
      // إزالة التحويلات للحفاظ على الجودة الأصلية 100%
    };

    const result = await cloudinary.uploader.upload(fileStr, uploadOptions);

    res.status(200).json({
      success: true,
      message: "تم رفع الصورة بنجاح",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at,
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
      message: "حدث خطأ أثناء رفع الصورة",
      error: "UPLOAD_FAILED",
    });
  }
};

// رفع عدة صور
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "لم يتم العثور على ملفات للرفع",
        error: "NO_FILES_PROVIDED",
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileStr = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;

      const uploadOptions = {
        folder: "dar-aljoud/logos",
        resource_type: "image",
        quality: "100", // جودة عالية 100%
        fetch_format: "auto",
        flags: "progressive:none",
        // إزالة التحويلات للحفاظ على الجودة الأصلية 100%
      };

      const result = await cloudinary.uploader.upload(fileStr, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        originalName: file.originalname,
      };
    });

    const uploadResults = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: `تم رفع ${uploadResults.length} صورة بنجاح`,
      data: uploadResults,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء رفع الصور",
      error: "BATCH_UPLOAD_FAILED",
    });
  }
};

// حذف صورة من Cloudinary
export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "معرف الصورة مطلوب",
        error: "PUBLIC_ID_REQUIRED",
      });
    }

    console.log(`Attempting to delete image: ${publicId}`);

    // التحقق من وجود الصورة أولاً
    try {
      const imageInfo = await cloudinary.api.resource(publicId);
      console.log(`Image exists: ${publicId}`, {
        format: imageInfo.format,
        size: imageInfo.bytes,
        created: imageInfo.created_at,
      });
    } catch (checkError) {
      if (checkError.http_code === 404) {
        console.log(`Image not found: ${publicId}`);
        return res.status(404).json({
          success: false,
          message: "لم يتم العثور على الصورة في الخادم",
          error: "IMAGE_NOT_FOUND",
          data: { publicId, result: "not found" },
        });
      }
      // إذا كان خطأ آخر، نتابع مع الحذف
      console.log(`Error checking image existence: ${checkError.message}`);
    }

    const result = await cloudinary.uploader.destroy(publicId);

    console.log(`Cloudinary delete result for ${publicId}:`, result);

    if (result.result === "ok") {
      res.status(200).json({
        success: true,
        message: "تم حذف الصورة بنجاح",
        data: { publicId, result: result.result },
      });
    } else if (result.result === "not found") {
      res.status(404).json({
        success: false,
        message: "لم يتم العثور على الصورة في الخادم",
        error: "IMAGE_NOT_FOUND",
        data: { publicId, result: result.result },
      });
    } else {
      res.status(500).json({
        success: false,
        message: `فشل في حذف الصورة: ${result.result}`,
        error: "DELETE_FAILED",
        data: { publicId, result: result.result },
      });
    }
  } catch (error) {
    console.error(`Error deleting image ${req.params.publicId}:`, error);

    // تحديد نوع الخطأ وإرسال رسالة مناسبة
    let errorMessage = "حدث خطأ أثناء حذف الصورة";
    let errorCode = "DELETE_FAILED";
    let statusCode = 500;

    if (error.http_code === 404) {
      errorMessage = "لم يتم العثور على الصورة";
      errorCode = "IMAGE_NOT_FOUND";
      statusCode = 404;
    } else if (error.http_code === 401) {
      errorMessage = "خطأ في صلاحيات الوصول إلى خدمة الصور";
      errorCode = "AUTHENTICATION_ERROR";
      statusCode = 401;
    } else if (error.http_code === 403) {
      errorMessage = "غير مسموح بحذف هذه الصورة";
      errorCode = "FORBIDDEN";
      statusCode = 403;
    } else if (error.http_code >= 400 && error.http_code < 500) {
      errorMessage = `خطأ في الطلب: ${error.message}`;
      errorCode = "CLIENT_ERROR";
      statusCode = error.http_code;
    } else if (error.http_code >= 500) {
      errorMessage = `خطأ في الخادم: ${error.message}`;
      errorCode = "SERVER_ERROR";
      statusCode = error.http_code;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      details: {
        publicId: req.params.publicId,
        httpCode: error.http_code,
        originalMessage: error.message,
      },
    });
  }
};
// الحصول على معلومات صورة
export const getImageInfo = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "معرف الصورة مطلوب",
        error: "PUBLIC_ID_REQUIRED",
      });
    }

    const result = await cloudinary.api.resource(publicId);

    res.status(200).json({
      success: true,
      message: "تم الحصول على معلومات الصورة بنجاح",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at,
      },
    });
  } catch (error) {
    if (error.http_code === 404) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الصورة",
        error: "IMAGE_NOT_FOUND",
      });
    }

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء الحصول على معلومات الصورة",
      error: "GET_INFO_FAILED",
    });
  }
};
