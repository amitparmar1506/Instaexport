import { Instagram } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms & Conditions — CommentExport',
  description: 'Terms and Conditions for CommentExport — Instagram Comment Export Tool',
};

export default function TermsPage() {
  const lastUpdated = 'June 25, 2025';

  return (
    <div className="min-h-screen bg-white">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CommentExport ("Service", "we", "our", "us") at
              <strong> commentexport.vercel.app</strong>, you agree to be bound by these Terms &
              Conditions. If you do not agree to these terms, please do not use the Service.
            </p>
            <p className="mt-3">
              These terms apply to all users of the Service, including users who connect their
              Instagram Business or Creator accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              CommentExport is a SaaS tool that allows Instagram Business and Creator account
              holders to:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Connect their Instagram account via Meta's official Facebook Login API.</li>
              <li>View comments and replies on their own Instagram posts.</li>
              <li>Export comment data as CSV or PDF files.</li>
              <li>Analyze engagement structure through non-AI analytics.</li>
              <li>Search through comment threads.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Eligibility</h2>
            <p>To use CommentExport, you must:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Be at least 13 years of age.</li>
              <li>Have a valid Instagram Business or Creator account linked to a Facebook Page.</li>
              <li>Have a valid Facebook/Meta developer account if required.</li>
              <li>Agree to Meta's Terms of Service and Instagram's Terms of Use in addition to these terms.</li>
              <li>Use the Service only for your own Instagram content — not to access or export other users' content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Account & Authentication</h2>
            <p>
              You authenticate using Facebook Login (OAuth 2.0). You are responsible for
              maintaining the confidentiality of your account. You agree to:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Provide accurate and complete information during authentication.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
              <li>Take responsibility for all activities that occur under your account.</li>
              <li>Disconnect the app from your Facebook account settings if you wish to revoke access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Plans & Payments</h2>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">5.1 Free Tier</h3>
            <p>
              The free tier allows export of up to <strong>500 comments per post</strong>,
              including CSV and PDF exports. No payment is required for the free tier.
            </p>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">5.2 Single Post Unlock (₹170)</h3>
            <p>
              A one-time payment of ₹170 unlocks unlimited comment export for a single post,
              including full CSV and PDF exports.
            </p>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">5.3 Pro Plan (₹750/month)</h3>
            <p>
              A monthly subscription of ₹750 unlocks unlimited comment export for all posts.
              The Pro plan is valid for 30 days from the date of payment. It must be manually
              renewed — we do not auto-charge recurring payments.
            </p>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">5.4 Payment Processing</h3>
            <p>
              All payments are processed by <strong>Razorpay</strong>. By making a payment, you
              agree to Razorpay's Terms of Service. We accept UPI, credit/debit cards, and
              net banking.
            </p>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">5.5 Refund Policy</h3>
            <p>
              Due to the digital nature of the Service, <strong>all payments are non-refundable</strong>
              once the export has been unlocked and the service has been rendered. If you
              experience a technical issue preventing you from using a paid feature, contact
              us within 7 days at amitparmar8428@gmail.com for assistance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p>You agree to use CommentExport only for lawful purposes. You must NOT:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Use the Service to access, export, or store comments from Instagram accounts you do not own.</li>
              <li>Attempt to reverse-engineer, scrape, or circumvent any part of the Service.</li>
              <li>Use exported data to harass, spam, or target commenters.</li>
              <li>Share, sell, or publicly distribute commenter data obtained through the Service in violation of applicable privacy laws.</li>
              <li>Use the Service to violate Meta's Platform Terms, Instagram's Terms of Use, or any applicable law.</li>
              <li>Attempt to gain unauthorized access to other users' data.</li>
              <li>Use automated bots or scripts to access the Service beyond normal usage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Meta Platform Compliance</h2>
            <p>
              CommentExport operates under Meta's Platform Terms. We access Instagram data through
              Meta's official Graph API only. Your use of CommentExport is also subject to:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Meta's Platform Terms: <a href="https://developers.facebook.com/terms/" className="text-purple-600 underline" target="_blank" rel="noopener noreferrer">developers.facebook.com/terms</a></li>
              <li>Instagram's Terms of Use: <a href="https://help.instagram.com/581066165581870" className="text-purple-600 underline" target="_blank" rel="noopener noreferrer">instagram.com/terms</a></li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate Meta's platform
              policies, as this could jeopardize our API access for all users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p>
              The CommentExport platform, including its design, code, and brand, is owned by us.
              You retain ownership of your Instagram content and comment data. We claim no
              intellectual property rights over the content you export.
            </p>
            <p className="mt-3">
              By using the Service, you grant us a limited, non-exclusive license to access,
              store, and process your Instagram content solely for the purpose of providing
              the export service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided <strong>"as is"</strong> and <strong>"as available"</strong>
              without warranties of any kind, either express or implied. We do not warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>The Service will be uninterrupted, timely, secure, or error-free.</li>
              <li>All comments will be successfully exported (Instagram API limits may apply).</li>
              <li>The Service will remain available if Meta changes or revokes API access.</li>
              <li>Export files will be compatible with all software.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, CommentExport and its operators
              shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages, including loss of profits, data, or goodwill arising from:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Your use of or inability to use the Service.</li>
              <li>Changes to Meta's API that affect the Service's functionality.</li>
              <li>Unauthorized access to or alteration of your data.</li>
              <li>Any third-party conduct on the platform.</li>
            </ul>
            <p className="mt-3">
              Our total liability to you for any claim arising from these terms shall not exceed
              the amount you paid us in the 3 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation
              of these Terms. You may terminate your account at any time by:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Contacting us at amitparmar8428@gmail.com to request data deletion.</li>
              <li>Revoking CommentExport's access from your Facebook App Settings.</li>
            </ul>
            <p className="mt-3">
              Upon termination, your right to use the Service ceases immediately. We will delete
              your data within 30 days of a deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of
              <strong> India</strong>. Any disputes arising from these Terms shall be subject to
              the exclusive jurisdiction of the courts of <strong>Gujarat, India</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be posted on
              this page with an updated "Last updated" date. Continued use of the Service after
              changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h2>
            <p>For any questions regarding these Terms, contact us:</p>
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
