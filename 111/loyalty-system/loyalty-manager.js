/**
 * Loyalty System - Main Manager
 * High-performance, secure main manager for the loyalty system
 */

class LoyaltyManager {
  constructor() {
    this.config = window.LoyaltyConfig;
    this.storage = null;
    this.api = null;
    this.user = null;
    this.initialized = false;
    this.debugMode = this.config.development?.mode || false;
  }

  /**
   * Initialize the system
   * @returns {Promise<boolean>} Initialization success
   */
  async init() {
    try {
      if (this.initialized) {
        this.log('Already initialized');
        // Still update UI to reflect current state
        this.updateUI();
        return true;
      }

      this.log('Initializing Loyalty System...');

      // Create instances
      this.storage = new window.LoyaltyStorage(this.config);
      
      console.log('stoarge in manger')
      this.api = new window.LoyaltyAPI(this.config);

      // Save for global access
      window.loyaltyStorageInstance = this.storage;
      window.loyaltyAPIInstance = this.api;

      // Load user from storage
      this.user = this.storage.load();
      console.log(this.user)


      // Check token validity
      if (this.user && !this.isTokenValid(this.user.token)) {
        this.log('Token expired, logging out');
        this.logout();
      }

      this.initialized = true;
      this.log('Initialization complete', { isLoggedIn: this.isLoggedIn() });

      // Update UI
      this.updateUI();

      return true;

    } catch (error) {
      this.logError('Initialization failed', error);
      return false;
    }
  }

  /**
   * Check login status
   * @returns {boolean} Logged in status
   */
  isLoggedIn() {
    if (!this.user) return false;
    
    // Check if user has required fields
    if (!this.user.userId || !this.user.token) return false;
    
    // Check if token is still valid (not expired)
    return this.isTokenValid(this.user.token);
  }

  /**
   * Register new user
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} Registration result
   */
  async register(phone,name,password) {
    try {
      this.log('Registering user', { phone });

      // Validate phone
      if (!phone || phone.trim() === '') {
        return {
          success: false,
          error: 'Please enter phone number'
        };
      }

      // Send registration request
      const response = await this.api.register(phone,name,password);

      if (response.success) {
        // Save user data
        this.user = response.data;
        this.storage.save(this.user);

        this.log('Registration successful', this.user);

        // Update UI
        this.updateUI();

        // Track analytics (if enabled)
        this.trackEvent('user_registered', { userId: this.user.userId });

        return {
          success: true,
          message: response.message || this.config.ui.texts.success,
          data: this.user,
          status:response.status
        };
      }

      return {
        success: false,
        error: response.message || 'Registration failed',
        status:response.status

      };

    } catch (error) {
      this.logError('Registration error', error);

      return {
        success: false,
        error: this.getErrorMessage(error),
  
      };
    }
  }

  /**
   * Register new user
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} Registration result
   */
  async login(phone,password) {
    try {
      this.log('Logging in user', { phone });

      // Validate phone
      if (!phone || phone.trim() === '') {
        return {
          success: false,
          error: 'Please enter phone number'
        };
      }

      // Send login request
      const response = await this.api.login(phone,password);

      if (response.success) {
        // Extract user data and token from the response structure
        const userData = {
          userId: response.data.user.id,
          phone: response.data.user.phone,
          username: response.data.user.username,
          points: response.data.user.points,
          token: response.data.access_token,
          createdAt: response.data.user.created_at
        };

        // Save user data
        this.user = userData;
        this.storage.save(this.user);

        this.log('Login successful', this.user);

        // Update UI
        this.updateUI();

        // Track analytics (if enabled)
        this.trackEvent('user_logged_in', { userId: this.user.userId });

        return {
          success: true,
          message: response.message || this.config.ui.texts.success,
          data: this.user
        };
      }

      return {
        success: false,
        error: response.message || 'Login failed'
      };

    } catch (error) {
      this.logError('Login error', error);

      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Add points for card login
   * @param {string} cardNumber - Card number
   * @param {number} cardValue - Card value
   * @returns {Promise<Object>} Result
   */
  async addPointsForCard(cardNumber) {
    try {
      if (!this.isLoggedIn()) {
        this.log('User not logged in, skipping points');
        return { success: false, skipped: true };
      }

      this.log('Adding points for card', { cardNumber });

      // Check minimum value
      // if (cardNumber < this.config.points.minCardValue) {
      //   this.log('Card value below minimum');
      //   return { success: false, skipped: true };
      // }

      // Calculate points
   

      // Send request
      const response = await this.api.addPoints(cardNumber);
      console.log(response.status)

      if (response.success) {
        // Update points locally
        const previousPoints = this.user.points || 0;
        this.user.points = response.data.new_balance;
        
        // this.user.lastPointsUpdate = Date.now();
        this.storage.save(this.user);

        this.log('Points added successfully', response.data);
        this.updatePointsBadge(this.user.points)

        // Track analytics
        this.trackEvent('points_added', {
          userId: this.user.userId,
          points: response.data.pointsAdded,
          cardNumber
        });

 setTimeout(function () {
               Banner.show(result.message, "success");
    }, 4000); // 4000 = 4 ثواني

        return {
          success: true,
          data: response.data,
          message:response.message
          //  this.config.ui.texts.pointsAdded
          //   .replace('{points}', response.data.points_added)
        };
      }

      return {
        success: false,
        error: response.message || 'Failed to add points'
      };

    } catch (error) {
      this.logError('Add points error', error);

      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }
  async getUserPoint() {
    try {
      if (!this.isLoggedIn()) {
        this.log('User not logged in, skipping points');
        return { success: false, skipped: true };
      }

      // this.log('Adding points for card', { cardNumber });

      // Check minimum value
      // if (cardNumber < this.config.points.minCardValue) {
      //   this.log('Card value below minimum');
      //   return { success: false, skipped: true };
      // }

      // Calculate points
   

      // Send request
      const response = await this.api.getPoints();
      console.log(response.status)

      if (response.success) {
        // Update points locally
        const previousPoints = this.user.points || 0;
        this.user.points = response.data.points;
        
        // this.user.lastPointsUpdate = Date.now();
        this.storage.save(this.user);

        this.log('Points get successfully', response.data);
        this.updatePointsBadge(this.user.points)

        // Track analytics


        return {
          success: true,
          data: response.data,
 
          //  this.config.ui.texts.pointsAdded
          //   .replace('{points}', response.data.points_added)
        };
      }

      return {
        success: false,
        error:  'Failed to get points'
      };

    } catch (error) {
      this.logError('get points error', error);

      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Get current user
   * @returns {Object|null} User data
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Get user points
   * @returns {number} Points count
   */
  getPoints() {
    return this.user?.points || 0;
  }

  // /**
  //  * Refresh user data from server
  //  * @returns {Promise<boolean>} Refresh success
  //  */
  // async refreshUserData() {
  //   try {
  //     if (!this.isLoggedIn()) return false;

  //     this.log('Refreshing user data');

  //     const response = await this.api.getUser(this.user.phone);

  //     if (response.success) {
  //       // Update local data
  //       this.user = { ...this.user, ...response.data };
  //       this.storage.save(this.user);
  //       this.updateUI();

  //       return true;
  //     }

  //     return false;

  //   } catch (error) {
  //     this.logError('Refresh user data error', error);
  //     return false;
  //   }
  // }

  /**
   * Logout user
   */
  logout() {
    this.log('Logging out');

    this.user = null;
    this.storage.clear();
    this.api.clearCache();

    this.updateUI();

    // Track analytics
    this.trackEvent('user_logged_out');
  }

  /**
   * Public method to logout from anywhere on the page
   */
  static logout_loy() {
    if (window.LoyaltyManager) {
      window.LoyaltyManager.logout();
      console.log('[LoyaltyManager] User logged out successfully');
    }
  }

  /**
   * Update UI elements
   */
  updateUI() {
    const button = document.getElementById('loyalty-floating-btn');
    if (!button) return;

    if (this.isLoggedIn()) {
      // User logged in - show "My Points" button
      MarqueeBanner.hide();
      button.innerHTML = `
        <span class="fab-icon">♦</span>
        <span class="fab-text">${this.config.ui.texts.pointsButton}</span>
      `;

      // Add logged-in class for special styling
      button.classList.add('logged-in');
      button.classList.remove('logged-out');

     button.onclick=async() =>{
       
          console.log('logind in true')
         const original = button.innerHTML;

        button.innerHTML = `
            <span class="loader"></span>
            <span class="fab-text">جاري الفتح...</span>
        `;
        button.disabled = true;

        window.LoyaltyManager.openPointsPage(button, original);

          }

      // Update points badge
      this.updatePointsBadge(this.getPoints());

    } else {
      // User not logged in - show "Register" button
      MarqueeBanner.show(
    "⚡ تنبيه: انت مش مسجل في نظام النقاط ولن يتم احتساب لك نقاط مباشره عند تسجيل الدخول في الكرت!",
    "#e63946",  // خلفية
    "#fff"       // نص
);
      button.innerHTML = `
        <span class="fab-icon">★</span>
        <span class="fab-text">${this.config.ui.texts.registerButton}</span>
      `;

      // Remove logged-in class and add logged-out class
      button.classList.remove('logged-in');
      button.classList.add('logged-out');

      button.onclick = () => this.openRegistrationModal();

      // Hide badge
      this.updatePointsBadge(0);
    }
  }

  /**
   * Update points badge
   * @param {number} points - Points count
   */
  updatePointsBadge(points) {
    let badge = document.querySelector('.fab-badge');

    if (!badge) {
      const button = document.getElementById('loyalty-floating-btn');
      if (!button) return;

      badge = document.createElement('span');
      badge.className = 'fab-badge';
      button.appendChild(badge);
    }

    if (points ) {
      badge.textContent = points;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  /**
   * Open registration modal
   */
  openRegistrationModal() {
    if (window.LoyaltyModal) {
      window.LoyaltyModal.open();
    } else {
      this.logError('LoyaltyModal not loaded');
    }
  }

  /**
   * Open points page
   */
//   openPointsPage() {
//     if (!this.isLoggedIn()) {
//       this.openRegistrationModal();
//       return;
//     }
 

//     // For Flask backend that uses session, we need to go through a redirect page
//     // that will set the session and then redirect to the loyalty page
//     // const redirectURL = `http://wana.localhost:5001/`;
//     // window.open(redirectURL, '_blank');
//     const token=window.loyaltyStorageInstance.getAccessToken();
//     console.log(token)
//        this.openLoyaltyAutoLogin({
//                     serverUrl: window.LoyaltyConfig.api.baseURL,
//                     accessToken: token
//                 });
//   }
// async  openLoyaltyAutoLogin(options = {}) {
//     const {
//         serverUrl = FLASK_SERVER_URL,
//         accessToken = null,
//         onSuccess = null,
//         onError = null
//     } = options;
//     const SEND_CREDENTIALS = false;
//     try {
//         // Show loading state if button is present
      

//         // Prepare request headers
//         const headers = {
//             'Content-Type': 'application/json'
//         };

//         // Add Bearer token for external authentication
//         if (accessToken) {
//             headers['Authorization'] = `Bearer ${accessToken}`;
//         }

//         // Call Flask API to generate one-time token
//         const response = await fetch(`${serverUrl}/auth/generate-one-time-token`, {
//             method: 'POST',
//             headers: headers,
//             credentials: SEND_CREDENTIALS ? 'include' : 'omit',
//             mode: 'cors' // Enable CORS for cross-origin requests
//         });

//         const data = await response.json();

//         // Reset button state
      
//         // Check if token generation was successful
//         if (!data.success || !response.ok) {
//             const errorMsg = data.error || 'فشل في إنشاء رابط تسجيل الدخول';
//             console.error('Token generation failed:', data.error_en || data.error);
           

//             if (onError) {
//                 onError(data);
//             }
//             return;
//         }

//         // Construct auto-login URL
//         const autoLoginUrl = `${serverUrl}/auth/auto-login?ott=${data.one_time_token}`;

//         // Open in new tab/window
//         const newWindow = window.open(autoLoginUrl, '_blank');

//         // Check if popup was blocked
//         if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
//             // Popup blocked - create fallback link
         
//         } else {
          

//             if (onSuccess) {
//                 onSuccess(data, autoLoginUrl);
//             }
//         }

//     } catch (error) {
//         // Handle network or other errors
//         console.error('Error in auto-login:', error);
//         const errorMsg = 'حدث خطأ في الاتصال. تأكد من رابط السيرفر.';
    

//         // Reset button state
      

//         if (onError) {
//             onError(error);
//         }
//     }
// }
openPointsPage(button = null, originalHTML = null) {
    if (!this.isLoggedIn()) {
        this.openRegistrationModal();
        return;
    }

    const token = window.loyaltyStorageInstance.getAccessToken();

    this.openLoyaltyAutoLogin({
        serverUrl: window.LoyaltyConfig.api.baseURL,
        accessToken: token,
        triggerButton: button,          // ← الزر
        originalBtnHTML: originalHTML   // ← المحتوى الأصلي
    });
}


async openLoyaltyAutoLogin(options = {}) {
    const {
        serverUrl = FLASK_SERVER_URL,
        accessToken = null,
        onSuccess = null,
        onError = null,
        triggerButton = null,     // ← زر الذي فعل العملية
        originalBtnHTML = null    // ← محتوى الزر الأصلي
    } = options;

    const SEND_CREDENTIALS = false;

    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${serverUrl}/auth/generate-one-time-token`, {
            method: 'POST',
            headers: headers,
            credentials: SEND_CREDENTIALS ? 'include' : 'omit',
            mode: 'cors'
        });

        const data = await response.json();

        if (!data.success || !response.ok) {
            console.error("Token generation failed:", data.error_en || data.error);

            // 🔥 استرجاع الزر في حالة الخطأ
            if (triggerButton && originalBtnHTML) {
                triggerButton.innerHTML = originalBtnHTML;
                triggerButton.disabled = false;
            }

            if (onError) {
                onError(data);
            }
            return;
        }

        const autoLoginUrl = `${serverUrl}/auth/auto-login?ott=${data.one_time_token}`;

        const newWindow = window.open(autoLoginUrl, '_blank');

        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // popup blocked

            // 🔥 استرجاع الزر هنا كذلك
            if (triggerButton && originalBtnHTML) {
                triggerButton.innerHTML = originalBtnHTML;
                triggerButton.disabled = false;
            }

        } else {
            if (onSuccess) {
                onSuccess(data, autoLoginUrl);
            }
        }

    } catch (error) {
        console.error('Error in auto-login:', error);

        // 🔥 في حالة الخطأ
        if (triggerButton && originalBtnHTML) {
            triggerButton.innerHTML = originalBtnHTML;
            triggerButton.disabled = false;
        }

        if (onError) {
            onError(error);
        }
    }finally{
         triggerButton.innerHTML = originalBtnHTML;
            triggerButton.disabled = false;
    }
}


  /**
   * Check token validity
   * @param {string} token - JWT token
   * @returns {boolean} Validity
   */
  isTokenValid(token) {
    try {
      if (!token) return false;

      // Decode JWT token
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp) {
        return payload.exp > Date.now() / 1000;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get appropriate error message
   * @param {Error} error - Error object
   * @returns {string} Error message
   */
  getErrorMessage(error) {
    const message = error.message || error.toString();

    const errorMessages = {
      'Failed to fetch': this.config.ui.texts.errorNetwork,
      'Request timeout': this.config.ui.texts.errorTimeout,
      'Invalid phone number': this.config.ui.texts.errorInvalid
    };

    return errorMessages[message] || message;
  }

  /**
   * Track event (Analytics)
   * @param {string} eventName - Event name
   * @param {Object} eventData - Event data
   */
  trackEvent(eventName, eventData = {}) {
    if (!this.config.analytics?.enabled) return;

    try {
      // Can integrate with Google Analytics or other systems
      if (window.gtag) {
        window.gtag('event', eventName, eventData);
      }

      this.log('Event tracked', { eventName, eventData });

    } catch (error) {
      // Ignore tracking errors
    }
  }

  /**
   * Log message
   * @param {string} message - Message
   * @param {*} data - Additional data
   */
  log(message, data = null) {
    if (this.debugMode) {
      console.log(`[LoyaltyManager] ${message}`, data || '');
    }
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    console.error(`[LoyaltyManager] ${message}:`, error);
  }
}

// Create global instance
window.LoyaltyManager = new LoyaltyManager();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoyaltyManager;
}