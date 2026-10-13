(function () {
  const navButtons = Array.from(document.querySelectorAll(".guide-nav-item"));
  const contentPanels = document.querySelectorAll(".guide-panel");
  const asidePanels = document.querySelectorAll(".guide-aside-panel");
  const contentEl = document.getElementById("guideContent");
  const navIndicator = document.getElementById("guideNavIndicator");
  const guideNav = document.getElementById("guideNav");

  const mobileTrigger = document.getElementById("guideMobileTrigger");
  const mobileTriggerTitle = document.getElementById("guideMobileTriggerTitle");
  const sheet = document.getElementById("guideSheet");
  const sheetBackdrop = document.getElementById("guideSheetBackdrop");
  const sheetNav = document.getElementById("guideSheetNav");

  const langSwitcher = document.getElementById("guideLangSwitcher");
  const selectedLang = document.getElementById("guideSelectedLang");
  const selectedLangFlag = document.getElementById("guideSelectedLangFlag");
  const langDropdown = document.getElementById("guideLangDropdown");
  const langOptions = Array.from(langDropdown.querySelectorAll("li[data-lang]"));

  const STORAGE_KEY = "gm_guide_visited";
  const LANG_KEY = "gm_lang";
  const MOBILE_BREAKPOINT = 980;

  const pageOrder = navButtons.map((btn) => btn.getAttribute("data-page"));

  /* ------------------------------------------------------------------ */
  /* قاموس ترجمة صفحة الدليل بالكامل (إنجليزي/عربي)                     */
  /* كل نص ظاهر بالصفحة موجود هون بلغتين، وبتطبّقهم دالة applyGuideI18n */
  /* ------------------------------------------------------------------ */
  const GUIDE_I18N = {
    en: {
      sidebarTitle: "User Manual",
      mobileEyebrow: "Current Section",
      sheetTitle: "Choose a Guide Section",
      nav: {
        "add-price": "Add a Price",
        "confirm-prices": "Confirm and Report Prices",
        "suggest-product": "Suggest a New Product",
        "marketplace": "Marketplace and Listings",
        "stores-map": "Shops",
        "account": "Your Account and Profile",
      },
      panels: {
        "add-price": {
          title: "How do you add a new price?",
          intro:
            "By sharing product prices, you help thousands of families find real prices and choose the best place to buy. The process takes less than a minute.",
          steps: [
            [
              "Choose the type of entry",
              "When you tap the \"Add\" button, 4 options appear. Choose \"Add a product price\" to share a price you saw at the market.",
            ],
            [
              "Search for the product",
              "Type the product name in the search box — for example \"flour\" or \"sugar\" or \"oil\". A list of results appears; choose the correct product. If you can't find it, you can suggest a new product.",
            ],
            [
              "Enter the price in shekels",
              "Enter the price exactly as you saw it at the store. For example, if a kilo of flour costs 5.50 shekels, enter 5.50. Accuracy matters because people rely on these prices.",
            ],
            [
              "Choose the area",
              "Select the area where the store is located — for example Khan Younis, Rafah, or Deir al-Balah. Prices can vary by area, and this helps with comparisons.",
            ],
            [
              "Enter the store name",
              "Type the name of the store or market where you saw the price — for example \"Nuseirat Market\" or \"Abu Khaled's Shop\". This is optional, but it helps people recognize the place.",
            ],
            [
              "Review and submit",
              "You'll see a summary of all the details — the product, price, store, and area. If everything looks right, tap \"Submit\". Your price will appear to others once the community confirms it.",
            ],
          ],
        },
        "confirm-prices": {
          title: "Confirming and Reporting Prices",
          intro:
            "Since prices change constantly, the site relies on a system of confirmation and reporting to ensure price accuracy. Help by confirming correct prices or reporting incorrect ones.",
          confirmTitle: "Confirm a price",
          confirmDesc:
            "If you saw a price and you're sure it's correct — for example, you saw the same price at the store — tap the Confirm button. The more confirmations a price gets, the more trustworthy it becomes and the faster it's finalized.",
          reportTitle: "Report a price",
          reportDesc:
            "If you see a price that's wrong, outdated, or not from your area — tap the Report button. If enough people report the same price, it's automatically removed so it doesn't mislead others.",
          trustTitle: "Trust Points",
          trustDesc:
            "Every contribution you make earns you trust points, whether by adding a new price or confirming an existing one. As your points increase, your ranking among the site's most active contributors rises.",
          trustRows: [
            "Add a new price",
            "Confirm a correct price",
            "Report a wrong price",
            "Add a new store",
            "Post a marketplace ad",
          ],
        },
        "suggest-product": {
          title: "New Product Proposal",
          intro:
            "You can easily suggest it, and once approved, it will be available in the list for everyone to benefit from.",
          steps: [
            [
              "Enter the product name.",
              "Enter the full product name in Arabic—for example, \"Almarai Milk 1L\" or \"Basmati Rice 5kg.\" The clearer and more precise the name, the easier it is for us to add it.",
            ],
            [
              "Select a category",
              "Select the appropriate category for the product—vegetables, meat, beverages, cleaning products, etc. This helps people easily find the product when browsing by category.",
            ],
            [
              "Specify the unit and quantity.",
              "Select the unit of measurement (kg, liter, piece, box) and the quantity—for example, \"1 kg\" or \"500 grams.\" Then, proceed to add the price and the area, just as you would for a standard price entry.",
            ],
          ],
        },
        "marketplace": {
          title: "The Market and Advertising",
          intro:
            "The marketplace is a place to buy and sell items—mobile phones, furniture, clothing, or anything else you want to sell. Post your ad for free, and it will reach everyone in Gaza.",
          steps: [
            [
              "Create an advertisement",
              "Tap \"Add\" and select \"Add Marketplace Listing.\" Enter the listing title, product description, and price, then add photos. The listing goes live immediately and is visible to everyone.",
            ],
            [
              "Contact the seller",
              "Found an ad you like? Go to the ad page and contact the seller via mobile number or direct chat to agree on the price and delivery location.",
            ],
            [
              "Save ads",
              "Like an ad but not ready to buy right now? Save it and come back to it anytime from the \"Saved\" page in the marketplace.",
            ],
          ],
        },
        "stores-map": {
          title: "Shops",
          intro:
            "Browse shops, restaurants, pharmacies, and other businesses near you, or register a new location or business so others can find it.",
          steps: [
            [
              "Shops and Projects",
              "Go to the \"Add\" section, select \"Add a location or store,\" and choose your business type—such as a restaurant, café, pharmacy, or other venture.",
            ],
            [
              "Communication and Location",
              "Fill in your contact details—such as your phone number and address—in detail to make it easier to reach you and showcase your project.",
            ],
            [
              // ملاحظة: كان اسمها بالنص الأصلي "Medical Review" رغم إنو الوصف
              // بيحكي عن مراجعة طلب عامة (هاتف وعنوان) مالها علاقة بأي شي طبي.
              // صلحناها هون لعنوان صحيح ومنطقي.
              "Application Review",
              "Review your application and verify key details—such as your phone number and address—then submit it. It will be approved within 24 hours, and we will send you the link to your dashboard.",
            ],
          ],
        },
        "account": {
          title: "Your account and profile",
          intro:
            "Your account is the place to track your points and manage your information. Registration is quick and easy using your phone number.",
          steps: [
            [
              "Log in with your phone number",
              "You sign up using your phone number—we'll send a verification code via WhatsApp or SMS. We don't ask for an email or password. The process takes just a few seconds.",
            ],
            [
              "Your profile",
              "From the \"My Account\" page, you can view the number of prices you've added, the number of confirmations you've received, your current points balance, and your region. The more you contribute, the more points you earn and the more people trust your prices.",
            ],
            [
              "Settings",
              "Change your region, enable the available options, or contact us if you encounter any issues; all settings are available in your personal account.",
            ],
          ],
        },
      },
      aside: {
        "add-price": {
          tipsHeader: "Helpful Tips",
          tips: [
            "Your price appears after others confirm it — this is how we ensure price accuracy",
            "Try to add the price as soon as you see it so it stays up to date",
            "Can't find the product? You can suggest a new product from the suggestions page",
            "You can add prices even without registering — but registering lets you track your contributions",
          ],
          factHeader: "Did You Know?",
          facts: [
            "Every price is confirmed by at least 3 people before it's published",
            "Outdated prices are automatically removed to keep the data current",
            "You can track prices in your area using the \"My Area\" filter",
          ],
        },
        "confirm-prices": {
          faqHeader: "Frequently Asked Questions",
          faqs: [
            [
              "Can I change my mind?",
              "Yes, you can press the same button again to cancel your vote, or press the other button to switch it.",
            ],
            [
              "What happens when I report a price?",
              "Your report will be added to the others. If the number of reports reaches a certain threshold, the price will be automatically removed to avoid misleading people.",
            ],
          ],
        },
        "suggest-product": {
          header: "Comments",
          items: [
            "Search carefully first before suggesting — it might already exist under a different name",
            "Use common names people recognize, not just brand names",
          ],
        },
        "marketplace": {
          header: "Market Rules",
          items: [
            "Ads are 100% free — no fees.",
            "The sale of prohibited or dangerous items is prohibited.",
            "Be honest about the description and price—this builds trust between you and the buyers.",
          ],
        },
        "stores-map": {
          header: "Additional information",
          items: [
            "If you have a shop, you can register it and manage its page yourself.",
            "Shops display an \"Open\" or \"Closed\" status based on their operating hours.",
            "A map of your location will be available {soon}",
          ],
          soonWord: "soon",
        },
        "account": {
          header: "Your Privacy",
          items: [
            "Your phone number isn't visible to anyone—we only use it for verification.",
            "We do not share your data with any third party.",
            "You can delete your account at any time from the settings.",
          ],
        },
      },
    },

    ar: {
      sidebarTitle: "دليل المستخدم",
      mobileEyebrow: "القسم الحالي",
      sheetTitle: "اختر قسم من الدليل",
      nav: {
        "add-price": "إضافة سعر",
        "confirm-prices": "تأكيد الأسعار والإبلاغ عنها",
        "suggest-product": "اقتراح منتج جديد",
        "marketplace": "السوق والإعلانات",
        "stores-map": "المحلات",
        "account": "حسابك وملفك الشخصي",
      },
      panels: {
        "add-price": {
          title: "كيف تضيف سعر جديد؟",
          intro:
            "من خلال مشاركتك لأسعار المنتجات، بتساعد آلاف العائلات يلاقوا الأسعار الحقيقية ويختاروا أفضل مكان للشراء. العملية بتاخد أقل من دقيقة.",
          steps: [
            [
              "اختر نوع الإضافة",
              "لما تضغط على زر \"إضافة\"، رح تظهرلك 4 خيارات. اختر \"إضافة سعر منتج\" لمشاركة سعر شفته بالسوق.",
            ],
            [
              "ابحث عن المنتج",
              "اكتب اسم المنتج بمربع البحث — مثلاً \"طحين\" أو \"سكر\" أو \"زيت\". رح تظهرلك قائمة نتائج، اختر المنتج الصحيح. إذا ما لقيتو، فيك تقترح منتج جديد.",
            ],
            [
              "أدخل السعر بالشيكل",
              "أدخل السعر بالضبط متل ما شفتو بالمحل. مثلاً، إذا كيلو الطحين سعرو 5.50 شيكل، اكتب 5.50. الدقة مهمة لأنو الناس بتعتمد على هالأسعار.",
            ],
            [
              "اختر المنطقة",
              "اختر المنطقة يلي فيها المحل — مثلاً خان يونس، رفح، أو دير البلح. الأسعار ممكن تختلف حسب المنطقة، وهاد بساعد بالمقارنة.",
            ],
            [
              "أدخل اسم المحل",
              "اكتب اسم المحل أو السوق يلي شفت فيه السعر — مثلاً \"سوق النصيرات\" أو \"محل أبو خالد\". هاد الحقل اختياري، بس بساعد الناس يتعرفوا على المكان.",
            ],
            [
              "راجع وأرسل",
              "رح تشوف ملخص لكل التفاصيل — المنتج، السعر، المحل، والمنطقة. إذا كل شي تمام، اضغط \"إرسال\". السعر رح يظهر للناس بعد ما المجتمع يأكده.",
            ],
          ],
        },
        "confirm-prices": {
          title: "تأكيد الأسعار والإبلاغ عنها",
          intro:
            "بما إنو الأسعار بتتغير باستمرار، الموقع بعتمد على نظام تأكيد وإبلاغ لضمان دقة الأسعار. ساعدنا بتأكيد الأسعار الصحيحة أو الإبلاغ عن الأسعار الغلط.",
          confirmTitle: "أكّد سعر",
          confirmDesc:
            "إذا شفت سعر ومتأكد إنو صحيح — مثلاً شفت نفس السعر بالمحل — اضغط زر \"تأكيد\". كل ما السعر ياخد تأكيدات أكتر، كل ما يصير أوثق وبيتثبت أسرع.",
          reportTitle: "أبلغ عن سعر",
          reportDesc:
            "إذا شفت سعر غلط، قديم، أو مش من منطقتك — اضغط زر \"إبلاغ\". إذا عدد كافي من الناس بلغوا عن نفس السعر، بينشال أوتوماتيكياً حتى ما يضلل غيرهم.",
          trustTitle: "نقاط الثقة",
          trustDesc:
            "كل مساهمة بتعملها بتكسبك نقاط ثقة، سواء بإضافة سعر جديد أو تأكيد سعر موجود. كل ما نقاطك تزيد، كل ما ترتيبك بين أنشط المساهمين بالموقع بيرتفع.",
          trustRows: [
            "إضافة سعر جديد",
            "تأكيد سعر صحيح",
            "الإبلاغ عن سعر خاطئ",
            "إضافة محل جديد",
            "نشر إعلان بالسوق",
          ],
        },
        "suggest-product": {
          title: "اقتراح منتج جديد",
          intro:
            "فيك تقترحه بسهولة، وبعد ما تتم الموافقة عليه، رح يصير متاح بالقائمة حتى الكل يستفيد منه.",
          steps: [
            [
              "أدخل اسم المنتج",
              "اكتب اسم المنتج كامل بالعربي — مثلاً \"حليب المراعي 1 لتر\" أو \"أرز بسمتي 5 كغ\". كل ما الاسم أوضح وأدق، كل ما كان أسهل علينا نضيفه.",
            ],
            [
              "اختر التصنيف",
              "اختر التصنيف المناسب للمنتج — خضروات، لحوم، مشروبات، مواد تنظيف، إلخ. هاد بساعد الناس يلاقوا المنتج بسهولة لما يتصفحوا حسب التصنيف.",
            ],
            [
              "حدد الوحدة والكمية",
              "اختر وحدة القياس (كغ، لتر، قطعة، صندوق) والكمية — مثلاً \"1 كغ\" أو \"500 غرام\". بعدين كمّل بإضافة السعر والمنطقة، متل أي إضافة سعر عادية.",
            ],
          ],
        },
        "marketplace": {
          title: "السوق والإعلانات",
          intro:
            "السوق هو مكان لبيع وشراء الأغراض — جوالات، أثاث، ملابس، أو أي شي بدك تبيعه. انشر إعلانك مجاناً، وبيوصل لكل الناس بغزة.",
          steps: [
            [
              "أنشئ إعلان",
              "اضغط \"إضافة\" واختر \"نشر إعلان بالسوق\". اكتب عنوان الإعلان، وصف المنتج، والسعر، وبعدين ضيف الصور. الإعلان بينشر فوراً وبيصير مرئي للكل.",
            ],
            [
              "تواصل مع البائع",
              "لقيت إعلان عجبك؟ روح لصفحة الإعلان وتواصل مع البائع عن طريق رقم الجوال أو الشات المباشر عشان تتفقوا على السعر ومكان التسليم.",
            ],
            [
              "احفظ الإعلانات",
              "عجبك إعلان بس مش جاهز تشتري هلق؟ احفظه وارجعلو أي وقت من صفحة \"المحفوظات\" بالسوق.",
            ],
          ],
        },
        "stores-map": {
          title: "المحلات",
          intro:
            "تصفح المحلات، المطاعم، الصيدليات، وباقي المشاريع القريبة منك، أو سجّل مكان أو مشروع جديد حتى الناس تلاقيه.",
          steps: [
            [
              "المحلات والمشاريع",
              "روح لقسم \"إضافة\"، اختر \"إضافة موقع أو محل\"، وحدد نوع نشاطك — متل مطعم، كافيه، صيدلية، أو أي مشروع تاني.",
            ],
            [
              "التواصل والموقع",
              "عبّي بيانات التواصل — متل رقم هاتفك وعنوانك — بالتفصيل حتى يصير أسهل الوصول إلك وعرض مشروعك.",
            ],
            [
              "مراجعة الطلب",
              "راجع طلبك وتأكد من التفاصيل الأساسية — متل رقم هاتفك وعنوانك — وبعدين قدّمه. رح تتم الموافقة خلال 24 ساعة، ورح نبعتلك رابط لوحة التحكم.",
            ],
          ],
        },
        "account": {
          title: "حسابك وملفك الشخصي",
          intro:
            "حسابك هو المكان يلي فيه تتابع نقاطك وتدير معلوماتك. التسجيل سريع وسهل باستخدام رقم هاتفك.",
          steps: [
            [
              "سجّل دخول برقم هاتفك",
              "بتسجل باستخدام رقم هاتفك — رح نبعتلك رمز تحقق عبر واتساب أو رسالة نصية. ما منطلب إيميل أو باسورد. العملية بتاخد ثواني بس.",
            ],
            [
              "ملفك الشخصي",
              "من صفحة \"حسابي\"، فيك تشوف عدد الأسعار يلي أضفتها، عدد التأكيدات يلي حصلتها، رصيد نقاطك الحالي، ومنطقتك. كل ما تساهم أكتر، كل ما تكسب نقاط أكتر والناس بتوثق بأسعارك أكتر.",
            ],
            [
              "الإعدادات",
              "غيّر منطقتك، فعّل الخيارات المتاحة، أو تواصل معنا إذا واجهتك أي مشكلة؛ كل الإعدادات متوفرة بحسابك الشخصي.",
            ],
          ],
        },
      },
      aside: {
        "add-price": {
          tipsHeader: "نصائح مفيدة",
          tips: [
            "السعر بيظهر بعد ما الناس تأكده — هيك منضمن دقة الأسعار",
            "حاول تضيف السعر أول ما تشوفه حتى يضل محدث",
            "ما لقيت المنتج؟ فيك تقترح منتج جديد من صفحة الاقتراحات",
            "فيك تضيف أسعار حتى بدون تسجيل — بس التسجيل بخليك تتابع مساهماتك",
          ],
          factHeader: "هل تعلم؟",
          facts: [
            "كل سعر بيتأكد من 3 أشخاص عالأقل قبل ما ينشر",
            "الأسعار القديمة بتنشال أوتوماتيكياً حتى تضل البيانات محدثة",
            "فيك تتابع أسعار منطقتك باستخدام فلتر \"منطقتي\"",
          ],
        },
        "confirm-prices": {
          faqHeader: "أسئلة شائعة",
          faqs: [
            [
              "فيني غيّر رأيي؟",
              "أه، فيك تضغط نفس الزر مرة تانية عشان تلغي تصويتك، أو تضغط الزر التاني عشان تغيّره.",
            ],
            [
              "شو بيصير لما أبلغ عن سعر؟",
              "بلاغك رح ينضاف لباقي البلاغات. إذا عدد البلاغات وصل لحد معين، السعر بينشال أوتوماتيكياً حتى ما يضلل الناس.",
            ],
          ],
        },
        "suggest-product": {
          header: "ملاحظات",
          items: [
            "دوّر منيح قبل ما تقترح — ممكن يكون المنتج موجود بس باسم مختلف",
            "استخدم أسماء متعارف عليها بين الناس، مش بس أسماء الماركات",
          ],
        },
        "marketplace": {
          header: "قواعد السوق",
          items: [
            "الإعلانات مجانية 100% — بدون أي رسوم.",
            "ممنوع بيع الأغراض الممنوعة أو الخطيرة.",
            "كون صادق بالوصف والسعر — هيك بتبني ثقة بينك وبين المشترين.",
          ],
        },
        "stores-map": {
          header: "معلومات إضافية",
          items: [
            "إذا عندك محل، فيك تسجله وتدير صفحته بنفسك.",
            "المحلات بتظهر حالة \"مفتوح\" أو \"مغلق\" حسب أوقات دوامها.",
            "خريطة موقعك رح تكون متوفرة {soon}",
          ],
          soonWord: "قريباً",
        },
        "account": {
          header: "خصوصيتك",
          items: [
            "رقم هاتفك مش ظاهر لحدا — منستخدمه بس للتحقق.",
            "ما منشارك بياناتك مع أي طرف تالت.",
            "فيك تحذف حسابك بأي وقت من الإعدادات.",
          ],
        },
      },
    },
  };

  /* ------------------------------------------------------------------ */
  /* تطبيق الترجمة فعلياً على كل عناصر الصفحة (مو بس اتجاه/علم)          */
  /* ------------------------------------------------------------------ */
  function applyGuideI18n(lang) {
    const t = GUIDE_I18N[lang] || GUIDE_I18N.ar;

    const sidebarTitleEl = document.querySelector(".guide-sidebar-title");
    if (sidebarTitleEl) sidebarTitleEl.textContent = t.sidebarTitle;

    const eyebrowEl = document.querySelector(".guide-mobile-trigger-eyebrow");
    if (eyebrowEl) eyebrowEl.textContent = t.mobileEyebrow;

    const sheetTitleEl = document.querySelector(".guide-sheet-title");
    if (sheetTitleEl) sheetTitleEl.textContent = t.sheetTitle;

    // عناوين الأقسام بالسايدبار
    navButtons.forEach((btn) => {
      const id = btn.getAttribute("data-page");
      const label = t.nav[id];
      if (!label) return;
      const span = btn.querySelector("span:not(.guide-nav-icon):not(.guide-nav-check)");
      if (span) span.textContent = label;
    });

    // نفس العناوين بنسخة الشيت السفلي (الشاشات الصغيرة)
    sheetNav.querySelectorAll(".guide-sheet-item").forEach((item) => {
      const id = item.getAttribute("data-page");
      const label = t.nav[id];
      if (!label) return;
      const span = item.querySelector("span:not(.guide-sheet-item-icon):not(.guide-sheet-item-check)");
      if (span) span.textContent = label;
    });

    // محتوى كل لوحة (عنوان، مقدمة، خطوات)
    Object.keys(t.panels).forEach((panelId) => {
      const data = t.panels[panelId];
      const panelEl = document.querySelector(`.guide-panel[data-panel="${panelId}"]`);
      if (!panelEl) return;

      const titleEl = panelEl.querySelector(".guide-content-title");
      if (titleEl) titleEl.textContent = data.title;

      const introEl = panelEl.querySelector(".guide-content-intro");
      if (introEl) introEl.textContent = data.intro;

      if (data.steps) {
        const stepEls = panelEl.querySelectorAll(".guide-step");
        stepEls.forEach((stepEl, i) => {
          const stepData = data.steps[i];
          if (!stepData) return;
          const stepTitleEl = stepEl.querySelector(".guide-step-title");
          const stepDescEl = stepEl.querySelector(".guide-step-desc");
          if (stepTitleEl) stepTitleEl.textContent = stepData[0];
          if (stepDescEl) stepDescEl.textContent = stepData[1];
        });
      }

      // بطاقات خاصة بلوحة "تأكيد الأسعار"
      if (panelId === "confirm-prices") {
        const confirmCard = panelEl.querySelector(".confirm-card--confirm");
        if (confirmCard) {
          const h3 = confirmCard.querySelector("h3");
          const p = confirmCard.querySelector("p");
          if (h3) h3.textContent = data.confirmTitle;
          if (p) p.textContent = data.confirmDesc;
        }
        const reportCard = panelEl.querySelector(".confirm-card--report");
        if (reportCard) {
          const h3 = reportCard.querySelector("h3");
          const p = reportCard.querySelector("p");
          if (h3) h3.textContent = data.reportTitle;
          if (p) p.textContent = data.reportDesc;
        }
        const trustCard = panelEl.querySelector(".trust-points-card");
        if (trustCard) {
          const h3 = trustCard.querySelector("h3");
          const desc = trustCard.querySelector("p.guide-step-desc");
          if (h3) h3.textContent = data.trustTitle;
          if (desc) desc.textContent = data.trustDesc;
          const rows = trustCard.querySelectorAll(".trust-row-label");
          rows.forEach((row, i) => {
            if (data.trustRows[i] !== undefined) row.textContent = data.trustRows[i];
          });
        }
      }
    });

    // صناديق الشريط الجانبي (نصائح، أسئلة شائعة، قواعد...)
    Object.keys(t.aside).forEach((panelId) => {
      const data = t.aside[panelId];
      const asideEl = document.querySelector(`.guide-aside-panel[data-panel="${panelId}"]`);
      if (!asideEl) return;

      if (panelId === "add-price") {
        const boxes = asideEl.querySelectorAll(".guide-box");
        if (boxes[0]) {
          const header = boxes[0].querySelector(".guide-box-header span:last-child");
          if (header) header.textContent = data.tipsHeader;
          const lis = boxes[0].querySelectorAll("ul li");
          lis.forEach((li, i) => {
            if (data.tips[i] !== undefined) li.textContent = data.tips[i];
          });
        }
        if (boxes[1]) {
          const header = boxes[1].querySelector(".guide-box-header span:last-child");
          if (header) header.textContent = data.factHeader;
          const lis = boxes[1].querySelectorAll("ul li");
          lis.forEach((li, i) => {
            if (data.facts[i] !== undefined) li.textContent = data.facts[i];
          });
        }
      } else if (panelId === "confirm-prices") {
        const faqBox = asideEl.querySelector(".faq-box");
        if (faqBox) {
          const header = faqBox.querySelector("h3");
          if (header) header.textContent = data.faqHeader;
          const items = faqBox.querySelectorAll(".faq-item");
          items.forEach((item, i) => {
            const qa = data.faqs[i];
            if (!qa) return;
            const q = item.querySelector(".q");
            const a = item.querySelector(".a");
            if (q) q.textContent = qa[0];
            if (a) a.textContent = qa[1];
          });
        }
      } else {
        // لوحات فيها صندوق واحد بسيط: اقتراح منتج / السوق / المحلات / الحساب
        const box = asideEl.querySelector(".guide-box");
        if (box) {
          const header = box.querySelector(".guide-box-header span:last-child");
          if (header) header.textContent = data.header;
          const lis = box.querySelectorAll("ul li");
          lis.forEach((li, i) => {
            const text = data.items[i];
            if (text === undefined) return;
            if (panelId === "stores-map" && i === 2 && data.soonWord) {
              li.innerHTML = text.replace("{soon}", `<strong>${data.soonWord}</strong>`);
            } else {
              li.textContent = text;
            }
          });
        }
      }
    });

    // تحديث عنوان زر التبديل بالجوال ليطابق القسم الحالي باللغة الجديدة
    const activeBtn = navButtons.find((btn) => btn.classList.contains("is-active"));
    if (mobileTriggerTitle && activeBtn) {
      const span = activeBtn.querySelector("span:not(.guide-nav-icon):not(.guide-nav-check)");
      if (span) mobileTriggerTitle.textContent = span.textContent;
    }
  }

  /* ------------------------------------------------------------------ */
  /* تتبّع الأقسام اللي زارها المستخدم (لعلامة الصح بجانب كل قسم)        */
  /* ------------------------------------------------------------------ */
  function getVisited() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function markVisited(id) {
    const visited = new Set(getVisited());
    visited.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    } catch (e) {
      /* تجاهل لو التخزين مش متاح بمتصفح المستخدم */
    }
  }

  /* ------------------------------------------------------------------ */
  /* بناء نسخة الشيت السفلي من نفس أزرار السايدبار (مرة وحدة بالبداية)    */
  /* ------------------------------------------------------------------ */
  function buildSheetNav() {
    navButtons.forEach((btn) => {
      const id = btn.getAttribute("data-page");
      const iconHTML = btn.querySelector(".guide-nav-icon").innerHTML;
      const label = btn.querySelector("span:not(.guide-nav-icon):not(.guide-nav-check)").textContent;

      const item = document.createElement("button");
      item.type = "button";
      item.className = "guide-sheet-item";
      item.setAttribute("data-page", id);
      item.innerHTML =
        `<span class="guide-sheet-item-icon">${iconHTML}</span>` +
        `<span>${label}</span>` +
        `<span class="guide-sheet-item-check" hidden>` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>` +
        `</span>`;

      item.addEventListener("click", () => {
        showPage(id);
        closeSheet();
      });

      sheetNav.appendChild(item);
    });
  }

  function refreshSheetState(activeId) {
    const visited = new Set(getVisited());
    sheetNav.querySelectorAll(".guide-sheet-item").forEach((item) => {
      const id = item.getAttribute("data-page");
      const isActive = id === activeId;
      item.classList.toggle("is-active", isActive);
      const check = item.querySelector(".guide-sheet-item-check");
      check.hidden = !(visited.has(id) && !isActive);
    });
  }

  /* ------------------------------------------------------------------ */
  /* شيت الاختيار بالشاشات الصغيرة                                       */
  /* ------------------------------------------------------------------ */
  function openSheet() {
    sheetBackdrop.hidden = false;
    sheet.hidden = false;
    // فريم إضافي عشان الترانزيشن يشتغل صح بعد إزالة hidden
    requestAnimationFrame(() => {
      sheetBackdrop.classList.add("is-visible");
      sheet.classList.add("is-open");
    });
    mobileTrigger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onSheetKeydown);
  }

  function closeSheet() {
    sheetBackdrop.classList.remove("is-visible");
    sheet.classList.remove("is-open");
    mobileTrigger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onSheetKeydown);
    setTimeout(() => {
      if (!sheet.classList.contains("is-open")) {
        sheet.hidden = true;
        sheetBackdrop.hidden = true;
      }
    }, 320);
  }

  function onSheetKeydown(e) {
    if (e.key === "Escape") closeSheet();
  }

  mobileTrigger.addEventListener("click", () => {
    if (sheet.classList.contains("is-open")) {
      closeSheet();
    } else {
      openSheet();
    }
  });
  sheetBackdrop.addEventListener("click", closeSheet);

  /* ------------------------------------------------------------------ */
  /* الشريط المتحرك خلف العنصر المفعّل بالسايدبار (شاشات كبيرة)           */
  /* ------------------------------------------------------------------ */
  function moveIndicator(activeBtn) {
    if (!activeBtn || window.innerWidth <= MOBILE_BREAKPOINT) return;
    const navRect = guideNav.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    navIndicator.style.height = `${btnRect.height}px`;
    navIndicator.style.transform = `translateY(${btnRect.top - navRect.top}px)`;
    navIndicator.classList.add("is-ready");
  }

  /* ------------------------------------------------------------------ */
  /* تبديل اللوحات + انيميشن سلايد بالاتجاه الصحيح                       */
  /* ------------------------------------------------------------------ */
  let currentId = null;

  function showPage(id, opts) {
    opts = opts || {};
    const exists = document.querySelector(`.guide-panel[data-panel="${id}"]`);
    const targetId = exists ? id : "add-price";

    const prevIndex = pageOrder.indexOf(currentId);
    const nextIndex = pageOrder.indexOf(targetId);
    const goingForward = prevIndex === -1 || nextIndex >= prevIndex;

    contentPanels.forEach((panel) => {
      const isTarget = panel.getAttribute("data-panel") === targetId;
      panel.hidden = !isTarget;
      panel.classList.remove("is-slide-in-fwd", "is-slide-in-back");
      if (isTarget && !opts.skipAnimation) {
        // إعادة تشغيل الانيميشن
        void panel.offsetWidth;
        panel.classList.add(goingForward ? "is-slide-in-fwd" : "is-slide-in-back");
      }
    });

    asidePanels.forEach((panel) => {
      panel.hidden = panel.getAttribute("data-panel") !== targetId;
    });

    const activeBtn = navButtons.find((btn) => btn.getAttribute("data-page") === targetId);
    navButtons.forEach((btn) => {
      const isActive = btn === activeBtn;
      const visited = new Set(getVisited());
      btn.classList.toggle("is-active", isActive);
      btn.classList.toggle("is-done", visited.has(btn.getAttribute("data-page")) && !isActive);
      btn.setAttribute("aria-current", isActive ? "page" : "false");
    });
    moveIndicator(activeBtn);

    if (mobileTriggerTitle && activeBtn) {
      mobileTriggerTitle.textContent = activeBtn.querySelector(
        "span:not(.guide-nav-icon):not(.guide-nav-check)"
      ).textContent;
    }
    refreshSheetState(targetId);

    markVisited(targetId);
    currentId = targetId;

    if (!opts.skipHash) {
      history.replaceState(null, "", `#${targetId}`);
    }
    // ملاحظة: ما في أي سكرول تلقائي هون بقصد — التنقل بين الأقسام لازم يصير
    // بمكانه بدون ما تتحرك الصفحة أو ينسحب المستخدم لتحت/لفوق.
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      showPage(btn.getAttribute("data-page"));
    });
  });

  // دعم زر رجوع/تقدم المتصفح بين أقسام الدليل
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace("#", "");
    if (id) showPage(id, { skipHash: true });
  });

  // زر الرجوع بالهيدر
  document.getElementById("guideBackBtn").addEventListener("click", () => {
    if (document.referrer) {
      history.back();
    } else {
      window.location.href = "home.html";
    }
  });

  // إعادة ضبط موقع الشريط المتحرك لما يتغيّر حجم الشاشة (مثلاً تدوير الجوال)
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const activeBtn = navButtons.find((btn) => btn.classList.contains("is-active"));
      moveIndicator(activeBtn);
      if (window.innerWidth > MOBILE_BREAKPOINT) closeSheet();
    }, 120);
  });

  /* ------------------------------------------------------------------ */
  /* مبدّل اللغة: نفس ماركب/كلاسات الصفحة الرئيسية (.lang-switcher)      */
  /* بيبدّل dir/lang محلياً، بيترجم كل نص الصفحة فعلياً عبر               */
  /* applyGuideI18n، وبيبعت حدث لباقي نظام الموقع.                       */
  /* لو الصفحة عندها js/i18n.js عام زي الرئيسية، اربط عليه عن طريق:       */
  /*   window.addEventListener('gm:language-change', (e) => { ... })     */
  /* ------------------------------------------------------------------ */
  const LANG_FLAGS = {
    en: "assets/img/us.svg",
    ar: "assets/img/ps.svg",
  };

  function closeLangDropdown() {
    langDropdown.style.display = "";
    langSwitcher.classList.remove("is-open");
    selectedLang.setAttribute("aria-expanded", "false");
  }

  function openLangDropdown() {
    langDropdown.style.display = "block";
    langSwitcher.classList.add("is-open");
    selectedLang.setAttribute("aria-expanded", "true");
  }

  selectedLang.addEventListener("click", (e) => {
    e.stopPropagation();
    if (langSwitcher.classList.contains("is-open")) {
      closeLangDropdown();
    } else {
      openLangDropdown();
    }
  });

  selectedLang.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectedLang.click();
    } else if (e.key === "Escape") {
      closeLangDropdown();
    }
  });

  document.addEventListener("click", (e) => {
    if (!langSwitcher.contains(e.target)) closeLangDropdown();
  });

  function applyLang(lang) {
    const isEn = lang === "en";
    document.documentElement.setAttribute("lang", isEn ? "en" : "ar");
    document.documentElement.setAttribute("dir", isEn ? "ltr" : "rtl");
    selectedLangFlag.src = LANG_FLAGS[lang] || LANG_FLAGS.ar;
    selectedLangFlag.alt = isEn ? "EN" : "AR";
    langOptions.forEach((li) => {
      li.classList.toggle("is-selected", li.getAttribute("data-lang") === lang);
    });
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      /* تجاهل */
    }

    // ترجمة كل نص الصفحة فعلياً (مو بس الاتجاه والعلم)
    applyGuideI18n(isEn ? "en" : "ar");

    window.dispatchEvent(new CustomEvent("gm:language-change", { detail: { lang } }));
    // إعادة قياس مكان الشريط المتحرك لأن اتجاه الصفحة ممكن يتغيّر
    requestAnimationFrame(() => {
      const activeBtn = navButtons.find((btn) => btn.classList.contains("is-active"));
      moveIndicator(activeBtn);
    });
  }

  langOptions.forEach((li) => {
    li.addEventListener("click", () => {
      applyLang(li.getAttribute("data-lang"));
      closeLangDropdown();
    });
  });

  /* ------------------------------------------------------------------ */
  /* نقطة البداية                                                        */
  /* ------------------------------------------------------------------ */
  buildSheetNav();
  closeLangDropdown();

  let savedLang = "ar";
  try {
    savedLang = localStorage.getItem(LANG_KEY) || "ar";
  } catch (e) {
    /* تجاهل */
  }
  applyLang(savedLang);

  const initialId = location.hash.replace("#", "") || "add-price";
  showPage(initialId, { skipScroll: true, skipAnimation: true });

  // بعد أول رسم، فعّل الشريط المتحرك بحركة سلسة
  requestAnimationFrame(() => {
    const activeBtn = navButtons.find((btn) => btn.classList.contains("is-active"));
    moveIndicator(activeBtn);
  });
})();