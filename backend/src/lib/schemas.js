// Zod schemas for every route that accepts a JSON body.
//
// Error messages deliberately reuse the strings the routes already returned:
// the login page (frontend/app/(auth)/login/page.tsx) matches several of them
// exactly to show a translated message, so they must not change.

import { z } from 'zod';

export const CATEGORIES = ['nature', 'history', 'wellness', 'food', 'entertainment'];

// ---- small building blocks -------------------------------------------------

// A string field with its own "missing" and "wrong type" messages.
const text = (missing, wrongType = missing) => z.string({ required_error: missing, invalid_type_error: wrongType });

// Optional free text that may be sent as null / '' to clear it.
const optionalText = (field, max) =>
  z.string({ invalid_type_error: `${field} must be a string` }).max(max, `${field} is too long (max ${max} characters)`).nullish();

const positiveInt = (missing, bad = missing) =>
  z.number({ required_error: missing, invalid_type_error: bad }).int(bad).positive(bad);

// 'YYYY-MM-DD' (an ISO date-time starting with one is fine too) that is a real calendar day.
function isCalendarDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// bcrypt only looks at the first 72 bytes, so anything past that would be silently ignored.
const MAX_PASSWORD_BYTES = 72;
const passwordRules = (s) =>
  s
    .min(6, 'password must be at least 6 characters')
    .refine((v) => Buffer.byteLength(v, 'utf8') <= MAX_PASSWORD_BYTES, `password must be at most ${MAX_PASSWORD_BYTES} bytes`);

const SIGNUP_REQUIRED = 'name, email, and password are required';
const LOGIN_REQUIRED = 'email and password are required';

// ---- auth ------------------------------------------------------------------

export const signupSchema = z.object({
  name: text(SIGNUP_REQUIRED, 'name must be a non-empty string')
    .min(1, SIGNUP_REQUIRED)
    .trim()
    .min(1, 'name must be a non-empty string')
    .max(100, 'name is too long (max 100 characters)'),
  email: text(SIGNUP_REQUIRED, 'a valid email address is required')
    .min(1, SIGNUP_REQUIRED)
    .trim()
    .toLowerCase()
    .max(254, 'a valid email address is required')
    .email('a valid email address is required'),
  password: passwordRules(text(SIGNUP_REQUIRED, 'password must be at least 6 characters').min(1, SIGNUP_REQUIRED)),
  account_type: z.enum(['traveler', 'operator']).default('traveler'),
});

// Login stays lenient on format on purpose: it must never lock out an
// existing account whose email/password predate a rule.
export const loginSchema = z.object({
  email: text(LOGIN_REQUIRED, 'email and password must be strings').min(1, LOGIN_REQUIRED).trim().toLowerCase(),
  password: text(LOGIN_REQUIRED, 'email and password must be strings').min(1, LOGIN_REQUIRED).max(1000, 'invalid email or password'),
});

// Account settings ("Personal details"). Every field is optional - a partial
// update. Optional text fields may be sent as '' to clear them.
const COUNTRY_CODE = /^[A-Z]{2}$/;
// E.164-ish: "+" then 7-15 digits. The page sends the dial code and the
// local number joined, with spaces stripped.
const PHONE = /^\+[1-9]\d{6,14}$/;
export const updateMeSchema = z.object({
  name: z.string({ invalid_type_error: 'name must be a string' }).trim().min(1, 'name cannot be empty').max(100, 'name is too long (max 100 characters)').optional(),
  first_name: z.string({ invalid_type_error: 'first_name must be a string' }).trim().min(1, 'first name cannot be empty').max(60, 'first name is too long').optional(),
  last_name: z.string({ invalid_type_error: 'last_name must be a string' }).trim().max(60, 'last name is too long').optional(),
  email: z
    .string({ invalid_type_error: 'email must be a string' })
    .trim()
    .toLowerCase()
    .min(1, 'email cannot be empty')
    .max(254, 'a valid email address is required')
    .email('a valid email address is required')
    .optional(),
  // Password changes go through PUT /me/password (it checks the current
  // password). Accepted here only so the route can reject it explicitly.
  password: z.any().optional(),
  id_number: z.string({ invalid_type_error: 'id_number must be a string' }).max(40, 'id_number is too long').optional(),
  phone: z.string({ invalid_type_error: 'phone must be a string' }).trim().refine((v) => v === '' || PHONE.test(v), 'a valid phone number is required').optional(),
  country: z.string({ invalid_type_error: 'country must be a string' }).trim().refine((v) => v === '' || COUNTRY_CODE.test(v), 'country must be a 2-letter code').optional(),
  preferred_language: z.enum(['az', 'en', 'ru'], { invalid_type_error: 'preferred_language must be az, en or ru' }).optional(),
});

// New passwords set from account settings: at least 8 characters with a
// digit and a symbol (signup keeps its older 6-character minimum so no
// existing flow breaks).
export const changePasswordSchema = z.object({
  current_password: text('current password is required').min(1, 'current password is required').max(1000, 'current password is incorrect'),
  new_password: passwordRules(text('new password is required'))
    .refine((v) => v.length >= 8, 'new password must be at least 8 characters')
    .refine((v) => /\d/.test(v), 'new password must contain a digit')
    .refine((v) => /[^A-Za-z0-9\s]/.test(v), 'new password must contain a symbol'),
});

export const deleteAccountSchema = z.object({
  password: text('password is required').min(1, 'password is required').max(1000, 'password is incorrect'),
});

// ---- tours -----------------------------------------------------------------

const TITLE_REQUIRED = 'title, price, date are required';

const tourFields = {
  title: text(TITLE_REQUIRED, 'title must be a string').trim().min(1, 'title cannot be empty').max(150, 'title is too long (max 150 characters)'),
  description: optionalText('description', 5000),
  location: optionalText('location', 200),
  category: z
    .string({ invalid_type_error: 'category must be a string' })
    .nullish()
    .refine((v) => v == null || v === '' || CATEGORIES.includes(v), `category must be one of: ${CATEGORIES.join(', ')}`),
  price: z
    .number({ required_error: TITLE_REQUIRED, invalid_type_error: 'price must be a positive number' })
    .positive('price must be a positive number')
    .max(100000, 'price is too high'),
  date: text(TITLE_REQUIRED, 'date must be a string (YYYY-MM-DD)').refine(isCalendarDate, 'date must be a valid date (YYYY-MM-DD)'),
  duration_days: z.number({ invalid_type_error: 'duration_days must be a number' }).int('duration_days must be a whole number').min(1, 'duration_days must be at least 1').max(365, 'duration_days is too long').optional(),
  min_participants: z.number({ invalid_type_error: 'min_participants must be at least 1' }).int('min_participants must be a whole number').min(1, 'min_participants must be at least 1').max(500, 'min_participants is too high').optional(),
  max_participants: z.number({ invalid_type_error: 'max_participants must be at least 1' }).int('max_participants must be a whole number').min(1, 'max_participants must be at least 1').max(500, 'max_participants is too high').optional(),
  interest_score: z.record(z.number().min(0).max(1)).optional(),
  features: optionalText('features', 500),
  vehicle_features: optionalText('vehicle_features', 500),
};

export const createTourSchema = z.object(tourFields);
export const updateTourSchema = z.object(tourFields).partial();

// ---- bookings --------------------------------------------------------------

const PAYMENT_REQUIRED = 'simulated payment details required (payment.card_number)';

export const createBookingSchema = z.object({
  tour_id: positiveInt('tour_id and seats are required', 'tour_id must be a positive whole number'),
  seats: z
    .number({ required_error: 'tour_id and seats are required', invalid_type_error: 'seats must be a positive whole number' })
    .int('seats must be a positive whole number')
    .min(1, 'seats must be a positive whole number')
    .max(100, 'seats must be a positive whole number'),
  // Only types and sizes here; card number / expiry / CVC rules live in
  // validateCard() (lib/payments.js), which owns the exact error messages.
  payment: z.object(
    {
      card_number: text(PAYMENT_REQUIRED, 'invalid card number').min(1, PAYMENT_REQUIRED).max(30, 'invalid card number'),
      expiry: z.string({ invalid_type_error: 'expiry must look like MM/YY' }).max(10, 'expiry must look like MM/YY').optional(),
      cvc: z.string({ invalid_type_error: 'invalid CVC' }).max(4, 'invalid CVC').optional(),
    },
    { required_error: PAYMENT_REQUIRED, invalid_type_error: PAYMENT_REQUIRED }
  ),
});

// ---- reviews ---------------------------------------------------------------

const rating = (missing) =>
  z
    .number({ required_error: missing, invalid_type_error: 'rating must be a whole number between 1 and 5' })
    .int('rating must be a whole number between 1 and 5')
    .min(1, 'rating must be a whole number between 1 and 5')
    .max(5, 'rating must be a whole number between 1 and 5');

const reviewComment = z.string({ invalid_type_error: 'comment must be a string' }).trim().max(2000, 'comment is too long (max 2000 characters)').nullish();

export const createReviewSchema = z.object({
  tour_id: positiveInt('tour_id and rating are required', 'tour_id must be a positive whole number'),
  rating: rating('tour_id and rating are required'),
  comment: reviewComment,
});

export const updateReviewSchema = z.object({
  rating: rating('rating is required').optional(),
  comment: reviewComment,
});

// ---- deals -----------------------------------------------------------------

const DEAL_REQUIRED = 'tour_id, discount_percent, and expires_at are required';

export const createDealSchema = z.object({
  tour_id: positiveInt(DEAL_REQUIRED, 'tour_id must be a positive whole number'),
  discount_percent: z
    .number({ required_error: DEAL_REQUIRED, invalid_type_error: 'discount_percent must be between 1 and 99' })
    .gt(0, 'discount_percent must be between 1 and 99')
    .lt(100, 'discount_percent must be between 1 and 99'),
  expires_at: text(DEAL_REQUIRED, 'expires_at must be an ISO date-time')
    .datetime({ offset: true, message: 'expires_at must be an ISO date-time (e.g. 2026-10-05T18:00:00Z)' })
    .refine((v) => Date.parse(v) > Date.now(), 'expires_at must be in the future'),
});

// ---- operators -------------------------------------------------------------

const operatorFields = {
  name: text('name is required', 'name is required').trim().min(1, 'name is required').max(100, 'name is too long (max 100 characters)'),
  description: optionalText('description', 2000),
  languages: optionalText('languages', 100),
  // Only our own uploads or an https URL - never javascript:/data: etc.
  photo_url: z
    .string({ invalid_type_error: 'photo_url must be a string' })
    .max(500, 'photo_url is too long')
    .refine((v) => v === '' || /^(https:\/\/|\/uploads\/)/.test(v), 'photo_url must be an https URL or an /uploads/ path')
    .nullish(),
  vehicle_features: optionalText('vehicle_features', 500),
  phone: text('a valid phone number starting with +994 is required').regex(/^\+994\d{9}$/, 'a valid phone number starting with +994 is required'),
  instagram: optionalText('instagram', 100),
  voen: text('a valid 10-digit VOEN is required').regex(/^\d{10}$/, 'a valid 10-digit VOEN is required'),
  business_card_last4: text('enter the last 4 digits of the demo business card').regex(/^\d{4}$/, 'enter the last 4 digits of the demo business card'),
};

export const createOperatorSchema = z.object(operatorFields);
export const updateOperatorSchema = z.object(operatorFields).partial();

// ---- small ones ------------------------------------------------------------

export const favoriteSchema = z.object({
  tour_id: positiveInt('tour_id is required', 'tour_id must be a positive whole number'),
});

export const saveTripSchema = z.object({
  title: text('title and trip are required', 'title must be a string').min(1, 'title and trip are required').max(200, 'title is too long (max 200 characters)'),
  trip: z.record(z.any(), { required_error: 'title and trip are required', invalid_type_error: 'trip must be an object' }),
});
