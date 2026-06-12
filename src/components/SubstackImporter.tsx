import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Article {
  title: string;
  subtitle?: string;
  author?: string;
  content: string;
  sourceUrl: string;
}

interface SubstackImporterProps {
  onArticleImported: (article: Article) => void;
}

export function SubstackImporter({ onArticleImported }: SubstackImporterProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const fetchArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter an article URL');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);

    try {
      // Use CORS proxy to fetch the article
      const proxyUrl = `https://proxy.shakespeare.diy/?url=${encodeURIComponent(url)}`;
      console.log('Fetching from:', proxyUrl);
      
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      if (!html || html.length === 0) {
        throw new Error('Received empty response from the server.');
      }

      // Parse the HTML to extract article data and convert to markdown
      const article = parseSubstackArticleToMarkdown(html, url);

      if (!article.title || !article.content) {
        throw new Error(
          'Could not extract article content. The page might be protected or not a valid article. Try a different URL.'
        );
      }

      onArticleImported(article);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import article';
      setError(message);
      console.error('Import error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Article</CardTitle>
          <CardDescription>
            Paste your article URL (Substack, custom domain, or any website) and we'll extract and convert it to markdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={fetchArticle} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                Article URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/article or https://yourname.substack.com/p/article"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                disabled={isLoading}
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Fetching article...' : 'Import Article'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-8">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
            How it works:
          </h3>
          <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white flex-shrink-0">1.</span>
              <span>Paste any article URL (Substack, custom domain, or any website)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white flex-shrink-0">2.</span>
              <span>We automatically fetch and convert it to markdown</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white flex-shrink-0">3.</span>
              <span>Review, edit, and publish as a Nostr article</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function parseSubstackArticleToMarkdown(html: string, sourceUrl: string): {
  title: string;
  subtitle?: string;
  author?: string;
  content: string;
} {
  // Parse title
  let title = '';
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].trim();
    }
  }

  // Parse subtitle
  let subtitle: string | undefined;
  const subtitleMatch = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
  if (subtitleMatch) {
    subtitle = subtitleMatch[1].trim();
  }

  // Parse author
  let author: string | undefined;
  const authorMatch = html.match(/<meta property="og:article:author" content="([^"]+)"/);
  if (authorMatch) {
    author = authorMatch[1].trim();
  }

  // Extract main article content
  let content = '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const contentRoot = findContentRoot(doc);
  const contentHtml = contentRoot?.outerHTML ?? html;

  // Convert HTML to markdown
  content = htmlToMarkdown(contentHtml);

  // Fallback: extract from og:description if content is empty
  if (!content || content.length < 50) {
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (descMatch) {
      content = descMatch[1].trim();
    }
  }

  return {
    title,
    subtitle,
    author,
    content,
  };
}

function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const contentRoot = findContentRoot(doc);
  const target = contentRoot ?? doc.body;

  removeBoilerplateElements(target);

  const markdown = serializeNodes(Array.from(target.childNodes), 0).trim();

  return markdown
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function findContentRoot(doc: Document): HTMLElement | null {
  const candidates = [
    'article',
    '[role="article"]',
    '[class*="post-body" i]',
    '[class*="body markup" i]',
    '[class*="available-content" i]',
    '[class*="post-content" i]',
    '[class*="article-content" i]',
    '[class*="entry-content" i]',
    'main article',
    'main [class*="content" i]',
  ];

  for (const selector of candidates) {
    const found = doc.querySelector(selector);
    if (found instanceof HTMLElement) {
      return found;
    }
  }

  return null;
}

function removeBoilerplateElements(root: HTMLElement): void {
  const selectorsToRemove = [
    'script',
    'style',
    'noscript',
    'aside',
    'nav',
    'footer',
    'form',
    'iframe',
    'button',
    'svg',
    '[role="navigation"]',
    '[role="complementary"]',
    '[aria-label*="share" i]',
    '[aria-label*="like" i]',
    '[aria-label*="recommend" i]',
    '[aria-label*="comment" i]',
    'a[href*="/subscribe"]',
    'a[href*="substack.com/subscribe"]',
    '[class*="subscribe" i]',
    '[class*="share" i]',
    '[class*="reaction" i]',
    '[class*="comment" i]',
    '[class*="like" i]',
    '[class*="engagement" i]',
    '[class*="social" i]',
    '[class*="actions" i]',
    '[class*="toolbar" i]',
    '[class*="author" i]',
    '[class*="byline" i]',
    '[class*="meta" i]',
    '[class*="published" i]',
    '[class*="substack" i]',
    '[data-testid*="share" i]',
    '[data-testid*="reaction" i]',
    '[data-testid*="comment" i]',
  ];

  selectorsToRemove.forEach((selector) => {
    root.querySelectorAll(selector).forEach((el) => el.remove());
  });

  root.querySelectorAll('a').forEach((el) => {
    const href = (el.getAttribute('href') ?? '').toLowerCase();
    const text = (el.textContent ?? '').trim().toLowerCase();

    if (
      href.includes('/subscribe') ||
      href.includes('substack.com') ||
      text.startsWith('subscribe') ||
      text.startsWith('share') ||
      text === 'like' ||
      text === 'comment'
    ) {
      el.remove();
    }
  });

  const textBlockSelectors = ['p', 'div', 'span', 'li', 'small'];
  textBlockSelectors.forEach((selector) => {
    root.querySelectorAll(selector).forEach((el) => {
      const text = (el.textContent ?? '').trim().toLowerCase();

      if (!text) {
        return;
      }

      const boilerplatePatterns = [
        /^share$/,
        /^share this post/,
        /^like$/,
        /^likes?$/,
        /^comment$/,
        /^comments?$/,
        /^restack$/,
        /^subscribe$/,
        /^subscribe now$/,
        /^thanks for reading/,
        /^download the substack app/,
        /^published in/,
        /^written by/,
        /^author/,
      ];

      if (boilerplatePatterns.some((pattern) => pattern.test(text))) {
        el.remove();
      }
    });
  });
}

function serializeNodes(nodes: Node[], depth: number): string {
  return nodes.map((node) => serializeNode(node, depth)).join('');
}

function serializeNode(node: Node, depth: number): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(tag[1]);
      const text = serializeNodes(Array.from(el.childNodes), depth).trim();
      return `${'#'.repeat(level)} ${text}\n\n`;
    }
    case 'p': {
      const text = serializeNodes(Array.from(el.childNodes), depth).trim();
      return text ? `${text}\n\n` : '';
    }
    case 'blockquote': {
      const text = serializeNodes(Array.from(el.childNodes), depth).trim();
      if (!text) return '';
      return `${text.split('\n').map((line) => `> ${line}`).join('\n')}\n\n`;
    }
    case 'ul':
      return serializeList(el, false, depth);
    case 'ol':
      return serializeList(el, true, depth);
    case 'pre': {
      const code = el.textContent?.replace(/\n$/, '') ?? '';
      return `\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    case 'code': {
      const codeText = el.textContent ?? '';
      return `\`${codeText}\``;
    }
    case 'strong':
    case 'b': {
      const text = serializeNodes(Array.from(el.childNodes), depth);
      return `**${text}**`;
    }
    case 'em':
    case 'i': {
      const text = serializeNodes(Array.from(el.childNodes), depth);
      return `*${text}*`;
    }
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      const text = serializeNodes(Array.from(el.childNodes), depth).trim() || href;
      return `[${text}](${href})`;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return `![${alt}](${src})`;
    }
    case 'br':
      return '\n';
    case 'hr':
      return '\n---\n\n';
    case 'li': {
      const text = serializeNodes(Array.from(el.childNodes), depth).trim();
      return text ? `${'  '.repeat(depth)}- ${text}\n` : '';
    }
    default:
      return serializeNodes(Array.from(el.childNodes), depth);
  }
}

function serializeList(listEl: HTMLElement, ordered: boolean, depth: number): string {
  const liChildren = Array.from(listEl.children).filter((child) => child.tagName.toLowerCase() === 'li') as HTMLElement[];

  let markdown = '';

  liChildren.forEach((li, index) => {
    const prefix = ordered ? `${index + 1}. ` : '- ';
    const indent = '  '.repeat(depth);

    const normalNodes: Node[] = [];
    const nestedLists: HTMLElement[] = [];

    Array.from(li.childNodes).forEach((child) => {
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())
      ) {
        nestedLists.push(child as HTMLElement);
      } else {
        normalNodes.push(child);
      }
    });

    const lineText = serializeNodes(normalNodes, depth).replace(/\s+/g, ' ').trim();
    if (lineText) {
      markdown += `${indent}${prefix}${lineText}\n`;
    }

    nestedLists.forEach((nestedList) => {
      const isOrdered = nestedList.tagName.toLowerCase() === 'ol';
      markdown += serializeList(nestedList, isOrdered, depth + 1);
    });
  });

  return `${markdown}\n`;
}
