import { useRef, useImperativeHandle, forwardRef } from "react";
import {
  useJacket,
  JacketView,
  JacketState,
} from "../../context/JacketContext";
import * as htmlToImage from "html-to-image";
import JacketViewer from "./JacketViewer";
import fontPreloader from "../../utils/fontPreloader";

export interface JacketImageCaptureRef {
  captureAllViews: () => Promise<string[]>;
  captureFromConfig: (config: JacketState) => Promise<string[]>;
}

interface JacketImageCaptureProps {
  className?: string;
}

const JacketImageCapture = forwardRef<
  JacketImageCaptureRef,
  JacketImageCaptureProps
>(({ className }, ref) => {
  const {
    setCurrentView,
    setIsCapturing,
    jacketState,
    setColor,
    setMaterial,
    setSize,
    addLogo,
    addText,
    removeLogo,
    removeText,
  } = useJacket();
  const containerRef = useRef<HTMLDivElement>(null);

  const saveCurrentState = () => {
    return { ...jacketState };
  };

  const restoreState = (savedState: JacketState) => {
    jacketState.logos.forEach((logo) => removeLogo(logo.id));
    jacketState.texts.forEach((text) => removeText(text.id));
    setColor("body", savedState.colors.body);
    setColor("sleeves", savedState.colors.sleeves);
    setColor("trim", savedState.colors.trim);
    setMaterial("body", savedState.materials.body);
    setMaterial("sleeves", savedState.materials.sleeves);
    setSize(savedState.size);
    savedState.logos.forEach((logo) => addLogo(logo));
    savedState.texts.forEach((text) => addText(text));
  };

  const ensureImagesLoaded = (container: HTMLElement): Promise<void> => {
    const images = container.querySelectorAll(
      "img.logo-overlay"
    ) as NodeListOf<HTMLImageElement>;

    // فحص سريع: إذا كانت جميع الصور محملة، لا نحتاج انتظار
    const allLoaded = Array.from(images).every(
      (img) => img.complete && img.naturalHeight !== 0
    );

    if (allLoaded) {
      return Promise.resolve(); // إرجاع فوري
    }

    // فقط إذا كانت هناك صور غير محملة، ننتظر
    const promises = Array.from(images).map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }

      // إعادة تحميل الصورة إذا فشلت
      if (img.src && !img.complete) {
        const originalSrc = img.src;
        img.src = "";
        img.src = originalSrc;
      }

      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`Image load timeout: ${img.src}`);
          resolve(); // لا نرفض، فقط نحذر
        }, 5000); // زيادة timeout للهواتف المحمولة

        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`Failed to load image: ${img.src}`);
          resolve(); // لا نرفض لتجنب توقف العملية
        };
      });
    });
    return Promise.all(promises).then(() => Promise.resolve());
  };

  const forceRepaint = (element: HTMLElement) => {
    const originalDisplay = element.style.display;
    element.style.display = "none";
    void element.offsetHeight; // إجبار إعادة الرسم
    element.style.display = originalDisplay;
  };

  const captureView = async (): Promise<string> => {
    const container = containerRef.current;
    if (!container) throw new Error("Container not found");

    const isMobile = window.innerWidth <= 768;

    // إجبار إعادة الرسم
    forceRepaint(container);

    // التأكد من تحميل الخطوط
    if (!fontPreloader.isFontLoaded("Tajawal")) {
      await fontPreloader.preloadAllFonts();
    }
    await document.fonts.ready;

    // تأخير أولي للتأكد من استقرار DOM
    await new Promise((resolve) => setTimeout(resolve, isMobile ? 200 : 100));

    // التأكد من تحميل جميع الشعارات
    await ensureImagesLoaded(container);

    // تأخير إضافي للهواتف المحمولة لضمان الاستقرار
    if (isMobile) {
      // تأخير أطول للهواتف لضمان تحميل جميع العناصر
      await new Promise((resolve) => setTimeout(resolve, 500));

      // التأكد مرة أخرى من تحميل الصور في الهواتف
      await ensureImagesLoaded(container);

      // تأخير إضافي للتأكد من استقرار الـ DOM في الهواتف
      await new Promise((resolve) => setTimeout(resolve, 300));

      // فحص إضافي للتأكد من تحميل جميع الصور
      const images = container.querySelectorAll(
        "img.logo-overlay"
      ) as NodeListOf<HTMLImageElement>;
      const failedImages = Array.from(images).filter(
        (img) => !img.complete || img.naturalHeight === 0
      );

      if (failedImages.length > 0) {
        console.warn(
          `Found ${failedImages.length} images that failed to load, retrying...`
        );
        // محاولة إعادة تحميل الصور الفاشلة
        failedImages.forEach((img) => {
          if (img.src) {
            const originalSrc = img.src;
            img.src = "";
            img.src = originalSrc;
          }
        });

        // انتظار إضافي بعد إعادة التحميل
        await new Promise((resolve) => setTimeout(resolve, 200));
        await ensureImagesLoaded(container);
      }
    } else {
      // تأخير أقل للشاشات الكبيرة
      await new Promise((resolve) => setTimeout(resolve, 200));

      // التأكد مرة أخرى من تحميل الصور
      await ensureImagesLoaded(container);

      // تأخير أقل للاستقرار
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // إعدادات الحاوية والعارض
    const jacketViewer = container.querySelector(
      ".jacket-viewer-mobile"
    ) as HTMLElement;

    if (container) {
      container.style.position = "relative";
      container.style.top = "0";
      container.style.left = "0";
      container.style.opacity = "1";
      container.style.zIndex = "1000";
      container.style.visibility = "visible";
      container.style.transform = "none";
      container.style.fontFamily = "'Tajawal', 'Arial', sans-serif";
    }

    if (jacketViewer) {
      jacketViewer.style.transform = "scale(1)";
      jacketViewer.style.width = "320px";
      jacketViewer.style.height = "410px";
      jacketViewer.style.opacity = "1";
      jacketViewer.style.display = "flex";
      jacketViewer.style.visibility = "visible";
      jacketViewer.style.position = "relative";
      jacketViewer.style.margin = "0 auto";
      jacketViewer.style.fontFamily = "'Tajawal', 'Arial', sans-serif";
    }

    // تطبيق الخطوط على جميع عناصر النص
    const textElements = container.querySelectorAll(".text-overlay");
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const currentFont = htmlElement.style.fontFamily;

      if (currentFont) {
        htmlElement.style.fontFamily = `${currentFont}, 'Tajawal', 'Arial', sans-serif`;
      } else {
        htmlElement.style.fontFamily = "'Tajawal', 'Arial', sans-serif";
      }

      htmlElement.style.fontWeight = "bold";
      htmlElement.style.textRendering = "optimizeLegibility";
      htmlElement.style.fontKerning = "normal";
      htmlElement.style.fontVariantLigatures = "normal";
    });

    // انتظار إضافي بسيط لاستقرار الـ DOM
    await new Promise((resolve) => setTimeout(resolve, isMobile ? 200 : 100));

    try {
      // إعدادات محسنة للهواتف المحمولة
      const captureOptions = {
        quality: isMobile ? 0.98 : 0.95, // جودة أعلى للهواتف
        pixelRatio: isMobile ? 1.5 : 2, // تقليل pixelRatio للهواتف لتجنب مشاكل الذاكرة
        width: 320,
        height: 410,
        backgroundColor: "#f9fafb",
        skipFonts: false,
        cacheBust: true,
        includeQueryParams: true,
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
          mode: "cors" as RequestMode,
          cache: "no-cache" as RequestCache, // منع التخزين المؤقت للهواتف
        },
        filter: (node: Element) => {
          if (
            node.classList &&
            node.classList.contains("jacket-viewer-controls")
          ) {
            return false;
          }
          return true;
        },
        // إعدادات إضافية للهواتف المحمولة
        ...(isMobile && {
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: false, // تعطيل foreign object rendering للهواتف
        }),
      };

      const dataUrl = await htmlToImage.toPng(container, captureOptions);

      return dataUrl;
    } finally {
      if (container) {
        container.style.position = "absolute";
        container.style.top = "-9999px";
        container.style.left = "-9999px";
        container.style.opacity = "";
        container.style.zIndex = "-1";
        container.style.visibility = "";
        container.style.transform = "";
        container.style.fontFamily = "";
      }
      if (jacketViewer) {
        jacketViewer.style.transform = "";
        jacketViewer.style.width = "";
        jacketViewer.style.height = "";
        jacketViewer.style.opacity = "";
        jacketViewer.style.display = "";
        jacketViewer.style.visibility = "";
        jacketViewer.style.position = "";
        jacketViewer.style.margin = "";
        jacketViewer.style.fontFamily = "";
      }
    }
  };

  useImperativeHandle(ref, () => ({
    captureAllViews: async () => {
      const views: JacketView[] = ["front", "back", "right", "left"];
      const images: string[] = [];
      const isMobile = window.innerWidth <= 768;

      setIsCapturing(true);

      // تأخير أولي أطول للهواتف المحمولة
      await new Promise((resolve) => setTimeout(resolve, isMobile ? 400 : 200));

      for (const view of views) {
        try {
          setCurrentView(view);

          // تأخير أطول بين كل عرض للهواتف المحمولة
          await new Promise((resolve) =>
            setTimeout(resolve, isMobile ? 600 : 300)
          );

          const imageData = await captureView();
          images.push(imageData);

          // تأخير إضافي بعد كل تقاط للهواتف المحمولة
          if (isMobile) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Error capturing ${view} view:`, error);
          images.push("");

          // تأخير إضافي في حالة الخطأ للهواتف المحمولة
          if (isMobile) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      setIsCapturing(false);
      return images;
    },

    captureFromConfig: async (config: JacketState) => {
      const views: JacketView[] = ["front", "back", "right", "left"];
      const images: string[] = [];
      const isMobile = window.innerWidth <= 768;

      const currentState = saveCurrentState();

      setIsCapturing(true);

      try {
        restoreState(config);

        // تأخير أطول عند استعادة الحالة للهواتف المحمولة
        await new Promise((resolve) =>
          setTimeout(resolve, isMobile ? 800 : 500)
        );

        for (const view of views) {
          try {
            setCurrentView(view);

            // تأخير أطول بين كل عرض للهواتف المحمولة
            await new Promise((resolve) =>
              setTimeout(resolve, isMobile ? 600 : 300)
            );

            const imageData = await captureView();
            images.push(imageData);

            // تأخير إضافي بعد كل تقاط للهواتف المحمولة
            if (isMobile) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error(`Error capturing ${view} view:`, error);
            images.push("");

            // تأخير إضافي في حالة الخطأ للهواتف المحمولة
            if (isMobile) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        }
      } finally {
        restoreState(currentState);
        setIsCapturing(false);
      }

      return images;
    },
  }));

  return (
    <div
      ref={containerRef}
      className={`jacket-image-capture ${className}`}
      style={{
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        width: "320px",
        height: "410px",
        overflow: "visible",
        zIndex: -1,
        backgroundColor: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "'Tajawal', 'Katibeh', 'Amiri', 'Noto Naskh Arabic', 'Noto Kufi Arabic', 'Scheherazade New', 'Arial', sans-serif",
        // إعدادات إضافية للهواتف المحمولة
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        // ضمان عدم تداخل العناصر
        isolation: "isolate",
        // تحسين الأداء في الهواتف المحمولة
        willChange: "transform",
      }}
    >
      <JacketViewer isSidebarOpen={false} isCapturing={true} />
    </div>
  );
});

JacketImageCapture.displayName = "JacketImageCapture";

export default JacketImageCapture;
