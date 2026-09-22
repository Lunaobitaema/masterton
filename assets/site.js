/* ============================================================
   GLASSGUARD — спільний скрипт для всіх сторінок

   ↓↓↓ НАЛАШТУВАННЯ — ЄДИНЕ МІСЦЕ, ДЕ ЩОСЬ МІНЯЄТЬСЯ ↓↓↓
   ============================================================ */

/* 1. ПОШТА. Ключ із web3forms.com — заявки приходять на пошту. */
const FORM_ACCESS_KEY = "89124f4d-d4c9-4083-8bc5-53c192405693";

/* 2. TELEGRAM — спосіб А (рекомендований, токен прихований).
      Адреса вашого Google Apps Script.
      Як отримати — див. файл telegram/ЯК-ПІДКЛЮЧИТИ-TELEGRAM.txt
      Виглядає так: https://script.google.com/macros/s/AKfycb.../exec  */
const LEAD_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxSkVyCqp533gq33XkA9CodTa80xl6H8040efpNDcx1zE7pf3_iAWQmHC9J6ZEnefD80Q/exec";

/* 3. TELEGRAM — спосіб Б (швидкий, але токен бота буде видно всім,
      хто відкриє код сторінки). Заповнюйте ТІЛЬКИ якщо не робите спосіб А. */
const TELEGRAM_BOT_TOKEN = "";
const TELEGRAM_CHAT_ID   = "";

/* ------------------------------------------------------------
   Далі — робочий код. Змінювати не треба.
   ------------------------------------------------------------ */

/* --- мобільне меню --- */
(function () {
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  function setOpen(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
})();

/* --- тінь у шапці при прокрутці --- */
(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* --- плаваюча кнопка зв'язку --- */
(function () {
  const btn = document.getElementById('floatMain');
  const opts = document.getElementById('floatOpts');
  if (!btn || !opts) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    opts.classList.toggle('open', open);
  });
})();

/* --- спливаюче повідомлення --- */
function showToast(text, isError) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.classList.toggle('err', !!isError);
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 4500);
}

/* --- надсилання заявки ---
   Заявка йде ПАРАЛЕЛЬНО на пошту і в Telegram. Якщо один канал
   не спрацював — другий усе одно доставить. Успіхом вважається
   доставка хоча б в один канал.
*/
(function () {
  const forms = document.querySelectorAll('form.lead-form');
  if (!forms.length) return;

  const val = (f, n) => (f.querySelector(`[name="${n}"]`)?.value || '').trim();

  /* канал 1 — пошта через Web3Forms */
  async function sendEmail(payload) {
    if (!FORM_ACCESS_KEY || FORM_ACCESS_KEY === 'ЗАМІНІТЬ_МЕНЕ') return false;
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: FORM_ACCESS_KEY,
        subject: payload.subject,
        from_name: 'Сайт GlassGuard',
        name: payload.name,
        phone: payload.phone,
        message: payload.message
      })
    });
    const json = await res.json();
    return !!json.success;
  }

  /* канал 2 — Telegram через Google Apps Script (токен прихований) */
  async function sendViaWebhook(payload) {
    if (!LEAD_WEBHOOK_URL) return false;
    // важливо: тіло надсилається як простий текст, інакше Google
    // відхилить запит через правила безпеки браузера (CORS)
    const res = await fetch(LEAD_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    return json.ok !== false;
  }

  /* канал 2 — запасний варіант: напряму в Telegram */
  async function sendDirectTelegram(payload) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: '🔔 Нова заявка з сайту GlassGuard\n\n' + payload.message,
        disable_web_page_preview: true
      })
    });
    const json = await res.json();
    return !!json.ok;
  }

  forms.forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      // пастка для спам-ботів: люди це поле не бачать і не заповнюють
      if (form.querySelector('[name="botcheck"]')?.checked) return;

      const btn = form.querySelector('button[type="submit"]');
      const name = val(form, 'name');
      const phone = val(form, 'phone');

      if (!name || !phone) { showToast("Вкажіть, будь ласка, ім'я та телефон", true); return; }
      if (phone.replace(/\D/g, '').length < 9) { showToast('Схоже, номер телефону неповний', true); return; }
      if (!form.querySelector('[name="consent"]')?.checked) { showToast('Потрібна згода на обробку даних', true); return; }

      const channelsConfigured =
        (FORM_ACCESS_KEY && FORM_ACCESS_KEY !== 'ЗАМІНІТЬ_МЕНЕ') ||
        LEAD_WEBHOOK_URL || (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

      if (!channelsConfigured) {
        showToast('Форма ще не підключена. Зателефонуйте нам або напишіть у Telegram.', true);
        return;
      }

      // збираємо читабельний текст заявки
      const rows = [
        ["Ім'я", name],
        ['Телефон', phone],
        ['Послуга', val(form, 'service')],
        ['Тип об’єкта', val(form, 'object')],
        ['Обсяг', val(form, 'volume')],
        ['Коментар', val(form, 'comment')],
        ['Сторінка', form.dataset.page || document.title],
        ['Час', new Date().toLocaleString('uk-UA')]
      ].filter(r => r[1]);

      // якщо послуга і сторінка збігаються — не дублюємо рядок
      const svc = val(form, 'service');
      const rowsClean = rows.filter(r => !(r[0] === 'Сторінка' && r[1] === svc));

      const payload = {
        name: name,
        phone: phone,
        service: val(form, 'service'),
        object: val(form, 'object'),
        volume: val(form, 'volume'),
        comment: val(form, 'comment'),
        page: form.dataset.page || document.title,
        subject: `Заявка з сайту: ${name}, ${phone}`,
        message: rowsClean.map(r => `${r[0]}: ${r[1]}`).join('\n')
      };

      const label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }

      // обидва канали стартують одночасно; падіння одного не ламає інший
      const safe = fn => fn(payload).catch(() => false);
      const results = await Promise.all([
        safe(sendEmail),
        LEAD_WEBHOOK_URL ? safe(sendViaWebhook) : safe(sendDirectTelegram)
      ]);

      if (btn) { btn.disabled = false; btn.textContent = label; }

      if (results.some(Boolean)) {
        form.reset();
        showToast('Заявку надіслано. Зв’яжемось протягом 30 хвилин.');
      } else {
        showToast('Не вдалося надіслати. Спробуйте ще раз або зателефонуйте.', true);
      }
    });
  });
})();
