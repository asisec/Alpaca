const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  env: {
    SQLITE_PATH: process.env.SQLITE_PATH || null
  },
  checkDb: () => ipcRenderer.invoke("db:check"),
  auth: {
    me: () => ipcRenderer.invoke("auth:me"),
    register: (payload) => ipcRenderer.invoke("auth:register", payload),
    login: (payload) => ipcRenderer.invoke("auth:login", payload),
    logout: () => ipcRenderer.invoke("auth:logout")
  },
  admin: {
    pendingOrgs: () => ipcRenderer.invoke("admin:pending-orgs"),
    approveOrg: (userId) => ipcRenderer.invoke("admin:approve-org", userId),
    listUsers: () => ipcRenderer.invoke("admin:users-list"),
    deleteUser: (userId) => ipcRenderer.invoke("admin:delete-user", userId),
    updateUser: (payload) => ipcRenderer.invoke("admin:update-user", payload)
  },
  events: {
    create: (payload) => ipcRenderer.invoke("events:create", payload),
    update: (payload) => ipcRenderer.invoke("events:update", payload),
    delete: (eventId) => ipcRenderer.invoke("events:delete", eventId),
    list: () => ipcRenderer.invoke("events:list"),
    subscribe: (eventId) => ipcRenderer.invoke("events:subscribe", eventId),
    unsubscribe: (eventId) => ipcRenderer.invoke("events:unsubscribe", eventId),
    seats: (eventId) => ipcRenderer.invoke("events:seats", eventId)
  },
  orders: {
    create: (payload) => ipcRenderer.invoke("orders:create", payload),
    list: () => ipcRenderer.invoke("orders:list")
  },
  stats: {
    summary: () => ipcRenderer.invoke("stats:summary")
  }
});
