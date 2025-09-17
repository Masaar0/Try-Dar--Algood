/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  User,
  Phone,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Loader2,
  RefreshCw,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  LinkIcon,
  Copy,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import orderService, {
  OrderData,
  OrderStats,
} from "../../services/orderService";
import temporaryLinkService from "../../services/temporaryLinkService";
import authService from "../../services/authService";
import ConfirmationModal from "../ui/ConfirmationModal";
import Modal from "../ui/Modal";
import { useModal } from "../../hooks/useModal";
import { useOrdersCache } from "../../hooks/useOrdersCache";

const OrdersManagement: React.FC = () => {
  const navigate = useNavigate();
  const {
    getFromCache,
    setCache,
    invalidateCache,
    isLoading: cacheLoading,
  } = useOrdersCache();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [pendingOrders, setPendingOrders] = useState<OrderData[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPendingOrders, setTotalPendingOrders] = useState(0);
  const [ordersPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<OrderData | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  // ✨ إضافة حالة جديدة لإظهار/إخفاء الفلاتر
  const [showFilters, setShowFilters] = useState(false);

  const [activeTab, setActiveTab] = useState<"confirmed" | "pending">(
    "confirmed"
  );
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [isCreatingLink, setIsCreatingLink] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [modalCopied, setModalCopied] = useState(false);
  const [linkCache, setLinkCache] = useState<
    Map<string, { link: string; timestamp: number }>
  >(new Map());
  const [hasActiveSearch, setHasActiveSearch] = useState(false);

  useEffect(() => {
    // حل مشكلة التمرير على الهواتف
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // إعادة تعيين أي قيود على التمرير
      document.body.style.overflow = "auto";
      document.body.style.overscrollBehavior = "auto";
      document.body.style.touchAction = "auto";
      document.documentElement.style.overflow = "auto";
      document.documentElement.style.overscrollBehavior = "auto";

      // إزالة أي position: fixed قد يتداخل مع التمرير
      const fixedElements = document.querySelectorAll(
        '[style*="position: fixed"]'
      );
      fixedElements.forEach((el) => {
        const htmlElement = el as HTMLElement;
        if (
          !htmlElement.classList.contains("modal-portal") &&
          !htmlElement.classList.contains("pdf-loading-overlay")
        ) {
          htmlElement.style.position = "";
        }
      });

      // التأكد من أن container الرئيسي يدعم التمرير
      const mainContainer = document.querySelector(".space-y-6") as HTMLElement;
      if (mainContainer) {
        mainContainer.style.minHeight = "auto";
        mainContainer.style.height = "auto";
        mainContainer.style.overflow = "visible";
      }

      // إجبار إعادة حساب التمرير
      const forceScrollRecalculation = () => {
        window.scrollTo(0, 0);
        setTimeout(() => {
          window.scrollTo(0, 1);
          setTimeout(() => {
            window.scrollTo(0, 0);
          }, 50);
        }, 50);
      };

      forceScrollRecalculation();
    }

    return () => {
      // تنظيف عند إلغاء التحميل
      if (isMobile) {
        document.body.style.overflow = "";
        document.body.style.overscrollBehavior = "";
        document.body.style.touchAction = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.overscrollBehavior = "";
      }
    };
  }, []);

  // إضافة useEffect للتعامل مع تغيير التبويبات
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // عند تغيير التبويب، تأكد من إعادة تفعيل التمرير
      setTimeout(() => {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";

        // إجبار إعادة حساب التمرير
        window.scrollTo(0, window.scrollY);
      }, 100);
    }
  }, [activeTab]);

  // إضافة CSS للتأكد من التمرير السليم
  useEffect(() => {
    const mobileScrollStyles = `
    @media (max-width: 768px) {
      body {
        overflow: auto !important;
        overscroll-behavior: auto !important;
        touch-action: auto !important;
        position: static !important;
        height: auto !important;
        min-height: 100vh !important;
      }
      
      html {
        overflow: auto !important;
        overscroll-behavior: auto !important;
      }
      
      .space-y-6 {
        overflow: visible !important;
        height: auto !important;
        min-height: auto !important;
      }
      
      .mobile-scroll-container {
        overflow: visible !important;
        height: auto !important;
        min-height: auto !important;
      }
      
      /* تمكين التمرير الأفقي للجدول في الهواتف فقط */
      .overflow-x-auto {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: thin !important;
      }
      
      .overflow-x-auto::-webkit-scrollbar {
        height: 6px !important;
      }
      
      .overflow-x-auto::-webkit-scrollbar-track {
        background: #f1f5f9 !important;
        border-radius: 3px !important;
      }
      
      .overflow-x-auto::-webkit-scrollbar-thumb {
        background: #cbd5e1 !important;
        border-radius: 3px !important;
      }
      
      .overflow-x-auto::-webkit-scrollbar-thumb:hover {
        background: #94a3b8 !important;
      }
      
      /* تحسينات للتنقل بين الصفحات في الهواتف */
      .max-w-\\[200px\\] {
        max-width: 200px !important;
      }
      
      /* تحسين أزرار التنقل في الهواتف */
      .min-w-\\[32px\\] {
        min-width: 32px !important;
      }
      
      /* تحسين المسافات في الهواتف */
      .gap-1 {
        gap: 0.25rem !important;
      }
      
      .gap-3 {
        gap: 0.75rem !important;
      }
      
      /* منع ظهور شريط التمرير في أي مكان آخر */
      .overflow-y-auto {
        overflow-y: visible !important;
      }
      
      .max-h-\\[70vh\\] {
        max-height: none !important;
      }
      
      .max-h-\\[80vh\\] {
        max-height: none !important;
      }
      
      .max-h-24 {
        max-height: none !important;
      }
      
      .max-h-32 {
        max-height: none !important;
      }
      
      /* إصلاح مشكلة التمرير في المودالز */
      .modal-content {
        max-height: 90vh !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
    }
    `;

    const style = document.createElement("style");
    style.textContent = mobileScrollStyles;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []); // إزالة dependency لتجنب warning

  const orderDetailsModal = useModal();
  const deleteOrderModal = useModal();
  const updateStatusModal = useModal();
  const confirmOrderModal = useModal();
  const linkModal = useModal();

  const orderStatuses = [
    { value: "pending", name: "قيد المراجعة", color: "text-amber-600" },
    { value: "confirmed", name: "تم التأكيد", color: "text-blue-600" },
    { value: "in_production", name: "قيد التنفيذ", color: "text-purple-600" },
    { value: "quality_check", name: "فحص الجودة", color: "text-cyan-600" },
    { value: "ready_to_ship", name: "جاهز للشحن", color: "text-emerald-600" },
    { value: "shipped", name: "تم الشحن", color: "text-green-600" },
    { value: "delivered", name: "تم التسليم", color: "text-green-700" },
    { value: "cancelled", name: "ملغي", color: "text-red-600" },
    { value: "returned", name: "مُرجع", color: "text-orange-600" },
  ];

  const copyToClipboard = async (text: string, orderId: string) => {
    try {
      // تجربة API الجديد أولاً
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // استخدام الطريقة التقليدية للهواتف
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
        } catch {
          throw new Error("فشل في النسخ");
        } finally {
          document.body.removeChild(textArea);
        }
      }

      // إذا كان النسخ من النافذة (orderId فارغ)، حدث حالة النافذة فقط
      if (!orderId) {
        setModalCopied(true);
        setTimeout(() => setModalCopied(false), 3000);
        // لا نعرض رسالة نجاح عامة للنافذة
      } else {
        setCopiedLinks((prev) => new Set(prev).add(orderId));
        setTimeout(() => {
          setCopiedLinks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(orderId);
            return newSet;
          });
        }, 3000);

        // رسالة النجاح فقط للنسخ من الجدول
        setSaveMessage("تم نسخ الرابط المؤقت بنجاح");
        setTimeout(() => setSaveMessage(""), 3000);
      }

      return true;
    } catch (error) {
      console.error("فشل في نسخ النص:", error);
      return false;
    }
  };

  const handleCreateTemporaryLink = async (orderId: string) => {
    setIsCreatingLink(orderId);
    setModalCopied(false); // إعادة تعيين حالة النسخ في النافذة
    setError(""); // مسح أي أخطاء سابقة

    try {
      // تحسين الأداء: التحقق من الـ cache أولاً
      const cached = linkCache.get(orderId);
      const now = Date.now();
      const cacheExpiry = 5 * 60 * 1000; // 5 دقائق

      if (cached && now - cached.timestamp < cacheExpiry) {
        setGeneratedLink(cached.link);
        const copied = await copyToClipboard(cached.link, orderId);
        if (!copied) {
          linkModal.openModal();
        }
        setIsCreatingLink(null);
        return;
      }

      const token = authService.getToken();
      if (!token) throw new Error("رمز المصادقة غير موجود");

      // تحسين الأداء: إضافة timeout للطلب لتجنب الانتظار الطويل
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثواني timeout

      const linkData = await temporaryLinkService.createTemporaryLink(
        orderId,
        1, // ساعة واحدة افتراضياً
        token,
        controller.signal // تمرير إشارة الإلغاء
      );

      clearTimeout(timeoutId);
      setGeneratedLink(linkData.fullUrl);

      // تحسين الأداء: حفظ الرابط في الـ cache
      setLinkCache((prev) =>
        new Map(prev).set(orderId, {
          link: linkData.fullUrl,
          timestamp: now,
        })
      );

      // تحسين تجربة المستخدم: محاولة النسخ التلقائي مع معالجة أفضل للأخطاء
      try {
        const copied = await copyToClipboard(linkData.fullUrl, orderId);
        if (!copied) {
          // إذا فشلت النسخ التلقائية، اعرض المودال
          linkModal.openModal();
        }
      } catch (copyError) {
        console.warn("Failed to copy to clipboard:", copyError);
        // اعرض المودال حتى لو فشلت النسخ
        linkModal.openModal();
      }
    } catch (error) {
      console.error("Error creating temporary link:", error);

      // تحسين رسائل الخطأ
      let errorMessage = "فشل في إنشاء الرابط المؤقت";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.";
        } else if (error.message.includes("رمز المصادقة")) {
          errorMessage = "انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsCreatingLink(null);
    }
  };

  const loadOrders = useCallback(
    async (
      forceRefresh = false,
      customSearchTerm = searchTerm,
      customStatusFilter = statusFilter
    ) => {
      setIsLoading(true);
      setError("");

      try {
        const token = authService.getToken();
        if (!token) throw new Error("رمز المصادقة غير موجود");

        // التحقق من الكاش أولاً
        if (!forceRefresh) {
          const cached = getFromCache(
            currentPage,
            ordersPerPage,
            customStatusFilter,
            customSearchTerm,
            false
          );

          if (cached) {
            setOrders(cached.data);
            setTotalPages(cached.pagination.totalPages);
            setTotalOrders(cached.pagination.totalOrders);
            setIsLoading(false);
            return;
          }
        }

        const result = await orderService.getAllOrders(token, {
          page: currentPage,
          limit: ordersPerPage,
          search: customSearchTerm,
          status: customStatusFilter,
          includePending: false,
        });

        setOrders(result.orders);
        setTotalPages(result.pagination.totalPages);
        setTotalOrders(result.pagination.totalOrders);

        // حفظ في الكاش
        setCache(
          currentPage,
          ordersPerPage,
          customStatusFilter,
          customSearchTerm,
          false,
          result.orders,
          result.pagination
        );
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "فشل في تحميل الطلبات"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      ordersPerPage,
      statusFilter,
      searchTerm,
      getFromCache,
      setCache,
    ]
  );

  const loadPendingOrders = useCallback(
    async (forceRefresh = false, customSearchTerm = searchTerm) => {
      setIsLoadingPending(true);
      setError("");

      try {
        const token = authService.getToken();
        if (!token) throw new Error("رمز المصادقة غير موجود");

        // التحقق من الكاش أولاً
        if (!forceRefresh) {
          const cached = getFromCache(
            pendingCurrentPage,
            ordersPerPage,
            "pending",
            customSearchTerm,
            true
          );

          if (cached) {
            setPendingOrders(cached.data);
            setPendingTotalPages(cached.pagination.totalPages);
            setTotalPendingOrders(cached.pagination.totalOrders);
            setIsLoadingPending(false);
            return;
          }
        }

        const result = await orderService.getAllOrders(token, {
          page: pendingCurrentPage,
          limit: ordersPerPage,
          search: customSearchTerm,
          status: "pending",
          includePending: true,
        });

        setPendingOrders(result.orders);
        setPendingTotalPages(result.pagination.totalPages);
        setTotalPendingOrders(result.pagination.totalOrders);

        // حفظ في الكاش
        setCache(
          pendingCurrentPage,
          ordersPerPage,
          "pending",
          customSearchTerm,
          true,
          result.orders,
          result.pagination
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "فشل في تحميل الطلبات قيد المراجعة"
        );
      } finally {
        setIsLoadingPending(false);
      }
    },
    [pendingCurrentPage, ordersPerPage, searchTerm, getFromCache, setCache]
  );

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const token = authService.getToken();
      if (!token) return;

      const statsData = await orderService.getOrderStats(token);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // دالة لتحديث الأعداد في الوقت الفعلي
  const updateOrderCounts = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      // تحديث عدد الطلبات المؤكدة
      const confirmedResult = await orderService.getAllOrders(token, {
        page: 1,
        limit: 1,
        status: "",
        includePending: false,
      });
      setTotalOrders(confirmedResult.pagination.totalOrders);

      // تحديث عدد الطلبات قيد المراجعة
      const pendingResult = await orderService.getAllOrders(token, {
        page: 1,
        limit: 1,
        status: "pending",
        includePending: true,
      });
      setTotalPendingOrders(pendingResult.pagination.totalOrders);
    } catch (error) {
      console.error("Error updating order counts:", error);
    }
  };

  // دالة لتحديث كل البيانات بعد أي تغيير مع مسح الكاش
  const refreshAllData = useCallback(async () => {
    // مسح الكاش قبل التحديث
    invalidateCache();

    await Promise.all([
      loadOrders(true), // تحديث الطلبات المؤكدة مع إجبار التحديث
      loadPendingOrders(true), // تحديث الطلبات قيد المراجعة مع إجبار التحديث
      loadStats(), // تحديث الإحصائيات
      updateOrderCounts(), // تحديث الأعداد
    ]);
  }, [loadOrders, loadPendingOrders, invalidateCache]);

  // Initial load - load both confirmed and pending orders
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadOrders(), // Load confirmed orders
        loadPendingOrders(), // Load pending orders
        loadStats(), // Load statistics
      ]);
    };

    initializeData();
  }, []); // Load once on component mount

  // Reload data when page changes (with cache)
  useEffect(() => {
    if (activeTab === "confirmed") {
      loadOrders();
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingOrders();
    }
  }, [pendingCurrentPage]);

  const handleTabSwitch = (tab: "confirmed" | "pending") => {
    setActiveTab(tab);

    // إصلاح التمرير على الهواتف عند تغيير التبويب
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setTimeout(() => {
        document.body.style.overflow = "auto";
        document.body.style.position = "";
        document.body.style.height = "";
        document.documentElement.style.overflow = "auto";

        // إجبار إعادة حساب layout
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  };

  // البحث اليدوي عند الضغط على Enter أو تغيير الفلترة
  const handleSearch = useCallback(() => {
    // تجاهل البحث إذا كان النص فارغاً أو يحتوي على مسافات فقط
    if (searchTerm.trim() === "") {
      return;
    }

    // تحديد أن هناك بحث نشط
    setHasActiveSearch(true);

    // استخدام النص المقطوع من المسافات للبحث
    const trimmedSearchTerm = searchTerm.trim();

    if (activeTab === "confirmed") {
      setCurrentPage(1);
      loadOrders(true, trimmedSearchTerm, statusFilter); // إجبار التحديث للبحث الجديد
    } else {
      setPendingCurrentPage(1);
      loadPendingOrders(true, trimmedSearchTerm); // إجبار التحديث للبحث الجديد
    }
  }, [activeTab, searchTerm, statusFilter, loadOrders, loadPendingOrders]);

  // إلغاء الفلترة والبحث وإعادة البيانات للحالة الطبيعية
  const handleClearFilters = useCallback(() => {
    // مسح الفلاتر
    setSearchTerm("");
    setStatusFilter("");
    setHasActiveSearch(false); // إعادة تعيين حالة البحث النشط

    // إعادة تحميل البيانات بدون فلترة
    if (activeTab === "confirmed") {
      setCurrentPage(1);
      // تحميل البيانات بدون فلترة - تمرير قيم فارغة صراحة
      loadOrders(true, "", "");
    } else {
      setPendingCurrentPage(1);
      // تحميل البيانات بدون فلترة - تمرير قيمة فارغة صراحة
      loadPendingOrders(true, "");
    }
  }, [activeTab, loadOrders, loadPendingOrders]);

  // مسح البحث والفلترة عند تغيير التبويب
  useEffect(() => {
    setSearchTerm("");
    setHasActiveSearch(false); // إعادة تعيين حالة البحث النشط
    setShowFilters(false); // إخفاء الفلاتر عند التبديل
  }, [activeTab]);

  // إلغاء البحث التلقائي عند مسح كل شيء من حقل البحث
  useEffect(() => {
    // إذا كان حقل البحث فارغاً أو يحتوي على مسافات فقط وكان هناك بحث نشط مسبقاً
    if (searchTerm.trim() === "" && hasActiveSearch) {
      // إعادة تعيين حالة البحث النشط
      setHasActiveSearch(false);

      // إعادة تحميل البيانات بدون فلترة
      if (activeTab === "confirmed") {
        setCurrentPage(1);
        loadOrders(true, "", "");
      } else {
        setPendingCurrentPage(1);
        loadPendingOrders(true, "");
      }
    }
  }, [searchTerm, hasActiveSearch, activeTab, loadOrders, loadPendingOrders]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (activeTab === "confirmed" && page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      } else if (
        activeTab === "pending" &&
        page >= 1 &&
        page <= pendingTotalPages
      ) {
        setPendingCurrentPage(page);
      }
    },
    [activeTab, totalPages, pendingTotalPages]
  );

  const handleStatusFilterChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      if (activeTab === "confirmed") {
        setCurrentPage(1);
        loadOrders(true); // إجبار التحديث للتصفية الجديدة
      } else {
        setPendingCurrentPage(1);
        loadPendingOrders(true); // إجبار التحديث للتصفية الجديدة
      }
    },
    [activeTab, loadOrders, loadPendingOrders]
  );

  const handleViewOrder = (order: OrderData) => {
    setSelectedOrder(order);
    orderDetailsModal.openModal();
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    setIsConfirmingOrder(true); // استخدام نفس حالة التأكيد
    try {
      const token = authService.getToken();
      if (!token) throw new Error("رمز المصادقة غير موجود");

      await orderService.deleteOrder(orderToDelete.id, token);

      // تحديث فوري للأعداد
      if (orderToDelete.status === "pending") {
        setTotalPendingOrders((prev) => prev - 1);
      } else {
        setTotalOrders((prev) => prev - 1);
      }

      // تحديث كل البيانات
      await refreshAllData();

      deleteOrderModal.closeModal();
      setOrderToDelete(null);
      setSaveMessage("تم حذف الطلب بنجاح");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "فشل في حذف الطلب");
    } finally {
      setIsConfirmingOrder(false); // إعادة تعيين حالة التأكيد
    }
  };

  const handleConfirmOrder = async () => {
    if (!orderToConfirm) return;

    setIsConfirmingOrder(true);
    try {
      const token = authService.getToken();
      if (!token) throw new Error("رمز المصادقة غير موجود");

      await orderService.updateOrderStatus(
        orderToConfirm.id,
        "confirmed",
        "تم تأكيد الطلب",
        token
      );

      // تحديث فوري للأعداد
      setTotalPendingOrders((prev) => prev - 1); // تقليل عدد الطلبات قيد المراجعة
      setTotalOrders((prev) => prev + 1); // زيادة عدد الطلبات المؤكدة

      // تحديث كل البيانات
      await refreshAllData();

      confirmOrderModal.closeModal();
      setOrderToConfirm(null);
      setSaveMessage("تم تأكيد الطلب بنجاح");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "فشل في تأكيد الطلب");
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    setIsUpdatingStatus(true);
    try {
      const token = authService.getToken();
      if (!token) throw new Error("رمز المصادقة غير موجود");

      const updatedOrder = await orderService.updateOrderStatus(
        selectedOrder.id,
        newStatus,
        statusNote,
        token
      );

      // تحديث فوري للأعداد إذا تم النقل من pending إلى confirmed
      if (selectedOrder.status === "pending" && newStatus === "confirmed") {
        setTotalPendingOrders((prev) => prev - 1); // تقليل عدد الطلبات قيد المراجعة
        setTotalOrders((prev) => prev + 1); // زيادة عدد الطلبات المؤكدة
      }

      setSelectedOrder(updatedOrder);

      // تحديث كل البيانات
      await refreshAllData();

      updateStatusModal.closeModal();
      setNewStatus("");
      setStatusNote("");
      setSaveMessage("تم تحديث حالة الطلب بنجاح");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "فشل في تحديث حالة الطلب"
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    const statusObj = orderStatuses.find((s) => s.value === status);
    return statusObj?.color || "text-gray-600";
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      pending: <Clock className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      in_production: <Package className="w-4 h-4" />,
      quality_check: <CheckCircle className="w-4 h-4" />,
      ready_to_ship: <Package className="w-4 h-4" />,
      shipped: <Truck className="w-4 h-4" />,
      delivered: <CheckCircle className="w-4 h-4" />,
      cancelled: <AlertCircle className="w-4 h-4" />,
      returned: <Package className="w-4 h-4" />,
    };
    return icons[status] || <Package className="w-4 h-4" />;
  };

  // مكون التنقل بين الصفحات المتجاوب
  const PaginationComponent = ({
    currentPageProp,
    totalPagesProp,
    totalOrdersProp,
    onPageChange,
  }: {
    currentPageProp: number;
    totalPagesProp: number;
    totalOrdersProp: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPagesProp <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = window.innerWidth <= 768 ? 3 : 5; // عدد أقل في الهواتف

      if (totalPagesProp <= maxVisiblePages) {
        for (let i = 1; i <= totalPagesProp; i++) {
          pages.push(i);
        }
      } else {
        if (currentPageProp <= 2) {
          for (let i = 1; i <= 3; i++) {
            pages.push(i);
          }
          pages.push("...");
          pages.push(totalPagesProp);
        } else if (currentPageProp >= totalPagesProp - 1) {
          pages.push(1);
          pages.push("...");
          for (let i = totalPagesProp - 2; i <= totalPagesProp; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push("...");
          for (let i = currentPageProp - 1; i <= currentPageProp + 1; i++) {
            pages.push(i);
          }
          pages.push("...");
          pages.push(totalPagesProp);
        }
      }

      return pages;
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        {/* معلومات الصفحات - متجاوبة */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
          <span className="hidden sm:inline">
            عرض {(currentPageProp - 1) * ordersPerPage + 1} إلى{" "}
            {Math.min(currentPageProp * ordersPerPage, totalOrdersProp)} من{" "}
            {totalOrdersProp} طلب
          </span>
          <span className="sm:hidden">
            صفحة {currentPageProp} من {totalPagesProp}
          </span>
        </div>

        {/* أزرار التنقل - متجاوبة */}
        <div className="flex items-center gap-1 order-1 sm:order-2">
          {/* أزرار التنقل السريع - مخفية في الهواتف */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPageProp === 1}
            className="hidden sm:flex p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="الصفحة الأولى"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* زر الصفحة السابقة */}
          <button
            onClick={() => onPageChange(currentPageProp - 1)}
            disabled={currentPageProp === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden sm:inline">السابق</span>
          </button>

          {/* أرقام الصفحات */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="px-2 py-2 text-gray-500 text-sm">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(page as number)}
                    className={`px-2 sm:px-3 py-2 rounded-lg border transition-colors text-sm min-w-[32px] sm:min-w-[40px] ${
                      currentPageProp === page
                        ? "bg-[#563660] text-white border-[#563660]"
                        : "border-gray-300 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* زر الصفحة التالية */}
          <button
            onClick={() => onPageChange(currentPageProp + 1)}
            disabled={currentPageProp === totalPagesProp}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            title="الصفحة التالية"
          >
            <span className="hidden sm:inline">التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* أزرار التنقل السريع - مخفية في الهواتف */}
          <button
            onClick={() => onPageChange(totalPagesProp)}
            disabled={currentPageProp === totalPagesProp}
            className="hidden sm:flex p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="الصفحة الأخيرة"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6 mobile-scroll-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#563660]" />
            إدارة الطلبات
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            عرض وإدارة جميع طلبات العملاء
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refreshAllData}
            disabled={isLoading || isLoadingPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 text-sm"
          >
            {isLoading || isLoadingPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            تحديث شامل
          </button>

          {/* مؤشر الكاش */}
          {cacheLoading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              جاري التحميل من الكاش...
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-green-700 font-medium text-sm">
              {saveMessage}
            </span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-red-700 font-medium text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistics - متجاوبة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 sm:p-4 text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                الطلبات المؤكدة
              </p>
              <motion.p
                className="text-lg sm:text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoadingStats ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {totalOrders}
              </motion.p>
            </div>
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200 flex-shrink-0" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-3 sm:p-4 text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-amber-100 text-xs sm:text-sm truncate">
                قيد المراجعة
              </p>
              <motion.p
                className="text-lg sm:text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoadingStats ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {stats?.pendingReview?.total || totalPendingOrders}
              </motion.p>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-200 flex-shrink-0" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 sm:p-4 text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-green-100 text-xs sm:text-sm truncate">
                الإيرادات
              </p>
              <motion.p
                className="text-sm sm:text-xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoadingStats ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {stats?.totalRevenue
                  ? formatPrice(stats.totalRevenue)
                  : "0.00 ر.س"}
              </motion.p>
            </div>
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-200 flex-shrink-0" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-3 sm:p-4 text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-purple-100 text-xs sm:text-sm truncate">
                قيد التنفيذ
              </p>
              <motion.p
                className="text-lg sm:text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoadingStats ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {stats?.inProduction || 0}
              </motion.p>
            </div>
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200 flex-shrink-0" />
          </div>
        </motion.div>
      </div>

      {/* Order Tabs - متجاوبة */}
      <div className="bg-white rounded-lg border border-gray-200 p-1">
        <div className="flex flex-col sm:flex-row gap-1">
          <button
            onClick={() => handleTabSwitch("confirmed")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-all text-sm flex-1 sm:flex-none ${
              activeTab === "confirmed"
                ? "bg-[#563660] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">الطلبات المؤكدة</span>
              <span className="sm:hidden">مؤكدة</span>
            </span>
            <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">
              {totalOrders}
            </span>
          </button>
          <button
            onClick={() => handleTabSwitch("pending")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-all text-sm flex-1 sm:flex-none ${
              activeTab === "pending"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">قيد المراجعة</span>
              <span className="sm:hidden">مراجعة</span>
            </span>
            <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">
              {totalPendingOrders}
            </span>
          </button>
        </div>
      </div>

      {/* Search and Filter Tools - متجاوبة */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        {/* شريط البحث وزر الفلترة */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ابحث برقم الطلب، رمز التتبع، اسم العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    setSearchTerm(searchTerm.trim());
                    handleSearch();
                  }
                }}
                className="w-full pr-10 pl-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#563660] focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* زر البحث */}
            <button
              onClick={handleSearch}
              disabled={isLoading || isLoadingPending}
              className="flex items-center justify-center gap-1 px-3 py-2.5 sm:px-4 sm:py-2 bg-[#563660] text-white font-medium rounded-lg hover:bg-[#4b2e55] transition-all duration-200 disabled:opacity-50 text-sm flex-shrink-0"
              title="بحث"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">بحث</span>
            </button>
            {/* زر إظهار الفلاتر - يظهر فقط في الطلبات المؤكدة */}
            {activeTab === "confirmed" && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-1 px-3 py-2.5 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm flex-shrink-0"
                title="خيارات الفلترة"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">فلترة</span>
              </button>
            )}
            {/* زر إلغاء الفلترة - يظهر فقط عند وجود بحث أو فلترة نشطة */}
            {(searchTerm.trim() || statusFilter) && (
              <button
                onClick={handleClearFilters}
                disabled={isLoading || isLoadingPending}
                className="flex items-center justify-center gap-1 px-3 py-2.5 sm:px-4 sm:py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 text-sm flex-shrink-0"
                title="إلغاء البحث والفلترة"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">إلغاء</span>
              </button>
            )}
          </div>
        </div>

        {/* ✨ قائمة الفلاتر المتحركة */}
        <AnimatePresence>
          {showFilters && activeTab === "confirmed" && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="mt-4 overflow-hidden"
            >
              <div className="relative p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#563660]" />
                  تصفية حسب الحالة
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  <button
                    onClick={() => handleStatusFilterChange("")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm whitespace-nowrap ${
                      statusFilter === ""
                        ? "bg-[#563660] text-white shadow-sm"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    جميع الحالات
                  </button>
                  {orderStatuses
                    .filter((status) => status.value !== "pending")
                    .map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusFilterChange(status.value)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm whitespace-nowrap ${
                          statusFilter === status.value
                            ? "bg-[#563660] text-white shadow-sm"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {status.value === "confirmed" && "✅ "}
                        {status.value === "in_production" && "⚙️ "}
                        {status.value === "quality_check" && "🔍 "}
                        {status.value === "ready_to_ship" && "📦 "}
                        {status.value === "shipped" && "🚚 "}
                        {status.value === "delivered" && "✔️ "}
                        {status.value === "cancelled" && "❌ "}
                        {status.value === "returned" && "🔄 "}
                        {status.name}
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-red-700 font-medium text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orders List */}
      {isLoading || isLoadingPending ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#563660] mx-auto mb-4" />
            <p className="text-gray-600 text-sm">
              جاري تحميل{" "}
              {activeTab === "confirmed"
                ? "الطلبات المؤكدة"
                : "الطلبات قيد المراجعة"}
              ...
            </p>
          </div>
        </div>
      ) : (activeTab === "confirmed" ? orders : pendingOrders).length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden space-y-0">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-700">
                  {activeTab === "confirmed"
                    ? `الطلبات المؤكدة (${totalOrders})`
                    : ` قيد المراجعة (${totalPendingOrders})`}
                </h3>
              </div>
              {activeTab === "pending" && (
                <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
                  لا تُحتسب في الإيرادات
                </div>
              )}
            </div>
          </div>
          {/* Container مع التمرير الأفقي للهواتف فقط */}
          <div className="overflow-x-auto md:overflow-x-visible -mx-4 md:mx-0 px-4 md:px-0">
            <table className="w-full min-w-[800px] md:min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {activeTab === "pending" && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      تأكيد
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    رقم الطلب
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    العميل
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    الإجمالي
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(activeTab === "confirmed" ? orders : pendingOrders).map(
                  (order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {activeTab === "pending" && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setOrderToConfirm(order);
                              confirmOrderModal.openModal();
                            }}
                            className="flex items-center justify-center w-8 h-8 bg-green-100 hover:bg-green-200 text-green-600 rounded-full transition-colors"
                            title="تأكيد الطلب"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-[#563660] mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {order.orderNumber}
                            </div>
                            <div className="text-xs text-gray-500 font-mono truncate">
                              {order.trackingCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {order.customerInfo.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {order.customerInfo.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )} bg-opacity-10 border whitespace-nowrap`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="truncate">{order.statusName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="truncate">
                            {formatPrice(order.totalPrice)}
                          </span>
                          {activeTab === "pending" && (
                            <span className="text-xs text-amber-600 truncate">
                              غير محتسب
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="truncate">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCreateTemporaryLink(order.id)}
                            disabled={isCreatingLink === order.id}
                            className="text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
                            title={
                              isCreatingLink === order.id
                                ? "جاري إنشاء الرابط..."
                                : "إنشاء رابط مؤقت"
                            }
                          >
                            {isCreatingLink === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : copiedLinks.has(order.id) ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() =>
                              navigate(`/admin/orders/${order.id}/edit`)
                            }
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="تعديل الطلب"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                              updateStatusModal.openModal();
                            }}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="تحديث الحالة"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setOrderToDelete(order);
                              deleteOrderModal.openModal();
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <PaginationComponent
            currentPageProp={
              activeTab === "confirmed" ? currentPage : pendingCurrentPage
            }
            totalPagesProp={
              activeTab === "confirmed" ? totalPages : pendingTotalPages
            }
            totalOrdersProp={
              activeTab === "confirmed" ? totalOrders : totalPendingOrders
            }
            onPageChange={handlePageChange}
          />
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeTab === "confirmed"
              ? "لا توجد طلبات مؤكدة"
              : "لا توجد طلبات قيد المراجعة"}
          </h3>
          <p className="text-sm text-gray-600">
            {searchTerm || statusFilter
              ? `لا توجد ${
                  activeTab === "confirmed"
                    ? "طلبات مؤكدة"
                    : "طلبات قيد المراجعة"
                } تطابق معايير البحث`
              : `لا توجد ${
                  activeTab === "confirmed"
                    ? "طلبات مؤكدة"
                    : "طلبات قيد المراجعة"
                } حالياً`}
          </p>
        </div>
      )}

      {/* Temporary Link Modal */}
      <Modal
        isOpen={linkModal.isOpen}
        shouldRender={linkModal.shouldRender}
        onClose={() => {
          linkModal.closeModal();
          setModalCopied(false); // إعادة تعيين حالة النسخ عند الإغلاق
        }}
        title="الرابط المؤقت"
        size="md"
        options={linkModal.options}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-blue-800 font-medium mb-1">
                  تم إنشاء الرابط المؤقت بنجاح
                </h4>
                <p className="text-blue-700 text-sm mb-3">
                  يمكن للعميل استخدام هذا الرابط لعرض طلبه لمدة ساعة واحدة فقط.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الرابط المؤقت
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(generatedLink, "")}
                className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                  modalCopied
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                title={modalCopied ? "تم النسخ" : "نسخ الرابط"}
              >
                {modalCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                linkModal.closeModal();
                setModalCopied(false);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Modal>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={orderDetailsModal.isOpen}
          shouldRender={orderDetailsModal.shouldRender}
          onClose={orderDetailsModal.closeModal}
          title={`تفاصيل الطلب ${selectedOrder.orderNumber}`}
          size="lg"
          options={orderDetailsModal.options}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-gradient-to-r from-[#563660] to-[#4b2e55] rounded-lg p-3 sm:p-4 text-white">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-purple-100 block text-xs">
                      رقم الطلب
                    </span>
                    <span className="font-medium text-sm sm:text-base">
                      {selectedOrder.orderNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-100 block text-xs">
                      الإجمالي
                    </span>
                    <span className="font-bold text-sm sm:text-lg">
                      {formatPrice(selectedOrder.totalPrice)}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-purple-100 block text-xs">
                      الحالة
                    </span>
                    <span className="font-medium text-sm">
                      {selectedOrder.statusName}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-purple-100 block text-xs">
                      رمز التتبع
                    </span>
                    <span className="font-mono text-xs">
                      {selectedOrder.trackingCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-blue-800">
                    <User className="w-3 h-3" />
                    <span className="font-medium truncate">
                      {selectedOrder.customerInfo?.name || "غير محدد"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Phone className="w-3 h-3" />
                    <span className="truncate">
                      {selectedOrder.customerInfo?.phone || "غير محدد"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">
                      {(() => {
                        const date = new Date(selectedOrder.createdAt);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(
                          2,
                          "0"
                        );
                        const day = String(date.getDate()).padStart(2, "0");
                        const hours = String(date.getHours()).padStart(2, "0");
                        const minutes = String(date.getMinutes()).padStart(
                          2,
                          "0"
                        );
                        return `${year}/${month}/${day} ${hours}:${minutes}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#563660]" />
                العناصر ({selectedOrder.items?.length || 0})
              </h3>
              <div className="space-y-2">
                {(selectedOrder.items || []).map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg p-2 sm:p-3 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#563660] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-xs sm:text-sm block">
                            جاكيت مخصص
                          </span>
                          <span className="text-xs text-gray-600">
                            {item.jacketConfig.size} | ك{item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-[#563660] text-xs sm:text-sm block">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-100">
              <h3 className="text-sm sm:text-base font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                الحالات ({selectedOrder.statusHistory?.length || 0})
              </h3>
              <div className="space-y-1">
                {(selectedOrder.statusHistory || [])
                  .slice()
                  .reverse()
                  .slice(0, 3)
                  .map((history, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white rounded p-2 border border-amber-100"
                    >
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusColor(
                          history.status
                        )} bg-opacity-20`}
                      >
                        {React.cloneElement(
                          getStatusIcon(history.status) as React.ReactElement,
                          { className: "w-2 h-2 sm:w-3 sm:h-3" }
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                            {history.statusName}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                            {(() => {
                              const date = new Date(history.timestamp);
                              const year = date.getFullYear();
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, "0");
                              const day = String(date.getDate()).padStart(
                                2,
                                "0"
                              );
                              return `${year}/${month}/${day}`;
                            })()}
                          </span>
                        </div>
                        {history.note && (
                          <p className="text-xs text-gray-600 truncate sm:line-clamp-1">
                            {history.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                {(selectedOrder.statusHistory?.length || 0) > 3 && (
                  <div className="text-center text-xs text-gray-500 py-1">
                    +{(selectedOrder.statusHistory?.length || 0) - 3} حالات أخرى
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => {
                  setNewStatus(selectedOrder.status);
                  orderDetailsModal.closeModal();
                  updateStatusModal.openModal();
                }}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-blue-50 text-blue-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">تحديث</span>
                <span className="sm:hidden">حالة</span>
              </button>
              <button
                onClick={() => handleCreateTemporaryLink(selectedOrder.id)}
                disabled={isCreatingLink === selectedOrder.id}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-purple-50 text-purple-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                {isCreatingLink === selectedOrder.id ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                ) : copiedLinks.has(selectedOrder.id) ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                ) : (
                  <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <span>رابط</span>
              </button>

              <button
                onClick={() =>
                  navigate(`/admin/orders/${selectedOrder.id}/edit`)
                }
                className="flex items-center justify-center gap-1 py-2 px-2 bg-orange-50 text-orange-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">تعديل</span>
                <span className="sm:hidden">طلب</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Order Modal */}
      <ConfirmationModal
        isOpen={confirmOrderModal.isOpen}
        onClose={() => {
          confirmOrderModal.closeModal();
          setOrderToConfirm(null);
        }}
        onConfirm={handleConfirmOrder}
        title="تأكيد الطلب"
        message={`هل تريد تأكيد الطلب رقم "${orderToConfirm?.orderNumber}"؟ سيتم نقله إلى الطلبات المؤكدة وإدراجه في الحسابات والإيرادات.`}
        confirmText="نعم، أكد الطلب"
        cancelText="إلغاء"
        type="success"
        isLoading={isConfirmingOrder}
      />

      {/* Update Status Modal */}
      {selectedOrder && (
        <Modal
          isOpen={updateStatusModal.isOpen}
          shouldRender={updateStatusModal.shouldRender}
          onClose={updateStatusModal.closeModal}
          title={`تحديث حالة الطلب ${selectedOrder.orderNumber}`}
          size="md"
          options={updateStatusModal.options}
        >
          <div className="space-y-4">
            {selectedOrder.status === "pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-amber-800 font-medium mb-1">
                      ملاحظة مهمة
                    </h4>
                    <p className="text-amber-700 text-sm">
                      هذا الطلب قيد المراجعة ولا يُحتسب ضمن الإيرادات أو
                      الإحصائيات. عند تأكيده، سيتم نقله تلقائياً إلى الطلبات
                      المؤكدة.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحالة الجديدة
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#563660] focus:border-transparent transition-all"
              >
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.name}
                  </option>
                ))}
              </select>
              {selectedOrder.status === "pending" &&
                newStatus === "confirmed" && (
                  <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    سيتم نقل الطلب إلى الطلبات المؤكدة وإدراجه في الحسابات
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظة (اختيارية)
              </label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#563660] focus:border-transparent transition-all resize-none"
                placeholder="أضف ملاحظة حول تحديث الحالة..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus || !newStatus}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#563660] text-white font-medium rounded-lg hover:bg-[#4b2e55] transition-colors disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {selectedOrder.status === "pending" && newStatus === "confirmed"
                  ? "تأكيد الطلب ونقله"
                  : "تحديث الحالة"}
              </button>
              <button
                onClick={updateStatusModal.closeModal}
                disabled={isUpdatingStatus}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteOrderModal.isOpen}
        onClose={() => {
          deleteOrderModal.closeModal();
          setOrderToDelete(null);
        }}
        onConfirm={handleDeleteOrder}
        title="تأكيد حذف الطلب"
        message={`هل أنت متأكد من حذف الطلب رقم "${orderToDelete?.orderNumber}"؟ سيتم حذفه نهائياً ولا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        type="danger"
        isLoading={isConfirmingOrder}
      />
    </div>
  );
};

export default OrdersManagement;
