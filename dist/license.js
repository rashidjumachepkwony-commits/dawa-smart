/*!
 * Dawa Smart – License & Trial Manager
 * ====================================
 * Centralized licensing and trial system for the Dawa Smart demo.
 *
 * Storage: localStorage (key: 'dawasmartz_license')
 * License data is deliberately kept OUT of IndexedDB and OUT of the
 * application backup/restore cycle so that the trial cannot be reset
 * by restoring an old backup.
 *
 * Future extensibility:
 *   - validateLocalLicense()  → offline key validation
 *   - validateRemoteLicense() → server-side activation (future)
 *   - License types: monthly / annual / lifetime (future)
 *
 * Security note: This is a client-side offline application. Frontend
 * JavaScript licensing is NOT tamper-proof against a technically skilled
 * user. This implementation provides reasonable client-side deterrents
 * and is structured for future server-side validation.
 */
;(function () {
  'use strict';

  var APP_VERSION = '1.0.0';
  var APP_NAME = 'Dawa Smart';
  var TRIAL_DAYS = 14;
  var LICENSE_KEY = 'dawasmartz_license';
  var DEV_MODE_KEY = 'dawasmartz_dev_mode';
  var CLOCK_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
  var DAY_MS = 24 * 60 * 60 * 1000;

  // -----------------------------------------------------------------
  // Default license record (returned before trial activation)
  // -----------------------------------------------------------------
  function defaultLicense() {
    return {
      mode: 'demo',
      demoUsername: 'DEMO',
      licenseType: 'trial',
      trialStart: null,
      trialExpiry: null,
      lastSeen: null,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      status: 'pending',
      deviceId: null
    };
  }

  // -----------------------------------------------------------------
  // LicenseManager
  // -----------------------------------------------------------------
  function LicenseManager() {
    this.key = LICENSE_KEY;
    this.devKey = DEV_MODE_KEY;
    this._ensureLicense();
  }

  // Read license record from localStorage
  LicenseManager.prototype.getLicense = function () {
    try {
      var raw = localStorage.getItem(this.key);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Merge with defaults to handle new fields
        return Object.assign(defaultLicense(), parsed);
      }
    } catch (e) {
      console.error('Dawa Smart: Failed to read license record:', e);
    }
    return defaultLicense();
  };

  // Persist license record
  LicenseManager.prototype.saveLicense = function (license) {
    try {
      localStorage.setItem(this.key, JSON.stringify(license));
    } catch (e) {
      console.error('Dawa Smart: Failed to save license record:', e);
    }
  };

  // Ensure a license record exists
  LicenseManager.prototype._ensureLicense = function () {
    var license = this.getLicense();
    license.mode = license.mode || 'demo';
    license.appVersion = APP_VERSION;
    this.saveLicense(license);
    return license;
  };

  // Initialize license on application start
  LicenseManager.prototype.initializeLicense = function () {
    return this._ensureLicense();
  };

  // Activate the demo trial — called on first successful DEMO login.
  // trialStart and trialExpiry are set once and never reset.
  LicenseManager.prototype.activateDemoTrial = function () {
    var license = this.getLicense();
    if (!license.trialStart) {
      var now = new Date();
      license.trialStart = now.toISOString();
      license.trialExpiry = new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString();
      license.status = 'active';
      license.mode = 'demo';
      license.demoUsername = 'DEMO';
      license.licenseType = 'trial';
      license.createdAt = license.createdAt || now.toISOString();
      license.deviceId = license.deviceId || this._getDeviceId();
    }
    license.lastSeen = new Date().toISOString();
    license.appVersion = APP_VERSION;
    this.saveLicense(license);
    return license;
  };

  // Simple device identifier (not cryptographically secure)
  LicenseManager.prototype._getDeviceId = function () {
    try {
      var stored = localStorage.getItem('dawasmartz_device_id');
      if (stored) return stored;
      var id = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('dawasmartz_device_id', id);
      return id;
    } catch (e) {
      return 'device_' + Date.now().toString(36);
    }
  };

  // ─── Status queries ──────────────────────────────────────────

  LicenseManager.prototype.isDemoMode = function () {
    return this.getLicense().mode === 'demo';
  };

  LicenseManager.prototype.isTrialActive = function () {
    var license = this.getLicense();
    if (!license.trialStart || !license.trialExpiry) return false;
    var check = this._basicExpiryCheck(license);
    if (check.expired) return false;
    return true;
  };

  LicenseManager.prototype.getTrialDaysRemaining = function () {
    var license = this.getLicense();
    if (!license.trialExpiry) return 0;
    var diff = new Date(license.trialExpiry) - new Date();
    if (diff <= 0) return 0;
    return Math.ceil(diff / DAY_MS);
  };

  LicenseManager.prototype.getTrialHoursRemaining = function () {
    var diff = this._remainingMs();
    if (diff <= 0) return 0;
    return Math.floor(diff / (60 * 60 * 1000));
  };

  LicenseManager.prototype.getTrialMinutesRemaining = function () {
    var diff = this._remainingMs();
    if (diff <= 0) return 0;
    var hours = Math.floor(diff / (60 * 60 * 1000));
    return Math.floor((diff - hours * 60 * 60 * 1000) / (60 * 1000));
  };

  LicenseManager.prototype._remainingMs = function () {
    var license = this.getLicense();
    if (!license.trialExpiry) return 0;
    return new Date(license.trialExpiry) - new Date();
  };

  LicenseManager.prototype.getTrialStartDate = function () {
    return this.getLicense().trialStart;
  };

  LicenseManager.prototype.getTrialExpiryDate = function () {
    return this.getLicense().trialExpiry;
  };

  // ─── Core checks ─────────────────────────────────────────────

  // Detect system-clock tampering by comparing the stored lastSeen
  // with the current time.  A small tolerance accommodates legitimate
  // clock corrections (NTP sync, timezone travel).
  LicenseManager.prototype.detectClockTampering = function (license) {
    license = license || this.getLicense();
    if (!license.lastSeen) return false;
    var last = new Date(license.lastSeen).getTime();
    var now = Date.now();
    // Clock moved backward beyond tolerance
    if (now < last - CLOCK_TOLERANCE_MS) {
      return true;
    }
    // Clock leaped forward by an implausibly large amount (more than 1 day
    // in a single check) — possible fast-forward tampering.
    if (now > last + DAY_MS + CLOCK_TOLERANCE_MS) {
      // Verify by checking if we are past the trial expiry we expected.
      // Allow it only if the trial genuinely expires naturally.
      // If somehow lastSeen is ahead of trialExpiry + 1 day, flag it.
      var expiry = license.trialExpiry ? new Date(license.trialExpiry).getTime() : 0;
      if (expiry && now > expiry + DAY_MS + CLOCK_TOLERANCE_MS && last < expiry) {
        return true;
      }
    }
    return false;
  };

  LicenseManager.prototype._basicExpiryCheck = function (license) {
    var now = new Date();
    var expiry = license.trialExpiry ? new Date(license.trialExpiry) : null;
    if (!expiry) {
      return { expired: false, tampered: false };
    }
    var tampered = this.detectClockTampering(license);
    if (tampered) {
      return { expired: true, tampered: true };
    }
    return { expired: now >= expiry, tampered: false };
  };

  // Check trial expiry and update lastSeen. Returns a status object.
  LicenseManager.prototype.checkTrialExpiry = function () {
    var license = this.getLicense();
    var tampered = this.detectClockTampering(license);

    if (tampered) {
      license.status = 'tampered';
      license.lockReason = 'clock_tampering';
      license.lastSeen = new Date().toISOString();
      this.saveLicense(license);
      return { expired: true, tampered: true, reason: 'clock_tampering' };
    }

    // Update lastSeen for normal operation
    license.lastSeen = new Date().toISOString();
    license.appVersion = APP_VERSION;

    var expiryCheck = this._basicExpiryCheck(license);
    if (expiryCheck.expired) {
      license.status = expiryCheck.tampered ? 'tampered' : 'expired';
      license.lockReason = expiryCheck.tampered ? 'clock_tampering' : 'trial_expired';
      this.saveLicense(license);
      return { expired: true, tampered: expiryCheck.tampered, reason: license.lockReason };
    }

    license.status = 'active';
    this.saveLicense(license);
    return { expired: false, tampered: false, reason: 'active' };
  };

  // Enforce a complete lockout when trial is expired or tampered.
  LicenseManager.prototype.enforceLicenseLock = function (reason) {
    reason = reason || 'expired';
    var appContainer = document.getElementById('appContainer');
    var loginPage = document.getElementById('loginPage');
    var splash = document.getElementById('splash');
    var expiryScreen = document.getElementById('licenseExpiryScreen');

    if (appContainer) appContainer.style.display = 'none';
    if (loginPage) loginPage.style.display = 'none';
    if (splash) splash.style.display = 'none';

    if (expiryScreen) {
       var title = document.getElementById('licenseExpiryTitle');
       var msg = document.getElementById('licenseExpiryMessage');
       var sub = document.getElementById('licenseExpirySub');
       if (title) title.textContent = reason === 'tampered'
         ? 'DAWA SMART — CLOCK ANOMALY DETECTED'
         : 'DAWA SMART DEMO EXPIRED';
       if (msg) msg.textContent = reason === 'tampered'
         ? 'System time appears to have been modified. The demo cannot continue until the system clock is corrected.'
         : 'Your 14-day demonstration period has ended.';
       if (sub) sub.textContent = reason === 'tampered'
         ? 'Please correct your system clock to continue.'
         : 'Click "START FRESH DEMO" to reset your trial and get a new 14-day period. Each device gets its own independent demo.';
       expiryScreen.classList.add('show');
     }
    return false;
  };

  // Placeholder for future license key activation
  LicenseManager.prototype.activateLicense = function (licenseKey, deviceId) {
    return {
      success: false,
      message: 'Full license activation is not yet available. Please contact support.'
    };
  };

  // Placeholder for future server-side validation
  LicenseManager.prototype.validateRemoteLicense = function () {
    return Promise.resolve({ valid: false, message: 'Remote validation not configured.' });
  };

  // Placeholder for future local license key validation
  LicenseManager.prototype.validateLocalLicense = function (licenseKey) {
    return { valid: false, licenseType: null, expiry: null };
  };

  // Main gatekeeper — ask before allowing protected functionality.
  LicenseManager.prototype.canUseApplication = function () {
    // Production / developer users always have full access
    if (window.currentUser && (window.currentUser.role === 'developer' || window.currentUser.role === 'admin')) {
      return { allowed: true, reason: 'production' };
    }

    // Demo users need an active trial
    if (window.currentUser && window.currentUser.role === 'demo') {
      var check = this.checkTrialExpiry();
      if (check.expired) {
        return { allowed: false, reason: check.tampered ? 'tampered' : 'expired' };
      }
      return { allowed: true, reason: 'demo', daysRemaining: this.getTrialDaysRemaining() };
    }

    // Unauthenticated or unknown role — allow login screen only
    return { allowed: false, reason: 'no_session' };
  };

  // ─── Display helpers ─────────────────────────────────────────

  LicenseManager.prototype.getLicenseInfo = function () {
    var license = this.getLicense();
    var days = this.getTrialDaysRemaining();
    var hours = this.getTrialHoursRemaining();
    var minutes = this.getTrialMinutesRemaining();
    var lessThan24 = days === 0 && hours > 0;
    return {
      mode: license.mode,
      licenseType: license.licenseType,
      status: license.status,
      trialStart: license.trialStart,
      trialExpiry: license.trialExpiry,
      lastSeen: license.lastSeen,
      createdAt: license.createdAt,
      appVersion: license.appVersion || APP_VERSION,
      daysRemaining: days,
      hoursRemaining: hours,
      minutesRemaining: minutes,
      lessThan24h: lessThan24,
      deviceId: license.deviceId
    };
  };

  // ─── Warning thresholds ────────────────────────────────────────

  LicenseManager.prototype.getWarningThreshold = function () {
    var days = this.getTrialDaysRemaining();
    if (days < 0) days = 0;
    // Return the threshold that should fire today (for once-per-day toasts)
    if (days <= 0 && this.getTrialHoursRemaining() > 0) return 'less-than-24h';
    if (days === 1) return '1-day';
    if (days === 2) return '2-days';
    if (days === 3) return '3-days';
    if (days === 7) return '7-days';
    return null;
  };

  LicenseManager.prototype.hasShownWarning = function (threshold) {
    try {
      var key = this.key + '_warn_' + threshold;
      return localStorage.getItem(key) === '1';
    } catch (e) {
      return false;
    }
  };

  LicenseManager.prototype.markWarningShown = function (threshold) {
    try {
      var key = this.key + '_warn_' + threshold;
      localStorage.setItem(key, '1');
    } catch (e) {}
  };

  // ─── UI rendering ─────────────────────────────────────────────

  LicenseManager.prototype.updateDemoIndicator = function () {
    var info = this.getLicenseInfo();
    var indicator = document.getElementById('demoIndicator');
    var headerBadge = document.getElementById('headerDemoBadge');

    // Header badge
    if (headerBadge) {
      var badge = document.getElementById('demoHeaderBadge');
      if (badge) {
        if (info.daysRemaining > 0) {
          badge.textContent = 'DEMO • ' + info.daysRemaining + ' DAY' + (info.daysRemaining > 1 ? 'S' : '') + ' LEFT';
          badge.className = 'demo-badge';
        } else if (info.lessThan24h) {
          badge.textContent = 'DEMO • < 1 DAY LEFT';
          badge.className = 'demo-badge demo-warning';
        } else {
          badge.textContent = 'DEMO EXPIRED';
          badge.className = 'demo-badge demo-expired';
        }
        headerBadge.style.display = 'flex';
      }
    }

    // Dashboard indicator
    if (indicator) {
      if (info.daysRemaining > 0) {
        indicator.textContent = 'DEMO MODE • ' + info.daysRemaining + ' DAY' + (info.daysRemaining > 1 ? 'S' : '') + ' LEFT';
        indicator.className = 'demo-banner';
      } else if (info.lessThan24h) {
        indicator.textContent = 'DEMO MODE • ' + info.hoursRemaining + 'h ' + info.minutesRemaining + 'm REMAINING';
        indicator.className = 'demo-banner demo-banner-warning';
      } else {
        indicator.style.display = 'none';
      }
    }
  };

  LicenseManager.prototype.showTrialWarning = function () {
    var threshold = this.getWarningThreshold();
    if (!threshold) return;
    if (this.hasShownWarning(threshold)) return;

    var days = this.getTrialDaysRemaining();
    var message;
    if (threshold === 'less-than-24h') {
      message = 'Your Dawa Smart demonstration expires in less than 24 hours (' +
        this.getTrialHoursRemaining() + 'h ' + this.getTrialMinutesRemaining() + 'm remaining).';
    } else {
      message = 'Your Dawa Smart demonstration expires in ' + days + ' day' + (days > 1 ? 's' : '') + '.';
    }

    if (typeof showToast === 'function') {
      showToast(message, 'warning');
    }
    this.markWarningShown(threshold);
  };

  // ─── Reset demo data (demo data only — never touches license) ──

  LicenseManager.prototype.resetDemoData = function () {
    var stores = ['products', 'sales', 'saleItems', 'patients', 'batches', 'labTests', 'expenses', 'controlledLogs'];
    if (!window.db) return Promise.reject('Database not initialised');

    return Promise.all(stores.map(function (store) {
      return window.db.getAll(store).then(function (items) {
        return Promise.all(items.map(function (item) {
          return window.db.delete(store, item.id);
        }));
      });
    })).then(function () {
      localStorage.removeItem('yetu_holds');
      localStorage.removeItem('yetu_receipt');
      localStorage.removeItem('yetu_last_sale');
      localStorage.removeItem('yetu_fresh_transactions_v1');
      // Do NOT touch license keys
    });
  };

  // ─── Dev testing panel ───────────────────────────────────────

  LicenseManager.prototype.isDevMode = function () {
    try {
      return localStorage.getItem(this.devKey) === 'true';
    } catch (e) {
      return false;
    }
  };

  LicenseManager.prototype.toggleDevMode = function () {
    var enabled = !this.isDevMode();
    try {
      localStorage.setItem(this.devKey, enabled ? 'true' : 'false');
    } catch (e) {}
    return enabled;
  };

  LicenseManager.prototype.setDevTrialState = function (state) {
    if (!this.isDevMode()) return false;
    var license = this.getLicense();
    var now = new Date();

    license.trialStart = now.toISOString();

    switch (state) {
      case 'first-day':
        license.trialExpiry = new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString();
        license.status = 'active';
        break;
      case '7-days':
        license.trialExpiry = new Date(now.getTime() + 7 * DAY_MS).toISOString();
        license.status = 'active';
        break;
      case '3-days':
        license.trialExpiry = new Date(now.getTime() + 3 * DAY_MS).toISOString();
        license.status = 'active';
        break;
      case '2-days':
        license.trialExpiry = new Date(now.getTime() + 2 * DAY_MS).toISOString();
        license.status = 'active';
        break;
      case '1-day':
        license.trialExpiry = new Date(now.getTime() + 1 * DAY_MS).toISOString();
        license.status = 'active';
        break;
      case 'less-than-24h':
        license.trialExpiry = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
        license.status = 'active';
        break;
      case 'expired':
        license.trialExpiry = new Date(now.getTime() - DAY_MS).toISOString();
        license.status = 'expired';
        license.lockReason = 'trial_expired';
        break;
      default:
        return false;
    }

    license.lastSeen = now.toISOString();
    this.saveLicense(license);
    return true;
  };

   LicenseManager.prototype.resetTrial = function () {
     if (!this.isDevMode()) return false;
     localStorage.removeItem(this.key);
     this._ensureLicense();
     return true;
   };

    LicenseManager.prototype.resetDemoTrial = function () {
      localStorage.removeItem(this.key);
      localStorage.removeItem('dawasmartz_device_id');
      localStorage.removeItem(this.key + '_warn_less-than-24h');
      localStorage.removeItem(this.key + '_warn_1-day');
      localStorage.removeItem(this.key + '_warn_2-days');
      localStorage.removeItem(this.key + '_warn_3-days');
      localStorage.removeItem(this.key + '_warn_7-days');
      this._ensureLicense();
      return true;
    };

   LicenseManager.prototype.isTrialExpired = function () {
     var license = this.getLicense();
     if (!license.trialStart) return false;
     if (!license.trialExpiry) return false;
     var check = this._basicExpiryCheck(license);
     return check.expired;
   };

   LicenseManager.prototype.showDevPanel = function () {
    if (!this.isDevMode()) return;
    var panel = document.getElementById('licenseDevPanel');
    if (panel) {
      panel.style.display = 'block';
      this.refreshDevInfo();
    }
  };

  LicenseManager.prototype.closeDevPanel = function () {
    var panel = document.getElementById('licenseDevPanel');
    if (panel) panel.style.display = 'none';
  };

  LicenseManager.prototype.refreshDevInfo = function () {
    var info = this.getLicenseInfo();
    var el = document.getElementById('licenseDevInfo');
    if (el) {
      el.textContent = JSON.stringify(info, null, 2);
    }
  };

  // ─── Standalone function aliases (for inline onclick handlers) ─

  function initializeLicense() { return licenseManager.initializeLicense(); }
  function getLicenseStatus() { return licenseManager.getLicenseInfo(); }
  function isDemoMode() { return licenseManager.isDemoMode(); }
  function isTrialActive() { return licenseManager.isTrialActive(); }
  function getTrialDaysRemaining() { return licenseManager.getTrialDaysRemaining(); }
  function getTrialStartDate() { return licenseManager.getTrialStartDate(); }
  function getTrialExpiryDate() { return licenseManager.getTrialExpiryDate(); }
  function checkTrialExpiry() { return licenseManager.checkTrialExpiry(); }
  function detectClockTampering() { return licenseManager.detectClockTampering(); }
  function enforceLicenseLock(reason) { return licenseManager.enforceLicenseLock(reason); }
  function activateLicense(key) { return licenseManager.activateLicense(key); }
  function canUseApplication() { return licenseManager.canUseApplication(); }
  function resetDemoTrial() { return licenseManager.resetDemoTrial(); }
  function isTrialExpired() { return licenseManager.isTrialExpired(); }

  // ─── Global exposure ──────────────────────────────────────────

  var licenseManager = new LicenseManager();

  // Expose on window
  window.LicenseManager = LicenseManager;
  window.licenseManager = licenseManager;
  window.initializeLicense = initializeLicense;
  window.getLicenseStatus = getLicenseStatus;
  window.isDemoMode = isDemoMode;
  window.isTrialActive = isTrialActive;
  window.getTrialDaysRemaining = getTrialDaysRemaining;
  window.getTrialStartDate = getTrialStartDate;
  window.getTrialExpiryDate = getTrialExpiryDate;
  window.checkTrialExpiry = checkTrialExpiry;
  window.detectClockTampering = detectClockTampering;
  window.enforceLicenseLock = enforceLicenseLock;
  window.activateLicense = activateLicense;
  window.canUseApplication = canUseApplication;
  window.resetDemoTrial = resetDemoTrial;
  window.isTrialExpired = isTrialExpired;

  // Dev-mode keyboard shortcut: triple Ctrl+Shift+L within 2 seconds
  // toggles dev mode and opens the developer license testing panel.
  // This is intentionally difficult to trigger accidentally.
  (function () {
    var _presses = [];
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        var now = Date.now();
        _presses = _presses.filter(function (t) { return now - t < 2000; });
        _presses.push(now);
        if (_presses.length >= 3) {
          _presses = [];
          var enabled = licenseManager.toggleDevMode();
          if (typeof showToast === 'function') {
            showToast('🔧 License dev mode ' + (enabled ? 'enabled' : 'disabled'), 'info');
          }
          if (enabled) {
            licenseManager.showDevPanel();
          } else {
            licenseManager.closeDevPanel();
          }
        }
      }
    });
  })();

  // Initialize on load
  licenseManager.initializeLicense();

})();
