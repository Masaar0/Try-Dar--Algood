// إضافة فهارس قاعدة البيانات لتحسين أداء الاستعلامات
// يجب تشغيل هذا السكريبت مرة واحدة في قاعدة البيانات

// فهارس للبحث والتصفية
db.orders.createIndex({ orderNumber: 1 });
db.orders.createIndex({ trackingCode: 1 });
db.orders.createIndex({ "customerInfo.name": 1 });
db.orders.createIndex({ "customerInfo.phone": 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

// فهرس مركب للاستعلامات المعقدة
db.orders.createIndex({
  status: 1,
  createdAt: -1,
});

// فهرس مركب للبحث النصي
db.orders.createIndex({
  orderNumber: 1,
  trackingCode: 1,
  "customerInfo.name": 1,
});

// فهرس مركب للتصفية حسب التاريخ والحالة
db.orders.createIndex({
  createdAt: -1,
  status: 1,
});

console.log("تم إنشاء جميع الفهارس بنجاح!");
