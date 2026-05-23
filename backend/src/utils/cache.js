const DASHBOARD_CACHE = new Map();

module.exports = {
  get: (key) => DASHBOARD_CACHE.get(key),
  set: (key, val) => DASHBOARD_CACHE.set(key, val),
  has: (key) => DASHBOARD_CACHE.has(key),
  clear: () => {
    console.log('--- CACHE CLEARED ---');
    DASHBOARD_CACHE.clear();
  },
  delete: (key) => DASHBOARD_CACHE.delete(key)
};
