import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Eye, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FaceScanScene } from "@/components/three/FaceScanScene";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { camerasApi } from "@/api/cameras";
import type { Camera } from "@/types";

export const Route = createFileRoute("/cameras")({
  head: () => ({
    meta: [
      { title: "Cameras — VertexFace AI" },
      {
        name: "description",
        content: "Manage RTSP camera endpoints, monitor stream health, resolution and frame rate across every zone.",
      },
      { property: "og:title", content: "Cameras — VertexFace AI" },
      { property: "og:description", content: "RTSP camera fleet management and stream health." },
    ],
  }),
  component: CamerasPage,
});

function CamerasPage() {
  const { data } = useQuery({ queryKey: ["cameras"], queryFn: camerasApi.list });
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<Camera | null>(null);

  return (
    <DashboardLayout
      title="Cameras"
      description="RTSP endpoints, stream health and inference assignment for every zone."
      breadcrumbs={[{ label: "Cameras" }]}
      actions={
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" /> Add camera
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((cam, i) => (
          <motion.div
            key={cam.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass-panel card-hover overflow-hidden p-0">
              <div className="relative h-36 bg-[oklch(0.2_0.02_258)]">
                <FaceScanScene className="absolute inset-0 opacity-60" />
                <div className="absolute top-3 left-3 rounded-full bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
                  {cam.id}
                </div>
                <div className="absolute right-3 bottom-3">
                  <StatusBadge status={cam.status} />
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="size-4 text-primary" /> {cam.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <p className="truncate rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  {cam.rtspUrl}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{cam.location}</span>
                  <span>
                    {cam.resolution} · {cam.fps} FPS
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreview(cam)}>
                    <Eye className="mr-1.5 size-3.5" /> Preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Edit camera", { description: cam.name })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success("Camera removed", { description: cam.name })}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add camera</DialogTitle>
            <DialogDescription>Register a new RTSP stream with the inference engine.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cam-name">Camera name</Label>
              <Input id="cam-name" placeholder="North Gate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cam-url">RTSP URL</Label>
              <Input id="cam-url" placeholder="rtsp://10.0.4.20:554/stream1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cam-res">Resolution</Label>
                <Input id="cam-res" placeholder="1920x1080" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cam-fps">FPS</Label>
                <Input id="cam-fps" type="number" placeholder="25" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAddOpen(false);
                toast.success("Camera added", { description: "Stream is being validated." });
              }}
            >
              Add camera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{preview?.rtspUrl}</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[oklch(0.18_0.02_258)]">
            <FaceScanScene className="absolute inset-0" />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}