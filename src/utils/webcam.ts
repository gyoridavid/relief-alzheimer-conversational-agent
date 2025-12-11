/**
 * Webcam utility for capturing screenshots
 */

export interface CaptureResult {
  /** Image as a Blob (for FormData uploads) */
  blob: Blob;
  /** Image as base64 data URL (for JSON payloads) */
  base64: string;
  /** Image dimensions */
  width: number;
  height: number;
}

export interface WebcamServiceOptions {
  /** Upload endpoint URL */
  url: string;
  /** Interval in milliseconds between captures (default: 60000 = 60 seconds) */
  intervalMs?: number;
  /** Upload format: 'formdata' or 'json' (default: 'json') */
  uploadFormat?: "formdata" | "json";
  /** Field name for the image in the upload (default: 'image') */
  imageField?: string;
  /** Additional data to include with each upload */
  additionalData?: Record<string, unknown>;
  /** Callback when capture/upload succeeds */
  onSuccess?: (result: CaptureResult, response: Response) => void;
  /** Callback when capture/upload fails */
  onError?: (error: Error) => void;
  /** Capture options */
  captureOptions?: {
    format?: "image/jpeg" | "image/png" | "image/webp";
    quality?: number;
    width?: number;
    height?: number;
  };
}

export interface WebcamService {
  /** Start the periodic capture service */
  start: () => void;
  /** Stop the periodic capture service */
  stop: () => void;
  /** Check if the service is currently running */
  isRunning: () => boolean;
  /** Manually trigger a capture and upload */
  captureNow: () => Promise<void>;
}

export interface WebcamStream {
  /** The MediaStream object */
  stream: MediaStream;
  /** Stop the stream and release the camera */
  stop: () => void;
}

/**
 * Start a webcam stream for live preview
 * @param options - Optional configuration for video dimensions
 * @returns Promise with the stream and stop function
 */
export async function startWebcamStream(options?: {
  width?: number;
  height?: number;
}): Promise<WebcamStream> {
  const { width = 1280, height = 720 } = options ?? {};

  const frontCameraId = await getFrontCameraDeviceId();

  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: width },
      height: { ideal: height },
      ...(frontCameraId
        ? { deviceId: { exact: frontCameraId } }
        : { facingMode: "user" }),
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  const stop = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  return { stream, stop };
}

/**
 * Get the front-facing camera device ID if available
 */
async function getFrontCameraDeviceId(): Promise<string | undefined> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");

    // Look for front-facing camera by label (common naming patterns)
    const frontCamera = videoDevices.find((d) => {
      const label = d.label.toLowerCase();
      return (
        label.includes("front") ||
        label.includes("facetime") ||
        label.includes("user") ||
        label.includes("selfie")
      );
    });

    return frontCamera?.deviceId;
  } catch {
    return undefined;
  }
}

/**
 * Capture a screenshot from the webcam
 * @param options - Optional configuration
 * @returns Promise with the captured image data
 */
export async function captureWebcamScreenshot(options?: {
  /** Image format (default: 'image/jpeg') */
  format?: "image/jpeg" | "image/png" | "image/webp";
  /** JPEG/WebP quality 0-1 (default: 0.9) */
  quality?: number;
  /** Preferred video width (default: 1280) */
  width?: number;
  /** Preferred video height (default: 720) */
  height?: number;
}): Promise<CaptureResult> {
  const {
    format = "image/jpeg",
    quality = 0.9,
    width = 1280,
    height = 720,
  } = options ?? {};

  // Try to get front-facing camera
  const frontCameraId = await getFrontCameraDeviceId();

  // Build constraints - prefer front camera, fallback to user-facing mode
  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: width },
      height: { ideal: height },
      ...(frontCameraId
        ? { deviceId: { exact: frontCameraId } }
        : { facingMode: "user" }), // 'user' = front-facing camera
    },
    audio: false,
  };

  let stream: MediaStream | null = null;

  try {
    // Request camera access
    stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Create video element to receive the stream
    const video = document.createElement("video");
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
      video.onerror = () => reject(new Error("Failed to load video stream"));
    });

    // Give the camera a moment to adjust exposure/focus
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Create canvas and capture frame
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw the current video frame
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob from canvas"));
        },
        format,
        quality
      );
    });

    // Convert to base64
    const base64 = canvas.toDataURL(format, quality);

    return {
      blob,
      base64,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    // Always stop the stream to release the camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
}

/**
 * Upload a captured image to a REST endpoint using FormData
 * @param url - The endpoint URL
 * @param captureResult - Result from captureWebcamScreenshot
 * @param fieldName - Form field name (default: 'image')
 * @param additionalFields - Additional form fields to include
 */
export async function uploadCaptureAsFormData(
  url: string,
  captureResult: CaptureResult,
  fieldName = "image",
  additionalFields?: Record<string, string>
): Promise<Response> {
  const formData = new FormData();
  formData.append(fieldName, captureResult.blob, "webcam-capture.jpg");

  if (additionalFields) {
    for (const [key, value] of Object.entries(additionalFields)) {
      formData.append(key, value);
    }
  }

  return fetch(url, {
    method: "POST",
    body: formData,
  });
}

/**
 * Upload a captured image to a REST endpoint as JSON (base64)
 * @param url - The endpoint URL
 * @param captureResult - Result from captureWebcamScreenshot
 * @param imageField - JSON field name for the image (default: 'image')
 * @param additionalData - Additional JSON data to include
 */
export async function uploadCaptureAsJson(
  url: string,
  captureResult: CaptureResult,
  imageField = "image",
  additionalData?: Record<string, unknown>
): Promise<Response> {
  const payload = {
    [imageField]: captureResult.base64,
    width: captureResult.width,
    height: captureResult.height,
    ...additionalData,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Create a webcam capture service that periodically captures and uploads images
 * @param options - Service configuration
 * @returns WebcamService with start, stop, isRunning, and captureNow methods
 */
export function createWebcamService(
  options: WebcamServiceOptions
): WebcamService {
  const {
    url,
    intervalMs = 120000,
    uploadFormat = "json",
    imageField = "image",
    additionalData,
    onSuccess,
    onError,
    captureOptions,
  } = options;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const captureAndUpload = async (): Promise<void> => {
    try {
      const result = await captureWebcamScreenshot(captureOptions);

      let response: Response;
      if (uploadFormat === "formdata") {
        response = await uploadCaptureAsFormData(
          url,
          result,
          imageField,
          additionalData as Record<string, string> | undefined
        );
      } else {
        response = await uploadCaptureAsJson(
          url,
          result,
          imageField,
          additionalData
        );
      }

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      onSuccess?.(result, response);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const start = (): void => {
    if (running) return;
    running = true;

    // Capture immediately on start
    captureAndUpload();

    // Then capture at the specified interval
    intervalId = setInterval(captureAndUpload, intervalMs);
  };

  const stop = (): void => {
    if (!running) return;
    running = false;

    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const isRunning = (): boolean => running;

  const captureNow = async (): Promise<void> => {
    await captureAndUpload();
  };

  return {
    start,
    stop,
    isRunning,
    captureNow,
  };
}
