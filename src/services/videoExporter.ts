import {
  AspectRatioType,
  CaptionStyle,
  IntroConfig,
  OutroConfig,
  VideoResolutionQuality,
  VideoSlide,
} from '../types/video';
import { videoRenderer } from './videoRenderer';
import { audioEngine } from './audioEngine';

export interface ExportProgress {
  progress: number; // 0 to 1
  currentTime: number;
  totalDuration: number;
  statusText: string;
}

export interface ExportOptions {
  intro: IntroConfig;
  slides: VideoSlide[];
  outro: OutroConfig;
  aspectRatio: AspectRatioType;
  resolutionQuality?: VideoResolutionQuality;
  captionStyle: CaptionStyle;
  audioTrackId: string;
  isMuted: boolean;
  fps?: number;
  onProgress?: (progress: ExportProgress) => void;
}

export class VideoExporter {
  private isExporting = false;
  private shouldCancel = false;

  public cancel() {
    this.shouldCancel = true;
  }

  public async exportMP4(options: ExportOptions): Promise<{ blob: Blob; url: string; filename: string }> {
    const {
      intro,
      slides,
      outro,
      aspectRatio,
      resolutionQuality = '1080p',
      captionStyle,
      audioTrackId,
      isMuted,
      fps = 30,
      onProgress,
    } = options;

    this.isExporting = true;
    this.shouldCancel = false;

    // 1. Calculate duration and ensure all images are preloaded
    const { totalDuration } = videoRenderer.calculateSegments(intro, slides, outro);

    onProgress?.({
      progress: 0.05,
      currentTime: 0,
      totalDuration,
      statusText: 'Görseller ve varlıklar hazırlanıyor...',
    });

    const imageUrls: string[] = [];
    slides.forEach(s => {
      if (s.post?.imageUrl) imageUrls.push(s.post.imageUrl);
      if (s.posts) {
        s.posts.forEach(p => {
          if (p.imageUrl) imageUrls.push(p.imageUrl);
        });
      }
    });
    if (intro.logoUrl) imageUrls.push(intro.logoUrl);
    if (outro.logoUrl) imageUrls.push(outro.logoUrl);

    await videoRenderer.preloadImages(imageUrls);

    // 2. Create export offscreen canvas with selected resolution
    const { width, height } = videoRenderer.getResolution(aspectRatio, resolutionQuality);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    // 3. Setup canvas stream and audio stream
    const canvasStream = exportCanvas.captureStream(fps);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    // Add audio track if not muted
    if (!isMuted && audioTrackId !== 'track-none') {
      try {
        audioEngine.play(audioTrackId);
        const audioDest = audioEngine.getAudioStreamDestination();
        const audioTracks = audioDest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedTracks.push(audioTracks[0]);
        }
      } catch (err) {
        console.warn('Audio stream attachment warning:', err);
      }
    }

    const combinedStream = new MediaStream(combinedTracks);

    // Determine supported mime type
    const mimeTypes = [
      'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4; codecs=h264',
      'video/mp4',
      'video/webm; codecs=h264',
      'video/webm; codecs=vp9',
      'video/webm',
    ];

    let selectedMimeType = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    // Adjust bitrate based on resolution quality
    let bitrate = 8_000_000;
    if (resolutionQuality === '720p') bitrate = 4_500_000;
    else if (resolutionQuality === '360p') bitrate = 1_500_000;

    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: bitrate,
    };
    if (selectedMimeType) {
      recorderOptions.mimeType = selectedMimeType;
    }

    const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
    const recordedChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        audioEngine.stop();
        this.isExporting = false;

        const outputType = selectedMimeType.includes('mp4') ? 'video/mp4' : 'video/mp4';
        const blob = new Blob(recordedChunks, { type: outputType });
        const url = URL.createObjectURL(blob);
        const filename = `tanitim-${resolutionQuality}-${Date.now()}.mp4`;

        onProgress?.({
          progress: 1,
          currentTime: totalDuration,
          totalDuration,
          statusText: 'MP4 videosu başarıyla hazırlandı!',
        });

        resolve({ blob, url, filename });
      };

      mediaRecorder.onerror = (e) => {
        audioEngine.stop();
        this.isExporting = false;
        reject(e);
      };

      mediaRecorder.start(200); // chunk every 200ms

      // Frame-by-frame rendering loop at 30 fps
      const frameDuration = 1 / fps;
      let currentTime = 0;

      const renderStep = () => {
        if (this.shouldCancel) {
          mediaRecorder.stop();
          audioEngine.stop();
          reject(new Error('Export cancelled'));
          return;
        }

        if (currentTime >= totalDuration) {
          // Render final frame and wait a small fraction for recorder buffer flush
          videoRenderer.renderFrame({
            canvas: exportCanvas,
            time: totalDuration,
            intro,
            slides,
            outro,
            aspectRatio,
            captionStyle,
            resolutionQuality,
          });

          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 300);
          return;
        }

        videoRenderer.renderFrame({
          canvas: exportCanvas,
          time: currentTime,
          intro,
          slides,
          outro,
          aspectRatio,
          captionStyle,
          resolutionQuality,
        });

        const progressVal = Math.min(0.98, currentTime / totalDuration);
        onProgress?.({
          progress: progressVal,
          currentTime,
          totalDuration,
          statusText: `Video işleniyor... %${Math.round(progressVal * 100)} (${currentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`,
        });

        currentTime += frameDuration;
        // Schedule next frame to match real-time recorder stream clock
        setTimeout(renderStep, 1000 / fps);
      };

      renderStep();
    });
  }
}

export const videoExporter = new VideoExporter();
