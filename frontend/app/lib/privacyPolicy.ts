// TurPoint Privacy Policy content (English). Rendered by
// app/(main)/privacy/page.tsx. Kept as structured data rather than one
// long string so the page can number clauses, render tables and build the
// table of contents from the same source.
//
// Every statement here is meant to match what the product actually does
// (see backend/src/db/schema.sql, lib/payments.js, routes/planner.js,
// components/Greeting.tsx, DestinationMap.tsx). If a feature changes - a
// real payment provider, analytics, newsletters, a new map provider -
// update the matching clause and PRIVACY_LAST_UPDATED.

export const PRIVACY_EMAIL = 'privacy@turpoint.az';
export const PRIVACY_LAST_UPDATED = '6 October 2026';

export type PolicyBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export type PolicyClause = { title?: string; blocks: PolicyBlock[] };

export type PolicySection = {
  id: string;
  title: string;
  summary: string;
  clauses: PolicyClause[];
};

export const PRIVACY_INTRO =
  'This Privacy Policy explains how TurPoint collects, uses, shares and protects personal data when you use the TurPoint website and services, and the choices and rights you have. Please read it together with our Terms of Use.';

export const PRIVACY_SECTIONS: PolicySection[] = [
  {
    id: 'about',
    title: 'About this policy',
    summary:
      'TurPoint is an online marketplace that connects travellers with local tour operators in Azerbaijan. This policy covers everyone who visits or uses TurPoint, whether you are booking a tour or offering one.',
    clauses: [
      {
        title: 'Who we are',
        blocks: [
          {
            type: 'p',
            text: 'TurPoint ("TurPoint", "we", "us" or "our") operates the TurPoint online tour marketplace (the "Platform"). For the purposes of applicable data protection law, TurPoint is the controller of the personal data described in this policy, except where stated otherwise.',
          },
        ],
      },
      {
        title: 'Scope',
        blocks: [
          {
            type: 'p',
            text: 'This policy applies to personal data processed through the Platform, including by travellers ("Travellers"), tour operators and guides who list tours on the Platform ("Operators"), and visitors who browse without an account.',
          },
          {
            type: 'p',
            text: 'Operators who accept your booking act as independent controllers of the personal data they receive from us to deliver their tour, and handle it under their own privacy practices. This policy does not cover third-party websites or services that the Platform links to.',
          },
        ],
      },
      {
        title: 'Applicable law',
        blocks: [
          {
            type: 'p',
            text: 'We process personal data in accordance with the laws of the Republic of Azerbaijan, including the Law of the Republic of Azerbaijan "On Personal Data". Where the EU General Data Protection Regulation (Regulation (EU) 2016/679, "GDPR") applies to our processing of the personal data of individuals in the European Economic Area, we also comply with the GDPR.',
          },
        ],
      },
    ],
  },
  {
    id: 'collect',
    title: 'Information we collect',
    summary:
      'We collect what you give us (like your name, email and bookings) and some technical information your browser sends automatically. We never receive your full card number, and we only use your location if you allow it.',
    clauses: [
      {
        title: 'Account information',
        blocks: [
          {
            type: 'p',
            text: 'When you create an account we collect your full name, email address and password. Passwords are stored only in hashed form and cannot be read by us. Your language preference (Azerbaijani, English or Russian) is stored in your browser.',
          },
        ],
      },
      {
        title: 'Identity document number (optional)',
        blocks: [
          {
            type: 'p',
            text: 'You may choose to save your national ID card number (FIN) in your profile so that you do not need to re-enter it when booking. Providing it is optional. We use it only to identify you on bookings that require it, and you can remove it from your profile at any time.',
          },
        ],
      },
      {
        title: 'Booking and payment information',
        blocks: [
          {
            type: 'p',
            text: 'When you book a tour we record the tour, travel date, number of seats, price, booking status, cancellation and refund details, and a ticket code. When you pay, we receive your card details only to pass them for authorisation and keep only the card brand (for example, Visa) and the last four digits. We never store full card numbers or security codes (CVC). See section 6.',
          },
        ],
      },
      {
        title: 'Travel preferences and content you create',
        blocks: [
          {
            type: 'list',
            items: [
              'Saved trips and itineraries, including those built with the Smart Planner.',
              'Tours you save as favourites.',
              'Travel dates, routes and preferences you enter into search or the Smart Planner.',
              'Reviews and star ratings you publish about tours. Reviews are public and shown with your name.',
            ],
          },
        ],
      },
      {
        title: 'Location data',
        blocks: [
          {
            type: 'p',
            text: 'If you grant permission in your browser, the Platform reads your device location to show local weather and location-relevant content. Your browser sends these coordinates directly to our weather data provider (see section 4). TurPoint does not store your precise location on its servers. You can refuse or withdraw location access at any time in your browser or device settings, and the Platform will continue to work without it.',
          },
          {
            type: 'p',
            text: 'We may also infer an approximate location (such as your country or city) from your IP address.',
          },
        ],
      },
      {
        title: 'Device and usage information',
        blocks: [
          {
            type: 'p',
            text: 'When you use the Platform, our servers and service providers automatically receive technical information such as your IP address, browser type and version, device type, operating system, referring page, the pages you view and the date and time of your requests. We use this to operate, secure and improve the Platform, for example to prevent abuse and to count tour views without counting the same visitor twice.',
          },
        ],
      },
      {
        title: 'Operator information',
        blocks: [
          {
            type: 'p',
            text: 'If you register as an Operator, we also collect your business or trading name, description, languages spoken, profile and tour photos, vehicle details, phone number (including verification of that number), Instagram handle, and the tours, prices and offers you publish. Your Operator profile and tours are public.',
          },
        ],
      },
      {
        title: 'Communications',
        blocks: [
          {
            type: 'p',
            text: 'If you contact us, we keep your message, your contact details and our reply so that we can respond and keep a record of the request.',
          },
        ],
      },
    ],
  },
  {
    id: 'use',
    title: 'How we use your information',
    summary:
      'We use your information to run TurPoint: to show you tours, plan trips, make and manage bookings, and keep the Platform safe. We only send marketing if you have opted in.',
    clauses: [
      {
        title: 'Purposes',
        blocks: [
          {
            type: 'p',
            text: 'We use personal data for the following purposes:',
          },
          {
            type: 'list',
            items: [
              'Creating and managing your account and authenticating you when you sign in.',
              'Providing travel recommendations, localised content such as weather and maps, and itinerary-building tools including the Smart Planner.',
              'Processing bookings and payments, issuing tickets, and handling cancellations and refunds.',
              'Connecting you with the Operator delivering your tour when you make a booking.',
              'Sending booking confirmations, reminders, service alerts and in-app notifications.',
              'Sending newsletters and promotional messages, only where you have opted in.',
              'Publishing reviews and ratings, and calculating Operator ratings.',
              'Maintaining the security of the Platform, preventing fraud and abuse, and enforcing our Terms of Use.',
              'Analysing aggregated usage to improve the Platform, and showing Operators aggregated statistics about their own tours.',
              'Complying with legal obligations and responding to lawful requests from public authorities.',
            ],
          },
        ],
      },
      {
        title: 'Legal bases (GDPR)',
        blocks: [
          {
            type: 'p',
            text: 'Where the GDPR applies, we rely on the following legal bases:',
          },
          {
            type: 'table',
            head: ['Legal basis', 'When we rely on it'],
            rows: [
              ['Performance of a contract', 'Running your account, bookings, payments, tickets and booking-related messages.'],
              ['Consent', 'Device location, optional ID number, marketing messages, and any non-essential cookies or analytics we introduce. You can withdraw consent at any time.'],
              ['Legitimate interests', 'Keeping the Platform secure, preventing fraud, counting views, improving our services and responding to enquiries, where these interests are not overridden by your rights.'],
              ['Legal obligation', 'Keeping accounting and tax records and responding to lawful requests.'],
            ],
          },
        ],
      },
      {
        title: 'Automated planning',
        blocks: [
          {
            type: 'p',
            text: 'The Smart Planner uses an artificial intelligence model to suggest itineraries from the information you enter. Its suggestions are recommendations only. They do not produce legal or similarly significant effects on you, and you decide whether to book anything.',
          },
        ],
      },
    ],
  },
  {
    id: 'share',
    title: 'How we share your information',
    summary:
      'We share your information with the tour operator you book with, and with trusted companies that help us run the Platform. We never sell your personal data.',
    clauses: [
      {
        title: 'Tour operators',
        blocks: [
          {
            type: 'p',
            text: 'When you book a tour, we share with that Operator only the information necessary to deliver it, such as your name, booking details, number of seats and, where the tour requires it, your ID number. If you contact an Operator directly through WhatsApp, Instagram or another channel, your communication is governed by that service and by the Operator.',
          },
        ],
      },
      {
        title: 'Service providers',
        blocks: [
          {
            type: 'p',
            text: 'We use service providers who process personal data on our behalf and under our instructions:',
          },
          {
            type: 'table',
            head: ['Category', 'Provider', 'Data involved'],
            rows: [
              ['Cloud hosting', 'Railway (application and database), Vercel (website)', 'All Platform data, request logs and IP addresses.'],
              ['AI trip planning', 'Groq', 'The text, dates and preferences you enter into the Smart Planner, together with tour information.'],
              ['Weather data', 'Open-Meteo', 'Device coordinates (if you allow location access) or the destination you are viewing, and your IP address.'],
              ['Map tiles', 'Esri (ArcGIS)', 'Your IP address and the map area being displayed.'],
              ['Payment processing', 'Licensed, PCI-DSS compliant payment providers, such as local banks or Stripe', 'Card and transaction details needed to authorise and settle payments.'],
            ],
          },
          {
            type: 'p',
            text: 'We do not currently use third-party analytics or advertising tools. If we introduce analytics, such as Google Analytics, or a different mapping service, such as Google Maps or Mapbox, we will update this policy and, where required, ask for your consent first.',
          },
        ],
      },
      {
        title: 'Legal and safety reasons',
        blocks: [
          {
            type: 'p',
            text: 'We may disclose personal data where required by law, court order or a lawful request of a competent authority, or where necessary to protect the rights, property or safety of TurPoint, our users or others.',
          },
        ],
      },
      {
        title: 'Business transfers',
        blocks: [
          {
            type: 'p',
            text: 'If TurPoint is involved in a merger, acquisition, reorganisation or sale of assets, personal data may be transferred as part of that transaction. It will remain subject to this policy, or to a policy offering at least equivalent protection.',
          },
        ],
      },
      {
        title: 'No sale of personal data',
        blocks: [
          {
            type: 'p',
            text: 'We do not sell, rent or trade personal data to data brokers or any other third party, and we do not share it for third-party advertising.',
          },
        ],
      },
    ],
  },
  {
    id: 'transfers',
    title: 'International data transfers',
    summary:
      'Some of the companies that help us run TurPoint are based outside Azerbaijan, so your data may be processed abroad. When that happens, we use legal safeguards to protect it.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'Our service providers may store or process personal data in countries other than Azerbaijan or your own country, including the United States and member states of the European Union. Where we transfer personal data internationally, we do so in accordance with the Law "On Personal Data" and, where the GDPR applies, on the basis of an adequacy decision or appropriate safeguards such as the European Commission\'s Standard Contractual Clauses. You can contact us for more information about these safeguards.',
          },
        ],
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments and card security',
    summary:
      'Your card is handled by specialised payment providers that meet strict security standards. We keep only the card type and last four digits, never the full number.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'Payments are processed by third-party payment providers that comply with the Payment Card Industry Data Security Standard (PCI-DSS). TurPoint does not store full card numbers, expiry dates or card security codes on its servers. We retain only the card brand, the last four digits, the amount, the payment status and the provider\'s transaction reference, so that we can show your payment history and process refunds.',
          },
          {
            type: 'p',
            text: 'Payment providers process your payment data under their own terms and privacy policies, and may act as independent controllers for fraud prevention and regulatory purposes.',
          },
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookie Policy',
    summary:
      'TurPoint uses a small amount of storage in your browser to keep you signed in and remember your settings. We do not use advertising or tracking cookies.',
    clauses: [
      {
        title: 'What we use',
        blocks: [
          {
            type: 'p',
            text: 'Cookies are small text files placed on your device. Similar technologies, such as browser local storage, work in a comparable way. TurPoint currently uses browser local storage, not cookies, for the following strictly necessary and preference purposes:',
          },
          {
            type: 'table',
            head: ['Item', 'Purpose', 'Type', 'Duration'],
            rows: [
              ['Sign-in token', 'Keeps you signed in to your account.', 'Strictly necessary', 'Until you sign out or the token expires'],
              ['Language', 'Remembers your chosen language (AZ / EN / RU).', 'Preference', 'Until you clear your browser storage'],
              ['Account mode', 'Remembers whether you are using TurPoint as a traveller or an operator.', 'Preference', 'Until you sign out or clear your browser storage'],
            ],
          },
        ],
      },
      {
        title: 'Third-party content',
        blocks: [
          {
            type: 'p',
            text: 'Map tiles and weather data are loaded from third-party providers (see section 4). These providers receive your IP address and standard browser information when your browser requests their content, and may set their own cookies under their own policies.',
          },
        ],
      },
      {
        title: 'Analytics and advertising',
        blocks: [
          {
            type: 'p',
            text: 'We do not currently use analytics, advertising or cross-site tracking cookies. If we introduce analytics cookies in the future, we will ask for your consent where required before setting them, and we will update this Cookie Policy.',
          },
        ],
      },
      {
        title: 'Managing cookies and storage',
        blocks: [
          {
            type: 'p',
            text: 'You can delete or block cookies and local storage through your browser settings. Blocking strictly necessary storage will prevent you from staying signed in.',
          },
        ],
      },
    ],
  },
  {
    id: 'retention',
    title: 'Data retention',
    summary:
      'We keep your information only as long as we need it to provide the service or to meet legal requirements. After that, we delete it or anonymise it.',
    clauses: [
      {
        title: 'Retention periods',
        blocks: [
          {
            type: 'table',
            head: ['Data', 'How long we keep it'],
            rows: [
              ['Account information', 'For as long as your account is active. Deleted within 30 days after you ask us to delete your account, except as stated below.'],
              ['ID number (FIN)', 'Until you remove it from your profile or your account is deleted.'],
              ['Bookings, payments and refunds', 'For 5 years after the end of the year of the transaction, to meet accounting and tax obligations.'],
              ['Reviews and ratings', 'Until you delete them. When your account is deleted, reviews are removed or anonymised.'],
              ['Saved trips and favourites', 'Until you delete them or your account is deleted.'],
              ['Smart Planner conversations', 'Not stored on our servers unless you save the trip. The AI provider processes them only to generate a response.'],
              ['IP addresses used to count tour views', 'Held in temporary memory for up to 30 minutes and not written to our database.'],
              ['Operator profiles and tours', 'For as long as the Operator account is active. Booking records are kept as described above.'],
              ['Correspondence with us', 'Up to 2 years after the matter is closed.'],
            ],
          },
        ],
      },
      {
        title: 'Longer retention',
        blocks: [
          {
            type: 'p',
            text: 'We may keep data for longer where required by law, or where necessary to establish, exercise or defend legal claims. When data is no longer needed, we securely delete it or anonymise it so that it can no longer identify you.',
          },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'How we protect your information',
    summary:
      'We use technical and organisational measures to keep your data safe, but no online service can be completely secure. If a breach affects you, we will tell you as required by law.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'We use appropriate technical and organisational measures to protect personal data, including encrypted connections (HTTPS), hashed passwords, access controls limited to authorised personnel, and rate limiting to protect against automated attacks. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of a personal data breach that is likely to put your rights at risk, we will notify you and the relevant authorities as required by applicable law.',
          },
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    summary:
      'You can ask to see, correct or delete your personal data, and you can stop marketing at any time. Email us and we will respond within 30 days.',
    clauses: [
      {
        title: 'Your rights',
        blocks: [
          {
            type: 'p',
            text: 'Subject to applicable law, you have the right to:',
          },
          {
            type: 'list',
            items: [
              'Access: obtain confirmation of whether we process your personal data and a copy of it.',
              'Rectification: have inaccurate or incomplete data corrected. You can update most account details yourself in your profile.',
              'Erasure ("right to be forgotten"): have your account and personal data deleted, subject to the retention obligations in section 8.',
              'Restriction: ask us to limit how we use your data in certain circumstances.',
              'Objection: object to processing based on our legitimate interests, and object at any time to direct marketing.',
              'Data portability: receive data you provided to us in a structured, commonly used, machine-readable format (where the GDPR applies).',
              'Withdraw consent: withdraw any consent you have given, such as for location or marketing, without affecting processing carried out before withdrawal.',
              'Opt out of marketing: unsubscribe using the link in any marketing message or by contacting us.',
            ],
          },
        ],
      },
      {
        title: 'How to exercise your rights',
        blocks: [
          {
            type: 'p',
            text: `Send your request to ${PRIVACY_EMAIL} from the email address linked to your account. We may need to verify your identity before acting on a request. We will respond within 30 days. Where the law allows, we may extend this period for complex requests, in which case we will tell you why. Exercising your rights is free of charge, unless a request is manifestly unfounded or excessive.`,
          },
        ],
      },
      {
        title: 'Complaints',
        blocks: [
          {
            type: 'p',
            text: 'If you are not satisfied with how we have handled your personal data, please contact us first so that we can try to resolve the issue. You also have the right to lodge a complaint with the competent personal data authority of the Republic of Azerbaijan or, if you are in the European Economic Area, with the data protection supervisory authority in your country of residence or work.',
          },
        ],
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing communications',
    summary:
      'We only send newsletters or promotions if you have agreed to receive them. Booking and safety messages are not marketing and are still sent.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'We send newsletters and promotional messages only to users who have opted in. You can unsubscribe at any time using the link included in each message or by contacting us. Service messages, such as booking confirmations, changes, cancellations and security alerts, are necessary to provide the service and are sent regardless of your marketing preferences.',
          },
        ],
      },
    ],
  },
  {
    id: 'children',
    title: 'Children',
    summary:
      'TurPoint is meant for adults. Children can join tours booked by a parent or guardian, but they should not create their own accounts.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'The Platform is not directed at children under the age of 16, and we do not knowingly collect personal data from them without the consent of a parent or legal guardian. If you believe a child has provided us with personal data, please contact us and we will delete it.',
          },
        ],
      },
    ],
  },
  {
    id: 'links',
    title: 'Third-party websites and services',
    summary:
      'TurPoint links to other services such as WhatsApp, Instagram and Telegram. Those services have their own privacy rules, which we do not control.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'The Platform contains links to, and integrations with, third-party websites and services, including WhatsApp, Instagram and Telegram, and Operators\' own pages. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing them with personal data.',
          },
        ],
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    summary:
      'We may update this policy as TurPoint changes. If the changes are significant, we will let you know before they take effect.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: 'We may update this Privacy Policy from time to time. The "Last updated" date at the top shows when it was last revised. If we make material changes, we will notify you by email or through a notice on the Platform before the changes take effect. Your continued use of the Platform after that date means the updated policy applies to you.',
          },
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact us',
    summary:
      'Questions about your privacy are welcome. Email us and a member of our team will get back to you.',
    clauses: [
      {
        blocks: [
          {
            type: 'p',
            text: `For any questions, requests or complaints about this Privacy Policy or how we handle personal data, contact us at ${PRIVACY_EMAIL}.`,
          },
        ],
      },
    ],
  },
];
