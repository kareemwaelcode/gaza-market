'use strict';

(function () {
  const USE_MOCK = true;
  const API_BASE = '/api';
  const CACHE_KEY = 'gm_prices_cache_v1';
  const CACHE_MAX_KEYS = 12;
  const CACHE_MAX_ITEMS = 30;
  const MOCK_VOTES_KEY = 'gm_mock_votes_v1';
  const MOCK_REMOVED_KEY = 'gm_mock_removed_v1';
  const MAX_REPORTS = 3;

  const CATEGORY_ALIASES = {
    'fuel': 'fuel-combustibles',
    'oils-fats': 'oils-grease',
    'carbonated-drinks': 'soft-drinks',
    'baby-supplies': 'diapers-baby',
  };

  function normalizeCategory(slug) {
    if (slug === null || slug === undefined || slug === '') return null;
    const key = String(slug).trim().toLowerCase();
    return CATEGORY_ALIASES[key] || key;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('prices storage failed:', err);
    }
  }

  function toCount(value) {
    const num = Math.floor(Number(value));
    return isFinite(num) && num > 0 ? num : 0;
  }

  function normalizeItem(raw) {
    if (!raw || raw.price_id === undefined || raw.price_id === null || raw.price_id === '') return null;

    const price = Number(raw.price);
    if (!isFinite(price) || price < 0) return null;

    const nameAr = typeof raw.product_name_ar === 'string' ? raw.product_name_ar.trim() : '';
    const nameEn = typeof raw.product_name_en === 'string' ? raw.product_name_en.trim() : '';
    if (!nameAr && !nameEn) return null;

    const createdAt = raw.created_at ? new Date(raw.created_at) : null;
    const quantity = Number(raw.quantity);
    const vote = raw.my_vote === 'confirm' || raw.my_vote === 'report' ? raw.my_vote : null;

    return {
      price_id: String(raw.price_id),
      product_id: raw.product_id === undefined ? null : raw.product_id,
      product_name_ar: nameAr,
      product_name_en: nameEn,
      quantity: isFinite(quantity) && quantity > 0 ? quantity : null,
      unit: typeof raw.unit === 'string' && raw.unit ? raw.unit : null,
      store_name: typeof raw.store_name === 'string' ? raw.store_name.trim() : '',
      region: typeof raw.region === 'string' ? raw.region : '',
      category: normalizeCategory(raw.category),
      price,
      created_at: createdAt && !isNaN(createdAt.getTime()) ? createdAt.toISOString() : null,
      confirm_count: toCount(raw.confirm_count),
      report_count: toCount(raw.report_count),
      my_vote: vote,
    };
  }

  function normalizePage(json) {
    if (!json || !Array.isArray(json.data)) throw new Error('Invalid prices response');
    return {
      items: json.data.map(normalizeItem).filter(Boolean),
      nextCursor: json.next_cursor || null,
      hasMore: !!json.has_more && !!json.next_cursor,
    };
  }

  function normalizeVoteResult(json) {
    if (!json || typeof json !== 'object') throw new Error('Invalid vote response');
    const vote = json.my_vote === 'confirm' || json.my_vote === 'report' ? json.my_vote : null;
    return {
      my_vote: vote,
      confirm_count: toCount(json.confirm_count),
      report_count: toCount(json.report_count),
      removed: !!json.removed,
    };
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getTestMode() {
    try {
      return new URLSearchParams(window.location.search).get('gm_test') || '';
    } catch (err) {
      return '';
    }
  }

  const MOCK_BASE_TIME = Math.floor(Date.now() / 60000) * 60000;

  const MOCK_ROWS = [
    [1, 'White sugar', 'سكر أبيض', 1, 'kg', 'بقالة أبو محمد', 'Nuseirat', 'sugars', 8, 3, 5, 0],
    [2, 'Olive oil', 'زيت زيتون', 1, 'l', 'سوبرماركت عبادة', 'Nuseirat', 'oils-grease', 35, 12, 2, 0],
    [3, 'Wheat flour', 'طحين', 25, 'kg', 'مخبز الأمل', 'KhanYunis', 'grains-flour', 95, 25, 9, 1],
    [4, 'Basmati rice', 'أرز بسمتي', 5, 'kg', 'سوبرماركت عبادة', 'Nuseirat', 'rice-pasta', 42, 45, 4, 0],
    [5, 'Cooking gas', 'غاز طبخ', 12, 'kg', 'محطة الغاز المركزية', 'DeirBalah', 'cooking-gas', 120, 60, 1, 3],
    [6, 'Tea', 'شاي', 500, 'g', 'بقالة الرحمة', 'Rafah', 'tea-coffee', 14, 90, 6, 0],
    [7, 'Cola', 'كولا', 1.5, 'l', 'ميني ماركت السلام', 'Alrimal', 'soft-drinks', 6, 120, 0, 0],
    [8, 'Diapers', 'حفاضات أطفال', 44, 'piece', 'صيدلية الشفاء', 'Jabalia', 'diapers-baby', 65, 150, 3, 0],
    [9, 'Diesel', 'سولار', 1, 'l', 'محطة الوقود الشرقية', 'KhanYunis', 'fuel-combustibles', 18, 180, 7, 2],
    [10, 'Eggs', 'بيض', 30, 'piece', 'سوبرماركت الأمل', 'Breij', 'eggs-dairy-cheese', 28, 180, 2, 0],
    [11, 'Tomatoes', 'بندورة', 1, 'kg', 'بسطة الخضار', 'Maghazi', 'fresh-vegetables', 4, 240, 5, 0],
    [12, 'Chicken', 'دجاج', 1, 'kg', 'لحوم أبو عمر', 'Nuseirat', 'meat-poultry', 22, 300, 3, 1],
    [13, 'Pasta', 'معكرونة', 400, 'g', 'سوبرماركت عبادة', 'Nuseirat', 'rice-pasta', 5, 360, 1, 0],
    [14, 'Milk', 'حليب', 1, 'l', 'بقالة الرحمة', 'Rafah', 'dairy-products', 9, 420, 2, 0],
    [15, 'Bread', 'خبز', 1, 'pack', 'مخبز النور', 'MawasiKhanYunis', 'bread-bakery', 3, 480, 8, 0],
    [16, 'Dish soap', 'سائل جلي', 750, 'ml', 'سوبرماركت الأمل', 'Breij', 'cleaning-supplies', 7, 600, 0, 0],
    [17, 'Canned beans', 'فول معلب', 400, 'g', 'بقالة أبو محمد', 'Nuseirat', 'legumes-canned', 4, 720, 2, 0],
    [18, 'Mineral water', 'مياه معدنية', 1.5, 'l', 'ميني ماركت السلام', 'Alrimal', 'water-juices', 3, 900, 1, 0],
    [19, 'Lentils', 'عدس', 1, 'kg', 'سوبرماركت عبادة', 'Nuseirat', 'legumes', 9, 1200, 4, 0],
    [20, 'Salt', 'ملح', 1, 'kg', 'بقالة الرحمة', 'Rafah', 'sugar-salt', 2, 1500, 0, 0],
    [21, 'Sunflower oil', 'زيت دوار الشمس', 1.8, 'l', 'سوبرماركت الأمل وأسواق الخير للمواد الغذائية بالجملة والمفرق', 'Breij', 'oils-grease', 24, 2000, 2, 0],
    [22, 'Coffee', 'قهوة', 250, 'g', 'بقالة أبو محمد', 'Nuseirat', 'tea-coffee', 24, 3000, 3, 0],
    [23, 'Baby formula', 'حليب أطفال', 400, 'g', 'صيدلية الشفاء', 'Jabalia', 'diapers-baby', 48, 4000, 1, 0],
    [24, 'Tuna', 'تونة', 185, 'g', 'سوبرماركت عبادة', 'Nuseirat', 'canned-goods', 6, 5000, 2, 0],
    [25, 'Chicken', 'دجاج', 1, 'kg', 'لحوم النصر', 'KhanYunis', 'meat-poultry', 25, 6000, 0, 0],
    [26, 'Sugar', 'سكر', 1, 'kg', 'بقالة الرحمة', 'Rafah', 'sugars', 9, 7000, 1, 0],
    [27, 'Egyptian rice', 'أرز مصري', 1, 'kg', 'سوبرماركت عبادة', 'Nuseirat', 'rice-pasta', 7, 9000, 5, 0],
    [28, 'Olive oil', 'زيت زيتون', 1, 'l', 'بقالة الرحمة', 'Rafah', 'oils-grease', 38, 10000, 0, 0],
    [29, 'Tomatoes', 'بندورة', 1, 'kg', 'بسطة الخضار', 'Nuseirat', 'fresh-vegetables', 3.5, 20000, 1, 0],
    [30, 'Potatoes', 'بطاطا', 1, 'kg', 'بسطة الخضار', 'Nuseirat', 'fresh-vegetables', 3, 30000, 0, 0],
  ].map((row) => ({
    price_id: row[0],
    product_id: 100 + row[0],
    product_name_en: row[1],
    product_name_ar: row[2],
    quantity: row[3],
    unit: row[4],
    store_name: row[5],
    region: row[6],
    category: row[7],
    price: row[8],
    created_at: new Date(MOCK_BASE_TIME - row[9] * 60000).toISOString(),
    base_confirm: row[10],
    base_report: row[11],
  }));

  function withMockVote(row, votes) {
    const vote = votes[String(row.price_id)] || null;
    return {
      price_id: row.price_id,
      product_id: row.product_id,
      product_name_en: row.product_name_en,
      product_name_ar: row.product_name_ar,
      quantity: row.quantity,
      unit: row.unit,
      store_name: row.store_name,
      region: row.region,
      category: row.category,
      price: row.price,
      created_at: row.created_at,
      confirm_count: row.base_confirm + (vote === 'confirm' ? 1 : 0),
      report_count: row.base_report + (vote === 'report' ? 1 : 0),
      my_vote: vote,
    };
  }

  function compareNewestFirst(a, b) {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
    return b.price_id - a.price_id;
  }

  function encodeCursor(row) {
    return `${row.created_at}|${row.price_id}`;
  }

  function decodeCursor(cursor) {
    const index = String(cursor).lastIndexOf('|');
    if (index < 1) return null;
    return { created_at: cursor.slice(0, index), price_id: Number(cursor.slice(index + 1)) };
  }

  async function mockFetchPage(params) {
    const mode = getTestMode();
    await delay(mode === 'slow' ? 3000 : 300);
    if (navigator.onLine === false || mode === 'error') throw new Error('mock network error');
    if (mode === 'empty') return { data: [], next_cursor: null, has_more: false };

    const votes = readJson(MOCK_VOTES_KEY, {});
    const removed = readJson(MOCK_REMOVED_KEY, []);

    let rows = MOCK_ROWS.filter((row) => removed.indexOf(String(row.price_id)) === -1);
    if (params.region) rows = rows.filter((row) => row.region === params.region);
    if (params.category) rows = rows.filter((row) => row.category === params.category);
    rows.sort(compareNewestFirst);

    const cursor = params.cursor ? decodeCursor(params.cursor) : null;
    if (cursor) {
      rows = rows.filter((row) => row.created_at < cursor.created_at ||
        (row.created_at === cursor.created_at && row.price_id < cursor.price_id));
    }

    const pageRows = rows.slice(0, params.limit);
    const hasMore = rows.length > params.limit;

    return {
      data: pageRows.map((row) => withMockVote(row, votes)),
      next_cursor: hasMore ? encodeCursor(pageRows[pageRows.length - 1]) : null,
      has_more: hasMore,
    };
  }

  async function mockVote(priceId, vote) {
    const mode = getTestMode();
    await delay(250);
    if (navigator.onLine === false || mode === 'votefail') throw new Error('mock vote error');

    const row = MOCK_ROWS.find((item) => String(item.price_id) === String(priceId));
    if (!row) throw new Error('Price not found');

    const votes = readJson(MOCK_VOTES_KEY, {});
    if (vote) votes[String(priceId)] = vote;
    else delete votes[String(priceId)];
    writeJson(MOCK_VOTES_KEY, votes);

    const result = withMockVote(row, votes);
    const removedNow = result.report_count > MAX_REPORTS;

    if (removedNow) {
      const removed = readJson(MOCK_REMOVED_KEY, []);
      removed.push(String(priceId));
      writeJson(MOCK_REMOVED_KEY, removed);
    }

    return {
      price_id: result.price_id,
      my_vote: result.my_vote,
      confirm_count: result.confirm_count,
      report_count: result.report_count,
      removed: removedNow,
    };
  }

  async function apiFetchPage(params) {
    const query = new URLSearchParams();
    if (params.region) query.set('region', params.region);
    if (params.category) query.set('category', params.category);
    if (params.cursor) query.set('cursor', params.cursor);
    query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/prices?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function apiVote(priceId, vote) {
    const res = await fetch(`${API_BASE}/prices/${encodeURIComponent(priceId)}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ vote }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchPage(params) {
    const json = USE_MOCK ? await mockFetchPage(params) : await apiFetchPage(params);
    return normalizePage(json);
  }

  async function vote(priceId, value) {
    const json = USE_MOCK ? await mockVote(priceId, value) : await apiVote(priceId, value);
    return normalizeVoteResult(json);
  }

  function readCache(key) {
    const cache = readJson(CACHE_KEY, {});
    const entry = cache && cache[key];
    if (!entry || !Array.isArray(entry.items)) return null;
    return {
      items: entry.items.map(normalizeItem).filter(Boolean),
      savedAt: Number(entry.savedAt) || null,
    };
  }

  function writeCache(key, items) {
    const cache = readJson(CACHE_KEY, {});
    cache[key] = { savedAt: Date.now(), items: items.slice(0, CACHE_MAX_ITEMS) };

    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX_KEYS) {
      keys
        .sort((a, b) => (cache[a].savedAt || 0) - (cache[b].savedAt || 0))
        .slice(0, keys.length - CACHE_MAX_KEYS)
        .forEach((oldKey) => { delete cache[oldKey]; });
    }

    writeJson(CACHE_KEY, cache);
  }

  window.GMPrices = {
    isMock: USE_MOCK,
    maxReports: MAX_REPORTS,
    normalizeCategory,
    fetchPage,
    vote,
    readCache,
    writeCache,
  };
})();