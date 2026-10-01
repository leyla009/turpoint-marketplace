// Operator analytics: everything the dashboard's "Analytics" section shows,
// computed from data the app already stores (tours, bookings, reviews,
// group_formations). Kept as a plain function that takes the db handle so
// it can be unit-tested against a throwaway in-memory database.
//
// Definitions (the dashboard labels match these):
//  - "active" booking  = status confirmed OR pending (cancelled is ignored)
//  - revenue           = total_price of CONFIRMED bookings only; pending
//                        bookings (group hasn't hit its minimum yet) are
//                        reported separately as pending_revenue
//  - fill rate         = active seats / max_participants, per tour
//  - fill_rate_upcoming= the same, summed over tours that haven't happened yet
//  - conversion        = active bookings / tour page views (click_count)
//  - saves             = how many travelers favorited the tour (favorites table)
//    - views and saves keep working even when nobody books through the app
//    (bookings are optional now that travelers can contact operators directly)

const MONTHS_SHOWN = 6;

function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round((Number(n) || 0) * f) / f;
}

// Last N calendar months as 'YYYY-MM', oldest first, ending with the current
// month. UTC on purpose: SQLite's CURRENT_TIMESTAMP (bookings.created_at) is UTC.
function lastMonths(now, count) {
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function buildOperatorAnalytics(db, operatorId, now = new Date()) {
  const today = now.toISOString().slice(0, 10);

  const tourRows = db
    .prepare(
      `SELECT t.id, t.title, t.title_i18n, t.location, t.date, t.price,
              t.min_participants, t.max_participants,
              COALESCE(t.click_count, 0) AS views,
              COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.seats END), 0)        AS seats_confirmed,
              COALESCE(SUM(CASE WHEN b.status = 'pending'   THEN b.seats END), 0)        AS seats_pending,
              COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price END), 0)  AS revenue,
              COALESCE(SUM(CASE WHEN b.status = 'pending'   THEN b.total_price END), 0)  AS pending_revenue,
              COUNT(CASE WHEN b.status IN ('confirmed','pending') THEN 1 END)            AS bookings_count,
              (SELECT g.status FROM group_formations g
                WHERE g.tour_id = t.id ORDER BY g.id DESC LIMIT 1)                       AS group_status,
              (SELECT COUNT(*) FROM favorites f WHERE f.tour_id = t.id)                   AS favorites_count
       FROM tours t
       LEFT JOIN bookings b ON b.tour_id = t.id
       WHERE t.operator_id = ?
       GROUP BY t.id
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(operatorId);

  const reviewRows = db
    .prepare(
      `SELECT r.tour_id, COUNT(*) AS review_count, AVG(r.rating) AS avg_rating
       FROM reviews r
       JOIN tours t ON t.id = r.tour_id
       WHERE t.operator_id = ?
       GROUP BY r.tour_id`
    )
    .all(operatorId);
  const reviewsByTour = new Map(reviewRows.map((r) => [r.tour_id, r]));

  const tours = tourRows.map((t) => {
    const seatsActive = t.seats_confirmed + t.seats_pending;
    const review = reviewsByTour.get(t.id);
    return {
      id: t.id,
      title: t.title,
      title_i18n: t.title_i18n ?? null,
      location: t.location,
      date: t.date,
      price: t.price,
      min_participants: t.min_participants,
      max_participants: t.max_participants,
      views: t.views,
      favorites_count: t.favorites_count,
      bookings_count: t.bookings_count,
      seats_confirmed: t.seats_confirmed,
      seats_pending: t.seats_pending,
      revenue: round(t.revenue),
      pending_revenue: round(t.pending_revenue),
      fill_rate: t.max_participants > 0 ? round(Math.min(1, seatsActive / t.max_participants), 3) : 0,
      group_status: t.group_status ?? null,
      review_count: review ? review.review_count : 0,
      avg_rating: review ? round(review.avg_rating, 2) : null,
      is_upcoming: t.date >= today,
    };
  });

  // ---- overall summary (derived from the per-tour rows above) ----
  const sum = (key) => tours.reduce((s, t) => s + t[key], 0);
  const upcoming = tours.filter((t) => t.is_upcoming);
  const upcomingCapacity = upcoming.reduce((s, t) => s + t.max_participants, 0);
  const upcomingSeats = upcoming.reduce(
    (s, t) => s + Math.min(t.max_participants, t.seats_confirmed + t.seats_pending),
    0
  );
  const totalViews = sum('views');
  const totalBookings = sum('bookings_count');
  const totalReviews = sum('review_count');
  const ratingWeighted = tours.reduce((s, t) => s + (t.avg_rating ?? 0) * t.review_count, 0);

  const confirmedBookings = db
    .prepare(
      `SELECT COUNT(*) AS c FROM bookings b JOIN tours t ON t.id = b.tour_id
       WHERE t.operator_id = ? AND b.status = 'confirmed'`
    )
    .get(operatorId).c;

  const summary = {
    total_tours: tours.length,
    upcoming_tours: upcoming.length,
    total_bookings: totalBookings,
    confirmed_bookings: confirmedBookings,
    pending_bookings: totalBookings - confirmedBookings,
    seats_sold: sum('seats_confirmed'),
    seats_pending: sum('seats_pending'),
    revenue: round(sum('revenue')),
    pending_revenue: round(sum('pending_revenue')),
    fill_rate_upcoming: upcomingCapacity > 0 ? round(upcomingSeats / upcomingCapacity, 3) : null,
    total_views: totalViews,
    total_favorites: sum('favorites_count'),
    conversion_rate: totalViews > 0 ? round(totalBookings / totalViews, 3) : null,
    review_count: totalReviews,
    avg_rating: totalReviews > 0 ? round(ratingWeighted / totalReviews, 2) : null,
  };

  // ---- last 6 months of bookings (by when they were made) ----
  const months = lastMonths(now, MONTHS_SHOWN);
  const monthRows = db
    .prepare(
      `SELECT strftime('%Y-%m', b.created_at) AS month,
              COUNT(*) AS bookings,
              COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price END), 0) AS revenue
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE t.operator_id = ?
         AND b.status IN ('confirmed','pending')
         AND strftime('%Y-%m', b.created_at) >= ?
       GROUP BY month`
    )
    .all(operatorId, months[0]);
  const byMonth = new Map(monthRows.map((r) => [r.month, r]));
  const monthly = months.map((m) => ({
    month: m,
    bookings: byMonth.get(m)?.bookings ?? 0,
    revenue: round(byMonth.get(m)?.revenue ?? 0),
  }));

  return { summary, monthly, tours };
}
