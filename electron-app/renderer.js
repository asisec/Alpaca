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

    // Animasyon ile gir
    requestAnimationFrame(() => el.classList.add("app-toast-show"));

    const close = () => {
      el.classList.remove("app-toast-show");
      el.classList.add("app-toast-hide");
      setTimeout(() => el.remove(), 300);
    };

    el.querySelector(".app-toast-close").addEventListener("click", close);
    setTimeout(close, 4000);
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

class AuthView {
  constructor({ root, api, toasts, onAuthed }) {
    this.root = root;
    this.api = api;
    this.toasts = toasts;
    this.onAuthed = onAuthed;

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

    // Çoklu çağrılarda tetiklenen animasyonları temizle
    if (showForm === hideForm) return;

    // Hedef form zaten görünürse no-op
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

    // Hero metin geçişi
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

    // Custom validation: native tooltip yerine inline mesaj
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

    // Gizlilik Politikası modalı
    const btnPrivacy = document.getElementById("btnPrivacy");
    btnPrivacy?.addEventListener("click", () => {
      const modalEl = document.getElementById("privacyModal");
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    // Hızlı rol seçimi: register tab'ına geç ve rolü işaretle
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

    // Role değişimi dinleyicisi
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
        this.#setAlert("Şifreler aynı değil.");
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
    // Modal document.body içinde olduğu için document'ten arıyoruz
    this.eventModal = document.querySelector("#eventModal");
    this.eventForm = document.querySelector("#eventForm");
    this.btnSaveEvent = document.querySelector("#btnSaveEvent");
    this.eventList = root.querySelector("#eventList");
    this.eventListFull = root.querySelector("#eventListFull");
    this.pageTitle = root.querySelector("#pageTitle");

    // Metric elementleri (organization/admin)
    this.metricsOrgAdmin = root.querySelector("#metricsOrgAdmin");
    this.metricRevenue = root.querySelector("#metricRevenue");
    this.metricTickets = root.querySelector("#metricTickets");
    this.metricOccupancy = root.querySelector("#metricOccupancy");
    this.metricOccupancyLabel = root.querySelector("#metricOccupancyLabel");
    this.metricPending = root.querySelector("#metricPending");

    // Metric elementleri (individual)
    this.metricsIndividual = root.querySelector("#metricsIndividual");
    this.metricTotalSpent = root.querySelector("#metricTotalSpent");
    this.metricTicketsBought = root.querySelector("#metricTicketsBought");
    this.metricOrderCount = root.querySelector("#metricOrderCount");
    this.metricSubscriptionCount = root.querySelector("#metricSubscriptionCount");

    // Modal title
    this.eventModalTitle = document.querySelector("#eventModalTitle");

    // Checkout panel (organization/admin only)
    this.checkoutPanel = root.querySelector("#checkoutPanel");

    // Checkout elementleri
    this.checkoutEventSelect = root.querySelector("#checkoutEventSelect");
    this.checkoutCustomerName = root.querySelector("#checkoutCustomerName");
    this.checkoutQuantity = root.querySelector("#checkoutQuantity");
    this.checkoutTotal = root.querySelector("#checkoutTotal");
    this.priceStandard = root.querySelector("#priceStandard");
    this.priceVip = root.querySelector("#priceVip");
    this.btnPlaceOrder = root.querySelector("#btnPlaceOrder");
    this.ticketButtons = root.querySelectorAll("#checkoutPanel .ticket-choice button");

    // Bilet Al sayfası
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

    // Topbar
    this.topbarSubtitle = root.querySelector("#topbarSubtitle");
    this.topbarGreetingText = root.querySelector(".topbar-greeting-text");

    // Orders tablosu
    this.ordersList = root.querySelector("#ordersList");

    // State
    this.events = [];
    this.selectedTicketType = "standard";
    this.currentUser = null;

    this.#wire();
  }

  setUser(user) {
    this.currentUser = user;
    if (this.whoami) this.whoami.textContent = user ? `${user.displayName} • ${user.email}` : "-";

    // Sidebar profil bloğu
    if (user) {
      const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
      if (this.userAvatar) this.userAvatar.textContent = initial || "?";
      if (this.userName) this.userName.textContent = user.displayName || "-";
      if (this.userRole) {
        const isAdmin = user.isAdmin === 1;
        const roleLabel = isAdmin
          ? "Admin"
          : user.role === "organization"
            ? "Organizasyon"
            : "Bireysel";
        this.userRole.textContent = roleLabel;
      }
      // Topbar greeting
      if (this.topbarGreetingText) {
        this.topbarGreetingText.textContent = `Merhaba, ${user.displayName || "kullanıcı"}`;
      }
    }

    const role = user?.role || "individual";
    const isAdmin = user?.isAdmin === 1;
    const canCreateEvent = role === "organization" || isAdmin;

    // Etkinlik oluşturma butonları (organizasyon veya admin)
    this.btnNewEvent?.classList.toggle("d-none", !canCreateEvent);
    this.btnNewEvent2?.classList.toggle("d-none", !canCreateEvent);

    // Admin menüsü
    this.navAdmin?.classList.toggle("d-none", !isAdmin);

    // Checkout panel herkese açık
    this.checkoutPanel?.classList.remove("d-none");

    // Bireysel kullanıcı için müşteri adını kendi adıyla doldur
    if (role === "individual" && !isAdmin && this.checkoutCustomerName && !this.checkoutCustomerName.value) {
      this.checkoutCustomerName.value = user?.displayName || "";
    }

    // Dashboard metrikleri: role bazlı
    if (role === "individual" && !isAdmin) {
      this.metricsIndividual?.classList.remove("d-none");
      this.metricsOrgAdmin?.classList.add("d-none");
    } else {
      this.metricsOrgAdmin?.classList.remove("d-none");
      this.metricsIndividual?.classList.add("d-none");
    }

    // Role bazlı sidebar menüsü
    this.#updateSidebar(user);

    // Verileri yükle
    this.#loadEvents();
    this.#loadStats();
    this.#loadOrders();
  }

  #wire() {
    this.btnLogout.addEventListener("click", async () => {
      await this.api.logout();
      this.toasts.show({ title: "Çıkış", message: "Oturum kapatıldı.", variant: "secondary" });
      await this.onLoggedOut();
    });

    // Etkinlik modalı (yeni etkinlik için reset)
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

    // Checkout: etkinlik seçimi
    this.checkoutEventSelect?.addEventListener("change", () => this.#updateCheckoutPanel());
    this.checkoutQuantity?.addEventListener("input", () => this.#updateCheckoutTotal());
    this.checkoutCustomerName?.addEventListener("input", () => this.#updateCheckoutTotal());

    // Bilet türü seçimi
    this.ticketButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        this.ticketButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedTicketType = btn.getAttribute("data-ticket-type") || "standard";
        this.#updateCheckoutTotal();
      });
    });

    // Sipariş oluştur
    this.btnPlaceOrder?.addEventListener("click", async () => {
      const eventId = parseInt(this.checkoutEventSelect.value);
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

  // Koltuk numaralarını "1, 2, 3-5, 7" gibi okunabilir gruplar
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

    // Onay butonları
    this.pendingOrgsList.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = parseInt(btn.getAttribute("data-approve"));
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
        ? `<span class="badge text-bg-danger">Admin</span>`
        : `<span class="text-muted">-</span>`;

      const actions = [];
      if (!isMe) {
        if (u.role === "organization" && !u.isApproved) {
          actions.push(`<button class="btn btn-sm btn-success" data-user-approve="${u.id}">Onayla</button>`);
        }
        actions.push(`<button class="btn btn-sm ${u.isAdmin ? 'btn-warning' : 'btn-outline-warning'}" data-user-toggle-admin="${u.id}" data-current="${u.isAdmin}">${u.isAdmin ? 'Admin Kaldır' : 'Admin Yap'}</button>`);
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

    // Onayla
    this.usersList.querySelectorAll("[data-user-approve]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = parseInt(btn.getAttribute("data-user-approve"));
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

    // Admin toggle
    this.usersList.querySelectorAll("[data-user-toggle-admin]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = parseInt(btn.getAttribute("data-user-toggle-admin"));
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

    // Sil
    this.usersList.querySelectorAll("[data-user-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = parseInt(btn.getAttribute("data-user-delete"));
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
          tickets: "Bilet Tipleri",
          orders: "Siparişler",
          checkin: "Giriş Kontrol",
          admin: "Admin Paneli"
        };
        const subtitles = {
          dashboard: "Tüm satış aktivitelerine hızlı bakış.",
          events: "Etkinlikleri görüntüle, abone ol veya yönet.",
          buy: "Etkinlik seç, koltuk haritasından yerini seç.",
          tickets: "Etkinliklere özel bilet türlerini yönet.",
          orders: "Geçmiş ve güncel sipariş kayıtları.",
          checkin: "Bilet kodu ile girişleri kontrol et.",
          admin: "Kullanıcı ve organizasyon onayları."
        };
        if (this.pageTitle) this.pageTitle.textContent = titles[page] || "Alpaca";
        if (this.topbarSubtitle) this.topbarSubtitle.textContent = subtitles[page] || "";

        if (page === "admin" && this.currentUser?.isAdmin === 1) {
          this.#loadPendingOrgs();
          this.#loadUsers();
        }
        if (page === "buy") {
          this.#initBuyPage();
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

    // Aktif sayfanın hala erişilebilir olduğundan emin ol
    const activeBtn = this.root.querySelector(".side-nav button.active");
    if (!activeBtn || activeBtn.classList.contains("d-none")) {
      navButtons.forEach(b => b.classList.remove("active"));
      if (firstVisible) firstVisible.click();
    }
  }

  async #loadEvents() {
    const r = await this.api.listEvents();
    if (!r.ok) {
      const errorMsg = `<div class="text-center text-danger py-4"><small>Hata: ${r.error}</small></div>`;
      this.eventList.innerHTML = errorMsg;
      if (this.eventListFull) this.eventListFull.innerHTML = errorMsg;
      return;
    }

    this.events = r.events || [];

    // Checkout dropdown'ı doldur
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

    // Buton handler'larını bağla
    [this.eventList, this.eventListFull].forEach(container => {
      if (!container) return;
      container.querySelectorAll("[data-edit]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.getAttribute("data-edit"));
          this.#openEditModal(id);
        });
      });
      container.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.getAttribute("data-delete"));
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
          const id = parseInt(btn.getAttribute("data-subscribe"));
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

      // Edit ve delete butonlarının satır click'i tetiklememesi için
      container.querySelectorAll("[data-edit], [data-delete]").forEach(btn => {
        btn.addEventListener("click", (ev) => ev.stopPropagation());
      });

      // Satıra tıklayınca detay modalı aç
      container.querySelectorAll(".event-row").forEach(row => {
        const open = () => {
          const id = parseInt(row.getAttribute("data-event-id"));
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

  // === Bilet Al Sayfası ===
  #wireBuyPageOnce() {
    if (this.buyPageWired) return;
    this.buyPageWired = true;

    // Bilet türü butonları
    this.buyTicketButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-buy-ticket");
        this.buySelectedTicket = t;
        this.buyTicketButtons.forEach(b => b.classList.toggle("active",
          b.getAttribute("data-buy-ticket") === t));
        this.#refreshBuyTotals();
      });
    });

    // Etkinlik seçimi
    this.buyEventSelect?.addEventListener("change", async () => {
      const id = parseInt(this.buyEventSelect.value);
      if (!id) {
        this.buyCurrentEvent = null;
        this.buySelectedSeats.clear();
        this.#renderSeatGrid(null, []);
        this.#refreshBuyTotals();
        return;
      }
      this.buyCurrentEvent = this.events.find(e => e.id === id) || null;
      this.buySelectedSeats.clear();

      // Fiyatları güncelle
      if (this.buyCurrentEvent) {
        this.buyStdPrice.textContent = `₺${this.buyCurrentEvent.standardPrice}`;
        this.buyVipPrice.textContent = `₺${this.buyCurrentEvent.vipPrice}`;
      }

      // Koltuk haritası
      const r = await this.api.eventSeats(id);
      if (r.ok) {
        this.#renderSeatGrid(r.capacity, r.bookedSeats);
      } else {
        this.seatGrid.innerHTML = `<div class="seat-empty-state text-danger">Hata: ${r.error}</div>`;
      }
      this.#refreshBuyTotals();
    });

    // Müşteri adı (bireysel kullanıcı için otomatik doldurulacak ama yine de güncellenebilir)
    this.buyCustomerName?.addEventListener("input", () => this.#refreshBuyTotals());

    // Satın al
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
        // Koltuk haritasını yenile
        const sr = await this.api.eventSeats(this.buyCurrentEvent.id);
        if (sr.ok) this.#renderSeatGrid(sr.capacity, sr.bookedSeats);
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

    // Etkinlik listesini dropdown'a yükle
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

    // Müşteri adı: bireysel kullanıcıysa otomatik doldur
    if (this.buyCustomerName && !this.buyCustomerName.value && this.currentUser?.role === "individual") {
      this.buyCustomerName.value = this.currentUser.displayName || "";
    }
  }

  #renderSeatGrid(capacity, bookedSeats) {
    if (!this.seatGrid) return;
    if (!capacity) {
      this.seatGrid.innerHTML = `<div class="seat-empty-state">Lütfen önce bir etkinlik seçin.</div>`;
      return;
    }
    const bookedSet = new Set(bookedSeats);
    const html = [];
    for (let i = 1; i <= capacity; i++) {
      const isSold = bookedSet.has(i);
      const isSelected = this.buySelectedSeats.has(i);
      const cls = isSold ? "seat seat-sold" : (isSelected ? "seat seat-selected" : "seat seat-available");
      html.push(`<button type="button" class="${cls}" data-seat="${i}" ${isSold ? "disabled" : ""} title="Koltuk ${i}${isSold ? ' (dolu)' : ''}">${i}</button>`);
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

    // Kapak
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

    // Footer aksiyonları
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
    const eventId = parseInt(this.checkoutEventSelect?.value);
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
    const eventId = parseInt(this.checkoutEventSelect?.value);
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
    if (!r.ok) return;

    if (r.scope === "individual") {
      // Bireysel kullanıcı metrikleri
      if (this.metricTotalSpent) this.metricTotalSpent.textContent = `₺${(r.totalSpent || 0).toFixed(0)}`;
      if (this.metricTicketsBought) this.metricTicketsBought.textContent = r.ticketsBought || 0;
      if (this.metricOrderCount) this.metricOrderCount.textContent = r.orderCount || 0;
      if (this.metricSubscriptionCount) this.metricSubscriptionCount.textContent = r.subscriptionCount || 0;
    } else {
      // Organizasyon / Admin metrikleri
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
}

class App {
  constructor() {
    this.api = new ApiClient();
    this.toasts = new Toasts(document.getElementById("toastRoot"));
    this.authView = new AuthView({
      root: document.getElementById("authView"),
      api: this.api,
      toasts: this.toasts,
      onAuthed: () => this.refresh()
    });
    this.appView = new AppView({
      root: document.getElementById("appView"),
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

    const auth = document.getElementById("authView");
    const app = document.getElementById("appView");

    if (forceToLogin || !user) {
      auth.classList.remove("d-none");
      app.classList.add("d-none");
      this.appView.setUser(null);
      return;
    }

    auth.classList.add("d-none");
    app.classList.remove("d-none");
    this.appView.setUser(user);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const sqliteEl = document.getElementById("sqlitePath");
  if (sqliteEl) sqliteEl.textContent = window.api?.env?.SQLITE_PATH || "-";

  const app = new App();
  app.start();
});

