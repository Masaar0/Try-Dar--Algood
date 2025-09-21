// خدمة المصادقة للوحة التحكم
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  expiresIn: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class AuthService {
  private baseUrl = "http://localhost:3001/api/auth";
  private tokenKey = "admin_token";
  private authCacheKey = "admin_auth_cache";
  private cacheExpiryKey = "admin_auth_expiry";
  private backgroundRefreshInterval: number | null = null;

  // Cache مؤقت لحالة المصادقة (5 دقائق)
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق بالميلي ثانية

  /**
   * تسجيل دخول المدير
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result: ApiResponse<AuthResponse> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "فشل في تسجيل الدخول");
      }

      // حفظ الرمز في localStorage
      this.setToken(result.data.token);

      return result.data;
    } catch (error) {
      console.error("Login error:", error);
      throw new Error(
        error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول"
      );
    }
  }

  /**
   * التحقق من صحة الجلسة مع Cache محسن
   */
  async verifySession(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) {
        this.clearAuthCache();
        return false;
      }

      // فحص Cache أولاً
      const cachedResult = this.getCachedAuthResult();
      if (cachedResult !== null) {
        return cachedResult;
      }

      // فحص انتهاء صلاحية الرمز محلياً
      if (this.isTokenExpired(token)) {
        this.clearAuthCache();
        this.removeToken();
        return false;
      }

      // إرسال طلب للباك إند فقط إذا لم يكن هناك cache صالح
      const response = await fetch(`${this.baseUrl}/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const isValid = response.ok;

      // حفظ النتيجة في Cache
      this.setCachedAuthResult(isValid);

      return isValid;
    } catch (error) {
      console.error("Session verification error:", error);
      this.clearAuthCache();
      return false;
    }
  }

  /**
   * التحقق من انتهاء صلاحية الرمز محلياً
   */
  private isTokenExpired(token: string): boolean {
    try {
      // فك تشفير الرمز للتحقق من انتهاء الصلاحية
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // التحقق من انتهاء الصلاحية مع هامش أمان (5 دقائق)
      const safetyMargin = 5 * 60; // 5 دقائق بالثواني
      return payload.exp < currentTime + safetyMargin;
    } catch (error) {
      console.error("Token parsing error:", error);
      return true; // إذا فشل الفحص، اعتبر الرمز منتهي الصلاحية
    }
  }

  /**
   * الحصول على نتيجة Cache المصادقة
   */
  private getCachedAuthResult(): boolean | null {
    try {
      const cachedData = localStorage.getItem(this.authCacheKey);
      const expiryTime = localStorage.getItem(this.cacheExpiryKey);

      if (!cachedData || !expiryTime) {
        return null;
      }

      const now = Date.now();
      const expiry = parseInt(expiryTime, 10);

      if (now > expiry) {
        this.clearAuthCache();
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      console.error("Cache read error:", error);
      this.clearAuthCache();
      return null;
    }
  }

  /**
   * حفظ نتيجة المصادقة في Cache
   */
  private setCachedAuthResult(isValid: boolean): void {
    try {
      const expiryTime = Date.now() + this.CACHE_DURATION;
      localStorage.setItem(this.authCacheKey, JSON.stringify(isValid));
      localStorage.setItem(this.cacheExpiryKey, expiryTime.toString());
    } catch (error) {
      console.error("Cache write error:", error);
    }
  }

  /**
   * مسح Cache المصادقة
   */
  private clearAuthCache(): void {
    try {
      localStorage.removeItem(this.authCacheKey);
      localStorage.removeItem(this.cacheExpiryKey);
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  /**
   * تسجيل خروج المدير
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${this.baseUrl}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.removeToken();
      this.clearAuthCache(); // مسح Cache عند تسجيل الخروج
    }
  }

  /**
   * حفظ الرمز في localStorage
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(this.tokenKey, token);
      // مسح Cache القديم عند حفظ رمز جديد
      this.clearAuthCache();
    } catch (error) {
      console.error("Error saving token:", error);
    }
  }

  /**
   * الحصول على الرمز من localStorage
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  /**
   * حذف الرمز من localStorage
   */
  removeToken(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      this.clearAuthCache(); // مسح Cache عند حذف الرمز
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }

  /**
   * التحقق من وجود رمز صحيح
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * تحديث الجلسة في الخلفية
   */
  async refreshSessionInBackground(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      // فحص Cache أولاً
      const cachedResult = this.getCachedAuthResult();
      if (cachedResult !== null) {
        return cachedResult;
      }

      // تحديث الجلسة في الخلفية
      const response = await fetch(`${this.baseUrl}/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const isValid = response.ok;
      this.setCachedAuthResult(isValid);

      return isValid;
    } catch (error) {
      console.error("Background session refresh error:", error);
      return false;
    }
  }

  /**
   * بدء تحديث دوري للجلسة
   */
  startBackgroundRefresh(intervalMinutes: number = 10): void {
    // إيقاف أي تحديث سابق
    this.stopBackgroundRefresh();

    const intervalMs = intervalMinutes * 60 * 1000;

    // تحديث فوري أولاً
    this.refreshSessionInBackground();

    // ثم تحديث دوري
    const intervalId = setInterval(() => {
      this.refreshSessionInBackground();
    }, intervalMs);

    // حفظ معرف الفاصل للتحكم به لاحقاً
    this.backgroundRefreshInterval = intervalId;
  }

  /**
   * إيقاف التحديث الدوري للجلسة
   */
  stopBackgroundRefresh(): void {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
      this.backgroundRefreshInterval = null;
    }
  }
}

export const authService = new AuthService();
export default authService;
