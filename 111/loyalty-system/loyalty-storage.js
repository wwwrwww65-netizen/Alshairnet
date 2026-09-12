/**
 * LoyaltyStorage - Manages persistent storage for the loyalty system.
 * Uses localStorage as primary store with cookies as automatic fallback.
 *
 * Key design:
 *  - Rolling TTL: timestamp is refreshed on every successful load(),
 *    so the user stays logged in as long as they visit within the TTL window.
 *  - Cookies are read correctly: split FIRST, then decodeURIComponent per value.
 *  - Errors in load() do NOT auto-clear data (avoids wiping data on transient failures).
 */
class LoyaltyStorage {
    constructor(config) {
        this.config = config.storage;
        this.storageKey = this.config.key;
        this.debugMode = config.development?.mode || false;
        this.localStorageAvailable = this._testLocalStorage();
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    _testLocalStorage() {
        try {
            const TEST = '__loyalty_test__';
            localStorage.setItem(TEST, TEST);
            localStorage.removeItem(TEST);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Read a single cookie value by name.
     * Splits on ';' FIRST, then decodes each part individually.
     * This is the ONLY correct way to parse cookies and avoids double-decode bugs.
     */
    _getCookieValue(name) {
        try {
            const prefix = name + '=';
            const pairs = document.cookie.split(';');
            for (let pair of pairs) {
                pair = pair.trim();
                if (pair.startsWith(prefix)) {
                    // decode only the value portion - exactly once
                    return decodeURIComponent(pair.substring(prefix.length));
                }
            }
            return null;
        } catch (e) {
            this.logError('Failed to read cookie: ' + name, e);
            return null;
        }
    }

    /**
     * Rolling TTL: refresh the timestamp so each page visit extends the session.
     * Updates both localStorage and the cookie expiry.
     */
    _refreshTimestamp() {
        const now = Date.now().toString();
        const expires = new Date(Date.now() + this.config.ttl).toUTCString();

        if (this.localStorageAvailable) {
            localStorage.setItem(`${this.storageKey}_timestamp`, now);
        }
        document.cookie = `${this.storageKey}_timestamp=${now};expires=${expires};path=/;SameSite=Lax`;
        
        // BUG FIX: Also refresh the expiration of the data cookie itself if it exists.
        const dataCookie = this._getCookieValue(this.storageKey);
        if (dataCookie) {
            document.cookie = `${this.storageKey}=${encodeURIComponent(dataCookie)};expires=${expires};path=/;SameSite=Lax`;
        }
    }

    // ─── Cookie Write ──────────────────────────────────────────────────────────

    _saveToCookies(data, ttl) {
        try {
            const expires = new Date(Date.now() + ttl).toUTCString();
            const ts = Date.now().toString();

            // Store data cookie — safe characters only (base64 from encrypt, or JSON)
            // We use encodeURIComponent so _getCookieValue() decodes it back correctly
            document.cookie = `${this.storageKey}=${encodeURIComponent(data)};expires=${expires};path=/;SameSite=Lax`;
            document.cookie = `${this.storageKey}_timestamp=${ts};expires=${expires};path=/;SameSite=Lax`;

            // Verify the cookie was actually written (debug)
            const verify = this._getCookieValue(`${this.storageKey}_timestamp`);
            if (verify) {
                this.log('Cookie saved and verified ✅');
            } else {
                this.logError('Cookie write FAILED — browser may be blocking cookies', null);
            }
        } catch (e) {
            this.logError('Failed to save to cookies', e);
        }
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Save user data to localStorage + cookies.
     */
    save(data) {
        try {
            if (!data || typeof data !== 'object') throw new Error('Invalid data format');

            const payload = { ...data, savedAt: Date.now(), version: '2.0.0' };
            const encoded = this.config.encrypt ? this.encrypt(payload) : JSON.stringify(payload);

            if (this.localStorageAvailable) {
                localStorage.setItem(this.storageKey, encoded);
                localStorage.setItem(`${this.storageKey}_timestamp`, Date.now().toString());
            }
            this._saveToCookies(encoded, this.config.ttl);
            this.log('Data saved successfully', payload);
            return true;
        } catch (e) {
            this.logError('Failed to save data', e);
            return false;
        }
    }

    /**
     * Load user data. Falls back from localStorage → cookies transparently.
     * Refreshes the TTL timestamp on every successful load (rolling session).
     */
    load() {
        try {
            // 1. Try localStorage first
            let encoded = null;
            if (this.localStorageAvailable) {
                encoded = localStorage.getItem(this.storageKey);
            }

            // 2. Fall back to cookie if localStorage is empty / cleared
            if (!encoded) {
                encoded = this._getCookieValue(this.storageKey);
                this.log(encoded ? 'Loaded from cookies (localStorage was empty)' : 'No stored data found');
            }

            if (!encoded) return null;

            // 3. Validate TTL
            if (!this.isValid()) {
                this.log('Stored data expired');
                this.clear();
                return null;
            }

            // 4. Decode
            const data = this.config.encrypt ? this.decrypt(encoded) : JSON.parse(encoded);

            // 5. Rolling TTL — keep session alive on every visit
            this._refreshTimestamp();

            // 6. If cookie data was loaded but localStorage is empty, re-sync localStorage
            if (this.localStorageAvailable && !localStorage.getItem(this.storageKey)) {
                localStorage.setItem(this.storageKey, encoded);
                this.log('Re-synced localStorage from cookies');
            }

            this.log('Data loaded successfully', data);
            return data;
        } catch (e) {
            // ⚠️ Do NOT call clear() here — a temporary decode error should not wipe the session
            this.logError('Failed to load data', e);
            return null;
        }
    }

    /**
     * Check if stored data is still within the TTL window.
     * Reads timestamp from localStorage first, then cookie fallback.
     */
    isValid() {
        try {
            let timestamp = null;

            if (this.localStorageAvailable) {
                timestamp = localStorage.getItem(`${this.storageKey}_timestamp`);
            }

            // Fallback: read timestamp from cookie
            if (!timestamp) {
                timestamp = this._getCookieValue(`${this.storageKey}_timestamp`);
            }

            if (!timestamp) return false;
            return (Date.now() - parseInt(timestamp, 10)) < this.config.ttl;
        } catch (e) {
            return false;
        }
    }

    getAccessToken() {
        try {
            const data = this.load();
            return data?.token || null;
        } catch (e) {
            this.logError('Failed to get access token', e);
            return null;
        }
    }

    update(updates) {
        try {
            const existing = this.load();
            if (!existing) {
                this.log('No data to update');
                return false;
            }
            return this.save({ ...existing, ...updates, updatedAt: Date.now() });
        } catch (e) {
            this.logError('Failed to update data', e);
            return false;
        }
    }

    clear() {
        try {
            if (this.localStorageAvailable) {
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem(`${this.storageKey}_timestamp`);
            }
            // Expire cookies immediately
            const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = `${this.storageKey}=;${expired}`;
            document.cookie = `${this.storageKey}_timestamp=;${expired}`;
            this.log('Storage cleared');
        } catch (e) {
            this.logError('Failed to clear storage', e);
        }
    }

    getAge() {
        try {
            let timestamp = null;
            if (this.localStorageAvailable) {
                timestamp = localStorage.getItem(`${this.storageKey}_timestamp`);
            }
            if (!timestamp) {
                timestamp = this._getCookieValue(`${this.storageKey}_timestamp`);
            }
            return timestamp ? Date.now() - parseInt(timestamp, 10) : -1;
        } catch (e) {
            return -1;
        }
    }

    getSize() {
        try {
            let data = null;
            if (this.localStorageAvailable) data = localStorage.getItem(this.storageKey);
            if (!data) data = this._getCookieValue(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch (e) {
            return 0;
        }
    }

    // ─── Encryption ────────────────────────────────────────────────────────────

    encrypt(data) {
        try {
            const json = JSON.stringify(data);
            const salt = this.config.salt;
            let result = '';
            for (let i = 0; i < json.length; i++) {
                result += String.fromCharCode(json.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
            }
            return btoa(encodeURIComponent(result));
        } catch (e) {
            this.logError('Encryption failed', e);
            throw e;
        }
    }

    decrypt(encoded) {
        try {
            const raw = decodeURIComponent(atob(encoded));
            const salt = this.config.salt;
            let result = '';
            for (let i = 0; i < raw.length; i++) {
                result += String.fromCharCode(raw.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
            }
            return JSON.parse(result);
        } catch (e) {
            this.logError('Decryption failed', e);
            throw e;
        }
    }

    // ─── Logging ───────────────────────────────────────────────────────────────

    log(msg, data = null) {
        if (this.debugMode) console.log(`[LoyaltyStorage] ${msg}`, data || '');
    }

    logError(msg, err) {
        console.error(`[LoyaltyStorage] ${msg}:`, err);
    }
}

window.LoyaltyStorage = LoyaltyStorage;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoyaltyStorage;
}