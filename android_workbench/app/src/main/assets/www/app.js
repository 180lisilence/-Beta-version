/* ========================================================
   个人工作生活管理 - 纯本地单页应用
   IndexedDB + LocalStorage 本地存储，无后端依赖
   ======================================================== */
/* ========== 通用工具函数 U ========== */
const U = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  now: () => new Date().toISOString(),
  nowZh: () => {
    const d = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  todayStr: () => {
    const d = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  },
  fmtDate: s => {
    if (!s) return '';
    const t = U.parseDate(s);
    if (isNaN(t)) return s;
    const d = new Date(t);
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  },
  fmtTime: s => {
    if (!s) return '暂无时间';
    const t = U.parseDate(s);
    if (isNaN(t)) return '暂无时间';
    const d = new Date(t);
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  isToday: s => s && U.fmtDate(s).startsWith(U.todayStr()),
  // 安全日期解析：兼容多种格式，失败时返回 NaN 而不抛异常
  parseDate: s => {
    if (!s || typeof s !== 'string') return NaN;
    try {
      // 去掉可能的时区标识（Z、+HH:MM），统一按本地时间解析
      let cleaned = s.trim();
      // 把 ISO 格式的 T 替换为空格，去掉毫秒和时区
      cleaned = cleaned.replace('T', ' ').replace(/\.\d+/, '').replace(/[Zz]$/, '');
      // 如果有 +HH:MM 时区后缀，去掉
      cleaned = cleaned.replace(/[+-]\d{2}:\d{2}$/, '');
      const t = new Date(cleaned).getTime();
      return isNaN(t) ? NaN : t;
    } catch { return NaN; }
  },
  // 安全地将 datetime-local 输入值转为 ISO 字符串（兼容 Android WebView）
  toISO: localVal => {
    if (!localVal) return "";
    try {
      // datetime-local 格式: "2026-08-15T15:15"
      // 解析组件构造本地 Date，再 toISOString
      const m = localVal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (m) {
        const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]));
        return d.toISOString();
      }
      // 兜底：直接替换 T 为空格尝试解析
      const t = new Date(localVal.replace('T', ' ')).getTime();
      if (isNaN(t)) return "";
      return new Date(t).toISOString();
    } catch { return ""; }
  },
  overdue: s => {
    if (!s || typeof s !== 'string') return false;
    const t = U.parseDate(s);
    return !isNaN(t) && t < Date.now();
  },
  soon: (s, mins = 60) => {
    if (!s || typeof s !== 'string') return false;
    const t = U.parseDate(s);
    if (isNaN(t)) return false;
    const diff = t - Date.now();
    return diff > 0 && diff < mins * 60 * 1000;
  },
  escapeHtml: s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  el: (tag, attrs = {}, children = []) => {
    if (attrs.children && children.length === 0) { children = attrs.children; delete attrs.children; }
    const e = document.createElement(tag);
    const BOOL_ATTRS = new Set(['checked', 'disabled', 'selected', 'readonly', 'multiple', 'required', 'autofocus', 'autoplay', 'loop', 'muted']);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (BOOL_ATTRS.has(k)) { if (v) e.setAttribute(k, ''); }
      else if (v !== undefined && v !== null) e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  },
  fmtPriority: p => ({high:'高',mid:'中',low:'低'}[p] || '中'),
  fmtProgress: p => `${Math.round(Number(p) || 0)}%`,
  fmtMs: ms => {
    if (!ms) return '0h';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  },
  readFileAsText: file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  }),
  downloadBlob: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  csvEscape: s => `"${String(s ?? '').replace(/"/g, '""')}"`
};

/* ========== Toast 全局提示 ========== */
const Toast = {
  show(msg, type = 'info', dur = 2500) {
    const c = document.getElementById('toast-container');
    const t = U.el('div', { class: `toast toast-${type}`, text: msg });
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-in'));
    setTimeout(() => { t.classList.remove('toast-in'); }, dur - 300);
    setTimeout(() => t.remove(), dur);
  },
  success: m => Toast.show(m, 'success'),
  error: m => Toast.show(m, 'error'),
  info: m => Toast.show(m, 'info'),
  warn: m => Toast.show(m, 'warning')
};

/* ========== 全局弹窗 Modal ========== */
const Modal = {
  open({ title, body, footer, onClose, large = false }) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    const bodyEl = document.getElementById('modal-body');
    bodyEl.innerHTML = '';
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof HTMLElement) bodyEl.appendChild(body);
    const footerEl = document.getElementById('modal-footer');
    footer.innerHTML = '';
    if (footer) {
      if (Array.isArray(footer)) footer.forEach(b => footerEl.appendChild(b));
      else if (footer instanceof HTMLElement) footerEl.appendChild(footer);
    }
    modal.classList.toggle('large', large);
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    const close = () => {
      overlay.classList.add('hidden');
      modal.classList.add('hidden');
      if (onClose) onClose();
    };
    document.getElementById('modal-close').onclick = close;
    overlay.onclick = close;
    return close;
  },
  confirm({ title = '确认', content, confirmText = '确定', cancelText = '取消', danger = false }) {
    return new Promise((resolve) => {
      const body = U.el('div', { style: 'font-size:13px;line-height:1.7;color:#34495e;' });
      if (typeof content === 'string') body.innerHTML = content;
      else body.appendChild(content);
      const cancelBtn = U.el('button', { class: 'btn btn-ghost', text: cancelText });
      const okBtn = U.el('button', { class: danger ? 'btn btn-danger' : 'btn btn-primary', text: confirmText });
      const close = Modal.open({ title, body, footer: [cancelBtn, okBtn] });
      cancelBtn.onclick = () => { close(); resolve(false); };
      okBtn.onclick = () => { close(); resolve(true); };
    });
  }
};

/* ========== IndexedDB 数据库封装 ========== */
// ========== localStorage 后备存储 ==========
const LSStore = {
  _prefix: "pw_db_",
  _getStore(store) {
    const key = this._prefix + store;
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch { return []; }
  },
  _setStore(store, data) {
    localStorage.setItem(this._prefix + store, JSON.stringify(data));
  },
  async add(store, item) {
    item.id = item.id || U.uid();
    item.createdAt = item.createdAt || U.now();
    const arr = this._getStore(store);
    arr.push(item);
    this._setStore(store, arr);
    return item;
  },
  async put(store, item) {
    item.updatedAt = U.now();
    const arr = this._getStore(store);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) arr[idx] = item; else arr.push(item);
    this._setStore(store, arr);
    return item;
  },
  async get(store, id) {
    const arr = this._getStore(store);
    return arr.find(x => x.id === id) || null;
  },
  async getAll(store) {
    return this._getStore(store);
  },
  async delete(store, id) {
    const arr = this._getStore(store).filter(x => x.id !== id);
    this._setStore(store, arr);
  },
  async clearAll() {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(this._prefix)) localStorage.removeItem(k);
    });
  },
  async exportAll() {
    const result = {};
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(this._prefix)) {
        result[k.slice(this._prefix.length)] = JSON.parse(localStorage.getItem(k) || "[]");
      }
    }
    return result;
  },
  async importAll(data) {
    for (const [store, items] of Object.entries(data)) {
      this._setStore(store, items);
    }
  }
};

const DB = (() => {
  const DB_NAME = "personal_app_db";
  const DB_VERSION = 1;
  const STORES = [
    { name: "memos", keyPath: "id" },
    { name: "todayPlans", keyPath: "id" },
    { name: "mediaList", keyPath: "id" },
    { name: "devProjects", keyPath: "id" },
    { name: "devTasks", keyPath: "id" },
    { name: "consultOrders", keyPath: "id" },
    { name: "consultFollows", keyPath: "id" },
    { name: "fitnessPlans", keyPath: "id" },
    { name: "fitnessRecords", keyPath: "id" },
    { name: "dietRecords", keyPath: "id" },
    { name: "games", keyPath: "id" },
    { name: "recycleBin", keyPath: "id" },
    { name: "aiConvs", keyPath: "id" },
    { name: "aiMsgs", keyPath: "id" }
  ];
  let db = null;
  let useLS = navigator.userAgent.includes("PersonalWorkbench/Android");

  async function open() {
    if (useLS) return null;
    if (db) return db;
    try {
      return await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
          const d = e.target.result;
          STORES.forEach(store => {
            if (!d.objectStoreNames.contains(store.name)) {
              d.createObject(store.name, { keyPath: store.keyPath });
            }
          });
        };
        req.onsuccess = e => { db = e.target.result; resolve(db); };
        req.onerror = () => reject(req.error);
        setTimeout(() => reject(new Error("IndexedDB timeout")), 3000);
      });
    } catch (err) {
      console.warn("IndexedDB 不可用，切换到 localStorage:", err.message);
      useLS = true;
      return null;
    }
  }
  function reqPromise(r) {
    return new Promise((res, rej) => {
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return {
    async add(store, item) {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.add(store, item);
      item.id = item.id || U.uid();
      item.createdAt = item.createdAt || U.now();
      await reqPromise(db.transaction(store, "readwrite").objectStore(store).add(item));
      return item;
    },
    async put(store, item) {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.put(store, item);
      item.updatedAt = U.now();
      await reqPromise(db.transaction(store, "readwrite").objectStore(store).put(item));
      return item;
    },
    async get(store, id) {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.get(store, id);
      const r = await reqPromise(db.transaction(store).objectStore(store).get(id));
      return r || null;
    },
    async getAll(store) {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.getAll(store);
      const r = await reqPromise(db.transaction(store).objectStore(store).getAll());
      return r || [];
    },
    async delete(store, id) {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.delete(store, id);
      await reqPromise(db.transaction(store, "readwrite").objectStore(store).delete(id));
    },
    async softDelete(store, id) {
      const item = await this.get(store, id);
      if (!item) return null;
      const recycleItem = {
        ...item,
        _sourceStore: store,
        _originalId: id,
        _deletedAt: U.now(),
        id: U.uid()
      };
      await this.add("recycleBin", recycleItem);
      await this.delete(store, id);
      return recycleItem;
    },
    async restoreFromRecycle(recycleId) {
      const item = await this.get("recycleBin", recycleId);
      if (!item) return null;
      const sourceStore = item._sourceStore;
      const originalId = item._originalId;
      const restored = { ...item };
      delete restored._sourceStore;
      delete restored._originalId;
      delete restored._deletedAt;
      const exist = await this.get(sourceStore, originalId);
      if (exist) restored.id = U.uid();
      await this.put(sourceStore, restored);
      await this.delete("recycleBin", recycleId);
      return restored;
    },
    async hardDeleteRecycle(recycleId) {
      await this.delete("recycleBin", recycleId);
    },
    async clearAll() {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.clearAll();
      return new Promise((resolve, reject) => {
        const t = db.transaction(db.objectStoreNames, "readwrite");
        db.objectStoreNames.forEach(n => t.object(n).clear());
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
    },
    async exportAll() {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.exportAll();
      const result = {};
      for (const n of Array.from(db.objectStoreNames)) {
        result[n] = await this.getAll(n);
      }
      return result;
    },
    async importAll(data) {
      const isLS = useLS || !(await open());
      if (isLS) return LSStore.importAll(data);
      const t = db.transaction(db.objectStoreNames, "readwrite");
      db.objectStoreNames.forEach(n => t.object(n).clear());
      await Promise.all(Object.entries(data).map(([n, items]) =>
        Promise.all(items.map(it => reqPromise(t.object(n).put(it))))
      ));
    }
  };
})();

/* ========== 本地配置 LocalStorage ========== */
const Config = {
  KEY: "personal_app_config",
  // AI 默认配置（豆包为默认提供商，API Key 需自行填写）
  aiDefaults: {
    provider: "doubao",
    apiKey: "",
    apiUrl: "",
    model: "doubao-seed-evolving",
    systemPrompt: "你是一个高效、简洁的中文助手。"
  },
  default() {
    return { notifyEnabled: true, defaultPriority: "mid", theme: "light", ai: { ...this.aiDefaults } };
  },
  get() {
    try {
      const cfg = { ...this.default(), ...JSON.parse(localStorage.getItem(this.KEY) || "{}") };
      // 确保 ai 子对象完整
      cfg.ai = { ...this.aiDefaults, ...(cfg.ai || {}) };
      return cfg;
    } catch {
      return this.default();
    }
  },
  getAi() {
    return this.get().ai;
  },
  setAi(aiCfg) {
    const c = this.get();
    c.ai = { ...this.aiDefaults, ...aiCfg };
    this.set(c);
    return c.ai;
  },
  set(cfg) {
    localStorage.setItem(this.KEY, JSON.stringify(cfg));
  },
  update(patch) {
    const c = this.get();
    Object.assign(c, patch);
    this.set(c);
    return c;
  },
  // 清洗 localStorage 中的无效 AI 模型名（防止旧脏数据导致 API 404）
  sanitizeAi(providers) {
    const ai = this.getAi();
    const provider = providers[ai.provider] || providers.doubao;
    const validModels = provider.models.map(m => m.value);
    if (ai.model && !validModels.includes(ai.model)) {
      // 模型不在白名单中，重置为默认模型
      this.setAi({ ...ai, model: provider.defaultModel });
      console.warn(`AI 模型已重置: ${ai.model} -> ${provider.defaultModel}`);
    }
  }
};

/* ========== 主题切换 ========== */
const Theme = {
  apply(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
  },
  get() {
    return Config.get().theme || "light";
  },
  set(theme) {
    Config.update({ theme });
    this.apply(theme);
    Bus.emit("themeChanged", theme);
  },
  toggle() {
    const next = this.get() === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  },
  init() {
    this.apply(this.get());
  }
};

/* ========== 全局事件总线 ========== */
const Bus = {
  listeners: {},
  on(evt, fn) {
    (this.listeners[evt] = this.listeners[evt] || []).push(fn);
  },
  emit(evt, data) {
    (this.listeners[evt] || []).forEach(fn => fn(data));
  }
};
Bus.on("dataChanged", () => {
  if (App.currentRoute === "home") Home._refresh();
});
Bus.on("remindersChanged", () => Reminder.reschedule());

/* ========== 浏览器通知提醒 ========== */
const Reminder = {
  timer: null,
  dueIds: new Set(),
  reschedule() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), 30000);
    this.check();
  },
  async check() {
    if (!Config.get().notifyEnabled) return;
    if (Notification.permission !== "granted") return;
    const plans = await DB.getAll("todayPlans");
    const now = Date.now();
    plans.forEach(p => {
      if (!p.deadline || p.status === "done") return;
      const dl = U.parseDate(p.deadline);
      if (dl <= now && dl > now - 60000 && !this.dueIds.has(p.id)) {
        new Notification("⏰ 今日计划到期", { body: p.title });
        this.dueIds.add(p.id);
        setTimeout(() => this.dueIds.delete(p.id), 120000);
      }
    });
  },
  async requestPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === "default") {
      try {
        await Promise.race([
          Notification.requestPermission(),
          new Promise(resolve => setTimeout(() => resolve('timeout'), 2000))
        ]);
      } catch (e) { /* ignore */ }
    }
  }
};

/* ========== 路由管理器 ========== */
const Router = {
  current: "home",
  init() {
    window.addEventListener("hashchange", () => this.navigate());
    this.navigate();
  },
  navigate() {
    const route = (location.hash.replace("#/", "") || "home").split("?")[0];
    if (!App.modules[route]) {
      location.hash = "#/home";
      return;
    }
    this.current = route;
    App.currentRoute = route;
    document.querySelectorAll(".nav-item").forEach(el => {
      el.classList.toggle("active", el.dataset.route === route);
    });
    document.querySelectorAll(".bottom-nav-item").forEach(el => {
      el.classList.toggle("active", el.dataset.route === route);
    });
    const container = document.getElementById("view-container");
    const doRender = () => {
      if (this.current !== route) return;
      container.classList.remove("route-fade-out");
      container.innerHTML = "";
      App.modules[route].render(container);
      requestAnimationFrame(() => { container.style.opacity = ""; container.style.transform = ""; });
    };
    if (container.innerHTML.trim()) {
      container.classList.add("route-fade-out");
      setTimeout(doRender, 160);
    } else {
      doRender();
    }
  }
};

/* ========== 文件绑定通用UI组件 ========== */
function fileBindUI(existingFiles = []) {
  const list = existingFiles.map(f => ({ name: f.name, size: f.size || 0 }));
  const area = U.el("div", { class: "file-bind-area" }, [
    U.el("div", { class: "file-icon", text: "📎" }),
    U.el("div", { text: "点击或拖拽本地文件绑定（仅保存文件名）" })
  ]);
  const hidden = U.el("input", { type: "file", multiple: true, style: "display:none" });
  const listEl = U.el("div", { class: "file-list" });
  const render = () => {
    listEl.innerHTML = "";
    list.forEach((f, i) => {
      listEl.appendChild(U.el("div", { class: "file-item" }, [
        U.el("span", { text: "📄 " + f.name }),
        U.el("button", { class: "remove-file", text: "✕", onclick: () => { list.splice(i, 1); render(); } })
      ]));
    });
  };
  area.onclick = () => hidden.click();
  hidden.onchange = e => {
    Array.from(e.target.files).forEach(f => list.push({ name: f.name, size: f.size }));
    render();
  };
  ["dragenter","dragover"].forEach(ev => area.addEventListener(ev, e => {
    e.preventDefault(); area.classList.add("drag-over");
  }));
  ["dragleave","drop"].forEach(ev => area.addEventListener(ev, e => {
    e.preventDefault(); area.classList.remove("drag-over");
  }));
  area.addEventListener("drop", e => {
    Array.from(e.dataTransfer.files).forEach(f => list.push({ name: f.name, size: f.size }));
    render();
  });
  render();
  return { container: U.el("div", { style: "flex:1;" }, [area, hidden, listEl]), list };
}

/* ========== 各页面业务模块 ========== */
const Home = {
  render(container) {
    const d = new Date();
    const pad = n => n.toString().padStart(2, "0");
    const hour = d.getHours();
    const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
    container.appendChild(U.el("div", { class: "page-header card-enter" }, [
      U.el("div", {}, [
        U.el("div", { class: "page-title", text: `${greeting}，今天是 ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }),
        U.el("div", { class: "page-subtitle", text: "所有事务总览中心" })
      ])
    ]));
    const grid = U.el("div", { class: "summary-grid" });
    grid.appendChild(this._statCard());
    grid.appendChild(this._todayCard());
    grid.appendChild(this._highPriorityCard());
    grid.appendChild(this._moduleStats());
    grid.appendChild(this._quickNav());
    container.appendChild(grid);
    setTimeout(() => this._fillData(container), 30);
  },
  _refresh() {
    const c = document.getElementById("view-container");
    c.innerHTML = "";
    this.render(c);
  },
  async _fillData(container) {
    const targets = [
      { sel: ".home-stat", skeleton: this._skeletonStat() },
      { sel: ".home-today", skeleton: this._skeletonList() },
      { sel: ".home-high", skeleton: this._skeletonList() },
      { sel: ".home-mod", skeleton: this._skeletonStat() }
    ];
    targets.forEach(t => {
      const el = container.querySelector(t.sel);
      if (el) {
        const title = el.querySelector(".card-title");
        el.innerHTML = "";
        if (title) el.appendChild(title);
        el.insertAdjacentHTML("beforeend", t.skeleton);
      }
    });
    try {
      const [plans, media, devProjs, devTasks, consult, fitness, diet, games, recycle] = await Promise.all([
        DB.getAll("todayPlans"), DB.getAll("mediaList"),
        DB.getAll("devProjects"), DB.getAll("devTasks"),
        DB.getAll("consultOrders"), DB.getAll("fitnessRecords"),
        DB.getAll("dietRecords"), DB.getAll("games"),
        DB.getAll("recycleBin")
      ]);
      const doneCount = plans.filter(p => p.status === 'done').length;
      const pendingCount = plans.filter(p => p.status !== 'done').length;
      const overdueCount = plans.filter(p => U.overdue(p.deadline) && p.status !== 'done').length;
      const soonCount = plans.filter(p => U.soon(p.deadline) && p.status !== 'done').length;

      container.querySelector(".home-stat").innerHTML = `
        <div class="card-title">📊 数据统计</div>
        <div class="content-fade">
        <div class="summary-item-header"><div class="summary-item-title">📋 今日计划</div><div class="summary-item-meta">${doneCount}/${plans.length}</div></div>
        <div class="summary-item-header"><div class="summary-item-title">💻 开发任务</div><div class="summary-item-meta">${devTasks.length}个</div></div>
        <div class="summary-item-header"><div class="summary-item-title">💼 咨询工单</div><div class="summary-item-meta">${consult.length}个</div></div>
        <div class="summary-item-header"><div class="summary-item-title">📱 自媒体</div><div class="summary-item-meta">${media.length}条</div></div>
        <div class="summary-item-header"><div class="summary-item-title">🏋️ 健身记录</div><div class="summary-item-meta">${fitness.length}次</div></div>
        <div class="summary-item-header"><div class="summary-item-title">🎮 游戏记录</div><div class="summary-item-meta">${games.length}条</div></div>
        <div class="summary-item-header"><div class="summary-item-title">🗑 回收站</div><div class="summary-item-meta">${recycle.length}条</div></div>
        </div>`;

      const todosSorted = [...plans].sort((a,b)=>{
        const wa = U.overdue(a.deadline)?0:U.soon(a.deadline)?1:(a.priority==='high'?2:a.priority==='mid'?3:4);
        const wb = U.overdue(b.deadline)?0:U.soon(b.deadline)?1:(b.priority==='high'?2:b.priority==='mid'?3:4);
        return wa - wb;
      });
      container.querySelector(".home-today").innerHTML = `
        <div class="card-title">📋 今日待办</div>
        <div class="content-fade">
        ${todosSorted.length ? todosSorted.slice(0,6).map((p,i)=>{
          const statusLabel = p.status==='done'?'已完成':p.status==='doing'?'进行中':'待办';
          const timeLabel = p.deadline ? (U.overdue(p.deadline)?`<span class="overdue">⏰已逾期</span>`:U.soon(p.deadline)?`<span class="soon">⏰临近</span>`:""):"";
          return `<div class="list-item-enter" style="animation-delay:${i*0.04}s;padding:6px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px;">
          <span class="badge badge-${p.priority||'mid'}">${U.fmtPriority(p.priority)}</span>
          <a href="#/todayPlan" style="flex:1;color:#333;text-decoration:none;${p.status==='done'?'text-decoration:line-through;color:#999':''}">${U.escapeHtml(p.title)}</a>
          <span class="badge badge-${p.status}">${statusLabel}</span>
          ${timeLabel}
        </div>`;
        }).join("") : `<div class="empty-text">暂无今日计划，<a href="#/todayPlan" style="color:#4a90d9">点击新增</a></div>`}
        </div>`;

      const todoHigh = todosSorted.filter(p => p.priority==='high' && p.status!=='done').slice(0,5);
      let highHtml = "";
      if (overdueCount > 0) highHtml += `<div class="summary-item-header" style="color:#e74c3c"><div class="summary-item-title">⚠️ 已逾期</div><div class="summary-item-meta">${overdueCount}项</div></div>`;
      if (soonCount > 0) highHtml += `<div class="summary-item-header" style="color:#f39c12"><div class="summary-item-title">⏰ 即将到期</div><div class="summary-item-meta">${soonCount}项</div></div>`;
      highHtml += todoHigh.length ? todoHigh.map(p=>`
        <div style="padding:6px 0;border-bottom:1px solid #eee">
          <a href="#/todayPlan" style="color:#c0392b;text-decoration:none">🔥 ${U.escapeHtml(p.title)}</a>
        </div>`).join("") : `<div class="empty-text">${highHtml?"":pendingCount===0?"今日全部完成，棒棒哒 🎉":"暂无高优紧急项"}</div>`;
      container.querySelector(".home-high").innerHTML = `
        <div class="card-title">🔥 紧急 & 高优</div>
        <div class="content-fade">${highHtml}</div>`;

      const thisWeek = new Date(Date.now() - 7*86400000);
      const thisWeekDiet = diet.filter(r => r.date && U.parseDate(r.date) >= thisWeek.getTime());
      const todayDiet = diet.filter(r => r.date === U.todayStr());
      const todayCal = todayDiet.reduce((s,r)=>s+(Number(r.calories)||0),0);
      const gamesTotalMs = games.reduce((s,g)=>s+((g.endTime&&g.startTime)?Math.max(0,U.parseDate(g.endTime)-U.parseDate(g.startTime)):0),0);
      container.querySelector(".home-mod").innerHTML = `
        <div class="card-title">📈 模块概览</div>
        <div class="content-fade">
        <div class="summary-item-header"><div class="summary-item-title">📅 今日饮食</div><div class="summary-item-meta">${todayDiet.length}条 · ${todayCal} kcal</div></div>
        <div class="summary-item-header"><div class="summary-item-title">🥗 近7日饮食</div><div class="summary-item-meta">${thisWeekDiet.length}条</div></div>
        <div class="summary-item-header"><div class="summary-item-title">🏋️ 训练记录</div><div class="summary-item-meta">${fitness.length}次</div></div>
        <div class="summary-item-header"><div class="summary-item-title">🎮 游戏时长</div><div class="summary-item-meta">${U.fmtMs(gamesTotalMs)}</div></div>
        <div class="summary-item-header"><div class="summary-item-title">💻 项目数</div><div class="summary-item-meta">${devProjs.length}个</div></div>
        <div class="summary-item-header"><div class="summary-item-title">📱 已发布内容</div><div class="summary-item-meta">${media.filter(m=>m.status==='published').length}条</div></div>
        </div>`;
    } catch(e) {
      console.warn("首页数据加载异常", e);
      targets.forEach(t => {
        const el = container.querySelector(t.sel);
        if (el && !el.querySelector(".summary-item-header") && !el.querySelector(".empty-text")) {
          el.querySelector(".content-fade")?.remove();
          const title = el.querySelector(".card-title");
          el.innerHTML = "";
          if (title) el.appendChild(title);
          el.insertAdjacentHTML("beforeend", `<div class="empty-text">数据加载失败，请重试</div>`);
        }
      });
    }
  },
  _skeletonStat() {
    let html = '<div class="content-fade" style="animation-duration:0.25s">';
    for (let i = 0; i < 4; i++) {
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div class="skeleton skeleton-line w50"></div>
        <div class="skeleton skeleton-line w30 sm"></div>
      </div>`;
    }
    return html + '</div>';
  },
  _skeletonList() {
    let html = '<div class="content-fade" style="animation-duration:0.25s">';
    for (let i = 0; i < 3; i++) {
      html += `<div style="padding:8px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px;">
        <div class="skeleton" style="width:42px;height:18px"></div>
        <div class="skeleton skeleton-line w60" style="flex:1"></div>
        <div class="skeleton skeleton-line w20 sm"></div>
      </div>`;
    }
    return html + '</div>';
  },
  _wrap(card, delayClass) {
    card.classList.add("card-enter", delayClass);
    return card;
  },
  _statCard() {
    return this._wrap(U.el("div", { class: "card home-stat" }, [
      U.el("div", { class: "card-title", text: "📊 数据统计" })
    ]), "d1");
  },
  _todayCard() {
    return this._wrap(U.el("div", { class: "card home-today" }, [
      U.el("div", { class: "card-title", text: "📋 今日待办" })
    ]), "d2");
  },
  _highPriorityCard() {
    return this._wrap(U.el("div", { class: "card home-high" }, [
      U.el("div", { class: "card-title", text: "🔥 紧急 & 高优" })
    ]), "d3");
  },
  _moduleStats() {
    return this._wrap(U.el("div", { class: "card home-mod" }, [
      U.el("div", { class: "card-title", text: "📈 模块概览" })
    ]), "d4");
  },
  _quickNav() {
    const grid = U.el("div", { class: "quick-grid" });
    const links = [
      { route:"home",icon:"🏠",label:"首页" },
      { route:"todayPlan",icon:"📋",label:"计划" },
      { route:"media",icon:"📱",label:"自媒体" },
      { route:"develop",icon:"💻",label:"开发" },
      { route:"consult",icon:"💼",label:"咨询" },
      { route:"fitness",icon:"🏋️",label:"健身" },
      { route:"diet",icon:"🥗",label:"饮食" },
      { route:"game",icon:"🎮",label:"游戏" },
      { route:"profile",icon:"👤",label:"我的" },
      { route:"setting",icon:"⚙️",label:"设置" }
    ];
    links.forEach(item => {
      const card = U.el("div", { class: "quick-card", onclick:()=>location.hash=`#/${item.route}` }, [
        U.el("div", { class: "quick-icon", text: item.icon }),
        U.el("div", { class: "quick-label", text: item.label })
      ]);
      grid.appendChild(card);
    });
    return this._wrap(U.el("div", { class: "card" }, [
      U.el("div", { class: "card-title", text: "⚡ 快捷入口" }),
      grid
    ]), "d5");
  }
};

const TodayPlan = {
  async render(container) {
    container.innerHTML = `<div class="card">加载中...</div>`;
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📋 今日计划</div>
        <div class="page-subtitle">管理当日所有待办事项</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="addPlanBtn">＋新增计划</button>
      </div>
    </div>
    <div id="planList"></div>
    `;
    this.bindEvent(container);
    this.refresh(container);
  },
  bindEvent(box) {
    box.querySelector("#addPlanBtn").onclick = () => this.openEditor();
  },
  async refresh(box) {
    const listBox = box.querySelector("#planList");
    const all = await DB.getAll("todayPlans");
    if (!all.length) {
      listBox.innerHTML = `<div class="card empty-state"><div class="empty-icon">📋</div><div class="empty-text">暂无计划，点击右上角新增</div></div>`;
      return;
    }
    listBox.innerHTML = all.map(p => `
    <div class="item">
      <div class="item-header">
        <div class="item-title">
          <span class="badge badge-${p.priority || 'mid'}">${U.fmtPriority(p.priority)}</span>
          ${U.escapeHtml(p.title)}
          <span class="badge badge-${p.status}">${p.status==='done'?'已完成':p.status==='doing'?'进行中':'待办'}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-primary edit" data-id="${p.id}">编辑</button>
          <button class="btn btn-sm btn-danger del" data-id="${p.id}">删除</button>
        </div>
      </div>
      ${p.remark?`<div class="item-body">${U.escapeHtml(p.remark)}</div>`:""}
      <div class="item-meta">
        ${p.deadline?`<span class="${U.overdue(p.deadline)?"overdue":U.soon(p.deadline)?"soon":""}">⏰${U.fmtTime(p.deadline)}</span>`:""}
        <span>创建：${U.fmtTime(p.createdAt)}</span>
      </div>
    </div>
    `).join("");
    box.querySelectorAll(".edit").forEach(btn=>{
      btn.onclick = async ()=>{
        const data = await DB.get("todayPlans", btn.dataset.id);
        this.openEditor(data);
      };
    });
    box.querySelectorAll(".del").forEach(btn=>{
      btn.onclick = async ()=>{
        const ok = await Modal.confirm({title:"删除计划",content:"删除会移入回收站，确认？",danger:true});
        if(ok){
          await DB.softDelete("todayPlans", btn.dataset.id);
          Bus.emit("dataChanged");
          this.refresh(box);
          Toast.success("已移入回收站");
        }
      };
    });
  },
  async openEditor(data = null) {
    const d = data || { title:"",remark:"",deadline:"",priority:"mid",status:"todo" };
    const body = U.el("div");
    body.appendChild(U.el("div", {class:"field-row"}, [
      U.el("label", {text:"标题"}),
      U.el("input", {class:"input",value:d.title,placeholder:"必填"})
    ]));
    body.appendChild(U.el("div", {class:"field-row",style:"align-items:flex-start"}, [
      U.el("label", {text:"备注"}),
      U.el("textarea", {class:"textarea",value:d.remark})
    ]));
    body.appendChild(U.el("div", {class:"field-row"}, [
      U.el("label", {text:"截止时间"}),
      U.el("input", {type:"datetime-local",class:"input",value:d.deadline?d.deadline.slice(0,16):""})
    ]));
    body.appendChild(U.el("div", {class:"field-row"}, [
      U.el("label", {text:"优先级"}),
      U.el("select", {class:"select",children:[
        U.el("option",{value:"high",text:"高"}),
        U.el("option",{value:"mid",text:"中"}),
        U.el("option",{value:"low",text:"低"})
      ],value:d.priority})
    ]));
    body.appendChild(U.el("div", {class:"field-row"}, [
      U.el("label", {text:"状态"}),
      U.el("select", {class:"select",children:[
        U.el("option",{value:"todo",text:"待办"}),
        U.el("option",{value:"doing",text:"进行中"}),
        U.el("option",{value:"done",text:"已完成"})
      ],value:d.status})
    ]));
    const saveBtn = U.el("button", {class:"btn btn-primary",text:"保存"});
    const cancelBtn = U.el("button", {class:"btn btn-ghost",text:"取消"});
    const close = Modal.open({
      title: data ? "编辑计划" : "新增计划",
      body,
      footer:[cancelBtn, saveBtn]
    });
    cancelBtn.onclick = close;
    saveBtn.onclick = async ()=>{
      const inputs = body.querySelectorAll("input,textarea,select");
      const title = inputs[0].value.trim();
      if(!title){Toast.warn("标题不能为空");return;}
      try {
        const payload = {
          ...(data||{}),
          title,
          remark: inputs[1].value,
          deadline: U.toISO(inputs[2].value),
          priority: inputs[3].value,
          status: inputs[4].value,
          updatedAt: U.now()
        };
        if(data) await DB.put("todayPlans",payload);
        else await DB.add("todayPlans",payload);
        Bus.emit("dataChanged");
        close();
        Toast.success(data?"修改成功":"新增成功");
        Router.navigate();
      } catch(e) {
        console.error("保存失败:", e);
        Toast.error("保存失败：" + (e.message || e));
      }
    };
  }
};

/* ========== Media 自媒体 ========== */
const Media = {
  async render(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📱 自媒体</div>
        <div class="page-subtitle">选题、内容、发布全流程</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="addMediaBtn">＋新增内容</button>
      </div>
    </div>
    <div id="mediaList"></div>`;
    container.querySelector("#addMediaBtn").onclick = () => this.openEditor();
    await this.refresh(container);
  },
  async refresh(box) {
    const listBox = box.querySelector("#mediaList");
    const all = (await DB.getAll("mediaList")).sort((a,b) => U.parseDate(b.updatedAt||b.createdAt) - U.parseDate(a.updatedAt||a.createdAt));
    if (!all.length) {
      listBox.innerHTML = `<div class="card empty-state"><div class="empty-icon">📱</div><div class="empty-text">暂无内容，点击右上角新增</div></div>`;
      return;
    }
    const statusMap = { draft:"草稿", doing:"制作中", published:"已发布" };
    listBox.innerHTML = all.map(m => `
    <div class="item">
      <div class="item-header">
        <div class="item-title">
          <span class="badge badge-mid">${U.escapeHtml(m.platform||'未指定平台')}</span>
          ${U.escapeHtml(m.title)}
          <span class="badge badge-${m.status==='published'?'low':m.status==='doing'?'high':'mid'}">${statusMap[m.status]||'草稿'}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-primary edit" data-id="${m.id}">编辑</button>
          <button class="btn btn-sm btn-danger del" data-id="${m.id}">删除</button>
        </div>
      </div>
      ${m.content?`<div class="item-body">${U.escapeHtml(m.content.slice(0,120))}${m.content.length>120?'...':''}</div>`:""}
      <div class="item-meta">
        ${m.publishDate?`<span>📅 ${U.fmtDate(m.publishDate)}</span>`:""}
        ${m.url?`<span>🔗 <a href="${U.escapeHtml(m.url)}" target="_blank">链接</a></span>`:""}
        <span>更新：${U.fmtTime(m.updatedAt||m.createdAt)}</span>
      </div>
    </div>`).join("");
    listBox.querySelectorAll(".edit").forEach(btn => btn.onclick = async () => this.openEditor(await DB.get("mediaList", btn.dataset.id)));
    listBox.querySelectorAll(".del").forEach(btn => btn.onclick = async () => {
      if (await Modal.confirm({title:"删除内容",content:"删除会移入回收站，确认？",danger:true})) {
        await DB.softDelete("mediaList", btn.dataset.id);
        Bus.emit("dataChanged"); await this.refresh(box); Toast.success("已移入回收站");
      }
    });
  },
  async openEditor(data = null) {
    const d = data || { platform:"", title:"", content:"", status:"draft", publishDate:"", url:"", notes:"" };
    const body = U.el("div");
    body.appendChild(U.el("div", {class:"field-row"}, [
      U.el("label", {text:"平台"}),
      U.el("select", {class:"select",children:[
        U.el("option",{value:"微信公众号",text:"微信公众号"}),
        U.el("option",{value:"知乎",text:"知乎"}),
        U.el("option",{value:"B站",text:"B站"}),
        U.el("option",{value:"小红书",text:"小红书"}),
        U.el("option",{value:"抖音",text:"抖音"}),
        U.el("option",{value:"微博",text:"微博"}),
        U.el("option",{value:"其他",text:"其他"})
      ],value:d.platform||"微信公众号"})
    ]));
    body.appendChild(U.el("div", {class:"field-row"}, [U.el("label",{text:"标题/选题"}), U.el("input",{class:"input",value:d.title,placeholder:"必填"})]));
    body.appendChild(U.el("div", {class:"field-row",style:"align-items:flex-start"}, [U.el("label",{text:"内容概要"}), U.el("textarea",{class:"textarea",value:d.content,placeholder:"正文或内容概要"})]));
    body.appendChild(U.el("div", {class:"field-row"}, [U.el("label",{text:"状态"}), U.el("select",{class:"select",children:[
      U.el("option",{value:"draft",text:"草稿"}), U.el("option",{value:"doing",text:"制作中"}), U.el("option",{value:"published",text:"已发布"})
    ],value:d.status})]));
    body.appendChild(U.el("div", {class:"field-row"}, [U.el("label",{text:"计划发布"}), U.el("input",{type:"date",class:"input",value:d.publishDate||""})]));
    body.appendChild(U.el("div", {class:"field-row"}, [U.el("label",{text:"发布链接"}), U.el("input",{class:"input",value:d.url,placeholder:"https://..."})]));
    body.appendChild(U.el("div", {class:"field-row",style:"align-items:flex-start"}, [U.el("label",{text:"备注"}), U.el("textarea",{class:"textarea",value:d.notes})]));
    const saveBtn = U.el("button",{class:"btn btn-primary",text:"保存"});
    const cancelBtn = U.el("button",{class:"btn btn-ghost",text:"取消"});
    const close = Modal.open({title:data?"编辑自媒体内容":"新增自媒体内容",body,footer:[cancelBtn,saveBtn]});
    cancelBtn.onclick = close;
    saveBtn.onclick = async () => {
      const inputs = body.querySelectorAll("input,textarea,select");
      const title = inputs[1].value.trim();
      if(!title){Toast.warn("标题不能为空");return;}
      try {
        const payload = {...(data||{}), platform:inputs[0].value, title, content:inputs[2].value, status:inputs[3].value, publishDate:inputs[4].value, url:inputs[5].value, notes:inputs[6].value, updatedAt:U.now()};
        if(data) await DB.put("mediaList",payload); else await DB.add("mediaList",payload);
        Bus.emit("dataChanged"); close(); Toast.success(data?"修改成功":"新增成功"); Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  }
};

/* ========== Develop 开发工作 ========== */
const Develop = {
  currentTab: "tasks",
  async render(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">💻 开发工作</div>
        <div class="page-subtitle">项目台账与任务跟踪</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" id="tabTasks">📝 任务</button>
        <button class="btn btn-ghost" id="tabProjects">📂 项目</button>
        <button class="btn btn-primary" id="addDevBtn">＋新增</button>
      </div>
    </div>
    <div id="devList"></div>`;
    const tabTasks = container.querySelector("#tabTasks");
    const tabProjects = container.querySelector("#tabProjects");
    const addBtn = container.querySelector("#addDevBtn");
    const refreshWrap = async () => {
      tabTasks.disabled = Develop.currentTab === "tasks"; tabTasks.style.opacity = Develop.currentTab === "tasks" ? 0.5 : 1;
      tabProjects.disabled = Develop.currentTab === "projects"; tabProjects.style.opacity = Develop.currentTab === "projects" ? 0.5 : 1;
      await this.refresh(container);
    };
    tabTasks.onclick = () => { Develop.currentTab = "tasks"; refreshWrap(); };
    tabProjects.onclick = () => { Develop.currentTab = "projects"; refreshWrap(); };
    addBtn.onclick = () => Develop.currentTab === "tasks" ? this.openTaskEditor() : this.openProjectEditor();
    await refreshWrap();
  },
  async refresh(box) {
    const listBox = box.querySelector("#devList");
    if (Develop.currentTab === "tasks") {
      const projects = await DB.getAll("devProjects");
      const pidMap = Object.fromEntries(projects.map(p=>[p.id,p.name]));
      const all = (await DB.getAll("devTasks")).sort((a,b)=>U.parseDate(b.updatedAt||b.createdAt)-U.parseDate(a.updatedAt||a.createdAt));
      if (!all.length) { listBox.innerHTML = `<div class="card empty-state"><div class="empty-icon">📝</div><div class="empty-text">暂无开发任务</div></div>`; return; }
      const statusMap = { todo:"待办", doing:"进行中", done:"已完成" };
      listBox.innerHTML = all.map(t => `
      <div class="item">
        <div class="item-header">
          <div class="item-title">
            <span class="badge badge-${t.priority||'mid'}">${U.fmtPriority(t.priority)}</span>
            ${U.escapeHtml(t.title)}
            ${t.projectId?`<span class="badge badge-mid">${U.escapeHtml(pidMap[t.projectId]||"未知项目")}</span>`:""}
            <span class="badge badge-${t.status}">${statusMap[t.status]}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-primary edit" data-id="${t.id}">编辑</button>
            <button class="btn btn-sm btn-danger del" data-id="${t.id}">删除</button>
          </div>
        </div>
        ${t.remark?`<div class="item-body">${U.escapeHtml(t.remark)}</div>`:""}
        <div class="item-meta">
          ${t.estimate?`<span>估算${t.estimate}h</span>`:""}
          ${t.spent?`<span>已用${t.spent}h</span>`:""}
          <span>进度 ${U.fmtProgress(t.progress||0)}</span>
        </div>
      </div>`).join("");
      listBox.querySelectorAll(".edit").forEach(btn => btn.onclick = async () => this.openTaskEditor(await DB.get("devTasks", btn.dataset.id)));
      listBox.querySelectorAll(".del").forEach(btn => btn.onclick = async () => {
        if(await Modal.confirm({title:"删除任务",content:"删除会移入回收站，确认？",danger:true})){
          await DB.softDelete("devTasks", btn.dataset.id); Bus.emit("dataChanged"); await this.refresh(box); Toast.success("已移入回收站");
        }});
    } else {
      const all = (await DB.getAll("devProjects")).sort((a,b)=>U.parseDate(b.updatedAt||b.createdAt)-U.parseDate(a.updatedAt||a.createdAt));
      if (!all.length) { listBox.innerHTML = `<div class="card empty-state"><div class="empty-icon">📂</div><div class="empty-text">暂无项目，点击新增项目</div></div>`; return; }
      const statusMap = { planning:"规划中", doing:"开发中", paused:"暂停", done:"已完成", archived:"已归档" };
      listBox.innerHTML = all.map(p => `
      <div class="item">
        <div class="item-header">
          <div class="item-title">
            📂 ${U.escapeHtml(p.name)}
            <span class="badge badge-${p.status==='done'?'low':p.status==='doing'?'high':'mid'}">${statusMap[p.status]||'规划中'}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-primary edit" data-id="${p.id}">编辑</button>
            <button class="btn btn-sm btn-danger del" data-id="${p.id}">删除</button>
          </div>
        </div>
        ${p.description?`<div class="item-body">${U.escapeHtml(p.description)}</div>`:""}
        <div class="item-meta">
          ${p.repo?`<span>🔗 ${U.escapeHtml(p.repo)}</span>`:""}
          ${p.tech?`<span>🛠 ${U.escapeHtml(p.tech)}</span>`:""}
          <span>更新：${U.fmtTime(p.updatedAt||p.createdAt)}</span>
        </div>
      </div>`).join("");
      listBox.querySelectorAll(".edit").forEach(btn => btn.onclick = async () => this.openProjectEditor(await DB.get("devProjects", btn.dataset.id)));
      listBox.querySelectorAll(".del").forEach(btn => btn.onclick = async () => {
        if(await Modal.confirm({title:"删除项目",content:"删除会移入回收站，确认？",danger:true})){
          await DB.softDelete("devProjects", btn.dataset.id); Bus.emit("dataChanged"); await this.refresh(box); Toast.success("已移入回收站");
        }});
    }
  },
  async openTaskEditor(data = null) {
    const d = data || { projectId:"", title:"", priority:"mid", status:"todo", estimate:"", spent:"", progress:0, remark:"" };
    const projects = await DB.getAll("devProjects");
    const body = U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"所属项目"}),U.el("select",{class:"select",children:[U.el("option",{value:"",text:"无"}),...projects.map(p=>U.el("option",{value:p.id,text:p.name}))],value:d.projectId})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"标题"}),U.el("input",{class:"input",value:d.title,placeholder:"必填"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"优先级"}),U.el("select",{class:"select",children:[U.el("option",{value:"high",text:"高"}),U.el("option",{value:"mid",text:"中"}),U.el("option",{value:"low",text:"低"})],value:d.priority})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"状态"}),U.el("select",{class:"select",children:[U.el("option",{value:"todo",text:"待办"}),U.el("option",{value:"doing",text:"进行中"}),U.el("option",{value:"done",text:"已完成"})],value:d.status})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"估算(h)"}),U.el("input",{type:"number",class:"input",value:d.estimate||"",placeholder:"例如 8"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"已用(h)"}),U.el("input",{type:"number",class:"input",value:d.spent||"",placeholder:"例如 3"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"进度(%)"}),U.el("input",{type:"number",class:"input",value:d.progress||0,min:0,max:100})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"备注"}),U.el("textarea",{class:"textarea",value:d.remark})]));
    const saveBtn = U.el("button",{class:"btn btn-primary",text:"保存"});
    const close = Modal.open({title:data?"编辑任务":"新增任务",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick = async () => {
      const inputs = body.querySelectorAll("input,textarea,select");
      const title = inputs[1].value.trim();
      if(!title){Toast.warn("标题不能为空");return;}
      try {
        const payload = {...(data||{}), projectId:inputs[0].value, title, priority:inputs[2].value, status:inputs[3].value, estimate:inputs[4].value, spent:inputs[5].value, progress:Number(inputs[6].value), remark:inputs[7].value, updatedAt:U.now()};
        if(data) await DB.put("devTasks",payload); else await DB.add("devTasks",payload);
        Bus.emit("dataChanged"); close(); Toast.success(data?"修改成功":"新增成功"); Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  },
  async openProjectEditor(data = null) {
    const d = data || { name:"", description:"", status:"planning", repo:"", tech:"", note:"" };
    const body = U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"项目名"}),U.el("input",{class:"input",value:d.name,placeholder:"必填"})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"描述"}),U.el("textarea",{class:"textarea",value:d.description})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"状态"}),U.el("select",{class:"select",children:[
      U.el("option",{value:"planning",text:"规划中"}),U.el("option",{value:"doing",text:"开发中"}),U.el("option",{value:"paused",text:"暂停"}),U.el("option",{value:"done",text:"已完成"}),U.el("option",{value:"archived",text:"已归档"})
    ],value:d.status})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"仓库URL"}),U.el("input",{class:"input",value:d.repo,placeholder:"https://github.com/..."})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"技术栈"}),U.el("input",{class:"input",value:d.tech,placeholder:"Node.js, React ..."})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"备注"}),U.el("textarea",{class:"textarea",value:d.note})]));
    const saveBtn = U.el("button",{class:"btn btn-primary",text:"保存"});
    const close = Modal.open({title:data?"编辑项目":"新增项目",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick = async () => {
      const inputs = body.querySelectorAll("input,textarea,select");
      const name = inputs[0].value.trim();
      if(!name){Toast.warn("项目名不能为空");return;}
      try {
        const payload = {...(data||{}), name, description:inputs[1].value, status:inputs[2].value, repo:inputs[3].value, tech:inputs[4].value, note:inputs[5].value, updatedAt:U.now()};
        if(data) await DB.put("devProjects",payload); else await DB.add("devProjects",payload);
        Bus.emit("dataChanged"); close(); Toast.success(data?"修改成功":"新增成功"); Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  }
};

/* ========== Consult 咨询工作 ========== */
const Consult = {
  currentTab: "orders",
  async render(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">💼 咨询工作</div>
        <div class="page-subtitle">咨询工单与跟进记录</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" id="tabOrders">📋 工单</button>
        <button class="btn btn-ghost" id="tabFollows">📝 跟进</button>
        <button class="btn btn-primary" id="addConsultBtn">＋新增</button>
      </div>
    </div>
    <div id="consultList"></div>`;
    const tabOrders = container.querySelector("#tabOrders");
    const tabFollows = container.querySelector("#tabFollows");
    const addBtn = container.querySelector("#addConsultBtn");
    const refreshWrap = async () => {
      tabOrders.disabled = Consult.currentTab==="orders"; tabOrders.style.opacity = Consult.currentTab==="orders"?0.5:1;
      tabFollows.disabled = Consult.currentTab==="follows"; tabFollows.style.opacity = Consult.currentTab==="follows"?0.5:1;
      await this.refresh(container);
    };
    tabOrders.onclick = () => { Consult.currentTab="orders"; refreshWrap(); };
    tabFollows.onclick = () => { Consult.currentTab="follows"; refreshWrap(); };
    addBtn.onclick = () => Consult.currentTab==="orders" ? this.openOrderEditor() : this.openFollowEditor();
    await refreshWrap();
  },
  async refresh(box) {
    const listBox = box.querySelector("#consultList");
    if (Consult.currentTab === "orders") {
      const all = (await DB.getAll("consultOrders")).sort((a,b)=>U.parseDate(b.updatedAt||b.createdAt)-U.parseDate(a.updatedAt||a.createdAt));
      if(!all.length){listBox.innerHTML=`<div class="card empty-state"><div class="empty-icon">💼</div><div class="empty-text">暂无咨询工单</div></div>`;return;}
      const statusMap={pending:"待处理",doing:"跟进中",done:"已完成",closed:"已关闭"};
      listBox.innerHTML = all.map(o=>`
      <div class="item">
        <div class="item-header">
          <div class="item-title">
            <span class="badge badge-${o.priority||'mid'}">${U.fmtPriority(o.priority)}</span>
            ${U.escapeHtml(o.customer||'')} - ${U.escapeHtml(o.title)}
            <span class="badge badge-${o.status==='done'?'low':o.status==='doing'?'high':'mid'}">${statusMap[o.status]||'待处理'}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-primary edit" data-id="${o.id}">编辑</button>
            <button class="btn btn-sm btn-danger del" data-id="${o.id}">删除</button>
          </div>
        </div>
        ${o.desc?`<div class="item-body">${U.escapeHtml(o.desc)}</div>`:""}
        <div class="item-meta">
          ${o.deadline?`<span class="${U.overdue(o.deadline)?"overdue":U.soon(o.deadline)?"soon":""}">⏰ ${U.fmtTime(o.deadline)}</span>`:""}
          <span>更新：${U.fmtTime(o.updatedAt||o.createdAt)}</span>
        </div>
      </div>`).join("");
      listBox.querySelectorAll(".edit").forEach(b=>b.onclick=async()=>this.openOrderEditor(await DB.get("consultOrders",b.dataset.id)));
      listBox.querySelectorAll(".del").forEach(b=>b.onclick=async()=>{
        if(await Modal.confirm({title:"删除工单",content:"删除会移入回收站，确认？",danger:true})){
          await DB.softDelete("consultOrders",b.dataset.id);Bus.emit("dataChanged");await this.refresh(box);Toast.success("已移入回收站");
        }});
    } else {
      const orders = await DB.getAll("consultOrders");
      const oidMap = Object.fromEntries(orders.map(o=>[o.id,`${o.customer||''}-${o.title}`]));
      const all = (await DB.getAll("consultFollows")).sort((a,b)=>U.parseDate(b.time)-U.parseDate(a.time));
      if(!all.length){listBox.innerHTML=`<div class="card empty-state"><div class="empty-icon">📝</div><div class="empty-text">暂无跟进记录</div></div>`;return;}
      listBox.innerHTML = all.map(f=>`
      <div class="item">
        <div class="item-header">
          <div class="item-title">
            <span class="badge badge-mid">${U.escapeHtml(oidMap[f.orderId]||"未知工单")}</span>
            ${U.fmtTime(f.time)}
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-danger del" data-id="${f.id}">删除</button>
          </div>
        </div>
        <div class="item-body">${U.escapeHtml(f.content)}</div>
      </div>`).join("");
      listBox.querySelectorAll(".del").forEach(b=>b.onclick=async()=>{
        if(await Modal.confirm({title:"删除跟进",content:"确认删除这条跟进记录？",danger:true})){
          await DB.softDelete("consultFollows",b.dataset.id);Bus.emit("dataChanged");await this.refresh(box);Toast.success("已移入回收站");
        }});
    }
  },
  async openOrderEditor(data = null) {
    const d = data || { customer:"", title:"", priority:"mid", status:"pending", deadline:"", desc:"", fee:"", contact:"" };
    const body = U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"客户"}),U.el("input",{class:"input",value:d.customer,placeholder:"客户名称"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"标题"}),U.el("input",{class:"input",value:d.title,placeholder:"咨询事项标题"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"优先级"}),U.el("select",{class:"select",children:[U.el("option",{value:"high",text:"高"}),U.el("option",{value:"mid",text:"中"}),U.el("option",{value:"low",text:"低"})],value:d.priority})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"状态"}),U.el("select",{class:"select",children:[U.el("option",{value:"pending",text:"待处理"}),U.el("option",{value:"doing",text:"跟进中"}),U.el("option",{value:"done",text:"已完成"}),U.el("option",{value:"closed",text:"已关闭"})],value:d.status})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"截止时间"}),U.el("input",{type:"datetime-local",class:"input",value:d.deadline?d.deadline.slice(0,16):""})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"联系信息"}),U.el("input",{class:"input",value:d.contact})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"费用"}),U.el("input",{class:"input",value:d.fee,placeholder:"例如 500元"})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"描述"}),U.el("textarea",{class:"textarea",value:d.desc})]));
    const saveBtn=U.el("button",{class:"btn btn-primary",text:"保存"});
    const close=Modal.open({title:data?"编辑工单":"新增工单",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick=async()=>{
      const inputs=body.querySelectorAll("input,textarea,select");
      const title=inputs[1].value.trim();
      if(!title){Toast.warn("标题不能为空");return;}
      try {
        const payload={...(data||{}),customer:inputs[0].value,title,priority:inputs[2].value,status:inputs[3].value,deadline:U.toISO(inputs[4].value),contact:inputs[5].value,fee:inputs[6].value,desc:inputs[7].value,updatedAt:U.now()};
        if(data) await DB.put("consultOrders",payload); else await DB.add("consultOrders",payload);
        Bus.emit("dataChanged");close();Toast.success(data?"修改成功":"新增成功");Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  },
  async openFollowEditor() {
    const orders = await DB.getAll("consultOrders");
    if(!orders.length){Toast.warn("请先创建工单");return;}
    const body = U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"工单"}),U.el("select",{class:"select",children:orders.map(o=>U.el("option",{value:o.id,text:`${o.customer||''}-${o.title}`}))})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"时间"}),U.el("input",{type:"datetime-local",class:"input",value:new Date().toISOString().slice(0,16)})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"跟进内容"}),U.el("textarea",{class:"textarea",placeholder:"跟进的详细情况"})]));
    const saveBtn=U.el("button",{class:"btn btn-primary",text:"保存"});
    const close=Modal.open({title:"新增跟进记录",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick=async()=>{
      const inputs=body.querySelectorAll("input,textarea,select");
      const content=inputs[2].value.trim();
      if(!content){Toast.warn("跟进内容不能为空");return;}
      try {
        await DB.add("consultFollows",{orderId:inputs[0].value,time:U.toISO(inputs[1].value)||U.now(),content});
        Bus.emit("dataChanged");close();Toast.success("跟进记录已添加");Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  }
};

/* ========== Fitness 健身计划 ========== */
const Fitness = {
  currentTab: "records",
  async render(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🏋️ 健身计划</div>
        <div class="page-subtitle">训练计划与每次记录</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" id="tabPlans">📋 计划</button>
        <button class="btn btn-ghost" id="tabRecords">📈 记录</button>
        <button class="btn btn-primary" id="addFitBtn">＋新增</button>
      </div>
    </div>
    <div id="fitnessList"></div>`;
    const tabPlans=container.querySelector("#tabPlans"), tabRecords=container.querySelector("#tabRecords"), addBtn=container.querySelector("#addFitBtn");
    const refreshWrap = async()=>{
      tabPlans.disabled=Fitness.currentTab==="plans";tabPlans.style.opacity=Fitness.currentTab==="plans"?0.5:1;
      tabRecords.disabled=Fitness.currentTab==="records";tabRecords.style.opacity=Fitness.currentTab==="records"?0.5:1;
      await this.refresh(container);
    };
    tabPlans.onclick=()=>{Fitness.currentTab="plans";refreshWrap();};
    tabRecords.onclick=()=>{Fitness.currentTab="records";refreshWrap();};
    addBtn.onclick=()=>Fitness.currentTab==="plans"?this.openPlanEditor():this.openRecordEditor();
    await refreshWrap();
  },
  async refresh(box) {
    const listBox = box.querySelector("#fitnessList");
    if(Fitness.currentTab==="plans"){
      const all=(await DB.getAll("fitnessPlans")).sort((a,b)=>U.parseDate(b.updatedAt||b.createdAt)-U.parseDate(a.updatedAt||a.createdAt));
      if(!all.length){listBox.innerHTML=`<div class="card empty-state"><div class="empty-icon">🏋️</div><div class="empty-text">暂无训练计划</div></div>`;return;}
      listBox.innerHTML=all.map(p=>`
      <div class="item">
        <div class="item-header">
          <div class="item-title">🏋️ ${U.escapeHtml(p.name)}</div>
          <div class="item-actions">
            <button class="btn btn-sm btn-primary edit" data-id="${p.id}">编辑</button>
            <button class="btn btn-sm btn-danger del" data-id="${p.id}">删除</button>
          </div>
        </div>
        ${p.exercises?`<div class="item-body">${U.escapeHtml(p.exercises)}</div>`:""}
        ${p.note?`<div class="item-body">📝 ${U.escapeHtml(p.note)}</div>`:""}
      </div>`).join("");
      listBox.querySelectorAll(".edit").forEach(b=>b.onclick=async()=>this.openPlanEditor(await DB.get("fitnessPlans",b.dataset.id)));
      listBox.querySelectorAll(".del").forEach(b=>b.onclick=async()=>{
        if(await Modal.confirm({title:"删除计划",content:"删除会移入回收站，确认？",danger:true})){
          await DB.softDelete("fitnessPlans",b.dataset.id);Bus.emit("dataChanged");await this.refresh(box);Toast.success("已移入回收站");
        }});
    } else {
      const plans=await DB.getAll("fitnessPlans");
      const pidMap=Object.fromEntries(plans.map(p=>[p.id,p.name]));
      const all=(await DB.getAll("fitnessRecords")).sort((a,b)=>U.parseDate(b.date)-U.parseDate(a.date));
      if(!all.length){listBox.innerHTML=`<div class="card empty-state"><div class="empty-icon">📈</div><div class="empty-text">暂无训练记录</div></div>`;return;}
      listBox.innerHTML=all.map(r=>`
      <div class="item">
        <div class="item-header">
          <div class="item-title">
            📅 ${U.fmtDate(r.date)}
            ${r.planId?`<span class="badge badge-mid">${U.escapeHtml(pidMap[r.planId]||"自由训练")}</span>`:""}
            ${r.duration?`<span>⏱ ${r.duration}分钟</span>`:""}
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-primary edit" data-id="${r.id}">编辑</button>
            <button class="btn btn-sm btn-danger del" data-id="${r.id}">删除</button>
          </div>
        </div>
        ${r.details?`<div class="item-body">${U.escapeHtml(r.details)}</div>`:""}
        ${r.note?`<div class="item-body">📝 ${U.escapeHtml(r.note)}</div>`:""}
      </div>`).join("");
      listBox.querySelectorAll(".edit").forEach(b=>b.onclick=async()=>this.openRecordEditor(await DB.get("fitnessRecords",b.dataset.id)));
      listBox.querySelectorAll(".del").forEach(b=>b.onclick=async()=>{
        if(await Modal.confirm({title:"删除记录",content:"删除会移入回收站，确认？",danger:true})){
          await DB.softDelete("fitnessRecords",b.dataset.id);Bus.emit("dataChanged");await this.refresh(box);Toast.success("已移入回收站");
        }});
    }
  },
  async openPlanEditor(data=null){
    const d=data||{name:"",exercises:"",note:""};
    const body=U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"计划名"}),U.el("input",{class:"input",value:d.name,placeholder:"例如：上肢训练A"})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"动作列表"}),U.el("textarea",{class:"textarea",value:d.exercises,placeholder:"卧推 5×8；引体 4×12；肩推 4×10 ..."})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"备注"}),U.el("textarea",{class:"textarea",value:d.note})]));
    const saveBtn=U.el("button",{class:"btn btn-primary",text:"保存"});
    const close=Modal.open({title:data?"编辑计划":"新增训练计划",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick=async()=>{
      const inputs=body.querySelectorAll("input,textarea");
      const name=inputs[0].value.trim();
      if(!name){Toast.warn("计划名不能为空");return;}
      try {
        const payload={...(data||{}),name,exercises:inputs[1].value,note:inputs[2].value,updatedAt:U.now()};
        if(data)await DB.put("fitnessPlans",payload);else await DB.add("fitnessPlans",payload);
        Bus.emit("dataChanged");close();Toast.success(data?"修改成功":"新增成功");Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  },
  async openRecordEditor(data=null){
    const d=data||{planId:"",date:U.todayStr(),duration:"",details:"",note:""};
    const plans=await DB.getAll("fitnessPlans");
    const body=U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"计划"}),U.el("select",{class:"select",children:[U.el("option",{value:"",text:"自由训练"}),...plans.map(p=>U.el("option",{value:p.id,text:p.name}))],value:d.planId})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"日期"}),U.el("input",{type:"date",class:"input",value:d.date})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"时长(分钟)"}),U.el("input",{type:"number",class:"input",value:d.duration||""})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"训练详情"}),U.el("textarea",{class:"textarea",value:d.details,placeholder:"卧推 60kg×8×5 组..."})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"感受"}),U.el("textarea",{class:"textarea",value:d.note})]));
    const saveBtn=U.el("button",{class:"btn btn-primary",text:"保存"});
    const close=Modal.open({title:data?"编辑训练记录":"新增训练记录",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick=async()=>{
      const inputs=body.querySelectorAll("input,textarea,select");
      try {
        const payload={...(data||{}),planId:inputs[0].value,date:inputs[1].value,duration:inputs[2].value,details:inputs[3].value,note:inputs[4].value};
        if(data)await DB.put("fitnessRecords",payload);else await DB.add("fitnessRecords",payload);
        Bus.emit("dataChanged");close();Toast.success(data?"修改成功":"新增成功");Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  }
};

/* ========== Diet 饮食计划 ========== */
const Diet = {
  async render(container) {
    const today = U.todayStr();
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🥗 饮食计划</div>
        <div class="page-subtitle">每日饮食记录与热量</div>
      </div>
      <div class="header-actions">
        <input type="date" id="dietDateFilter" value="${today}" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;">
        <button class="btn btn-primary" id="addDietBtn">＋新增记录</button>
      </div>
    </div>
    <div id="dietList"></div>`;
    const dateFilter = container.querySelector("#dietDateFilter");
    dateFilter.onchange = () => this.refresh(container);
    container.querySelector("#addDietBtn").onclick = () => this.openEditor(null, dateFilter.value);
    await this.refresh(container);
  },
  async refresh(box) {
    const dateFilter = box.querySelector("#dietDateFilter")?.value || U.todayStr();
    const listBox = box.querySelector("#dietList");
    const all = (await DB.getAll("dietRecords")).filter(r => (r.date || "").startsWith(dateFilter.slice(0,7)));
    const dayRecords = all.filter(r => r.date === dateFilter);
    if(!all.length){listBox.innerHTML=`<div class="card empty-state"><div class="empty-icon">🥗</div><div class="empty-text">暂无饮食记录，点击右上角新增</div></div>`;return;}
    const meals = {breakfast:"早餐",lunch:"午餐",dinner:"晚餐",snack:"加餐"};
    const grouped = {breakfast:[],lunch:[],dinner:[],snack:[]};
    dayRecords.forEach(r => { (grouped[r.meal]||grouped.snack).push(r); });
    const totalCalories = dayRecords.reduce((s,r)=>s+(Number(r.calories)||0),0);
    let html = `<div class="card" style="margin-bottom:12px;background:#eaf7ff;border:1px solid #a8d8ff">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>📅 ${dateFilter} 饮食概览</div>
        <div style="font-weight:bold">🔥 总热量：${totalCalories} kcal</div>
      </div></div>`;
    for (const key of ["breakfast","lunch","dinner","snack"]) {
      const items = grouped[key];
      if(!items.length) continue;
      html += `<div class="card"><div class="card-title">${meals[key]}</div>`;
      html += items.map(r => `
      <div class="item" style="border-bottom:1px solid #eee;padding:8px 0">
        <div class="item-header">
          <div class="item-title">🍱 ${U.escapeHtml(r.food)}${r.amount?` × ${U.escapeHtml(r.amount)}`:""}</div>
          <div class="item-actions">
            <button class="btn btn-sm btn-primary edit" data-id="${r.id}">编辑</button>
            <button class="btn btn-sm btn-danger del" data-id="${r.id}">删除</button>
          </div>
        </div>
        <div class="item-meta">
          ${r.calories?`<span>🔥 ${r.calories} kcal</span>`:""}
          ${r.note?`<span>${U.escapeHtml(r.note)}</span>`:""}
        </div>
      </div>`).join("");
      html += `</div>`;
    }
    if(!dayRecords.length){
      html += `<div class="card empty-state"><div class="empty-icon">🥗</div><div class="empty-text">该日暂无记录</div></div>`;
    }
    listBox.innerHTML = html;
    listBox.querySelectorAll(".edit").forEach(b => b.onclick = async () => this.openEditor(await DB.get("dietRecords", b.dataset.id)));
    listBox.querySelectorAll(".del").forEach(b => b.onclick = async () => {
      if(await Modal.confirm({title:"删除记录",content:"删除会移入回收站，确认？",danger:true})){
        await DB.softDelete("dietRecords",b.dataset.id);Bus.emit("dataChanged");await this.refresh(box);Toast.success("已移入回收站");
      }});
  },
  async openEditor(data=null, defaultDate) {
    const d = data || { date: defaultDate || U.todayStr(), meal:"breakfast", food:"", amount:"", calories:"", note:"" };
    const body = U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"日期"}),U.el("input",{type:"date",class:"input",value:d.date})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"餐次"}),U.el("select",{class:"select",children:[
      U.el("option",{value:"breakfast",text:"早餐"}),U.el("option",{value:"lunch",text:"午餐"}),U.el("option",{value:"dinner",text:"晚餐"}),U.el("option",{value:"snack",text:"加餐"})
    ],value:d.meal})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"食物"}),U.el("input",{class:"input",value:d.food,placeholder:"必填，如 米饭"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"份量"}),U.el("input",{class:"input",value:d.amount,placeholder:"如 200g"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"热量(kcal)"}),U.el("input",{type:"number",class:"input",value:d.calories||""})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"备注"}),U.el("textarea",{class:"textarea",value:d.note})]));
    const saveBtn=U.el("button",{class:"btn btn-primary",text:"保存"});
    const close=Modal.open({title:data?"编辑饮食记录":"新增饮食记录",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick=async()=>{
      const inputs=body.querySelectorAll("input,select,textarea");
      const food=inputs[2].value.trim();
      if(!food){Toast.warn("食物名称不能为空");return;}
      try {
        const payload={...(data||{}),date:inputs[0].value,meal:inputs[1].value,food,amount:inputs[3].value,calories:inputs[4].value,note:inputs[5].value};
        if(data)await DB.put("dietRecords",payload);else await DB.add("dietRecords",payload);
        Bus.emit("dataChanged");close();Toast.success(data?"修改成功":"新增成功");Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  }
};

/* ========== Game 游戏娱乐 ========== */
const Game = {
  async render(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🎮 游戏娱乐</div>
        <div class="page-subtitle">记录游戏时长与进度</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="addGameBtn">＋新增记录</button>
      </div>
    </div>
    <div id="gameList"></div>`;
    container.querySelector("#addGameBtn").onclick = () => this.openEditor();
    await this.refresh(container);
  },
  async refresh(box) {
    const listBox = box.querySelector("#gameList");
    const all = (await DB.getAll("games")).sort((a,b)=>U.parseDate(b.startTime)-U.parseDate(a.startTime));
    if(!all.length){listBox.innerHTML=`<div class="card empty-state"><div class="empty-icon">🎮</div><div class="empty-text">暂无游戏记录，点击右上角新增</div></div>`;return;}
    const totalMs = all.reduce((s,g)=>s+((g.endTime&&g.startTime)?(new Date(g.endTime)-new Date(g.startTime)):0),0);
    listBox.innerHTML = `<div class="card" style="margin-bottom:12px;background:#fff0f5;border:1px solid #ffbcd9">
      <div>🎮 累计游戏时长：${U.fmtMs(totalMs)} · 共 ${all.length} 条记录</div></div>`;
    listBox.innerHTML += all.map(g => `
    <div class="item">
      <div class="item-header">
        <div class="item-title">
          🎮 ${U.escapeHtml(g.name)}
          ${g.platform?`<span class="badge badge-mid">${U.escapeHtml(g.platform)}</span>`:""}
          ${g.progress?`<span>📈 ${g.progress}%</span>`:""}
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-primary edit" data-id="${g.id}">编辑</button>
          <button class="btn btn-sm btn-danger del" data-id="${g.id}">删除</button>
        </div>
      </div>
      <div class="item-meta">
        <span>🎯 ${U.fmtTime(g.startTime)}${g.endTime?` → ${new Date(g.endTime).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:""}</span>
        ${(g.endTime&&g.startTime)?`<span>⏱ ${U.fmtMs(new Date(g.endTime)-new Date(g.startTime))}</span>`:""}
        ${g.rating?`<span>⭐ ${g.rating}/10</span>`:""}
      </div>
      ${g.note?`<div class="item-body">${U.escapeHtml(g.note)}</div>`:""}
    </div>`).join("");
    listBox.querySelectorAll(".edit").forEach(b=>b.onclick=async()=>this.openEditor(await DB.get("games",b.dataset.id)));
    listBox.querySelectorAll(".del").forEach(b=>b.onclick=async()=>{
      if(await Modal.confirm({title:"删除记录",content:"删除会移入回收站，确认？",danger:true})){
        await DB.softDelete("games",b.dataset.id);Bus.emit("dataChanged");await this.refresh(box);Toast.success("已移入回收站");
      }});
  },
  async openEditor(data=null) {
    const d=data||{name:"",platform:"PC",startTime:U.now(),endTime:"",progress:"",rating:"",note:""};
    const body=U.el("div");
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"游戏名"}),U.el("input",{class:"input",value:d.name,placeholder:"必填"})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"平台"}),U.el("select",{class:"select",children:[
      U.el("option",{value:"PC",text:"PC"}),U.el("option",{value:"Switch",text:"Switch"}),U.el("option",{value:"PS",text:"PlayStation"}),U.el("option",{value:"Xbox",text:"Xbox"}),U.el("option",{value:"移动端",text:"移动端"}),U.el("option",{value:"其他",text:"其他"})
    ],value:d.platform})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"开始时间"}),U.el("input",{type:"datetime-local",class:"input",value:d.startTime?d.startTime.slice(0,16):""})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"结束时间"}),U.el("input",{type:"datetime-local",class:"input",value:d.endTime?d.endTime.slice(0,16):""})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"进度(%)"}),U.el("input",{type:"number",class:"input",value:d.progress||0,min:0,max:100})]));
    body.appendChild(U.el("div",{class:"field-row"},[U.el("label",{text:"评分(1-10)"}),U.el("input",{type:"number",class:"input",value:d.rating||"",min:1,max:10})]));
    body.appendChild(U.el("div",{class:"field-row",style:"align-items:flex-start"},[U.el("label",{text:"备注"}),U.el("textarea",{class:"textarea",value:d.note})]));
    const saveBtn=U.el("button",{class:"btn btn-primary",text:"保存"});
    const close=Modal.open({title:data?"编辑游戏记录":"新增游戏记录",body,footer:[U.el("button",{class:"btn btn-ghost",text:"取消",onclick:()=>close()}),saveBtn]});
    saveBtn.onclick=async()=>{
      const inputs=body.querySelectorAll("input,textarea,select");
      const name=inputs[0].value.trim();
      if(!name){Toast.warn("游戏名不能为空");return;}
      try {
        const payload={...(data||{}),name,platform:inputs[1].value,startTime:U.toISO(inputs[2].value)||U.now(),endTime:U.toISO(inputs[3].value),progress:inputs[4].value,rating:inputs[5].value,note:inputs[6].value};
        if(data)await DB.put("games",payload);else await DB.add("games",payload);
        Bus.emit("dataChanged");close();Toast.success(data?"修改成功":"新增成功");Router.navigate();
      } catch(e) { console.error("保存失败:", e); Toast.error("保存失败：" + (e.message || e)); }
    };
  }
};

/* 设置页面 */
/* ========== AI 对话模块 ========== */
// 5 个 AI 提供商配置（DeepSeek 为默认）
const AI_PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    models: [
      { value: 'deepseek-chat', label: 'deepseek-chat（主力模型）' },
      { value: 'deepseek-reasoner', label: 'deepseek-reasoner（推理模型）' }
    ]
  },
  doubao: {
    label: '豆包 (Volcengine)',
    defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    defaultModel: 'doubao-seed-evolving',
    models: [
      { value: 'doubao-seed-evolving', label: 'doubao-seed-evolving（Coding 专项）' },
      { value: 'doubao-seed-1-6-250615', label: 'doubao-seed-1-6（需开通）' },
      { value: 'doubao-seed-1-6-flash-250828', label: 'doubao-seed-1-6-flash（需开通）' },
      { value: 'doubao-seed-2-0-mini-260428', label: 'doubao-seed-2-0-mini（需开通）' },
      { value: 'doubao-seed-2-1-pro-260628', label: 'doubao-seed-2-1-pro（需开通）' },
      { value: 'deepseek-v3-1-terminus', label: 'deepseek-v3-terminus（需开通）' }
    ]
  },
  qwen: {
    label: '通义千问 (DashScope)',
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus',
    models: [
      { value: 'qwen-plus', label: 'qwen-plus' },
      { value: 'qwen-turbo', label: 'qwen-turbo' },
      { value: 'qwen-max', label: 'qwen-max' },
      { value: 'qwen-long', label: 'qwen-long' }
    ]
  },
  wenxin: {
    label: '文心一言 (千帆)',
    defaultUrl: 'https://qianfan.baidubce.com/v2/chat/completions',
    defaultModel: 'ernie-speed-8k',
    models: [
      { value: 'ernie-speed-8k', label: 'ernie-speed-8k' },
      { value: 'ernie-speed-128k', label: 'ernie-speed-128k' },
      { value: 'ernie-3.5-8k', label: 'ernie-3.5-8k' },
      { value: 'ernie-4.0-8k', label: 'ernie-4.0-8k' }
    ]
  },
  custom: {
    label: '自定义代理 (OpenAI 兼容)',
    defaultUrl: '',
    defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4o', label: 'gpt-4o' }
    ]
  }
};

// AI 核心调用对象
const AI = {
  // 调用 AI 接口，返回回复文本
  async chat(messages, opts = {}) {
    const aiCfg = Config.getAi();
    if (!aiCfg.apiKey) throw new Error('未配置 API Key，请在「数据与设置」中填写');

    const provider = AI_PROVIDERS[aiCfg.provider] || AI_PROVIDERS.doubao;
    const url = aiCfg.apiUrl || provider.defaultUrl;
    // 模型白名单校验：不在列表中则回退到默认模型
    let model = aiCfg.model || provider.defaultModel;
    const validModels = provider.models.map(m => m.value);
    if (!validModels.includes(model)) model = provider.defaultModel;

    const body = {
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      stream: false
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + aiCfg.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error('API 错误 ' + resp.status + ': ' + (text || resp.statusText));
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('API 返回格式异常：' + JSON.stringify(data).slice(0, 200));
    return String(content);
  },

  // 组装发送给 AI 的消息数组（system + history + userText）
  buildMessages(systemPrompt, history, userText) {
    const msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    // 只保留 user / assistant 角色，过滤 error 等无效角色
    (history || []).forEach(m => {
      if (m.role === 'user' || m.role === 'assistant') {
        msgs.push({ role: m.role, content: m.content });
      }
    });
    msgs.push({ role: 'user', content: userText });
    return msgs;
  }
};

// ========== AI 对话存储函数（适配 Android 版 DB API） ==========
async function AI_newConv(title = '新对话') {
  const aiCfg = Config.getAi();
  const conv = await DB.add('aiConvs', {
    title,
    provider: aiCfg.provider,
    model: aiCfg.model,
    systemPrompt: aiCfg.systemPrompt || '',
    lastMsgAt: U.now()
  });
  return conv;
}
async function AI_listConvs() {
  const items = await DB.getAll('aiConvs');
  return items.sort((a, b) => (b.lastMsgAt || 0).localeCompare(a.lastMsgAt || 0));
}
async function AI_getMsgs(convId) {
  const all = await DB.getAll('aiMsgs');
  return all.filter(m => m.convId === convId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}
async function AI_addMsg(convId, role, content) {
  const msg = await DB.add('aiMsgs', { convId, role, content });
  const conv = await DB.get('aiConvs', convId);
  if (conv) {
    conv.lastMsgAt = U.now();
    if (role === 'user' && (!conv.title || conv.title === '新对话')) conv.title = content.slice(0, 30);
    await DB.put('aiConvs', conv);
  }
  return msg;
}
async function AI_deleteConv(convId) {
  await DB.delete('aiConvs', convId);
  const all = await DB.getAll('aiMsgs');
  for (const m of all.filter(x => x.convId === convId)) await DB.delete('aiMsgs', m.id);
}

// ========== AI 消息渲染函数 ==========
function renderChatMsg(msg) {
  const cls = msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'error';
  return U.el('div', { class: 'chat-msg ' + cls }, [
    U.el('div', { class: 'chat-avatar', text: msg.role === 'user' ? '我' : 'AI' }),
    U.el('div', { class: 'chat-content' }, [
      U.el('div', { class: 'chat-bubble', text: msg.content }),
      msg.role === 'assistant' ? U.el('div', { class: 'chat-actions' }, [
        U.el('button', { class: 'chat-action-btn', text: '📋 复制', onclick: () => {
          navigator.clipboard?.writeText(msg.content).catch(() => {});
          Toast.success('已复制');
        } }),
        U.el('button', { class: 'chat-action-btn', text: '🗑 删除', onclick: async () => {
          await DB.delete('aiMsgs', msg.id);
          Toast.success('已删除');
          if (App.currentRoute === 'ai') AiPage.render(document.getElementById('view-container'));
        } })
      ]) : null
    ])
  ]);
}
function renderTyping() {
  return U.el('div', { class: 'chat-msg assistant', id: 'typing-indicator' }, [
    U.el('div', { class: 'chat-avatar', text: 'AI' }),
    U.el('div', { class: 'chat-bubble typing' }, [U.el('span'), U.el('span'), U.el('span')])
  ]);
}

// ========== AI 对话页面模块（注册到 App.modules） ==========
const AiPage = {
  activeConvId: null,
  async render(container) {
    this.activeConvId = null;
    const aiCfg = Config.getAi();

    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">🤖 AI 对话</div>
        <div class="page-subtitle">${AI_PROVIDERS[aiCfg.provider]?.label || ''} · ${aiCfg.model || AI_PROVIDERS[aiCfg.provider]?.defaultModel || ''}</div>
      </div>
      <div class="ai-layout">
        <div class="ai-conv-list">
          <div class="ai-conv-header">
            <span>对话列表</span>
            <button class="btn btn-primary btn-sm" id="aiNewConv">＋ 新对话</button>
          </div>
          <div class="ai-conv-items" id="aiConvItems"></div>
        </div>
        <div class="ai-page" id="aiPageBody"></div>
      </div>
    `;

    container.querySelector('#aiNewConv').onclick = async () => {
      const conv = await AI_newConv();
      await this.navigateToConv(conv.id);
    };

    await this.renderConvList();
    this.renderEmpty();

    // 自动进入最近的对话
    const convs = await AI_listConvs();
    if (convs.length > 0) await this.navigateToConv(convs[0].id);
  },

  async renderConvList() {
    const wrap = document.getElementById('aiConvItems');
    if (!wrap) return;
    wrap.innerHTML = '';
    const convs = await AI_listConvs();
    if (convs.length === 0) {
      wrap.innerHTML = '<div class="ai-empty-hint">还没有对话</div>';
      return;
    }
    for (const c of convs) {
      const item = U.el('div', { class: 'ai-conv-item' + (c.id === this.activeConvId ? ' active' : '') }, [
        U.el('div', { class: 'ai-conv-title', text: c.title || '新对话' }),
        U.el('div', { class: 'ai-conv-time', text: U.fmtTime(c.lastMsgAt || c.createdAt) }),
        U.el('button', { class: 'ai-conv-del', title: '删除对话', text: '🗑️', onclick: async (e) => {
          e.stopPropagation();
          const ok = await Modal.confirm({
            title: '删除对话',
            content: '连同全部消息一起删除？',
            confirmText: '删除',
            cancelText: '取消',
            danger: true
          });
          if (ok) {
            await AI_deleteConv(c.id);
            if (this.activeConvId === c.id) this.activeConvId = null;
            await this.renderConvList();
            this.renderEmpty();
            Toast.success('已删除');
          }
        } })
      ]);
      item.onclick = () => this.navigateToConv(c.id);
      wrap.appendChild(item);
    }
  },

  renderEmpty() {
    const body = document.getElementById('aiPageBody');
    if (!body) return;
    body.innerHTML = '';
    const aiCfg = Config.getAi();
    const needSetup = !aiCfg.apiKey;
    body.appendChild(U.el('div', { class: 'ai-empty' }, [
      U.el('div', { class: 'ai-empty-icon', text: '🤖' }),
      U.el('div', { class: 'ai-empty-text', text: needSetup ? '请先到「数据与设置」配置 AI API' : '点击左侧「新对话」开始聊天' }),
      U.el('div', { class: 'ai-empty-hint', text: '支持 DeepSeek / 豆包 / 通义 / 文心 / 自定义' })
    ]));
  },

  async navigateToConv(convId) {
    this.activeConvId = convId;
    await this.renderConvList();
    await this.renderConv();
  },

  async renderConv() {
    const body = document.getElementById('aiPageBody');
    if (!body) return;
    body.innerHTML = '';
    if (!this.activeConvId) { this.renderEmpty(); return; }
    const conv = await DB.get('aiConvs', this.activeConvId);
    if (!conv) { this.renderEmpty(); return; }
    const aiCfg = Config.getAi();
    const provider = AI_PROVIDERS[conv.provider] || AI_PROVIDERS[aiCfg.provider] || AI_PROVIDERS.doubao;

    // 头部
    const header = U.el('div', { class: 'ai-page-header' }, [
      U.el('div', { class: 'ai-page-title' }, [
        U.el('span', { text: '🤖 ' + (conv.title || '新对话') }),
        U.el('span', { class: 'ai-provider-tag', text: provider.label.split(' ')[0] + ' · ' + (conv.model || '') })
      ]),
      U.el('div', { class: 'ai-actions' }, [
        U.el('button', { class: 'btn btn-ghost btn-sm', text: '🗑 清空对话', onclick: async () => {
          const ok = await Modal.confirm({
            title: '清空对话',
            content: '保留对话，只清空消息？',
            confirmText: '清空',
            cancelText: '取消'
          });
          if (ok) {
            const msgs = await AI_getMsgs(this.activeConvId);
            for (const m of msgs) await DB.delete('aiMsgs', m.id);
            Toast.success('已清空');
            await this.renderConv();
          }
        } })
      ])
    ]);

    // 消息列表
    const msgList = U.el('div', { class: 'ai-page-msgs', id: 'aiMsgList' });
    const msgs = await AI_getMsgs(this.activeConvId);
    if (msgs.length === 0) {
      msgList.appendChild(U.el('div', { class: 'ai-welcome' }, [
        U.el('h3', { text: '👋 你好，我是你的 AI 助手' }),
        U.el('p', { text: '有什么想聊的？我可以帮你整理思路、写文案、解答技术问题…' })
      ]));
    } else {
      msgs.forEach(m => msgList.appendChild(renderChatMsg(m)));
    }

    // 输入区
    const ta = U.el('textarea', { class: 'ai-input', placeholder: '输入消息，Enter 发送，Shift+Enter 换行...', rows: 2 });
    const sendBtn = U.el('button', { class: 'btn btn-primary', text: '发送' });
    const inputWrap = U.el('div', { class: 'ai-page-input' }, [ta, sendBtn]);

    const send = async () => {
      const text = ta.value.trim();
      if (!text) return;
      if (!aiCfg.apiKey) { Toast.error('请先到设置里填写 API Key'); return; }

      ta.value = '';
      ta.style.height = 'auto';
      await AI_addMsg(this.activeConvId, 'user', text);
      msgList.appendChild(renderChatMsg({ role: 'user', content: text }));
      msgList.scrollTop = msgList.scrollHeight;

      const typingEl = renderTyping();
      msgList.appendChild(typingEl);
      msgList.scrollTop = msgList.scrollHeight;

      // 取历史消息（仅 user / assistant，最近 20 条）
      const allMsgs = await AI_getMsgs(this.activeConvId);
      const history = allMsgs.filter(m => m.role === 'user' || m.role === 'assistant').slice(-20);

      try {
        const messages = AI.buildMessages(conv.systemPrompt || aiCfg.systemPrompt, history, text);
        const reply = await AI.chat(messages);
        await AI_addMsg(this.activeConvId, 'assistant', reply);
        typingEl.remove();
        msgList.appendChild(renderChatMsg({ role: 'assistant', content: reply }));
      } catch (err) {
        typingEl.remove();
        msgList.appendChild(renderChatMsg({ role: 'error', content: '⚠️ ' + err.message }));
      }
      msgList.scrollTop = msgList.scrollHeight;
      await this.renderConvList();
    };

    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    });
    sendBtn.addEventListener('click', send);

    body.appendChild(header);
    body.appendChild(msgList);
    body.appendChild(inputWrap);
    setTimeout(() => { msgList.scrollTop = msgList.scrollHeight; ta.focus(); }, 50);
  }
};

/* ========== AI 悬浮球快捷对话 ========== */
function setupFloatingAI() {
  const fab = document.getElementById('ai-fab');
  const panel = document.getElementById('ai-quick-panel');
  if (!fab || !panel) return;  // DOM 不存在则跳过（手机端可选）

  const closeBtn = document.getElementById('ai-quick-close');
  const body = document.getElementById('ai-quick-body');
  const input = document.getElementById('ai-quick-input');
  const sendBtn = document.getElementById('ai-quick-send');

  let quickHistory = [];
  let loading = false;
  let isDragging = false;

  // ===== 拖拽位置持久化 =====
  function restoreFabPosition() {
    try {
      const pos = JSON.parse(localStorage.getItem('ai_fab_pos') || 'null');
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
        fab.style.left = pos.x + 'px';
        fab.style.top = pos.y + 'px';
      }
    } catch {}
  }
  restoreFabPosition();

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  // ===== 拖拽逻辑（Pointer Events 兼容触屏） =====
  fab.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDragging = false;
    fab.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const rect = fab.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) isDragging = true;
      if (!isDragging) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const size = rect.width;
      const x = clamp(ev.clientX - offsetX, 0, vw - size);
      const y = clamp(ev.clientY - offsetY, 0, vh - size);
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      fab.style.left = x + 'px';
      fab.style.top = y + 'px';
      ev.preventDefault();
    };
    const up = () => {
      fab.removeEventListener('pointermove', move);
      fab.removeEventListener('pointerup', up);
      fab.removeEventListener('pointercancel', up);
      if (isDragging) {
        const r = fab.getBoundingClientRect();
        localStorage.setItem('ai_fab_pos', JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
      }
    };
    fab.addEventListener('pointermove', move);
    fab.addEventListener('pointerup', up);
    fab.addEventListener('pointercancel', up);
  });

  // ===== 点击打开（拖拽后不触发） =====
  fab.addEventListener('click', () => {
    if (isDragging) { isDragging = false; return; }
    togglePanel();
  });

  function togglePanel() {
    const hidden = panel.style.display === 'none';
    panel.style.display = hidden ? 'flex' : 'none';
    if (hidden && body.children.length === 0) renderQuickWelcome();
    if (hidden) setTimeout(() => input?.focus(), 100);
  }
  function renderQuickWelcome() {
    body.appendChild(U.el('div', { class: 'ai-welcome' }, [
      U.el('h3', { text: '🤖 AI 快捷对话' }),
      U.el('p', { text: '问什么都行，Enter 发送' })
    ]));
  }
  function renderQuickMsg(msg) {
    body.appendChild(renderChatMsg(msg));
    body.scrollTop = body.scrollHeight;
  }

  closeBtn?.addEventListener('click', () => panel.style.display = 'none');
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuick(); }
  });
  sendBtn?.addEventListener('click', sendQuick);

  async function sendQuick() {
    if (loading) return;
    const text = input.value.trim();
    if (!text) return;
    const aiCfg = Config.getAi();
    if (!aiCfg.apiKey) { Toast.error('请先到 AI 设置里填 API Key'); return; }

    input.value = '';
    quickHistory.push({ role: 'user', content: text });
    renderQuickMsg({ role: 'user', content: text });

    const typingEl = renderTyping();
    body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
    loading = true;

    try {
      const messages = AI.buildMessages(aiCfg.systemPrompt, quickHistory.slice(-20).slice(0, -1), text);
      const reply = await AI.chat(messages);
      quickHistory.push({ role: 'assistant', content: reply });
      typingEl.remove();
      renderQuickMsg({ role: 'assistant', content: reply });
    } catch (err) {
      typingEl.remove();
      renderQuickMsg({ role: 'error', content: '⚠️ ' + err.message });
    }
    loading = false;
  }
}

/* ========== 个人中心页面 ========== */
const Profile = {
  async render(container) {
    container.innerHTML = `<div class="card">加载个人中心...</div>`;
    const profile = this.getProfile();
    const stats = await this.getStats();
    const html = `
    <div class="page-header">
      <div class="page-title">👤 个人中心</div>
      <div class="page-subtitle">查看与编辑个人资料</div>
    </div>
    <div class="profile-layout">
      <div class="profile-card card">
        <div class="profile-avatar" id="profile-avatar">${profile.avatar}</div>
        <div class="profile-name">${U.escapeHtml(profile.nickname)}</div>
        <div class="profile-bio">${U.escapeHtml(profile.bio || '这个人很懒，什么都没留下')}</div>
        <div class="profile-meta">
          <span>📅 加入于 ${profile.createdAt}</span>
          <span>🆔 ${profile.id}</span>
        </div>
        <button class="btn btn-primary btn-sm profile-edit-btn" id="profile-edit">✏️ 编辑资料</button>
      </div>
      <div class="profile-stats card">
        <div class="settings-section-title">📊 数据统计</div>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-num">${stats.totalTasks}</div>
            <div class="stat-lbl">📋 任务总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${stats.doneTasks}</div>
            <div class="stat-lbl">✅ 已完成</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${stats.urgentTasks}</div>
            <div class="stat-lbl">🔥 紧急任务</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${stats.streakDays}</div>
            <div class="stat-lbl">🔥 连续打卡</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${stats.aiConvs}</div>
            <div class="stat-lbl">🤖 AI 对话</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${stats.notes}</div>
            <div class="stat-lbl">📝 笔记数</div>
          </div>
        </div>
      </div>
      <div class="profile-actions card">
        <div class="settings-section-title">⚡ 快捷操作</div>
        <div class="profile-action-grid">
          <div class="profile-action-item" id="action-export">
            <div class="action-icon">📤</div>
            <div class="action-label">导出数据</div>
          </div>
          <div class="profile-action-item" id="action-import">
            <div class="action-icon">📥</div>
            <div class="action-label">导入数据</div>
          </div>
          <div class="profile-action-item" id="action-backup">
            <div class="action-icon">💾</div>
            <div class="action-label">备份数据</div>
          </div>
          <div class="profile-action-item" id="action-reset">
            <div class="action-icon">🗑️</div>
            <div class="action-label">重置应用</div>
          </div>
        </div>
      </div>
    </div>`;
    container.innerHTML = html;
    container.querySelector("#profile-edit").addEventListener("click", () => this.showEditDialog());
    container.querySelector("#action-export").addEventListener("click", () => this.exportData());
    container.querySelector("#action-import").addEventListener("click", () => this.importData());
    container.querySelector("#action-backup").addEventListener("click", () => this.backupData());
    container.querySelector("#action-reset").addEventListener("click", () => this.resetApp());
  },
  getProfile() {
    const raw = localStorage.getItem("personal_profile");
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    // 默认资料
    const profile = {
      id: "u_" + U.uid(),
      nickname: "用户" + new Date().getDate(),
      avatar: "👤",
      bio: "",
      createdAt: U.fmtDate(U.now())
    };
    localStorage.setItem("personal_profile", JSON.stringify(profile));
    return profile;
  },
  saveProfile(profile) {
    localStorage.setItem("personal_profile", JSON.stringify(profile));
  },
  async getStats() {
    try {
      const [todos, notes, aiConvs] = await Promise.all([
        DB.getAll("todayPlans").catch(() => []),
        DB.getAll("notes").catch(() => []),
        DB.getAll("aiConvs").catch(() => [])
      ]);
      const totalTasks = todos.length;
      const doneTasks = todos.filter(t => t.status === "done").length;
      const urgentTasks = todos.filter(t => t.priority === "high" && t.status !== "done").length;
      // 连续打卡天数
      let streakDays = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = U.todayStr(d);
        if (todos.some(t => t.createdAt && U.fmtDate(t.createdAt) === dateStr)) {
          streakDays++;
        } else if (i > 0) {
          break;
        }
      }
      return { totalTasks, doneTasks, urgentTasks, streakDays, aiConvs: aiConvs.length, notes: notes.length };
    } catch {
      return { totalTasks: 0, doneTasks: 0, urgentTasks: 0, streakDays: 0, aiConvs: 0, notes: 0 };
    }
  },
  showEditDialog() {
    const profile = this.getProfile();
    const avatars = ["👤","😀","😎","🤖","🐱","🐶","🦊","🐼","🦁","🐸","🦄","🐙","🦋","🌟","🔥","💎","🎯","🚀","🎨","🎭"];
    let chosenAvatar = profile.avatar;
    const avHtml = avatars.map(a => 
      `<div class="avatar-option ${a===profile.avatar?'selected':''}" data-avatar="${a}">${a}</div>`
    ).join("");
    const bodyEl = U.el('div', { style: 'display:flex;flex-direction:column;gap:12px;' });
    bodyEl.innerHTML = `
      <div class="form-field"><div class="form-label">昵称</div><input class="form-input" id="edit-nickname" value="${U.escapeHtml(profile.nickname)}" maxlength="20"></div>
      <div class="form-field"><div class="form-label">头像</div><div class="avatar-picker" id="avatar-picker">${avHtml}</div></div>
      <div class="form-field"><div class="form-label">个人简介</div><textarea class="form-input" id="edit-bio" maxlength="100" style="min-height:60px">${U.escapeHtml(profile.bio||'')}</textarea></div>
    `;
    const saveBtn = U.el('button', { class: 'btn btn-primary' }, '保存');
    const cancelBtn = U.el('button', { class: 'btn btn-ghost' }, '取消');
    const close = Modal.open({ title: '编辑个人资料', body: bodyEl, footer: [cancelBtn, saveBtn] });
    cancelBtn.onclick = () => close();
    // 头像选择交互
    bodyEl.querySelectorAll(".avatar-option").forEach(el => {
      el.addEventListener("click", () => {
        chosenAvatar = el.dataset.avatar;
        bodyEl.querySelectorAll(".avatar-option").forEach(x => x.classList.toggle("selected", x===el));
      });
    });
    saveBtn.onclick = () => {
      const nickname = bodyEl.querySelector("#edit-nickname").value.trim() || profile.nickname;
      const bio = bodyEl.querySelector("#edit-bio").value.trim();
      const updated = { ...profile, nickname, avatar: chosenAvatar, bio };
      this.saveProfile(updated);
      close();
      Toast.success("资料已更新");
      Router.navigate();
    };
  },
  exportData() {
    const data = {};
    for (const key of Object.keys(localStorage)) {
      data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `个人工作台_备份_${U.todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success("数据已导出");
  },
  importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (typeof data === "object") {
          for (const [k, v] of Object.entries(data)) {
            if (typeof v === "string") localStorage.setItem(k, v);
          }
          Toast.success("数据已导入，请重启应用");
        } else {
          Toast.error("文件格式无效");
        }
      } catch (err) {
        Toast.error("导入失败：" + err.message);
      }
    };
    input.click();
  },
  backupData() {
    this.exportData();
  },
  resetApp() {
    Modal.confirm({ title: '重置应用', content: '确定要重置应用吗？\n这将清除所有数据且不可恢复！', danger: true }).then(ok => {
      if (ok) {
        localStorage.clear();
        Toast.success("应用已重置");
        setTimeout(() => location.reload(), 500);
      }
    });
  }
};

/* ========== 设置页面 ========== */
const Setting = {
  async render(container) {
    container.innerHTML = `<div class="card">加载设置...</div>`;
    const cfg = Config.get();
    const recycle = await DB.getAll("recycleBin");
    let html = `
    <div class="page-header">
      <div class="page-title">⚙️ 数据与设置</div>
      <div class="page-subtitle">配置、备份、回收站、重置</div>
    </div>
    <div class="settings-section card">
      <div class="settings-section-title">全局配置</div>
      <div class="settings-row">
        <div>
          <div class="row-label">桌面通知</div>
          <div class="row-desc">到期计划浏览器弹窗提醒</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="notifySwitch" ${cfg.notifyEnabled?"checked":""}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div>
          <div class="row-label">新建默认优先级</div>
        </div>
        <select class="select" id="defPri">
          <option value="high" ${cfg.defaultPriority==="high"?"selected":""}>高</option>
          <option value="mid" ${cfg.defaultPriority==="mid"?"selected":""}>中</option>
          <option value="low" ${cfg.defaultPriority==="low"?"selected":""}>低</option>
        </select>
      </div>
      <button class="btn btn-primary" id="saveCfg">保存配置</button>
    </div>
    <div class="settings-section card">
      <div class="settings-section-title">外观</div>
      <div class="settings-row">
        <div>
          <div class="row-label">夜间模式</div>
          <div class="row-desc">降低眼睛疲劳，适合暗光环境</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="darkSwitch" ${cfg.theme==="dark"?"checked":""}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div>
          <div class="row-label">跟随系统</div>
          <div class="row-desc">根据系统偏好自动切换（重启后生效）</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="autoThemeSwitch" ${cfg.autoTheme?"checked":""}>
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="settings-section card">
      <div class="settings-section-title">🤖 AI 对话配置</div>
      <div class="settings-row" style="flex-direction:column;align-items:stretch;gap:10px">
        <div>
          <div class="row-label">AI 提供商</div>
          <select class="select" id="aiProvider">
            ${Object.entries(AI_PROVIDERS).map(([k, p]) => `<option value="${k}" ${cfg.ai.provider === k ? "selected" : ""}>${p.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="row-label">API Key ${cfg.ai.apiKey ? '✅ 已填 (' + cfg.ai.apiKey.slice(0, 6) + '...' + cfg.ai.apiKey.slice(-4) + ')' : '❌ 未填'}</div>
          <input type="password" class="input" id="aiApiKey" value="${U.escapeHtml(cfg.ai.apiKey || '')}" placeholder="sk-... 或 UUID 格式">
        </div>
        <div>
          <div class="row-label">模型</div>
          <select class="select" id="aiModel"></select>
        </div>
        <div>
          <div class="row-label">自定义 API 地址（留空则用默认）</div>
          <input type="text" class="input" id="aiApiUrl" value="${U.escapeHtml(cfg.ai.apiUrl || '')}" placeholder="https://...">
        </div>
        <div>
          <div class="row-label">系统提示词（System Prompt）</div>
          <textarea class="input" id="aiSystemPrompt" rows="3" placeholder="设定 AI 的角色和行为">${U.escapeHtml(cfg.ai.systemPrompt || '')}</textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" id="saveAi">保存 AI 配置</button>
          <button class="btn btn-ghost" id="testAi">测试连接</button>
        </div>
      </div>
    </div>
    <div class="settings-section card">
      <div class="settings-section-title">数据备份/导入</div>
      <div class="settings-row">
        <div class="row-label">导出全部JSON备份</div>
        <button class="btn btn-primary" id="exportJson">导出</button>
      </div>
      <div class="settings-row">
        <div class="row-label">从备份JSON恢复</div>
        <button class="btn btn-warning" id="importJson">导入</button>
      </div>
    </div>
    <div class="settings-section card">
      <div class="settings-section-title">回收站（共${recycle.length}条）</div>
      <div id="recycleList"></div>
      ${recycle.length>0?`<button class="btn btn-danger" id="clearRecycle" style="margin-top:10px">一键清空回收站</button>`:""}
    </div>
    <div class="settings-section card" style="border:1px solid #ffcccc">
      <div class="settings-section-title text-danger">危险操作</div>
      <div class="settings-row">
        <div>
          <div class="row-label">重置所有本地数据</div>
          <div class="row-desc">清空全部存储，不可恢复，建议先备份</div>
        </div>
        <button class="btn btn-danger" id="wipeAll">全部重置</button>
      </div>
    `;
    container.innerHTML = html;
    this.bindSetting(container);
    this.renderRecycle(container);
  },
  async bindSetting(box) {
    box.querySelector("#saveCfg").onclick = ()=>{
      const notify = box.querySelector("#notifySwitch").checked;
      const pri = box.querySelector("#defPri").value;
      const dark = box.querySelector("#darkSwitch").checked;
      const auto = box.querySelector("#autoThemeSwitch").checked;
      Config.update({notifyEnabled:notify,defaultPriority:pri,theme:dark?"dark":"light",autoTheme:auto});
      Theme.set(dark?"dark":"light");
      Toast.success("配置已保存");
    };
    box.querySelector("#darkSwitch").onchange = (e)=>{
      Theme.set(e.target.checked ? "dark" : "light");
    };

    // ===== AI 配置绑定 =====
    const aiProviderSel = box.querySelector("#aiProvider");
    const aiModelSel = box.querySelector("#aiModel");
    const aiCfg = Config.getAi();
    // 根据 provider 填充模型选项
    const refreshModels = () => {
      const providerKey = aiProviderSel.value;
      const provider = AI_PROVIDERS[providerKey] || AI_PROVIDERS.doubao;
      const currentModel = aiCfg.model || provider.defaultModel;
      aiModelSel.innerHTML = provider.models.map(m =>
        `<option value="${m.value}" ${m.value === currentModel ? "selected" : ""}>${m.label}</option>`
      ).join("");
    };
    refreshModels();
    // 切换提供商时刷新模型列表
    aiProviderSel.onchange = refreshModels;

    // 保存 AI 配置
    box.querySelector("#saveAi").onclick = () => {
      const providerKey = aiProviderSel.value;
      const provider = AI_PROVIDERS[providerKey] || AI_PROVIDERS.doubao;
      const model = aiModelSel.value || provider.defaultModel;
      Config.setAi({
        provider: providerKey,
        apiKey: box.querySelector("#aiApiKey").value.trim(),
        apiUrl: box.querySelector("#aiApiUrl").value.trim(),
        model,
        systemPrompt: box.querySelector("#aiSystemPrompt").value.trim()
      });
      Toast.success("AI 配置已保存");
      this.render(box);  // 刷新显示 Key 状态
    };

    // 测试连接
    box.querySelector("#testAi").onclick = async () => {
      const providerKey = aiProviderSel.value;
      const provider = AI_PROVIDERS[providerKey] || AI_PROVIDERS.doubao;
      const model = aiModelSel.value || provider.defaultModel;
      // 临时保存当前输入的配置（不写入正式配置，仅用于测试）
      const testCfg = {
        provider: providerKey,
        apiKey: box.querySelector("#aiApiKey").value.trim(),
        apiUrl: box.querySelector("#aiApiUrl").value.trim(),
        model,
        systemPrompt: box.querySelector("#aiSystemPrompt").value.trim()
      };
      if (!testCfg.apiKey) { Toast.error("请先填写 API Key"); return; }
      // 临时覆盖配置进行测试
      const originalAi = Config.getAi();
      Config.setAi(testCfg);
      try {
        const reply = await AI.chat([{ role: 'user', content: '你好，用一句话自我介绍' }]);
        Toast.success("✅ 连接成功：" + reply.slice(0, 40));
      } catch (err) {
        Toast.error("❌ " + err.message.slice(0, 80));
      } finally {
        // 恢复原始配置
        Config.setAi(originalAi);
      }
    };
    box.querySelector("#exportJson").onclick = async ()=>{
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      U.downloadBlob(blob,`个人数据备份_${U.todayStr()}.json`);
      Toast.success("导出完成");
    };
    box.querySelector("#importJson").onclick = async ()=>{
      const input = U.el("input",{type:"file",accept:".json"});
      input.onchange = async e=>{
        const text = await U.readFileAs(e.target.files[0]);
        const ok = await Modal.confirm({title:"导入警告",content:"导入会覆盖现有全部数据，确认？",danger:true});
        if(ok){
          await DB.importAll(JSON.parse(text));
          Bus.emit("dataChanged");
          location.reload();
        }
      };
      input.click();
    };
    const clearRecycleBtn = box.querySelector("#clearRecycle");
    if (clearRecycleBtn) clearRecycleBtn.onclick = async ()=>{
      const ok = await Modal.confirm({title:"清空回收站",content:"所有回收站条目永久删除，无法恢复",danger:true});
      if(ok){
        const all = await DB.getAll("recycleBin");
        for(let item of all) await DB.hardDelete(item.id);
        Bus.emit("dataChanged");
        this.render(box);
        Toast.success("回收站已清空");
      }
    };
    box.querySelector("#wipeAll").onclick = async ()=>{
      const c1 = await Modal.confirm({title:"警告",content:"即将删除所有数据，确定继续？",danger:true});
      if(!c1) return;
      const c2 = await Modal.confirm({title:"最终确认",content:"真的要清空全部本地数据吗？",confirmText:"确认重置",danger:true});
      if(c2){
        await DB.clearAll();
        localStorage.removeItem("personal_app_config");
        Toast.success("数据已重置，页面刷新");
        setTimeout(()=>location.reload(),1000);
      }
    };
  },
  async renderRecycle(box) {
    const listBox = box.querySelector("#recycleList");
    const recycle = await DB.getAll("recycleBin");
    if(!recycle.length){
      listBox.innerHTML = `<div class="empty-state"><div class="empty-text">回收站为空</div></div>`;
      return;
    }
    listBox.innerHTML = recycle.map(item=>`
    <div style="padding:10px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div>来源表：${item._sourceStore}</div>
        <div style="font-size:12px;color:#777;">删除时间：${U.fmtTime(item._deletedAt)}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-primary restore" data-id="${item.id}">还原</button>
        <button class="btn btn-sm btn-danger delPer" data-id="${item.id}">永久删除</button>
      </div>
    </div>
    `).join("");
    listBox.querySelectorAll(".restore").forEach(btn=>{
      btn.onclick = async ()=>{
        await DB.restoreFromRecycle(btn.dataset.id);
        Bus.emit("dataChanged");
        this.render(box);
        Toast.success("数据已还原");
      };
    });
    listBox.querySelectorAll(".delPer").forEach(btn=>{
      btn.onclick = async ()=>{
        const ok = await Modal.confirm({title:"永久删除",content:"该记录彻底清除，不可找回",danger:true});
        if(ok){
          await DB.hardDelete(btn.dataset.id);
          Bus.emit("dataChanged");
          this.render(box);
          Toast.success("已永久删除");
        }
      };
    });
  }
};

/* 页面路由注册表 */
const App = {
  currentRoute: "home",
  modules: {
    home: Home,
    todayPlan: TodayPlan,
    media: Media,
    develop: Develop,
    consult: Consult,
    fitness: Fitness,
    diet: Diet,
    game: Game,
    ai: AiPage,
    profile: Profile,
    setting: Setting
  },
  async init() {
    Theme.init();
    this.bindThemeToggle();
    Bus.on("themeChanged", () => this.updateThemeUI());
    try {
      await DB.getAll("memos");
    } catch (e) {
      console.log("数据库初始化",e);
    }
    // 启动时清洗无效的 AI 模型名（防止 localStorage 旧脏数据导致 API 404）
    try { Config.sanitizeAi(AI_PROVIDERS); } catch (e) { console.warn("sanitizeAi 失败:", e); }
    // 初始化 AI 悬浮球快捷对话
    try { setupFloatingAI(); } catch (e) { console.warn("悬浮球初始化失败:", e); }
    await Reminder.requestPermission();
    Reminder.reschedule();
    Router.init();
  },
  bindThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const t = Theme.toggle();
        Toast.info(`已切换为${t === "dark" ? "夜间" : "日间"}模式`);
      });
    }
    this.updateThemeUI();
  },
  updateThemeUI() {
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    const isDark = Theme.get() === "dark";
    if (icon) icon.textContent = isDark ? "🌞" : "🌙";
    if (label) label.textContent = isDark ? "日间模式" : "夜间模式";
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
