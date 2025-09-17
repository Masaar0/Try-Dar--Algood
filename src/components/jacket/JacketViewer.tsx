import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useJacket, JacketView } from "../../context/JacketContext";
import FrontView from "./views/FrontView";
import BackView from "./views/BackView";
import LeftSideView from "./views/LeftSideView";
import RightSideView from "./views/RightSideView";
import { RotateCw, Plus, Minus } from "lucide-react";

interface JacketViewerProps {
  isSidebarOpen?: boolean;
  isCapturing?: boolean;
}

interface ViewerState {
  zoom: number;
  desktopZoom: number;
  isViewsVisible: boolean;
  isControlsVisible: boolean;
}

interface WindowWithViewerState extends Window {
  jacketViewerStates?: { [pageKey: string]: ViewerState };
}

const JacketViewer: React.FC<JacketViewerProps> = ({
  isSidebarOpen,
  isCapturing,
}) => {
  const location = useLocation();
  const { jacketState, setCurrentView } = useJacket();
  const { currentView } = jacketState;
  const jacketRef = useRef<HTMLDivElement>(null);

  // تحديد معرف الصفحة بناءً على المسار
  const getPageKey = (): string => {
    const path = location.pathname;
    if (path === "/customizer") {
      return "customizer";
    } else if (path.startsWith("/edit-order/")) {
      return `temporary-edit-${path.split("/")[2]}`;
    } else if (path.startsWith("/admin/orders/") && path.endsWith("/edit")) {
      return `admin-edit-${path.split("/")[3]}`;
    }
    return "default";
  };

  // تحميل الحالة المحفوظة أو استخدام القيم الافتراضية
  const loadSavedState = (): ViewerState => {
    try {
      const windowWithState = window as WindowWithViewerState;
      const pageKey = getPageKey();
      const savedStates = windowWithState.jacketViewerStates || {};
      const savedState = savedStates[pageKey];
      if (savedState) {
        return savedState;
      }
    } catch (error) {
      console.warn("Error loading viewer state:", error);
    }

    return {
      zoom: window.innerWidth > 1250 ? 1.5 : 1,
      desktopZoom: 1.5,
      isViewsVisible: false,
      isControlsVisible: false,
    };
  };

  // حفظ الحالة في الذاكرة
  const saveStateToMemory = React.useCallback((state: Partial<ViewerState>) => {
    try {
      const windowWithState = window as WindowWithViewerState;
      const pageKey = getPageKey();
      const currentStates = windowWithState.jacketViewerStates || {};
      const currentState = currentStates[pageKey] || loadSavedState();
      const newState = { ...currentState, ...state };
      windowWithState.jacketViewerStates = {
        ...currentStates,
        [pageKey]: newState,
      };
    } catch (error) {
      console.warn("Error saving viewer state:", error);
    }
  }, []);

  const initialState = loadSavedState();
  const [zoom, setZoom] = useState(initialState.zoom);
  const [desktopZoom, setDesktopZoom] = useState(initialState.desktopZoom);
  const [isViewsVisible, setIsViewsVisible] = useState(
    initialState.isViewsVisible
  );
  const [isControlsVisible, setIsControlsVisible] = useState(
    initialState.isControlsVisible
  );

  const views: JacketView[] = ["front", "right", "back", "left"];

  // إعادة تعيين الحالة عند تغيير الصفحة
  useEffect(() => {
    const pageKey = getPageKey();
    const windowWithState = window as WindowWithViewerState;

    // تنظيف الحالات القديمة للصفحات الأخرى
    if (windowWithState.jacketViewerStates) {
      const currentStates = windowWithState.jacketViewerStates;
      const cleanedStates: { [key: string]: ViewerState } = {};

      // الاحتفاظ بحالة الصفحة الحالية فقط
      if (currentStates[pageKey]) {
        cleanedStates[pageKey] = currentStates[pageKey];
      }

      windowWithState.jacketViewerStates = cleanedStates;
    }
  }, [location.pathname]);

  // حفظ الحالة في الذاكرة عند تغييرها
  useEffect(() => {
    saveStateToMemory({
      zoom,
      desktopZoom,
      isViewsVisible,
      isControlsVisible,
    });
  }, [zoom, desktopZoom, isViewsVisible, isControlsVisible, saveStateToMemory]);

  const handleViewChange = (view: JacketView) => {
    setCurrentView(view);
  };

  const handleRotate = () => {
    const currentIndex = views.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    setCurrentView(views[nextIndex]);
  };

  const handleZoomIn = () => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 0.1, 2.0);
      if (window.innerWidth > 1250) {
        setDesktopZoom(newZoom);
      }
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.1, 0.5);
      if (window.innerWidth > 1250) {
        setDesktopZoom(newZoom);
      }
      return newZoom;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1250) {
        setZoom(isSidebarOpen ? 0.7 : 1);
      } else {
        setZoom(desktopZoom);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen, desktopZoom]);

  useEffect(() => {
    if (!isCapturing) {
      const timer = setTimeout(() => {
        setIsViewsVisible(true);
        setIsControlsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsViewsVisible(false);
      setIsControlsVisible(false);
    }
  }, [isCapturing]);

  const renderJacketView = () => {
    switch (currentView) {
      case "front":
        return <FrontView />;
      case "back":
        return <BackView />;
      case "left":
        return <LeftSideView />;
      case "right":
        return <RightSideView />;
      default:
        return <FrontView />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center h-full w-full relative jacket-viewer-mobile ${
        isSidebarOpen && window.innerWidth <= 1250
          ? "jacket-viewer-mobile-fixed"
          : ""
      }`}
      style={{ overflow: "visible" }}
      data-jacket-view={currentView}
    >
      <div
        ref={jacketRef}
        className="relative w-full max-w-[320px] aspect-[320/410] mx-auto flex items-center justify-center transition-transform duration-300"
        style={{
          transform: isCapturing ? "scale(1)" : `scale(${zoom})`,
          zIndex: 1000,
          transformOrigin: "center center",
          overflow: "visible",
          maxHeight: "none",
        }}
      >
        {renderJacketView()}
      </div>

      {/* عناصر التحكم - مخفية أثناء التقاط الصور */}
      {!isCapturing && (
        <div
          className={`fixed ${
            window.innerWidth <= 1250
              ? "bottom-[5rem] left-4"
              : "bottom-0 left-0 right-0 py-3 px-4"
          } z-[1100] border-gray-200 jacket-viewer-controls transition-opacity duration-500 ${
            isControlsVisible ? "opacity-100" : "opacity-0"
          } ${window.innerWidth > 1250 ? "desktop-controls" : ""}`}
        >
          <div className="max-w-md mx-auto flex flex-col gap-3">
            <div
              className={`flex ${
                window.innerWidth <= 1250 ? "flex-col" : "justify-center"
              } gap-3 mobile-control-buttons transition-opacity duration-500 ${
                isControlsVisible ? "opacity-100" : "opacity-0"
              } ${window.innerWidth > 1250 ? "desktop-control-buttons" : ""}`}
            >
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all border border-gray-200"
                title="تصغير"
              >
                <Minus size={18} className="text-[#563660]" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all border border-gray-200"
                title="تدوير"
              >
                <RotateCw size={18} className="text-[#563660]" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all border border-gray-200"
                title="تكبير"
              >
                <Plus size={18} className="text-[#563660]" />
              </button>
            </div>

            {window.innerWidth > 1250 && (
              <div
                className={`grid grid-cols-4 gap-2 bg-gray-100 rounded-xl p-1 desktop-view-buttons transition-opacity duration-500 ${
                  isViewsVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {views.map((view) => (
                  <button
                    key={view}
                    onClick={() => handleViewChange(view)}
                    className={`py-2 px-1 text-xs font-medium rounded-xl transition-all ${
                      currentView === view
                        ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {view === "front" && "أمامي"}
                    {view === "back" && "خلفي"}
                    {view === "right" && "أيمن"}
                    {view === "left" && "أيسر"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JacketViewer;
