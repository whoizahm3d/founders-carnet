import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav, PublicFooter, LegalPageNav } from '@/components/layout';
import { FormattedHeading } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: "Privacy Policy | The Founder's Carnet",
  description: "Privacy policy for The Founder's Carnet introductions platform.",
};

const SECTIONS = [
  { id: 'what-this-platform-does', label: 'What this platform does' },
  { id: 'what-we-collect', label: 'What we collect' },
  { id: 'how-your-information-is-used', label: 'How your information is used' },
  { id: 'profile-verification', label: 'Profile verification' },
  { id: 'contact-form', label: 'Contact form' },
  { id: 'changes-to-this-policy', label: 'Changes to this policy' },
  { id: 'questions', label: 'Questions' },
];

const SUMMARY_LINES = [
  'Contact details after mutual acceptance',
  'No money or equity handled',
  'One appeal if a profile is declined',
];

export default function PrivacyPage() {
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
            pageTitle="Privacy policy"
            lastUpdated="Last updated: 15 November 2026"
            items={SECTIONS}
            summaryLines={SUMMARY_LINES}
          />

          {/* Right Column: White Card with Sections */}
          <article className="w-full lg:col-span-8 bg-card rounded-card p-6 sm:p-10 lg:p-12 border border-hairline shadow-modal-elevation">
            {/* Header visible on mobile and tablet only */}
            <header className="lg:hidden border-b border-hairline pb-6 mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold font-sans text-ink tracking-tight">
                <FormattedHeading text="Privacy policy" italicWordsCount={1} onGradient={false} />
              </h1>
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider mt-2">
                Last updated: 15 November 2026
              </p>
            </header>

            <div className="space-y-8">
              <section
                id="what-this-platform-does"
                className="scroll-mt-24 pt-8 first:pt-0 border-t border-hairline first:border-0 space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  01
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  What this platform does
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  The Founder&apos;s Carnet is an introductions platform for Pakistan&apos;s startup community. It connects founders, talent, mentors and investors. It does not broker investment, hold money, take equity, or give legal or tax advice.
                </p>
              </section>

              <section
                id="what-we-collect"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  02
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  What we collect
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  You register yourself. We collect the information you give us: your email address, your role and the profile details you add. We do not scrape social media or public profiles.
                </p>
              </section>

              <section
                id="how-your-information-is-used"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  03
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  How your information is used
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  Your profile is used to suggest matches by profile similarity. Your contact details are shared with another user only after both sides accept an introduction request. Before that, your contact details are not visible to anyone on the platform.
                </p>
              </section>

              <section
                id="profile-verification"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  04
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Profile verification
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  Profiles go through a verification process before introduction requests become active. Automated checks run first. A human reviewer reads any profile the checks cannot clear. A declined profile can be appealed once. The decision after the appeal is final.
                </p>
              </section>

              <section
                id="contact-form"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  05
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Contact form
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  The contact form on the landing page is not yet active. When it is active, the message you send will be used only to respond to your question.
                </p>
              </section>

              <section
                id="changes-to-this-policy"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  06
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Changes to this policy
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  We will update the date at the top of this page when we make changes. Continued use of the platform after a change means you accept the updated policy.
                </p>
              </section>

              <section
                id="questions"
                className="scroll-mt-24 pt-8 border-t border-hairline space-y-2"
              >
                <span className="font-mono text-xs text-accent uppercase tracking-wider block mb-1">
                  07
                </span>
                <h2 className="text-xl font-bold font-sans text-ink">
                  Questions
                </h2>
                <p className="text-base text-text-secondary leading-relaxed font-sans">
                  Questions about this policy can be sent with the contact form once it is available.{' '}
                  <Link
                    href="/#contact"
                    className="text-accent underline hover:text-accent-deep whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                  >
                    Contact us
                  </Link>
                  .
                </p>
              </section>

              {/* Closing row: link to Terms of service and Back to top */}
              <div className="pt-8 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-sans">
                <p className="text-text-secondary">
                  Read our{' '}
                  <Link
                    href="/terms"
                    className="text-accent underline hover:text-accent-deep font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                  >
                    Terms of service
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
