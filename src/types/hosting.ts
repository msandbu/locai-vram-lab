export type OperatingSystem = 'macOS' | 'Windows' | 'Linux';

export type ToolCategory =
  | 'desktop-gui'
  | 'developer-cli'
  | 'high-throughput'
  | 'web-ui'
  | 'distributed';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface HostingTool {
  id: string;
  name: string;
  tagline: string;
  category: ToolCategory;
  supportedOS: OperatingSystem[];
  hardwareAcceleration: string;
  modelFormats: string[];
  openAiApiCompatible: boolean;
  difficulty: DifficultyLevel;
  license: string;
  website: string;
  github: string;
  installCommands: {
    windows?: string;
    macos?: string;
    linux?: string;
  };
  quickStart: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}
