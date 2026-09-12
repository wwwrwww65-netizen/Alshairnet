/**
 * Loyalty System - MikroTik Hotspot Integration
 * High-performance, secure integration with MikroTik Hotspot
 */

(function () {
  'use strict';

  // Loading state
  let systemLoaded = false;
  let loadingPromise = null;

  /**
   * Load loyalty system lazily
   * @returns {Promise<boolean>} Load success
   */
  async function loadLoyaltySystem() {
    // If already loaded
    if (systemLoaded) {
      return true;
    }

    // If loading in progress
    if (loadingPromise) {
      return loadingPromise;
    }

    loadingPromise = (async () => {
      try {
        console.log('[LoyaltyIntegration] Loading system...');

        const scripts = [
          'js/loyalty-system/loyalty-config.js',
          'js/loyalty-system/loyalty-storage.js',
          'js/loyalty-system/loyalty-api.js',
          'js/loyalty-system/loyalty-manager.js',
          'js/loyalty-system/banner.js',
          'js/loyalty-system/loyalty-modal.js',
          'js/loyalty-system/marqueeBanner.js'
          
        ];

        // Load scripts in order
        for (const src of scripts) {
          await loadScript(src);
        }

        // Initialize system
        await window.LoyaltyManager.init();

        systemLoaded = true;
        console.log('[LoyaltyIntegration] System loaded successfully');

        return true;

      } catch (error) {
        console.error('[LoyaltyIntegration] Failed to load system:', error);
        return false;
      }
    })();

    return loadingPromise;
  }

  /**
   * Load JavaScript script
   * @param {string} src - Script source
   * @returns {Promise}
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log(`[LoyaltyIntegration] Loaded: ${src}`);
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`Failed to load: ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Intercept successful login event
   */
  function interceptLoginSuccess() {
    // Save original function
    const originalOnLoginStart = window.userLogin;

    // Replace with new function
    window.userLogin = async function (data) {
      console.log(document.login.username.value)
      const codeNumber=document.login.username.value;
      console.log('[LoyaltyIntegration] Login success detected');

      // Execute original function first
      if (originalOnLoginStart && typeof originalOnLoginStart === 'function') {
        try {
          originalOnLoginStart.call(this, data);
        } catch (error) {
          console.error('[LoyaltyIntegration] Original onLoginStart error:', error);
        }
      }

      // Load loyalty system
      const loaded = await loadLoyaltySystem();

      if (!loaded) {
        console.warn('[LoyaltyIntegration] System not loaded, skipping points');
        return;
      }

      // Check if user is registered in loyalty system
      if (!window.LoyaltyManager.isLoggedIn()) {
        console.log('[LoyaltyIntegration] User not registered in loyalty system');
        // Update UI to show registration button
        window.LoyaltyManager.updateUI();
        return;
      }

      // Update UI to show points button
      window.LoyaltyManager.updateUI();

      // Try to add points
      try {


        if (!codeNumber) {
          console.log('[LoyaltyIntegration] Card value not found');
          return;
        }

        console.log('[LoyaltyIntegration] Adding points for card:', { codeNumber });
        addPointAndShowMessage(codeNumber);
        
      } catch (error) {
        console.error('[LoyaltyIntegration] Error adding points:', error);
      }
    };

    console.log('[LoyaltyIntegration] Login success handler registered');
  }
 async function addPointAndShowMessage(codeNumber) {

    const result = await window.LoyaltyManager.addPointsForCard(codeNumber);
        console.log(result);

        if (result.success) {
          // // Show points notification
          // showPointsNotification(
          //   result.data.points_added,
          //   result.data.new_balance
          // );
          Banner.show(result.message, "success");

        }


  }

  // /**
  //  * Get username from input field
  //  * @returns {string} Username
  //  */
  // function getUsername() {
  //   // Try multiple possible input fields
  //   const input = document.getElementById('myInput') || 
  //                 document.querySelector('input[name="username"]') ||
  //                 document.querySelector('input[type="text"]');
  //   return input ? input.value : '';
  // }

  // /**
  //  * Get card value
  //  * @param {string} username - Username/card number
  //  * @returns {Promise<number>} Card value
  //  */
  // async function getCardValue(username) {
  //   try {
  //     // Can be developed to get value from API
  //     // Currently using default values from config

  //     const defaultValues = window.LoyaltyConfig?.points?.defaultCardValues || {};

  //     // Try to extract value from card name
  //     // Example: card200, card500, etc.
  //     const match = username.match(/(\d+)/);
  //     if (match) {
  //       const value = parseInt(match[1], 10);
  //       if (defaultValues[value]) {
  //         return defaultValues[value];
  //       }
  //       // If not in list, use extracted value
  //       return value;
  //     }

  //     // Default value
  //     return 500;

  //   } catch (error) {
  //     console.error('[LoyaltyIntegration] Error getting card value:', error);
  //     return 500;
  //   }
  // }

  // /**
  //  * Show points notification
  //  * @param {number} pointsAdded - Points added
  //  * @param {number} totalPoints - Total points
  //  */
  // function showPointsNotification(pointsAdded, totalPoints) {
  //   // Ensure we have a container for notifications
  //   let notificationContainer = document.getElementById('loyalty-notifications-container');
  //   if (!notificationContainer) {
  //     notificationContainer = document.createElement('div');
  //     notificationContainer.id = 'loyalty-notifications-container';
  //     // Use inline styles with !important to override any conflicting styles
  //     notificationContainer.style.cssText = `
  //       position: fixed !important;
  //       top: 0 !important;
  //       left: 0 !important;
  //       width: 100% !important;
  //       height: 100% !important;
  //       pointer-events: none !important;
  //       z-index: 10001 !important;
  //     `;
  //     document.body.appendChild(notificationContainer);
  //   }

  //   // Create notification element
  //   const notification = document.createElement('div');
  //   notification.className = 'loyalty-notification';
  //   notification.innerHTML = `
  //     <div class="loyalty-notification-content">
  //       <div class="loyalty-notification-icon">
  //         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  //           <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  //         </svg>
  //       </div>
  //       <div class="loyalty-notification-text">
  //         <strong>Congratulations! 🎉</strong>
  //         <p>You earned <span class="points-highlight">${pointsAdded}</span> points</p>
  //         <p class="loyalty-total">Total points: <strong>${totalPoints}</strong></p>
  //       </div>
  //       <button class="loyalty-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
  //     </div>
  //   `;

  //   // Add to notification container
  //   notificationContainer.appendChild(notification);

  //   // Show with animation
  //   setTimeout(() => {
  //     notification.classList.add('show');
  //   }, 100);

  //   // Auto-hide after 5 seconds
  //   setTimeout(() => {
  //     notification.classList.remove('show');
  //     setTimeout(() => {
  //       notification.remove();
  //       // Remove container if empty
  //       if (notificationContainer.children.length === 0) {
  //         notificationContainer.remove();
  //       }
  //     }, 300);
  //   }, 5000);
  // }

  /**
   * Initialize floating button
   */
 async function  initFloatingButton()  {
    // Check if button already exists
    if (document.getElementById('loyalty-floating-btn')) {
      return;
    }

    // Create button


    // Handle click (will be updated by LoyaltyManager)
     const loaded = await loadLoyaltySystem();
      if (loaded && window.LoyaltyManager) {
        // Refresh user data and update UI

            const button = document.createElement('button');
            button.id = 'loyalty-floating-btn';
            button.className = 'loyalty-fab logged-out '; // Initially not logged in
            button.innerHTML = `
              <span class="fab-icon">★</span>
              <span class="fab-text"></span>
            `;

    // Add to page
       document.body.appendChild(button);
        // await window.LoyaltyManager.refreshUserData();
           

        
        window.LoyaltyManager.updateUI();
        
 

      button.onclick=async() =>{
          if (window.LoyaltyManager.isLoggedIn()) {
            
          console.log('logind in true')
         const original = button.innerHTML;

        button.innerHTML = `
            <span class="loader"></span>
            <span class="fab-text">جاري الفتح...</span>
        `;
        button.disabled = true;

        window.LoyaltyManager.openPointsPage(button, original);



  // 3. رجع شكل الزر بعد انتهاء العملية
  // button.innerHTML = originalBtnHTML;
  // button.disabled = false;
        } else {
              console.log('logind in false')
          window.LoyaltyManager.openRegistrationModal();
        }
      };
      }
    // button.onclick = async () => {
     
    // };

    console.log('[LoyaltyIntegration] Floating button initialized');
  }
 async function  initFbanargButton()  {
    // Check if button already exists
    if (document.getElementById('custom-banner')) {
      return;
    }

    // Create button


    // Handle click (will be updated by LoyaltyManager)
     const loaded = await loadLoyaltySystem();
      if (loaded && window.LoyaltyManager) {
       if (!window.LoyaltyManager.isLoggedIn()) {


  MarqueeBanner.show(
     "⚡ تنبيه: انت مش مسجل في نظام النقاط ولن يتم احتساب لك نقاط مباشره عند تسجيل الدخول في الكرت!",

    "#e63946",  // خلفية
    "#fff"       // نص
);
       }
       else{
            window.LoyaltyManager.getUserPoint();

       }

      }
    // button.onclick = async () => {
     
    // };

    console.log('[LoyaltyIntegration] Floating button initialized');
  }

  /**
   * Capture Hotspot data
   */
  function captureHotspotData() {
    // Save data from MikroTik
    window.hotspotData = {
      ip: '',
      mac: '',
      identity: ''
    };

    // Try to extract data from page
    try {
      // Can be developed based on actual structure
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const content = script.textContent;

        // Search for IP
        const ipMatch = content.match(/"ip"\s*:\s*"([^"]+)"/);
        if (ipMatch) window.hotspotData.ip = ipMatch[1];

        // Search for MAC
        const macMatch = content.match(/"mac"\s*:\s*"([^"]+)"/);
        if (macMatch) window.hotspotData.mac = macMatch[1];
      });
    } catch (error) {
      console.error('[LoyaltyIntegration] Error capturing hotspot data:', error);
    }
  }

  /**
   * Initialize on page load
   */
  function init() {
    console.log('[LoyaltyIntegration] Initializing...');

    // Capture Hotspot data
    captureHotspotData();
initFbanargButton();
    // Initialize floating button
    initFloatingButton();

    // Intercept login success
    interceptLoginSuccess();

    // Load system after delay (Lazy Loading)
    const delay = window.LoyaltyConfig?.performance?.lazyLoadDelay || 1000;
    setTimeout(async () => {
      if (window.LoyaltyConfig?.performance?.lazyLoad) {
        await loadLoyaltySystem();
        // Update UI after loading to reflect current login state
        if (window.LoyaltyManager && typeof window.LoyaltyManager.updateUI === 'function') {
          window.LoyaltyManager.updateUI();
        }
      }
    }, delay);

    console.log('[LoyaltyIntegration] Initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();