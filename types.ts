export enum AppStep {
  AUTH,
  PROFILE,
  PREFERENCES,
  DASHBOARD
}

export enum TabView {
  MATCH = 'Your Match',
  FAVORITES = 'Favorites',
  READING = 'You Are Reading',
  READ = 'You Have Read',
  ALL = 'All Books',
  TRAILER = 'Book Trailer (Veo)',
  LIBRARIES = 'Nearby Libraries',
  COMMUNITY = 'Community'
}

export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export interface Book {
  title: string;
  genre?: string; // Added for filtering
  summary: string;
  difficulty: Difficulty;
  reason?: string; // Why it matches (for recommendations)
  author?: string; // Optional for manual lists
  coverUrl?: string; // Optional cover placeholder
}

export interface UserProfile {
  name: string;
  email: string;
  age: string;
  favGenre: string;
}

export interface UserPreferences {
  personality: string;
  bookTypes: string;
  readingTone: string;
  themes: string;
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progressMessage: string;
  videoUri: string | null;
  error: string | null;
}

export interface LibraryEntity {
  title: string;
  address?: string;
  uri?: string;
}