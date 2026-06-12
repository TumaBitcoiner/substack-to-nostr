import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { SubstackImporter } from '@/components/SubstackImporter';
import { ArticleReviewer } from '@/components/ArticleReviewer';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';

interface Article {
  title: string;
  subtitle?: string;
  author?: string;
  content: string;
  sourceUrl: string;
}

const Index = () => {
  useSeoMeta({
    title: 'Substack to Nostr - Import Your Articles',
    description: 'Convert your Substack articles to Nostr long-form posts and share them with the community.',
  });

  const { user } = useCurrentUser();
  const [article, setArticle] = useState<Article | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Substack → Nostr
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Import your Substack articles to Nostr
            </p>
          </div>
          <LoginArea className="max-w-60" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Sign in to get started
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You need to be logged in to your Nostr account to publish articles.
            </p>
            <LoginArea className="flex justify-center max-w-xs mx-auto" />
          </div>
        ) : article ? (
          <ArticleReviewer
            article={article}
            onBack={() => setArticle(null)}
            onSuccess={() => setArticle(null)}
          />
        ) : (
          <SubstackImporter onArticleImported={setArticle} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Vibed with Shakespeare
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
