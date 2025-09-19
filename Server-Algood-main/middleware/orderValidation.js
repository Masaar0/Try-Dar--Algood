import { ORDER_STATUSES } from "../models/Order.js";

/**
 * التحقق من صحة بيانات الطلب
 */
export const validateOrderData = (req, res, next) => {
  const { customerInfo, items, totalPrice } = req.body;
  const errors = [];

  // التحقق من معلومات العميل
  if (!customerInfo) {
    errors.push("معلومات العميل مطلوبة");
  } else {
    if (!customerInfo.name || !customerInfo.name.trim()) {
      errors.push("اسم العميل مطلوب");
    } else if (customerInfo.name.trim().length < 2) {
      errors.push("اسم العميل يجب أن يكون حرفين على الأقل");
    } else if (customerInfo.name.trim().length > 100) {
      errors.push("اسم العميل يجب أن يكون أقل من 100 حرف");
    }

    if (!customerInfo.phone || !customerInfo.phone.trim()) {
      errors.push("رقم الهاتف مطلوب");
    } else {
      const phoneRegex =
        /^(05|5|\+9665|9665|\+966[0-9]|966[0-9]|\+66[0-9]|66[0-9])[0-9]{8,10}$/;
      if (!phoneRegex.test(customerInfo.phone.replace(/[\s()-]/g, ""))) {
        errors.push(
          "رقم الهاتف غير صحيح. يجب أن يكون رقم سعودي أو تايلندي صحيح"
        );
      }
    }
  }

  // التحقق من العناصر
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push("يجب إضافة عنصر واحد على الأقل");
  } else {
    items.forEach((item, index) => {
      if (!item.id) {
        errors.push(`عنصر ${index + 1}: معرف العنصر مطلوب`);
      }
      if (!item.jacketConfig) {
        errors.push(`عنصر ${index + 1}: تكوين الجاكيت مطلوب`);
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`عنصر ${index + 1}: الكمية يجب أن تكون 1 على الأقل`);
      }
      if (!item.price || item.price < 0) {
        errors.push(
          `عنصر ${index + 1}: السعر يجب أن يكون أكبر من أو يساوي صفر`
        );
      }
    });
  }

  // التحقق من السعر الإجمالي
  if (!totalPrice || totalPrice <= 0) {
    errors.push("السعر الإجمالي يجب أن يكون أكبر من صفر");
  }

  // التحقق من تطابق السعر الإجمالي مع مجموع العناصر
  if (items && items.length > 0) {
    const calculatedTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (Math.abs(totalPrice - calculatedTotal) > 0.01) {
      errors.push("السعر الإجمالي لا يتطابق مع مجموع العناصر");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "أخطاء في البيانات",
      error: "VALIDATION_ERROR",
      details: errors,
    });
  }

  next();
};

/**
 * التحقق من صحة تحديث حالة الطلب
 */
export const validateStatusUpdate = (req, res, next) => {
  const { status, note } = req.body;
  const errors = [];

  if (!status) {
    errors.push("حالة الطلب الجديدة مطلوبة");
  } else if (!Object.values(ORDER_STATUSES).includes(status)) {
    errors.push("حالة الطلب غير صحيحة");
  }

  if (note && note.length > 500) {
    errors.push("الملاحظة يجب أن تكون أقل من 500 حرف");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "أخطاء في البيانات",
      error: "VALIDATION_ERROR",
      details: errors,
    });
  }

  next();
};

/**
 * التحقق من صحة تحديث بيانات الطلب
 */
export const validateOrderUpdate = (req, res, next) => {
  const { customerInfo, items, totalPrice } = req.body;
  const errors = [];

  // التحقق من معلومات العميل إذا تم توفيرها
  if (customerInfo) {
    if (customerInfo.name !== undefined) {
      if (!customerInfo.name || !customerInfo.name.trim()) {
        errors.push("اسم العميل مطلوب");
      } else if (customerInfo.name.trim().length < 2) {
        errors.push("اسم العميل يجب أن يكون حرفين على الأقل");
      } else if (customerInfo.name.trim().length > 100) {
        errors.push("اسم العميل يجب أن يكون أقل من 100 حرف");
      }
    }

    if (customerInfo.phone !== undefined) {
      if (!customerInfo.phone || !customerInfo.phone.trim()) {
        errors.push("رقم الهاتف مطلوب");
      } else {
        const phoneRegex =
          /^(05|5|\+9665|9665|\+966[0-9]|966[0-9]|\+66[0-9]|66[0-9])[0-9]{8,10}$/;
        if (!phoneRegex.test(customerInfo.phone.replace(/[\s()-]/g, ""))) {
          errors.push(
            "رقم الهاتف غير صحيح. يجب أن يكون رقم سعودي أو تايلندي صحيح"
          );
        }
      }
    }
  }

  // التحقق من العناصر إذا تم توفيرها
  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      errors.push("يجب إضافة عنصر واحد على الأقل");
    } else {
      items.forEach((item, index) => {
        if (!item.id) {
          errors.push(`عنصر ${index + 1}: معرف العنصر مطلوب`);
        }
        if (!item.jacketConfig) {
          errors.push(`عنصر ${index + 1}: تكوين الجاكيت مطلوب`);
        }
        if (!item.quantity || item.quantity < 1) {
          errors.push(`عنصر ${index + 1}: الكمية يجب أن تكون 1 على الأقل`);
        }
        if (!item.price || item.price < 0) {
          errors.push(
            `عنصر ${index + 1}: السعر يجب أن يكون أكبر من أو يساوي صفر`
          );
        }
      });
    }
  }

  // التحقق من السعر الإجمالي إذا تم توفيره
  if (totalPrice !== undefined) {
    if (!totalPrice || totalPrice <= 0) {
      errors.push("السعر الإجمالي يجب أن يكون أكبر من صفر");
    }
  }

  // التحقق من تطابق السعر الإجمالي مع مجموع العناصر
  if (items && items.length > 0 && totalPrice !== undefined) {
    const calculatedTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (Math.abs(totalPrice - calculatedTotal) > 0.01) {
      errors.push("السعر الإجمالي لا يتطابق مع مجموع العناصر");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "أخطاء في البيانات",
      error: "VALIDATION_ERROR",
      details: errors,
    });
  }

  next();
};

/**
 * التحقق من صحة البحث عن الطلب
 */
export const validateOrderSearch = (req, res, next) => {
  const { searchValue } = req.params;

  if (!searchValue || !searchValue.trim()) {
    return res.status(400).json({
      success: false,
      message: "رمز التتبع أو رقم الطلب مطلوب",
      error: "SEARCH_VALUE_REQUIRED",
    });
  }

  // التحقق من طول رمز البحث
  if (searchValue.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "رمز البحث يجب أن يكون 3 أحرف على الأقل",
      error: "SEARCH_VALUE_TOO_SHORT",
    });
  }

  next();
};
