// PDF booking pass / receipt, generated on the fly (nothing is stored on disk).
//
// - pdfkit draws the page; the QR code is drawn as vector squares from the
//   `qrcode` module matrix, so it stays sharp when printed.
// - pdfkit's built-in fonts can't show Azerbaijani letters (ə ı ğ ş), so we
//   bundle DejaVu Sans (free licence, also covers Russian) in src/assets/fonts.
// - Labels exist in az / en / ru; the tour title uses tours.title_i18n.

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');
const REGULAR = path.join(FONT_DIR, 'DejaVuSans.ttf');
const BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

// Same palette as the website (frontend/app/globals.css).
const C = {
  primary: '#1B3D2F',
  accent: '#B15A2A',
  text: '#23281F',
  muted: '#7C7364',
  border: '#E4DBC7',
  bg: '#FBF7EF',
  red: '#B42318',
};

export const TICKET_LANGS = ['az', 'en', 'ru'];

const L = {
  az: {
    eTicket: 'E-BİLET',
    operator: 'OPERATOR',
    passenger: 'SƏRNİŞİN',
    dateTime: 'TARİX VƏ VAXT',
    pickup: 'GÖRÜŞ YERİ',
    seats: 'YERLƏR',
    total: 'ÜMUMİ MƏBLƏĞ',
    totalPaid: 'ÖDƏNİLİB',
    estimated: 'TƏXMİNİ MƏBLƏĞ',
    ticketCode: 'Bilet kodu',
    paidWith: 'Ödəniş',
    bookedOn: 'Rezervasiya tarixi',
    confirmed: 'TƏSDİQLƏNİB',
    pending: 'GÖZLƏYİR',
    cancelled: 'LƏĞV EDİLİB',
    pendingNote: 'Qrup minimum sayına çatmayıb. Kartınızdan hələ vəsait çıxarılmayıb.',
    refunded: 'Geri ödənilib',
    showQr: 'Tur günü bu biletdəki QR kodu operatora göstərin.',
    policyTitle: 'Ləğv etmə və geri ödəniş qaydaları',
    policy: ['7+ gün qalmış: 100% geri ödəniş', '3–6 gün qalmış: 50% geri ödəniş', '0–2 gün qalmış: geri ödəniş yoxdur', 'Operator ləğv edərsə və ya qrup tamamlanmazsa: 100%'],
    seatsN: (n) => `${n} nəfər`,
  },
  en: {
    eTicket: 'E-TICKET',
    operator: 'OPERATOR',
    passenger: 'PASSENGER',
    dateTime: 'DATE & TIME',
    pickup: 'PICKUP',
    seats: 'SEATS',
    total: 'TOTAL',
    totalPaid: 'TOTAL PAID',
    estimated: 'ESTIMATED TOTAL',
    ticketCode: 'Ticket code',
    paidWith: 'Paid with',
    bookedOn: 'Booked on',
    confirmed: 'CONFIRMED',
    pending: 'PENDING',
    cancelled: 'CANCELLED',
    pendingNote: "The group hasn't reached its minimum yet. Your card has not been charged.",
    refunded: 'Refunded',
    showQr: 'Show the QR code on this ticket to the operator on the tour day.',
    policyTitle: 'Cancellation & refund policy',
    policy: ['7+ days before the tour: 100% refund', '3–6 days before: 50% refund', '0–2 days before: no refund', 'Operator cancels or group incomplete: 100% refund'],
    seatsN: (n) => `${n} ${n === 1 ? 'person' : 'people'}`,
  },
  ru: {
    eTicket: 'ЭЛЕКТРОННЫЙ БИЛЕТ',
    operator: 'ОПЕРАТОР',
    passenger: 'ПАССАЖИР',
    dateTime: 'ДАТА И ВРЕМЯ',
    pickup: 'МЕСТО ВСТРЕЧИ',
    seats: 'МЕСТА',
    total: 'ИТОГО',
    totalPaid: 'ОПЛАЧЕНО',
    estimated: 'ПРЕДВАРИТЕЛЬНАЯ СУММА',
    ticketCode: 'Код билета',
    paidWith: 'Оплата',
    bookedOn: 'Дата бронирования',
    confirmed: 'ПОДТВЕРЖДЕНО',
    pending: 'ОЖИДАЕТ',
    cancelled: 'ОТМЕНЕНО',
    pendingNote: 'Группа ещё не набрала минимум. С вашей карты пока ничего не списано.',
    refunded: 'Возвращено',
    showQr: 'В день тура покажите QR-код с этого билета оператору.',
    policyTitle: 'Правила отмены и возврата',
    policy: ['За 7+ дней: возврат 100%', 'За 3–6 дней: возврат 50%', 'За 0–2 дня: возврата нет', 'Оператор отменил тур или группа не набралась: 100%'],
    seatsN: (n) => `${n} чел.`,
  },
};

const LOCALE = { az: 'az-AZ', en: 'en-GB', ru: 'ru-RU' };

function formatDate(ymd, lang) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!y) return String(ymd ?? '');
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(LOCALE[lang], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

const azn = (n) => `${(Number(n) || 0).toFixed(2)} AZN`;

// Same rule the e-ticket page uses: the first non-empty line of `route` is the pickup,
// optionally "HH:MM - place".
function parseFirstStop(route) {
  const line = String(route ?? '').split('\n').map((l) => l.trim()).filter(Boolean)[0];
  if (!line) return null;
  const m = line.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(.+)$/);
  return m ? { time: m[1], text: m[2] } : { time: null, text: line };
}

function pickTitle(tour, lang) {
  try {
    const i18n = typeof tour.title_i18n === 'string' ? JSON.parse(tour.title_i18n) : tour.title_i18n;
    return i18n?.[lang] || tour.title;
  } catch {
    return tour.title;
  }
}

function drawQr(doc, text, x, y, size) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const cell = size / n;
  doc.save().fillColor('#000000');
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.data[r * n + c]) doc.rect(x + c * cell, y + r * cell, cell + 0.2, cell + 0.2).fill();
    }
  }
  doc.restore();
}

/**
 * @param {object} p
 * @param {object} p.booking   bookings row
 * @param {object} p.tour      { title, title_i18n, date, location, route, operator_name }
 * @param {object} p.user      { name, email }
 * @param {string} p.lang      'az' | 'en' | 'ru'
 * @returns PDFDocument (already has .end() queued after drawing - pipe it to the response)
 */
export function renderTicketPdf({ booking, tour, user, lang }) {
  const t = L[TICKET_LANGS.includes(lang) ? lang : 'az'];
  const lg = TICKET_LANGS.includes(lang) ? lang : 'az';

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: { Title: `TurPoint ${booking.ticket_code}`, Author: 'TurPoint', Subject: t.eTicket },
  });
  doc.registerFont('R', REGULAR);
  doc.registerFont('B', BOLD);

  const W = doc.page.width;
  const M = 45;
  const cardX = M;
  const cardW = W - 2 * M;
  const isCancelled = booking.status === 'cancelled';
  const isPending = booking.status === 'pending';
  const pickup = parseFirstStop(tour.route);
  const title = pickTitle(tour, lg);

  // page background
  doc.rect(0, 0, W, doc.page.height).fill(C.bg);

  // brand row
  doc.font('B').fontSize(20).fillColor(C.primary).text('TurPoint', cardX, 38, { lineBreak: false });
  doc.font('R').fontSize(9).fillColor(C.muted).text('turpoint · Azerbaijan tours marketplace', cardX, 46, { width: cardW, align: 'right', lineBreak: false });

  // card
  const cardY = 80;
  const headH = 86;
  const bodyH = 372;
  doc.roundedRect(cardX, cardY, cardW, headH + bodyH, 12).fill('#FFFFFF');
  doc.roundedRect(cardX, cardY, cardW, headH + bodyH, 12).lineWidth(1).stroke(C.border);

  // header band (rounded top, square bottom)
  doc.save();
  doc.roundedRect(cardX, cardY, cardW, headH, 12).clip();
  doc.rect(cardX, cardY, cardW, headH).fill(C.primary);
  doc.restore();
  doc.rect(cardX, cardY + headH - 12, cardW, 12).fill(C.primary); // square off the bottom corners

  doc.font('R').fontSize(8).fillColor('#FFFFFF').opacity(0.75)
    .text(t.eTicket, cardX + 22, cardY + 18, { characterSpacing: 1.5, lineBreak: false });
  doc.opacity(1).font('B').fontSize(16).fillColor('#FFFFFF')
    .text(title, cardX + 22, cardY + 34, { width: cardW - 44, height: 44, ellipsis: true });

  // two columns of facts
  const col1 = cardX + 22;
  const col2 = cardX + cardW / 2 + 6;
  const colW = cardW / 2 - 34;
  let y = cardY + headH + 22;

  const field = (label, value, x, yy, w = colW) => {
    doc.font('R').fontSize(7.5).fillColor(C.muted).text(label, x, yy, { characterSpacing: 0.8, lineBreak: false });
    doc.font('B').fontSize(11).fillColor(C.text).text(value || '—', x, yy + 12, { width: w, height: 30, ellipsis: true });
  };

  field(t.passenger, user.name, col1, y);
  field(t.operator, tour.operator_name, col2, y);
  y += 54;
  field(t.dateTime, `${formatDate(tour.date, lg)}${pickup?.time ? ` · ${pickup.time}` : ''}`, col1, y);
  field(t.pickup, pickup?.text ?? tour.location, col2, y);
  y += 54;
  field(t.seats, t.seatsN(booking.seats), col1, y);
  field(t.bookedOn, String(booking.created_at ?? '').slice(0, 10), col2, y);

  // status pill
  y += 54;
  const statusLabel = isCancelled ? t.cancelled : isPending ? t.pending : t.confirmed;
  const statusColor = isCancelled ? C.red : isPending ? C.accent : C.primary;
  doc.font('B').fontSize(8.5);
  const pillW = doc.widthOfString(statusLabel) + 22;
  doc.roundedRect(col1, y, pillW, 20, 10).fill(statusColor);
  doc.fillColor('#FFFFFF').text(statusLabel, col1 + 11, y + 6, { lineBreak: false });

  // total
  doc.font('R').fontSize(7.5).fillColor(C.muted)
    .text(isPending ? t.estimated : t.totalPaid, col2, y - 4, { characterSpacing: 0.8, lineBreak: false });
  doc.font('B').fontSize(18).fillColor(C.text).text(azn(booking.total_price), col2, y + 6, { lineBreak: false });
  y += 36;

  if (isPending) {
    doc.font('R').fontSize(8.5).fillColor(C.accent).text(t.pendingNote, col1, y, { width: cardW - 44 });
  } else if (isCancelled && Number(booking.refund_amount) > 0) {
    doc.font('B').fontSize(9).fillColor(C.primary)
      .text(`${t.refunded}: ${azn(booking.refund_amount)}${booking.refund_percent != null ? ` (${booking.refund_percent}%)` : ''}`, col1, y, { width: cardW - 44 });
  } else if (booking.card_last4) {
    const brand = booking.card_brand === 'visa' ? 'Visa' : booking.card_brand === 'mastercard' ? 'Mastercard' : 'Card';
    doc.font('R').fontSize(8.5).fillColor(C.muted).text(`${t.paidWith}: ${brand} •••• ${booking.card_last4}`, col1, y, { width: cardW - 44 });
  }

  // perforation + stub with QR
  const stubY = cardY + headH + bodyH - 112;
  doc.moveTo(cardX + 14, stubY).lineTo(cardX + cardW - 14, stubY).lineWidth(1).dash(4, { space: 4 }).stroke(C.border).undash();
  doc.circle(cardX, stubY, 9).fill(C.bg);
  doc.circle(cardX + cardW, stubY, 9).fill(C.bg);

  const qrSize = 84;
  doc.roundedRect(cardX + cardW - 22 - qrSize - 12, stubY + 10, qrSize + 12, qrSize + 12, 6).lineWidth(1).stroke(C.border);
  drawQr(doc, booking.ticket_code, cardX + cardW - 22 - qrSize - 6, stubY + 16, qrSize);

  doc.font('R').fontSize(7.5).fillColor(C.muted).text(t.ticketCode.toUpperCase(), col1, stubY + 22, { characterSpacing: 0.8, lineBreak: false });
  doc.font('B').fontSize(20).fillColor(C.primary).text(booking.ticket_code, col1, stubY + 36, { lineBreak: false });
  doc.font('R').fontSize(8).fillColor(C.muted).text(t.showQr, col1, stubY + 66, { width: cardW - 44 - qrSize - 30 });

  // policy box
  const polY = cardY + headH + bodyH + 24;
  doc.font('B').fontSize(10).fillColor(C.primary).text(t.policyTitle, cardX, polY, { width: cardW });
  doc.font('R').fontSize(9).fillColor(C.text);
  t.policy.forEach((line, i) => doc.text(`•  ${line}`, cardX + 4, polY + 20 + i * 15, { width: cardW - 8, lineBreak: false }));

  doc.font('R').fontSize(7.5).fillColor(C.muted)
    .text(`TurPoint · ${booking.ticket_code} · ${new Date().toISOString().slice(0, 10)}`, cardX, doc.page.height - 40, { width: cardW, align: 'center', lineBreak: false });

  // diagonal watermark on cancelled tickets so a printout can't pass as valid
  if (isCancelled) {
    doc.save();
    doc.rotate(-28, { origin: [W / 2, 330] });
    doc.opacity(0.14).font('B').fontSize(78).fillColor(C.red)
      .text(t.cancelled, 0, 290, { width: W, align: 'center', lineBreak: false });
    doc.restore();
  }

  doc.end();
  return doc;
}
