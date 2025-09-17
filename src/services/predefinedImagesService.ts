import authService from "./authService";
import { CategoryData } from "./categoryService";

export interface PredefinedImageData {
  id: string;
  url: string;
  name: string;
  categoryId: string;
  description?: string;
  publicId: string;
  createdAt: string;
  updatedBy: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

export interface PredefinedImagesWithCategories {
  images: PredefinedImageData[];
  categories: CategoryData[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
class PredefinedImagesService {
  private baseUrl = "http://localhost:3001/api/predefined-images";

  /**
   * تحميل الشعارات الجاهزة من الباك إند
   */
  async loadPredefinedImages(): Promise<PredefinedImageData[]> {
    try {
      const response = await fetch(this.baseUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<PredefinedImageData[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "فشل في تحميل الشعارات الجاهزة");
      }

      return result.data;
    } catch (error) {
      console.error("Error loading predefined images:", error);
      throw error;
    }
  }

  /**
   * إضافة شعار جاهز جديد (يتطلب مصادقة المدير)
   */
  async addPredefinedImage(
    file: File,
    name: string,
    categoryId: string,
    description?: string
  ): Promise<PredefinedImageData> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("رمز المصادقة مطلوب");
      }

      const formData = new FormData();
      formData.append("image", file);
      formData.append("name", name);
      formData.append("categoryId", categoryId);
      if (description) {
        formData.append("description", description);
      }

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result: ApiResponse<PredefinedImageData> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "فشل في إضافة الشعار الجاهز");
      }

      return result.data;
    } catch (error) {
      console.error("Error adding predefined image:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إضافة الشعار الجاهز"
      );
    }
  }

  /**
   * حذف شعار جاهز (يتطلب مصادقة المدير)
   */
  async deletePredefinedImage(imageId: string): Promise<boolean> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("رمز المصادقة مطلوب");
      }

      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result: ApiResponse<{ imageId: string }> = await response.json();
      return result.success;
    } catch (error) {
      console.error("Error deleting predefined image:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حذف الشعار الجاهز"
      );
    }
  }

  /**
   * تحديث معلومات شعار جاهز (يتطلب مصادقة المدير)
   */
  async updatePredefinedImage(
    imageId: string,
    updates: { name?: string; categoryId?: string; description?: string }
  ): Promise<PredefinedImageData> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("رمز المصادقة مطلوب");
      }

      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result: ApiResponse<PredefinedImageData> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "فشل في تحديث الشعار الجاهز");
      }

      return result.data;
    } catch (error) {
      console.error("Error updating predefined image:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث الشعار الجاهز"
      );
    }
  }

  /**
   * إعادة تعيين الشعارات الجاهزة إلى القيم الافتراضية (يتطلب مصادقة المدير)
   */
  async resetPredefinedImages(): Promise<PredefinedImageData[]> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("رمز المصادقة مطلوب");
      }

      const response = await fetch(`${this.baseUrl}/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result: ApiResponse<PredefinedImageData[]> = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || "فشل في إعادة تعيين الشعارات الجاهزة"
        );
      }

      return result.data;
    } catch (error) {
      console.error("Error resetting predefined images:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إعادة تعيين الشعارات الجاهزة"
      );
    }
  }

  /**
   * الحصول على الشعارات مع معلومات التصنيفات
   */
  async loadPredefinedImagesWithCategories(): Promise<PredefinedImagesWithCategories> {
    try {
      const response = await fetch(`${this.baseUrl}/with-categories`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<PredefinedImagesWithCategories> =
        await response.json();

      if (!result.success) {
        throw new Error(result.message || "فشل في تحميل الشعارات مع التصنيفات");
      }

      return result.data;
    } catch (error) {
      console.error("Error loading images with categories:", error);
      throw error;
    }
  }

  /**
   * الحصول على الشعارات حسب التصنيف
   */
  async getPredefinedImagesByCategory(
    categoryId: string
  ): Promise<PredefinedImageData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/category/${categoryId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<PredefinedImageData[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "فشل في تحميل الشعارات");
      }

      return result.data;
    } catch (error) {
      console.error("Error loading images by category:", error);
      throw error;
    }
  }

  /**
   * التحقق من حالة الاتصال مع الباك إند
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl.replace("/predefined-images", "/info")}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const predefinedImagesService = new PredefinedImagesService();
export default predefinedImagesService;
