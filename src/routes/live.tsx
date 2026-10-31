import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

import {
  FaceDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

import {
  Camera as CameraIcon,
  Maximize2,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";

import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cameras } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { recognitionApi } from "@/api/recognition";
import { LIVENESS_PROMPTS, poseMatches, yawFromKeypoints } from "@/lib/liveness";

const LIVENESS_STEP_TIMEOUT_MS = 8000;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));


export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      {
        title: "Live Recognition — VertexFace AI",
      },
      {
        name: "description",
        content:
          "Monitor live camera streams with real-time face detection, tracking IDs, confidence scores and attendance status.",
      },
      {
        property: "og:title",
        content: "Live Recognition — VertexFace AI",
      },
      {
        property: "og:description",
        content:
          "Real-time face detection and tracking across your camera estate.",
      },
    ],
  }),

  component: LivePage,
});


interface Detection {
  trackId: number;

  name: string;

  confidence: number;

  status: "recognized" | "unknown" | "unauthorized";

  box: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  time: string;
}


const boxTone = {
  recognized:
    "border-success shadow-[0_0_24px_-4px_var(--success)]",

  unknown:
    "border-warning shadow-[0_0_24px_-4px_var(--warning)]",

  unauthorized:
    "border-destructive shadow-[0_0_24px_-4px_var(--destructive)]",
};


function LivePage() {
  const [running, setRunning] = useState(false);
const [faceCenter, setFaceCenter] = useState({
  x: 50,
  y: 50,
});
  const [camera, setCamera] = useState(
    cameras[0]?.name ?? "Camera 1",
  );

  const [detections, setDetections] =
    useState<Detection[]>([]);

  const [log, setLog] =
    useState<Detection[]>([]);

  const [metrics, setMetrics] = useState({
    fps: 24.8,
    detect: 12.4,
    recognize: 31.2,
  });


  const stageRef =
    useRef<HTMLDivElement>(null);

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);


  /*
   * MediaPipe face detector
   */
  const faceDetectorRef =
    useRef<FaceDetector | null>(null);


  /*
   * Face detection interval
   */
  const faceCheckTimerRef =
    useRef<number | null>(null);


  /*
   * Scanner countdown
   */
  const scanTimerRef =
    useRef<number | null>(null);


  /*
   * Prevent multiple API calls
   */
  const recognitionRunningRef =
    useRef(false);


  /*
   * Prevent multiple scan timers
   */
  const scanRunningRef =
    useRef(false);


  /*
   * Last video timestamp
   */
  const lastVideoTimeRef =
    useRef(-1);
const lastRecognitionRef = useRef(0);

  /*
   * Latest head-pose estimate from the face detector,
   * used to guide the liveness (anti-spoofing) challenge.
   */
  const latestYawRef =
    useRef<{ yaw: number | null; at: number }>({ yaw: null, at: 0 });

  const [livenessPrompt, setLivenessPrompt] =
    useState<string | null>(null);

  const [faceDetected, setFaceDetected] =
    useState(false);


  const [recognizing, setRecognizing] =
    useState(false);


  const [scanProgress, setScanProgress] =
    useState(0);


  /*
   * -----------------------------------------
   * INITIALIZE FACE DETECTOR
   * -----------------------------------------
   */

  const initFaceDetector = useCallback(
    async () => {
      if (faceDetectorRef.current) {
        return faceDetectorRef.current;
      }

      /*
       * IMPORTANT:
       * Do not use old 0.10.22 URL.
       *
       * This uses the installed npm package's
       * matching WASM files.
       */

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );


      const detector =
        await FaceDetector.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",

              delegate: "GPU",
            },

            runningMode: "VIDEO",

            minDetectionConfidence: 0.5,

            minSuppressionThreshold: 0.3,
          },
        );


      faceDetectorRef.current = detector;

      return detector;
    },
    [],
  );


  /*
   * -----------------------------------------
   * CLEAR SCAN
   * -----------------------------------------
   */

  const clearScan = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(
        scanTimerRef.current,
      );

      scanTimerRef.current = null;
    }

    scanRunningRef.current = false;

    setRecognizing(false);

    setScanProgress(0);
  }, []);


  /*
   * -----------------------------------------
   * CAPTURE CURRENT CAMERA FRAME
   * -----------------------------------------
   */

  const captureAndRecognize = useCallback(
    
  async (force = false) => {
    if (recognitionRunningRef.current) {
      return;
    }
// recognitionRunningRef.current = true;
// setRecognizing(true);
// setScanProgress(0);
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!force && !faceDetected) {
      clearScan();
      return;
    }

    if (
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      clearScan();
      toast.error("Camera frame is not ready");
      return;
    }

    recognitionRunningRef.current = true;
setRecognizing(true);
setScanProgress(0);

try {
  const canvas = document.createElement("canvas");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not create image canvas");
      }

      const grabFrame = async () => {
        ctx.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.9,
          );
        });

        if (!blob) {
          throw new Error("Could not capture camera image");
        }

        return blob;
      };

      /*
       * LIVENESS (ANTI-SPOOFING)
       *
       * The server issues a random head-turn order.
       * Frames are captured once the person's pose
       * matches each step; the server re-verifies them.
       * A photo or still image cannot turn its head.
       */

      const challenge = await recognitionApi.livenessChallenge();

      const deadline =
        Date.now() + (challenge.expires_in - 5) * 1000;

      const frames: Blob[] = [];

      for (const [i, step] of challenge.steps.entries()) {
        const prompt = LIVENESS_PROMPTS[step] ?? step;

        setLivenessPrompt(prompt);
        setScanProgress(Math.round((i / challenge.steps.length) * 90));

        const stepStart = Date.now();

        while (true) {
          const now = Date.now();

          if (now > deadline || now - stepStart > LIVENESS_STEP_TIMEOUT_MS) {
            throw new Error(`Liveness check timed out. ${prompt} when asked.`);
          }

          const { yaw, at } = latestYawRef.current;

          if (
            yaw !== null &&
            now - at < 500 &&
            poseMatches(step, yaw, challenge.center_max, challenge.turn_min)
          ) {
            break;
          }

          await sleep(100);
        }

        frames.push(await grabFrame());
        await sleep(150);
        frames.push(await grabFrame());
      }

      setLivenessPrompt("Verifying liveness...");
      setScanProgress(95);

      const form = new FormData();

      form.append("challenge_id", challenge.challenge_id);

      frames.forEach((blob, index) => {
        form.append(
          "frames",
          blob,
          `liveness-${index + 1}.jpg`,
        );
      });

      const result = await recognitionApi.recognize(form);

      console.log("Recognition response:", result);

      const apiDetections = Array.isArray(result)
  ? result
  : result?.detections ??
    result?.results ??
    (result?.recognized
      ? [{
          name: result.user?.name,
          confidence: result.similarity,
          status: "recognized"
        }]
      : []);

      const now = new Date().toLocaleTimeString();

      const mapped: Detection[] =
        apiDetections.map(
          (item: any, index: number) => {
            const rawConfidence = Number(
              item?.confidence ??
                item?.score ??
                item?.similarity ??
                0,
            );

            const confidence =
              rawConfidence > 1
                ? rawConfidence / 100
                : rawConfidence;

            const name =
              item?.name ??
              item?.person_name ??
              item?.employee_name ??
              "Unknown Face";

            const status =
              item?.status === "unauthorized"
                ? "unauthorized"
                : item?.status === "recognized" ||
                    Boolean(
                      item?.name ||
                        item?.person_name ||
                        item?.employee_name,
                    )
                  ? "recognized"
                  : "unknown";

            return {
              trackId:
                Number(
                  item?.trackId ??
                    item?.track_id ??
                    item?.id,
                ) || index + 1,

              name,

              confidence: Math.max(
                0,
                Math.min(1, confidence),
              ),

              status,
box: {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
},
              

              time: now,
            };
          },
        );

      setDetections(mapped);

      if (mapped.length > 0) {
        setLog((prev) =>
          [...mapped, ...prev].slice(0, 30),
        );

        if (mapped[0]?.status === "recognized") {
          toast.success(
            `${mapped[0].name} recognized`,
            {
              description: `Confidence: ${(
                mapped[0].confidence * 100
              ).toFixed(1)}%`,
            },
          );
        } else {
          toast.warning("Face detected but not recognized");
        }
      } else {
        setDetections([]);

        toast.info(
          "Face could not be recognized",
        );
      }

      setScanProgress(100);

      await new Promise((resolve) =>
        window.setTimeout(resolve, 350),
      );

      clearScan();
    } catch (err: any) {
      console.error(
        "Recognition error:",
        err,
      );

      const detail =
        err?.response?.data?.detail;

      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail
                .map((x: any) => x?.msg)
                .filter(Boolean)
                .join(", ")
            : err?.response?.data?.message ??
              (err?.response ? undefined : err?.message) ??
              "Face recognition failed";

      toast.error(message);

      setDetections([]);
      clearScan();
    } finally {
      recognitionRunningRef.current = false;
      setRecognizing(false);
      setLivenessPrompt(null);
    }
  },
  [clearScan, faceDetected],
);


  /*
   * -----------------------------------------
   * START SCANNER
   * -----------------------------------------
   */

  const startScanCountdown =
    useCallback(() => {
      /*
       * Already scanning?
       */

      if (
        scanRunningRef.current ||
        recognitionRunningRef.current
      ) {
        return;
      }


      /*
       * No face = don't scan
       */

      if (!faceDetected) {
        return;
      }


      scanRunningRef.current = true;


      setRecognizing(true);

      setScanProgress(0);


      let progress = 0;


      /*
       * 2 seconds total
       *
       * 5% every 100ms
       */

      scanTimerRef.current =
        window.setInterval(() => {
          /*
           * If face disappears
           * during scanning,
           * cancel scanner.
           */

          if (!faceDetected) {
            clearScan();

            return;
          }


          progress += 5;


          setScanProgress(
            Math.min(
              progress,
              100,
            ),
          );


          /*
           * 100%
           */

          if (progress >= 100) {
            if (
              scanTimerRef.current !==
              null
            ) {
              window.clearInterval(
                scanTimerRef.current,
              );

              scanTimerRef.current =
                null;
            }


            scanRunningRef.current =
              false;


            /*
             * NOW call API
             */

            void captureAndRecognize();
          }
        }, 100);
    }, [
      captureAndRecognize,
      clearScan,
      faceDetected,
    ]);


  /*
   * -----------------------------------------
   * FACE DETECTION
   * -----------------------------------------
   */

  const checkForFace =
    useCallback(async () => {
      const video =
        videoRef.current;

      const detector =
        faceDetectorRef.current;


      /*
       * Camera/detector not ready
       */

      if (
        !video ||
        !detector ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }


      /*
       * Avoid detecting same video frame
       */

      if (
        video.currentTime ===
        lastVideoTimeRef.current
      ) {
        return;
      }


      lastVideoTimeRef.current =
        video.currentTime;


      try {
        /*
         * MediaPipe video detection
         */

        const result =
          detector.detectForVideo(
            video,
            performance.now(),
          );


        const hasFace = result.detections.length >0;
      const detection = result.detections[0];

      latestYawRef.current = {
        yaw: result.detections.length === 1
          ? yawFromKeypoints(detection?.keypoints)
          : null,
        at: Date.now(),
      };

if (detection?.boundingBox && video.videoWidth && video.videoHeight) {
  const box = detection.boundingBox;

  setFaceCenter({
    x: ((box.originX + box.width / 2) / video.videoWidth) * 100,
    y: ((box.originY + box.height / 2) / video.videoHeight) * 100,
  });
}


        /*
         * FACE NOT PRESENT
         */

        if (!hasFace) {
          setFaceDetected(false);

          /*
           * If face disappears,
           * cancel scanner.
           */

          if (
            scanRunningRef.current
          ) {
            clearScan();
          }


          /*
           * Clear old boxes
           */

          if (
            !recognitionRunningRef.current
          ) {
            setDetections([]);
          }


          return;
        }


        /*
         * FACE PRESENT
         */

        setFaceDetected(true);


        /*
         * Face appeared for first time
         *
         * Start scanner.
         */

        const now = Date.now();

// 10 sec cooldown
if (
  !recognitionRunningRef.current &&
  now - lastRecognitionRef.current >= 15000
) {
  lastRecognitionRef.current = now;
  void captureAndRecognize(true);
}
      } catch (err) {
        console.error(
          "Face detection error:",
          err,
        );
      }
    }, [
      clearScan,
      startScanCountdown,
    ]);


  /*
   * -----------------------------------------
   * START CAMERA
   * -----------------------------------------
   */

  const startCamera =
    useCallback(async () => {
      try {
        /*
         * Already running
         */

        if (streamRef.current) {
          return;
        }


        /*
         * First load detector
         */

        toast.info(
          "Loading face detector...",
        );


        await initFaceDetector();


        /*
         * Ask camera permission
         */

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: "user",
              },

              audio: false,
            },
          );


        streamRef.current =
          stream;


        /*
         * Put stream into video
         */

        const video =
          videoRef.current;


        if (!video) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop(),
            );

          streamRef.current = null;

          return;
        }


        video.srcObject =
          stream;


        await video.play();


        /*
         * Reset state
         */

        setRunning(true);

        setFaceDetected(false);

        setRecognizing(false);

        setScanProgress(0);

        setDetections([]);


        lastVideoTimeRef.current =
          -1;


        /*
         * Start face detection
         */

        faceCheckTimerRef.current =
          window.setInterval(() => {
            void checkForFace();
          }, 150);


        toast.success(
          "Camera started",
        );
      } catch (err: any) {
        console.error(
          "Camera start error:",
          err,
        );


        /*
         * Cleanup if something failed
         */

        streamRef.current
          ?.getTracks()
          .forEach((track) =>
            track.stop(),
          );


        streamRef.current =
          null;


        setRunning(false);


        const message =
          err?.name ===
          "NotAllowedError"
            ? "Camera permission denied"
            : err?.message ??
              "Camera could not be started";


        toast.error(message);
      }
    }, [
      checkForFace,
      initFaceDetector,
    ]);


  /*
   * -----------------------------------------
   * STOP CAMERA
   * -----------------------------------------
   */

  const stopCamera =
    useCallback(() => {
      /*
       * Stop camera tracks
       */

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );


      streamRef.current =
        null;


      /*
       * Remove video source
       */

      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }


      /*
       * Stop detection timer
       */

      if (
        faceCheckTimerRef.current !==
        null
      ) {
        window.clearInterval(
          faceCheckTimerRef.current,
        );

        faceCheckTimerRef.current =
          null;
      }


      /*
       * Stop scanner
       */

      clearScan();


      /*
       * Reset everything
       */

      recognitionRunningRef.current =
        false;

      setRunning(false);

      setFaceDetected(false);

      setRecognizing(false);

      setScanProgress(0);

      setDetections([]);

      lastVideoTimeRef.current =
        -1;


      toast.info(
        "Camera stopped",
      );
    }, [
      clearScan,
    ]);


  /*
   * -----------------------------------------
   * CLEANUP ON PAGE UNMOUNT
   * -----------------------------------------
   */

  useEffect(() => {
    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );


      if (
        faceCheckTimerRef.current !==
        null
      ) {
        window.clearInterval(
          faceCheckTimerRef.current,
        );
      }


      if (
        scanTimerRef.current !==
        null
      ) {
        window.clearInterval(
          scanTimerRef.current,
        );
      }
    };
  }, []);


  /*
   * -----------------------------------------
   * LOG DATA
   * -----------------------------------------
   */

  const recognized =
    log.filter(
      (d) =>
        d.status ===
        "recognized",
    );


  const unknown =
    log.filter(
      (d) =>
        d.status !==
        "recognized",
    );


  /*
   * -----------------------------------------
   * UI
   * -----------------------------------------
   */

  return (
    <DashboardLayout
      title="Live Recognition"
      description="Real-time detection, tracking and identification across connected RTSP streams."
      breadcrumbs={[
        {
          label:
            "Live Recognition",
        },
      ]}
      actions={
        <Select
          value={camera}
          onValueChange={
            setCamera
          }
        >
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {cameras.map((c) => (
              <SelectItem
                key={c.id}
                value={c.name}
              >
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">

        {/* ========================================= */}
        {/* CAMERA CARD */}
        {/* ========================================= */}

        <Card className="glass-panel overflow-hidden p-0">

          <div
            ref={stageRef}
            className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-[oklch(0.18_0.02_258)]"
          >

            {/* CAMERA */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />


            {/* DARK OVERLAY */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent,oklch(0.12_0.02_258/0.75))]" />


            {/* ===================================== */}
            {/* SCANNER */}
            {/* ===================================== */}

            {running && faceDetected && recognizing && (
  <div className="absolute inset-0 z-20 pointer-events-none">
    <div
      className="absolute"
      style={{
        left: `${faceCenter.x}%`,
        top: `${faceCenter.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative w-48 h-48">

        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "linear",
          }}
          className="absolute inset-0 rounded-full border border-cyan-400/30"
        />

        {/* Dots */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const radius = 86;

          const x = 96 + Math.cos(angle - Math.PI / 2) * radius;
          const y = 96 + Math.sin(angle - Math.PI / 2) * radius;

          const active =
            i < Math.ceil((scanProgress / 100) * 40);

          return (
            <motion.div
              key={i}
              animate={{
                opacity: active ? 1 : 0.15,
                scale: active ? 1.4 : 0.8,
              }}
              className="absolute rounded-full"
              style={{
                left: x,
                top: y,
                width: 8,
                height: 8,
                marginLeft: -4,
                marginTop: -4,
                background: "#E0F7FF",
                boxShadow: active
                  ? "0 0 8px #67e8f9,0 0 18px #67e8f9"
                  : "none",
              }}
            />
          );
        })}

        {/* Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border border-cyan-400/30" />

          <div className="absolute w-10 h-px bg-cyan-400/60" />
          <div className="absolute h-10 w-px bg-cyan-400/60" />
        </div>

        {/* Percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl font-bold text-white">
              {scanProgress}
            </p>
            <p className="text-xs tracking-[0.3em] text-cyan-300">
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}


            {/* ===================================== */}
            {/* STATUS */}
            {/* ===================================== */}

            {running && (
              <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white backdrop-blur">

                {livenessPrompt
                  ? livenessPrompt
                  : recognizing
                  ? `Scanning face... ${scanProgress}%`
                  : faceDetected
                    ? "Face detected"
                    : "Waiting for face..."}

              </div>
            )}


            {/* ===================================== */}
            {/* LIVE */}
            {/* ===================================== */}

            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">

              <span
                className={cn(
                  "size-2 rounded-full",

                  running
                    ? "animate-pulse bg-red-500"
                    : "bg-white/40",
                )}
              />

              {running
                ? "LIVE"
                : "PAUSED"}

              {" · "}

              {camera}

            </div>


            {/* ===================================== */}
            {/* FPS */}
            {/* ===================================== */}

            <div className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 font-mono text-xs text-white backdrop-blur">

              {metrics.fps.toFixed(
                1,
              )}{" "}
              FPS

            </div>


            
            

          </div>


          {/* ===================================== */}
          {/* BUTTONS */}
          {/* ===================================== */}

          <CardContent className="flex flex-wrap gap-2 p-4">

            <Button
              onClick={
                startCamera
              }
              disabled={running}
            >
              <Play className="mr-2 size-4" />

              Start Camera
            </Button>


            <Button
              variant="outline"
              onClick={
                stopCamera
              }
              disabled={!running}
            >
              <Square className="mr-2 size-4" />

              Stop Camera
            </Button>


            <Button
              variant="outline"
              onClick={() =>
                toast.success(
                  "Stream reconnected",
                  {
                    description:
                      camera,
                  },
                )
              }
            >
              <RefreshCw className="mr-2 size-4" />

              Reconnect
            </Button>


            <Button
              variant="outline"
              onClick={() =>
                stageRef.current?.requestFullscreen?.()
              }
            >
              <Maximize2 className="mr-2 size-4" />

              Fullscreen
            </Button>


            <Button
  variant="secondary"
  onClick={() => {
    if (!running) {
      toast.error("Please start the camera first");
      return;
    }

    void captureAndRecognize(true);
  }}
  disabled={!running || recognizing}
>
  <CameraIcon className="mr-2 size-4" />
  Snapshot
</Button>

          </CardContent>

        </Card>


        {/* ========================================= */}
        {/* RIGHT PANEL */}
        {/* ========================================= */}

        <div className="space-y-4">

          {/* METRICS */}

          <Card className="glass-panel">

            <CardHeader className="pb-3">

              <CardTitle className="text-base">
                Pipeline Metrics
              </CardTitle>

            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-2 text-sm">

              <Metric
                label="Current FPS"
                value={metrics.fps.toFixed(
                  1,
                )}
              />

              <Metric
                label="Detection"
                value={`${metrics.detect.toFixed(
                  1,
                )} ms`}
              />

              <Metric
                label="Recognition"
                value={`${metrics.recognize.toFixed(
                  1,
                )} ms`}
              />

              <Metric
                label="Track count"
                value={String(
                  detections.length,
                )}
              />

            </CardContent>

          </Card>


          {/* RECOGNIZED */}

          <Card className="glass-panel">

            <CardHeader className="pb-3">

              <CardTitle className="text-base">
                Live Recognized People
              </CardTitle>

              <CardDescription>
                {recognized.length} in current window
              </CardDescription>

            </CardHeader>

            <CardContent className="max-h-64 space-y-2 overflow-y-auto">

              <AnimatePresence initial={false}>

                {recognized.map(
                  (d) => (
                    <motion.div
                      key={
                        `${d.trackId}-${d.time}`
                      }
                      layout
                      initial={{
                        opacity: 0,
                        y: -6,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2 text-sm"
                    >

                      <div>

                        <p className="font-medium">
                          {d.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {d.time} · ID{" "}
                          {d.trackId}
                        </p>

                      </div>

                      <span className="text-xs font-semibold text-success">
                        {(
                          d.confidence *
                          100
                        ).toFixed(
                          0,
                        )}
                        %
                      </span>

                    </motion.div>
                  ),
                )}

              </AnimatePresence>

            </CardContent>

          </Card>


          {/* UNKNOWN */}

          <Card className="glass-panel">

            <CardHeader className="pb-3">

              <CardTitle className="text-base">
                Unknown / Flagged
              </CardTitle>

              <CardDescription>
                {unknown.length} require review
              </CardDescription>

            </CardHeader>

            <CardContent className="max-h-56 space-y-2 overflow-y-auto">

              {unknown.map(
                (d) => (
                  <div
                    key={`${d.trackId}-${d.time}`}
                    className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2 text-sm"
                  >

                    <div>

                      <p className="font-medium">
                        {d.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {d.time}
                      </p>

                    </div>

                    <StatusBadge
                      status={
                        d.status
                      }
                    />

                  </div>
                ),
              )}

            </CardContent>

          </Card>

        </div>

      </div>
    </DashboardLayout>
  );
}


/*
 * -----------------------------------------
 * METRIC COMPONENT
 * -----------------------------------------
 */

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">

      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value}
      </p>

    </div>
  );
}
