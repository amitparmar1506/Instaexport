import Link from 'next/link';
import { Instagram, Trash2 } from 'lucide-react';

export const metadata = {
  title: 'Data Deletion — CommentExport',
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <div className="w-7 h-7 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
            <Instagram className="w-3.5 h-3.5 text-white" />
          </div>
          CommentExport
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to home</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Deletion Request</h1>
            <p className="text-sm text-gray-500">Request removal of your data from CommentExport</p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">How to delete your data</h2>
          <ol className="space-y-4">
            {[
              { step: '1', title: 'Email us directly', desc: 'Send an email to amitparmar8428@gmail.com with subject "Data Deletion Request" and your Instagram username.' },
              { step: '2', title: 'What we delete', desc: 'We will permanently delete your account, OAuth tokens, all imported comment data, post data, and payment records within 30 days.' },
              { step: '3', title: 'Revoke app access on Instagram', desc: 'Additionally, go to Instagram → Settings → Apps and Websites → find CommentExport → Remove.' },
              { step: '4', title: 'Confirmation', desc: 'We will email you confirmation once your data has been deleted.' },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-0.5">{title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">Contact for data deletion:</p>
          <a href="mailto:amitparmar8428@gmail.com?subject=Data Deletion Request"
            className="text-purple-600 font-medium hover:underline text-sm">
            amitparmar8428@gmail.com
          </a>
          <p className="text-xs text-gray-400 mt-2">We process all deletion requests within 30 days.</p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400 mt-12">
        <p>CommentExport ·
          <Link href="/privacy" className="underline hover:text-gray-600 mx-2">Privacy Policy</Link>·
          <Link href="/terms" className="underline hover:text-gray-600 mx-2">Terms & Conditions</Link>
        </p>
      </footer>
    </div>
  );
}
