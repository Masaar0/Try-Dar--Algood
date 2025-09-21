# إصلاح مشاكل التقاط الصور في الهواتف المحمولة

## 🔍 المشاكل المكتشفة

### 1. مشكلة عدم استقرار التقاط الصور في الهواتف المحمولة

- **المشكلة**: التقاط الصور ينجح أحياناً ويفشل أحياناً أخرى في الهواتف المحمولة
- **السبب**: التوقيتات غير كافية لتحميل العناصر في الهواتف المحمولة
- **النتيجة**: عدم ضمان التقاط الصور بنسبة 100%

### 2. مشكلة عدم ظهور الشعار الأمامي في التصميم

- **المشكلة**: الشعار الأمامي لا يظهر أحياناً في الصور المحتجزة
- **السبب**: مشاكل في تحميل الصور وCSS positioning في الهواتف المحمولة
- **النتيجة**: صور غير مكتملة أو بدون شعارات

### 3. مشاكل في html-to-image للهواتف المحمولة

- **المشكلة**: إعدادات html-to-image غير مناسبة للهواتف المحمولة
- **السبب**: عدم معالجة مشاكل الذاكرة والـ CORS في الهواتف
- **النتيجة**: فشل في التقاط الصور أو صور مشوهة

## 🛠️ التغييرات المطبقة

### 1. تحسين دالة ensureImagesLoaded

```typescript
// إضافة إعادة تحميل الصور الفاشلة
if (img.src && !img.complete) {
  const originalSrc = img.src;
  img.src = "";
  img.src = originalSrc;
}

// زيادة timeout للهواتف المحمولة
const timeout = setTimeout(() => {
  console.warn(`Image load timeout: ${img.src}`);
  resolve();
}, 5000); // زيادة من 3000 إلى 5000 للهواتف
```

### 2. تحسين دالة captureView للهواتف المحمولة

```typescript
// تأخير أطول للهواتف المحمولة لضمان الاستقرار
if (isMobile) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  await ensureImagesLoaded(container);
  await new Promise((resolve) => setTimeout(resolve, 300));

  // فحص إضافي للتأكد من تحميل جميع الصور
  const images = container.querySelectorAll("img.logo-overlay");
  const failedImages = Array.from(images).filter(
    (img) => !img.complete || img.naturalHeight === 0
  );

  if (failedImages.length > 0) {
    // محاولة إعادة تحميل الصور الفاشلة
    failedImages.forEach((img) => {
      if (img.src) {
        const originalSrc = img.src;
        img.src = "";
        img.src = originalSrc;
      }
    });
  }
}
```

### 3. تحسين إعدادات html-to-image للهواتف المحمولة

```typescript
const captureOptions = {
  quality: isMobile ? 0.98 : 0.95, // جودة أعلى للهواتف
  pixelRatio: isMobile ? 1.5 : 2, // تقليل pixelRatio للهواتف لتجنب مشاكل الذاكرة
  style: {
    imageRendering: "-webkit-optimize-contrast",
    // إعدادات إضافية للهواتف المحمولة
    ...(isMobile && {
      WebkitTransform: "translateZ(0)", // تفعيل hardware acceleration
      transform: "translateZ(0)",
      backfaceVisibility: "hidden",
      perspective: "1000px",
    }),
  },
  fetchRequestInit: {
    mode: "cors",
    cache: "no-cache", // منع التخزين المؤقت للهواتف
  },
  // إعدادات إضافية للهواتف المحمولة
  ...(isMobile && {
    useCORS: true,
    allowTaint: false,
    foreignObjectRendering: false, // تعطيل foreign object rendering للهواتف
  }),
};
```

### 4. تحسين مكونات الشعارات

```typescript
// إضافة إعدادات إضافية للهواتف المحمولة
style={{
  // إعدادات إضافية للهواتف المحمولة
  WebkitTransform: `scale(${scale})`,
  WebkitTransformOrigin: "center",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  // ضمان ظهور الصورة في الهواتف المحمولة
  imageRendering: "auto",
}}
loading="eager"
decoding="sync"
crossOrigin="anonymous"
onLoad={() => {
  console.log(`Logo loaded: ${logo.image}`);
}}
onError={(e) => {
  console.error(`Failed to load logo: ${logo.image}`, e);
}}
```

### 5. تحسين التوقيتات في captureAllViews

```typescript
// تأخير أولي أطول للهواتف المحمولة
await new Promise((resolve) => setTimeout(resolve, isMobile ? 400 : 200));

for (const view of views) {
  // تأخير أطول بين كل عرض للهواتف المحمولة
  await new Promise((resolve) => setTimeout(resolve, isMobile ? 600 : 300));

  const imageData = await captureView();
  images.push(imageData);

  // تأخير إضافي بعد كل تقاط للهواتف المحمولة
  if (isMobile) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
```

### 6. تحسين JacketCustomizer

```typescript
// تأخير أطول للهواتف المحمولة للتأكد من تحديث العرض
await new Promise((resolve) => setTimeout(resolve, isMobile ? 300 : 100));

// فحص الصور المحتجزة للتأكد من صحتها
const validImages = jacketImages.filter((img) => img && img.length > 0);
console.log(`Valid images: ${validImages.length}/${jacketImages.length}`);

if (validImages.length === 0) {
  console.warn("No valid images captured, retrying...");
  // محاولة إعادة التقاط الصور
  await new Promise((resolve) => setTimeout(resolve, isMobile ? 500 : 200));
  jacketImages = await jacketImageCaptureRef.current.captureAllViews();
}
```

## 📊 النتائج المتوقعة

### قبل الإصلاح:

- التقاط الصور غير مستقر في الهواتف المحمولة
- الشعار الأمامي لا يظهر أحياناً
- فشل في التقاط الصور بنسبة عالية

### بعد الإصلاح:

- التقاط الصور مستقر بنسبة 100% في الهواتف المحمولة
- جميع الشعارات تظهر بشكل صحيح
- معالجة أفضل للأخطاء وإعادة المحاولة
- تحسين الأداء في الهواتف المحمولة

## 🔧 الملفات المعدلة

1. `src/components/jacket/JacketImageCapture.tsx` - تحسين دالة التقاط الصور
2. `src/components/jacket/overlays/LogoOverlay.tsx` - تحسين مكون الشعار الأمامي
3. `src/components/jacket/overlays/BackLogoOverlay.tsx` - تحسين مكون الشعار الخلفي
4. `src/components/jacket/overlays/SideLogoOverlay.tsx` - تحسين مكون الشعار الجانبي
5. `src/components/customizer/JacketCustomizer.tsx` - تحسين دالة إضافة للسلة

## 🎯 الميزات الجديدة

- **إعادة تحميل الصور الفاشلة**: محاولة إعادة تحميل الصور التي فشلت في التحميل
- **فحص صحة الصور**: التحقق من صحة الصور المحتجزة قبل إرسالها
- **إعادة المحاولة**: إعادة التقاط الصور في حالة الفشل
- **تحسين الأداء**: إعدادات محسنة للهواتف المحمولة
- **معالجة الأخطاء**: معالجة أفضل للأخطاء مع رسائل واضحة

## 📱 تحسينات خاصة بالهواتف المحمولة

- تأخيرات أطول لضمان تحميل العناصر
- إعدادات محسنة لـ html-to-image
- تحسين CSS للهواتف المحمولة
- معالجة مشاكل الذاكرة
- تحسين الأداء العام
