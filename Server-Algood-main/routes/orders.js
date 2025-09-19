import express from "express";
import {
  createOrder,
  trackOrderByCode,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrder,
  addOrderNote,
  getOrderStats,
  deleteOrder,
  getOrderStatuses,
  getOrderImages,
  validateOrderImageSync,
  autoFixOrderImageSync,
  getOrderImagesReport,
  getAutoCleanupStats,
  manualCleanupExpiredOrders,
  controlAutoCleanupService,
} from "../controllers/orderController.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { generalRateLimit } from "../middleware/security.js";
import {
  validateOrderData,
  validateStatusUpdate,
  validateOrderUpdate,
  validateOrderSearch,
} from "../middleware/orderValidation.js";

const router = express.Router();

// المسارات العامة (بدون مصادقة)
router.post("/", generalRateLimit, validateOrderData, createOrder);
router.get("/track/:searchValue", validateOrderSearch, trackOrderByCode);
router.get("/statuses", getOrderStatuses);

// المسارات الإدارية (تتطلب مصادقة)
router.get("/", authenticateAdmin, getAllOrders);
router.get("/stats", authenticateAdmin, getOrderStats);
router.get("/:orderId", authenticateAdmin, getOrderById);
router.put(
  "/:orderId/status",
  authenticateAdmin,
  validateStatusUpdate,
  updateOrderStatus
);
router.put("/:orderId", authenticateAdmin, validateOrderUpdate, updateOrder);
router.post("/:orderId/notes", authenticateAdmin, addOrderNote);
router.delete("/:orderId", authenticateAdmin, deleteOrder); // حذف شامل مع جميع البيانات المرتبطة
router.get("/:orderId/images", authenticateAdmin, getOrderImages);

// مسارات إدارة مزامنة صور الطلبات
router.get(
  "/:orderId/images/validate",
  authenticateAdmin,
  validateOrderImageSync
);
router.post("/:orderId/images/fix", authenticateAdmin, autoFixOrderImageSync);
router.get("/images/report", authenticateAdmin, getOrderImagesReport);

// مسارات إدارة الحذف التلقائي للطلبات
router.get("/auto-cleanup/stats", authenticateAdmin, getAutoCleanupStats);
router.post(
  "/auto-cleanup/manual",
  authenticateAdmin,
  manualCleanupExpiredOrders
);
router.post(
  "/auto-cleanup/control",
  authenticateAdmin,
  controlAutoCleanupService
);

// معالج الأخطاء للمسارات
router.use((error, req, res, next) => {
  res.status(500).json({
    success: false,
    message: "حدث خطأ داخلي في نظام الطلبات",
    error: "ORDERS_INTERNAL_ERROR",
  });
});

export default router;
