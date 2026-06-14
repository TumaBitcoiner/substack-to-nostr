import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoverImageSelector } from '@/components/CoverImageSelector';

interface Article {
  title: string;
  subtitle?: string;
  author?: string;
  content: string;
  sourceUrl: string;
  images?: string[];
  coverImage?: string;
}

interface ArticleReviewerProps {
  article: Article;
  onBack: () => void;
  onSuccess: () => void;
}

export function ArticleReviewer({ article, onBack, onSuccess }: ArticleReviewerProps) {
  const [title, setTitle] = useState(article.title);
  const [subtitle, setSubtitle] = useState(article.subtitle || '');
  const [content, setContent] = useState(article.content);
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState(article.coverImage || '');
  const [isPublishing, setIsPublishing] = useState(false);

  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const articleImages = article.images || [];

  const handlePublish = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Article title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Article content is required',
        variant: 'destructive',
      });
      return;
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);

    if (!slug) {
      toast({
        title: 'Error',
        description: 'Title must contain alphanumeric characters',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Build event tags
      const eventTags: string[][] = [
        ['d', slug],
        ['title', title],
      ];

      if (subtitle) {
        eventTags.push(['summary', subtitle]);
      }

      if (summary) {
        eventTags.push(['summary', summary]);
      }

      // Add source URL
      if (article.sourceUrl) {
        eventTags.push(['r', article.sourceUrl]);
      }

      // Add custom tags
      if (tags.trim()) {
        tags.split(',').forEach((tag) => {
          const cleanTag = tag.trim().toLowerCase();
          if (cleanTag) {
            eventTags.push(['t', cleanTag]);
          }
        });
      }

      // Add cover image if selected
      if (coverImage) {
        eventTags.push(['image', coverImage]);
      }

      // Add image/preview tag if needed
      eventTags.push(['alt', `Article: ${title}`]);

      // Publish as kind 30023 (long-form article - NIP-23)
      publishEvent(
        {
          kind: 30023,
          content: content,
          tags: eventTags,
        },
        {
          onSuccess: () => {
            toast({
              title: 'Success',
              description: 'Article published to Nostr!',
            });
            onSuccess();
          },
          onError: (error) => {
            toast({
              title: 'Error',
              description: `Failed to publish: ${error.message}`,
              variant: 'destructive',
            });
            setIsPublishing(false);
          },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to publish: ${message}`,
        variant: 'destructive',
      });
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack} disabled={isPublishing}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Review & Publish
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Edit the article before publishing to Nostr
          </p>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Title *
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title"
                  disabled={isPublishing}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="subtitle" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Subtitle
                </label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Optional subtitle"
                  disabled={isPublishing}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="summary" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Summary
                </label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary (optional)"
                  rows={2}
                  disabled={isPublishing}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tags" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Tags
                </label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma-separated tags (e.g., bitcoin, nostr, writing)"
                  disabled={isPublishing}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tags help others discover your article
                </p>
              </div>
            </CardContent>
          </Card>

          <CoverImageSelector
            articleImages={articleImages}
            onCoverImageSelected={setCoverImage}
            selectedCoverImage={coverImage}
            disabled={isPublishing}
          />

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Edit the article text</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Article content"
                rows={15}
                disabled={isPublishing}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {article.sourceUrl && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Source:</strong> {article.sourceUrl}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={isPublishing}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="flex-1">
              {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPublishing ? 'Publishing...' : 'Publish to Nostr'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-2xl">{title || 'Untitled'}</CardTitle>
                {subtitle && (
                  <CardDescription className="text-lg mt-2">{subtitle}</CardDescription>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {coverImage && (
                <div className="w-full rounded-lg overflow-hidden">
                  <img
                    src={coverImage}
                    alt="Article cover"
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}

              {summary && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Summary
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">{summary}</p>
                </div>
              )}

              <div className="prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-3xl font-bold mt-6 mb-4 text-slate-900 dark:text-white" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-2xl font-bold mt-5 mb-3 text-slate-900 dark:text-white" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-white" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4 className="text-lg font-semibold mt-3 mb-2 text-slate-900 dark:text-white" {...props} />
                    ),
                    h5: ({ node, ...props }) => (
                      <h5 className="text-base font-semibold mt-2 mb-1 text-slate-900 dark:text-white" {...props} />
                    ),
                    h6: ({ node, ...props }) => (
                      <h6 className="text-sm font-semibold mt-2 mb-1 text-slate-900 dark:text-white" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-4 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="[&>p]:inline [&>p]:m-0" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-2 mb-4 italic text-slate-600 dark:text-slate-400" {...props} />
                    ),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono text-red-600 dark:text-red-400" {...props} />
                      ) : (
                        <code className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100" {...props} />
                      ),
                    pre: ({ node, ...props }) => (
                      <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-x-auto mb-4 text-sm" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                    img: ({ node, ...props }) => (
                      <img className="max-w-full h-auto rounded-lg my-4" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="my-6 border-t border-slate-200 dark:border-slate-700" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <table className="w-full border-collapse border border-slate-300 dark:border-slate-600 mb-4" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-slate-300 dark:border-slate-600 px-3 py-2" {...props} />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {tags && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                        >
                          #{tag.toLowerCase()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={isPublishing}>
              Back to Edit
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="flex-1">
              {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPublishing ? 'Publishing...' : 'Publish to Nostr'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
