/* ============================================================
   GLASSGUARD — спільний скрипт для всіх сторінок

   ⚠️ УВАГА: цей файл оновлено. Вставте свій ключ у рядок нижче
   ще раз (той самий, що вже працював).
   ============================================================ */

const FORM_ACCESS_KEY = "ЗАМІНІТЬ_МЕНЕ";

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
   Лист формується вручну одним читабельним блоком українською.
   Раніше назви полів були кирилицею і пошта показувала їх кракозябрами —
   тепер назви латиницею, а весь український текст іде в полі message.
*/
(function () {
  const forms = document.querySelectorAll('form.lead-form');
  if (!forms.length) return;

  const val = (f, n) => (f.querySelector(`[name="${n}"]`)?.value || '').trim();

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

      if (FORM_ACCESS_KEY === 'ЗАМІНІТЬ_МЕНЕ') {
        showToast('Форма ще не підключена. Зателефонуйте нам або напишіть у Telegram.', true);
        return;
      }

      // збираємо читабельний текст листа
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

      const message = rows.map(r => `${r[0]}: ${r[1]}`).join('\n');

      const payload = {
        access_key: FORM_ACCESS_KEY,
        subject: `Заявка з сайту: ${name}, ${phone}`,
        from_name: 'Сайт GlassGuard',
        name: name,
        phone: phone,
        message: message
      };

      const label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          form.reset();
          showToast('Заявку надіслано. Зв’яжемось протягом 30 хвилин.');
        } else {
          showToast('Не вдалося надіслати. Спробуйте ще раз або зателефонуйте.', true);
        }
      } catch (err) {
        showToast('Немає зв’язку з сервером. Спробуйте ще раз або зателефонуйте.', true);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    });
  });
})();
