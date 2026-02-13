"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileImage,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function UploadBracketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const isValidFileType = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    // Also check file extension for HEIC since some browsers don't recognize the MIME type
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.pdf'];
    return validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile);
      if (droppedFile.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(droppedFile));
      } else {
        setPreview(null); // PDFs won't have image preview
      }
      setUploadStatus("idle");
    } else {
      toast.error("Please upload an image or PDF file");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(selectedFile));
      } else {
        setPreview(null); // PDFs won't have image preview
      }
      setUploadStatus("idle");
    } else if (selectedFile) {
      toast.error("Please upload an image or PDF file");
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setUploadStatus("idle");
    setProgress(0);
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus("processing");
    setProgress(0);

    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);

      // Send to AI extraction API
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/brackets/extract", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process bracket");
      }

      const result = await response.json();
      
      setProgress(100);
      setUploadStatus("success");

      toast.success("Bracket processed successfully!");
      
      // Store extracted data in sessionStorage for the new bracket page
      sessionStorage.setItem("extractedBracket", JSON.stringify(result.data));
      
      setTimeout(() => {
        router.push("/brackets/new?fromUpload=true");
      }, 1500);

    } catch (error) {
      setUploadStatus("error");
      const message = error instanceof Error ? error.message : "Failed to process bracket";
      toast.error(message + " Please try again or enter picks manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload Bracket</h1>
        <p className="text-slate-600 mt-1">
          Upload a photo of your completed bracket and let AI extract your picks
        </p>
      </div>

      {/* AI Info Card */}
      <Card className="border-accent bg-secondary">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI-Powered Extraction</h3>
              <p className="text-sm text-slate-600 mt-1">
                Our AI will analyze your bracket image and automatically extract your
                picks. You&apos;ll have a chance to review and edit before submitting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Bracket</CardTitle>
          <CardDescription>
            Supported formats: PNG, JPG, JPEG, WebP, HEIC, PDF (Max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/*,.pdf,.heic,.heif,application/pdf,image/heic,image/heif"
                onChange={handleFileChange}
                className="hidden"
                id="bracket-upload"
              />
              <label htmlFor="bracket-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-lg font-medium text-slate-700 mb-1">
                  Drop your bracket image or PDF here
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  or click to browse
                </p>
                <Button type="button" variant="outline" asChild>
                  <span>
                    <FileImage className="mr-2 h-4 w-4" />
                    Select File
                  </span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-lg overflow-hidden bg-slate-100">
                {preview ? (
                  <img
                    src={preview}
                    alt="Bracket preview"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-16 w-16 text-red-500 mb-3" />
                    <p className="text-slate-600 font-medium">PDF Document</p>
                    <p className="text-sm text-slate-500">Ready for AI processing</p>
                  </div>
                )}
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-2 bg-slate-900/50 rounded-full text-white hover:bg-slate-900/70 transition-colors"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* File info */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {file?.type === 'application/pdf' ? (
                    <FileText className="h-8 w-8 text-red-500" />
                  ) : (
                    <FileImage className="h-8 w-8 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {uploadStatus === "success" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {uploadStatus === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              {/* Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Processing with AI...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRemoveFile}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Choose Different Image
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || uploadStatus === "success"}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : uploadStatus === "success" ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Processed!
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Process with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for Best Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Use good lighting and avoid shadows on the bracket
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Make sure all team names and picks are clearly visible
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Take the photo straight-on to minimize distortion
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Use a standard NCAA bracket format for best recognition
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
