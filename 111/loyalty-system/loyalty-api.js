/**
 * Loyalty System - Secure API Handler
 * High-performance, secure API communication with rate limiting and caching
 */

class LoyaltyAPI {
  constructor(config) {
    this.config = config.api;
    this.security = config.security;
    this.debugMode = config.development?.mode || false;

    // Memory cache for requests
    this.cache = new Map();

    // Rate limiter
    this.rateLimiter = {
      requests: [],
      maxRequests: this.security.maxRequests || 5,
      window: this.security.rateLimitWindow || 60000
    };
  }

  /**
   * Send HTTP request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
async request(endpoint, options = {}) {
  try {
    // Check rate limiting
    if (this.security.rateLimitEnabled && !this.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please wait.');
    }

    const url = this.config.baseURL + endpoint;

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Add authorization header if token exists
    const user = this.getUserFromStorage();
    if (user?.token) {
      finalOptions.headers['Authorization'] = `Bearer ${user.token}`;
    }

    this.log('Making request', { url, method: finalOptions.method });

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal,
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      // 🚨 نقطة المعالجة الرئيسية للأخطاء (Handling !response.ok)
      if (!response.ok) {
        
        let errorData = null;
        let serverMessage = response.statusText;

        try {
          // محاولة قراءة جسم الاستجابة (Body) للحصول على رسالة الخطأ المفصلة
          errorData = await response.json();
          // نفترض أن الرسالة المفصلة موجودة في حقل 'message' أو 'error'
          serverMessage = errorData.message || errorData.error || response.statusText;
        } catch (e) {
          // فشل قراءة JSON (ربما الاستجابة ليست JSON)، نستخدم الرسالة الافتراضية
          this.logError('Failed to parse error response body:', e);
        }

        // إنشاء كائن خطأ مخصص (Custom Error Object) يحمل كافة التفاصيل
        const error = new Error(`Request failed with status ${response.status}: ${serverMessage}`);
        
        // إضافة الخصائص الإضافية التي قد يحتاجها المُستدعي (Caller)
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = errorData; // البيانات المرجعة من السيرفر (إذا وجدت)

        // مثال على التعامل مع رموز حالة محددة (مثل 401)
        if (response.status === 401) {
            this.log('Unauthorized request detected. Clearing user data.');
            // يمكنك هنا استدعاء دالة تسجيل الخروج التلقائي: this.logoutUser();
        }
        
        throw error; // رمي كائن الخطأ المفصل
      }
      // ------------------------------------------------------------

      const data = await response.json();
      this.log('Request successful', data);

      return data;

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // إذا لم يكن الخطأ HTTP (مثل خطأ الشبكة)، ارمه كما هو
      throw fetchError;
    }

  } catch (error) {
    this.logError('Request failed in top level handler', error);
    // تأكد من رمي الخطأ ليتمكن الكود الذي استدعى request من معالجته
    throw error;
  }
}

  /**
   * Send request with retry mechanism
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @param {number} retries - Remaining retries
   * @returns {Promise<Object>} Response
   */
  async requestWithRetry(endpoint, options = {}, retries = this.config.retries) {
    try {
      return await this.request(endpoint, options);
    } catch (error) {
      if (retries > 0) {
        this.log(`Retrying... (${retries} attempts left)`);
        await this.delay(this.config.retryDelay);
        return this.requestWithRetry(endpoint, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Register new user
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} User data
   */
  async register(phone,name,password) {
    try {
      // Validate phone number
      // if (this.security.validatePhone && !this.isValidPhone(phone)) {
      //   throw new Error('Invalid phone number');
      // }

      // Sanitize phone number
      // const cleanPhone = this.sanitizePhone(phone);

      const response = await this.requestWithRetry(
        this.config.endpoints.register,
        {
          method: 'POST',
          body: JSON.stringify({
            username: name,
            phone: phone,
            password: password,
         
          })
        }
      );

      return response;

    } catch (error) {
      this.logError('Registration failed', error);
      throw error;
    }
  }

  /**
   * Add points for user
   * @param {Object} pointsData - Points data
   * @returns {Promise<Object>} Result
   */
  async addPoints(pointsData) {
    try {
      const response = await this.requestWithRetry(
        this.config.endpoints.addPoints,
        {
          method: 'POST',
          body: JSON.stringify({
           coupon_code:pointsData
          })
        }
      );

      return response;

    } catch (error) {
      this.logError('Add points failed', error);
      throw error;
    }
  }
  /**
   * Register new user
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} User data
   */
  async login(phone,password) {
    try {
      // Validate phone number
      // if (this.security.validatePhone && !this.isValidPhone(phone)) {
      //   throw new Error('Invalid phone number');
      // }

      // Sanitize phone number
      // const cleanPhone = this.sanitizePhone(phone);

      const response = await this.requestWithRetry(
        this.config.endpoints.login,
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone,
            password:password,
            // source: 'hotspot',
            // timestamp: new Date().toISOString()
          })
        }
      );

      return response;

    } catch (error) {
      this.logError('Registration failed', error);
      throw error;
    }
  }

  /**
   * Add points for user
   * @param {Object} pointsData - Points data
   * @returns {Promise<Object>} Result
   */

  /**
   * Get user data
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} User data
   */
  async getUser(phone) {
    try {
      const cacheKey = `user_${phone}`;

      // Check cache
      if (this.hasValidCache(cacheKey)) {
        this.log('Returning cached user data');
        return this.getFromCache(cacheKey);
      }

      const response = await this.requestWithRetry(
        `${this.config.endpoints.getUser}/${phone}`
      );

      // Save to cache
      this.saveToCache(cacheKey, response);

      return response;

    } catch (error) {
      this.logError('Get user failed', error);
      throw error;
    }
  }

  /**
   * Get user points
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Points data
   */
  async getPoints() {
    try {
      const response = await this.requestWithRetry(
        `${this.config.endpoints.getPoints}`
      );

      return response;

    } catch (error) {
      this.logError('Get points failed', error);
      throw error;
    }
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number
   * @returns {boolean} Validity
   */
  isValidPhone(phone) {
    return this.security.phonePattern.test(phone);
  }

  /**
   * Sanitize phone number
   * @param {string} phone - Phone number
   * @returns {string} Clean phone number
   */
  sanitizePhone(phone) {
    // Remove spaces and special characters
    let clean = phone.replace(/[\s\-\(\)]/g, '');

    // Standardize format (967xxxxxxxxx)
    if (clean.startsWith('00967')) {
      clean = clean.slice(2);
    } else if (clean.startsWith('+967')) {
      clean = clean.slice(1);
    } else if (!clean.startsWith('967') && clean.length === 9) {
      clean = '967' + clean;
    }

    return clean;
  }

  /**
   * Check if request can be made (rate limiting)
   * @returns {boolean} Can make request
   */
  canMakeRequest() {
    const now = Date.now();

    // Remove old requests
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => now - time < this.rateLimiter.window
    );

    // Check limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      return false;
    }

    // Add current request
    this.rateLimiter.requests.push(now);
    return true;
  }

  /**
   * Save to cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {*} Cached data
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Check if cache is valid
   * @param {string} key - Cache key
   * @returns {boolean} Validity
   */
  hasValidCache(key) {
    if (!this.cache.has(key)) return false;

    const cached = this.cache.get(key);
    const cacheTTL = window.LoyaltyConfig?.performance?.cacheTTL || 300000;
    const age = Date.now() - cached.timestamp;

    return age < cacheTTL;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.log('Cache cleared');
  }

  /**
   * Get user from storage with cookie fallback
   * @returns {Object|null} User data
   */
  getUserFromStorage() {
    try {
      // First try the global storage instance
      if (window.loyaltyStorageInstance) {
        return window.loyaltyStorageInstance.load();
      }
      
      // Fallback to localStorage directly
      const storageKey = window.LoyaltyConfig?.storage?.key || 'loyaltyUser_v2';
      let data = null;
      
      // Try localStorage
      try {
        data = localStorage.getItem(storageKey);
      } catch (e) {
        // localStorage not available
      }
      
      // If not found, try cookies
      if (!data) {
        try {
          const name = storageKey + "=";
          const decodedCookie = decodeURIComponent(document.cookie);
          const ca = decodedCookie.split(';');
          for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
              c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
              data = decodeURIComponent(c.substring(name.length, c.length));
              break;
            }
          }
        } catch (e) {
          // Cookies not available
        }
      }
      
      if (!data) return null;
      
      // Decrypt if needed
      const config = window.LoyaltyConfig;
      if (config?.storage?.encrypt) {
        // Simple XOR decryption with salt for demonstration
        const decoded = decodeURIComponent(atob(data));
        let result = '';
        const key = config.storage.salt;
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(
            decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
          );
        }
        return JSON.parse(result);
      } else {
        return JSON.parse(data);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message
   * @param {string} message - Message
   * @param {*} data - Additional data
   */
  log(message, data = null) {
    if (this.debugMode) {
      console.log(`[LoyaltyAPI] ${message}`, data || '');
    }
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    console.error(`[LoyaltyAPI] ${message}:`, error);
  }
}

// Export for global use
window.LoyaltyAPI = LoyaltyAPI;

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoyaltyAPI;
}