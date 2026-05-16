class ApiClient {
  async me() {
    return window.api.auth.me();
  }
  async login(payload) {
    return window.api.auth.login(payload);
  }
  async register(payload) {
    return window.api.auth.register(payload);
  }
  async logout() {
    return window.api.auth.logout();
  }
  async checkDb() {
    return window.api.checkDb();
  }
  async pendingOrgs() {
    return window.api.admin.pendingOrgs();
  }
  async approveOrg(userId) {
    return window.api.admin.approveOrg(userId);
  }
  async listUsers() {
    return window.api.admin.listUsers();
  }
  async deleteUser(userId) {
    return window.api.admin.deleteUser(userId);
  }
  async updateUser(payload) {
    return window.api.admin.updateUser(payload);
  }
  async resetPassword(payload) {
    return window.api.admin.resetPassword(payload);
  }
  async listResetRequests() {
    return window.api.admin.listResetRequests();
  }
  async resolveResetRequest(payload) {
    return window.api.admin.resolveResetRequest(payload);
  }
  async pwresetCheck(email) {
    return window.api.pwreset.check(email);
  }
  async pwresetSubmit(payload) {
    return window.api.pwreset.submit(payload);
  }
  async pwresetSetPassword(payload) {
    return window.api.pwreset.setPassword(payload);
  }
  async createEvent(payload) {
    return window.api.events.create(payload);
  }
  async updateEvent(payload) {
    return window.api.events.update(payload);
  }
  async deleteEvent(eventId) {
    return window.api.events.delete(eventId);
  }
  async subscribeEvent(eventId) {
    return window.api.events.subscribe(eventId);
  }
  async unsubscribeEvent(eventId) {
    return window.api.events.unsubscribe(eventId);
  }
  async eventSeats(eventId) {
    return window.api.events.seats(eventId);
  }
  async listEvents() {
    return window.api.events.list();
  }
  async createOrder(payload) {
    return window.api.orders.create(payload);
  }
  async listOrders() {
    return window.api.orders.list();
  }
  async statsSummary() {
    return window.api.stats.summary();
  }
  async updateProfile(payload) {
    return window.api.profile.update(payload);
  }
}

class Toasts {
  constructor(root) {
    this.root = root;
  }

  show({ title, message, variant = "primary" }) {
    const icons = {
      success: "✓",
      danger: "✕",
      warning: "!",
      info: "i",
      primary: "i",
      secondary: "i"
    };
    const icon = icons[variant] || "i";

    const el = document.createElement("div");
    el.className = `app-toast app-toast-${variant}`;
    el.role = "status";
    el.ariaLive = "polite";
    el.ariaAtomic = "true";

    el.innerHTML = `
      <span class="app-toast-icon">${icon}</span>
      <div class="app-toast-body">
        <strong class="app-toast-title">${this.#escape(title || "Bilgi")}</strong>
        <span class="app-toast-message">${this.#escape(message || "")}</span>
      </div>
      <button type="button" class="app-toast-close" aria-label="Kapat">×</button>
    `;

    this.root.appendChild(el);

    requestAnimationFrame(() => el.classList.add("app-toast-show"));

    const close = () => {
      el.classList.remove("app-toast-show");
      el.classList.add("app-toast-hide");
      setTimeout(() => el.remove(), 300);
    };

    el.querySelector(".app-toast-close").addEventListener("click", close);
    const durations = { success: 3500, danger: 6000, warning: 5500, info: 5000, secondary: 3000 };
    setTimeout(close, durations[variant] || 4000);
  }

  #escape(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

class ForgotView {
  constructor({ api, toasts, onBack }) {
    this.api    = api;
    this.toasts = toasts;
    this.onBack = onBack;
    this.el     = document.getElementById("forgotView");
    this.email  = "";

    this.#wire();
  }

  show() {
    this.el?.classList.remove("d-none");
    this.#resetToEmailStep();
  }

  hide() {
    this.el?.classList.add("d-none");
  }

  #steps() {
    return ["forgotStepEmail","forgotStepForm","forgotStepPending","forgotStepApproved","forgotStepRejected"];
  }

  #showStep(id) {
    this.#steps().forEach(s => {
      document.getElementById(s)?.classList.toggle("d-none", s !== id);
    });
  }

  #resetToEmailStep() {
    const emailInput = document.getElementById("forgotEmailInput");
    if (emailInput) emailInput.value = "";
    this.email = "";
    this.#showStep("forgotStepEmail");
  }

  #wire() {
    document.getElementById("btnBackToLogin")?.addEventListener("click", () => {
      this.hide();
      this.onBack?.();
    });

    document.getElementById("btnForgotCheckEmail")?.addEventListener("click", () => this.#checkEmail());
    document.getElementById("forgotEmailInput")?.addEventListener("keydown", e => { if (e.key === "Enter") this.#checkEmail(); });

    document.getElementById("btnForgotSubmit")?.addEventListener("click", () => this.#submitRequest());

    document.getElementById("btnForgotRecheck")?.addEventListener("click", () => this.#recheckStatus());

    document.getElementById("btnForgotSetPw")?.addEventListener("click", () => this.#setNewPassword());

    document.getElementById("btnForgotRetry")?.addEventListener("click", () => {
      this.#showStep("forgotStepForm");
    });

    this.el?.addEventListener("click", (e) => {
      const btn = e.target.closest(".pw-toggle");
      if (!btn || !this.el.contains(btn)) return;
      e.preventDefault();
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.querySelector(".pw-eye-show")?.classList.toggle("d-none", isPassword);
      btn.querySelector(".pw-eye-hide")?.classList.toggle("d-none", !isPassword);
    });
  }

  async #checkEmail() {
    const emailInput = document.getElementById("forgotEmailInput");
    const email = (emailInput?.value || "").trim();
    if (!email) { emailInput?.focus(); return; }

    const btn = document.getElementById("btnForgotCheckEmail");
    btn.disabled = true;
    const r = await this.api.pwresetCheck(email);
    btn.disabled = false;

    if (!r.ok) { this.toasts.show({ title: "Hata", message: r.error, variant: "danger" }); return; }

    this.email = email;

    if (r.status === "none") {
      document.getElementById("forgotFormEmail").value = email;
      document.getElementById("forgotLastPw").value = "";
      document.getElementById("forgotAmount").value = "";
      const a = document.getElementById("forgotFormAlert");
      a.classList.add("d-none"); a.textContent = "";
      this.#showStep("forgotStepForm");
    } else if (r.status === "pending") {
      this.#showStep("forgotStepPending");
    } else if (r.status === "approved") {
      const note = r.adminNote || "Talebiniz onaylandı. Yeni şifrenizi belirleyebilirsiniz.";
      const el = document.getElementById("forgotAdminNoteApproved");
      if (el) el.textContent = `Yönetici notu: ${note}`;
      const a = document.getElementById("forgotApprovedAlert");
      a?.classList.add("d-none");
      document.getElementById("forgotNewPw").value = "";
      this.#showStep("forgotStepApproved");
    } else if (r.status === "rejected") {
      const note = r.adminNote || "Talebiniz reddedildi.";
      const el = document.getElementById("forgotAdminNoteRejected");
      if (el) el.textContent = note;
      this.#showStep("forgotStepRejected");
    }
  }

  async #submitRequest() {
    const lastPw  = document.getElementById("forgotLastPw")?.value || "";
    const amount  = parseFloat(document.getElementById("forgotAmount")?.value || "0") || 0;
    const alertEl = document.getElementById("forgotFormAlert");

    const btn = document.getElementById("btnForgotSubmit");
    btn.disabled = true;
    const r = await this.api.pwresetSubmit({ email: this.email, lastKnownPassword: lastPw, reportedAmount: amount });
    btn.disabled = false;

    if (!r.ok) {
      alertEl.textContent = r.error;
      alertEl.classList.remove("d-none");
      return;
    }
    this.#showStep("forgotStepPending");
    this.toasts.show({ title: "Talep Gönderildi", message: "Yönetici inceledikten sonra tekrar kontrol edin.", variant: "success" });
  }

  async #recheckStatus() {
    const btn = document.getElementById("btnForgotRecheck");
    btn.disabled = true;
    const r = await this.api.pwresetCheck(this.email);
    btn.disabled = false;

    if (!r.ok) { this.toasts.show({ title: "Hata", message: r.error, variant: "danger" }); return; }

    if (r.status === "approved") {
      const note = r.adminNote || "Talebiniz onaylandı.";
      document.getElementById("forgotAdminNoteApproved").textContent = `Yönetici notu: ${note}`;
      document.getElementById("forgotApprovedAlert")?.classList.add("d-none");
      document.getElementById("forgotNewPw").value = "";
      this.#showStep("forgotStepApproved");
    } else if (r.status === "rejected") {
      document.getElementById("forgotAdminNoteRejected").textContent = r.adminNote || "Talebiniz reddedildi.";
      this.#showStep("forgotStepRejected");
    } else {
      this.toasts.show({ title: "Bilgi", message: "Talebiniz hâlâ inceleniyor.", variant: "info" });
    }
  }

  async #setNewPassword() {
    const pw      = (document.getElementById("forgotNewPw")?.value || "").trim();
    const alertEl = document.getElementById("forgotApprovedAlert");
    if (pw.length < 8) {
      alertEl.textContent = "Şifre en az 8 karakter olmalı.";
      alertEl.classList.remove("d-none");
      return;
    }
    const btn = document.getElementById("btnForgotSetPw");
    btn.disabled = true;
    const r = await this.api.pwresetSetPassword({ email: this.email, newPassword: pw });
    btn.disabled = false;

    if (!r.ok) {
      alertEl.textContent = r.error;
      alertEl.classList.remove("d-none");
      return;
    }
    this.toasts.show({ title: "Başarılı", message: "Şifreniz güncellendi. Giriş yapabilirsiniz.", variant: "success" });
    this.hide();
    this.onBack?.();
  }
}

class AuthView {
  constructor({ root, api, toasts, onAuthed, onForgot }) {
    this.root = root;
    this.api = api;
    this.toasts = toasts;
    this.onAuthed = onAuthed;
    this.onForgot = onForgot;

    this.tabLogin = root.querySelector('[data-tab="login"]');
    this.tabRegister = root.querySelector('[data-tab="register"]');
    this.title = document.getElementById("authTitle");
    this.subtitle = document.getElementById("authSubtitle");
    this.loginForm = root.querySelector("#loginForm");
    this.registerForm = root.querySelector("#registerForm");
    this.alert = root.querySelector("#authAlert");
    this.orgInfo = root.querySelector("#orgInfo");

    this.#wire();
    this.setTab("login");
  }

  setTab(which) {
    const isLogin = which === "login";
    this.tabLogin?.classList.toggle("active", isLogin);
    this.tabRegister?.classList.toggle("active", !isLogin);

    const showForm = isLogin ? this.loginForm : this.registerForm;
    const hideForm = isLogin ? this.registerForm : this.loginForm;

    if (showForm === hideForm) return;

    if (!showForm.classList.contains("d-none") && hideForm.classList.contains("d-none")) {
      return;
    }

    const isInitialHide = hideForm.classList.contains("d-none");
    const leaveDelay = isInitialHide ? 0 : 180;

    if (!isInitialHide) {
      hideForm.classList.add("auth-form-leave");
    }

    setTimeout(() => {
      hideForm.classList.add("d-none");
      hideForm.classList.remove("auth-form-leave");

      showForm.classList.remove("d-none");
      showForm.classList.add("auth-form-enter");
      requestAnimationFrame(() => {
        showForm.classList.add("auth-form-enter-active");
      });
      setTimeout(() => {
        showForm.classList.remove("auth-form-enter", "auth-form-enter-active");
      }, 350);
    }, leaveDelay);

    if (this.title || this.subtitle) {
      const heroEl = document.querySelector(".auth-hero");
      heroEl?.classList.add("auth-hero-fade");
      setTimeout(() => {
        if (this.title) this.title.textContent = isLogin ? "Hesabına Giriş Yap" : "Yeni Hesap Oluştur";
        if (this.subtitle) {
          this.subtitle.textContent = isLogin
            ? "Binlerce etkinliği keşfet, biletini al ve organizasyonunu büyüt — hepsi tek bir panelde."
            : "Hesap türünü seç, bilgilerini gir ve Alpaca dünyasına katıl.";
        }
        heroEl?.classList.remove("auth-hero-fade");
      }, 180);
    }

    this.#setAlert(null);
  }

  #setAlert(msg) {
    if (!msg) {
      this.alert.classList.add("d-none");
      this.alert.textContent = "";
      return;
    }
    this.alert.classList.remove("d-none");
    this.alert.textContent = msg;
  }

  #validationMessage(input) {
    const v = input.validity;
    if (v.valueMissing) return "Bu alanı doldurun.";
    if (v.typeMismatch && input.type === "email") return "Geçerli bir e-posta adresi girin.";
    if (v.typeMismatch && input.type === "url") return "Geçerli bir URL girin.";
    if (v.tooShort) return `En az ${input.minLength} karakter girin.`;
    if (v.tooLong) return `En fazla ${input.maxLength} karakter girin.`;
    if (v.rangeUnderflow) return `En düşük değer: ${input.min}`;
    if (v.rangeOverflow) return `En yüksek değer: ${input.max}`;
    if (v.patternMismatch) return "Geçersiz format.";
    if (v.stepMismatch) return "Geçersiz değer.";
    return "Geçersiz giriş.";
  }

  #showFieldError(input, msg) {
    input.classList.add("auth-input-invalid");
    let errEl = input.parentElement.querySelector(".auth-field-error");
    if (!errEl) {
      errEl = document.createElement("span");
      errEl.className = "auth-field-error";
      input.parentElement.appendChild(errEl);
    }
    errEl.textContent = msg;
    requestAnimationFrame(() => errEl.classList.add("show"));
  }

  #clearFieldError(input) {
    input.classList.remove("auth-input-invalid");
    const errEl = input.parentElement.querySelector(".auth-field-error");
    if (errEl) {
      errEl.classList.remove("show");
      setTimeout(() => errEl.remove(), 200);
    }
  }

  #wire() {
    this.tabLogin?.addEventListener("click", () => this.setTab("login"));
    this.tabRegister?.addEventListener("click", () => this.setTab("register"));
    this.root.querySelectorAll(".auth-switch").forEach((btn) => {
      btn.addEventListener("click", () => this.setTab(btn.getAttribute("data-tab")));
    });

    [this.loginForm, this.registerForm].forEach((form) => {
      const inputs = form.querySelectorAll("input");
      inputs.forEach((input) => {
        input.addEventListener("invalid", (e) => {
          e.preventDefault();
          const msg = this.#validationMessage(input);
          this.#showFieldError(input, msg);
        });
        input.addEventListener("input", () => {
          if (input.classList.contains("auth-input-invalid")) {
            this.#clearFieldError(input);
          }
        });
      });
    });

    const forgotLink = this.root.querySelector(".auth-forgot");
    forgotLink?.addEventListener("click", (e) => {
      e.preventDefault();
      this.onForgot?.();
    });

    const btnPrivacy = document.getElementById("btnPrivacy");
    btnPrivacy?.addEventListener("click", () => {
      const modalEl = document.getElementById("privacyModal");
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    this.#wirePasswordToggles();
    this.#wirePasswordValidation();

    this.root.querySelectorAll("[data-quick-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const role = btn.getAttribute("data-quick-role");
        this.setTab("register");
        const radio = this.registerForm.querySelector(`input[name="role"][value="${role}"]`);
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change"));
        }
      });
    });

    const roleInputs = this.registerForm.querySelectorAll('input[name="role"]');
    roleInputs.forEach(input => {
      input.addEventListener("change", () => {
        const isOrg = input.value === "organization";
        this.orgInfo?.classList.toggle("d-none", !isOrg);
      });
    });

    this.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      this.#setAlert(null);
      const email = this.loginForm.querySelector('[name="email"]').value;
      const password = this.loginForm.querySelector('[name="password"]').value;

      const btn = this.loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Giriş yapılıyor...";

      try {
        const r = await this.api.login({ email, password });
        if (!r.ok) {
          this.#setAlert(r.error || "Giriş başarısız.");
          return;
        }
        this.toasts.show({ title: "Başarılı", message: "Giriş yapıldı.", variant: "success" });
        await this.onAuthed();
      } finally {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || "Giriş Yap";
      }
    });

    this.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      this.#setAlert(null);

      const displayName = this.registerForm.querySelector('[name="displayName"]').value;
      const email = this.registerForm.querySelector('[name="email"]').value;
      const password = this.registerForm.querySelector('[name="password"]').value;
      const password2 = this.registerForm.querySelector('[name="password2"]').value;
      const role = this.registerForm.querySelector('input[name="role"]:checked')?.value || "individual";

      if (password !== password2) {
        this.#setAlert("Şifreler eşleşmiyor.");
        return;
      }
      if (!this.#allPasswordRulesPass()) {
        this.#setAlert("Şifre tüm kriterleri karşılamıyor. Lütfen kontrol et.");
        return;
      }

      const btn = this.registerForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Kayıt oluşturuluyor...";

      try {
        const r = await this.api.register({ displayName, email, password, role });
        if (!r.ok) {
          this.#setAlert(r.error || "Kayıt başarısız.");
          return;
        }
        if (r.requiresApproval) {
          this.toasts.show({ title: "Bilgi", message: r.message, variant: "info" });
          this.setTab("login");
        } else {
          this.toasts.show({ title: "Hoş geldin", message: "Hesabın oluşturuldu.", variant: "success" });
          await this.onAuthed();
        }
      } finally {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || "Hesap Oluştur";
      }
    });
  }

  #wirePasswordToggles() {
    document.querySelectorAll(".pw-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.getAttribute("data-target"));
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.querySelector(".pw-eye-show").classList.toggle("d-none", show);
        btn.querySelector(".pw-eye-hide").classList.toggle("d-none", !show);
      });
    });
  }

  #wirePasswordValidation() {
    const pwInput  = this.registerForm.querySelector('[name="password"]');
    const pw2Input = this.registerForm.querySelector('[name="password2"]');
    if (!pwInput || !pw2Input) return;

    const COMMON = new Set([
      "12345678","123456789","1234567890","password","password1","qwerty123",
      "iloveyou","admin123","letmein1","welcome1","monkey123","dragon123",
      "master123","alpaca123","alpaca","11111111","00000000","abcdefgh",
      "qwertyui","asdfghjk","zxcvbnm1","football","baseball","superman",
      "passw0rd","abc12345","123qwert","test1234","bilet123"
    ]);

    const rule = (id, pass) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("pass", pass);
      el.classList.toggle("fail", !pass);
    };

    const checkPw = () => {
      const pw = pwInput.value;
      if (!pw) {
        ["pwRuleLen","pwRuleUpper","pwRuleLower","pwRuleNum","pwRuleSym","pwRuleCommon"].forEach(id => {
          const el = document.getElementById(id);
          el?.classList.remove("pass", "fail");
        });
        checkMatch();
        return;
      }
      rule("pwRuleLen",    pw.length >= 8);
      rule("pwRuleUpper",  /[A-Z]/.test(pw));
      rule("pwRuleLower",  /[a-z]/.test(pw));
      rule("pwRuleNum",    /[0-9]/.test(pw));
      rule("pwRuleSym",    /[^A-Za-z0-9]/.test(pw));
      rule("pwRuleCommon", !COMMON.has(pw.toLowerCase()));
      checkMatch();
    };

    const checkMatch = () => {
      const el = document.getElementById("pwRuleMatch");
      if (!el) return;
      const pw  = pwInput.value;
      const pw2 = pw2Input.value;
      if (!pw2) { el.classList.remove("pass","fail"); el.textContent = ""; return; }
      const ok = pw === pw2;
      el.classList.toggle("pass", ok);
      el.classList.toggle("fail", !ok);
      el.textContent = ok ? "Şifreler eşleşiyor" : "Şifreler eşleşmiyor";
    };

    pwInput.addEventListener("input", checkPw);
    pw2Input.addEventListener("input", checkMatch);
  }

  #allPasswordRulesPass() {
    return ["pwRuleLen","pwRuleUpper","pwRuleLower","pwRuleNum","pwRuleSym","pwRuleCommon","pwRuleMatch"]
      .every(id => document.getElementById(id)?.classList.contains("pass"));
  }
}

class AppView {
  constructor({ root, api, toasts, onLoggedOut }) {
    this.root = root;
    this.api = api;
    this.toasts = toasts;
    this.onLoggedOut = onLoggedOut;

    this.whoami = root.querySelector("#whoami");
    this.userAvatar = root.querySelector("#userAvatar");
    this.userName = root.querySelector("#userName");
    this.userRole = root.querySelector("#userRole");
    this.btnLogout = root.querySelector("#btnLogout");
    this.eventDetailModal = root.querySelector("#eventDetailModal");
    this.btnNewEvent = root.querySelector("#btnNewEvent");
    this.btnNewEvent2 = root.querySelector("#btnNewEvent2");
    this.navAdmin = root.querySelector("#navAdmin");
    this.pendingOrgsList = root.querySelector("#pendingOrgsList");
    this.usersList = root.querySelector("#usersList");
    this.btnRefreshUsers = root.querySelector("#btnRefreshUsers");
    this.eventModal = document.querySelector("#eventModal");
    this.eventForm = document.querySelector("#eventForm");
    this.btnSaveEvent = document.querySelector("#btnSaveEvent");
    this.eventList = root.querySelector("#eventList");
    this.eventListFull = root.querySelector("#eventListFull");
    this.pageTitle = root.querySelector("#pageTitle");

    this.metricsOrgAdmin = root.querySelector("#metricsOrgAdmin");
    this.metricRevenue = root.querySelector("#metricRevenue");
    this.metricTickets = root.querySelector("#metricTickets");
    this.metricOccupancy = root.querySelector("#metricOccupancy");
    this.metricOccupancyLabel = root.querySelector("#metricOccupancyLabel");
    this.metricPending = root.querySelector("#metricPending");

    this.metricsIndividual = root.querySelector("#metricsIndividual");
    this.metricTotalSpent = root.querySelector("#metricTotalSpent");
    this.metricTicketsBought = root.querySelector("#metricTicketsBought");
    this.metricOrderCount = root.querySelector("#metricOrderCount");
    this.metricSubscriptionCount = root.querySelector("#metricSubscriptionCount");

    this.eventModalTitle = document.querySelector("#eventModalTitle");

    this.checkoutPanel = root.querySelector("#checkoutPanel");

    this.checkoutEventSelect = root.querySelector("#checkoutEventSelect");
    this.checkoutCustomerName = root.querySelector("#checkoutCustomerName");
    this.checkoutQuantity = root.querySelector("#checkoutQuantity");
    this.checkoutTotal = root.querySelector("#checkoutTotal");
    this.priceStandard = root.querySelector("#priceStandard");
    this.priceVip = root.querySelector("#priceVip");
    this.btnPlaceOrder = root.querySelector("#btnPlaceOrder");
    this.ticketButtons = root.querySelectorAll("#checkoutPanel .ticket-choice button");

    this.buyEventSelect = root.querySelector("#buyEventSelect");
    this.buyCustomerName = root.querySelector("#buyCustomerName");
    this.buyStdPrice = root.querySelector("#buyStdPrice");
    this.buyVipPrice = root.querySelector("#buyVipPrice");
    this.buySelectedCount = root.querySelector("#buySelectedCount");
    this.buyUnitPrice = root.querySelector("#buyUnitPrice");
    this.buyDiscountRow = root.querySelector("#buyDiscountRow");
    this.buyDiscountAmount = root.querySelector("#buyDiscountAmount");
    this.buyTotal = root.querySelector("#buyTotal");
    this.btnBuyTickets = root.querySelector("#btnBuyTickets");
    this.seatGrid = root.querySelector("#seatGrid");
    this.buyTicketButtons = root.querySelectorAll("[data-buy-ticket]");
    this.buySelectedTicket = "standard";
    this.buySelectedSeats = new Set();
    this.buyCurrentEvent = null;

    this.topbarSubtitle = root.querySelector("#topbarSubtitle");
    this.topbarGreetingText = root.querySelector(".topbar-greeting-text");

    this.ordersList = root.querySelector("#ordersList");

    this.events = [];
    this.selectedTicketType = "standard";
    this.currentUser = null;

    this.#wire();
  }

  setUser(user) {
    this.currentUser = user;
    if (this.whoami) this.whoami.textContent = user ? `${user.displayName} • ${user.email}` : "-";

    if (user) {
      const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
      if (this.userAvatar) this.userAvatar.textContent = initial || "?";
      if (this.userName) this.userName.textContent = user.displayName || "-";
      if (this.userRole) {
        const isAdmin = user.isAdmin === 1;
        const roleLabel = isAdmin
          ? "Yönetici"
          : user.role === "organization"
            ? "Organizasyon"
            : "Bireysel";
        this.userRole.textContent = roleLabel;
      }
      if (this.topbarGreetingText) {
        this.topbarGreetingText.textContent = `Merhaba, ${user.displayName || "kullanıcı"}`;
      }
    }

    const role = user?.role || "individual";
    const isAdmin = user?.isAdmin === 1;
    const canCreateEvent = role === "organization" || isAdmin;

    this.btnNewEvent?.classList.toggle("d-none", !canCreateEvent);
    this.btnNewEvent2?.classList.toggle("d-none", !canCreateEvent);

    this.navAdmin?.classList.toggle("d-none", !isAdmin);

    this.checkoutPanel?.classList.remove("d-none");

    if (role === "individual" && !isAdmin && this.checkoutCustomerName && !this.checkoutCustomerName.value) {
      this.checkoutCustomerName.value = user?.displayName || "";
    }

    if (role === "individual" && !isAdmin) {
      this.metricsIndividual?.classList.remove("d-none");
      this.metricsOrgAdmin?.classList.add("d-none");
    } else {
      this.metricsOrgAdmin?.classList.remove("d-none");
      this.metricsIndividual?.classList.add("d-none");
    }

    this.#updateSidebar(user);

    this.#loadEvents();
    this.#loadStats();
    this.#loadOrders();

    if (isAdmin) {
      this.api.pendingOrgs().then(r => {
        if (r.ok && r.users && r.users.length > 0) {
          this.toasts.show({
            title: "⏳ Onay Bekliyor",
            message: `${r.users.length} organizasyon onay bekliyor.`,
            variant: "warning"
          });
        }
      });
    }
  }

  #wire() {
    this.btnLogout.addEventListener("click", async () => {
      await this.api.logout();
      this.toasts.show({ title: "Çıkış", message: "Oturum kapatıldı.", variant: "secondary" });
      await this.onLoggedOut();
    });

    const openEventModal = () => {
      if (!this.eventModal) return;
      this.eventForm.reset();
      this.eventForm.querySelector('[name="id"]').value = "";
      if (this.eventModalTitle) this.eventModalTitle.textContent = "Yeni Etkinlik Oluştur";
      this.btnSaveEvent.textContent = "Oluştur";
      this.eventModalInstance = bootstrap.Modal.getOrCreateInstance(this.eventModal);
      this.eventModalInstance.show();
    };
    this.btnNewEvent?.addEventListener("click", openEventModal);
    this.btnNewEvent2?.addEventListener("click", openEventModal);

    this.btnRefreshUsers?.addEventListener("click", () => this.#loadUsers());

    this.btnSaveEvent?.addEventListener("click", async () => {
      const id = this.eventForm.querySelector('[name="id"]').value;
      const name = this.eventForm.querySelector('[name="name"]').value;
      const description = this.eventForm.querySelector('[name="description"]').value;
      const imageUrl = this.eventForm.querySelector('[name="imageUrl"]').value;
      const venue = this.eventForm.querySelector('[name="venue"]').value;
      const eventDate = this.eventForm.querySelector('[name="eventDate"]').value;
      const capacity = this.eventForm.querySelector('[name="capacity"]').value;
      const standardPrice = this.eventForm.querySelector('[name="standardPrice"]').value;
      const vipPrice = this.eventForm.querySelector('[name="vipPrice"]').value;
      const discountThreshold = this.eventForm.querySelector('[name="discountThreshold"]').value;
      const discountPercent = this.eventForm.querySelector('[name="discountPercent"]').value;

      if (!name || !venue || !eventDate || !capacity) {
        this.toasts.show({ title: "Hata", message: "Zorunlu alanları doldurun.", variant: "danger" });
        return;
      }

      const selDate = new Date(eventDate);
      if (selDate < new Date() && !id) {
        this.toasts.show({ title: "⚠️ Dikkat", message: "Etkinlik tarihi geçmişte görünüyor. Devam etmek istediğinizden emin misiniz?", variant: "warning" });
      }

      const thr = parseInt(discountThreshold) || 0;
      const pct = parseFloat(discountPercent) || 0;
      if ((thr > 0 && pct === 0) || (thr === 0 && pct > 0)) {
        this.toasts.show({ title: "ℹ️ Bilgi", message: "İndirim eşiği ve yüzdesini birlikte doldurun, aksi hâlde indirim uygulanmaz.", variant: "info" });
      }

      const payload = {
        name, venue, eventDate, description, imageUrl,
        capacity: parseInt(capacity),
        standardPrice: parseFloat(standardPrice) || 0,
        vipPrice: parseFloat(vipPrice) || 0,
        discountThreshold: parseInt(discountThreshold) || 0,
        discountPercent: parseFloat(discountPercent) || 0
      };

      const r = id
        ? await this.api.updateEvent({ ...payload, id: parseInt(id) })
        : await this.api.createEvent(payload);

      if (r.ok) {
        this.toasts.show({
          title: "Başarılı",
          message: id ? "Etkinlik güncellendi." : "Etkinlik oluşturuldu.",
          variant: "success"
        });
        this.eventModalInstance?.hide();
        this.eventForm.reset();
        await this.#loadEvents();
        await this.#loadStats();
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });

    this.checkoutEventSelect?.addEventListener("change", () => this.#updateCheckoutPanel());
    this.checkoutQuantity?.addEventListener("input", () => this.#updateCheckoutTotal());
    this.checkoutCustomerName?.addEventListener("input", () => this.#updateCheckoutTotal());

    this.ticketButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        this.ticketButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedTicketType = btn.getAttribute("data-ticket-type") || "standard";
        this.#updateCheckoutTotal();
      });
    });

    this.btnPlaceOrder?.addEventListener("click", async () => {
      const eventId = this.checkoutEventSelect.value;
      const customerName = this.checkoutCustomerName.value.trim();
      const quantity = parseInt(this.checkoutQuantity.value) || 1;

      if (!eventId) {
        this.toasts.show({ title: "Hata", message: "Etkinlik seçin.", variant: "danger" });
        return;
      }
      if (!customerName) {
        this.toasts.show({ title: "Hata", message: "Müşteri adı girin.", variant: "danger" });
        return;
      }

      const r = await this.api.createOrder({
        eventId, customerName,
        ticketType: this.selectedTicketType,
        quantity
      });
      if (r.ok) {
        const discountMsg = r.discountApplied > 0
          ? ` (₺${r.discountApplied.toFixed(0)} indirim)`
          : "";
        const seatsMsg = (r.seats && r.seats.length)
          ? ` Koltuk: ${this.#formatSeats(r.seats)}.`
          : "";
        this.toasts.show({
          title: "Sipariş tamamlandı",
          message: `Toplam: ₺${r.totalPrice.toFixed(2)}${discountMsg}.${seatsMsg}`,
          variant: "success"
        });
        this.checkoutCustomerName.value = "";
        this.checkoutQuantity.value = 1;
        await this.#loadEvents();
        await this.#loadStats();
        await this.#loadOrders();
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
  }

  #formatSeats(seats) {
    if (!Array.isArray(seats) || !seats.length) return "";
    const sorted = [...seats].sort((a, b) => a - b);
    const groups = [];
    let start = sorted[0], prev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      const n = sorted[i];
      if (n === prev + 1) {
        prev = n;
        continue;
      }
      groups.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = n; prev = n;
    }
    return groups.join(", ");
  }

  async #loadPendingOrgs() {
    const r = await this.api.pendingOrgs();
    if (!r.ok) {
      this.pendingOrgsList.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Hata: ${r.error}</td></tr>`;
      return;
    }

    if (!r.users || r.users.length === 0) {
      this.pendingOrgsList.innerHTML = `<tr><td colspan="5" class="text-center">Bekleyen organizasyon yok.</td></tr>`;
      return;
    }

    this.pendingOrgsList.innerHTML = r.users.map(user => `
      <tr>
        <td class="mono">${user.id}</td>
        <td>${user.displayName}</td>
        <td>${user.email}</td>
        <td>${new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
        <td>
          <button class="btn btn-sm btn-success" data-approve="${user.id}">Onayla</button>
        </td>
      </tr>
    `).join("");

    this.pendingOrgsList.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.getAttribute("data-approve");
        const r = await this.api.approveOrg(userId);
        if (r.ok) {
          this.toasts.show({ title: "Başarılı", message: "Organizasyon onaylandı.", variant: "success" });
          await this.#loadPendingOrgs();
          await this.#loadUsers();
        } else {
          this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
        }
      });
    });
  }

  async #loadUsers() {
    if (!this.usersList) return;
    const r = await this.api.listUsers();
    if (!r.ok) {
      this.usersList.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Hata: ${r.error}</td></tr>`;
      return;
    }
    if (!r.users || r.users.length === 0) {
      this.usersList.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Kullanıcı yok.</td></tr>`;
      return;
    }

    const myId = this.currentUser?.id;
    this.usersList.innerHTML = r.users.map(u => {
      const isMe = u.id === myId;
      const roleBadge = u.role === "organization"
        ? `<span class="badge text-bg-info">Organizasyon</span>`
        : `<span class="badge text-bg-secondary">Bireysel</span>`;
      const approvedBadge = u.isApproved
        ? `<span class="badge text-bg-success">Onaylı</span>`
        : `<span class="badge text-bg-warning">Beklemede</span>`;
      const adminBadge = u.isAdmin
        ? `<span class="badge text-bg-danger">Yönetici</span>`
        : `<span class="text-muted">-</span>`;

      const actions = [];
      if (!isMe) {
        if (u.role === "organization" && !u.isApproved) {
          actions.push(`<button class="btn btn-sm btn-success" data-user-approve="${u.id}">Onayla</button>`);
        }
        actions.push(`<button class="btn btn-sm ${u.isAdmin ? 'btn-warning' : 'btn-outline-warning'}" data-user-toggle-admin="${u.id}" data-current="${u.isAdmin}">${u.isAdmin ? 'Yön. Kaldır' : 'Yönetici Yap'}</button>`);
        actions.push(`<button class="btn btn-sm btn-outline-info" data-user-reset-pw="${u.id}" data-user-name="${this.#escape(u.displayName)}" data-user-email="${this.#escape(u.email)}">🔑 Şifre Sıfırla</button>`);
        actions.push(`<button class="btn btn-sm btn-outline-danger" data-user-delete="${u.id}">Sil</button>`);
      } else {
        actions.push(`<span class="text-muted small">(siz)</span>`);
      }

      return `
        <tr>
          <td class="mono">${u.id}</td>
          <td>${this.#escape(u.displayName)}</td>
          <td>${this.#escape(u.email)}</td>
          <td>${roleBadge}</td>
          <td>${approvedBadge}</td>
          <td>${adminBadge}</td>
          <td><small class="text-muted">${new Date(u.createdAt).toLocaleDateString('tr-TR')}</small></td>
          <td><div class="d-flex gap-1 flex-wrap">${actions.join("")}</div></td>
        </tr>
      `;
    }).join("");

    this.usersList.querySelectorAll("[data-user-approve]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.getAttribute("data-user-approve");
        const r = await this.api.approveOrg(userId);
        if (r.ok) {
          this.toasts.show({ title: "Başarılı", message: "Kullanıcı onaylandı.", variant: "success" });
          await this.#loadUsers();
          await this.#loadPendingOrgs();
        } else {
          this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
        }
      });
    });

    this.usersList.querySelectorAll("[data-user-toggle-admin]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.getAttribute("data-user-toggle-admin");
        const current = btn.getAttribute("data-current") === "1";
        const r = await this.api.updateUser({ userId, isAdmin: !current });
        if (r.ok) {
          this.toasts.show({ title: "Başarılı", message: "Kullanıcı güncellendi.", variant: "success" });
          await this.#loadUsers();
        } else {
          this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
        }
      });
    });

    this.usersList.querySelectorAll("[data-user-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.getAttribute("data-user-delete");
        if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz? Etkinlikleri ve abonelikleri de silinecek.")) return;
        const r = await this.api.deleteUser(userId);
        if (r.ok) {
          this.toasts.show({ title: "Başarılı", message: "Kullanıcı silindi.", variant: "success" });
          await this.#loadUsers();
          await this.#loadPendingOrgs();
        } else {
          this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
        }
      });
    });

    this.usersList.querySelectorAll("[data-user-reset-pw]").forEach(btn => {
      btn.addEventListener("click", () => {
        const userId   = btn.getAttribute("data-user-reset-pw");
        const name     = btn.getAttribute("data-user-name");
        const email    = btn.getAttribute("data-user-email");
        this.#openPwResetModal(userId, name, email);
      });
    });
  }

  async #loadResetRequests() {
    const tbody = document.getElementById("pwResetList");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Yükleniyor...</td></tr>`;

    document.getElementById("btnRefreshPwResets")?.addEventListener("click", () => this.#loadResetRequests());

    const r = await this.api.listResetRequests();
    if (!r.ok) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${r.error}</td></tr>`;
      return;
    }
    if (!r.requests || r.requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Henüz şifre sıfırlama talebi yok.</td></tr>`;
      return;
    }

    const statusBadge = s => ({
      pending:   `<span class="badge text-bg-warning">Bekliyor</span>`,
      approved:  `<span class="badge text-bg-success">Onaylandı</span>`,
      rejected:  `<span class="badge text-bg-danger">Reddedildi</span>`,
      completed: `<span class="badge text-bg-secondary">Tamamlandı</span>`
    }[s] || s);

    const scoreColor = sc => sc >= 70 ? "text-success" : sc >= 40 ? "text-warning" : "text-danger";

    tbody.innerHTML = r.requests.map(req => {
      const sc = req.accuracyScore;
      const scoreHex = sc >= 70 ? "#10b981" : sc >= 40 ? "#f59e0b" : "#ef4444";
      const scoreBg  = sc >= 70 ? "rgba(16,185,129,0.12)" : sc >= 40 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";
      const pwDisplay = req.lastKnownPassword
        ? `<code style="font-size:0.8rem;word-break:break-all">${this.#escape(req.lastKnownPassword)}</code>`
        : `<span style="color:var(--ink-muted);font-size:0.8rem;font-style:italic">girilmedi</span>`;
      const noteDisplay = req.adminNote
        ? `<div class="pwreset-card-note">${this.#escape(req.adminNote)}</div>` : "";
      const action = req.status === "pending"
        ? `<button class="btn btn-primary btn-sm px-3" data-pwresolve="${req.id}" data-email="${this.#escape(req.email)}" data-score="${req.accuracyScore}" data-amount="${req.reportedAmount}" data-lastpw="${this.#escape(req.lastKnownPassword || '')}">İncele →</button>`
        : "";
      return `
        <div class="pwreset-card-item">
          <div class="pwreset-card-top">
            <div class="pwreset-card-email">${this.#escape(req.email)}</div>
            <div class="pwreset-card-meta">
              ${statusBadge(req.status)}
              <span class="pwreset-score-pill" style="background:${scoreBg};color:${scoreHex}">%${sc}</span>
            </div>
          </div>
          <div class="pwreset-card-fields">
            <div class="pwreset-card-field">
              <span class="pwreset-field-label">Son Bilinen Şifre</span>
              <span>${pwDisplay}</span>
            </div>
            <div class="pwreset-card-field">
              <span class="pwreset-field-label">Beyan Tutarı</span>
              <span style="font-weight:600">₺${Number(req.reportedAmount || 0).toFixed(0)}</span>
            </div>
            <div class="pwreset-card-field">
              <span class="pwreset-field-label">Tarih</span>
              <span style="color:var(--ink-muted);font-size:0.82rem">${new Date(req.createdAt).toLocaleDateString('tr-TR')}</span>
            </div>
          </div>
          ${noteDisplay}
          ${action ? `<div class="pwreset-card-action">${action}</div>` : ""}
        </div>
      `;
    }).join("");

    tbody.querySelectorAll("[data-pwresolve]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.#openPwResolveModal({
          requestId: btn.getAttribute("data-pwresolve"),
          email:     btn.getAttribute("data-email"),
          score:     btn.getAttribute("data-score"),
          amount:    btn.getAttribute("data-amount"),
          lastPw:    btn.getAttribute("data-lastpw")
        });
      });
    });
  }

  #openPwResolveModal({ requestId, email, score, amount, lastPw }) {
    const modal = document.getElementById("pwResolveModal");
    if (!modal) return;
    const info    = document.getElementById("pwResolveInfo");
    const noteEl  = document.getElementById("pwResolveNote");
    if (noteEl) noteEl.value = "";

    const scoreNum = Number(score);
    const scoreColor = scoreNum >= 70 ? "#10b981" : scoreNum >= 40 ? "#f59e0b" : "#ef4444";
    const scoreBg    = scoreNum >= 70 ? "rgba(16,185,129,0.1)" : scoreNum >= 40 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
    const breakdown = [
      { label: "E-posta sistemde kayıtlı", pts: 30, desc: "Her zaman geçerli (e-posta bulunamadıysa talep oluşturulamaz)" },
      { label: "Şifre eşleşmesi", pts: 40, desc: "Son bilinen şifre mevcut şifreyle birebir uyuşuyor" },
      { label: "Son 3 gün ödeme tutarı", pts: 30, desc: "Beyan edilen tutar veritabanındaki son ödemelerle ±1₺ dahilinde" }
    ];
    if (info) info.innerHTML = `
      <div style="margin-bottom:10px">
        <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-muted);margin-bottom:4px">Kullanıcı</div>
        <strong style="font-size:0.95rem">${this.#escape(email)}</strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-muted);margin-bottom:2px">Beyan Tutarı</div>
          <strong>₺${Number(amount || 0).toFixed(0)}</strong>
        </div>
        <div>
          <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-muted);margin-bottom:2px">Son Bilinen Şifre</div>
          ${lastPw ? `<code style="font-size:0.8rem;word-break:break-all">${this.#escape(lastPw)}</code>` : '<em style="color:var(--ink-muted);font-size:0.82rem">girilmedi</em>'}
        </div>
      </div>
      <div style="background:${scoreBg};border:1px solid ${scoreColor}33;border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:0.8rem;color:var(--ink-muted)">Doğruluk Skoru</span>
          <span style="font-size:1.1rem;font-weight:800;color:${scoreColor}">%${scoreNum}</span>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;margin-top:6px;overflow:hidden">
          <div style="height:100%;width:${scoreNum}%;background:${scoreColor};border-radius:2px;transition:width .4s"></div>
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--ink-muted);line-height:1.6">
        ${breakdown.map(b => `<div>• <strong style="color:var(--ink)">${b.label}</strong> (+${b.pts}p): ${b.desc}</div>`).join("")}
      </div>
    `;

    const instance = bootstrap.Modal.getOrCreateInstance(modal);

    const wire = (btnId, action) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const fresh = btn.cloneNode(true);
      btn.replaceWith(fresh);
      fresh.addEventListener("click", async () => {
        const note = (document.getElementById("pwResolveNote")?.value || "").trim();
        fresh.disabled = true;
        const r = await this.api.resolveResetRequest({ requestId, action, adminNote: note });
        fresh.disabled = false;
        if (r.ok) {
          instance.hide();
          this.toasts.show({ title: action === "approved" ? "Onaylandı" : "Reddedildi", message: `Talep ${action === "approved" ? "onaylandı" : "reddedildi"}.`, variant: action === "approved" ? "success" : "danger" });
          this.#loadResetRequests();
        } else {
          this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
        }
      });
    };

    wire("btnPwResolveApprove", "approved");
    wire("btnPwResolveReject",  "rejected");
    instance.show();
  }

  #openPwResetModal(userId, name, email) {
    const modal      = document.getElementById("pwResetModal");
    const info       = document.getElementById("pwResetUserInfo");
    const input      = document.getElementById("pwResetInput");
    const alertEl    = document.getElementById("pwResetAlert");
    const confirmBtn = document.getElementById("pwResetConfirmBtn");
    if (!modal) return;

    if (info)    info.textContent = `${name} (${email}) kullanıcısı için yeni şifre belirle.`;
    if (input)   input.value = "";
    if (alertEl) { alertEl.classList.add("d-none"); alertEl.textContent = ""; }

    const pwToggle = modal.querySelector(".pw-toggle");
    if (pwToggle) {
      pwToggle.onclick = () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        pwToggle.querySelector(".pw-eye-show").classList.toggle("d-none", show);
        pwToggle.querySelector(".pw-eye-hide").classList.toggle("d-none", !show);
      };
    }

    const instance = bootstrap.Modal.getOrCreateInstance(modal);

    const handler = async () => {
      const pw = (input?.value || "").trim();
      if (pw.length < 8) {
        if (alertEl) { alertEl.textContent = "Şifre en az 8 karakter olmalı."; alertEl.classList.remove("d-none"); }
        return;
      }
      confirmBtn.disabled = true;
      const r = await this.api.resetPassword({ userId, newPassword: pw });
      confirmBtn.disabled = false;
      if (r.ok) {
        instance.hide();
        this.toasts.show({ title: "Başarılı", message: `${name} kullanıcısının şifresi sıfırlandı.`, variant: "success" });
      } else {
        if (alertEl) { alertEl.textContent = r.error; alertEl.classList.remove("d-none"); }
      }
    };

    if (confirmBtn) {
      confirmBtn.replaceWith(confirmBtn.cloneNode(true));
      document.getElementById("pwResetConfirmBtn").addEventListener("click", handler);
    }

    instance.show();
  }

  #wireSidebarOnce() {
    if (this.sidebarWired) return;
    this.sidebarWired = true;

    const navButtons = this.root.querySelectorAll(".side-nav button");
    const pageContents = this.root.querySelectorAll(".page-content");

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const page = btn.getAttribute("data-page");
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        pageContents.forEach(p => p.classList.add("d-none"));
        const targetPage = this.root.querySelector(`#page-${page}`);
        if (targetPage) targetPage.classList.remove("d-none");

        const titles = {
          dashboard: "Genel Bakış",
          events: "Etkinlik Yönetimi",
          buy: "Bilet Al",
          tickets: "Bilet Türleri",
          orders: "Siparişler",
          checkin: "Kapı Kontrolü",
          admin: "Yönetim Paneli",
          "pwreset-requests": "Şifre İstekleri"
        };
        const subtitles = {
          dashboard: "Tüm satış aktivitelerine hızlı bakış.",
          events: "Etkinlikleri görüntüle, abone ol veya yönet.",
          buy: "Etkinlik seç, koltuk haritasından yerini seç.",
          tickets: "Etkinliklere özel bilet türlerini yönet.",
          orders: "Geçmiş ve güncel sipariş kayıtları.",
          checkin: "QR kod ile etkinlik girişini denetle.",
          admin: "Kullanıcı yönetimi ve organizasyon onayları.",
          "pwreset-requests": "Kullanıcıların şifre sıfırlama taleplerini karara bağla."
        };
        if (this.pageTitle) this.pageTitle.textContent = titles[page] || "Alpaca";
        if (this.topbarSubtitle) this.topbarSubtitle.textContent = subtitles[page] || "";

        if (page === "admin" && this.currentUser?.isAdmin === 1) {
          this.#loadPendingOrgs();
          this.#loadUsers();
        }
        if (page === "pwreset-requests" && this.currentUser?.isAdmin === 1) {
          this.#loadResetRequests();
        }
        if (page === "buy") {
          this.#initBuyPage();
        }
        if (page === "profile") {
          this.#fillProfilePage(this.currentUser);
        }
      });
    });
  }

  #updateSidebar(user) {
    this.#wireSidebarOnce();

    const role = user?.role || "individual";
    const isAdmin = user?.isAdmin === 1;
    const effectiveRole = isAdmin ? "admin" : role;

    const navButtons = this.root.querySelectorAll(".side-nav button");
    let firstVisible = null;

    navButtons.forEach(btn => {
      const allowedRoles = (btn.getAttribute("data-roles") || "").split(",").map(r => r.trim());
      const visible = allowedRoles.includes(effectiveRole);
      btn.classList.toggle("d-none", !visible);
      if (visible && !firstVisible) firstVisible = btn;
    });

    const activeBtn = this.root.querySelector(".side-nav button.active");
    if (!activeBtn || activeBtn.classList.contains("d-none")) {
      navButtons.forEach(b => b.classList.remove("active"));
      if (firstVisible) firstVisible.click();
    }
  }

  async #loadEvents() {
    const r = await this.api.listEvents();
    if (!r.ok) {
      this.toasts.show({ title: "Hata", message: "Etkinlikler yüklenemedi: " + r.error, variant: "danger" });
      const errorMsg = `<div class="text-center text-danger py-4"><small>Hata: ${r.error}</small></div>`;
      this.eventList.innerHTML = errorMsg;
      if (this.eventListFull) this.eventListFull.innerHTML = errorMsg;
      return;
    }

    this.events = r.events || [];

    this.#populateCheckoutEvents();

    if (this.events.length === 0) {
      const emptyMsg = `
        <div class="text-center text-muted py-5">
          <p class="mb-1">Henüz etkinlik yok</p>
          <small>İlk etkinliğini oluştur!</small>
        </div>`;
      this.eventList.innerHTML = emptyMsg;
      if (this.eventListFull) this.eventListFull.innerHTML = emptyMsg;
      return;
    }

    const role = this.currentUser?.role || "individual";
    const isAdmin = this.currentUser?.isAdmin === 1;
    const userId = this.currentUser?.id;

    const eventHTML = this.events.map(event => {
      const date = new Date(event.eventDate);
      const day = date.getDate();
      const month = date.toLocaleDateString('tr-TR', { month: 'short' });
      const sold = event.soldTickets || 0;
      const capacity = event.capacity || 0;
      const occupancy = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;
      const revenue = (event.totalRevenue || 0).toFixed(0);
      const isOwner = event.organizerId === userId;
      const canManage = isOwner || isAdmin;
      const isSubscribed = event.isSubscribed > 0;

      const actions = [];
      if (canManage) {
        actions.push(`<button class="btn btn-sm btn-icon" data-edit="${event.id}" title="Düzenle" aria-label="Düzenle">✏️</button>`);
        actions.push(`<button class="btn btn-sm btn-icon btn-icon-danger" data-delete="${event.id}" title="Sil" aria-label="Sil">🗑️</button>`);
      }
      if (!isOwner) {
        actions.push(`<button class="btn btn-sm ${isSubscribed ? 'btn-subscribed' : 'btn-outline-primary'}" data-subscribe="${event.id}" data-subscribed="${isSubscribed ? '1' : '0'}" title="${isSubscribed ? 'Aboneliği iptal et' : 'Abone ol'}">${isSubscribed ? '★ Abone' : '☆ Abone Ol'}</button>`);
      }

      const subInfo = event.subscriberCount > 0
        ? `<span class="event-sub-count" title="${event.subscriberCount} abone">★ ${event.subscriberCount}</span>`
        : "";
      const discountBadge = (event.discountThreshold > 0 && event.discountPercent > 0)
        ? `<span class="event-discount-pill" title="${event.discountThreshold}+ bilet alımında %${event.discountPercent} indirim">%${event.discountPercent} indirim</span>`
        : "";

      return `
        <div class="event-row" data-event-id="${event.id}" role="button" tabindex="0">
          <div class="event-date"><strong>${day}</strong><span>${month}</span></div>
          <div class="event-main">
            <div class="event-title-line">
              <strong>${this.#escape(event.name)}</strong>
              ${subInfo}
              ${discountBadge}
            </div>
            <span class="event-sub">${this.#escape(event.venue)} • Std ₺${event.standardPrice} / VIP ₺${event.vipPrice}</span>
          </div>
          <div class="capacity" title="${sold}/${capacity} (${occupancy}%)">
            <span style="width: ${occupancy}%"></span>
          </div>
          <div class="event-total">${canManage ? `₺${revenue}` : ""}</div>
          ${actions.length ? `<div class="event-actions">${actions.join("")}</div>` : "<div></div>"}
        </div>
      `;
    }).join("");

    this.eventList.innerHTML = eventHTML;
    if (this.eventListFull) this.eventListFull.innerHTML = eventHTML;

    [this.eventList, this.eventListFull].forEach(container => {
      if (!container) return;
      container.querySelectorAll("[data-edit]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-edit");
          this.#openEditModal(id);
        });
      });
      container.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-delete");
          if (!confirm("Bu etkinliği silmek istediğinize emin misiniz?")) return;
          const r = await this.api.deleteEvent(id);
          if (r.ok) {
            this.toasts.show({ title: "Başarılı", message: "Etkinlik silindi.", variant: "success" });
            await this.#loadEvents();
            await this.#loadStats();
          } else {
            this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
          }
        });
      });
      container.querySelectorAll("[data-subscribe]").forEach(btn => {
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          const id = btn.getAttribute("data-subscribe");
          const subscribed = btn.getAttribute("data-subscribed") === "1";
          const r = subscribed ? await this.api.unsubscribeEvent(id) : await this.api.subscribeEvent(id);
          if (r.ok) {
            this.toasts.show({
              title: "Başarılı",
              message: subscribed ? "Abonelik iptal edildi." : "Etkinliğe abone olundu.",
              variant: "success"
            });
            await this.#loadEvents();
            await this.#loadStats();
          } else {
            this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
          }
        });
      });

      container.querySelectorAll("[data-edit], [data-delete]").forEach(btn => {
        btn.addEventListener("click", (ev) => ev.stopPropagation());
      });

      container.querySelectorAll(".event-row").forEach(row => {
        const open = () => {
          const id = row.getAttribute("data-event-id");
          this.#openDetailModal(id);
        };
        row.addEventListener("click", open);
        row.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            open();
          }
        });
      });
    });
  }

  #wireBuyPageOnce() {
    if (this.buyPageWired) return;
    this.buyPageWired = true;

    this.buyTicketButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-buy-ticket");
        this.buySelectedTicket = t;
        this.buyTicketButtons.forEach(b => b.classList.toggle("active",
          b.getAttribute("data-buy-ticket") === t));
        this.#refreshBuyTotals();
      });
    });

    this.buyEventSelect?.addEventListener("change", async () => {
      const id = this.buyEventSelect.value;
      if (!id) {
        this.buyCurrentEvent = null;
        this.buySelectedSeats.clear();
        this.#renderSeatGrid(null, [], []);
        this.#refreshBuyTotals();
        return;
      }
      this.buyCurrentEvent = this.events.find(e => e.id === id) || null;
      this.buySelectedSeats.clear();

      if (this.buyCurrentEvent) {
        this.buyStdPrice.textContent = `₺${this.buyCurrentEvent.standardPrice}`;
        this.buyVipPrice.textContent = `₺${this.buyCurrentEvent.vipPrice}`;
      }

      const sold = await this.api.eventSeats(this.buyCurrentEvent.id);
      if (sold.ok) {
        this.#renderSeatGrid(this.buyCurrentEvent.capacity, sold.bookedStandard || [], sold.bookedVip || []);
        const occ = cap > 0 ? (booked / cap) * 100 : 0;
        if (cap > 0 && left === 0) {
          this.toasts.show({ title: "🚫 Tükendi", message: "Bu etkinliğin tüm koltukları satılmıştır.", variant: "danger" });
        } else if (occ >= 80) {
          this.toasts.show({ title: "🔥 Az Yer Kaldı", message: `Sadece ${left} koltuk kaldı! Hızlı ol.`, variant: "warning" });
        }
        if ((this.buyCurrentEvent?.discountThreshold || 0) > 0 && (this.buyCurrentEvent?.discountPercent || 0) > 0) {
          this.toasts.show({ title: "🏷️ İndirim Fırsatı", message: `${this.buyCurrentEvent.discountThreshold} veya daha fazla koltuk seçersen %${this.buyCurrentEvent.discountPercent} indirim!`, variant: "info" });
        }
      } else {
        this.seatGrid.innerHTML = `<div class="seat-empty-state text-danger">Hata: ${r.error}</div>`;
      }
      this.#refreshBuyTotals();
    });

    this.buyCustomerName?.addEventListener("input", () => this.#refreshBuyTotals());

    this.btnBuyTickets?.addEventListener("click", async () => {
      if (!this.buyCurrentEvent) {
        this.toasts.show({ title: "Hata", message: "Etkinlik seçin.", variant: "danger" });
        return;
      }
      const seats = Array.from(this.buySelectedSeats);
      if (!seats.length) {
        this.toasts.show({ title: "Hata", message: "En az bir koltuk seçin.", variant: "danger" });
        return;
      }
      const customerName = (this.buyCustomerName.value || "").trim();
      if (!customerName) {
        this.toasts.show({ title: "Hata", message: "Müşteri adı girin.", variant: "danger" });
        return;
      }

      const r = await this.api.createOrder({
        eventId: this.buyCurrentEvent.id,
        customerName,
        ticketType: this.buySelectedTicket,
        seats
      });
      if (r.ok) {
        const discountMsg = r.discountApplied > 0 ? ` (₺${r.discountApplied.toFixed(0)} indirim)` : "";
        this.toasts.show({
          title: "Sipariş tamamlandı",
          message: `Toplam: ₺${r.totalPrice.toFixed(2)}${discountMsg}. Koltuk: ${this.#formatSeats(r.seats)}.`,
          variant: "success"
        });
        this.buySelectedSeats.clear();
        const sr = await this.api.eventSeats(this.buyCurrentEvent.id);
        if (sr.ok) this.#renderSeatGrid(sr.capacity, sr.bookedStandard || [], sr.bookedVip || []);
        this.#refreshBuyTotals();
        await this.#loadEvents();
        await this.#loadStats();
        await this.#loadOrders();
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
  }

  #initBuyPage() {
    this.#wireBuyPageOnce();

    if (this.buyEventSelect) {
      const currentValue = this.buyEventSelect.value;
      const opts = [`<option value="">Etkinlik seçin</option>`];
      for (const ev of this.events) {
        opts.push(`<option value="${ev.id}">${this.#escape(ev.name)} • ${new Date(ev.eventDate).toLocaleDateString('tr-TR')}</option>`);
      }
      this.buyEventSelect.innerHTML = opts.join("");
      if (currentValue && this.events.find(e => String(e.id) === currentValue)) {
        this.buyEventSelect.value = currentValue;
      }
    }

    if (this.buyCustomerName && !this.buyCustomerName.value && this.currentUser?.role === "individual") {
      this.buyCustomerName.value = this.currentUser.displayName || "";
    }
  }

  #renderSeatGrid(capacity, bookedStd, bookedVip) {
    if (!this.seatGrid) return;
    if (!capacity) {
      this.seatGrid.innerHTML = `<div class="seat-empty-state">Lütfen önce bir etkinlik seçin.</div>`;
      return;
    }
    const stdSet = new Set(bookedStd);
    const vipSet = new Set(bookedVip);
    const html = [];
    for (let i = 1; i <= capacity; i++) {
      const isVip = vipSet.has(i);
      const isStd = stdSet.has(i);
      const isSold = isVip || isStd;
      const isSelected = this.buySelectedSeats.has(i);
      const cls = isVip ? "seat seat-sold seat-sold-vip"
                : isStd ? "seat seat-sold"
                : isSelected ? "seat seat-selected"
                : "seat seat-available";
      const label = isVip ? `${i}<span class="seat-vip-tag">V</span>` : i;
      const tip = isVip ? ` (VIP - Dolu)` : isStd ? ` (Dolu)` : "";
      html.push(`<button type="button" class="${cls}" data-seat="${i}" ${isSold ? "disabled" : ""} title="Koltuk ${i}${tip}">${label}</button>`);
    }
    this.seatGrid.innerHTML = html.join("");

    this.seatGrid.querySelectorAll("[data-seat]").forEach(btn => {
      btn.addEventListener("click", () => {
        const n = parseInt(btn.getAttribute("data-seat"));
        if (this.buySelectedSeats.has(n)) {
          this.buySelectedSeats.delete(n);
          btn.classList.remove("seat-selected");
          btn.classList.add("seat-available");
        } else {
          this.buySelectedSeats.add(n);
          btn.classList.remove("seat-available");
          btn.classList.add("seat-selected");
        }
        this.#refreshBuyTotals();
      });
    });
  }

  #refreshBuyTotals() {
    const ev = this.buyCurrentEvent;
    const qty = this.buySelectedSeats.size;
    const unit = ev ? (this.buySelectedTicket === "vip" ? ev.vipPrice : ev.standardPrice) : 0;
    const subtotal = unit * qty;

    let discount = 0;
    if (ev && ev.discountThreshold > 0 && ev.discountPercent > 0 && qty >= ev.discountThreshold) {
      discount = subtotal * (ev.discountPercent / 100);
    }
    const total = subtotal - discount;

    if (this.buySelectedCount) this.buySelectedCount.textContent = String(qty);
    if (this.buyUnitPrice) this.buyUnitPrice.textContent = `₺${unit.toFixed(0)}`;
    if (this.buyTotal) this.buyTotal.textContent = `₺${total.toFixed(0)}`;
    if (this.buyDiscountRow) {
      this.buyDiscountRow.classList.toggle("d-none", discount <= 0);
      if (this.buyDiscountAmount) this.buyDiscountAmount.textContent = `-₺${discount.toFixed(0)}`;
    }
    if (this.btnBuyTickets) this.btnBuyTickets.disabled = qty === 0 || !ev;
  }

  #openDetailModal(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event || !this.eventDetailModal) return;

    const userId = this.currentUser?.id || 0;
    const isAdmin = this.currentUser?.isAdmin === 1;
    const isOwner = event.organizerId === userId;
    const canManage = isOwner || isAdmin;
    const isSubscribed = event.isSubscribed > 0;

    const date = new Date(event.eventDate);
    const day = date.getDate();
    const month = date.toLocaleDateString('tr-TR', { month: 'short' });
    const longDate = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    const sold = event.soldTickets || 0;
    const capacity = event.capacity || 0;
    const occupancy = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;

    const cover = document.getElementById("eventDetailCover");
    if (cover) {
      cover.style.backgroundImage = "";
      cover.classList.remove("has-image");
      if (event.imageUrl) {
        const img = new Image();
        img.onload = () => {
          cover.style.backgroundImage = `url("${event.imageUrl.replace(/"/g, '\\"')}")`;
          cover.classList.add("has-image");
        };
        img.src = event.imageUrl;
      }
    }

    document.getElementById("eventDetailDate").innerHTML =
      `<strong>${day}</strong><span>${month}</span>`;
    document.getElementById("eventDetailTitle").textContent = event.name;
    document.getElementById("eventDetailVenue").textContent =
      `${event.venue} • ${longDate}`;
    document.getElementById("eventDetailStdPrice").textContent = `₺${event.standardPrice}`;
    document.getElementById("eventDetailVipPrice").textContent = `₺${event.vipPrice}`;
    document.getElementById("eventDetailCapacity").textContent =
      `${sold} / ${capacity}`;
    document.getElementById("eventDetailOccupancy").textContent = `%${occupancy}`;

    const discountEl = document.getElementById("eventDetailDiscount");
    if (event.discountThreshold > 0 && event.discountPercent > 0) {
      discountEl.classList.remove("d-none");
      discountEl.innerHTML = `🎉 <strong>${event.discountThreshold}+ bilet</strong> alımında <strong>%${event.discountPercent} indirim</strong>`;
    } else {
      discountEl.classList.add("d-none");
    }

    const descEl = document.getElementById("eventDetailDescription");
    descEl.textContent = event.description || "Bu etkinlik için açıklama eklenmemiş.";
    descEl.classList.toggle("is-empty", !event.description);

    const orgEl = document.getElementById("eventDetailOrganizer");
    orgEl.innerHTML = `<span>Düzenleyen</span><strong>${this.#escape(event.organizerName || "-")}</strong>`;

    const footer = document.getElementById("eventDetailFooter");
    const buttons = [];
    if (!isOwner) {
      buttons.push(`<button type="button" class="btn ${isSubscribed ? 'btn-subscribed' : 'btn-outline-primary'}" data-detail-subscribe="${event.id}" data-subscribed="${isSubscribed ? '1' : '0'}">${isSubscribed ? '★ Aboneliği İptal Et' : '☆ Abone Ol'}</button>`);
    }
    if (canManage) {
      buttons.push(`<button type="button" class="btn btn-outline-secondary" data-detail-edit="${event.id}">Düzenle</button>`);
      buttons.push(`<button type="button" class="btn btn-danger" data-detail-delete="${event.id}">Sil</button>`);
    }
    buttons.push(`<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>`);
    footer.innerHTML = buttons.join("");

    footer.querySelector("[data-detail-subscribe]")?.addEventListener("click", async (e) => {
      const id = parseInt(e.currentTarget.getAttribute("data-detail-subscribe"));
      const subscribed = e.currentTarget.getAttribute("data-subscribed") === "1";
      const r = subscribed ? await this.api.unsubscribeEvent(id) : await this.api.subscribeEvent(id);
      if (r.ok) {
        this.toasts.show({ title: "Başarılı", message: subscribed ? "Abonelik iptal edildi." : "Abone olundu.", variant: "success" });
        bootstrap.Modal.getInstance(this.eventDetailModal)?.hide();
        await this.#loadEvents();
        await this.#loadStats();
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
    footer.querySelector("[data-detail-edit]")?.addEventListener("click", () => {
      bootstrap.Modal.getInstance(this.eventDetailModal)?.hide();
      this.#openEditModal(event.id);
    });
    footer.querySelector("[data-detail-delete]")?.addEventListener("click", async () => {
      if (!confirm("Bu etkinliği silmek istediğinize emin misiniz?")) return;
      const r = await this.api.deleteEvent(event.id);
      if (r.ok) {
        this.toasts.show({ title: "Başarılı", message: "Etkinlik silindi.", variant: "success" });
        bootstrap.Modal.getInstance(this.eventDetailModal)?.hide();
        await this.#loadEvents();
        await this.#loadStats();
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });

    bootstrap.Modal.getOrCreateInstance(this.eventDetailModal).show();
  }

  #escape(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  #openEditModal(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    if (this.eventModalTitle) this.eventModalTitle.textContent = "Etkinliği Düzenle";
    this.btnSaveEvent.textContent = "Güncelle";
    this.eventForm.querySelector('[name="id"]').value = event.id;
    this.eventForm.querySelector('[name="name"]').value = event.name;
    this.eventForm.querySelector('[name="description"]').value = event.description || "";
    this.eventForm.querySelector('[name="imageUrl"]').value = event.imageUrl || "";
    this.eventForm.querySelector('[name="venue"]').value = event.venue;
    this.eventForm.querySelector('[name="eventDate"]').value = (event.eventDate || "").split("T")[0];
    this.eventForm.querySelector('[name="capacity"]').value = event.capacity;
    this.eventForm.querySelector('[name="standardPrice"]').value = event.standardPrice;
    this.eventForm.querySelector('[name="vipPrice"]').value = event.vipPrice;
    this.eventForm.querySelector('[name="discountThreshold"]').value = event.discountThreshold || 0;
    this.eventForm.querySelector('[name="discountPercent"]').value = event.discountPercent || 0;
    this.eventModalInstance = bootstrap.Modal.getOrCreateInstance(this.eventModal);
    this.eventModalInstance.show();
  }

  #populateCheckoutEvents() {
    if (!this.checkoutEventSelect) return;
    const currentValue = this.checkoutEventSelect.value;
    const options = ['<option value="">Etkinlik seçin</option>']
      .concat(this.events.map(e => `<option value="${e.id}">${e.name} - ${new Date(e.eventDate).toLocaleDateString('tr-TR')}</option>`));
    this.checkoutEventSelect.innerHTML = options.join("");
    if (currentValue) this.checkoutEventSelect.value = currentValue;
    this.#updateCheckoutPanel();
  }

  #updateCheckoutPanel() {
    const eventId = this.checkoutEventSelect?.value;
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      this.priceStandard.textContent = `₺${event.standardPrice}`;
      this.priceVip.textContent = `₺${event.vipPrice}`;
    } else {
      this.priceStandard.textContent = "₺-";
      this.priceVip.textContent = "₺-";
    }
    this.#updateCheckoutTotal();
  }

  #updateCheckoutTotal() {
    const eventId = this.checkoutEventSelect?.value;
    const event = this.events.find(e => e.id === eventId);
    const qty = parseInt(this.checkoutQuantity?.value) || 0;
    const customerName = this.checkoutCustomerName?.value.trim() || "";
    let subtotal = 0;
    let discount = 0;
    let total = 0;
    if (event) {
      const unit = this.selectedTicketType === "vip" ? event.vipPrice : event.standardPrice;
      subtotal = unit * qty;
      if (event.discountThreshold > 0 && qty >= event.discountThreshold && event.discountPercent > 0) {
        discount = subtotal * (event.discountPercent / 100);
      }
      total = subtotal - discount;
    }

    if (this.checkoutTotal) {
      if (discount > 0) {
        this.checkoutTotal.innerHTML = `<small class="text-decoration-line-through text-muted me-2">₺${subtotal.toFixed(0)}</small>₺${total.toFixed(0)} <small class="text-success">(-%${event.discountPercent})</small>`;
      } else {
        this.checkoutTotal.textContent = `₺${total.toFixed(0)}`;
      }
    }
    if (this.btnPlaceOrder) {
      this.btnPlaceOrder.disabled = !event || qty < 1 || !customerName;
    }
  }

  async #loadStats() {
    const r = await this.api.statsSummary();
    if (!r.ok) {
      this.toasts.show({ title: "Uyarı", message: "İstatistikler yüklenemedi.", variant: "warning" });
      return;
    }

    if (r.scope === "individual") {
      if (this.metricTotalSpent) this.metricTotalSpent.textContent = `₺${(r.totalSpent || 0).toFixed(0)}`;
      if (this.metricTicketsBought) this.metricTicketsBought.textContent = r.ticketsBought || 0;
      if (this.metricOrderCount) this.metricOrderCount.textContent = r.orderCount || 0;
      if (this.metricSubscriptionCount) this.metricSubscriptionCount.textContent = r.subscriptionCount || 0;
    } else {
      const occupancy = r.totalCapacity > 0 ? Math.round((r.ticketsSold / r.totalCapacity) * 100) : 0;
      if (this.metricRevenue) this.metricRevenue.textContent = `₺${(r.revenue || 0).toFixed(0)}`;
      if (this.metricTickets) this.metricTickets.textContent = r.ticketsSold || 0;
      if (this.metricOccupancy) this.metricOccupancy.textContent = `%${occupancy}`;
      if (this.metricOccupancyLabel) this.metricOccupancyLabel.textContent = `${r.ticketsSold || 0} / ${r.totalCapacity || 0} kontenjan`;
      if (this.metricPending) this.metricPending.textContent = r.pending || 0;
    }
  }

  async #loadOrders() {
    if (!this.ordersList) return;
    const r = await this.api.listOrders();
    if (!r.ok) {
      this.toasts.show({ title: "Hata", message: "Siparışler yüklenemedi: " + r.error, variant: "danger" });
      this.ordersList.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Hata: ${r.error}</td></tr>`;
      return;
    }
    if (!r.orders || r.orders.length === 0) {
      this.ordersList.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Henüz sipariş yok.</td></tr>`;
      return;
    }
    this.ordersList.innerHTML = r.orders.map(o => {
      const seatsArr = (o.seatNumbers || "").split(",").map(s => parseInt(s)).filter(n => !Number.isNaN(n));
      const seatsText = seatsArr.length ? this.#formatSeats(seatsArr) : "-";
      return `
        <tr>
          <td class="mono">#${o.id}</td>
          <td>${this.#escape(o.eventName)}</td>
          <td>${this.#escape(o.customerName)}</td>
          <td><span class="badge ${o.ticketType === 'vip' ? 'bg-warning' : 'bg-secondary'}">${o.ticketType.toUpperCase()}</span></td>
          <td>${o.quantity}</td>
          <td class="mono"><small>${seatsText}</small></td>
          <td><strong>₺${o.totalPrice.toFixed(0)}</strong></td>
          <td><small class="text-muted">${new Date(o.createdAt).toLocaleString('tr-TR')}</small></td>
        </tr>
      `;
    }).join("");
  }

  #fillProfilePage(user) {
    if (!user) return;
    const el = id => document.getElementById(id);
    const initials = (user.displayName || "U").charAt(0).toUpperCase();
    const roleLabel = user.isAdmin === 1 ? "Admin" : user.role === "organization" ? "Organizasyon" : "Bireysel";
    const dateStr = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    if (el("profileAvatarLg"))  el("profileAvatarLg").textContent  = initials;
    if (el("profileEmail"))     el("profileEmail").textContent      = user.email;
    if (el("profileRoleBadge")) el("profileRoleBadge").textContent  = roleLabel;
    if (el("profileCreatedAt")) el("profileCreatedAt").textContent  = dateStr;
    if (el("profileDisplayName")) el("profileDisplayName").value    = user.displayName || "";
    const orgFields = el("profileOrgFields");
    if (orgFields) {
      const isOrg = user.role === "organization" || user.isAdmin === 1;
      orgFields.classList.toggle("d-none", !isOrg);
      if (isOrg) {
        if (el("profileBio"))     el("profileBio").value     = user.bio     || "";
        if (el("profileWebsite")) el("profileWebsite").value = user.website || "";
      }
    }
    if (el("profileCurrentPw"))    el("profileCurrentPw").value    = "";
    if (el("profileNewPw"))        el("profileNewPw").value        = "";
    if (el("profileNewPwConfirm")) el("profileNewPwConfirm").value = "";
    if (!this._profileWired) { this.#wireProfilePage(); this._profileWired = true; }
  }

  #wireProfilePage() {
    const el = id => document.getElementById(id);
    el("btnSaveBasicInfo")?.addEventListener("click", async () => {
      const btn = el("btnSaveBasicInfo");
      const displayName = el("profileDisplayName")?.value?.trim();
      const bio     = el("profileBio")?.value?.trim();
      const website = el("profileWebsite")?.value?.trim();
      if (!displayName) {
        this.toasts.show({ title: "Hata", message: "İsim boş olamaz.", variant: "danger" });
        return;
      }
      btn.disabled = true; btn.textContent = "Kaydediliyor...";
      const payload = { displayName };
      if (bio     !== undefined) payload.bio     = bio;
      if (website !== undefined) payload.website = website;
      const r = await this.api.updateProfile(payload);
      btn.disabled = false; btn.textContent = "Değişiklikleri Kaydet";
      if (r.ok) {
        this.toasts.show({ title: "Başarılı ✓", message: "Profil güncellendi.", variant: "success" });
        this.setUser(r.user);
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
    el("btnChangePassword")?.addEventListener("click", async () => {
      const btn = el("btnChangePassword");
      const currentPw  = el("profileCurrentPw")?.value;
      const newPw      = el("profileNewPw")?.value;
      const confirmPw  = el("profileNewPwConfirm")?.value;
      if (!currentPw) {
        this.toasts.show({ title: "Hata", message: "Mevcut şifrenizi girin.", variant: "danger" }); return;
      }
      if (!newPw || newPw.length < 8) {
        this.toasts.show({ title: "Hata", message: "Yeni şifre en az 8 karakter olmalı.", variant: "danger" }); return;
      }
      if (newPw !== confirmPw) {
        this.toasts.show({ title: "Hata", message: "Yeni şifreler eşleşmiyor.", variant: "danger" }); return;
      }
      btn.disabled = true; btn.textContent = "Güncelleniyor...";
      const r = await this.api.updateProfile({ currentPassword: currentPw, newPassword: newPw });
      btn.disabled = false; btn.textContent = "Şifreyi Güncelle";
      if (r.ok) {
        this.toasts.show({ title: "Başarılı ✓", message: "Şifre güncellendi.", variant: "success" });
        if (el("profileCurrentPw"))    el("profileCurrentPw").value    = "";
        if (el("profileNewPw"))        el("profileNewPw").value        = "";
        if (el("profileNewPwConfirm")) el("profileNewPwConfirm").value = "";
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
  }
}

class ConsumerView {
  constructor({ api, toasts, onLoggedOut }) {
    this.api = api;
    this.toasts = toasts;
    this.onLoggedOut = onLoggedOut;
    this.root       = document.getElementById("indivApp");
    this.heroName   = document.getElementById("cnHeroName");
    this.avatar     = document.getElementById("cnAvatar");
    this.userName   = document.getElementById("cnUserName");
    this.statSpent  = document.getElementById("cnStatSpent");
    this.statTkts   = document.getElementById("cnStatTickets");
    this.statOrds   = document.getElementById("cnStatOrders");
    this.statSubs   = document.getElementById("cnStatSubs");
    this.homeGrid   = document.getElementById("cnHomeGrid");
    this.eventsGrid = document.getElementById("cnEventsGrid");
    this.ticketList = document.getElementById("cnTicketList");
    this.buyModal      = document.getElementById("cnBuyModal");
    this.buyModalTitle = document.getElementById("cnBuyModalTitle");
    this.buyEventInfo  = document.getElementById("cnBuyEventInfo");
    this.buyStdPrice   = document.getElementById("cnBuyStdPrice");
    this.buyVipPrice   = document.getElementById("cnBuyVipPrice");
    this.buyName       = document.getElementById("cnBuyName");
    this.buySeatGrid   = document.getElementById("cnSeatGrid");
    this.buyCount      = document.getElementById("cnBuyCount");
    this.buyUnit       = document.getElementById("cnBuyUnit");
    this.buyDiscRow    = document.getElementById("cnDiscRow");
    this.buyDisc       = document.getElementById("cnBuyDisc");
    this.buyTotal      = document.getElementById("cnBuyTotal");
    this.buyConfirmBtn = document.getElementById("cnBuyConfirmBtn");
    this.events         = [];
    this.currentUser    = null;
    this.buyEvent       = null;
    this.buyTicketType  = "standard";
    this.buySelectedSeats = new Set();
    this.modalInstance  = null;
    this.wired          = false;
  }

  setUser(user) {
    this.currentUser = user;
    if (!user) { this.root?.classList.add("d-none"); return; }
    const initials = (user.displayName || "U").charAt(0).toUpperCase();
    if (this.heroName)  this.heroName.textContent  = user.displayName || "Kullanıcı";
    if (this.avatar)    this.avatar.textContent     = initials;
    if (this.userName)  this.userName.textContent   = user.displayName || "";
    if (this.buyName)   this.buyName.value          = user.displayName || "";
    this.root?.classList.remove("d-none");
    if (!this.wired) { this.#wire(); this.wired = true; }
    this.#showPage("home");
    this.#loadAll();
  }

  #escape(s) {
    return String(s ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  #showPage(name) {
    ["home","events","tickets","profile"].forEach(p => {
      document.getElementById(`cn-page-${p}`)?.classList.toggle("d-none", p !== name);
    });
    this.root?.querySelectorAll(".cn-link").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-cn-page") === name);
    });
    if (name === "profile") this.#fillCnProfilePage(this.currentUser);
  }

  #fillCnProfilePage(user) {
    if (!user) return;
    const el = id => document.getElementById(id);
    const initials = (user.displayName || "U").charAt(0).toUpperCase();
    const dateStr = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    if (el("cnProfileAvatar"))       el("cnProfileAvatar").textContent       = initials;
    if (el("cnProfileName"))         el("cnProfileName").textContent         = user.displayName || "";
    if (el("cnProfileEmail"))        el("cnProfileEmail").textContent        = user.email || "";
    if (el("cnProfileRoleBadge"))    el("cnProfileRoleBadge").textContent    = "Bireysel Üye";
    if (el("cnProfileSince"))        el("cnProfileSince").textContent        = dateStr;
    if (el("cnProfileDisplayName"))  el("cnProfileDisplayName").value        = user.displayName || "";
    if (el("cnProfileEmailInput"))   el("cnProfileEmailInput").value         = user.email || "";
    if (el("cnProfileCurrPw"))       el("cnProfileCurrPw").value             = "";
    if (el("cnProfileNewPw"))        el("cnProfileNewPw").value              = "";
    if (el("cnProfileNewPwConfirm")) el("cnProfileNewPwConfirm").value       = "";
    if (!this._cnProfileWired) { this.#wireCnProfilePage(); this._cnProfileWired = true; }
  }

  #wireCnProfilePage() {
    const el = id => document.getElementById(id);
    el("cnBtnSaveInfo")?.addEventListener("click", async () => {
      const btn = el("cnBtnSaveInfo");
      const displayName = el("cnProfileDisplayName")?.value?.trim();
      if (!displayName) {
        this.toasts.show({ title: "Hata", message: "İsim boş olamaz.", variant: "danger" }); return;
      }
      btn.disabled = true; btn.textContent = "Kaydediliyor...";
      const r = await this.api.updateProfile({ displayName });
      btn.disabled = false; btn.textContent = "Kaydet";
      if (r.ok) {
        this.toasts.show({ title: "Başarılı ✓", message: "Profil güncellendi.", variant: "success" });
        this.setUser(r.user);
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
    el("cnBtnChangePw")?.addEventListener("click", async () => {
      const btn = el("cnBtnChangePw");
      const currentPw = el("cnProfileCurrPw")?.value;
      const newPw     = el("cnProfileNewPw")?.value;
      const confirmPw = el("cnProfileNewPwConfirm")?.value;
      if (!currentPw) {
        this.toasts.show({ title: "Hata", message: "Mevcut şifrenizi girin.", variant: "danger" }); return;
      }
      if (!newPw || newPw.length < 8) {
        this.toasts.show({ title: "Hata", message: "Yeni şifre en az 8 karakter olmalı.", variant: "danger" }); return;
      }
      if (newPw !== confirmPw) {
        this.toasts.show({ title: "Yeni şifreler eşleşmiyor.", variant: "danger" }); return;
      }
      btn.disabled = true; btn.textContent = "Güncelleniyor...";
      const r = await this.api.updateProfile({ currentPassword: currentPw, newPassword: newPw });
      btn.disabled = false; btn.textContent = "Şifreyi Güncelle";
      if (r.ok) {
        this.toasts.show({ title: "Başarılı ✓", message: "Şifre güncellendi.", variant: "success" });
        if (el("cnProfileCurrPw"))       el("cnProfileCurrPw").value       = "";
        if (el("cnProfileNewPw"))        el("cnProfileNewPw").value        = "";
        if (el("cnProfileNewPwConfirm")) el("cnProfileNewPwConfirm").value = "";
      } else {
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
  }

  async #loadAll() {
    await Promise.all([this.#loadStats(), this.#loadEvents(), this.#loadTickets()]);
  }

  async #loadStats() {
    const r = await this.api.statsSummary();
    if (!r.ok) {
      this.toasts.show({ title: "Uyarı", message: "Özet istatistikler yüklenemedi.", variant: "warning" });
      return;
    }
    if (this.statSpent) this.statSpent.textContent = `₺${(r.totalSpent || 0).toFixed(0)}`;
    if (this.statTkts)  this.statTkts.textContent  = r.ticketsBought || 0;
    if (this.statOrds)  this.statOrds.textContent  = r.orderCount || 0;
    if (this.statSubs)  this.statSubs.textContent  = r.subscriptionCount || 0;
  }

  async #loadEvents() {
    const r = await this.api.listEvents();
    if (!r.ok) {
      this.toasts.show({ title: "Hata", message: "Etkinlikler yüklenemedi: " + r.error, variant: "danger" });
      const err = `<div class="text-center text-danger py-4"><small>Hata: ${r.error}</small></div>`;
      if (this.homeGrid)   this.homeGrid.innerHTML   = err;
      if (this.eventsGrid) this.eventsGrid.innerHTML = err;
      return;
    }
    this.events = r.events || [];
    const cardsHTML = this.events.length === 0
      ? `<div class="text-center text-muted py-5"><p>Henüz etkinlik yok.</p><small>Yeni etkinlikler eklendiğinde burada görünecek.</small></div>`
      : this.events.map(ev => this.#buildCard(ev)).join("");
    if (this.homeGrid)   { this.homeGrid.innerHTML   = cardsHTML; this.#wireCards(this.homeGrid); }
    if (this.eventsGrid) { this.eventsGrid.innerHTML = cardsHTML; this.#wireCards(this.eventsGrid); }
  }

  async #loadTickets() {
    const r = await this.api.listOrders();
    if (!r.ok) {
      this.toasts.show({ title: "Hata", message: "Biletler yüklenemedi: " + r.error, variant: "danger" });
      if (this.ticketList) this.ticketList.innerHTML = `<div class="text-center text-danger py-4"><small>Hata: ${r.error}</small></div>`;
      return;
    }
    if (!r.orders || r.orders.length === 0) {
      if (this.ticketList) this.ticketList.innerHTML = `<div class="text-center text-muted py-5"><small>Henüz bilet satın almadın.</small></div>`;
      return;
    }
    if (this.ticketList) {
      this.ticketList.innerHTML = r.orders.map(o => {
        const seatsArr = (o.seatNumbers || "").split(",").map(s => parseInt(s)).filter(n => !isNaN(n));
        const seatsText = seatsArr.length ? `Koltuk: ${seatsArr.join(", ")}` : "";
        const badge = o.ticketType === "vip"
          ? `<span class="badge bg-warning text-dark">VIP</span>`
          : `<span class="badge bg-secondary">Standart</span>`;
        const dateStr = new Date(o.createdAt).toLocaleDateString("tr-TR", { day:"numeric", month:"long", year:"numeric" });
        const shortId = String(o.id).slice(-6).toUpperCase();
        const barcode = "| " + "||||||||||||".slice(0, 8 + (o.id % 4)) + " |";
        return `
          <div class="ticket-stub">
            <div class="ticket-left">
              <p class="eyebrow" style="margin:0 0 4px">Bilet</p>
              <h4 class="ticket-event-name">${this.#escape(o.eventName)}</h4>
              <p class="ticket-date-line">${dateStr}</p>
              <p class="ticket-venue-line">${this.#escape(o.customerName)}</p>
              <div class="ticket-tags">${badge}<span class="ticket-qty">${o.quantity} adet</span></div>
            </div>
            <div class="ticket-tear"></div>
            <div class="ticket-right">
              <p class="ticket-price">₺${(o.totalPrice || 0).toFixed(0)}</p>
              ${seatsText ? `<p class="ticket-seats-text">${seatsText}</p>` : ""}
              <div class="ticket-barcode">${barcode}</div>
              <span class="ticket-id">#${shortId}</span>
            </div>
          </div>`;
      }).join("");
    }
  }

  #buildCard(event) {
    const date = new Date(event.eventDate);
    const day   = date.getDate();
    const month = date.toLocaleDateString("tr-TR", { month: "short" });
    const sold  = event.soldTickets || 0;
    const cap   = event.capacity || 0;
    const occ   = cap > 0 ? Math.round((sold / cap) * 100) : 0;
    const left  = Math.max(0, cap - sold);
    const isSoldOut = left === 0 && cap > 0;
    const fillCls = occ >= 90 ? "ic-capacity-fill ic-capacity-full"
                  : occ >= 70 ? "ic-capacity-fill ic-capacity-high"
                  : "ic-capacity-fill";
    const isSub = event.isSubscribed > 0;
    const coverStyle = event.imageUrl
      ? `style="background-image:url('${this.#escape(event.imageUrl)}')"`
      : "";
    const discBadge = (event.discountThreshold > 0 && event.discountPercent > 0)
      ? `<span class="ic-discount-badge">%${event.discountPercent} indirim</span>` : "";
    const buyBtn = isSoldOut
      ? `<div class="ic-sold-out">Tükendi</div>`
      : `<button class="btn btn-primary w-100" style="margin-top:auto" data-cn-buy="${event.id}">🎫 Bilet Al</button>`;
    return `
      <div class="ic-card">
        <div class="ic-cover" ${coverStyle}>
          <div class="ic-cover-overlay"></div>
          <div class="ic-date-badge"><strong>${day}</strong><span>${month}</span></div>
          <button class="ic-sub-btn ${isSub ? "ic-sub-btn--active" : ""}"
            data-cn-subscribe="${event.id}" data-cn-subscribed="${isSub ? "1" : "0"}">
            ${isSub ? "★ Takipte" : "♡ Takip"}
          </button>
          ${discBadge}
        </div>
        <div class="ic-body">
          <h4 class="ic-name">${this.#escape(event.name)}</h4>
          <p class="ic-venue">📍 ${this.#escape(event.venue)}</p>
          <div class="ic-capacity-wrap">
            <div class="ic-capacity-bar"><div class="${fillCls}" style="width:${occ}%"></div></div>
            <span class="ic-capacity-label">${isSoldOut ? "Tükendi" : `${left} koltuk kaldı`}</span>
          </div>
          <div class="ic-price-row">
            <div class="ic-price-std"><span>Standart</span><strong>₺${event.standardPrice}</strong></div>
            <div class="ic-price-vip"><span>VIP</span><strong>₺${event.vipPrice}</strong></div>
          </div>
          ${buyBtn}
        </div>
      </div>`;
  }

  #wireCards(container) {
    container.querySelectorAll("[data-cn-buy]").forEach(btn => {
      btn.addEventListener("click", () => {
        const eventId = btn.getAttribute("data-cn-buy");
        this.#openBuyModal(eventId);
      });
    });
    container.querySelectorAll("[data-cn-subscribe]").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        const id = btn.getAttribute("data-cn-subscribe");
        const subbed = btn.getAttribute("data-cn-subscribed") === "1";
        const r = subbed ? await this.api.unsubscribeEvent(id) : await this.api.subscribeEvent(id);
        if (r.ok) {
          this.toasts.show({ title: "Başarılı", message: subbed ? "Takip iptal edildi." : "Etkinlik takibe alındı.", variant: "success" });
          await this.#loadEvents();
          await this.#loadStats();
        } else {
          this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
        }
      });
    });
  }

  async #openBuyModal(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    this.buyEvent = event;
    this.buySelectedSeats.clear();
    this.buyTicketType = "standard";
    if (this.buyModalTitle) this.buyModalTitle.textContent = event.name;
    if (this.buyStdPrice)   this.buyStdPrice.textContent   = `₺${event.standardPrice}`;
    if (this.buyVipPrice)   this.buyVipPrice.textContent   = `₺${event.vipPrice}`;
    if (this.buyEventInfo)  this.buyEventInfo.textContent  = `${event.venue} • ${new Date(event.eventDate).toLocaleDateString("tr-TR")}`;
    this.#refreshTotals();
    const r = await this.api.eventSeats(eventId);
    if (r.ok) {
      this.#renderSeatGrid(r.capacity, r.bookedStandard || [], r.bookedVip || []);
      const booked = (r.bookedSeats || []).length;
      const cap    = r.capacity || 0;
      const left   = Math.max(0, cap - booked);
      const occ    = cap > 0 ? (booked / cap) * 100 : 0;
      if (cap > 0 && left === 0) {
        this.toasts.show({ title: "🚫 Tükendi", message: "Bu etkinlik için koltuk kalmadı.", variant: "danger" });
      } else if (occ >= 80) {
        this.toasts.show({ title: "🔥 Hızlı Ol!", message: `Sadece ${left} koltuk kaldı.`, variant: "warning" });
      } else if (occ >= 50) {
        this.toasts.show({ title: "📊 Bilgi", message: `${left} koltuk mevcut.`, variant: "info" });
      }
    } else {
      if (this.buySeatGrid) this.buySeatGrid.innerHTML = `<div class="seat-empty-state text-danger">Hata: ${r.error}</div>`;
    }
    if ((event.discountThreshold || 0) > 0 && (event.discountPercent || 0) > 0) {
      this.toasts.show({ title: "🏷️ İndirim Fırsatı", message: `${event.discountThreshold}+ koltuk seçersen %${event.discountPercent} indirim!`, variant: "info" });
    }
    if (this.buyModal) {
      this.modalInstance = bootstrap.Modal.getOrCreateInstance(this.buyModal);
      this.modalInstance.show();
    }
  }

  #renderSeatGrid(capacity, bookedStd, bookedVip) {
    if (!this.buySeatGrid) return;
    if (!capacity) {
      this.buySeatGrid.innerHTML = `<div class="seat-empty-state">Koltuk bilgisi yüklenemedi.</div>`;
      return;
    }
    const stdSet = new Set(bookedStd);
    const vipSet = new Set(bookedVip);
    const html = [];
    for (let i = 1; i <= capacity; i++) {
      const isVip = vipSet.has(i);
      const isStd = stdSet.has(i);
      const isSold = isVip || isStd;
      const isSel  = this.buySelectedSeats.has(i);
      const cls = isVip ? "seat seat-sold seat-sold-vip"
                : isStd ? "seat seat-sold"
                : isSel  ? "seat seat-selected"
                : "seat seat-available";
      const label = isVip ? `${i}<span class="seat-vip-tag">V</span>` : i;
      const tip = isVip ? ` (VIP - Dolu)` : isStd ? ` (Dolu)` : "";
      html.push(`<button type="button" class="${cls}" data-cn-seat="${i}" ${isSold ? "disabled" : ""} title="Koltuk ${i}${tip}">${label}</button>`);
    }
    this.buySeatGrid.innerHTML = html.join("");
    this.buySeatGrid.querySelectorAll("[data-cn-seat]").forEach(btn => {
      btn.addEventListener("click", () => {
        const n = parseInt(btn.getAttribute("data-cn-seat"));
        if (this.buySelectedSeats.has(n)) {
          this.buySelectedSeats.delete(n);
          btn.classList.replace("seat-selected", "seat-available");
        } else {
          this.buySelectedSeats.add(n);
          btn.classList.replace("seat-available", "seat-selected");
        }
        this.#refreshTotals();
      });
    });
  }

  #refreshTotals() {
    const ev  = this.buyEvent;
    const qty = this.buySelectedSeats.size;
    const unit = ev ? (this.buyTicketType === "vip" ? ev.vipPrice : ev.standardPrice) : 0;
    const subtotal = unit * qty;
    let discount = 0;
    if (ev && ev.discountThreshold > 0 && ev.discountPercent > 0 && qty >= ev.discountThreshold) {
      discount = subtotal * (ev.discountPercent / 100);
    }
    const total = subtotal - discount;
    if (this.buyCount) this.buyCount.textContent = String(qty);
    if (this.buyUnit)  this.buyUnit.textContent  = `₺${unit.toFixed(0)}`;
    if (this.buyTotal) this.buyTotal.textContent = `₺${total.toFixed(0)}`;
    if (this.buyDiscRow) {
      this.buyDiscRow.classList.toggle("d-none", discount <= 0);
      if (this.buyDisc) this.buyDisc.textContent = `-₺${discount.toFixed(0)}`;
    }
    if (this.buyConfirmBtn) this.buyConfirmBtn.disabled = qty === 0 || !ev;
  }

  #wire() {
    this.root?.querySelectorAll(".cn-link").forEach(btn => {
      btn.addEventListener("click", () => {
        this.#showPage(btn.getAttribute("data-cn-page") || "home");
      });
    });
    const logoutBtn = document.getElementById("cnBtnLogout");
    logoutBtn?.addEventListener("click", async () => {
      await this.api.logout();
      this.toasts.show({ title: "Çıkış", message: "Oturum kapatıldı.", variant: "secondary" });
      this.root?.classList.add("d-none");
      await this.onLoggedOut();
    });
    const ticketBtns = this.buyModal?.querySelectorAll("[data-cn-ticket]");
    ticketBtns?.forEach(btn => {
      btn.addEventListener("click", () => {
        this.buyTicketType = btn.getAttribute("data-cn-ticket") || "standard";
        ticketBtns.forEach(b => b.classList.toggle("active", b === btn));
        this.#refreshTotals();
      });
    });
    this.buyConfirmBtn?.addEventListener("click", async () => {
      if (!this.buyEvent) return;
      const name = this.buyName?.value?.trim();
      if (!name) {
        this.toasts.show({ title: "Hata", message: "Adınızı girin.", variant: "danger" }); return;
      }
      const seats = Array.from(this.buySelectedSeats);
      if (!seats.length) {
        this.toasts.show({ title: "Hata", message: "En az bir koltuk seçin.", variant: "danger" }); return;
      }
      this.buyConfirmBtn.disabled = true;
      const r = await this.api.createOrder({
        eventId: this.buyEvent.id,
        customerName: name,
        ticketType: this.buyTicketType,
        seats
      });
      if (r.ok) {
        const discMsg = r.discountApplied > 0 ? ` (₺${r.discountApplied.toFixed(0)} indirim)` : "";
        this.toasts.show({ title: "🎉 Sipariş Tamamlandı", message: `Toplam: ₺${r.totalPrice.toFixed(2)}${discMsg}.`, variant: "success" });
        this.modalInstance?.hide();
        this.buySelectedSeats.clear();
        await this.#loadAll();
      } else {
        this.buyConfirmBtn.disabled = false;
        this.toasts.show({ title: "Hata", message: r.error, variant: "danger" });
      }
    });
  }
}

class App {
  constructor() {
    this.api = new ApiClient();
    this.toasts = new Toasts(document.getElementById("toastRoot"));
    this.forgotView = new ForgotView({
      api: this.api,
      toasts: this.toasts,
      onBack: () => {
        document.getElementById("forgotView")?.classList.add("d-none");
        document.getElementById("authView")?.classList.remove("d-none");
      }
    });
    this.authView = new AuthView({
      root: document.getElementById("authView"),
      api: this.api,
      toasts: this.toasts,
      onAuthed: () => this.refresh(),
      onForgot: () => {
        document.getElementById("authView")?.classList.add("d-none");
        this.forgotView.show();
      }
    });
    this.appView = new AppView({
      root: document.getElementById("appView"),
      api: this.api,
      toasts: this.toasts,
      onLoggedOut: () => this.refresh(true)
    });
    this.consumerView = new ConsumerView({
      api: this.api,
      toasts: this.toasts,
      onLoggedOut: () => this.refresh(true)
    });
  }

  async start() {
    await this.refresh();
  }

  async refresh(forceToLogin = false) {
    const r = await this.api.me();
    const user = r && r.ok ? r.user : null;

    const auth     = document.getElementById("authView");
    const appEl    = document.getElementById("appView");
    const indivEl  = document.getElementById("indivApp");

    if (forceToLogin || !user) {
      auth.classList.remove("d-none");
      appEl.classList.add("d-none");
      if (indivEl) indivEl.classList.add("d-none");
      this.appView.setUser(null);
      this.consumerView.setUser(null);
      return;
    }

    auth.classList.add("d-none");

    const isIndividual = user.role === "individual" && user.isAdmin !== 1;
    if (isIndividual) {
      appEl.classList.add("d-none");
      this.appView.setUser(null);
      this.consumerView.setUser(user);
    } else {
      if (indivEl) indivEl.classList.add("d-none");
      this.consumerView.setUser(null);
      appEl.classList.remove("d-none");
      this.appView.setUser(user);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const sqliteEl = document.getElementById("sqlitePath");
  if (sqliteEl) sqliteEl.textContent = window.api?.env?.SQLITE_PATH || "-";

  const app = new App();
  app.start();
});

