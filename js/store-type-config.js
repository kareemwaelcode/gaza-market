window.GMStoreTypeConfig = (function () {
  'use strict';

  var STORAGE_KEY = 'gm-store-type';
  var PLAN_STORAGE_KEY = 'gm-store-plan';
  var DEFAULT_TYPE = 'cowork';
  var DEFAULT_PLAN = 'free';
  var PLAN_IDS = ['free', 'paid'];

  var ALLOWED_ICON_NAMES = [
    'activity', 'air-vent', 'alert-circle', 'alert-triangle', 'app-window', 'armchair',
    'arrow-left', 'arrow-left-right', 'arrow-right', 'baby', 'badge-check', 'ban',
    'banknote-arrow-up', 'battery', 'battery-charging', 'bed-double', 'bell', 'boxes',
    'brush', 'calculator', 'calendar-check', 'calendar-clock', 'calendar-days', 'calendar-x',
    'camera', 'car', 'check', 'check-circle', 'chevron-left', 'circle-alert',
    'circle-dot', 'clock', 'code', 'copy', 'credit-card', 'credit-card-check',
    'delete', 'door-open', 'dot', 'download', 'droplets', 'external-link',
    'eye', 'eye-off', 'file', 'file-text', 'fish', 'flame',
    'flask-conical', 'flower-2', 'folder', 'folder-plus', 'form', 'gift',
    'glasses', 'gpu', 'hammer', 'hard-drive', 'heart-pulse', 'home',
    'house', 'image', 'info', 'key-round', 'laptop', 'layers',
    'layout-grid', 'lightbulb', 'loader-2', 'locate-fixed', 'lock', 'log-in',
    'log-out', 'map-pin', 'megaphone', 'menu', 'message-circle', 'moon',
    'package', 'package-check', 'palette', 'party-popper', 'pencil', 'pencil-ruler',
    'phone', 'plug-zap', 'plus', 'power', 'printer', 'qr-code',
    'refresh-cw', 'repeat', 'rotate-ccw', 'ruler', 'save', 'scan',
    'scissors', 'search', 'search-x', 'send', 'settings', 'share-2',
    'shield-check', 'shield-plus', 'shirt', 'shopping-bag', 'sidebar', 'siren',
    'smartphone', 'sparkles', 'star', 'stethoscope', 'store', 'sun',
    'swatch-book', 'syringe', 'tag', 'text', 'thumbs-up', 'trash-2',
    'triangle-alert', 'truck', 'upload', 'user-check', 'users', 'utensils',
    'warehouse', 'wifi', 'wind', 'wrench', 'x', 'x-circle',
    'zap'
  ];
  var ALLOWED_PAGES = ['ads', 'appointments', 'dashboard', 'menu', 'packages', 'prices', 'profile', 'reservations', 'services', 'subscribers', 'subscription-requests', 'tables'];
  var ALLOWED_ACTIONS = ['open-prices-edit', 'open-services-edit'];
  var DEFAULT_ICON = 'sparkles';

  var FOOD_PLAN_LIMITS = {
    free: { menuItems: 10, menuCategories: 5, ads: 3, tables: 5, reservations: 5 },
    paid: { menuItems: null, menuCategories: null, ads: null, tables: null, reservations: null }
  };

  var FOOD_LOCKED_FEATURES = {
    free: ['qrCode', 'shareWhatsapp', 'cardPayment'],
    paid: []
  };

  var STORE_LOCKED_FEATURES = {
    free: ['qrCode', 'shareWhatsapp', 'cardPayment', 'whatsappOrder', 'installments'],
    paid: []
  };

  var SUBCATEGORY_ID_KEY = 'gm-store-subcategory-id';
  var SUBCATEGORY_LABEL_KEY = 'gm-store-subcategory';

  var STORE_BASE_FREE_LIMITS = { products: 10, productCategories: 8, ads: 3 };

  var STORE_VARIANTS = {
    general: { key: 'general', freeLimits: {}, hasDiscounts: false, hasAppointments: false, hasProducts: true, hiddenServices: [] },
    grocery: {
      key: 'grocery',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة، دفع كاش وبطاقة',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['قطعة', 'كيلو', 'علبة', 'كرتونة', 'لتر', 'دزينة'] },
        { key: 'expiry', label: 'تاريخ الانتهاء', placeholder: 'مثال: 2027/03', maxLength: 20 }
      ],
      productHints: { name: 'مثال: أرز مصري 5 كيلو', details: 'مثال: حبة طويلة، كيس 5 كيلو', brand: 'مثال: اسم الشركة المصنعة' },
      suggestedCategories: ['معلبات', 'أرز وبقوليات', 'زيوت وسمن', 'سكر وطحين', 'ألبان وأجبان', 'مشروبات وعصائر', 'منظفات ومستلزمات منزلية', 'حلويات وسناكس'],
      heroWelcomeText: 'محلك جاهز لعرض المواد الغذائية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    produce: {
      key: 'produce',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة، دفع كاش وبطاقة',
      productFields: ['details'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['كيلو', 'حبة', 'ربطة', 'صندوق'] },
        { key: 'origin', label: 'المصدر', type: 'choice', options: ['محلي', 'مستورد'] }
      ],
      productHints: { name: 'مثال: بندورة بلدية', details: 'مثال: درجة أولى، طازجة من المزرعة' },
      suggestedCategories: ['خضار', 'فواكه', 'ورقيات وأعشاب طازجة', 'خضار وفواكه موسمية', 'فواكه مجففة وتمور'],
      heroWelcomeText: 'محلك جاهز لعرض الخضار والفواكه وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    butcher: {
      key: 'butcher',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة، دفع كاش وبطاقة',
      productFields: ['details'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['كيلو', 'قطعة', 'كرتونة'] },
        { key: 'condition', label: 'الحالة', type: 'choice', options: ['طازج', 'مجمد'] },
        { key: 'origin', label: 'المصدر', type: 'choice', options: ['محلي', 'مستورد'] }
      ],
      productHints: { name: 'مثال: لحم عجل مفروم', details: 'مثال: مفروم ناعم، خالي من الدهون' },
      suggestedCategories: ['لحم عجل وبقر', 'لحم غنم', 'دجاج وطيور', 'لحوم مفرومة ومتبلة', 'لحوم مصنّعة ومجمدة'],
      heroWelcomeText: 'محلك جاهز لعرض اللحوم وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    fish: {
      key: 'fish',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة، دفع كاش وبطاقة',
      productFields: ['details'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['كيلو', 'قطعة', 'كرتونة'] },
        { key: 'condition', label: 'الحالة', type: 'choice', options: ['طازج', 'مجمد'] },
        { key: 'origin', label: 'المصدر', type: 'choice', options: ['محلي', 'مستورد'] }
      ],
      productHints: { name: 'مثال: سمك دنيس', details: 'مثال: حجم وسط، منظف وجاهز للطبخ' },
      suggestedCategories: ['أسماك طازجة', 'أسماك مجمدة', 'جمبري ومأكولات بحرية', 'أسماك مملحة ومعلبة'],
      heroWelcomeText: 'محلك جاهز لعرض الأسماك وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    bakery: {
      key: 'bakery',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'custom_order', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، طلبات خاصة، بيع بالجملة',
      productFields: ['details'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['قطعة', 'كيلو', 'دزينة', 'كيس', 'كرتونة'] }
      ],
      productHints: { name: 'مثال: خبز عربي أبيض', details: 'مثال: كيس 10 أرغفة، مخبوز طازج يومياً' },
      suggestedCategories: ['خبز', 'معجنات ومناقيش', 'كعك وبسكويت', 'كيك ومخبوزات حلوة', 'مخبوزات صحية'],
      heroWelcomeText: 'مخبزك جاهز لعرض منتجاتك وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    sweets: {
      key: 'sweets',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'custom_order', 'gift_wrap', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، طلبات خاصة، تغليف هدايا، جملة',
      productFields: ['details'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['كيلو', 'قطعة', 'علبة', 'صينية', 'دزينة'] }
      ],
      productHints: { name: 'مثال: كنافة نابلسية', details: 'مثال: جبنة نابلسية، صينية 12 قطعة' },
      suggestedCategories: ['حلويات شرقية', 'حلويات غربية', 'كنافة وقطايف', 'كيك وتورتات', 'شوكولاتة ومكسرات'],
      heroWelcomeText: 'محلك جاهز لعرض الحلويات وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    spices: {
      key: 'spices',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة، دفع كاش وبطاقة',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['كيلو', '100 غرام', 'علبة', 'كيس'] }
      ],
      productHints: { name: 'مثال: كمون مطحون', details: 'مثال: مطحون طازج، بدون إضافات', brand: 'مثال: اسم المصدر أو الشركة' },
      suggestedCategories: ['بهارات', 'أعشاب وعطارة', 'مكسرات وبذور', 'قهوة وشاي', 'توابل مشكلة'],
      heroWelcomeText: 'محلك جاهز لعرض البهارات والأعشاب وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    menswear: {
      key: 'menswear',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['size_exchange', 'alteration', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تبديل مقاسات، تعديل، استبدال واسترجاع',
      productFields: ['details', 'size', 'color'],
      productExtraFields: [
        { key: 'season', label: 'الموسم', type: 'choice', options: ['صيفي', 'شتوي', 'لكل المواسم'] }
      ],
      productHints: { name: 'مثال: قميص رجالي كلاسيك', details: 'مثال: قطن 100%، قصة ضيقة', size: 'مثال: M أو L أو 42', color: 'مثال: أبيض، أزرق سماوي' },
      suggestedCategories: ['قمصان', 'بناطيل', 'تيشرتات وبلوزات', 'بدلات وجاكيتات', 'ملابس رياضية', 'ملابس داخلية وجوارب', 'ملابس شتوية'],
      heroWelcomeText: 'محلك جاهز لعرض الملابس الرجالية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    womenswear: {
      key: 'womenswear',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['size_exchange', 'alteration', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تبديل مقاسات، تعديل، استبدال واسترجاع',
      productFields: ['details', 'size', 'color'],
      productExtraFields: [
        { key: 'season', label: 'الموسم', type: 'choice', options: ['صيفي', 'شتوي', 'لكل المواسم'] }
      ],
      productHints: { name: 'مثال: فستان سهرة طويل', details: 'مثال: قماش شيفون، بطانة داخلية', size: 'مثال: S أو M أو 38', color: 'مثال: أسود، بيج' },
      suggestedCategories: ['فساتين', 'بلوزات وقمصان', 'بناطيل وتنانير', 'عبايات وإسدالات', 'ملابس منزلية ونوم', 'ملابس رياضية', 'ملابس شتوية'],
      heroWelcomeText: 'محلك جاهز لعرض الملابس النسائية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    kidswear: {
      key: 'kidswear',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['size_exchange', 'alteration', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تبديل مقاسات، تعديل، استبدال واسترجاع',
      productFields: ['details', 'size', 'color'],
      productExtraFields: [
        { key: 'ageGroup', label: 'الفئة العمرية', type: 'choice', options: ['مواليد', '1-3 سنوات', '4-7 سنوات', '8-12 سنة', '13 سنة فما فوق'] },
        { key: 'gender', label: 'للجنس', type: 'choice', options: ['أولاد', 'بنات', 'للجنسين'] },
        { key: 'season', label: 'الموسم', type: 'choice', options: ['صيفي', 'شتوي', 'لكل المواسم'] }
      ],
      productHints: { name: 'مثال: طقم أطفال قطن', details: 'مثال: قطعتين، قطن ناعم للبشرة الحساسة', size: 'مثال: 4 سنوات أو 98 سم', color: 'مثال: سماوي، وردي' },
      suggestedCategories: ['ملابس مواليد', 'ملابس أولاد', 'ملابس بنات', 'ملابس مدرسية', 'ملابس نوم', 'ملابس شتوية'],
      heroWelcomeText: 'محلك جاهز لعرض ملابس الأطفال وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    shoes: {
      key: 'shoes',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['size_exchange', 'exchange_return', 'warranty', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تبديل مقاسات، استبدال واسترجاع، ضمان',
      productFields: ['details', 'brand', 'size', 'color', 'material'],
      productExtraFields: [
        { key: 'shoeFor', label: 'الفئة', type: 'choice', options: ['رجالي', 'نسائي', 'أطفال', 'للجنسين'] },
        { key: 'season', label: 'الموسم', type: 'choice', options: ['صيفي', 'شتوي', 'لكل المواسم'] }
      ],
      productHints: { name: 'مثال: حذاء رياضي للجري', details: 'مثال: نعل طبي مريح، خفيف الوزن', brand: 'مثال: نايك، أديداس، بوما', size: 'مثال: 42 أو 38-41', color: 'مثال: أسود، أبيض', material: 'مثال: جلد طبيعي، قماش' },
      suggestedCategories: ['أحذية رياضية', 'أحذية رسمية', 'صنادل وشباشب', 'بوتات وجزم', 'أحذية مدرسية', 'أحذية أطفال'],
      heroWelcomeText: 'محلك جاهز لعرض الأحذية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    accessories: {
      key: 'accessories',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['cash_payment', 'card_payment', 'gift_wrap', 'warranty', 'exchange_return'],
      servicesNavSub: 'تغليف هدايا، ضمان، استبدال واسترجاع',
      productFields: ['details', 'color', 'material'],
      suggestedCategories: ['ساعات', 'حقائب ومحافظ', 'خواتم وأساور', 'قلادات وأطقم', 'نظارات شمسية', 'إكسسوارات شعر', 'أحزمة'],
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    tailoring: {
      key: 'tailoring',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['fitting', 'home_measurement', 'fabric_supply', 'urgent_service', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'قياس منزلي، أقمشة، تنفيذ سريع، توصيل',
      serviceItemsNav: {
        icon: 'scissors',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الأسعار',
        sub: 'تفصيل، تعديل، تقصير، أسعار',
        cardSub: 'الأعمال والأسعار ومدة التنفيذ'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceSuggestions: [
        { id: 'tl_suit', label: 'تفصيل بدلة رجالي', icon: 'shirt' },
        { id: 'tl_dress', label: 'تفصيل فستان أو ثوب', icon: 'sparkles' },
        { id: 'tl_hem', label: 'تقصير بنطلون أو تنورة', icon: 'scissors' },
        { id: 'tl_resize', label: 'تضييق أو توسيع', icon: 'ruler' },
        { id: 'tl_zipper', label: 'تبديل سحاب', icon: 'repeat' },
        { id: 'tl_embroidery', label: 'تطريز', icon: 'flower-2' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف عملاً مثل التفصيل أو التقصير أو التعديل مع سعره ومدة تنفيذه ليطّلع عليه الزوار قبل زيارتك'
      },
      heroWelcomeText: 'محلك جاهز لعرض خدماتك وأسعارك ومدة التنفيذ من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    pharmacy: {
      key: 'pharmacy',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['night_duty', 'prescription_order', 'health_check', 'injections', 'cash_payment', 'card_payment'],
      servicesNavSub: 'مناوبة ليلية، وصفات طبية، قياس ضغط وسكر',
      productFields: ['prescription'],
      suggestedCategories: ['أدوية بدون وصفة', 'مسكنات وبرد', 'فيتامينات ومكملات', 'عناية بالبشرة', 'عناية بالشعر', 'أم وطفل', 'إسعافات أولية'],
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    medical: {
      key: 'medical',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['installation', 'device_rental', 'device_maintenance', 'warranty', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب، تأجير أجهزة، صيانة، ضمان',
      productFields: ['saleType'],
      suggestedCategories: ['أجهزة قياس', 'كراسي متحركة ومشايات', 'عكازات وجبائر', 'مستهلكات طبية', 'فرشات وأسرّة طبية', 'أجهزة تنفس وأكسجين'],
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    optics: {
      key: 'optics',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['eye_exam', 'lens_fitting', 'glasses_repair', 'warranty', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'فحص نظر، تركيب عدسات، صيانة نظارات',
      productFields: ['brand'],
      suggestedCategories: ['نظارات طبية', 'نظارات شمسية', 'عدسات طبية', 'عدسات لاصقة', 'سوائل ومنظفات', 'إكسسوارات'],
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    furniture: {
      key: 'furniture',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['furniture_assembly', 'custom_order', 'warranty', 'exchange_return', 'installments', 'cash_payment', 'card_payment'],
      servicesNavSub: 'فك وتركيب، تفصيل حسب الطلب، ضمان، تقسيط',
      productFields: ['details', 'color', 'material'],
      productHints: { name: 'مثال: غرفة نوم خشب زان', details: 'مثال: 6 قطع، شامل الخزانة والتسريحة', color: 'مثال: بني، رمادي، أبيض', material: 'مثال: خشب زان، MDF، معدن' },
      suggestedCategories: ['غرف نوم', 'غرف جلوس وصالونات', 'غرف سفرة', 'مطابخ وخزائن', 'طاولات وكراسي', 'أسرّة وفرشات', 'أثاث مكتبي', 'أثاث أطفال'],
      heroWelcomeText: 'معرضك جاهز لعرض قطع الأثاث وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    furnishings: {
      key: 'furnishings',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['home_measurement', 'custom_order', 'installation', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'أخذ مقاسات، تفصيل ستائر، تركيب',
      productFields: ['details', 'size', 'color', 'material'],
      productHints: { name: 'مثال: طقم ستائر مخمل', details: 'مثال: طقم من 4 قطع مع الإكسسوارات', size: 'مثال: 2×3 متر أو سرير مفرد', color: 'مثال: بيج، رمادي، بني', material: 'مثال: قطن، مخمل، بوليستر' },
      suggestedCategories: ['ستائر', 'شراشف وأطقم سرير', 'بطانيات ولحف', 'مخدات ووسائد', 'سجاد وموكيت', 'مفارش طاولات ومطبخ', 'مناشف'],
      heroWelcomeText: 'محلك جاهز لعرض المفروشات والستائر وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    household: {
      key: 'household',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['bridal_sets', 'gift_wrap', 'warranty', 'exchange_return', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'جهاز عروس، تغليف هدايا، بيع بالجملة',
      productFields: ['details', 'color', 'material'],
      productHints: { name: 'مثال: طقم قدور ستانلس 10 قطع', details: 'مثال: 10 قطع مع أغطية زجاجية', color: 'مثال: فضي، أسود', material: 'مثال: ستانلس ستيل، زجاج، ميلامين' },
      suggestedCategories: ['أواني وقدور', 'صحون وكاسات', 'أدوات مطبخ', 'علب تخزين وحفظ', 'أدوات مائدة وتقديم', 'أدوات غسيل ونشر', 'منظمات ورفوف'],
      heroWelcomeText: 'محلك جاهز لعرض الأدوات المنزلية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    appliances: {
      key: 'appliances',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['installation', 'warranty', 'after_sales', 'exchange_return', 'installments', 'bridal_sets', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب، ضمان، صيانة، تقسيط',
      productFields: ['details', 'brand', 'color'],
      productHints: { name: 'مثال: غسالة أوتوماتيك 8 كيلو', details: 'مثال: 8 كيلو، توفير طاقة، ضمان سنتين', brand: 'مثال: سامسونج، LG، بيكو', color: 'مثال: أبيض، ستانلس' },
      suggestedCategories: ['ثلاجات وفريزرات', 'غسالات', 'أفران وغاز', 'مكيفات ومراوح', 'تلفزيونات وشاشات', 'أجهزة مطبخ صغيرة', 'سخانات مياه', 'مكانس كهربائية'],
      heroWelcomeText: 'معرضك جاهز لعرض الأجهزة الكهربائية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    cleaning: {
      key: 'cleaning',
      freeLimits: { products: 15, productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['refill', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تعبئة سوائل، بيع بالجملة',
      productFields: ['details', 'brand'],
      productHints: { name: 'مثال: سائل جلي 4 لتر', details: 'مثال: عبوة 4 لتر، رائحة ليمون', brand: 'مثال: فيري، أومو، دومستوس' },
      suggestedCategories: ['منظفات أرضيات', 'منظفات مطبخ وجلي', 'منظفات حمام', 'مساحيق ومنظفات غسيل', 'معطرات ومزيلات روائح', 'مطهرات ومعقمات', 'أدوات تنظيف'],
      heroWelcomeText: 'محلك جاهز لعرض مواد التنظيف وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    plumbing: {
      key: 'plumbing',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['installation', 'technical_consultation', 'warranty', 'exchange_return', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب، استشارة فنية، ضمان، جملة',
      productFields: ['details', 'brand', 'color', 'material'],
      productHints: { name: 'مثال: خلاط مغسلة كروم', details: 'مثال: قطر 1 إنش، ضمان سنة', brand: 'مثال: اسم الشركة المصنعة', color: 'مثال: كروم، أسود مطفي', material: 'مثال: نحاس، ستانلس، PVC' },
      suggestedCategories: ['مراحيض ومغاسل', 'خلاطات وحنفيات', 'أحواض وبانيوهات', 'مواسير ووصلات', 'خزانات مياه', 'مضخات ومحابس', 'إكسسوارات حمام'],
      heroWelcomeText: 'محلك جاهز لعرض الأدوات الصحية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    clinic: {
      key: 'clinic',
      freeLimits: { appointments: 5 },
      hasDiscounts: false,
      hasAppointments: true,
      hasProducts: false,
      hiddenServices: [],
      serviceIds: ['consultation', 'lab_tests', 'xray', 'vaccinations', 'cash_payment', 'card_payment'],
      servicesNavSub: 'كشفية، تحاليل، أشعة، تطعيمات',
      heroWelcomeText: 'عيادتك جاهزة لاستقبال المواعيد وعرض خدماتك من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    mobile: {
      key: 'mobile',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['warranty', 'exchange_return', 'installments', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'ضمان، استبدال واسترجاع، تقسيط، توصيل',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'model', label: 'الموديل', placeholder: 'مثال: Galaxy A54' },
        { key: 'storage', label: 'السعة (GB)', placeholder: 'مثال: 128', maxLength: 20 },
        { key: 'condition', label: 'حالة الجهاز', type: 'choice', options: ['جديد', 'مستعمل'] },
        { key: 'warranty', label: 'الضمان', placeholder: 'مثال: سنة من الوكيل' },
        { key: 'accessoryType', label: 'نوع الإكسسوار (إن كان إكسسوار)', placeholder: 'مثال: شاحن، سماعة، جراب' }
      ],
      productHints: { name: 'مثال: سامسونج Galaxy A54 128GB', details: 'مثال: شاشة 6.4 إنش، كاميرا 50 ميجا', brand: 'مثال: سامسونج، آبل، شاومي' },
      suggestedCategories: ['هواتف ذكية', 'سماعات', 'شواحن وكوابل', 'جرابات وحمايات', 'باور بانك', 'إكسسوارات متنوعة'],
      heroWelcomeText: 'محلك جاهز لعرض الموبايلات والإكسسوارات وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    computers: {
      key: 'computers',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['warranty', 'after_sales', 'exchange_return', 'installments', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'ضمان، صيانة، استبدال واسترجاع، تقسيط',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'processor', label: 'المعالج', placeholder: 'مثال: Core i5 الجيل 12' },
        { key: 'ram', label: 'الرام', placeholder: 'مثال: 16GB', maxLength: 20 },
        { key: 'storage', label: 'التخزين', placeholder: 'مثال: 512GB SSD', maxLength: 30 },
        { key: 'gpu', label: 'كرت الشاشة', placeholder: 'مثال: RTX 3050' },
        { key: 'condition', label: 'حالة الجهاز', type: 'choice', options: ['جديد', 'مستعمل'] },
        { key: 'warranty', label: 'الضمان', placeholder: 'مثال: سنتين' }
      ],
      productHints: { name: 'مثال: لابتوب HP 15 Core i5', details: 'مثال: شاشة 15.6 إنش، بطارية تدوم 6 ساعات', brand: 'مثال: HP، Dell، Lenovo' },
      suggestedCategories: ['لابتوبات', 'كمبيوترات مكتبية', 'شاشات', 'قطع ومكونات', 'طابعات وأحبار', 'ملحقات (ماوس وكيبورد)'],
      heroWelcomeText: 'محلك جاهز لعرض الكمبيوترات واللابتوبات وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    electronics: {
      key: 'electronics',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['warranty', 'installation', 'after_sales', 'exchange_return', 'installments', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'ضمان، تركيب، صيانة، تقسيط',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'deviceType', label: 'نوع الجهاز', placeholder: 'مثال: تلفزيون، سماعة، كاميرا' },
        { key: 'model', label: 'الموديل', placeholder: 'مثال: موديل 2024' },
        { key: 'condition', label: 'حالة الجهاز', type: 'choice', options: ['جديد', 'مستعمل'] },
        { key: 'warranty', label: 'الضمان', placeholder: 'مثال: سنة' }
      ],
      productHints: { name: 'مثال: شاشة سمارت 55 إنش', details: 'مثال: 4K، نظام أندرويد، ريموت صوتي', brand: 'مثال: سامسونج، LG، سوني' },
      suggestedCategories: ['تلفزيونات وشاشات', 'سماعات وسبيكرات', 'كاميرات', 'أجهزة ألعاب', 'أجهزة ذكية', 'إضاءة وكهربائيات صغيرة'],
      heroWelcomeText: 'محلك جاهز لعرض الإلكترونيات وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    solar: {
      key: 'solar',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['installation', 'technical_consultation', 'warranty', 'installments', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب، استشارة فنية، ضمان، تقسيط',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'partType', label: 'نوع القطعة', type: 'choice', options: ['لوح شمسي', 'بطارية', 'إنفرتر', 'شاحن / كنترولر', 'أخرى'] },
        { key: 'power', label: 'القدرة (واط)', placeholder: 'مثال: 550', maxLength: 20 },
        { key: 'capacityAh', label: 'السعة (أمبير/ساعة)', placeholder: 'مثال: 200', maxLength: 20 },
        { key: 'voltage', label: 'الجهد (فولت)', placeholder: 'مثال: 12', maxLength: 20 },
        { key: 'warranty', label: 'الضمان', placeholder: 'مثال: 5 سنوات' }
      ],
      productHints: { name: 'مثال: لوح شمسي 550 واط', details: 'مثال: أحادي البلورة، كفاءة عالية', brand: 'مثال: Jinko، Longi، Growatt' },
      suggestedCategories: ['ألواح شمسية', 'بطاريات', 'إنفرترات', 'شواحن وكنترولر', 'كوابل وملحقات', 'إضاءة LED'],
      serviceItemsNav: {
        icon: 'zap',
        label: 'باقات التركيب',
        mobileLabel: 'الباقات',
        sub: 'باقات جاهزة (ألواح + بطاريات + إنفرتر) بأسعارها',
        cardSub: 'باقات التركيب وأسعارها'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceSuggestions: [
        { id: 'sl_small', label: 'باقة منزلية صغيرة (إضاءة وشحن)', icon: 'lightbulb' },
        { id: 'sl_medium', label: 'باقة منزلية متوسطة (ثلاجة وتلفاز)', icon: 'house' },
        { id: 'sl_large', label: 'باقة منزلية كاملة', icon: 'zap' },
        { id: 'sl_install', label: 'تركيب وتمديد فقط', icon: 'wrench' }
      ],
      pageCopy: {
        servicesPageTitle: 'باقات التركيب',
        servicesEmptyText: 'أضف باقة جاهزة مثل لوح وبطارية وإنفرتر مع سعرها ومدة تركيبها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'محلك جاهز لعرض الطاقة الشمسية وباقات التركيب وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    repair: {
      key: 'repair',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['urgent_service', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تنفيذ سريع، توصيل، دفع كاش وبطاقة',
      serviceItemsNav: {
        icon: 'wrench',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الأسعار',
        sub: 'التصليحات والصيانة وأسعارها',
        cardSub: 'الخدمات والأسعار ومدة التنفيذ'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceExtraFields: [
        { key: 'deviceType', label: 'نوع الجهاز', placeholder: 'مثال: موبايل، لابتوب، شاشة' },
        { key: 'warranty', label: 'الضمان على الإصلاح', placeholder: 'مثال: شهر، 3 شهور' }
      ],
      serviceSuggestions: [
        { id: 'rp_screen', label: 'تغيير شاشة', icon: 'smartphone' },
        { id: 'rp_battery', label: 'تغيير بطارية', icon: 'battery-charging' },
        { id: 'rp_charge_port', label: 'تصليح منفذ الشحن', icon: 'plug-zap' },
        { id: 'rp_software', label: 'فورمات وتنصيب نظام', icon: 'hard-drive' },
        { id: 'rp_laptop', label: 'صيانة وتنظيف لابتوب', icon: 'laptop' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف خدمة مثل تغيير شاشة أو بطارية مع سعرها ومدة تنفيذها وضمانها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'محلك جاهز لعرض خدمات التصليح والصيانة وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    buildingmat: {
      key: 'buildingmat',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'technical_consultation', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل للموقع، بيع بالجملة، استشارة فنية',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'materialType', label: 'نوع المادة', type: 'choice', options: ['إسمنت ولصق', 'رمل وحصى', 'طوب وبلوك', 'عزل', 'أدوات بناء', 'أخرى'] },
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['كيس', 'طن', 'متر مكعب', 'حبة', 'متر', 'قطعة'] }
      ],
      productHints: { name: 'مثال: إسمنت أسود 50 كيلو', details: 'مثال: إسمنت بورتلاندي، مناسب للصب والبناء', brand: 'مثال: اسم المصنع أو الشركة' },
      suggestedCategories: ['إسمنت ولصق', 'رمل وحصى', 'طوب وبلوك', 'عزل', 'أدوات بناء'],
      heroWelcomeText: 'محلك جاهز لعرض مواد البناء وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    ironalu: {
      key: 'ironalu',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'technical_consultation', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة، استشارة فنية',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'metalType', label: 'نوع المعدن', type: 'choice', options: ['حديد', 'ألمنيوم', 'ستانلس', 'أخرى'] },
        { key: 'dimension', label: 'المقاس / السماكة', placeholder: 'مثال: 12 ملم، 6 متر', maxLength: 30 },
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['طن', 'كيلو', 'متر', 'قطعة'] }
      ],
      productHints: { name: 'مثال: حديد تسليح 12 ملم', details: 'مثال: طول 12 متر، درجة 60', brand: 'مثال: اسم المصنع أو الشركة' },
      suggestedCategories: ['حديد تسليح', 'ألمنيوم', 'أبواب وشبابيك', 'دربزين وحدادة', 'لحام ومستلزماته'],
      serviceItemsNav: {
        icon: 'hammer',
        label: 'التفصيل والتركيب',
        mobileLabel: 'التفصيل',
        sub: 'أبواب، شبابيك، دربزين، أسعار وتركيب',
        cardSub: 'خدمات التفصيل والتركيب وأسعارها'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceSuggestions: [
        { id: 'ia_door', label: 'تفصيل باب حديد', icon: 'door-open' },
        { id: 'ia_window', label: 'تفصيل شباك ألمنيوم', icon: 'app-window' },
        { id: 'ia_rail', label: 'تفصيل وتركيب دربزين', icon: 'hammer' },
        { id: 'ia_shade', label: 'مظلات وسقوف معدنية', icon: 'warehouse' },
        { id: 'ia_weld', label: 'لحام وصيانة', icon: 'flame' }
      ],
      pageCopy: {
        servicesPageTitle: 'التفصيل والتركيب',
        servicesEmptyText: 'أضف خدمة مثل تفصيل باب أو شباك أو دربزين مع سعرها ومدة تنفيذها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'محلك جاهز لعرض الحديد والألمنيوم وخدمات التفصيل وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    paintsdecor: {
      key: 'paintsdecor',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['color_mixing', 'delivery', 'technical_consultation', 'cash_payment', 'card_payment'],
      servicesNavSub: 'خلط ألوان بالكمبيوتر، توصيل، استشارة فنية',
      productFields: ['details', 'brand', 'color'],
      productExtraFields: [
        { key: 'packSize', label: 'الحجم / العبوة', type: 'choice', options: ['1 لتر', '4 لتر (جالون)', '5 لتر', '18 لتر', 'أخرى'] },
        { key: 'finish', label: 'نوع التشطيب', type: 'choice', options: ['مطفي', 'نصف لامع', 'لامع'] }
      ],
      productHints: { name: 'مثال: دهان داخلي أبيض 18 لتر', details: 'مثال: قابل للغسيل، يغطي 12 متر للتر', brand: 'مثال: جوتن، جمجوم، ناشيونال', color: 'مثال: أبيض، رقم اللون RAL 9010' },
      suggestedCategories: ['دهانات داخلية', 'دهانات خارجية', 'معاجين وأساسات', 'ورق جدران', 'أدوات دهان'],
      heroWelcomeText: 'محلك جاهز لعرض الدهانات والديكور وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    wood: {
      key: 'wood',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['cut_to_size', 'delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'قص حسب المقاس، توصيل، بيع بالجملة',
      productFields: ['details'],
      productExtraFields: [
        { key: 'woodType', label: 'نوع الخشب', type: 'choice', options: ['زان', 'صنوبر', 'MDF', 'أبلكاش', 'باركيه', 'أخرى'] },
        { key: 'dimension', label: 'المقاس (الطول × العرض × السماكة)', placeholder: 'مثال: 244 × 122 × 1.8 سم', maxLength: 40 },
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['لوح', 'متر', 'قطعة'] }
      ],
      productHints: { name: 'مثال: لوح MDF أبيض 18 ملم', details: 'مثال: وجهين، مقاوم للرطوبة' },
      suggestedCategories: ['ألواح MDF', 'خشب طبيعي', 'أبلكاش', 'باركيه', 'إكسسوارات ومفصلات'],
      heroWelcomeText: 'محلك جاهز لعرض الأخشاب وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    tiles: {
      key: 'tiles',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['quantity_calc', 'delivery', 'technical_consultation', 'cash_payment', 'card_payment'],
      servicesNavSub: 'حساب الكمية من المساحة، توصيل، استشارة فنية',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'tileSize', label: 'المقاس', placeholder: 'مثال: 60×60 سم', maxLength: 30 },
        { key: 'tileType', label: 'النوع', type: 'choice', options: ['أرضيات', 'جدران', 'بورسلان'] },
        { key: 'origin', label: 'بلد المنشأ', placeholder: 'مثال: إسباني، تركي، محلي', maxLength: 30 },
        { key: 'finish', label: 'التشطيب', type: 'choice', options: ['لامع', 'مطفي'] },
        { key: 'priceUnit', label: 'السعر لكل', type: 'choice', options: ['متر', 'صندوق', 'قطعة'] },
        { key: 'metersPerBox', label: 'كمية المتر في الصندوق', placeholder: 'مثال: 1.44', maxLength: 20 }
      ],
      productHints: { name: 'مثال: سيراميك أرضيات 60×60', details: 'مثال: درجة أولى، مقاوم للخدش', brand: 'مثال: اسم الشركة المصنعة' },
      suggestedCategories: ['أرضيات', 'جدران', 'بورسلان', 'حمامات ومطابخ', 'أدوات تركيب وجص'],
      heroWelcomeText: 'محلك جاهز لعرض السيراميك والبلاط وأسعاره من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    stationery: {
      key: 'stationery',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['printing_copying', 'delivery', 'wholesale', 'gift_wrap', 'cash_payment', 'card_payment'],
      servicesNavSub: 'طباعة وتصوير، توصيل، جملة، تغليف هدايا',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'unit', label: 'وحدة البيع', type: 'choice', options: ['قطعة', 'علبة', 'دزينة', 'رزمة', 'كرتونة'] }
      ],
      productHints: { name: 'مثال: دفتر 100 ورقة سلك', details: 'مثال: ورق أبيض، غلاف كرتون مقوى', brand: 'مثال: اسم الشركة المصنعة' },
      suggestedCategories: ['دفاتر وكراريس', 'أقلام وأدوات كتابة', 'حقائب مدرسية', 'أدوات مكتبية', 'كتب وقصص', 'مستلزمات مدرسية'],
      heroWelcomeText: 'مكتبتك جاهزة لعرض القرطاسية والكتب وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    toys: {
      key: 'toys',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['gift_wrap', 'exchange_return', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تغليف هدايا، استبدال واسترجاع، توصيل',
      productFields: ['details', 'brand', 'color'],
      productExtraFields: [
        { key: 'ageGroup', label: 'الفئة العمرية', type: 'choice', options: ['0-2 سنة', '3-5 سنوات', '6-8 سنوات', '9 سنوات فما فوق', 'لكل الأعمار'] },
        { key: 'battery', label: 'البطارية', type: 'choice', options: ['مشمولة', 'غير مشمولة', 'لا تحتاج بطارية'] }
      ],
      productHints: { name: 'مثال: سيارة تحكم عن بعد', details: 'مثال: تعمل بالبطارية، مناسبة للأطفال', brand: 'مثال: اسم الشركة المصنعة', color: 'مثال: أحمر، أزرق' },
      suggestedCategories: ['ألعاب تعليمية', 'دمى وعرائس', 'سيارات وألعاب تحكم', 'ألعاب تركيب ومكعبات', 'ألعاب خارجية', 'هدايا ومفاجآت'],
      heroWelcomeText: 'محلك جاهز لعرض ألعاب الأطفال وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    artsupplies: {
      key: 'artsupplies',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'exchange_return', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، جملة، استبدال واسترجاع',
      productFields: ['details', 'brand', 'color'],
      productExtraFields: [
        { key: 'artSize', label: 'المقاس', placeholder: 'مثال: A3، 50×70 سم', maxLength: 30 },
        { key: 'quality', label: 'الفئة', type: 'choice', options: ['مبتدئ', 'طلاب', 'محترف'] }
      ],
      productHints: { name: 'مثال: علبة ألوان مائية 24 لون', details: 'مثال: ألوان زاهية، قابلة للمزج', brand: 'مثال: اسم الشركة المصنعة', color: 'مثال: مجموعة متعددة الألوان' },
      suggestedCategories: ['ألوان وأقلام رسم', 'دفاتر وأوراق رسم', 'فرش وأدوات تلوين', 'لوحات وحوامل', 'أدوات هندسية', 'مستلزمات أشغال يدوية'],
      heroWelcomeText: 'محلك جاهز لعرض أدوات الفن والرسم وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    salonmen: {
      key: 'salonmen',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['home_visit', 'cash_payment', 'card_payment'],
      servicesNavSub: 'زيارة منزلية، دفع كاش وبطاقة',
      serviceItemsNav: {
        icon: 'scissors',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الأسعار',
        sub: 'قص، حلاقة، عناية، أسعار',
        cardSub: 'الخدمات والأسعار ومدة التنفيذ'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceSuggestions: [
        { id: 'sm_cut', label: 'قص شعر', icon: 'scissors' },
        { id: 'sm_shave', label: 'حلاقة ذقن', icon: 'scissors' },
        { id: 'sm_cut_beard', label: 'قص شعر وذقن', icon: 'scissors' },
        { id: 'sm_groom', label: 'تجهيز عريس', icon: 'sparkles' },
        { id: 'sm_color', label: 'صبغة شعر', icon: 'palette' },
        { id: 'sm_skin', label: 'عناية بالبشرة', icon: 'sparkles' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف خدمة مثل قص الشعر أو الحلاقة مع سعرها ومدتها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'صالونك جاهز لعرض خدماتك وأسعارك من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    salonwomen: {
      key: 'salonwomen',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['home_visit', 'cash_payment', 'card_payment'],
      servicesNavSub: 'زيارة منزلية، دفع كاش وبطاقة',
      serviceItemsNav: {
        icon: 'sparkles',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الأسعار',
        sub: 'شعر، عناية، مكياج، أسعار',
        cardSub: 'الخدمات والأسعار ومدة التنفيذ'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceSuggestions: [
        { id: 'sw_cut', label: 'قص وتسريح', icon: 'scissors' },
        { id: 'sw_blow', label: 'سشوار', icon: 'wind' },
        { id: 'sw_color', label: 'صبغة شعر', icon: 'palette' },
        { id: 'sw_nails', label: 'مناكير وباديكير', icon: 'sparkles' },
        { id: 'sw_makeup', label: 'مكياج', icon: 'brush' },
        { id: 'sw_bride', label: 'تجهيز عروس', icon: 'sparkles' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف خدمة مثل القص أو الصبغة أو المكياج مع سعرها ومدتها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'صالونك جاهز لعرض خدماتك وأسعارك من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    laundry: {
      key: 'laundry',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'urgent_service', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، تنفيذ سريع، دفع كاش وبطاقة',
      serviceItemsNav: {
        icon: 'shirt',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الأسعار',
        sub: 'غسيل، كوي، تنظيف، أسعار',
        cardSub: 'الخدمات والأسعار ومدة التنفيذ'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceExtraFields: [
        { key: 'pricingUnit', label: 'يُسعَّر لكل', type: 'choice', options: ['قطعة', 'كيلو', 'متر', 'طقم'] }
      ],
      serviceSuggestions: [
        { id: 'ld_wash_iron', label: 'غسيل وكوي ملابس', icon: 'shirt' },
        { id: 'ld_iron', label: 'كوي فقط', icon: 'shirt' },
        { id: 'ld_suit', label: 'تنظيف بدلة جاف', icon: 'sparkles' },
        { id: 'ld_blanket', label: 'غسيل أغطية وبطانيات', icon: 'bed-double' },
        { id: 'ld_carpet', label: 'غسيل سجاد', icon: 'layers' },
        { id: 'ld_curtain', label: 'غسيل ستائر', icon: 'sparkles' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف خدمة مثل الغسيل والكوي أو تنظيف السجاد مع سعرها ومدة تنفيذها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'مغسلتك جاهزة لعرض خدماتك وأسعارك من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    photography: {
      key: 'photography',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['outdoor_shoot', 'photo_printing', 'urgent_service', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تصوير خارجي، طباعة صور وألبومات، تسليم سريع',
      serviceItemsNav: {
        icon: 'camera',
        label: 'الباقات والأسعار',
        mobileLabel: 'الباقات',
        sub: 'باقات التصوير وأسعارها',
        cardSub: 'باقات التصوير ومدتها وأسعارها'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceExtraFields: [
        { key: 'includes', label: 'ما تتضمنه الباقة', placeholder: 'مثال: 100 صورة معدلة + ألبوم', maxLength: 80 }
      ],
      serviceSuggestions: [
        { id: 'ph_wedding', label: 'تصوير حفل زفاف', icon: 'camera' },
        { id: 'ph_family', label: 'جلسة تصوير عائلية', icon: 'users' },
        { id: 'ph_newborn', label: 'تصوير مواليد', icon: 'baby' },
        { id: 'ph_event', label: 'تصوير مناسبات', icon: 'party-popper' },
        { id: 'ph_product', label: 'تصوير منتجات', icon: 'package' },
        { id: 'ph_id', label: 'صور شخصية ووثائق', icon: 'image' }
      ],
      pageCopy: {
        servicesPageTitle: 'الباقات والأسعار',
        servicesEmptyText: 'أضف باقة تصوير مع سعرها ومدتها وما تتضمنه ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'استوديو التصوير جاهز لعرض باقاتك وأسعارك من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    autoparts: {
      key: 'autoparts',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['installation', 'warranty', 'exchange_return', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب، ضمان، استبدال واسترجاع، توصيل',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'carMake', label: 'ماركة السيارة المناسبة', placeholder: 'مثال: تويوتا، هيونداي', maxLength: 40 },
        { key: 'carModel', label: 'الموديل وسنة الصنع', placeholder: 'مثال: كورولا 2015-2020', maxLength: 40 },
        { key: 'partNumber', label: 'رقم القطعة', placeholder: 'مثال: 04152-YZZA1', maxLength: 30 },
        { key: 'partQuality', label: 'نوع القطعة', type: 'choice', options: ['أصلية', 'تجارية (بديلة)'] },
        { key: 'condition', label: 'الحالة', type: 'choice', options: ['جديد', 'مستعمل'] }
      ],
      productHints: { name: 'مثال: فلتر زيت تويوتا كورولا', details: 'مثال: يناسب محرك 1.6 و1.8', brand: 'مثال: اسم الشركة المصنعة' },
      suggestedCategories: ['فلاتر وزيوت', 'فرامل وتيل', 'كهرباء وبطاريات', 'محرك وتبريد', 'تعليق وتوجيه', 'إكسسوارات وزينة'],
      heroWelcomeText: 'محلك جاهز لعرض قطع الغيار وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    garage: {
      key: 'garage',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: false,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['free_inspection', 'towing', 'warranty', 'cash_payment', 'card_payment'],
      servicesNavSub: 'فحص مبدئي، سحب سيارات، ضمان على العمل',
      serviceItemsNav: {
        icon: 'wrench',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الأسعار',
        sub: 'ميكانيك، كهرباء، سمكرة، أسعار',
        cardSub: 'الخدمات والأسعار ومدة التنفيذ'
      },
      serviceFields: ['duration', 'priceFrom'],
      serviceExtraFields: [
        { key: 'carType', label: 'نوع السيارة (اختياري)', placeholder: 'مثال: صغيرة، جيب، تجارية', maxLength: 40 },
        { key: 'warranty', label: 'الضمان على العمل', placeholder: 'مثال: شهر، 3 شهور' }
      ],
      serviceSuggestions: [
        { id: 'gr_oil', label: 'تغيير زيت وفلتر', icon: 'droplets' },
        { id: 'gr_scan', label: 'فحص كمبيوتر', icon: 'scan' },
        { id: 'gr_mech', label: 'ميكانيك عام', icon: 'wrench' },
        { id: 'gr_elec', label: 'كهرباء سيارات', icon: 'zap' },
        { id: 'gr_body', label: 'سمكرة ودهان', icon: 'brush' },
        { id: 'gr_precheck', label: 'فحص قبل الشراء', icon: 'search' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف خدمة مثل تغيير الزيت أو الفحص بالكمبيوتر مع سعرها ومدة تنفيذها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'كراجك جاهز لعرض خدماتك وأسعارك من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    tires: {
      key: 'tires',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['tire_fitting', 'warranty', 'delivery', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب وترصيص، ضمان، توصيل',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'tireSize', label: 'المقاس', placeholder: 'مثال: 205/55 R16', maxLength: 30 },
        { key: 'season', label: 'النوع', type: 'choice', options: ['صيفي', 'شتوي', 'لكل المواسم'] },
        { key: 'mfgYear', label: 'سنة الصنع', placeholder: 'مثال: 2024', maxLength: 10 },
        { key: 'condition', label: 'الحالة', type: 'choice', options: ['جديد', 'مستعمل'] }
      ],
      productHints: { name: 'مثال: إطار ميشلان 205/55 R16', details: 'مثال: مناسب للسيارات الصغيرة والمتوسطة', brand: 'مثال: ميشلان، بريجستون، هانكوك' },
      suggestedCategories: ['إطارات سيارات صغيرة', 'إطارات جيب ودفع رباعي', 'إطارات شاحنات', 'جنطات', 'بطاريات', 'ملحقات وصمامات'],
      heroWelcomeText: 'محلك جاهز لعرض الإطارات وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    vet: {
      key: 'vet',
      freeLimits: { productCategories: 5 },
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hasServiceItems: true,
      hiddenServices: [],
      serviceIds: ['emergency_24h', 'home_visit', 'vaccinations', 'cash_payment', 'card_payment'],
      servicesNavSub: 'طوارئ 24 ساعة، زيارة منزلية، تطعيمات',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'animalType', label: 'نوع الحيوان', type: 'choice', options: ['أبقار', 'أغنام وماعز', 'دواجن', 'قطط وكلاب', 'خيول', 'عام'] },
        { key: 'expiry', label: 'تاريخ الانتهاء', placeholder: 'مثال: 2027/03', maxLength: 20 }
      ],
      productHints: { name: 'مثال: مضاد حيوي للأغنام', details: 'مثال: حقن، عبوة 50 مل', brand: 'مثال: اسم الشركة المصنعة' },
      suggestedCategories: ['أدوية بيطرية', 'لقاحات', 'فيتامينات ومكملات', 'مستلزمات قطط وكلاب', 'أدوات جراحية وحقن', 'مطهرات ومعقمات'],
      serviceItemsNav: {
        icon: 'stethoscope',
        label: 'الخدمات والأسعار',
        mobileLabel: 'الخدمات',
        sub: 'كشف، تطعيم، علاج، أسعار',
        cardSub: 'الخدمات البيطرية وأسعارها'
      },
      serviceFields: ['priceFrom'],
      serviceExtraFields: [
        { key: 'animalType', label: 'نوع الحيوان', type: 'choice', options: ['أبقار', 'أغنام وماعز', 'دواجن', 'قطط وكلاب', 'خيول', 'عام'] }
      ],
      serviceSuggestions: [
        { id: 'vt_exam', label: 'كشف وفحص', icon: 'stethoscope' },
        { id: 'vt_vaccine', label: 'تطعيم', icon: 'syringe' },
        { id: 'vt_wound', label: 'علاج جروح وتضميد', icon: 'heart-pulse' },
        { id: 'vt_birth', label: 'ولادة وتوليد', icon: 'baby' },
        { id: 'vt_lab', label: 'تحاليل', icon: 'flask-conical' }
      ],
      pageCopy: {
        servicesPageTitle: 'الخدمات والأسعار',
        servicesEmptyText: 'أضف خدمة مثل الكشف أو التطعيم أو العلاج مع سعرها ليطّلع عليها الزوار قبل زيارتك'
      },
      heroWelcomeText: 'عيادتك البيطرية جاهزة لعرض خدماتك ومنتجاتك وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    feed: {
      key: 'feed',
      freeLimits: {},
      hasDiscounts: false,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['delivery', 'wholesale', 'cash_payment', 'card_payment'],
      servicesNavSub: 'توصيل، بيع بالجملة',
      productFields: ['details', 'brand'],
      productExtraFields: [
        { key: 'animalType', label: 'نوع الحيوان', type: 'choice', options: ['أبقار', 'أغنام وماعز', 'دواجن', 'قطط وكلاب', 'أسماك', 'أخرى'] },
        { key: 'packSize', label: 'الوزن / العبوة', placeholder: 'مثال: 25 كيلو', maxLength: 30 },
        { key: 'expiry', label: 'تاريخ الانتهاء', placeholder: 'مثال: 2027/03', maxLength: 20 }
      ],
      productHints: { name: 'مثال: علف دواجن تسمين 25 كيلو', details: 'مثال: نسبة بروتين 21%', brand: 'مثال: اسم الشركة المصنعة' },
      suggestedCategories: ['أعلاف دواجن', 'أعلاف أبقار وأغنام', 'طعام قطط وكلاب', 'مكملات غذائية', 'أدوات تغذية وسقاية', 'مستلزمات حظائر'],
      heroWelcomeText: 'محلك جاهز لعرض الأعلاف والمستلزمات وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    },
    agritools: {
      key: 'agritools',
      freeLimits: { productCategories: 5, discountedProducts: 5 },
      hasDiscounts: true,
      hasAppointments: false,
      hasProducts: true,
      hiddenServices: [],
      serviceIds: ['installation', 'warranty', 'after_sales', 'delivery', 'installments', 'cash_payment', 'card_payment'],
      servicesNavSub: 'تركيب، ضمان، صيانة، توصيل، تقسيط',
      productFields: ['details', 'brand', 'material'],
      productExtraFields: [
        { key: 'powerType', label: 'نوع التشغيل', type: 'choice', options: ['يدوي', 'كهربائي', 'بنزين / ديزل', 'طاقة شمسية'] },
        { key: 'warranty', label: 'الضمان', placeholder: 'مثال: سنة' }
      ],
      productHints: { name: 'مثال: مضخة مياه زراعية', details: 'مثال: قوة 2 حصان، مناسبة للري', brand: 'مثال: اسم الشركة المصنعة', material: 'مثال: حديد، بلاستيك، ستانلس' },
      suggestedCategories: ['أدوات يدوية', 'مضخات وري', 'بذور وشتلات', 'أسمدة ومبيدات', 'بيوت بلاستيكية ومستلزماتها', 'معدات كهربائية'],
      heroWelcomeText: 'محلك جاهز لعرض الأدوات الزراعية وأسعارها من هنا.',
      adTypes: ['offer', 'job'],
      adOptions: { offerPrices: true, linkOnlyForJob: true, limitNotice: true, expiryNotice: true }
    }
  };

  var STORE_SUBCATEGORY_VARIANT = {
    'General Grocery': 'grocery',
    'Supermarket': 'grocery',
    'Vegetables & Fruits': 'produce',
    'Meat': 'butcher',
    'Fish': 'fish',
    'Bakery': 'bakery',
    'Sweets & Pastries': 'sweets',
    'Spices & Herbs': 'spices',
    'Pharmacy': 'pharmacy',
    'Clinic & Medicine': 'clinic',
    'Medical Supplies': 'medical',
    'Optics': 'optics',
    "Men's Clothing": 'menswear',
    "Women's Clothing": 'womenswear',
    "Kids' Clothing": 'kidswear',
    'Shoes': 'shoes',
    'Accessories': 'accessories',
    'Tailoring': 'tailoring',
    'Home Furniture': 'furniture',
    'Furnishings & Curtains': 'furnishings',
    'Household Tools': 'household',
    'Electrical & Home Appliances': 'appliances',
    'Cleaning Supplies': 'cleaning',
    'Plumbing Supplies': 'plumbing',
    'Mobile & Accessories': 'mobile',
    'Computers & Laptops': 'computers',
    'Electronics': 'electronics',
    'Solar Energy': 'solar',
    'Repair & Maintenance': 'repair',
    'Building Materials': 'buildingmat',
    'Iron & Aluminum': 'ironalu',
    'Paints & Decor': 'paintsdecor',
    'Wood': 'wood',
    'Ceramics & Tiles': 'tiles',
    'Bookstore & Stationery': 'stationery',
    "Children's Toys": 'toys',
    'Art & Drawing Tools': 'artsupplies',
    "Men's Salon": 'salonmen',
    "Women's Salon": 'salonwomen',
    'Laundry': 'laundry',
    'Photography': 'photography',
    'Spare Parts': 'autoparts',
    'Garage & Service': 'garage',
    'Tires': 'tires',
    'Veterinary': 'vet',
    'Fodder & Supplies': 'feed',
    'Agricultural Tools': 'agritools'
  };

  var STORE_SUBCATEGORY_AR_TO_ID = {
    'بقالة عامة': 'General Grocery',
    'سوبرماركت': 'Supermarket',
    'خضار وفواكه': 'Vegetables & Fruits',
    'لحوم': 'Meat',
    'أسماك': 'Fish',
    'مخبز': 'Bakery',
    'حلويات ومعجنات': 'Sweets & Pastries',
    'بهارات وأعشاب': 'Spices & Herbs',
    'صيدلية': 'Pharmacy',
    'عيادة وطب': 'Clinic & Medicine',
    'مستلزمات طبية': 'Medical Supplies',
    'بصريات': 'Optics',
    'ملابس رجالية': "Men's Clothing",
    'ملابس نسائية': "Women's Clothing",
    'ملابس أطفال': "Kids' Clothing",
    'أحذية': 'Shoes',
    'إكسسوارات': 'Accessories',
    'خياطة': 'Tailoring',
    'أثاث منزلي': 'Home Furniture',
    'مفروشات وستائر': 'Furnishings & Curtains',
    'أدوات منزلية': 'Household Tools',
    'كهربائيات وأجهزة منزلية': 'Electrical & Home Appliances',
    'مواد تنظيف': 'Cleaning Supplies',
    'أدوات صحية': 'Plumbing Supplies',
    'موبايل وإكسسوارات': 'Mobile & Accessories',
    'كمبيوتر ولابتوب': 'Computers & Laptops',
    'إلكترونيات': 'Electronics',
    'طاقة شمسية': 'Solar Energy',
    'تصليح وصيانة': 'Repair & Maintenance',
    'مواد بناء': 'Building Materials',
    'حديد وألمنيوم': 'Iron & Aluminum',
    'دهانات وديكور': 'Paints & Decor',
    'خشب': 'Wood',
    'سيراميك وبلاط': 'Ceramics & Tiles',
    'مكتبة وقرطاسية': 'Bookstore & Stationery',
    'ألعاب أطفال': "Children's Toys",
    'أدوات فن ورسم': 'Art & Drawing Tools',
    'صالون رجالي': "Men's Salon",
    'صالون نسائي': "Women's Salon",
    'مغسلة': 'Laundry',
    'تصوير': 'Photography',
    'قطع غيار': 'Spare Parts',
    'كراج وخدمة': 'Garage & Service',
    'إطارات': 'Tires',
    'بيطري': 'Veterinary',
    'أعلاف ومستلزمات': 'Fodder & Supplies',
    'أدوات زراعية': 'Agricultural Tools',
    'متنوع': 'Miscellaneous',
    'أخرى': 'Other'
  };

  var CLOTHING_ONLY_SERVICE_IDS = ['size_exchange', 'alteration', 'whatsapp_order'];
  var TAILORING_ONLY_SERVICE_IDS = ['fitting', 'home_measurement', 'fabric_supply', 'urgent_service'];
  var HOME_ONLY_SERVICE_IDS = ['furniture_assembly', 'custom_order', 'installments', 'after_sales', 'bridal_sets', 'wholesale', 'refill', 'technical_consultation'];
  var CONSTRUCTION_ONLY_SERVICE_IDS = ['color_mixing', 'cut_to_size', 'quantity_calc'];
  var OTHER_GROUPS_ONLY_SERVICE_IDS = ['printing_copying', 'home_visit', 'free_inspection', 'towing', 'tire_fitting', 'emergency_24h', 'outdoor_shoot', 'photo_printing'];
  var HEALTH_ONLY_SERVICE_IDS = ['delivery', 'night_duty', 'prescription_order', 'device_rental', 'eye_exam', 'lens_fitting', 'health_check', 'injections', 'device_maintenance', 'glasses_repair', 'consultation', 'lab_tests', 'xray', 'vaccinations'];

  var storeConfigCache = {};

  function getProductsNoun(count) {
    return count >= 3 && count <= 10 ? 'منتجات' : 'منتج';
  }

  function buildStoreLimits(variant) {
    var free = {};
    Object.keys(STORE_BASE_FREE_LIMITS).forEach(function (key) {
      if (variant.hasProducts === false && (key === 'products' || key === 'productCategories')) return;
      free[key] = STORE_BASE_FREE_LIMITS[key];
    });
    Object.keys(variant.freeLimits).forEach(function (key) { free[key] = variant.freeLimits[key]; });
    var paid = {};
    Object.keys(free).forEach(function (key) { paid[key] = null; });
    return { free: free, paid: paid };
  }

  function omitTableLimits(limits) {
    var result = {};
    Object.keys(limits).forEach(function (plan) {
      result[plan] = {};
      Object.keys(limits[plan]).forEach(function (key) {
        if (key !== 'tables' && key !== 'reservations') result[plan][key] = limits[plan][key];
      });
    });
    return result;
  }

  var TYPES = {

    cowork: {
      id: 'cowork',
      label: 'مساحة عمل',
      fallbackAvatarLetter: 'م',
      lockedFeatures: { free: ['qrCode', 'subscriptionRequests'], paid: [] },
      sidebar: [
        { page: 'dashboard', href: 'dashboard.html', icon: 'layout-grid', label: 'الرئيسية', sub: 'نظرة عامة على مساحتك' },
        { action: 'open-prices-edit', href: '#', icon: 'tag', label: 'الأسعار والأوقات', sub: 'أسعار الساعة/اليوم، مواعيد العمل' },
        { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة', sub: 'واي فاي، كهرباء، طباعة، مشروبات' },
        { page: 'subscribers', href: 'subscribers.html', icon: 'users', label: 'المشتركين', sub: 'إضافة، تجديد، إنهاء الاشتراك' },
        { page: 'subscription-requests', href: 'subscription-requests.html', icon: 'thumbs-up', label: 'طلبات الاشتراك', sub: 'طلبات وصلتك أونلاين للموافقة', lockedFeature: 'subscriptionRequests' },
        { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات', sub: 'فعاليات، ورش، وظائف، عروض' },
        { page: 'packages', href: 'packages.html', icon: 'layers', label: 'الباقات', sub: 'اختر باقة مساحتك' },
        { page: 'profile', href: 'profile.html', icon: 'store', label: 'بروفايل المساحة', sub: 'تعديل المعلومات والصورة' }
      ],
      mobileNav: [
        { page: 'dashboard', href: 'dashboard.html', icon: 'layout-grid', label: 'الرئيسية' },
        { action: 'open-prices-edit', href: '#', icon: 'tag', label: 'الأسعار والأوقات' },
        { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة' },
        { page: 'subscribers', href: 'subscribers.html', icon: 'users', label: 'المشتركين' },
        { page: 'subscription-requests', href: 'subscription-requests.html', icon: 'thumbs-up', label: 'طلبات الاشتراك', lockedFeature: 'subscriptionRequests' },
        { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات' }
      ],
      services: [
        { id: 'wifi', label: 'WiFi' },
        { id: 'electricity', label: 'كهرباء' },
        { id: 'printing', label: 'طباعة' },
        { id: 'screens', label: 'شاشات' },
        { id: 'private_rooms', label: 'غرف خاصة' },
        { id: 'drinks', label: 'مشروبات' }
      ],
      dashboardCards: [
        { action: 'open-services-edit', href: '#', icon: 'wifi', label: 'الخدمات المتاحة', sub: 'واي فاي، كهرباء' },
        { action: 'open-prices-edit', href: '#', icon: 'tag', label: 'الأسعار والأوقات', sub: 'أسعار، مواعيد' },
        { page: 'subscription-requests', href: 'subscription-requests.html', icon: 'thumbs-up', label: 'طلبات الاشتراك', sub: 'للموافقة أونلاين', lockedFeature: 'subscriptionRequests' },
        { page: 'subscribers', href: 'subscribers.html', icon: 'users', label: 'المشتركين', sub: 'إضافة، تجديد' }
      ],
      pageCopy: {
        profileTitle: 'بيانات المساحة',
        entityNameLabel: 'اسم المساحة',
        adsSubtitle: 'فعاليات، ورش، وظائف، عروض تظهر في صفحة مساحتك',
        heroWelcomeText: 'مساحتك جاهزة لبدء استقبال طلباتك وخدماتك من هنا.',
        fallbackName: 'مساحتي',
        entityPossessive: 'مساحتك',
        previewLabel: 'معاينة مساحتي'
      },
      packages: {
        pageSubtitle: 'اختر باقة مساحتك',
        entityNameLabel: 'اسم المساحة',
        free: {
          eyebrow: 'FREE',
          name: 'مجاني',
          desc: 'لوحة تحكم ومعلومات أساسية لمساحتك',
          price: 0,
          features: [
            { label: 'صفحة خاصة بالـ Workspace على GazaMarket', on: true },
            { label: 'لوحة تحكم لإدارة مساحتك', on: true },
            { label: 'المعلومات الأساسية (الأسعار، الأوقات، الخدمات)', on: true },
            { label: 'إدارة المشتركين', on: false },
            { label: 'استقبال طلبات الاشتراك أونلاين', on: false },
            { label: 'نظام حجز غرف الاجتماعات', on: false },
            { label: 'نشر إعلانات غير محدودة', on: false },
            { label: 'إشعارات تجديد الاشتراكات', on: false },
            { label: 'QR لتسجيل حضور الفعاليات', on: false }
          ]
        },
        paid: {
          id: 'workspace',
          eyebrow: 'WORKSPACE',
          badge: 'باقة المساحة',
          name: 'Workspace',
          desc: 'كل ما تحتاجه لإدارة مساحتك ومشتركيك',
          price: 99,
          buttonLabel: 'اشترك في باقة المساحة',
          whatsappMessage: 'السلام عليكم، قمت بتحويل مبلغ 99 ₪ لاشتراك باقة Workspace، وهذا إشعار التحويل.',
          features: [
            'صفحة خاصة بالـ Workspace على GazaMarket',
            'إدارة المشتركين (إضافة، تجديد، انتهاء الاشتراك)',
            'استقبال طلبات الاشتراك أونلاين',
            'نظام حجز غرف الاجتماعات',
            'نشر عدد غير محدود من الإعلانات (فعاليات، ورش، وظائف، عروض)',
            'لوحة تحكم: عدد المشتركين، الحجوزات، نسبة إشغال الغرف، مشاهدات الإعلانات',
            'إشعارات لتجديد الاشتراكات',
            'QR Code لتسجيل حضور الفعاليات'
          ]
        }
      }
    },

    restaurant: buildFoodTypeConfig('restaurant', 'مطعم', {
      hasTableBooking: false,
      adTypes: ['offer', 'job'],
      adOptions: { linkOnlyForJob: true },
      adsSubtitle: 'عروض ووظائف تظهر في صفحة نشاطك',
      adsNavSub: 'عروض ووظائف',
      adsPaidLabel: 'نشر عدد غير محدود من الإعلانات (عروض ووظائف)'
    }),
    cafe: buildFoodTypeConfig('cafe', 'كافيه', { hasTableBooking: true }),
    'restaurant-cafe': buildFoodTypeConfig('restaurant-cafe', 'مطعم وكافيه', { hasTableBooking: true }),

    store: buildStoreTypeConfig('store', 'متجر', STORE_VARIANTS.general)

  };

  function buildFoodTypeConfig(id, label, opts) {
    opts = opts || {};
    var hasTableBooking = !!opts.hasTableBooking;

    var sidebar = [
      { page: 'dashboard', href: 'dashboard.html', icon: 'layout-grid', label: 'الرئيسية', sub: 'نظرة عامة على نشاطك' },
      { page: 'menu', href: 'menu.html', icon: 'utensils', label: 'المنيو', sub: 'التصنيفات، الأصناف، الأسعار' },
      { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة', sub: 'المكيف، جلسات خارجية، وأكثر' }
    ];

    var mobileNav = [
      { page: 'dashboard', href: 'dashboard.html', icon: 'layout-grid', label: 'الرئيسية' },
      { page: 'menu', href: 'menu.html', icon: 'utensils', label: 'المنيو' },
      { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة' }
    ];

    var dashboardCards = [
      { page: 'menu', href: 'menu.html', icon: 'utensils', label: 'المنيو', sub: 'التصنيفات والأسعار' },
      { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة', sub: 'المكيف، جلسات خارجية' }
    ];

    if (hasTableBooking) {
      sidebar.push(
        { page: 'tables', href: 'tables.html', icon: 'armchair', label: 'الطاولات', sub: 'عدد الطاولات وحالتها' },
        { page: 'reservations', href: 'reservations.html', icon: 'calendar-check', label: 'الحجوزات', sub: 'طلبات حجز الطاولات الواصلة' }
      );
      mobileNav.push(
        { page: 'tables', href: 'tables.html', icon: 'armchair', label: 'الطاولات' },
        { page: 'reservations', href: 'reservations.html', icon: 'calendar-check', label: 'الحجوزات' }
      );
      dashboardCards.push(
        { page: 'reservations', href: 'reservations.html', icon: 'calendar-check', label: 'الحجوزات', sub: 'طلبات وصلتك أونلاين' },
        { page: 'tables', href: 'tables.html', icon: 'armchair', label: 'الطاولات', sub: 'إدارة عدد وحالة الطاولات' }
      );
    }

    sidebar.push(
      { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات', sub: opts.adsNavSub || 'فعاليات، عروض، وظائف' },
      { page: 'packages', href: 'packages.html', icon: 'layers', label: 'الباقات', sub: 'اختر باقة نشاطك' },
      { page: 'profile', href: 'profile.html', icon: 'store', label: 'بروفايل النشاط', sub: 'تعديل المعلومات والصورة' }
    );
    mobileNav.push(
      { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات' }
    );

    var freeFeatures = [
      { label: 'صفحة خاصة بنشاطك على GazaMarket', on: true },
      { label: 'لوحة تحكم لإدارة نشاطك', on: true },
      { label: 'المنيو (حتى ' + FOOD_PLAN_LIMITS.free.menuItems + ' أصناف)', on: true },
      { label: 'حتى ' + FOOD_PLAN_LIMITS.free.menuCategories + ' تصنيفات للمنيو', on: true },
      { label: 'نشر حتى ' + FOOD_PLAN_LIMITS.free.ads + ' إعلانات', on: true },
      { label: 'الخدمات المتاحة الأساسية', on: true },
      { label: 'إشعارات لوحة التحكم', on: true }
    ];
    if (hasTableBooking) {
      freeFeatures.push(
        { label: 'إضافة حتى ' + FOOD_PLAN_LIMITS.free.tables + ' طاولات', on: true },
        { label: 'استقبال حتى ' + FOOD_PLAN_LIMITS.free.reservations + ' حجوزات', on: true }
      );
    }
    freeFeatures.push(
      { label: 'منيو غير محدود', on: false },
      { label: 'إعلانات غير محدودة', on: false }
    );
    if (hasTableBooking) {
      freeFeatures.push(
        { label: 'طاولات غير محدودة', on: false },
        { label: 'حجوزات غير محدودة', on: false }
      );
    }
    freeFeatures.push(
      { label: 'شارة "مميز" وأولوية الظهور', on: false },
      { label: 'إحصائيات النشاط', on: false },
      { label: 'كود QR لصفحة النشاط', on: false },
      { label: 'المشاركة عبر واتساب', on: false },
      { label: 'إظهار الدفع بالبطاقة للزوار', on: false },
      { label: 'إشعارات فورية', on: false }
    );

    var paidFeatures = [
      'صفحة خاصة بنشاطك على GazaMarket',
      'لوحة تحكم لإدارة نشاطك',
      'منيو غير محدود (تصنيفات وأصناف بلا حدود)',
      opts.adsPaidLabel || 'نشر عدد غير محدود من الإعلانات (عروض، فعاليات، وظائف)'
    ];
    if (hasTableBooking) {
      paidFeatures.push(
        'طاولات غير محدودة',
        'استقبال حجوزات غير محدودة أونلاين'
      );
    }
    paidFeatures.push(
      'شارة "مميز" وأولوية الظهور في نتائج البحث',
      'إحصائيات النشاط (مشاهدات الصفحة، مشاهدات المنيو، تفاعل الإعلانات)',
      'كود QR لصفحة النشاط',
      'مشاركة صفحة النشاط مباشرة عبر واتساب',
      'إظهار الدفع بالبطاقة للزوار في صفحة النشاط',
      'إشعارات فورية (تنبيهات، تذكير تجديد)'
    );

    return {
      id: id,
      label: label,
      fallbackAvatarLetter: 'ن',
      hasTableBooking: hasTableBooking,
      
      sidebar: sidebar,
      mobileNav: mobileNav,
      services: [
        { id: 'ac', label: 'المكيف', icon: 'air-vent' },
        { id: 'family_section', label: 'قسم خاص للعائلات', icon: 'users' },
        { id: 'outdoor_seating', label: 'جلسات خارجية', icon: 'armchair' },
        { id: 'payment_methods', label: 'نقبل الدفع كاش وتطبيق', icon: 'banknote-arrow-up' },
        { id: 'payment_methods-tow', label: 'نقبل الدفع عبر البطاقة', icon: 'credit-card-check' },
        { id: 'parking', label: 'موقف سيارات', icon: 'car' }
      ],
      dashboardCards: dashboardCards,
      limits: hasTableBooking ? FOOD_PLAN_LIMITS : omitTableLimits(FOOD_PLAN_LIMITS),
      lockedFeatures: FOOD_LOCKED_FEATURES,
      adTypes: opts.adTypes || ['activity', 'offer'],
      adOptions: opts.adOptions || {},
      pageCopy: {
        profileTitle: 'بيانات النشاط',
        entityNameLabel: 'اسم النشاط',
        adsSubtitle: opts.adsSubtitle || 'عروض وفعاليات تظهر في صفحة نشاطك',
        heroWelcomeText: 'نشاطك جاهز لبدء استقبال طلباتك وخدماتك من هنا.',
        fallbackName: 'نشاطي',
        entityPossessive: 'نشاطك',
        previewLabel: 'معاينة نشاطي'
      },
      packages: {
        pageSubtitle: 'اختر باقة نشاطك',
        entityNameLabel: 'اسم النشاط',
        free: {
          eyebrow: 'FREE',
          name: 'مجاني',
          desc: 'لوحة تحكم ومعلومات أساسية لنشاطك',
          price: 0,
          features: freeFeatures
        },
        paid: {
          id: 'premium',
          eyebrow: 'PREMIUM',
          badge: 'الباقة المميزة',
          name: 'المميزة',
          desc: 'كل ما يحتاجه نشاطك ليظهر بأفضل شكل ويتفاعل معاه الزباين أكتر',
          price: 99,
          buttonLabel: 'اشترك في الباقة المميزة',
          whatsappMessage: 'السلام عليكم، قمت بتحويل مبلغ 99 ₪ لاشتراك الباقة المميزة، وهذا إشعار التحويل.',
          features: paidFeatures
        }
      }
    };
  }

  function buildStoreTypeConfig(id, label, variant) {
    var limits = buildStoreLimits(variant);
    var free = limits.free;

    var serviceCatalog = [
      { id: 'installation', label: 'تركيب فني', icon: 'wrench' },
      { id: 'cash_payment', label: 'نقبل الدفع كاش وتطبيق', icon: 'banknote-arrow-up' },
      { id: 'card_payment', label: 'دفع بالبطاقة', icon: 'credit-card' },
      { id: 'warranty', label: 'ضمان على المنتجات', icon: 'shield-check' },
      { id: 'gift_wrap', label: 'تغليف هدايا', icon: 'gift' },
      { id: 'exchange_return', label: 'استبدال واسترجاع', icon: 'repeat' },
      { id: 'size_exchange', label: 'تبديل المقاسات', icon: 'ruler' },
      { id: 'alteration', label: 'تعديل المقاس / الخياطة', icon: 'scissors' },
      { id: 'fitting', label: 'بروفة قبل التسليم', icon: 'ruler' },
      { id: 'home_measurement', label: 'أخذ المقاسات في المنزل', icon: 'house' },
      { id: 'fabric_supply', label: 'توفير الأقمشة', icon: 'swatch-book' },
      { id: 'urgent_service', label: 'تنفيذ سريع', icon: 'zap' },
      { id: 'whatsapp_order', label: 'الطلب عبر واتساب', icon: 'message-circle' },
      { id: 'delivery', label: 'خدمة توصيل', icon: 'truck' },
      { id: 'night_duty', label: 'مناوبة ليلية', icon: 'moon' },
      { id: 'prescription_order', label: 'استقبال الوصفات الطبية', icon: 'file-text' },
      { id: 'device_rental', label: 'تأجير أجهزة طبية', icon: 'calendar-clock' },
      { id: 'eye_exam', label: 'فحص نظر', icon: 'eye' },
      { id: 'lens_fitting', label: 'تركيب عدسات', icon: 'glasses' },
      { id: 'health_check', label: 'قياس ضغط وسكر', icon: 'heart-pulse' },
      { id: 'injections', label: 'حقن وتضميد', icon: 'syringe' },
      { id: 'device_maintenance', label: 'صيانة أجهزة طبية', icon: 'settings' },
      { id: 'glasses_repair', label: 'صيانة وتعديل النظارات', icon: 'hammer' },
      { id: 'consultation', label: 'كشفية', icon: 'stethoscope' },
      { id: 'lab_tests', label: 'تحاليل مخبرية', icon: 'flask-conical' },
      { id: 'xray', label: 'أشعة', icon: 'scan' },
      { id: 'vaccinations', label: 'تطعيمات', icon: 'shield-plus' },
      { id: 'furniture_assembly', label: 'فك وتركيب', icon: 'wrench' },
      { id: 'custom_order', label: 'تفصيل حسب الطلب', icon: 'pencil-ruler' },
      { id: 'installments', label: 'تقسيط', icon: 'calendar-clock' },
      { id: 'after_sales', label: 'صيانة وخدمة ما بعد البيع', icon: 'hammer' },
      { id: 'bridal_sets', label: 'تجهيز جهاز العرسان', icon: 'sparkles' },
      { id: 'wholesale', label: 'بيع بالجملة', icon: 'boxes' },
      { id: 'refill', label: 'تعبئة سوائل بالوزن', icon: 'droplets' },
      { id: 'technical_consultation', label: 'استشارة فنية', icon: 'lightbulb' },
      { id: 'color_mixing', label: 'خلط ألوان بالكمبيوتر', icon: 'palette' },
      { id: 'cut_to_size', label: 'قص حسب المقاس', icon: 'scissors' },
      { id: 'quantity_calc', label: 'حساب الكمية من المساحة', icon: 'calculator' },
      { id: 'printing_copying', label: 'طباعة وتصوير مستندات', icon: 'printer' },
      { id: 'home_visit', label: 'زيارة منزلية', icon: 'house' },
      { id: 'free_inspection', label: 'فحص مبدئي مجاني', icon: 'search' },
      { id: 'towing', label: 'سحب سيارات', icon: 'truck' },
      { id: 'tire_fitting', label: 'تركيب وترصيص إطارات', icon: 'circle-dot' },
      { id: 'emergency_24h', label: 'طوارئ 24 ساعة', icon: 'siren' },
      { id: 'outdoor_shoot', label: 'تصوير خارجي', icon: 'map-pin' },
      { id: 'photo_printing', label: 'طباعة صور وألبومات', icon: 'image' }
    ];

    var services;
    if (Array.isArray(variant.serviceIds)) {
      services = variant.serviceIds.map(function (serviceId) {
        return serviceCatalog.filter(function (service) { return service.id === serviceId; })[0];
      }).filter(Boolean);
    } else {
      services = serviceCatalog.filter(function (service) {
        return service.id !== 'cash_payment' &&
          CLOTHING_ONLY_SERVICE_IDS.indexOf(service.id) === -1 &&
          TAILORING_ONLY_SERVICE_IDS.indexOf(service.id) === -1 &&
          HOME_ONLY_SERVICE_IDS.indexOf(service.id) === -1 &&
          HEALTH_ONLY_SERVICE_IDS.indexOf(service.id) === -1 &&
          CONSTRUCTION_ONLY_SERVICE_IDS.indexOf(service.id) === -1 &&
          OTHER_GROUPS_ONLY_SERVICE_IDS.indexOf(service.id) === -1 &&
          variant.hiddenServices.indexOf(service.id) === -1;
      });
    }

    var hasOfferJobAds = Array.isArray(variant.adTypes);
    var freeAdsLabel = 'نشر حتى ' + free.ads + ' إعلانات' + (hasOfferJobAds ? ' (عروض ووظائف)' : '');
    var paidAdsLabel = hasOfferJobAds
      ? 'نشر عدد غير محدود من الإعلانات (عروض، وظائف)'
      : 'نشر عدد غير محدود من الإعلانات (عروض، تخفيضات، منتجات جديدة)';

    var hasProducts = variant.hasProducts !== false;
    var hasInstallments = services.some(function (service) { return service.id === 'installments'; });

    var freeFeatures = [
      { label: 'صفحة خاصة بمتجرك على GazaMarket', on: true },
      { label: 'لوحة تحكم لإدارة متجرك', on: true }
    ];
    if (hasProducts) {
      freeFeatures.push(
        { label: 'إضافة حتى ' + free.products + ' ' + getProductsNoun(free.products), on: true },
        { label: 'حتى ' + free.productCategories + ' تصنيفات للمنتجات', on: true }
      );
    }
    freeFeatures.push(
      { label: 'الخدمات المتاحة', on: true },
      { label: freeAdsLabel, on: true }
    );
    if (variant.hasDiscounts) {
      freeFeatures.push({ label: 'تفعيل الخصم لحتى ' + free.discountedProducts + ' منتجات', on: true });
    }
    if (variant.hasAppointments) {
      freeFeatures.push({ label: 'استقبال حتى ' + free.appointments + ' حجوزات مواعيد', on: true });
    }
    if (variant.hasWhatsappOrder) {
      freeFeatures.push({ label: 'الطلب عبر واتساب', on: false });
    }
    freeFeatures.push(
      { label: 'إشعارات لوحة التحكم', on: true }
    );
    if (hasProducts) {
      freeFeatures.push({ label: 'منتجات وتصنيفات غير محدودة', on: false });
    }
    freeFeatures.push({ label: 'إعلانات غير محدودة', on: false });
    if (variant.hasDiscounts) {
      freeFeatures.push({ label: 'خصم غير محدود على المنتجات', on: false });
    }
    if (variant.hasAppointments) {
      freeFeatures.push({ label: 'حجوزات مواعيد غير محدودة', on: false });
    }
    if (hasInstallments) {
      freeFeatures.push({ label: 'إظهار خدمة التقسيط للزوار', on: false });
    }
    freeFeatures.push(
      { label: 'شارة "مميز" وأولوية الظهور', on: false },
      { label: 'إحصائيات المتجر', on: false },
      { label: 'كود QR لصفحة المتجر', on: false },
      { label: 'المشاركة عبر واتساب', on: false },
      { label: 'إظهار الدفع بالبطاقة للزوار', on: false },
      { label: 'إشعارات فورية', on: false }
    );

    var servicesNavSub = variant.servicesNavSub || 'تركيب، ضمان، استبدال';
    var adsNavSub = hasOfferJobAds ? 'عروض ووظائف' : 'عروض وتخفيضات';
    var adsSubtitle = hasOfferJobAds
      ? 'عروض ووظائف تظهر في صفحة متجرك'
      : 'عروض وتخفيضات ومنتجات جديدة تظهر في صفحة متجرك';

    var paidFeatures = [
      'صفحة خاصة بمتجرك على GazaMarket',
      'لوحة تحكم لإدارة متجرك'
    ];
    if (hasProducts) {
      paidFeatures.push('منتجات وتصنيفات غير محدودة');
    }
    paidFeatures.push(paidAdsLabel);
    if (variant.hasDiscounts) {
      paidFeatures.push('تفعيل الخصم على عدد غير محدود من المنتجات');
    }
    if (variant.hasAppointments) {
      paidFeatures.push('استقبال حجوزات مواعيد غير محدودة أونلاين');
    }
    if (variant.hasWhatsappOrder) {
      paidFeatures.push('استقبال طلبات الزباين عبر واتساب');
    }
    if (hasInstallments) {
      paidFeatures.push('إظهار خدمة التقسيط للزوار في صفحة المتجر');
    }
    paidFeatures.push(
      'شارة "مميز" وأولوية الظهور في نتائج البحث',
      'إحصائيات المتجر (مشاهدات الصفحة، مشاهدات المنتجات، تفاعل الإعلانات)',
      'كود QR لصفحة المتجر',
      'مشاركة صفحة المتجر مباشرة عبر واتساب',
      'إظهار الدفع بالبطاقة للزوار في صفحة المتجر',
      'إشعارات فورية (تنبيهات، تذكير تجديد)'
    );

    var sidebar = [
      { page: 'dashboard', href: 'dashboard.html', icon: 'layout-grid', label: 'الرئيسية', sub: 'نظرة عامة على متجرك' }
    ];
    var mobileNav = [
      { page: 'dashboard', href: 'dashboard.html', icon: 'layout-grid', label: 'الرئيسية' }
    ];
    var dashboardCards = [];

    if (hasProducts) {
      sidebar.push({ page: 'prices', href: 'prices.html', icon: 'shopping-bag', label: 'المنتجات والأسعار', sub: 'الأصناف، الأسعار، التوفر' });
      mobileNav.push({ page: 'prices', href: 'prices.html', icon: 'shopping-bag', label: 'المنتجات' });
      dashboardCards.push({ page: 'prices', href: 'prices.html', icon: 'shopping-bag', label: 'المنتجات والأسعار', sub: 'الأصناف والتوفر' });
    }

    if (variant.hasServiceItems && variant.serviceItemsNav) {
      var svcNav = variant.serviceItemsNav;
      sidebar.push({ page: 'services', href: 'services.html', icon: svcNav.icon, label: svcNav.label, sub: svcNav.sub });
      mobileNav.push({ page: 'services', href: 'services.html', icon: svcNav.icon, label: svcNav.mobileLabel || svcNav.label });
      dashboardCards.push({ page: 'services', href: 'services.html', icon: svcNav.icon, label: svcNav.label, sub: svcNav.cardSub || svcNav.sub });
    }

    if (variant.hasAppointments) {
      sidebar.push({ page: 'appointments', href: 'appointments.html', icon: 'calendar-clock', label: 'المواعيد', sub: 'حجوزات المرضى ودوام العيادة' });
      mobileNav.push({ page: 'appointments', href: 'appointments.html', icon: 'calendar-clock', label: 'المواعيد', badge: true });
      dashboardCards.push({ page: 'appointments', href: 'appointments.html', icon: 'calendar-clock', label: 'المواعيد', sub: 'حجوزات المرضى والدوام' });
    }

    sidebar.push(
      { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة', sub: servicesNavSub },
      { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات', sub: adsNavSub },
      { page: 'packages', href: 'packages.html', icon: 'layers', label: 'الباقات', sub: 'اختر باقة متجرك' },
      { page: 'profile', href: 'profile.html', icon: 'store', label: 'بروفايل المتجر', sub: 'تعديل المعلومات والصورة' }
    );
    mobileNav.push(
      { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة' },
      { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات' }
    );
    dashboardCards.push(
      { action: 'open-services-edit', href: '#', icon: 'wrench', label: 'الخدمات المتاحة', sub: servicesNavSub },
      { page: 'ads', href: 'ads.html', icon: 'megaphone', label: 'الإعلانات', sub: adsNavSub }
    );

    var storePageCopy = {
      profileTitle: 'بيانات المتجر',
      entityNameLabel: 'اسم المتجر',
      adsSubtitle: adsSubtitle,
      heroWelcomeText: variant.heroWelcomeText || 'متجرك جاهز لعرض منتجاتك وخدماتك من هنا.',
      fallbackName: 'متجري',
      entityPossessive: 'متجرك',
      previewLabel: 'معاينة متجري'
    };
    if (variant.pageCopy) {
      Object.keys(variant.pageCopy).forEach(function (key) { storePageCopy[key] = variant.pageCopy[key]; });
    }

    return {
      id: id,
      label: label,
      variant: variant.key,
      hasDiscounts: variant.hasDiscounts,
      hasAppointments: variant.hasAppointments,
      hasProducts: hasProducts,
      hasServiceItems: variant.hasServiceItems === true,
      serviceFields: variant.serviceFields || [],
      serviceSuggestions: variant.serviceSuggestions || [],
      productFields: variant.productFields || [],
      productHints: variant.productHints || {},
      productExtraFields: variant.productExtraFields || [],
      serviceExtraFields: variant.serviceExtraFields || [],
      suggestedCategories: variant.suggestedCategories || [],
      fallbackAvatarLetter: 'م',
      sidebar: sidebar,
      mobileNav: mobileNav,
      services: services,
      dashboardCards: dashboardCards,
      limits: limits,
      lockedFeatures: STORE_LOCKED_FEATURES,
      adTypes: variant.adTypes,
      adOptions: variant.adOptions,
      pageCopy: storePageCopy,
      packages: {
        pageSubtitle: 'اختر باقة متجرك',
        entityNameLabel: 'اسم المتجر',
        free: {
          eyebrow: 'FREE',
          name: 'مجاني',
          desc: 'لوحة تحكم ومعلومات أساسية لمتجرك',
          price: 0,
          features: freeFeatures
        },
        paid: {
          id: 'premium',
          eyebrow: 'PREMIUM',
          badge: 'الباقة المميزة',
          name: 'المميزة',
          desc: 'كل ما يحتاجه متجرك ليظهر بأفضل شكل ويتفاعل معاه الزباين أكتر',
          price: 99,
          buttonLabel: 'اشترك في الباقة المميزة',
          whatsappMessage: 'السلام عليكم، قمت بتحويل مبلغ 99 ₪ لاشتراك الباقة المميزة، وهذا إشعار التحويل.',
          features: paidFeatures
        }
      }
    };
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getStoreSubcategoryId() {
    try {
      var storedId = window.localStorage.getItem(SUBCATEGORY_ID_KEY);
      if (storedId) return storedId;
      var storedLabel = window.localStorage.getItem(SUBCATEGORY_LABEL_KEY);
      if (storedLabel) {
        if (hasOwn(STORE_SUBCATEGORY_AR_TO_ID, storedLabel)) return STORE_SUBCATEGORY_AR_TO_ID[storedLabel];
        return storedLabel;
      }
    } catch (e) { }
    return null;
  }

  function getStoreSubcategoryLabel() {
    var id = getStoreSubcategoryId();
    if (!id) return null;
    for (var ar in STORE_SUBCATEGORY_AR_TO_ID) {
      if (hasOwn(STORE_SUBCATEGORY_AR_TO_ID, ar) && STORE_SUBCATEGORY_AR_TO_ID[ar] === id) return ar;
    }
    return id;
  }

  function getStoreVariantKey() {
    var subcategoryId = getStoreSubcategoryId();
    return (subcategoryId && hasOwn(STORE_SUBCATEGORY_VARIANT, subcategoryId))
      ? STORE_SUBCATEGORY_VARIANT[subcategoryId]
      : 'general';
  }

  function getStoreConfig() {
    var key = getStoreVariantKey();
    if (!storeConfigCache[key]) {
      storeConfigCache[key] = buildStoreTypeConfig('store', 'متجر', (hasOwn(STORE_VARIANTS, key) && STORE_VARIANTS[key]) || STORE_VARIANTS.general);
    }
    return storeConfigCache[key];
  }

  function getCurrentType() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && hasOwn(TYPES, stored)) return stored;
    } catch (e) { }
    return DEFAULT_TYPE;
  }

  function setCurrentType(typeId) {
    try {
      if (hasOwn(TYPES, typeId)) window.localStorage.setItem(STORAGE_KEY, typeId);
    } catch (e) { }
  }

  function getConfig(typeId) {
    var id = typeId || getCurrentType();
    if (id === 'store') return getStoreConfig();
    return (hasOwn(TYPES, id) && TYPES[id]) || TYPES[DEFAULT_TYPE];
  }

  function getCurrentPlan() {
    try {
      var stored = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (stored && PLAN_IDS.indexOf(stored) !== -1) return stored;
    } catch (e) { }
    return DEFAULT_PLAN;
  }

  function setCurrentPlan(planId) {
    try {
      if (PLAN_IDS.indexOf(planId) !== -1) window.localStorage.setItem(PLAN_STORAGE_KEY, planId);
    } catch (e) { }
  }

  function resolvePlan(planId) {
    return planId && PLAN_IDS.indexOf(planId) !== -1 ? planId : getCurrentPlan();
  }

  function isFeatureLocked(featureKey, typeId, planId) {
    var config = getConfig(typeId);
    var plan = resolvePlan(planId);
    var locked = (config.lockedFeatures && config.lockedFeatures[plan]) || [];
    return locked.indexOf(featureKey) !== -1;
  }

  function getLimitStatus(limitKey, usedCount, typeId, planId) {
    var config = getConfig(typeId);
    var plan = resolvePlan(planId);
    var planLimits = (config.limits && config.limits[plan]) || {};
    var limit = planLimits[limitKey];
    var unlimited = limit === undefined || limit === null;
    var used = Math.max(0, parseInt(usedCount, 10) || 0);
    return {
      plan: plan,
      limit: unlimited ? null : limit,
      used: used,
      remaining: unlimited ? null : Math.max(0, limit - used),
      unlimited: unlimited,
      canAdd: unlimited || used < limit
    };
  }

  function toLookup(list) {
    var map = Object.create(null);
    for (var i = 0; i < list.length; i++) map[list[i]] = true;
    return map;
  }

  var ICON_LOOKUP = toLookup(ALLOWED_ICON_NAMES);
  var PAGE_LOOKUP = toLookup(ALLOWED_PAGES);
  var ACTION_LOOKUP = toLookup(ALLOWED_ACTIONS);

  function isAllowedIcon(name) {
    return typeof name === 'string' && ICON_LOOKUP[name] === true;
  }

  function safeIcon(name, fallback) {
    if (isAllowedIcon(name)) return name;
    return isAllowedIcon(fallback) ? fallback : DEFAULT_ICON;
  }

  function isAllowedPage(page) {
    return typeof page === 'string' && PAGE_LOOKUP[page] === true;
  }

  function isAllowedAction(action) {
    return typeof action === 'string' && ACTION_LOOKUP[action] === true;
  }

  function safeHref(href) {
    var value = typeof href === 'string' ? href : '';
    if (value === '' || value === '#') return '#';
    var match = /^([a-z][a-z-]*)\.html$/.exec(value);
    return match && PAGE_LOOKUP[match[1]] === true ? value : '#';
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    PLAN_STORAGE_KEY: PLAN_STORAGE_KEY,
    SUBCATEGORY_ID_KEY: SUBCATEGORY_ID_KEY,
    DEFAULT_TYPE: DEFAULT_TYPE,
    DEFAULT_PLAN: DEFAULT_PLAN,
    TYPES: TYPES,
    getCurrentType: getCurrentType,
    getStoreSubcategoryId: getStoreSubcategoryId,
    getStoreSubcategoryLabel: getStoreSubcategoryLabel,
    setCurrentType: setCurrentType,
    getCurrentPlan: getCurrentPlan,
    setCurrentPlan: setCurrentPlan,
    getLimitStatus: getLimitStatus,
    isFeatureLocked: isFeatureLocked,
    getConfig: getConfig,
    isAllowedIcon: isAllowedIcon,
    safeIcon: safeIcon,
    isAllowedPage: isAllowedPage,
    isAllowedAction: isAllowedAction,
    safeHref: safeHref
  };
})();