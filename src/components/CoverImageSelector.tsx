import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { Loader2, Upload, X } from 'lucide-react';

interface CoverImageSelectorProps {
  articleImages: string[];
  onCoverImageSelected: (imageUrl: string) => void;
  selectedCoverImage?: string;
  disabled?: boolean;
}

export function CoverImageSelector({
  articleImages,
  onCoverImageSelected,
  selectedCoverImage,
  disabled = false,
}: CoverImageSelectorProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPEG, PNG, GIF, WebP, etc.)',
        variant: 'destructive',
      });
      return;
    }

    uploadFile(file, {
      onSuccess: (tags) => {
        // Extract the image URL from the returned tags
        const urlTag = tags.find((tag) => tag[0] === 'url');
        if (urlTag && urlTag[1]) {
          onCoverImageSelected(urlTag[1]);
          setIsUploadDialogOpen(false);
          toast({
            title: 'Success',
            description: 'Cover image uploaded successfully',
          });
        }
      },
      onError: (error) => {
        toast({
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Failed to upload image',
          variant: 'destructive',
        });
      },
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const hasImages = articleImages.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
          <CardDescription>
            {hasImages
              ? 'Select an image from the article or upload a custom one'
              : 'No images found in the article. Upload a cover image.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current selection preview */}
          {selectedCoverImage && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Selected Cover Image
              </p>
              <div className="relative w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <img
                  src={selectedCoverImage}
                  alt="Selected cover"
                  className="w-full h-48 object-cover"
                  onError={() => {
                    toast({
                      title: 'Image load error',
                      description: 'The image could not be loaded',
                      variant: 'destructive',
                    });
                  }}
                />
                <button
                  onClick={() => onCoverImageSelected('')}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                  disabled={disabled}
                  aria-label="Remove cover image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Article images gallery */}
          {hasImages && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Images in Article ({articleImages.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {articleImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    onClick={() => onCoverImageSelected(imageUrl)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedCoverImage === imageUrl
                        ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    disabled={disabled}
                    title={`Image ${index + 1}`}
                  >
                    <img
                      src={imageUrl}
                      alt={`Article image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {selectedCoverImage === imageUrl && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-blue-500 text-white rounded-full p-2">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload section */}
          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            {isUploadDialogOpen ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center space-y-3 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              >
                <div className="flex justify-center">
                  <Upload className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Drag and drop your image here
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    or
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || disabled}
                  size="sm"
                  variant="outline"
                >
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploading ? 'Uploading...' : 'Select File'}
                </Button>
                <Button
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={isUploading || disabled}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isUploading || disabled}
                />
              </div>
            ) : (
              <Button
                onClick={() => setIsUploadDialogOpen(true)}
                disabled={isUploading || disabled}
                variant="outline"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Custom Cover Image'}
              </Button>
            )}
          </div>

          {/* Info alert */}
          <Alert>
            <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
              The cover image will be added to your Nostr article and displayed in compatible clients.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
