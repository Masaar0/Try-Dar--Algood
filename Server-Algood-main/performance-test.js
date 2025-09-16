// سكريبت اختبار الأداء للطلبات
const axios = require("axios");

const BASE_URL = "http://localhost:3001/api";
const ADMIN_TOKEN = "YOUR_ADMIN_TOKEN_HERE"; // يجب استبدالها برمز المصادقة الصحيح

// اختبار الأداء
async function performanceTest() {
  console.log("🚀 بدء اختبار الأداء...\n");

  const tests = [
    {
      name: "تحميل الصفحة الأولى (10 طلبات)",
      url: `${BASE_URL}/orders?page=1&limit=10`,
      method: "GET",
    },
    {
      name: "تحميل الصفحة الخامسة (10 طلبات)",
      url: `${BASE_URL}/orders?page=5&limit=10`,
      method: "GET",
    },
    {
      name: "البحث عن طلب",
      url: `${BASE_URL}/orders?search=test&page=1&limit=10`,
      method: "GET",
    },
    {
      name: "تصفية حسب الحالة",
      url: `${BASE_URL}/orders?status=confirmed&page=1&limit=10`,
      method: "GET",
    },
    {
      name: "تحميل الطلبات قيد المراجعة",
      url: `${BASE_URL}/orders?includePending=true&page=1&limit=10`,
      method: "GET",
    },
    {
      name: "الحصول على الإحصائيات",
      url: `${BASE_URL}/orders/stats`,
      method: "GET",
    },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`⏱️  اختبار: ${test.name}`);

    const startTime = Date.now();

    try {
      const response = await axios({
        method: test.method,
        url: test.url,
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = {
        test: test.name,
        duration: duration,
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        success: true,
      };

      results.push(result);

      console.log(`✅ نجح في ${duration}ms`);
      console.log(`📊 حجم البيانات: ${Math.round(result.dataSize / 1024)}KB\n`);
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = {
        test: test.name,
        duration: duration,
        status: error.response?.status || "ERROR",
        error: error.message,
        success: false,
      };

      results.push(result);

      console.log(`❌ فشل في ${duration}ms: ${error.message}\n`);
    }

    // انتظار قصير بين الاختبارات
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // عرض النتائج النهائية
  console.log("📈 نتائج اختبار الأداء:");
  console.log("=".repeat(50));

  const successfulTests = results.filter((r) => r.success);
  const failedTests = results.filter((r) => !r.success);

  if (successfulTests.length > 0) {
    const avgDuration =
      successfulTests.reduce((sum, r) => sum + r.duration, 0) /
      successfulTests.length;
    const minDuration = Math.min(...successfulTests.map((r) => r.duration));
    const maxDuration = Math.max(...successfulTests.map((r) => r.duration));

    console.log(
      `✅ الاختبارات الناجحة: ${successfulTests.length}/${results.length}`
    );
    console.log(`⏱️  متوسط الوقت: ${Math.round(avgDuration)}ms`);
    console.log(`⚡ أسرع اختبار: ${minDuration}ms`);
    console.log(`🐌 أبطأ اختبار: ${maxDuration}ms`);

    console.log("\n📊 تفاصيل الاختبارات:");
    successfulTests.forEach((result) => {
      const speed =
        result.duration < 500
          ? "🚀 سريع"
          : result.duration < 1000
          ? "⚡ متوسط"
          : "🐌 بطيء";
      console.log(`  ${result.test}: ${result.duration}ms ${speed}`);
    });
  }

  if (failedTests.length > 0) {
    console.log(`\n❌ الاختبارات الفاشلة: ${failedTests.length}`);
    failedTests.forEach((result) => {
      console.log(`  ${result.test}: ${result.error}`);
    });
  }

  // تقييم الأداء
  console.log("\n🎯 تقييم الأداء:");
  const fastTests = successfulTests.filter((r) => r.duration < 500).length;
  const mediumTests = successfulTests.filter(
    (r) => r.duration >= 500 && r.duration < 1000
  ).length;
  const slowTests = successfulTests.filter((r) => r.duration >= 1000).length;

  if (fastTests === successfulTests.length) {
    console.log("🌟 ممتاز! جميع الاختبارات سريعة جداً");
  } else if (fastTests + mediumTests === successfulTests.length) {
    console.log("👍 جيد! معظم الاختبارات سريعة أو متوسطة");
  } else {
    console.log("⚠️  يحتاج تحسين! بعض الاختبارات بطيئة");
  }

  console.log(`🚀 سريع (<500ms): ${fastTests}`);
  console.log(`⚡ متوسط (500-1000ms): ${mediumTests}`);
  console.log(`🐌 بطيء (>1000ms): ${slowTests}`);
}

// اختبار الكاش
async function cacheTest() {
  console.log("\n🧠 اختبار نظام الكاش...");

  const testUrl = `${BASE_URL}/orders?page=1&limit=10`;

  // الاختبار الأول (بدون كاش)
  console.log("⏱️  الاختبار الأول (بدون كاش):");
  const start1 = Date.now();
  try {
    await axios.get(testUrl, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const duration1 = Date.now() - start1;
    console.log(`✅ ${duration1}ms`);
  } catch (error) {
    console.log(`❌ فشل: ${error.message}`);
    return;
  }

  // انتظار قصير
  await new Promise((resolve) => setTimeout(resolve, 100));

  // الاختبار الثاني (مع كاش)
  console.log("⏱️  الاختبار الثاني (مع كاش):");
  const start2 = Date.now();
  try {
    await axios.get(testUrl, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const duration2 = Date.now() - start2;
    console.log(`✅ ${duration2}ms`);

    const improvement = (((duration1 - duration2) / duration1) * 100).toFixed(
      1
    );
    console.log(`📈 تحسن الأداء: ${improvement}%`);

    if (duration2 < duration1 * 0.5) {
      console.log("🌟 ممتاز! الكاش يعمل بشكل فعال");
    } else if (duration2 < duration1 * 0.8) {
      console.log("👍 جيد! الكاش يحسن الأداء");
    } else {
      console.log("⚠️  الكاش قد لا يعمل بشكل صحيح");
    }
  } catch (error) {
    console.log(`❌ فشل: ${error.message}`);
  }
}

// تشغيل الاختبارات
async function runTests() {
  try {
    await performanceTest();
    await cacheTest();

    console.log("\n🎉 انتهى اختبار الأداء!");
    console.log("\n💡 نصائح للتحسين:");
    console.log("  - تأكد من تشغيل فهارس قاعدة البيانات");
    console.log("  - راقب استخدام الذاكرة");
    console.log("  - اختبر مع بيانات حقيقية");
    console.log("  - راقب أداء الشبكة");
  } catch (error) {
    console.error("❌ خطأ في الاختبار:", error.message);
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runTests();
}

module.exports = { performanceTest, cacheTest, runTests };
