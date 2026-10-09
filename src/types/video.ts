export type AspectRatioType = '9:16' | '1:1' | '4:5' | '16:9';

export type VideoResolutionQuality = '360p' | '720p' | '1080p';

export type TransitionType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'blur'
  | 'wipe-right'
  | 'flash';

export type CaptionStyle =
  | 'card-glass'
  | 'bottom-banner'
  | 'minimal-dark'
  | 'gradient-bold'
  | 'pill-badge';

export interface MediaGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  title?: string;
  groupTitle?: string;
  groupId?: string;
  groupName?: string;
  duration?: number;
  likes?: number;
  comments?: number;
  date?: string;
  tags?: string[];
  author?: {
    username?: string;
    fullName?: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

export interface VideoSlide {
  id: string;
  type: 'post' | 'image' | 'group-collage';
  post: InstagramPost;
  posts?: InstagramPost[]; // Multiple photos in the same group displayed simultaneously
  duration: number; // in seconds, e.g. 3.0
  transition: TransitionType;
  transitionDuration: number; // e.g. 0.6
  groupTitle?: string; // Group Title above photos
  groupName?: string;
  captionText: string; // Group Description below photos
  showCaption: boolean;
  showAuthorBadge: boolean;
  zoomEffect: 'ken-burns-in' | 'ken-burns-out' | 'static';
  groupId?: string;
}

export type BackgroundStyleType =
  | 'gradient-dark'
  | 'gradient-purple'
  | 'gradient-sunset'
  | 'solid-black'
  | 'gradient-light-slate'
  | 'gradient-light-blue'
  | 'gradient-light-warm'
  | 'solid-white';

export interface IntroConfig {
  enabled: boolean;
  logoUrl: string | null;
  logoScale: number; // 0.4 to 4.0
  logoCropPercent?: number; // 0 to 45% köşelerden/kenarlardan daraltma/kırpma
  logoBgColor?: string; // background color under logo, e.g. '#ffffff', '#0f172a', 'transparent'
  logoBgBlend?: 'soft-radial' | 'frosted-glass' | 'solid-circle' | 'none'; // smooth blend mode
  title: string;
  subtitle: string;
  titleFontSize?: number; // Başlık puntosu (px, örn: 46)
  subtitleFontSize?: number; // Alt metin puntosu (px, örn: 24)
  duration: number; // e.g. 2.5
  transition: TransitionType;
  backgroundStyle: BackgroundStyleType;
  fontFamily: 'Outfit' | 'Plus Jakarta Sans' | 'Playfair Display';
}

export interface OutroConfig {
  enabled: boolean;
  logoUrl: string | null;
  logoScale: number;
  logoCropPercent?: number; // 0 to 45%
  logoBgColor?: string;
  logoBgBlend?: 'soft-radial' | 'frosted-glass' | 'solid-circle' | 'none';
  title?: string;
  subtitle?: string;
  titleFontSize?: number; // Başlık puntosu (px, örn: 46)
  subtitleFontSize?: number; // Alt metin puntosu (px, örn: 24)
  headline?: string;
  callToAction?: string;
  socialHandle?: string;
  websiteUrl?: string;
  duration: number; // e.g. 2.5
  transition: TransitionType;
  backgroundStyle: BackgroundStyleType;
  fontFamily: 'Outfit' | 'Plus Jakarta Sans' | 'Playfair Display';
}

export interface AudioTrackOption {
  id: string;
  name: string;
  genre: string;
  tempo: number;
  previewColor: string;
  url?: string;
}

export interface ProjectSettings {
  aspectRatio: AspectRatioType;
  captionStyle: CaptionStyle;
  selectedAudioTrack: string;
  audioVolume: number; // 0 to 1
  isMuted: boolean;
  fps: number;
}
