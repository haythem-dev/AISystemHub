import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  CloudUpload, 
  X, 
  File, 
  Image, 
  FileText, 
  Code,
  Trash2
} from "lucide-react";

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (fileName: string, fileType: string, fileData: string) => void;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  data: string;
}

export default function FileUpload({ isOpen, onClose, onUpload }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysisType, setAnalysisType] = useState("summary");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('text/') || type.includes('document')) return FileText;
    if (type.includes('code') || type.includes('javascript') || type.includes('python')) return Code;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1]; // Remove data URL prefix
      
      const uploadedFile: UploadedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
      };
      
      setFiles(prev => [...prev, uploadedFile]);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(handleFileRead);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(handleFileRead);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    files.forEach(file => {
      onUpload(file.name, file.type, file.data);
    });
    setFiles([]);
    onClose();
  };

  const handleClose = () => {
    setFiles([]);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CloudUpload className="h-5 w-5" />
            <span>File Upload & Analysis</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Drop files here or click to upload
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports documents, images, code files, and data formats
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,text/*,.pdf,.doc,.docx,.py,.js,.ts,.jsx,.tsx,.json,.csv,.md"
            />
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Uploaded Files</h4>
              {files.map((file, index) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analysis Options */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Analysis Type</h4>
              <RadioGroup value={analysisType} onValueChange={setAnalysisType}>
                <div className="grid grid-cols-2 gap-3">
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary has-[:checked]:border-primary">
                    <RadioGroupItem value="summary" />
                    <span className="text-sm">Content Summary</span>
                  </Label>
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary has-[:checked]:border-primary">
                    <RadioGroupItem value="code" />
                    <span className="text-sm">Code Analysis</span>
                  </Label>
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary has-[:checked]:border-primary">
                    <RadioGroupItem value="data" />
                    <span className="text-sm">Data Insights</span>
                  </Label>
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary has-[:checked]:border-primary">
                    <RadioGroupItem value="security" />
                    <span className="text-sm">Security Review</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Badge variant="secondary" className="text-xs">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </Badge>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={files.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                Upload & Analyze
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
