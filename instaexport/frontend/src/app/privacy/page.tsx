import { Instagram } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — CommentExport',
  description: 'Privacy Policy for CommentExport — Instagram Comment Export Tool',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'June 25, 2025';

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <div className="w-7 h-7 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
            <Instagram className="w-3.5 h-3.5 text-white" />
          </div>
          CommentExport
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to home</Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to CommentExport ("we", "our", or "us"). We operate the website at
              <strong> commentexport.vercel.app</strong> (the "Service"), which allows Instagram
              Business and Creator account holders to export, view, and analyze comments from their
              own Instagram posts.
            </p>
            <p className="mt-3">
              This Privacy Policy explains how we collect, use, store, and protect your personal
              information when you use our Service. By using CommentExport, you agree to the
              collection and use of information as described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Facebook/Instagram OAuth data:</strong> When you connect your Instagram account via Facebook Login, we receive your Facebook user ID, name, and linked Instagram Business/Creator account details including your Instagram username and account ID.</li>
              <li><strong>Instagram content:</strong> We access your posts (captions, media URLs, like counts, timestamps) and comments on your posts (commenter usernames, comment text, like counts, timestamps, reply threads) solely for the purpose of providing the export service.</li>
              <li><strong>Payment information:</strong> When you purchase a paid plan, payment processing is handled entirely by Razorpay. We do not store your card number, CVV, or banking details. We only store your Razorpay customer ID and payment confirmation status.</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Access tokens:</strong> We store your Facebook/Instagram OAuth access token in our database (Supabase) to make API calls on your behalf. Tokens are stored securely and are never shared.</li>
              <li><strong>Usage data:</strong> We track the number of comments you have exported to enforce plan limits.</li>
              <li><strong>Log data:</strong> Our servers automatically record IP addresses, browser type, pages visited, and timestamps for security and debugging purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To authenticate you and provide access to your Instagram posts via the Meta Graph API.</li>
              <li>To fetch, store, and display comments from your own Instagram posts.</li>
              <li>To generate CSV and PDF exports of your comment data.</li>
              <li>To enforce free tier limits (500 comments) and paid tier benefits.</li>
              <li>To process payments and manage your subscription through Razorpay.</li>
              <li>To send transactional communications (e.g., payment receipts) if applicable.</li>
              <li>To improve our Service and fix technical issues.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">
              <strong>We do not sell your data.</strong> We do not use your Instagram content or
              commenter data for advertising, profiling, or any purpose other than providing the
              export service you requested.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data We Access From Instagram</h2>
            <p>
              CommentExport only accesses data from <strong>your own Instagram account</strong>.
              We request the following permissions from Meta:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>public_profile:</strong> Your basic Facebook profile to authenticate you.</li>
              <li><strong>pages_show_list:</strong> To find your Facebook Pages and linked Instagram Business accounts.</li>
              <li><strong>instagram_basic:</strong> To read your Instagram posts and comments.</li>
            </ul>
            <p className="mt-3">
              We do not access posts, messages, or data from other Instagram accounts. We cannot
              post, delete, or modify any content on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Commenter Data & Usernames</h2>
            <p>
              When we fetch comments from your posts, we store the <strong>publicly visible
              Instagram usernames</strong> of people who commented on your posts. This information
              is already publicly visible on Instagram and is fetched through Meta's official API.
            </p>
            <p className="mt-3">
              We do not collect commenter email addresses, phone numbers, private messages,
              or any information beyond what is publicly visible on Instagram.
            </p>
            <p className="mt-3">
              Comment data is stored only for the account owner's use. Commenters who wish to have
              their comments removed from our export records may contact us at
              <strong> amitparmar8428@gmail.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Storage & Security</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your data is stored in <strong>Supabase</strong> (PostgreSQL), hosted on AWS in the Singapore region.</li>
              <li>OAuth access tokens are stored in the database and are used only to make API calls on your behalf.</li>
              <li>All data is transmitted over HTTPS/TLS encryption.</li>
              <li>We implement Row Level Security (RLS) so users can only access their own data.</li>
              <li>Export files (CSV, PDF) are generated on-demand and not permanently stored.</li>
              <li>We take reasonable technical and organizational measures to protect your data, but no method of transmission over the internet is 100% secure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p>
              We retain your account data and imported comment data for as long as your account
              is active. You may request deletion of your data at any time by contacting us.
              Upon deletion, we will remove your account, OAuth tokens, imported comment data,
              and purchase records within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Meta (Facebook/Instagram):</strong> We use Meta's Graph API to authenticate users and fetch post/comment data. Meta's privacy policy applies to data on their platform.</li>
              <li><strong>Razorpay:</strong> Payment processing. Razorpay's privacy policy applies to payment data.</li>
              <li><strong>Supabase:</strong> Database and storage hosting. Supabase's privacy policy applies.</li>
              <li><strong>Vercel:</strong> Frontend hosting. Vercel's privacy policy applies.</li>
              <li><strong>Railway:</strong> Backend hosting. Railway's privacy policy applies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data.</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format.</li>
              <li><strong>Withdraw consent:</strong> Disconnect your Instagram account at any time through Meta's app settings.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <strong>amitparmar8428@gmail.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Children's Privacy</h2>
            <p>
              CommentExport is not intended for use by anyone under the age of 13. We do not
              knowingly collect personal information from children. If you believe a child has
              provided us with personal data, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by updating the "Last updated" date at the top of this page. Continued use of
              the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong>Email:</strong> amitparmar8428@gmail.com</li>
              <li><strong>Service:</strong> CommentExport (commentexport.vercel.app)</li>
            </ul>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400 mt-12">
        <p>CommentExport · <Link href="/terms" className="underline hover:text-gray-600">Terms & Conditions</Link> · <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link></p>
      </footer>
    </div>
  );
}
