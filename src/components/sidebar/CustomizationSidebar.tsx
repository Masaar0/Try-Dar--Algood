import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ColorSection from "./sections/ColorSection";
import MaterialSection from "./sections/MaterialSection";
import SizeSection from "./sections/SizeSection";
import SubSidebarSection from "./sections/SubSidebarSection";
import FrontLogoSection from "./sections/FrontLogoSection";
import BackLogoSection from "./sections/BackLogoSection";
import RightLogoSection from "./sections/RightLogoSection";
import LeftLogoSection from "./sections/LeftLogoSection";
import FrontTextSection from "./sections/FrontTextSection";
import BackTextSection from "./sections/BackTextSection";
import {
  Palette,
  ImagePlus,
  Save,
  Loader2,
  RotateCcw,
  ShoppingBag,
  ShoppingBasket,
  Package,
  RefreshCw,
} from "lucide-react";
import { useJacket, JacketView } from "../../context/JacketContext";
import { useCart } from "../../context/CartContext";
import { Link } from "react-router-dom";
import Logo10 from "/logos/logo10.png";

interface CustomizationSidebarProps {
  isMobile?: boolean;
  setIsSidebarOpen?: (isOpen: boolean) => void;
  onAddToCart?: () => void;
  isCapturingImages?: boolean;
  onSaveChanges?: () => void;
  isSaving?: boolean;
}

interface SidebarState {
  isOpen: boolean;
  activeSection: string;
  activeView: JacketView;
  activeContent: "logos" | "texts";
  productOptionsTab: "materials" | "sizes";
  lastVisited: {
    section: string;
    view: JacketView;
    content?: "logos" | "texts";
    productTab?: "materials" | "sizes";
  };
}

interface WindowWithSidebarState extends Window {
  customizationSidebarState?: SidebarState;
}

const CustomizationSidebar: React.FC<CustomizationSidebarProps> = ({
  isMobile,
  setIsSidebarOpen,
  onAddToCart,
  isCapturingImages = false,
  onSaveChanges,
  isSaving = false,
}) => {
  const location = useLocation();
  const { setCurrentView, resetDesign } = useJacket();
  const { items } = useCart();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load state from memory or use defaults
  const loadSavedState = (): SidebarState => {
    try {
      const windowWithState = window as WindowWithSidebarState;
      const savedState = windowWithState.customizationSidebarState;
      if (savedState) {
        return savedState;
      }
    } catch (error) {
      console.warn("Error loading sidebar state:", error);
    }

    return {
      isOpen: false,
      activeSection: "",
      activeView: "front",
      activeContent: "logos",
      productOptionsTab: "materials",
      lastVisited: {
        section: "",
        view: "front",
      },
    };
  };

  // Save state to memory whenever it changes
  const saveStateToMemory = React.useCallback(
    (state: Partial<SidebarState>) => {
      try {
        const windowWithState = window as WindowWithSidebarState;
        const currentState =
          windowWithState.customizationSidebarState || loadSavedState();
        const newState = { ...currentState, ...state };
        windowWithState.customizationSidebarState = newState;
      } catch (error) {
        console.warn("Error saving sidebar state:", error);
      }
    },
    []
  );

  const initialState = loadSavedState();

  const [isOpen, setIsOpen] = useState(initialState.isOpen);
  const [activeSection, setActiveSection] = useState<string>(
    initialState.activeSection
  );
  const [activeView, setActiveView] = useState<JacketView>(
    initialState.activeView
  );
  const [activeContent, setActiveContent] = useState<"logos" | "texts">(
    initialState.activeContent
  );
  const [productOptionsTab, setProductOptionsTab] = useState<
    "materials" | "sizes"
  >(initialState.productOptionsTab);
  const [lastVisited, setLastVisited] = useState<{
    section: string;
    view: JacketView;
    content?: "logos" | "texts";
    productTab?: "materials" | "sizes";
  }>(initialState.lastVisited);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update memory state when local state changes
  useEffect(() => {
    saveStateToMemory({
      isOpen,
      activeSection,
      activeView,
      activeContent,
      productOptionsTab,
      lastVisited,
    });
  }, [
    isOpen,
    activeSection,
    activeView,
    activeContent,
    productOptionsTab,
    lastVisited,
    saveStateToMemory,
  ]);

  // Set current view in jacket context when activeView changes
  useEffect(() => {
    setCurrentView(activeView);
  }, [activeView, setCurrentView]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1250) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if ((isMobile || window.innerWidth <= 1250) && setIsSidebarOpen) {
      setIsSidebarOpen(isOpen);
    }
  }, [isMobile, isOpen, setIsSidebarOpen]);

  useEffect(() => {
    if ((isMobile || window.innerWidth <= 1250) && isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        // تجاهل النقرات إذا كانت داخل نافذة modal
        const target = event.target as Element;
        if (
          target.closest('[data-modal="true"]') ||
          target.closest(".modal-portal")
        ) {
          return;
        }

        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setLastVisited({
            section: activeSection,
            view: activeView,
            content: activeContent,
          });
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMobile, isOpen, activeSection, activeView, activeContent]);

  const handleSectionClick = (section: string) => {
    if (
      (isMobile || window.innerWidth <= 1250) &&
      section === activeSection &&
      isOpen
    ) {
      setIsOpen(false);
      setLastVisited({
        section: activeSection,
        view: activeView,
        content: activeContent,
        productTab: productOptionsTab,
      });
    } else {
      setActiveSection(section);
      setIsOpen(true);
      if (section === lastVisited.section && lastVisited.view) {
        setActiveView(lastVisited.view);
        setCurrentView(lastVisited.view);
        setActiveContent(lastVisited.content || "logos");
        if (section === "product-options" && lastVisited.productTab) {
          setProductOptionsTab(lastVisited.productTab);
        }
      } else if (section === "extras") {
        setActiveView("front");
        setCurrentView("front");
        setActiveContent("logos");
      } else if (section === "product-options") {
        setProductOptionsTab("materials");
      }
    }
  };

  const handleViewClick = (view: JacketView) => {
    setActiveView(view);
    setCurrentView(view);
    if (view === "right" || view === "left") {
      setActiveContent("logos");
    }
    setLastVisited({ section: activeSection, view, content: activeContent });
  };

  const handleContentChange = (content: "logos" | "texts") => {
    setActiveContent(content);
    setLastVisited({
      section: activeSection,
      view: activeView,
      content,
      productTab: productOptionsTab,
    });
  };

  const handleProductTabChange = (tab: "materials" | "sizes") => {
    setProductOptionsTab(tab);
    setLastVisited({
      section: activeSection,
      view: activeView,
      content: activeContent,
      productTab: tab,
    });
  };

  const handleAddToCartClick = () => {
    if (onAddToCart) {
      // إضافة تأخير قصير لتجنب مشاكل CSS
      setTimeout(() => {
        onAddToCart();
      }, 100);
    }
  };

  const handleResetDesign = () => {
    resetDesign();
    setShowResetConfirm(false);
    // إعادة تعيين حالة الشريط الجانبي
    setActiveSection("");
    setActiveView("front");
    setCurrentView("front");
    setActiveContent("logos");
  };

  const renderViewButtons = () => {
    const views: { id: JacketView; name: string }[] = [
      { id: "front", name: "أمامي" },
      { id: "back", name: "خلفي" },
      { id: "right", name: "يمين" },
      { id: "left", name: "يسار" },
    ];

    return (
      <div className="grid grid-cols-4 gap-2 mb-4">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => handleViewClick(view.id)}
            className={`py-2 px-2 text-xs rounded-xl transition-all ${
              activeView === view.id
                ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {view.name}
          </button>
        ))}
      </div>
    );
  };

  const renderContentButtons = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => handleContentChange("logos")}
        className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
          activeContent === "logos"
            ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        الشعارات
      </button>
      <button
        onClick={() => handleContentChange("texts")}
        className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
          activeContent === "texts"
            ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        النصوص
      </button>
    </div>
  );

  // التحقق من كون الصفحة الحالية هي صفحة تعديل الطلب (دائمة أو مؤقتة)
  const isOrderEditPage =
    (location.pathname.startsWith("/admin/orders/") &&
      location.pathname.endsWith("/edit")) ||
    location.pathname.startsWith("/edit-order/");

  if (isMobile || window.innerWidth <= 1250) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t border-gray-200 z-50 mobile-sidebar">
        {/* Bottom Navigation Bar */}
        <div
          className={`flex ${
            isOrderEditPage ? "justify-evenly" : "justify-around"
          } items-center h-16 px-2 bg-white sticky bottom-0 z-60 border-t border-gray-200`}
        >
          <button
            onClick={() => handleSectionClick("colors")}
            className={`flex flex-col items-center p-2 ${
              activeSection === "colors" ? "text-[#563660]" : "text-gray-600"
            }`}
          >
            <Palette size={18} />
            <span className="text-xs mt-1">الألوان</span>
          </button>
          <button
            onClick={() => handleSectionClick("product-options")}
            className={`flex flex-col items-center p-2 ${
              activeSection === "product-options"
                ? "text-[#563660]"
                : "text-gray-600"
            }`}
          >
            <Package size={18} />
            <span className="text-xs mt-1">المنتج</span>
          </button>
          <button
            onClick={() => {
              handleSectionClick("extras");
              if (lastVisited.section === "extras") {
                handleViewClick(lastVisited.view);
                setActiveContent(lastVisited.content || "logos");
              } else {
                handleViewClick("front");
                setActiveContent("logos");
              }
            }}
            className={`flex flex-col items-center p-2 ${
              activeSection === "extras" ? "text-[#563660]" : "text-gray-600"
            }`}
          >
            <ImagePlus size={18} />
            <span className="text-xs mt-1">الإضافات</span>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex flex-col items-center p-2 text-orange-600 hover:text-orange-700 transition-colors"
          >
            <RefreshCw size={18} />
            <span className="text-xs mt-1"> تعيين</span>
          </button>
          {/* إخفاء أزرار السلة في صفحة تعديل الطلب وإضافة زر الحفظ */}
          {isOrderEditPage ? (
            <button
              onClick={onSaveChanges}
              disabled={isSaving}
              className={`flex flex-col items-center p-2 transition-colors ${
                isSaving
                  ? "text-gray-400 opacity-50"
                  : "text-green-600 hover:text-green-700"
              }`}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span className="text-xs mt-1">
                {isSaving ? "جاري الحفظ..." : "حفظ"}
              </span>
            </button>
          ) : (
            <>
              <button
                onClick={handleAddToCartClick}
                disabled={isCapturingImages}
                className={`flex flex-col items-center p-2 transition-colors ${
                  isCapturingImages
                    ? "text-gray-400 opacity-50"
                    : items.length > 0
                    ? "text-orange-600"
                    : "text-[#563660]"
                }`}
              >
                {isCapturingImages ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : items.length > 0 ? (
                  <RotateCcw size={18} />
                ) : (
                  <ShoppingBag size={18} />
                )}
                <span className="text-xs mt-1">
                  {isCapturingImages
                    ? "جاري الحفظ..."
                    : items.length > 0
                    ? "استبدال"
                    : "أضف للسلة"}
                </span>
              </button>
              <Link
                to="/cart"
                className="flex flex-col items-center p-2 text-[#563660] hover:text-[#4b2e55] transition-colors"
              >
                <ShoppingBasket size={18} />
                <span className="text-xs mt-1">السلة</span>
              </Link>
            </>
          )}
        </div>

        {/* Expandable Content Area */}
        {isOpen && activeSection && (
          <div
            ref={sidebarRef}
            className="absolute bottom-16 left-0 right-0 bg-white overflow-y-auto p-4 border-t border-gray-200 z-40"
            style={{ height: "40vh", overscrollBehavior: "contain" }}
          >
            {activeSection === "colors" && (
              <SubSidebarSection title="الألوان" isDefaultOpen>
                <ColorSection />
              </SubSidebarSection>
            )}
            {activeSection === "product-options" && (
              <SubSidebarSection title="خيارات المنتج" isDefaultOpen>
                <div className="space-y-4">
                  {/* Tab Navigation */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleProductTabChange("materials")}
                      className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
                        productOptionsTab === "materials"
                          ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      الخامات
                    </button>
                    <button
                      onClick={() => handleProductTabChange("sizes")}
                      className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
                        productOptionsTab === "sizes"
                          ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      المقاسات
                    </button>
                  </div>

                  {/* Tab Content */}
                  {productOptionsTab === "materials" && <MaterialSection />}
                  {productOptionsTab === "sizes" && <SizeSection />}
                </div>
              </SubSidebarSection>
            )}
            {activeSection === "extras" && (
              <SubSidebarSection
                title={`الإضافات - ${
                  activeView === "front"
                    ? "أمامي"
                    : activeView === "back"
                    ? "خلفي"
                    : activeView === "right"
                    ? "يمين"
                    : "يسار"
                }`}
                isDefaultOpen
              >
                {renderViewButtons()}
                {(activeView === "front" || activeView === "back") &&
                  renderContentButtons()}
                {activeView === "front" && (
                  <>
                    {activeContent === "logos" && <FrontLogoSection />}
                    {activeContent === "texts" && <FrontTextSection />}
                  </>
                )}
                {activeView === "back" && (
                  <>
                    {activeContent === "logos" && <BackLogoSection />}
                    {activeContent === "texts" && <BackTextSection />}
                  </>
                )}
                {activeView === "right" && <RightLogoSection />}
                {activeView === "left" && <LeftLogoSection />}
              </SubSidebarSection>
            )}
          </div>
        )}

        {/* Reset Confirmation Modal for Mobile */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  إعادة تعيين التصميم
                </h3>
                <p className="text-sm text-gray-600">
                  سيتم حذف جميع التخصيصات والعودة للتصميم الافتراضي. هل أنت
                  متأكد؟
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResetDesign}
                  className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  نعم، إعادة تعيين
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=swap"
        rel="stylesheet"
      />
      <div
        className={`${
          location.pathname.startsWith("/admin/orders/") &&
          location.pathname.endsWith("/edit")
            ? "h-full"
            : "h-screen"
        } bg-white shadow-xl transition-all duration-300 ${
          isOpen ? "w-[380px]" : "w-[60px]"
        } border-l border-gray-200`}
      >
        <div
          className={`flex ${
            location.pathname.startsWith("/admin/orders/") &&
            location.pathname.endsWith("/edit")
              ? "h-full"
              : "h-full"
          }`}
        >
          <div className="w-[60px] bg-gradient-to-b from-gray-50 to-white flex flex-col items-center py-6 border-r border-gray-100">
            <button
              onClick={() => handleSectionClick("colors")}
              className={`p-3 rounded-xl mb-3 ${
                activeSection === "colors"
                  ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                  : "bg-gray-200 text-gray-600"
              } hover:bg-gray-300 transition-all`}
              title="الألوان"
            >
              <Palette size={18} />
            </button>
            <button
              onClick={() => handleSectionClick("product-options")}
              className={`p-3 rounded-xl mb-3 ${
                activeSection === "product-options"
                  ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                  : "bg-gray-200 text-gray-600"
              } hover:bg-gray-300 transition-all`}
              title="خيارات المنتج"
            >
              <Package size={18} />
            </button>
            <button
              onClick={() => {
                handleSectionClick("extras");
                if (lastVisited.section === "extras") {
                  handleViewClick(lastVisited.view);
                  setActiveContent(lastVisited.content || "logos");
                } else {
                  handleViewClick("front");
                  setActiveContent("logos");
                }
              }}
              className={`p-3 rounded-xl mb-3 ${
                activeSection === "extras"
                  ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                  : "bg-gray-200 text-gray-600"
              } hover:bg-gray-300 transition-all`}
              title="الإضافات"
            >
              <ImagePlus size={18} />
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className={`p-3 rounded-xl mb-3 bg-orange-200 text-orange-600 hover:bg-orange-300 transition-all`}
              title="إعادة تعيين التصميم"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {isOpen && (
            <div
              className={`flex-1 overflow-y-auto p-6 bg-white ${
                location.pathname.startsWith("/admin/orders/") &&
                location.pathname.endsWith("/edit")
                  ? "h-full"
                  : "h-full"
              }`}
            >
              {!activeSection && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="mb-24">
                    <img src={Logo10} alt="Logo" className="max-w-full mb-4" />
                    <p className="text-sm font-bold bg-gradient-to-r from-[#7050a0] to-[#563660] text-transparent bg-clip-text">
                      في دار الجود، أنت المصمم – اختر، غيّر، أبدع.
                    </p>
                  </div>
                </div>
              )}
              {activeSection === "colors" && (
                <SubSidebarSection title="تخصيص الجاكيت" isDefaultOpen>
                  <ColorSection />
                </SubSidebarSection>
              )}
              {activeSection === "product-options" && (
                <SubSidebarSection title="خيارات المنتج" isDefaultOpen>
                  <div className="space-y-4">
                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => handleProductTabChange("materials")}
                        className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
                          productOptionsTab === "materials"
                            ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        الخامات
                      </button>
                      <button
                        onClick={() => handleProductTabChange("sizes")}
                        className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
                          productOptionsTab === "sizes"
                            ? "bg-gradient-to-r from-[#563660] to-[#7e4a8c] text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        المقاسات
                      </button>
                    </div>

                    {/* Tab Content */}
                    {productOptionsTab === "materials" && <MaterialSection />}
                    {productOptionsTab === "sizes" && <SizeSection />}
                  </div>
                </SubSidebarSection>
              )}
              {activeSection === "extras" && (
                <SubSidebarSection
                  title={`الإضافات - ${
                    activeView === "front"
                      ? "أمامي"
                      : activeView === "back"
                      ? "خلفي"
                      : activeView === "right"
                      ? "يمين"
                      : "يسار"
                  }`}
                  isDefaultOpen
                >
                  {renderViewButtons()}
                  {(activeView === "front" || activeView === "back") &&
                    renderContentButtons()}
                  {activeView === "front" && (
                    <>
                      {activeContent === "logos" && <FrontLogoSection />}
                      {activeContent === "texts" && <FrontTextSection />}
                    </>
                  )}
                  {activeView === "back" && (
                    <>
                      {activeContent === "logos" && <BackLogoSection />}
                      {activeContent === "texts" && <BackTextSection />}
                    </>
                  )}
                  {activeView === "right" && <RightLogoSection />}
                  {activeView === "left" && <LeftLogoSection />}
                </SubSidebarSection>
              )}
            </div>
          )}

          {/* Reset Confirmation Modal for Desktop */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    إعادة تعيين التصميم
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    سيتم حذف جميع التخصيصات الحالية (الألوان، الخامات، الشعارات،
                    النصوص) والعودة للتصميم الافتراضي. هذا الإجراء لا يمكن
                    التراجع عنه.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleResetDesign}
                    className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    نعم، إعادة تعيين
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomizationSidebar;
