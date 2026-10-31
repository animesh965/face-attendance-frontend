import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Moon, Plus, Save, Sun, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VertexFace AI" },
      {
        name: "description",
        content: "Tune face match thresholds, RTSP timeouts, attendance rules, appearance and admin user access.",
      },
      { property: "og:title", content: "Settings — VertexFace AI" },
      { property: "og:description", content: "Recognition thresholds, attendance rules and admin access." },
    ],
  }),
  component: SettingsPage,
});

// const ADMINS = [
//   { name: "Aarav Mehta", email: "aarav@vertexface.ai", role: "Super Admin" },
//   { name: "Riya Kapoor", email: "riya@vertexface.ai", role: "Operator" },
//   { name: "Daniel Cruz", email: "daniel@vertexface.ai", role: "Auditor" },
// ];

function SettingsPage() {
  const { settings, updateSettings, darkMode, toggleDarkMode } = useAppStore();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      apiBaseUrl: settings.apiBaseUrl,
      workStart: settings.workStart,
      lateAfter: settings.lateAfter,
    },
  });

  return (
    <DashboardLayout
      title="Settings"
      description="System configuration for recognition thresholds, streaming and access control."
      breadcrumbs={[{ label: "Settings" }]}
    >
      <Tabs defaultValue="recognition" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          {/* <TabsTrigger value="admins">Admin Users</TabsTrigger> */}
        </TabsList>

        <TabsContent value="recognition">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Recognition Engine</CardTitle>
              <CardDescription>Thresholds applied to every inference request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm">
                  <Label>Face match threshold</Label>
                  <span className="tabular-nums text-muted-foreground">{settings.faceMatchThreshold.toFixed(2)}</span>
                </div>
                <Slider
                  className="mt-3"
                  min={0.3}
                  max={0.95}
                  step={0.01}
                  value={[settings.faceMatchThreshold]}
                  onValueChange={(v) => updateSettings({ faceMatchThreshold: v[0] ?? 0.62 })}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <Label>Detection confidence</Label>
                  <span className="tabular-nums text-muted-foreground">{settings.detectionConfidence.toFixed(2)}</span>
                </div>
                <Slider
                  className="mt-3"
                  min={0.3}
                  max={0.99}
                  step={0.01}
                  value={[settings.detectionConfidence]}
                  onValueChange={(v) => updateSettings({ detectionConfidence: v[0] ?? 0.85 })}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <Label>RTSP timeout (seconds)</Label>
                  <span className="tabular-nums text-muted-foreground">{settings.rtspTimeout}s</span>
                </div>
                <Slider
                  className="mt-3"
                  min={5}
                  max={60}
                  step={1}
                  value={[settings.rtspTimeout]}
                  onValueChange={(v) => updateSettings({ rtspTimeout: v[0] ?? 15 })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="text-sm font-medium">Liveness / anti-spoofing</p>
                  <p className="text-xs text-muted-foreground">Reject printed photos and screen replays</p>
                </div>
                <Switch
                  checked={settings.livenessCheck}
                  onCheckedChange={(v) => updateSettings({ livenessCheck: v })}
                />
              </div>
              {/* <div className="space-y-2">
                <Label htmlFor="api-url">FastAPI base URL</Label>
                <Input id="api-url" {...register("apiBaseUrl")} />
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Attendance Rules</CardTitle>
              <CardDescription>How recognition events convert into attendance records</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="work-start">Work start time</Label>
                <Input id="work-start" type="time" {...register("workStart")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="late-after">Mark late after</Label>
                <Input id="late-after" type="time" {...register("lateAfter")} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Auto check-out at end of shift</p>
                  <p className="text-xs text-muted-foreground">Close open records automatically at 20:00</p>
                </div>
                <Switch
                  checked={settings.autoCheckout}
                  onCheckedChange={(v) => updateSettings({ autoCheckout: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Console theme preference</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  <div>
                    <p className="text-sm font-medium">Dark mode</p>
                    <p className="text-xs text-muted-foreground">Optimised for control-room displays</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card className="glass-panel">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              {/* <div>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Console access and role assignment</CardDescription>
              </div> */}
              <Button size="sm" onClick={() => toast.info("Invite admin")}>
                <Plus className="mr-1.5 size-4" /> Invite
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                {/* <TableBody>
                  {ADMINS.map((a) => (
                    <TableRow key={a.email}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{a.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => toast.success("Access revoked")}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody> */}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit((values) => {
            updateSettings(values);
            toast.success("Settings saved");
          })}
        >
          <Save className="mr-2 size-4" /> Save changes
        </Button>
      </div>
    </DashboardLayout>
  );
}