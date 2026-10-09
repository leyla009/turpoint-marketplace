// English Terms of Use supplied for the TurPoint legal page.
// Keep each paragraph and list item separate so the page can render a
// readable document and generate its table of contents from this source.

export type TermsBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export type TermsSection = {
  id: string;
  title: string;
  blocks: TermsBlock[];
};

export const TERMS_LAST_UPDATED = '9 October 2026';

export const TERMS_INTRO =
  'Welcome to TurPoint. These Terms of Use govern your access to and use of the TurPoint website, services, and features. By accessing our platform, creating an account, or using any of our services, you agree to these terms.';

export const TERMS_READER_NOTE =
  'Please read them carefully before using TurPoint. If you do not agree with these terms, you should discontinue using the platform.';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'about-turpoint',
    title: 'About TurPoint',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint is an online platform designed to help travellers discover tours, explore destinations across Azerbaijan, and connect directly with tour operators.`,
      },
      {
        type: 'paragraph',
        text: `Our platform allows users to browse tour listings, compare available experiences, read reviews, and contact operators to obtain further information or arrange a booking.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint acts as a platform connecting travellers with independent tour operators. Unless explicitly stated otherwise, TurPoint is not the provider of the tours, excursions, transportation, accommodation, or other travel services listed on the website.`,
      },
      {
        type: 'paragraph',
        text: `Each tour operator is responsible for the services they offer, the accuracy of their listing information, and the fulfilment of any booking arrangements made with travellers.`,
      },
    ],
  },
  {
    id: 'eligibility-and-account-registration',
    title: 'Eligibility and Account Registration',
    blocks: [
      {
        type: 'paragraph',
        text: `Certain features of TurPoint may require you to create an account. When registering, you agree to provide accurate, complete, and up-to-date information.`,
      },
      { type: 'paragraph', text: `You are responsible for:` },
      {
        type: 'list',
        items: [
          `Maintaining the confidentiality of your login credentials.`,
          `Keeping your account information accurate and current.`,
          `All activity carried out through your account, to the extent permitted by applicable law.`,
          `Notifying us promptly if you suspect unauthorised access to your account.`,
        ],
      },
      {
        type: 'paragraph',
        text: `You must not create an account using false information, impersonate another person, or use the platform for fraudulent or unlawful purposes.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint reserves the right to restrict, suspend, or terminate accounts that violate these terms, subject to applicable law.`,
      },
    ],
  },
  {
    id: 'using-the-platform',
    title: 'Using the Platform',
    blocks: [
      {
        type: 'paragraph',
        text: `You agree to use TurPoint responsibly and in accordance with these terms and applicable laws.`,
      },
      { type: 'paragraph', text: `When using the platform, you must not:` },
      {
        type: 'list',
        items: [
          `Provide false, misleading, or fraudulent information.`,
          `Attempt to gain unauthorised access to accounts, systems, or restricted areas of the website.`,
          `Interfere with the platform's operation, security, or availability.`,
          `Copy, reproduce, distribute, or commercially exploit platform content without appropriate authorisation.`,
          `Publish abusive, defamatory, deceptive, or otherwise unlawful content.`,
          `Use the platform to harass travellers, operators, or other users.`,
        ],
      },
      {
        type: 'paragraph',
        text: `We may investigate suspected violations and take appropriate action to protect the platform and its users.`,
      },
    ],
  },
  {
    id: 'tour-listings-and-information',
    title: 'Tour Listings and Information',
    blocks: [
      {
        type: 'paragraph',
        text: `Tour listings are intended to help travellers understand and compare the experiences available through TurPoint.`,
      },
      {
        type: 'paragraph',
        text: `Information may include prices, itineraries, destinations, durations, group sizes, meeting points, inclusions, exclusions, photographs, and other relevant details.`,
      },
      {
        type: 'paragraph',
        text: `Tour operators are responsible for ensuring that the information they provide is accurate, current, and not misleading.`,
      },
      {
        type: 'paragraph',
        text: `Although TurPoint aims to maintain a reliable platform, we do not guarantee that every listing is complete, error-free, continuously available, or updated immediately when an operator changes their services.`,
      },
      {
        type: 'paragraph',
        text: `Travellers should confirm important details directly with the relevant operator before making a booking, particularly where arrangements depend on weather, seasonal availability, transport, or other changing circumstances.`,
      },
    ],
  },
  {
    id: 'bookings-and-reservations',
    title: 'Bookings and Reservations',
    blocks: [
      {
        type: 'paragraph',
        text: `Booking arrangements are subject to the conditions established by the relevant tour operator.`,
      },
      {
        type: 'paragraph',
        text: `Before confirming a booking, travellers should review the tour description, total price, date, duration, inclusions, exclusions, cancellation conditions, and any special requirements.`,
      },
      { type: 'paragraph', text: `Unless a booking service explicitly states otherwise:` },
      {
        type: 'list',
        items: [
          `The tour operator is responsible for confirming availability and accepting booking requests.`,
          `The operator determines the final booking conditions and the services provided.`,
          `Travellers are responsible for supplying accurate information and arriving at the agreed meeting point on time.`,
          `Any changes to a booking must be agreed upon with the relevant operator.`,
        ],
      },
      {
        type: 'paragraph',
        text: `Submitting an enquiry or contacting an operator through TurPoint does not necessarily constitute a confirmed reservation.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint does not guarantee that a particular tour, date, price, or experience will remain available.`,
      },
    ],
  },
  {
    id: 'prices-and-payments',
    title: 'Prices and Payments',
    blocks: [
      {
        type: 'paragraph',
        text: `Tour prices and payment arrangements are determined by the relevant tour operator and should be reviewed before a booking is confirmed.`,
      },
      {
        type: 'paragraph',
        text: `Depending on the operator's arrangements, payment may be made directly to the operator or through a payment method explicitly provided by TurPoint.`,
      },
      {
        type: 'paragraph',
        text: `Travellers should confirm the accepted payment methods, payment deadlines, currency, and any additional charges before committing to a booking.`,
      },
      {
        type: 'paragraph',
        text: `Unless explicitly stated otherwise, TurPoint does not act as the tour provider and does not independently determine the prices charged by operators.`,
      },
      {
        type: 'paragraph',
        text: `Any deposits, balance payments, additional fees, or payment-related disputes should be addressed with the relevant operator or payment provider, as applicable.`,
      },
    ],
  },
  {
    id: 'cancellations-refunds-and-changes',
    title: 'Cancellations, Refunds and Changes',
    blocks: [
      {
        type: 'paragraph',
        text: `Cancellation, refund, and rescheduling conditions may differ between tours and operators.`,
      },
      {
        type: 'paragraph',
        text: `Travellers should review the specific conditions displayed on the relevant tour listing and confirm any unclear details with the operator before booking.`,
      },
      { type: 'paragraph', text: `Unless a different arrangement is expressly stated:` },
      {
        type: 'list',
        items: [
          `Cancellation requests should be directed to the relevant tour operator.`,
          `Refund eligibility and amounts are determined by the applicable booking conditions and relevant law.`,
          `Requests to change a tour date, itinerary, or group size are subject to the operator's approval and availability.`,
          `Additional charges may apply where permitted by the agreed booking conditions.`,
        ],
      },
      {
        type: 'paragraph',
        text: `If an operator cancels a tour or cannot deliver the agreed service, travellers should contact the operator to discuss available alternatives or any refund to which they may be entitled.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint may assist with communication where appropriate, but does not guarantee a particular outcome in disputes between travellers and operators.`,
      },
      {
        type: 'paragraph',
        text: `Nothing in this section limits any consumer rights that cannot legally be excluded.`,
      },
    ],
  },
  {
    id: 'responsibilities-of-tour-operators',
    title: 'Responsibilities of Tour Operators',
    blocks: [
      {
        type: 'paragraph',
        text: `Tour operators using TurPoint are responsible for the accuracy of their listings and for delivering the services they advertise.`,
      },
      { type: 'paragraph', text: `Operators are expected to:` },
      {
        type: 'list',
        items: [
          `Provide truthful and up-to-date information about their tours.`,
          `Clearly communicate prices, booking conditions, and cancellation policies.`,
          `Honour confirmed booking arrangements.`,
          `Maintain any licences, permits, insurance, qualifications, and authorisations required by applicable law.`,
          `Comply with relevant safety requirements and applicable local regulations.`,
          `Treat travellers fairly and communicate changes or cancellations promptly.`,
        ],
      },
      {
        type: 'paragraph',
        text: `TurPoint may review operator listings and take action against operators who violate platform policies. However, the presence of a listing on TurPoint should not, by itself, be interpreted as a guarantee of the operator's qualifications, conduct, or service quality.`,
      },
    ],
  },
  {
    id: 'reviews-and-user-generated-content',
    title: 'Reviews and User-Generated Content',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint may allow travellers to submit reviews, ratings, photographs, or other content relating to their experiences.`,
      },
      {
        type: 'paragraph',
        text: `By submitting content, you agree that it will be truthful to the best of your knowledge, relevant to the experience, and compliant with applicable law.`,
      },
      { type: 'paragraph', text: `You must not submit:` },
      {
        type: 'list',
        items: [
          `Fake, purchased, or deliberately misleading reviews.`,
          `Content intended to manipulate ratings or unfairly damage another party's reputation.`,
          `Personal information about others without an appropriate legal basis.`,
          `Copyrighted material that you do not have permission to use.`,
          `Threatening, discriminatory, abusive, or unlawful content.`,
        ],
      },
      {
        type: 'paragraph',
        text: `Where review eligibility is restricted to travellers who have booked or completed a tour, that restriction will apply as described in the relevant platform feature or policy.`,
      },
      {
        type: 'paragraph',
        text: `You retain ownership of content you submit. However, you grant TurPoint a non-exclusive licence to host, display, reproduce, and distribute that content as reasonably necessary to operate, promote, and improve the platform, subject to applicable law and your rights.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint may remove or restrict content that violates these terms or applicable policies. We do not guarantee that every review will be independently verified.`,
      },
    ],
  },
  {
    id: 'communication-between-travellers-and-operators',
    title: 'Communication Between Travellers and Operators',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint may provide contact options that allow travellers to communicate directly with operators, including external services such as WhatsApp or Instagram.`,
      },
      {
        type: 'paragraph',
        text: `When using these services, you may be subject to the terms and privacy policies of the relevant third-party provider.`,
      },
      {
        type: 'paragraph',
        text: `Travellers and operators are responsible for ensuring that the information they exchange is accurate and that their booking arrangements are clearly understood.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint is not responsible for the availability, security, or independent actions of third-party communication services.`,
      },
      {
        type: 'paragraph',
        text: `We recommend confirming important arrangements in writing and keeping relevant booking communications for reference.`,
      },
    ],
  },
  {
    id: 'third-party-services-and-links',
    title: 'Third-Party Services and Links',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint may contain links to third-party websites, social media profiles, maps, payment services, or other external resources.`,
      },
      {
        type: 'paragraph',
        text: `These services are provided or operated by third parties and may be subject to separate terms and privacy policies.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint does not control all third-party content, services, availability, or practices and does not endorse every statement or offering found on external websites.`,
      },
      {
        type: 'paragraph',
        text: `Your use of third-party services is at your own discretion and subject to the applicable terms of those services.`,
      },
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    blocks: [
      {
        type: 'paragraph',
        text: `Unless otherwise stated, the TurPoint name, branding, website design, interface, original text, graphics, and other platform materials are owned by or licensed to TurPoint and are protected by applicable intellectual property laws.`,
      },
      {
        type: 'paragraph',
        text: `You may use the platform for personal, lawful purposes, but you may not reproduce, modify, distribute, sell, or commercially exploit protected materials without prior authorisation, except where permitted by law.`,
      },
      {
        type: 'paragraph',
        text: `Tour photographs, descriptions, logos, and other materials submitted by operators or other users may belong to their respective owners. Their use remains subject to the applicable rights and permissions.`,
      },
    ],
  },
  {
    id: 'privacy-and-personal-information',
    title: 'Privacy and Personal Information',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint may collect and process personal information necessary to provide its services, manage accounts, facilitate communication, and improve the platform.`,
      },
      {
        type: 'paragraph',
        text: `Personal information will be handled in accordance with our Privacy Policy and applicable data protection laws.`,
      },
      {
        type: 'paragraph',
        text: `By using TurPoint, you acknowledge that certain information may need to be processed or shared with the relevant tour operator when necessary to respond to your enquiry or facilitate a booking, subject to our Privacy Policy and applicable law.`,
      },
      {
        type: 'paragraph',
        text: `Please review the Privacy Policy to understand what information we collect, how it is used, and what rights you may have.`,
      },
    ],
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    blocks: [
      {
        type: 'paragraph',
        text: `To the extent permitted by applicable law, TurPoint is not responsible for the independent acts, omissions, representations, or service delivery of third-party tour operators.`,
      },
      {
        type: 'paragraph',
        text: `This includes issues arising from an operator's failure to deliver a service as agreed, inaccurate operator-provided information, cancellations, changes to itineraries, or disputes concerning payments made directly to operators.`,
      },
      {
        type: 'paragraph',
        text: `TurPoint does not guarantee uninterrupted or error-free access to the platform and may occasionally need to suspend or modify features for maintenance, security, or operational reasons.`,
      },
      {
        type: 'paragraph',
        text: `Nothing in these terms excludes or limits liability where such exclusion or limitation is prohibited by applicable law, including any non-waivable consumer rights.`,
      },
    ],
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    blocks: [
      {
        type: 'paragraph',
        text: `To the extent permitted by applicable law, you agree to be responsible for losses, claims, liabilities, and reasonable costs arising directly from your unlawful use of TurPoint, your material violation of these terms, or your infringement of another person's rights.`,
      },
      {
        type: 'paragraph',
        text: `This provision does not apply to the extent that a loss results from TurPoint's own conduct or where applicable law prohibits such an allocation of responsibility.`,
      },
    ],
  },
  {
    id: 'suspension-and-termination',
    title: 'Suspension and Termination',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint may suspend, restrict, or terminate access to an account or platform feature where reasonably necessary to address a violation of these terms, suspected fraud, security risks, unlawful activity, or misuse of the platform.`,
      },
      {
        type: 'paragraph',
        text: `Where appropriate and legally permitted, we may provide notice or an opportunity to resolve the issue before taking action.`,
      },
      {
        type: 'paragraph',
        text: `You may stop using TurPoint at any time. Closing an account does not automatically cancel an existing booking or remove obligations that arose before closure.`,
      },
      {
        type: 'paragraph',
        text: `Provisions that are intended by their nature to continue after termination, including intellectual property, liability, and dispute-related provisions, may remain applicable.`,
      },
    ],
  },
  {
    id: 'changes-to-these-terms',
    title: 'Changes to These Terms',
    blocks: [
      {
        type: 'paragraph',
        text: `TurPoint may update these Terms of Use to reflect changes to its services, platform features, legal requirements, or business operations.`,
      },
      {
        type: 'paragraph',
        text: `When changes are made, the revised version will be published on this page with an updated revision date.`,
      },
      {
        type: 'paragraph',
        text: `Unless otherwise required by law, revised terms will apply from the date they are published. Where a change materially affects users or applicable law requires additional notice or consent, we will take the steps required by law.`,
      },
      {
        type: 'paragraph',
        text: `Your continued use of the platform after updated terms take effect constitutes acceptance of those changes where such acceptance is legally effective.`,
      },
    ],
  },
  {
    id: 'governing-law-and-disputes',
    title: 'Governing Law and Disputes',
    blocks: [
      {
        type: 'paragraph',
        text: `These terms are subject to the applicable laws of the jurisdiction in which TurPoint operates, taking into account any mandatory consumer protection rules that apply to individual users.`,
      },
      {
        type: 'paragraph',
        text: `If a disagreement arises concerning the use of TurPoint, we encourage the parties to contact us first to seek an informal resolution.`,
      },
      {
        type: 'paragraph',
        text: `Disputes between travellers and tour operators concerning a particular tour should generally be raised directly with the relevant operator in the first instance, without affecting any legal rights or remedies available to either party.`,
      },
      {
        type: 'paragraph',
        text: `Nothing in this section prevents a user from exercising a right to bring a claim before a competent court or other authority where permitted by law.`,
      },
    ],
  },
  {
    id: 'contact-us',
    title: 'Contact Us',
    blocks: [
      {
        type: 'paragraph',
        text: `If you have questions about these Terms of Use or need assistance regarding the TurPoint platform, please contact us through the contact details provided on our website.`,
      },
      {
        type: 'paragraph',
        text: `We will make reasonable efforts to review enquiries and direct them to the appropriate channel.`,
      },
    ],
  },
];
