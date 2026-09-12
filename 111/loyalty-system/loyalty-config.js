/**
 * Loyalty System Configuration
 * High-performance, secure configuration for the loyalty points system
 */

window.LoyaltyConfig = {
  // API Settings
  api: {
    // Base URL - Change this to your actual API server
    baseURL: 'https://bh.shabakaty.site',

    // Endpoints
    endpoints: {
      login: '/api/v1/auth/login',
      register: '/api/v1/auth/register',
      addPoints: '/api/v1/points/add',
      getUser: '/api/loyalty/user',
      getPoints: '/api/v1/points/balance'
    },

    // Request settings
    timeout: 20000,        // 5 seconds timeout
    retries: 0,           // Number of retries on failure
    retryDelay: 1000      // Delay between retries (1 second)
  },

  // Secure storage settings
  storage: {
    key: 'loyaltyUser_v2',
    ttl: 1728000000,                // 24 hours
    encrypt: true,
    salt: 'secure_loyalty_salt_2025'
  },

  // UI Settings
  ui: {
    position: 'bottom-left',  // Options: bottom-left, bottom-right, top-left, top-right

    // Colors
    colors: {
      primary: '#F44336',
      secondary: '#F44336',
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    },

    // Animations
    animations: true,
    animationDuration: 300,

    // Texts
    texts: {
      registerButton: 'سجل  في نظام النقاط ',
      pointsButton: 'نقاطي ',
      modalTitle: 'تسجيل في برنامج الولاء',
      phoneLabel: 'رقم الهاتف',
      phonePlaceholder: '967xxxxxxxxx',
      registerSubmit: 'تسجيل',
      loading: 'جاري التحميل...',
      success: 'تم التسجيل بنجاح!',
      pointsAdded: 'تم اضافة {points} نقطة لنقاطك!',
      totalPoints: 'المجموع: {total} نقطة',
      errorNetwork: 'فشل الاتصال',
      errorTimeout: 'انتهت مهلة الطلب',
      errorInvalid: 'رقم الهاتف غير صحيح',
      errorExists: 'الرقم مسجل مسبقاً'
    }
  },

  // Points settings
  points: {
    conversionRate: 0.1,        // 10% conversion rate
    minCardValue: 100,          // Minimum card value to earn points
    roundPoints: true
  },

  // Performance settings
  performance: {
    lazyLoad: true,
    lazyLoadDelay: 1000,
    cacheEnabled: true,
    cacheTTL: 300000,            // 5 minutes
    debounceDelay: 300
  },

  // Security settings
  security: {
    validatePhone: true,
    phonePattern: /^(967|00967|\+967)?[0-9]{9}$/,
    sanitizeInput: true,
    rateLimitEnabled: true,
    maxRequests: 5,
    rateLimitWindow: 60000
  },

  // Analytics settings
  analytics: {
    enabled: false,
    trackRegistration: true,
    trackPoints: true,
    trackErrors: true
  },

  // Development mode
  development: {
    mode: false,
    mockAPI: false,
    verboseLogging: false,
    showNotifications: true
  }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.LoyaltyConfig;
}