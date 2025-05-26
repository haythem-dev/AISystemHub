import { deepseekProvider } from './deepseek';
import { perplexityProvider } from './perplexity';
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';

interface ProjectFile {
  path: string;
  content: string;
  type: string;
  size: number;
}

interface CodeMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  functions: number;
  classes: number;
  complexity: number;
  duplicates: number;
  testCoverage?: number;
}

interface ProjectStructure {
  directories: string[];
  files: ProjectFile[];
  dependencies: Record<string, string>;
  technologies: string[];
  frameworks: string[];
  languages: Record<string, number>;
}

export class ProjectAnalyzer {

  async analyzeProjectStructure(files: ProjectFile[]): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      directories: [],
      files: files,
      dependencies: {},
      technologies: [],
      frameworks: [],
      languages: {}
    };

    // Extract directory structure
    const dirSet = new Set<string>();
    files.forEach(file => {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirSet.add(parts.slice(0, i).join('/'));
      }
    });
    structure.directories = Array.from(dirSet).sort();

    // Analyze languages
    files.forEach(file => {
      const ext = file.path.split('.').pop()?.toLowerCase() || 'unknown';
      const language = this.getLanguageFromExtension(ext);
      structure.languages[language] = (structure.languages[language] || 0) + file.content.split('\n').length;
    });

    // Extract dependencies and frameworks
    for (const file of files) {
      if (file.path.includes('package.json')) {
        try {
          const packageData = JSON.parse(file.content);
          structure.dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
          structure.frameworks.push(...this.detectFrameworks(structure.dependencies));
        } catch (e) {
          // Ignore parse errors
        }
      } else if (file.path.includes('requirements.txt')) {
        const deps = file.content.split('\n').filter(line => line.trim());
        deps.forEach(dep => {
          const [name] = dep.split('==');
          structure.dependencies[name] = dep;
        });
      } else if (file.path.includes('Cargo.toml') || file.path.includes('go.mod') || file.path.includes('pom.xml')) {
        // Add other dependency file parsers as needed
      }
    }

    // Detect technologies
    structure.technologies = this.detectTechnologies(files, structure.dependencies);

    return structure;
  }

  async calculateCodeMetrics(files: ProjectFile[]): Promise<CodeMetrics> {
    const metrics: CodeMetrics = {
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: 0,
      classes: 0,
      complexity: 0,
      duplicates: 0
    };

    for (const file of files) {
      if (this.isCodeFile(file.path)) {
        const fileMetrics = this.analyzeFileMetrics(file);
        metrics.totalLines += fileMetrics.totalLines;
        metrics.codeLines += fileMetrics.codeLines;
        metrics.commentLines += fileMetrics.commentLines;
        metrics.blankLines += fileMetrics.blankLines;
        metrics.functions += fileMetrics.functions;
        metrics.classes += fileMetrics.classes;
        metrics.complexity += fileMetrics.complexity;
      }
    }

    // Calculate code duplicates using content comparison
    metrics.duplicates = this.findDuplicates(files);

    return metrics;
  }

  async generateUMLDiagram(files: ProjectFile[], diagramType: 'class' | 'sequence' | 'component' | 'architecture'): Promise<string> {
    // Extract project structure for UML generation
    const structure = await this.analyzeProjectStructure(files);

    const projectDescription = `
Project Structure:
- Languages: ${Object.keys(structure.languages).join(', ')}
- Frameworks: ${structure.frameworks.join(', ')}
- Key Files: ${files.slice(0, 10).map(f => f.path).join(', ')}
- Dependencies: ${Object.keys(structure.dependencies).slice(0, 10).join(', ')}

Code Sample (for context):
${files.slice(0, 3).map(f => `${f.path}:\n${f.content.slice(0, 500)}`).join('\n\n')}
`;

    return await deepseekProvider.generateUML(projectDescription, diagramType);
  }

  async generateArchitectureDocs(files: ProjectFile[]): Promise<string> {
    const structure = await this.analyzeProjectStructure(files);
    const metrics = await this.calculateCodeMetrics(files);

    const prompt = `Generate comprehensive architecture documentation for this project:

PROJECT OVERVIEW:
- Total Files: ${files.length}
- Languages: ${Object.entries(structure.languages).map(([lang, lines]) => `${lang} (${lines} lines)`).join(', ')}
- Frameworks: ${structure.frameworks.join(', ')}
- Code Lines: ${metrics.codeLines}
- Functions: ${metrics.functions}
- Classes: ${metrics.classes}

KEY FILES:
${files.slice(0, 10).map(f => `- ${f.path} (${f.content.split('\n').length} lines)`).join('\n')}

DEPENDENCIES:
${Object.entries(structure.dependencies).slice(0, 15).map(([name, version]) => `- ${name}: ${version}`).join('\n')}

Generate documentation covering:
1. System Architecture Overview
2. Component Breakdown
3. Data Flow
4. Technology Stack Analysis
5. Design Patterns Used
6. Security Considerations
7. Performance Analysis
8. Scalability Assessment
9. Recommended Improvements
10. Deployment Architecture`;

    return await anthropicProvider.generateResponse([
      { role: "system", content: "You are a senior software architect. Generate comprehensive, professional architecture documentation." },
      { role: "user", content: prompt }
    ], "claude-3-7-sonnet-20250219") as string;
  }

  async generateCodeMetricsReport(files: ProjectFile[]): Promise<string> {
    const metrics = await this.calculateCodeMetrics(files);
    const structure = await this.analyzeProjectStructure(files);

    const prompt = `Generate a detailed code metrics and quality report:

CODE METRICS:
- Total Lines: ${metrics.totalLines}
- Code Lines: ${metrics.codeLines}
- Comment Lines: ${metrics.commentLines}
- Blank Lines: ${metrics.blankLines}
- Functions: ${metrics.functions}
- Classes: ${metrics.classes}
- Cyclomatic Complexity: ${metrics.complexity}
- Potential Duplicates: ${metrics.duplicates}

LANGUAGE BREAKDOWN:
${Object.entries(structure.languages).map(([lang, lines]) => `- ${lang}: ${lines} lines (${((lines / metrics.totalLines) * 100).toFixed(1)}%)`).join('\n')}

TECHNOLOGY ANALYSIS:
- Technologies: ${structure.technologies.join(', ')}
- Frameworks: ${structure.frameworks.join(', ')}
- Dependencies: ${Object.keys(structure.dependencies).length} total

Generate a comprehensive report covering:
1. Code Quality Assessment
2. Maintainability Index
3. Technical Debt Analysis
4. Security Vulnerability Assessment
5. Performance Bottlenecks
6. Code Coverage Analysis
7. Best Practices Compliance
8. Refactoring Recommendations
9. Testing Strategy Assessment
10. Documentation Quality`;

    return await deepseekProvider.analyzeCode(prompt);
  }

  async generateDataModel(files: ProjectFile[]): Promise<string> {
    // Find database schema files, models, and data structures
    const dataFiles = files.filter(file => 
      file.path.includes('model') || 
      file.path.includes('schema') || 
      file.path.includes('migration') ||
      file.path.includes('entity') ||
      file.path.includes('database') ||
      file.path.includes('.sql') ||
      file.path.includes('prisma') ||
      file.path.includes('drizzle')
    );

    const prompt = `Analyze and generate a comprehensive data model documentation:

DATA-RELATED FILES:
${dataFiles.map(f => `${f.path}:\n${f.content.slice(0, 1000)}`).join('\n\n')}

Generate:
1. Entity Relationship Diagram (ERD) in PlantUML format
2. Data Dictionary
3. Relationship Analysis
4. Data Flow Documentation
5. Database Schema Optimization Recommendations
6. Data Security Analysis
7. Backup and Recovery Strategy
8. Data Governance Guidelines`;

    return await deepseekProvider.generateResponse([
      { role: "system", content: "You are a database architect and data modeling expert." },
      { role: "user", content: prompt }
    ], "deepseek-coder") as string;
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'JavaScript React',
      'tsx': 'TypeScript React',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'less': 'LESS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
      'sh': 'Shell',
      'dockerfile': 'Docker'
    };
    return languageMap[ext] || 'Other';
  }

  private isCodeFile(path: string): boolean {
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala'];
    const ext = path.split('.').pop()?.toLowerCase();
    return codeExtensions.includes(ext || '');
  }

  private analyzeFileMetrics(file: ProjectFile): CodeMetrics {
    const lines = file.content.split('\n');
    const metrics: CodeMetrics = {
      totalLines: lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: 0,
      classes: 0,
      complexity: 1,
      duplicates: 0
    };

    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        metrics.blankLines++;
      } else if (this.isComment(trimmed) || inBlockComment) {
        metrics.commentLines++;
        if (trimmed.includes('/*')) inBlockComment = true;
        if (trimmed.includes('*/')) inBlockComment = false;
      } else {
        metrics.codeLines++;

        // Count functions and classes
        if (this.isFunctionDeclaration(trimmed)) metrics.functions++;
        if (this.isClassDeclaration(trimmed)) metrics.classes++;

        // Calculate complexity (simplified)
        if (this.isComplexityNode(trimmed)) metrics.complexity++;
      }
    }

    return metrics;
  }

  private isComment(line: string): boolean {
    return line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line.startsWith('*');
  }

  private isFunctionDeclaration(line: string): boolean {
    return /^(function|def|fn|func|public|private|protected|static).*\(.*\)/.test(line) ||
           /^.*=\s*\(.*\)\s*=>/.test(line) ||
           /^.*:\s*\(.*\)\s*=>/.test(line);
  }

  private isClassDeclaration(line: string): boolean {
    return /^(class|interface|enum|struct|trait)\s+\w+/.test(line);
  }

  private isComplexityNode(line: string): boolean {
    return /^(if|else|elif|for|while|switch|case|catch|try)\b/.test(line);
  }

  private findDuplicates(files: ProjectFile[]): number {
    const codeBlocks = new Map<string, number>();
    let duplicates = 0;

    for (const file of files) {
      if (this.isCodeFile(file.path)) {
        const lines = file.content.split('\n');
        // Check for blocks of 5+ similar lines
        for (let i = 0; i <= lines.length - 5; i++) {
          const block = lines.slice(i, i + 5).join('\n').trim();
          if (block.length > 50) { // Ignore very short blocks
            const count = codeBlocks.get(block) || 0;
            if (count === 1) duplicates++; // First duplicate found
            codeBlocks.set(block, count + 1);
          }
        }
      }
    }

    return duplicates;
  }

  private detectFrameworks(dependencies: Record<string, string>): string[] {
    const frameworks: string[] = [];
    const frameworkMap: Record<string, string> = {
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'express': 'Express.js',
      'fastapi': 'FastAPI',
      'django': 'Django',
      'flask': 'Flask',
      'spring': 'Spring',
      'rails': 'Ruby on Rails',
      'laravel': 'Laravel',
      'next': 'Next.js',
      'nuxt': 'Nuxt.js',
      'svelte': 'Svelte',
      'tailwindcss': 'Tailwind CSS',
      'bootstrap': 'Bootstrap'
    };

    for (const dep of Object.keys(dependencies)) {
      for (const [key, framework] of Object.entries(frameworkMap)) {
        if (dep.toLowerCase().includes(key)) {
          frameworks.push(framework);
          break;
        }
      }
    }

    return [...new Set(frameworks)];
  }

  private detectTechnologies(files: ProjectFile[], dependencies: Record<string, string>): string[] {
    const technologies = new Set<string>();

    // From files
    files.forEach(file => {
      if (file.path.includes('docker')) technologies.add('Docker');
      if (file.path.includes('kubernetes') || file.path.includes('k8s')) technologies.add('Kubernetes');
      if (file.path.includes('.yml') || file.path.includes('.yaml')) technologies.add('YAML');
      if (file.path.includes('terraform')) technologies.add('Terraform');
      if (file.path.includes('.sql')) technologies.add('SQL Database');
      if (file.path.includes('redis')) technologies.add('Redis');
      if (file.path.includes('mongo')) technologies.add('MongoDB');
      if (file.path.includes('postgres')) technologies.add('PostgreSQL');
    });

    // From dependencies
    Object.keys(dependencies).forEach(dep => {
      const lowerDep = dep.toLowerCase();
      if (lowerDep.includes('redis')) technologies.add('Redis');
      if (lowerDep.includes('mongo')) technologies.add('MongoDB');
      if (lowerDep.includes('postgres') || lowerDep.includes('pg')) technologies.add('PostgreSQL');
      if (lowerDep.includes('mysql')) technologies.add('MySQL');
      if (lowerDep.includes('graphql')) technologies.add('GraphQL');
      if (lowerDep.includes('websocket') || lowerDep.includes('socket.io')) technologies.add('WebSocket');
      if (lowerDep.includes('jwt')) technologies.add('JWT Authentication');
      if (lowerDep.includes('passport')) technologies.add('Passport.js');
      if (lowerDep.includes('stripe')) technologies.add('Stripe Payment');
      if (lowerDep.includes('aws') || lowerDep.includes('amazon')) technologies.add('AWS');
      if (lowerDep.includes('google')) technologies.add('Google Cloud');
      if (lowerDep.includes('azure')) technologies.add('Microsoft Azure');
    });

    return Array.from(technologies);
  }
}

export const projectAnalyzer = new ProjectAnalyzer();