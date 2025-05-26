import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FolderOpen, 
  X, 
  FileCode, 
  Database, 
  GitBranch,
  Layers,
  BarChart3,
  FileText,
  Zap,
  Cpu,
  Globe
} from "lucide-react";

interface ProjectUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (projectName: string, files: Array<{path: string, content: string, type: string}>, analysisType: string) => void;
}

interface ProjectFile {
  path: string;
  content: string;
  type: string;
  size: number;
}

export default function ProjectUpload({ isOpen, onClose, onUpload }: ProjectUploadProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [projectName, setProjectName] = useState("");
  const [analysisType, setAnalysisType] = useState("metrics");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processDirectory = async (dirHandle: any, basePath = ""): Promise<ProjectFile[]> => {
    const files: ProjectFile[] = [];
    
    for await (const [name, handle] of dirHandle.entries()) {
      const fullPath = basePath ? `${basePath}/${name}` : name;
      
      if (handle.kind === 'file') {
        // Skip binary files and common non-code files
        if (shouldIncludeFile(name)) {
          try {
            const file = await handle.getFile();
            const content = await file.text();
            files.push({
              path: fullPath,
              content,
              type: file.type || getFileType(name),
              size: content.length
            });
          } catch (error) {
            console.warn(`Skipped file ${fullPath}:`, error);
          }
        }
      } else if (handle.kind === 'directory' && !shouldSkipDirectory(name)) {
        const subFiles = await processDirectory(handle, fullPath);
        files.push(...subFiles);
      }
    }
    
    return files;
  };

  const shouldIncludeFile = (fileName: string): boolean => {
    const includeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt',
      'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'sql', 'sh', 'dockerfile',
      'toml', 'ini', 'cfg', 'conf', 'env', 'lock', 'mod', 'sum'
    ];
    const ext = fileName.split('.').pop()?.toLowerCase();
    return includeExtensions.includes(ext || '') || 
           fileName.toLowerCase().includes('readme') ||
           fileName.toLowerCase().includes('license') ||
           fileName.toLowerCase().includes('changelog');
  };

  const shouldSkipDirectory = (dirName: string): boolean => {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.pytest_cache', 'target', 'bin', 'obj'];
    return skipDirs.includes(dirName.toLowerCase());
  };

  const getFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'application/javascript',
      'tsx': 'application/typescript',
      'py': 'text/x-python',
      'java': 'text/x-java',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc',
      'cs': 'text/x-csharp',
      'php': 'text/x-php',
      'rb': 'text/x-ruby',
      'go': 'text/x-go',
      'rs': 'text/x-rustsrc',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'md': 'text/markdown',
      'sql': 'text/x-sql'
    };
    return typeMap[ext || ''] || 'text/plain';
  };

  const handleDirectorySelect = async () => {
    try {
      // @ts-ignore - File System Access API
      if ('showDirectoryPicker' in window) {
        setUploadProgress(10);
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        setProjectName(dirHandle.name);
        setUploadProgress(30);
        
        const projectFiles = await processDirectory(dirHandle);
        setFiles(projectFiles);
        setUploadProgress(100);
        
        setTimeout(() => setUploadProgress(0), 1000);
      } else {
        alert("Directory upload is not supported in this browser. Please use Chrome or Edge.");
      }
    } catch (error) {
      console.error('Directory selection error:', error);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const projectFiles: ProjectFile[] = [];
    
    droppedFiles.forEach(async (file) => {
      if (shouldIncludeFile(file.name)) {
        const content = await file.text();
        projectFiles.push({
          path: file.name,
          content,
          type: file.type || getFileType(file.name),
          size: content.length
        });
      }
    });
    
    setFiles(projectFiles);
    if (!projectName && projectFiles.length > 0) {
      setProjectName("Uploaded Project");
    }
  }, [projectName]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUpload = () => {
    if (files.length > 0 && projectName.trim()) {
      onUpload(projectName.trim(), files, analysisType);
      handleClose();
    }
  };

  const handleClose = () => {
    setFiles([]);
    setProjectName("");
    setUploadProgress(0);
    onClose();
  };

  const analysisOptions = [
    { 
      id: 'metrics', 
      label: 'Code Metrics & Quality', 
      icon: BarChart3, 
      description: 'Comprehensive code quality analysis, complexity metrics, and technical debt assessment' 
    },
    { 
      id: 'architecture', 
      label: 'Architecture Analysis', 
      icon: Layers, 
      description: 'System architecture overview, component breakdown, and design patterns analysis' 
    },
    { 
      id: 'uml', 
      label: 'UML Diagrams', 
      icon: GitBranch, 
      description: 'Generate class diagrams, sequence diagrams, and component relationships' 
    },
    { 
      id: 'datamodel', 
      label: 'Data Model Analysis', 
      icon: Database, 
      description: 'Database schema analysis, ERD generation, and data flow documentation' 
    },
    { 
      id: 'documentation', 
      label: 'Technical Documentation', 
      icon: FileText, 
      description: 'Generate comprehensive technical docs, API documentation, and deployment guides' 
    },
    { 
      id: 'structure', 
      label: 'Project Structure', 
      icon: FolderOpen, 
      description: 'Analyze project organization, dependencies, and technology stack' 
    }
  ];

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const codeFiles = files.filter(f => shouldIncludeFile(f.path)).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Project Analysis & Architecture Generation</span>
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
          >
            <div className="space-y-4">
              <div className="flex justify-center space-x-4">
                <div className="flex flex-col items-center space-y-2">
                  <FolderOpen className="h-12 w-12 text-primary" />
                  <Button onClick={handleDirectorySelect} variant="outline">
                    Select Project Folder
                  </Button>
                </div>
                <div className="text-muted-foreground flex items-center">or</div>
                <div className="flex flex-col items-center space-y-2">
                  <FileCode className="h-12 w-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Drop files here</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground max-w-md mx-auto">
                Upload your entire project for comprehensive analysis including code metrics, 
                architecture documentation, UML diagrams, and technical documentation generation.
              </div>
            </div>
          </div>

          {/* Project Name */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project Name</Label>
              <Textarea
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="min-h-[40px] max-h-[80px]"
              />
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Project Summary */}
          {files.length > 0 && (
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">Project Summary</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{files.length}</div>
                  <div className="text-muted-foreground">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{codeFiles}</div>
                  <div className="text-muted-foreground">Code Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">{formatFileSize(totalSize)}</div>
                  <div className="text-muted-foreground">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {new Set(files.map(f => f.path.split('.').pop())).size}
                  </div>
                  <div className="text-muted-foreground">File Types</div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Type Selection */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Analysis Type</h4>
              <RadioGroup value={analysisType} onValueChange={setAnalysisType}>
                <div className="grid grid-cols-2 gap-3">
                  {analysisOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <Label 
                        key={option.id}
                        className="flex items-start space-x-3 p-4 border border-border rounded-lg cursor-pointer hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <RadioGroupItem value={option.id} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <IconComponent className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </Label>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* AI Models Info */}
          {files.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">AI Analysis Pipeline</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>DeepSeek Coder - Code Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Claude - Architecture Docs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Perplexity - Research & Context</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Badge variant="secondary" className="text-xs">
              {files.length} file{files.length !== 1 ? 's' : ''} • {formatFileSize(totalSize)}
            </Badge>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={files.length === 0 || !projectName.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                <Zap className="h-4 w-4 mr-2" />
                Analyze Project
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}