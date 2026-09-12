# 🚀 دليل نظام إدارة السرعات الديناميكي
## MikroTik Hotspot - Dynamic Speed Management System

---

## 📋 فهرس المحتويات
1. [نظرة عامة على النظام](#نظرة-عامة-على-النظام)
2. [البنية الكاملة للنظام](#البنية-الكاملة-للنظام)
3. [الخطوة 1: إعداد config.js](#الخطوة-1-إعداد-configjs)
4. [الخطوة 2: إعداد الـ HTML في index.html](#الخطوة-2-إعداد-الـ-html-في-indexhtml)
5. [الخطوة 3: سكريبت الربط الموحد](#الخطوة-3-سكريبت-الربط-الموحد)
6. [كيف يتصل النظام بالميكروتيك](#كيف-يتصل-النظام-بالميكروتيك)
7. [كيفية التطبيق في مشروع جديد](#كيفية-التطبيق-في-مشروع-جديد)
8. [أمثلة عملية للتعديل](#أمثلة-عملية-للتعديل)

---

## نظرة عامة على النظام

النظام يعمل على مبدأ **"مصدر واحد للحقيقة"** (Single Source of Truth):

```
config.js  ←→  السرعات  ←→  index.html (3 أماكن)  ←→  الميكروتيك
```

**المبدأ:** أي تغيير في `config.js` ينعكس تلقائياً على كل الواجهة دون لمس `index.html`.

---

## البنية الكاملة للنظام

### الأماكن الثلاثة التي تظهر فيها السرعات:

| المكان | الـ ID | الوصف |
|--------|--------|--------|
| 🔘 أزرار صفحة الدخول | `speedPillsRow` | شريط الأزرار الصغيرة |
| 📋 موداله الدخول | `speedModalList` | نافذة اختيار السرعة |
| ⚙️ موداله الحالة | `statusSpeedModalList` | نافذة تغيير السرعة أثناء الاتصال |

### الـ Elements المرتبطة بالميكروتيك:

| الـ Element | الـ ID | الدور |
|------------|--------|-------|
| `<select name="domain">` | `speed` | يرسل السرعة عند **تسجيل الدخول** |
| `<select>` | `speedchange` | يرسل السرعة عند **تغييرها أثناء الاتصال** |

---

## الخطوة 1: إعداد config.js

أضف قسم `"speeds"` داخل دالة `Config({...})`:

```javascript
// داخل ملف: config/config.js
Config({

  // ... باقي الإعدادات ...

  // =========================================================================
  // إعدادات السرعات - تحكم كامل من هنا بلمسة واحدة!
  // =========================================================================
  "login-speeds-mode": true,   // تفعيل نظام السرعات
  "speed-trychange": 3,        // أقصى عدد لمرات تغيير السرعة
  "speed-trychange-timeout": 3, // مدة الحظر بالدقائق عند التجاوز

  // =========================================================================
  // قائمة السرعات (هنا تضيف وتعدل وتخفي السرعات)
  // =========================================================================
  // لكل سرعة:
  //   name       → الاسم الذي يظهر للمستخدم
  //   value      → القيمة المرسلة للميكروتيك (اسم الـ Profile في الراوتر)
  //   visible    → true: ظاهرة | false: مخفية
  //   isDefault  → true: السرعة الافتراضية عند فتح الصفحة (واحدة فقط)
  //   badge      → شارة نصية ملونة بجانب الاسم (اتركه "" لإخفائه)
  "speeds": [
    { "name": "اقتصادية 🌟 4 ميجا",  "value": "2M/4M",   "visible": true,  "isDefault": false, "badge": "" },
    { "name": "قياسية 🥇 8 ميجا",    "value": "4M/8M",   "visible": true,  "isDefault": true,  "badge": "الأكثر طلباً" },
    { "name": "متوسطة ⚡ 16 ميجا",   "value": "8M/16M",  "visible": true,  "isDefault": false, "badge": "" },
    { "name": "عالية 🚀 32 ميجا",    "value": "16M/32M", "visible": true,  "isDefault": false, "badge": "" },
    { "name": "كروت المسابقات 🏆",   "value": "",        "visible": true,  "isDefault": false, "badge": "مفتوح" },
  ],

  // ... بقية الإعدادات ...
});
```

> ⚠️ **مهم جداً:** قيمة `"value"` يجب أن تطابق **بالضبط** اسم الـ Profile في الميكروتيك.

---

## الخطوة 2: إعداد الـ HTML في index.html

ضع كل هذا داخل فورم تسجيل الدخول `<form name="login">`:

### 2.1 - ترويسة السرعات (عنوان وشارة السرعة الحالية):

```html
<!-- ترويسة عنوان قسم السرعات -->
<div class="speed-selection-outer-header">
    <div class="card-section-title-wrap">
        <span class="card-section-icon">
            <svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
        </span>
        <span class="card-section-title">أختر سرعتك المناسبة</span>
    </div>
    <!-- id="selectedSpeedDisplay" يُحدَّث تلقائياً بالسرعة المختارة -->
    <span class="selected-speed-badge" id="selectedSpeedDisplay">قياسية 8 ميجا</span>
</div>
```

### 2.2 - بطاقة أزرار السرعة (Speed Pills):

```html
<!-- بطاقة شريط أزرار السرعة -->
<div class="app-card speed-selection-card">

    <!-- ✅ المفتاح: select مخفي مرتبط بالميكروتيك عبر name="domain" و speed-field -->
    <select id="speed" name="domain" speed-field style="display: none;">
        <option value="" disabled hidden selected>أختيار سرعة الإنترنت</option>
        <!-- خيارات السرعة تُبنى ديناميكياً من config.js بالسكريبت أدناه -->
    </select>

    <!-- شريط الأزرار الصغيرة - يُبنى ديناميكياً -->
    <div class="speed-slider-wrapper">
        <div class="speed-pills-row" id="speedPillsRow" role="radiogroup">
            <!-- يتم بناء أزرار السرعة ديناميكياً من config.js -->
        </div>
    </div>
</div>
```

### 2.3 - موداله اختيار السرعة (تظهر عند الضغط على سرعة):

```html
<!-- موداله تحديد السرعة (popup) -->
<div class="app" id="speed-modal">
    <div class="modal-sheet-card compact-speed-card">
        <div class="modal-header">
            <span class="title">
                <svg viewBox="0 0 24 24" class="modal-title-icon">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
                <span>تحديد سرعة الإنترنت</span>
            </span>
            <button class="modal-close-btn" type="button">✕ إغلاق</button>
        </div>

        <!-- قائمة البطاقات - تُبنى ديناميكياً -->
        <div class="speed-cards-list" id="speedModalList">
            <!-- يتم بناء بطاقات السرعة ديناميكياً من config.js -->
        </div>
    </div>
</div>
```

### 2.4 - موداله تغيير السرعة أثناء الاتصال (في صفحة الحالة):

```html
<!-- موداله تغيير السرعة أثناء الاتصال - توضع في قسم #status -->
<div class="app" id="status-speed-modal">
    <div class="modal-sheet-card compact-speed-card">
        <div class="modal-header">
            <span class="title">
                <svg viewBox="0 0 24 24" class="modal-title-icon">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
                <span>تغيير سرعة الإنترنت للكرت</span>
            </span>
            <button class="modal-close-btn" type="button">✕ إغلاق</button>
        </div>

        <!-- قائمة البطاقات - تُبنى ديناميكياً -->
        <div class="speed-cards-list" id="statusSpeedModalList">
            <!-- يتم بناء بطاقات السرعات ديناميكياً من config.js -->
        </div>

        <button class="button app-submit modal-cancel-btn back" type="button">
            <span>رجوع</span>
        </button>
    </div>
</div>

<!-- زر فتح موداله التغيير - يوضع في صفحة الحالة -->
<button type="button" class="status-select-trigger" id="statusSpeedTrigger"
    parent-id="status-speed-modal">
    <span id="statusSpeedTriggerText">أضغط هنا لتغيير سرعة الإنترنت</span>
</button>

<!-- select مخفي يرسل تغيير السرعة للميكروتيك -->
<select id="speedchange" class="tcs" style="display: none;">
    <option value="ns" disabled hidden selected>أضغط هنا لتغيير سرعة الإنترنت</option>
</select>
```

---

## الخطوة 3: سكريبت الربط الموحد

ضع هذا السكريبت **مرة واحدة** في `index.html` بعد موداله `#speed-modal` مباشرةً:

```html
<script>
(function initSpeedsFromConfig() {
    function run() {
        var speeds = (window.hotspotConfig || {})["speeds"];
        if (!speeds || !speeds.length) return;

        // ============================================================
        // 1. بناء أزرار صفحة الدخول + تعبئة select الميكروتيك
        // ============================================================
        var pillsRow  = document.getElementById("speedPillsRow");
        var speedSel  = document.getElementById("speed");        // ← مرتبط بالميكروتيك
        var speedDisp = document.getElementById("selectedSpeedDisplay");

        if (pillsRow && speedSel) {
            pillsRow.innerHTML = "";
            speedSel.innerHTML = '<option value="" disabled hidden selected>أختيار سرعة الإنترنت</option>';

            speeds.forEach(function (sp) {
                if (!sp.visible) return;

                // زر صغير (pill)
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "speed-pill-btn";
                btn.setAttribute("data-speed", sp.value);
                btn.setAttribute("data-speed-title", sp.name);

                var numMatch = sp.name.match(/\d+/);
                var num = numMatch ? numMatch[0] : sp.value;
                btn.innerHTML =
                    '<span class="pill-dot"></span>' +
                    '<span class="pill-num">' + num + '</span>' +
                    '<span class="pill-unit">ميجا</span>';

                if (sp.isDefault) {
                    btn.classList.add("active");
                    if (speedDisp) speedDisp.textContent = sp.name;
                }
                pillsRow.appendChild(btn);

                // إضافة خيار للـ select المخفي (يرسل للميكروتيك)
                var opt = document.createElement("option");
                opt.value = sp.value;
                opt.textContent = sp.name;
                if (sp.isDefault) opt.selected = true;
                speedSel.appendChild(opt);
            });

            // ✅ تأكيد القيمة الافتراضية بشكل صريح (ضروري للإرسال الصحيح)
            var def = speeds.find(function(s) { return s.visible && s.isDefault; });
            if (!def) def = speeds.find(function(s) { return s.visible; });
            if (def) speedSel.value = def.value;

            // أحداث أزرار الـ pill: عند الضغط → يُحدَّث الـ select
            var allPills = pillsRow.querySelectorAll(".speed-pill-btn");
            allPills.forEach(function (pill) {
                pill.addEventListener("click", function () {
                    allPills.forEach(function (p) { p.classList.remove("active"); });
                    pill.classList.add("active");
                    var val = pill.getAttribute("data-speed");
                    var title = pill.getAttribute("data-speed-title");
                    if (speedSel) speedSel.value = val;  // ← هنا يُحدَّث الميكروتيك select
                    if (speedDisp) speedDisp.textContent = title;
                    // تزامن مع موداله الدخول
                    document.querySelectorAll("#speedModalList .speed-card-option").forEach(function(c) {
                        c.classList.toggle("active", c.getAttribute("data-speed") === val);
                    });
                });
            });
        }

        // ============================================================
        // 2. بناء موداله اختيار السرعة في صفحة الدخول
        // ============================================================
        var loginModal = document.getElementById("speedModalList");
        if (loginModal) {
            loginModal.innerHTML = "";
            speeds.forEach(function (sp) {
                if (!sp.visible) return;
                var div = document.createElement("div");
                div.className = "speed-card-option" + (sp.isDefault ? " active" : "");
                div.setAttribute("data-speed", sp.value);
                div.setAttribute("data-speed-title", sp.name);
                var badge = sp.badge
                    ? '<span style="font-size:0.68rem;background:#f59e0b;color:#000;padding:1px 7px;border-radius:10px;font-weight:700;margin-right:6px;">' + sp.badge + '</span>'
                    : "";
                div.innerHTML =
                    '<div class="speed-card-indicator"><div class="speed-radio-dot"></div></div>' +
                    '<div class="speed-card-info"><span class="speed-card-name">' + sp.name + badge + '</span></div>';
                loginModal.appendChild(div);
            });

            var modalCards = loginModal.querySelectorAll(".speed-card-option");
            modalCards.forEach(function (card) {
                card.addEventListener("click", function () {
                    modalCards.forEach(function (c) { c.classList.remove("active"); });
                    card.classList.add("active");
                    var val = card.getAttribute("data-speed");
                    var title = card.getAttribute("data-speed-title");
                    if (speedSel) speedSel.value = val;  // ← تحديث الميكروتيك select
                    if (speedDisp) speedDisp.textContent = title;
                    // تزامن مع الأزرار الصغيرة
                    document.querySelectorAll("#speedPillsRow .speed-pill-btn").forEach(function(p) {
                        p.classList.toggle("active", p.getAttribute("data-speed") === val);
                    });
                    setTimeout(function () {
                        if (typeof closeAppModal === "function") closeAppModal("speed-modal");
                    }, 180);
                });
            });
        }

        // ============================================================
        // 3. بناء موداله تغيير السرعة أثناء الاتصال
        // ============================================================
        var statusModal = document.getElementById("statusSpeedModalList");
        var speedchange = document.getElementById("speedchange");   // ← مرتبط بالميكروتيك
        var triggerText = document.getElementById("statusSpeedTriggerText");

        if (statusModal) {
            statusModal.innerHTML = "";
            speeds.forEach(function (sp) {
                if (!sp.visible) return;
                var div = document.createElement("div");
                div.className = "speed-card-option" + (sp.isDefault ? " active" : "");
                div.setAttribute("data-status-speed", sp.value);
                div.setAttribute("data-speed-title", sp.name);
                var badge = sp.badge
                    ? '<span style="font-size:0.68rem;background:#f59e0b;color:#000;padding:1px 7px;border-radius:10px;font-weight:700;margin-right:6px;">' + sp.badge + '</span>'
                    : "";
                div.innerHTML =
                    '<div class="speed-card-indicator"><div class="speed-radio-dot"></div></div>' +
                    '<div class="speed-card-info"><span class="speed-card-name">' + sp.name + badge + '</span></div>';
                statusModal.appendChild(div);
            });

            var statusCards = statusModal.querySelectorAll(".speed-card-option");
            statusCards.forEach(function (card) {
                card.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    statusCards.forEach(function (c) { c.classList.remove("active"); });
                    card.classList.add("active");
                    var val = card.getAttribute("data-status-speed");
                    var title = card.getAttribute("data-speed-title");
                    if (triggerText) triggerText.textContent = title;
                    if (speedchange) {
                        speedchange.value = val;
                        // ← إرسال حدث التغيير للميكروتيك
                        speedchange.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    setTimeout(function () {
                        if (typeof closeAppModal === "function") closeAppModal("status-speed-modal");
                    }, 180);
                });
            });
        }
    }

    // تشغيل السكريبت بعد تحميل config.js
    if (window.hotspotConfig && window.hotspotConfig["speeds"]) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }
    } else {
        window.addEventListener("load", function () { setTimeout(run, 350); });
    }
})();
</script>
```

---

## كيف يتصل النظام بالميكروتيك

### عند تسجيل الدخول:

```
المستخدم يختار "قياسية 8 ميجا"
        ↓
السكريبت يضبط: speedSel.value = "4M/8M"
        ↓
main.min.js يقرأ: document.login.querySelector("select[speed-field]").value
        ↓
يرسل طلب HTTP: /login?username=XXXX&password=XXXX&domain=4M/8M
        ↓
الميكروتيك يطبق الـ Profile المسمى "4M/8M"
```

### عند تغيير السرعة أثناء الاتصال:

```
المستخدم يختار سرعة جديدة
        ↓
السكريبت يضبط: speedchange.value = "8M/16M"
        ↓
يُطلق: speedchange.dispatchEvent(new Event("change"))
        ↓
main.min.js يلتقط التغيير ويرسله للميكروتيك
```

---

## كيفية التطبيق في مشروع جديد

### قائمة المراجعة (Checklist):

- [ ] **1.** أضف قسم `"speeds"` في `config/config.js` مع سرعاتك
- [ ] **2.** تأكد أن `"value"` يطابق اسم الـ Profile في الميكروتيك
- [ ] **3.** أضف الـ HTML التالي داخل `<form name="login">`:
  - `<select id="speed" name="domain" speed-field style="display:none;">`
  - `<div id="speedPillsRow">` (فارغ)
  - `<div id="selectedSpeedDisplay">` (للعرض)
- [ ] **4.** أضف موداله `id="speedModalList"` (فارغة)
- [ ] **5.** أضف موداله `id="statusSpeedModalList"` (فارغة) في صفحة الحالة
- [ ] **6.** أضف `<select id="speedchange">` المخفي في صفحة الحالة
- [ ] **7.** الصق سكريبت الربط الموحد **مرة واحدة** بعد موداله `#speed-modal`
- [ ] **8.** تأكد من تحميل `init.min.js` قبل السكريبت

### ترتيب تحميل الملفات الصحيح:

```html
<head>
    <!-- init.min.js يحمل config.js ويُنشئ window.hotspotConfig -->
    <script src="js/init.min.js"></script>
</head>
<body>
    <!-- ... HTML ... -->

    <!-- سكريبت الربط يجب أن يكون بعد init.min.js -->
    <script>
        (function initSpeedsFromConfig() { ... })();
    </script>
</body>
```

---

## أمثلة عملية للتعديل

### إضافة سرعة جديدة (64 ميجا):

```javascript
"speeds": [
    // ... السرعات الموجودة ...
    { "name": "فائقة ⚡⚡ 64 ميجا", "value": "32M/64M", "visible": true, "isDefault": false, "badge": "جديد!" },
],
```

### إخفاء سرعة مؤقتاً (بدون حذفها):

```javascript
{ "name": "عالية 🚀 32 ميجا", "value": "16M/32M", "visible": false, "isDefault": false, "badge": "" },
```

### تغيير السرعة الافتراضية:

```javascript
// قبل: قياسية هي الافتراضية
{ "name": "قياسية 8 ميجا", "value": "4M/8M", "visible": true, "isDefault": true,  "badge": "" },
{ "name": "متوسطة 16 ميجا", "value": "8M/16M", "visible": true, "isDefault": false, "badge": "" },

// بعد: متوسطة هي الافتراضية
{ "name": "قياسية 8 ميجا", "value": "4M/8M", "visible": true, "isDefault": false, "badge": "" },
{ "name": "متوسطة 16 ميجا", "value": "8M/16M", "visible": true, "isDefault": true,  "badge": "" },
```

> ⚠️ **تحذير:** لا تضع `"isDefault": true` على أكثر من سرعة واحدة.

---

## هيكل الملفات الذي يهمك

```
مشروعك/
├── config/
│   └── config.js          ← ✅ هنا تعدل السرعات فقط
├── js/
│   ├── init.min.js        ← يحمل config.js ويعالجه
│   ├── main.min.js        ← يرسل السرعة للميكروتيك
│   └── templates.min.js   ← يبني قوالب مثل نقاط البيع
└── index.html             ← يحتوي على الهيكل + سكريبت الربط
```

---

*📅 تم إنشاء هذا الدليل بتاريخ 2026-08-25*
*✍️ نظام السرعات الديناميكي - BH-NET Hotspot Portal*
