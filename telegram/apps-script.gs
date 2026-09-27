/* ============================================================
   GLASSGUARD — приймач заявок для Telegram + Google Таблиця

   Цей код НЕ ЛЕЖИТЬ на сайті. Він працює на серверах Google,
   тому токен вашого бота ніхто зі сторонніх не побачить.

   Покрокова інструкція — у файлі ЯК-ПІДКЛЮЧИТИ-TELEGRAM.txt
   ============================================================ */

// ↓↓↓ ЗАПОВНІТЬ ЦІ ТРИ РЯДКИ ↓↓↓

const BOT_TOKEN = 'СЮДИ_ТОКЕН_БОТА';      // від @BotFather
const CHAT_ID   = 'СЮДИ_ID_ЧАТУ';         // від @userinfobot або id групи
const SHEET_ID  = '';                      // необов'язково: id Google Таблиці для архіву

// ↑↑↑ більше нічого міняти не треба ↑↑↑


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const text = '🔔 НОВА ЗАЯВКА З САЙТУ\n\n' + (data.message || '');

    // 1. надсилаємо в Telegram
    UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    });

    // 2. якщо вказано SHEET_ID — дублюємо рядком у таблицю
    if (SHEET_ID) {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Дата', "Ім'я", 'Телефон', 'Послуга', "Тип об'єкта",
                         'Обсяг', 'Коментар', 'Сторінка']);
      }
      sheet.appendRow([
        new Date(),
        data.name || '',
        data.phone || '',
        data.service || '',
        data.object || '',
        data.volume || '',
        data.comment || '',
        data.page || ''
      ]);
    }

    return json({ ok: true });

  } catch (err) {
    // навіть при помилці відповідаємо коректно, щоб сайт не показав збій
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, status: 'GlassGuard lead receiver is running' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* --- Кнопка для перевірки ---
   Виберіть у списку зверху функцію testSend і натисніть "Виконати".
   Якщо все налаштовано — у вашому чаті з'явиться тестове повідомлення. */
function testSend() {
  doPost({
    postData: {
      contents: JSON.stringify({
        name: 'Тестова заявка',
        phone: '+380 67 000 00 00',
        service: 'Бронеплівка',
        object: 'Квартира',
        comment: 'Перевірка підключення',
        page: 'Тест',
        message: "Ім'я: Тестова заявка\nТелефон: +380 67 000 00 00\nПослуга: Бронеплівка\nКоментар: Перевірка підключення"
      })
    }
  });
}
