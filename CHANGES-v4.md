# TurPoint fixes v4 (on top of v3 - copy over your project, same paths)

Frontend only. No backend changes, no new dependencies.

1. WhatsApp button now shows for any operator with a valid +994 number
   (app/(main)/tours/[id]/page.tsx). It no longer depends on phone_verified.
2. The phone send-code / verify UI and the "Verified" badge in the operator profile form are hidden unless
   NEXT_PUBLIC_PHONE_VERIFICATION=true (app/components/OperatorProfileForm.tsx). In production the backend
   answers 501 for those endpoints, so showing them only produced an error.
3. The tour page waits for the saved login to load, then fetches the tour WITH the token, so the server can
   recognise the owner and skip counting their own views (tours/[id]/page.tsx).
4. The cancel-booking confirmation now says the payment is a demo and nothing is refunded (az/en/ru,
   app/lib/translations.ts).
