/**
 * Loyalty System - Auth Modal (Login & Register)
 */

window.LoyaltyModal = {
  modalElement: null,
  contentContainer: null,

  /**
   * Initialize modal structure (Container only)
   */
  init() {
    if (this.modalElement) return;

    // Create modal wrapper
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'loyalty-modal';
    
    // The internal container where we will swap forms
    this.modalElement.innerHTML = `
      <div class="loyalty-modal-content">
        <button class="loyalty-modal-close" onclick="window.LoyaltyModal.close()">×</button>
        <div id="loyalty-dynamic-content"></div>
      </div>
    `;

    document.body.appendChild(this.modalElement);

    // Cache the content container
    this.contentContainer = this.modalElement.querySelector('#loyalty-dynamic-content');

    // Close on background click
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });
  },

  /**
   * Open modal (Defaults to Login View)
   */
  open() {
    this.init();
    this.showLoginView(); // Start with Login view
    this.modalElement.classList.add('active');
    if (window.ModalScrollLock) window.ModalScrollLock.lock();
    else document.body.style.overflow = 'hidden';
  },

  /**
   * Close modal
   */
  close() {
    if (this.modalElement) {
      this.modalElement.classList.remove('active');
    }
    if (window.ModalScrollLock) window.ModalScrollLock.unlock();
    else document.body.style.overflow = '';
  },

  /**
   * VIEW 1: Show Login Form
   */
  showLoginView() {
    if (!this.contentContainer) return;

    this.contentContainer.innerHTML = `
        <div class="loyalty-modal-header">
          <h2>تسجيل الدخول</h2>
          <p style="font-size: 0.9em;"> قم بادخال بيانات حسابك </p>
        </div>
        
        <div class="loyalty-modal-body">
          <form id="loyalty-login-form" onsubmit="window.LoyaltyModal.handleLoginSubmit(event)">
            <div class="loyalty-form-group">
              <label class="loyalty-form-label">رقم الهاتف </label>
              <input type="tel" id="loyalty-phone-input" class="loyalty-form-input" placeholder="7xxxxxxxx" required>
              
              <label class="loyalty-form-label">كلمة السر </label>
              <input type="password" id="loyalty-password-input" class="loyalty-form-input" placeholder="********" required>
            </div>
            
            <button type="submit" class="loyalty-btn" id="loyalty-submit-btn">الدخول </button>
            
            <div style="margin-top: 15px; text-align: center;">
                <span style="color: black !important;">اذا لم تنشء حساب من قبل  ? </span>
                <a href="#" onclick="window.LoyaltyModal.go_to_registar_page(); return false;" style="color: #007bff; font-weight: bold; text-decoration: none;"> قم بانشاء حساب جديد </a>
            </div>

            <div id="loyalty-message"></div>
          </form>
        </div>
    `;
    
    // Focus logic
    setTimeout(() => {
        const input = document.getElementById('loyalty-phone-input');
        if (input) input.focus();
    }, 100);
  },
  go_to_registar_page(){

     const redirectURL = `${window.LoyaltyConfig.api.baseURL}/auth/register`;
    window.open(redirectURL, '_blank');

  },
  /**
   * VIEW 2: Show Registration Form
   */
  showRegisterView() {
    if (!this.contentContainer) return;

    this.contentContainer.innerHTML = `
        <div class="loyalty-modal-header">
          <h2>Create Account</h2>
          <p style="font-size: 0.9em; color: #666;">Join us to get exclusive rewards</p>
        </div>
        
        <div class="loyalty-modal-body">
          <form id="loyalty-register-form" onsubmit="window.LoyaltyModal.handleRegisterSubmit(event)">
            <div class="loyalty-form-group">
              <label class="loyalty-form-label">Phone Number</label>
              <input type="tel" id="loyalty-reg-phone" class="loyalty-form-input" placeholder="967xxxxxxxxx" required>
              
              <label class="loyalty-form-label">Create Password</label>
              <input type="password" id="loyalty-reg-pass" class="loyalty-form-input" placeholder="********" required>

              <label class="loyalty-form-label">Confirm Password</label>
              <input type="password" id="loyalty-reg-pass-confirm" class="loyalty-form-input" placeholder="********" required>
            </div>
            
            <button type="submit" class="loyalty-btn" id="loyalty-reg-btn">Create Account</button>
            
            <div style="margin-top: 15px; text-align: center;">
                <span>Already have an account? </span>
                <a href="#" onclick="window.LoyaltyModal.showLoginView(); return false;" style="color: #007bff; font-weight: bold; text-decoration: none;">Login</a>
            </div>

            <div id="loyalty-reg-message"></div>
          </form>
        </div>
    `;

     // Focus logic
     setTimeout(() => {
        const input = document.getElementById('loyalty-reg-phone');
        if (input) input.focus();
    }, 100);
  },

  /**
   * LOGIC: Handle Login Submission
   */
  async handleLoginSubmit(event) {
    event.preventDefault();
    const phone = document.getElementById('loyalty-phone-input').value.trim();
    const password = document.getElementById('loyalty-password-input').value;
    const btn = document.getElementById('loyalty-submit-btn');
    const msgDiv = document.getElementById('loyalty-message');

    this._processForm(btn, msgDiv, async () => {
        // Call Manager Login
        return await window.LoyaltyManager.login(phone, password);
    });
  },

  /**
   * LOGIC: Handle Registration Submission
   */
  async handleRegisterSubmit(event) {
    event.preventDefault();
    const phone = document.getElementById('loyalty-reg-phone').value.trim();
    const password = document.getElementById('loyalty-reg-pass').value;
    const confirmPass = document.getElementById('loyalty-reg-pass-confirm').value;
    const btn = document.getElementById('loyalty-reg-btn');
    const msgDiv = document.getElementById('loyalty-reg-message');

    // Basic Validation
    if (password !== confirmPass) {
        msgDiv.className = 'loyalty-error';
        msgDiv.textContent = 'Passwords do not match!';
        return;
    }

    this._processForm(btn, msgDiv, async () => {
        // Check if register method exists, otherwise throw error or use login
        if (window.LoyaltyManager.register) {
            return await window.LoyaltyManager.register(phone, password);
        } else {
             throw new Error("Registration method not found in Manager");
        }
    });
  },

  /**
   * Helper: Process form UI states (Loading/Success/Error)
   */
  async _processForm(btnElement, messageElement, actionCallback) {
    btnElement.disabled = true;
    const originalText = btnElement.textContent;
    btnElement.textContent = 'جاري التسجيل...';
    btnElement.classList.add('loyalty-btn-loading');
    messageElement.innerHTML = '';

    try {
      if (!window.LoyaltyManager) throw new Error('System not loaded');

      const result = await actionCallback();

      if (result.success) {
        messageElement.className = 'loyalty-success';
        messageElement.textContent = result.message || 'Success!';
        setTimeout(() => {
          this.close();
          messageElement.textContent = '';
        }, 1500);
      } else {
        messageElement.className = 'loyalty-error';
        messageElement.textContent = result.error || 'Operation failed';
      }
    } catch (error) {
      console.error('Error:', error);
      messageElement.className = 'loyalty-error';
      messageElement.textContent = error.message || 'Unexpected error';
    } finally {
      btnElement.disabled = false;
      btnElement.textContent = originalText;
      btnElement.classList.remove('loyalty-btn-loading');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.LoyaltyModal;
}