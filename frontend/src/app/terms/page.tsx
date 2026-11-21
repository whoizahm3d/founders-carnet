import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav, PublicFooter, LegalPageNav } from '@/components/layout';
import { FormattedHeading } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: "Terms of Service | The Founder's Carnet",
  description: "Terms of service for The Founder's Carnet introductions platform.",
};

const SECTIONS = [
  { id: 'nature-of-the-platform', label: 'Nature of the platform' },
  { id: 'what-the-platform-does-not-do', label: 'What the platform does not do' },
  { id: 'eligibility-and-verification', label: 'Eligibility and verification' },
  { id: 'introductions-and-contact-details', label: 'Introductions and contact details' },
  { id: 'profile-visibility', label: 'Profile visibility' },
  { id: 'platform-availability', label: 'Platform availability' },
  { id: 'changes-to-these-terms', label: 'Changes to these terms' },
  { id: 'questions', label: 'Questions' },
];

const SUMMARY_LINES = [
  'Contact details after mutual acceptance',
  'No money or equity handled',
  'One appeal if a profile is declined',
];

export default function TermsPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-hero-gradient text-ink flex flex-col justify-between selection:bg-accent-wash selection:text-accent-deep"
    >
      {/* Navigation */}
      <PublicNav />

      {/* Main Content Area */}
      <main className="w-full flex-grow px-4 sm:px-6 md:px-16 py-8 sm:py-12 z-10">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Desktop Title, Summary Card, Sticky Contents (hidden below lg) */}
          <LegalPageNav
            pageTitle="Terms of service"
            lastUpdated="Last updated: 15 November 2026"
            items={SECTIONS}
            summaryLines={SUMMARY_LINES}
          />

          {/* Right Column: White Card with Sections */}
          <article className="w-full lg:col-span-8 bg-card rounded-card p-6 sm:p-10 lg:p-12 border border-hairline shadow-modal-elevation">
            {/* Header visible on mobile and tablet only */}
            <header className="lg:hidden border-b border-hairline pb-6 mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold font-sans text-ink tracking-tight">
                <FormattedHeading text="Terms of service" italicWordsCount={1} onGradient={false} />
              </h1>
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider mt-2">
                Last updated: 15 November 2026
              </p>
            </header>

            <div className="space-y-8">
              <section
                id="nature-of-the-platform"
                className="scroll-mt-24 pt-8 first:pt-0 border-t border-hairline first:border-0 space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  01
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Nature of the platform
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  The Founder&apos;s Carnet exists to make introductions. It connects founders, talent, mentors and investors based on profile similarity. It does not broker investment, hold money, take equity positions, or guarantee any outcome, employment, or commercial result.
                </p>
              </section>

              <section
                id="what-the-platform-does-not-do"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  02
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  What the platform does not do
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-base text-text-secondary leading-relaxed font-sans">
                  <li>No investment brokerage, placement fees, or transaction commissions.</li>
                  <li>No legal or tax advice of any kind.</li>
                  <li>No equity participation in any startup.</li>
                  <li>No cold outreach on your behalf.</li>
                </ul>
              </section>

              <section
                id="eligibility-and-verification"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  03
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Eligibility and verification
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  You must register yourself with accurate information. Profiles go through a verification process. Automated checks run first. A human reviewer reads any profile the checks cannot clear. A declined profile can be appealed once. The decision after the appeal is final.
                </p>
              </section>

              <section
                id="introductions-and-contact-details"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  04
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Introductions and contact details
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  Introductions happen only when both sides accept. Contact details are shared only after mutual acceptance. If either side declines or does not respond, contact details are not shared.
                </p>
              </section>

              <section
                id="profile-visibility"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  05
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Profile visibility
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  Your profile is shown to other members only under the introduction rules above.
                </p>
              </section>

              <section
                id="platform-availability"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  06
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Platform availability
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  The platform is provided on an as-is basis. We make no guarantee of uninterrupted availability.
                </p>
              </section>

              <section
                id="changes-to-these-terms"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  07
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Changes to these terms
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  We will update the date at the top of this page when we make changes. Continued use of the platform after a change means you accept the updated terms.
                </p>
              </section>

              <section
                id="questions"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  08
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Questions
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  Questions about these terms can be sent with the contact form once it is available.{' '}
                  <Link
                    href="/#contact"
                    className="text-accent underline hover:text-accent-deep whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                  >
                    Contact us
                  </Link>
                  .
                </p>
              </section>

              {/* Closing row: link to Privacy policy and Back to top */}
              <div className="pt-8 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-sans">
                <p className="text-text-secondary">
                  Read our{' '}
                  <Link
                    href="/privacy"
                    className="text-accent underline hover:text-accent-deep font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                  >
                    Privacy policy
                  </Link>
                  .
                </p>
                <a
                  href="#top"
                  className="text-text-secondary hover:text-ink transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm w-fit"
                >
                  <span>Back to top</span>
                  <span aria-hidden="true">↑</span>
                </a>
              </div>
            </div>
          </article>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
