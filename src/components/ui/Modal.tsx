import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ModalOptions } from "../../hooks/useModal";

export interface ModalProps {
  isOpen: boolean;
  shouldRender: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string | React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  backdropClassName?: string;
  options?: ModalOptions;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  position?: "center" | "top" | "bottom";
  compactHeader?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[95vw] max-h-[95vh]",
};

const positionClasses = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-20",
  bottom: "items-end justify-center pb-20",
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  shouldRender,
  onClose,
  children,
  title,
  showCloseButton = true,
  className = "",
  contentClassName = "",
  backdropClassName = "",
  options = {},
  size = "md",
  position = "center",
  compactHeader = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const {
    closeOnBackdropClick = true,
    animationDuration = 300,
    zIndex = 9999,
  } = options;

  // معالجة النقر على الخلفية
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  // منع انتشار الأحداث من المحتوى
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // تركيز النافذة عند فتحها
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animationDuration / 1000 }}
          className={`fixed inset-0 flex ${positionClasses[position]} ${
            size === "full" ? "p-0" : "p-4"
          } modal-portal ${backdropClassName}`}
          style={{
            zIndex,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: size === "full" ? "none" : "blur(8px)",
          }}
          onClick={handleBackdropClick}
          data-modal="true"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: animationDuration / 1000,
              ease: "easeOut",
            }}
            className={`${
              size === "full"
                ? "w-full h-full"
                : `bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} border border-gray-100`
            } ${contentClassName} ${className}`}
            onClick={handleContentClick}
            data-modal="true"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
          >
            {/* Header - إخفاء للنوافذ بحجم كامل */}
            {(title || showCloseButton) && size !== "full" && (
              <div
                className={`flex items-center justify-between border-b border-gray-200 ${
                  compactHeader ? "p-3" : "p-6"
                }`}
              >
                {title && (
                  <h2
                    id="modal-title"
                    className={`font-medium text-gray-900 ${
                      compactHeader ? "text-sm" : "text-xl"
                    }`}
                  >
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className={`hover:bg-gray-100 rounded-lg transition-colors duration-200 ${
                      compactHeader ? "p-1" : "p-2"
                    }`}
                    aria-label="إغلاق النافذة"
                  >
                    <X
                      className={`text-gray-500 ${
                        compactHeader ? "w-4 h-4" : "w-5 h-5"
                      }`}
                    />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div
              className={
                size === "full"
                  ? "w-full h-full"
                  : title || showCloseButton
                  ? compactHeader
                    ? "p-4"
                    : "p-6"
                  : "p-0"
              }
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
