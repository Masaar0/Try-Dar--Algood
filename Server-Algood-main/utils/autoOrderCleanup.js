import OrderModel, { ORDER_STATUSES } from "../models/Order.js";
import OrderCleanupService from "./orderCleanupService.js";

/**
 * خدمة الحذف التلقائي للطلبات غير المؤكدة
 * - تعمل بشكل صامت بدون تسجيل في console
 * - فحص يومي واحد للطلبات غير المؤكدة (status: "pending") بعد 7 أيام
 * - تشمل حذف شامل لجميع البيانات المرتبطة بالطلب
 * - تقليل الحمل على النظام بفحص يومي بدلاً من كل ساعة
 */

class AutoOrderCleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
    this.checkIntervalHours = 24; // فحص كل 24 ساعة (يومياً)
    this.expirationDays = 7; // 7 أيام
    this.expirationMinutes = this.expirationDays * 24 * 60; // تحويل إلى دقائق
  }

  /**
   * بدء خدمة الحذف التلقائي
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // تشغيل الفحص الأول فوراً
    this.performCleanup();

    // جدولة الفحص الدوري يومياً
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.checkIntervalHours * 60 * 60 * 1000);
  }

  /**
   * إيقاف خدمة الحذف التلقائي
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * تنفيذ عملية الحذف التلقائي بشكل صامت (فحص يومي)
   * تحذف فقط الطلبات غير المؤكدة المنتهية الصلاحية
   */
  async performCleanup() {
    try {
      const expiredOrders = await this.findExpiredOrders();

      if (expiredOrders.length === 0) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const order of expiredOrders) {
        try {
          // التأكد من أن الطلب غير مؤكد فقط
          if (order.status !== ORDER_STATUSES.PENDING) {
            continue;
          }

          // حذف شامل للطلب وجميع البيانات المرتبطة
          await OrderCleanupService.performCompleteOrderDeletion(order);

          // حذف من قاعدة البيانات
          await OrderModel.deleteOrder(order.id);

          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
    } catch (error) {
      // معالجة صامتة للأخطاء
    }
  }

  /**
   * البحث عن الطلبات غير المؤكدة المنتهية الصلاحية فقط
   * (status: "pending" و createdAt قبل 7 أيام)
   */
  async findExpiredOrders() {
    try {
      const expirationTime = new Date(
        Date.now() - this.expirationMinutes * 60 * 1000
      );

      const expiredOrders = await OrderModel.OrderSchema.find({
        status: ORDER_STATUSES.PENDING,
        createdAt: { $lte: expirationTime },
      }).lean();

      return expiredOrders.map((order) => ({
        ...order,
        _id: undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * حساب عدد الدقائق المنقضية منذ إنشاء الطلب
   */
  calculateExpirationMinutes(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    return diffMinutes;
  }

  /**
   * الحصول على إحصائيات الحذف التلقائي
   */
  async getCleanupStats() {
    try {
      const expirationTime = new Date(
        Date.now() - this.expirationMinutes * 60 * 1000
      );

      const stats = await OrderModel.OrderSchema.aggregate([
        {
          $match: {
            status: ORDER_STATUSES.PENDING,
            createdAt: { $lte: expirationTime },
          },
        },
        {
          $group: {
            _id: null,
            totalExpiredOrders: { $sum: 1 },
            totalValue: { $sum: "$totalPrice" },
            oldestOrder: { $min: "$createdAt" },
            newestOrder: { $max: "$createdAt" },
          },
        },
      ]);

      const result = stats[0] || {
        totalExpiredOrders: 0,
        totalValue: 0,
        oldestOrder: null,
        newestOrder: null,
      };

      return {
        isRunning: this.isRunning,
        checkIntervalHours: this.checkIntervalHours,
        expirationDays: this.expirationDays,
        expirationMinutes: this.expirationMinutes,
        nextCleanupIn: this.isRunning ? this.checkIntervalHours : null,
        expiredOrdersCount: result.totalExpiredOrders,
        expiredOrdersValue: result.totalValue,
        oldestExpiredOrder: result.oldestOrder,
        newestExpiredOrder: result.newestOrder,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        isRunning: this.isRunning,
        error: error.message,
      };
    }
  }

  /**
   * تشغيل حذف يدوي للطلبات غير المؤكدة المنتهية الصلاحية فقط
   */
  async manualCleanup() {
    try {
      const expiredOrders = await this.findExpiredOrders();

      if (expiredOrders.length === 0) {
        return {
          success: true,
          message: "لا توجد طلبات منتهية الصلاحية للحذف",
          deletedCount: 0,
          errors: [],
        };
      }

      let successCount = 0;
      const errors = [];

      for (const order of expiredOrders) {
        try {
          // التأكد من أن الطلب غير مؤكد فقط
          if (order.status !== ORDER_STATUSES.PENDING) {
            continue;
          }

          await OrderCleanupService.performCompleteOrderDeletion(order);
          await OrderModel.deleteOrder(order.id);
          successCount++;
        } catch (error) {
          errors.push(
            `فشل في حذف الطلب ${order.orderNumber}: ${error.message}`
          );
        }
      }

      return {
        success: true,
        message: `تم حذف ${successCount} من ${expiredOrders.length} طلب`,
        deletedCount: successCount,
        totalFound: expiredOrders.length,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: `خطأ في الحذف اليدوي: ${error.message}`,
        deletedCount: 0,
        errors: [error.message],
      };
    }
  }
}

export default new AutoOrderCleanupService();
