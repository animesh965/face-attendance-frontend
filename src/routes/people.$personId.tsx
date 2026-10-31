import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, Phone, IdCard, Calendar, Cpu, Layers } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { employeesApi } from "@/api/employees";

export const Route = createFileRoute("/people/$personId")({
  head: () => ({
    meta: [
      { title: "Person Profile — VertexFace AI" },
      {
        name: "description",
        content: "Detailed identity profile with face image gallery and embedding metadata.",
      },
    ],
  }),
  component: PersonDetailPage,
});

function PersonDetailPage() {
  const { personId } = Route.useParams();
  const { data: person } = useQuery({
    queryKey: ["employee", personId],
    queryFn: () => employeesApi.get(personId),
  });
  const [preview, setPreview] = useState<string | null>(null);

  if (!person) return null;

  return (
    <DashboardLayout
      title={person.name}
      description={`${person.designation || "N/A"} · ${person.department || "N/A"}`}
      breadcrumbs={[{ label: "Employee Records" }, { label: person.name }]}
      actions={
        <Button variant="outline" asChild>
          <Link to="/people">
            <ArrowLeft className="mr-2 size-4" /> Back to All Records
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Profile Summary Card */}
        <Card className="glass-panel h-fit shadow-sm">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <Avatar className="size-28 border-4 border-primary/20 shadow-md">
              <AvatarImage src={person.photo} alt={person.name} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {person.name ? person.name.slice(0, 2).toUpperCase() : "EM"}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold text-foreground">{person.name}</h2>
            <p className="text-sm text-muted-foreground capitalize">{person.designation || "N/A"}</p>
            <div className="mt-3">
              <StatusBadge status={person.status || "active"} />
            </div>
            
            <div className="mt-6 w-full space-y-2.5 text-left text-sm">
              <Info icon={IdCard} label={person.employeeId || person.id} />
              <Info icon={Building2} label={person.department || "N/A"} />
              <Info icon={Mail} label={person.email || "N/A"} />
              <Info icon={Phone} label={person.phone || "No phone number added"} />
            </div>
          </CardContent>
        </Card>

        {/* Right Details Section (Face Gallery & Embeddings) */}
        <div className="space-y-6">
          {/* Face Images Gallery */}
          <Card className="glass-panel shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Face Images Gallery</CardTitle>
              <CardDescription>Reference frames used for biometric embedding generation</CardDescription>
            </CardHeader>
            <CardContent>
              {person.faceImages && person.faceImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {person.faceImages.map((src: string, i: number) => (
                    <button
                      key={src}
                      onClick={() => setPreview(src)}
                      className="card-hover aspect-square overflow-hidden rounded-xl border bg-accent/45 transition-transform hover:scale-105"
                    >
                      <img src={src} alt={`${person.name} reference ${i + 1}`} className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-xl bg-accent/20">
                  <p className="text-sm text-muted-foreground">No reference face images uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Embedding & AI Model Metadata */}
          <Card className="glass-panel shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Embedding & AI Metadata</CardTitle>
              <CardDescription>Model: {person.embedding?.model || "buffalo_l"}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Metric icon={Cpu} label="Dimensions" value={`${person.embedding?.dimensions || 512}-D`} />
              <Metric icon={Layers} label="Stored Vectors" value={String(person.embedding?.vectors || 0)} />
              <Metric icon={Calendar} label="Enrolled Date" value={person.registeredAt ? new Date(person.registeredAt).toLocaleDateString() : "N/A"} />
              
              <div className="sm:col-span-3 pt-2">
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
                  <span>Embedding Quality Score</span>
                  <span>{person.embedding?.quality || 0}%</span>
                </div>
                <Progress value={person.embedding?.quality || 0} className="h-2 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md p-4">
          {preview && <img src={preview} alt="Face reference preview" className="w-full rounded-xl shadow-lg" />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Info({ icon: Icon, label }: { icon: typeof Mail; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-background/60 px-3.5 py-2.5 shadow-xs">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="truncate text-foreground font-medium">{label}</span>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 p-3.5 shadow-xs flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}


// import { useState } from "react";
// import { createFileRoute, Link } from "@tanstack/react-router";
// import { useQuery } from "@tanstack/react-query";
// import { ArrowLeft, Building2, Mail, Phone, IdCard } from "lucide-react";
// import { DashboardLayout } from "@/components/layout/DashboardLayout";
// import { StatusBadge } from "@/components/dashboard/StatusBadge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import { Progress } from "@/components/ui/progress";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { employeesApi } from "@/api/employees";
// import { attendance } from "@/lib/mock-data";

// export const Route = createFileRoute("/people/$personId")({
//   head: () => ({
//     meta: [
//       { title: "Person Profile — VertexFace AI" },
//       {
//         name: "description",
//         content: "Detailed identity profile with face image gallery, embedding metadata and attendance history.",
//       },
//       { property: "og:title", content: "Person Profile — VertexFace AI" },
//       { property: "og:description", content: "Face gallery, embedding metadata and attendance history." },
//     ],
//   }),
//   component: PersonDetailPage,
// });

// function PersonDetailPage() {
//   const { personId } = Route.useParams();
//   const { data: person } = useQuery({
//     queryKey: ["employee", personId],
//     queryFn: () => employeesApi.get(personId),
//   });
//   const [preview, setPreview] = useState<string | null>(null);

//   if (!person) return null;
//   const history = attendance.slice(0, 6);

//   return (
//     <DashboardLayout
//       title={person.name}
//       description={`${person.designation} · ${person.department}`}
//       breadcrumbs={[{ label: "Employee Records" }, { label: person.name }]}
//       actions={
//         <Button variant="outline" asChild>
//           <Link to="/people">
//             <ArrowLeft className="mr-2 size-4" /> Back to All Records
//           </Link>
//         </Button>
//       }
//     >
//       <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
//         <Card className="glass-panel h-fit">
//           <CardContent className="flex flex-col items-center pt-6 text-center">
//             <Avatar className="size-24 border-4 border-primary/20">
//               <AvatarImage src={person.photo} alt={person.name} />
//               <AvatarFallback>{person.name.slice(0, 2)}</AvatarFallback>
//             </Avatar>
//             <h2 className="mt-4 text-lg font-semibold">{person.name}</h2>
//             <p className="text-sm text-muted-foreground">{person.designation}</p>
//             <div className="mt-3">
//               <StatusBadge status={person.status} />
//             </div>
//             <div className="mt-6 w-full space-y-2 text-left text-sm"> 
//               <Info icon={IdCard} label={person.employeeId} />
//               <Info icon={Building2} label={person.department} />
//               <Info icon={Mail} label={person.email} />
//               <Info icon={Phone} label={person.phone} />
//             </div>
//           </CardContent>
//         </Card>

//         <div className="space-y-4">
//           <Card className="glass-panel">
//             <CardHeader>
//               <CardTitle>Face Images</CardTitle>
//               <CardDescription>Reference frames used for embedding generation</CardDescription>
//             </CardHeader>
//             <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//               {person.faceImages.map((src, i) => (
//                 <button
//                   key={src}
//                   onClick={() => setPreview(src)}
//                   className="card-hover aspect-square overflow-hidden rounded-xl border bg-accent/40"
//                 >
//                   <img src={src} alt={`${person.name} reference ${i + 1}`} className="size-full object-cover" />
//                 </button> 
//               ))}
//             </CardContent>
//           </Card>

//           <Card className="glass-panel">
//             <CardHeader>
//               <CardTitle>Embedding Information</CardTitle>
//               <CardDescription>{person.embedding.model}</CardDescription>
//             </CardHeader>
//             <CardContent className="grid gap-4 sm:grid-cols-3">
//               <Metric label="Dimensions" value={`${person.embedding.dimensions}-D`} />
//               <Metric label="Stored vectors" value={String(person.embedding.vectors)} />
//               <Metric label="Enrolled" value={new Date(person.registeredAt).toLocaleDateString()} />
//               <div className="sm:col-span-3">
//                 <div className="flex justify-between text-xs text-muted-foreground">
//                   <span>Embedding quality</span>
//                   <span>{person.embedding.quality}%</span>
//                 </div>
//                 <Progress value={person.embedding.quality} className="mt-2" />
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="glass-panel">
//             <CardHeader>
//               <CardTitle>Attendance History</CardTitle>
//             </CardHeader>
//             <CardContent className="overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Date</TableHead>
//                     <TableHead>Check In</TableHead>
//                     <TableHead>Check Out</TableHead>
//                     <TableHead>Hours</TableHead>
//                     <TableHead className="text-right">Status</TableHead>
//                   </TableRow>
//                 </TableHeader> 
//                 <TableBody>
//                   {history.map((r) => (
//                     <TableRow key={r.id}>
//                       <TableCell>{r.date}</TableCell>
//                       <TableCell className="tabular-nums">{r.checkIn}</TableCell>
//                       <TableCell className="tabular-nums">{r.checkOut}</TableCell>
//                       <TableCell className="tabular-nums">{r.workingHours}</TableCell>
//                       <TableCell className="text-right">
//                         <StatusBadge status={r.status} />
//                       </TableCell>
//                     </TableRow>
//                   ))} 
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </div>
//       </div>

//       <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
//         <DialogContent className="max-w-md">
//           {preview && <img src={preview} alt="Face reference preview" className="w-full rounded-xl" />}
//         </DialogContent>
//       </Dialog>
//     </DashboardLayout>
//   );
// }

// function Info({ icon: Icon, label }: { icon: typeof Mail; label: string }) {
//   return (
//     <div className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2">
//       <Icon className="size-4 text-muted-foreground" />
//       <span className="truncate">{label}</span>
//     </div>
//   );
// }

// function Metric({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="rounded-xl border bg-background/60 p-3">
//       <p className="text-xs text-muted-foreground">{label}</p>
//       <p className="mt-1 font-semibold">{value}</p>
//     </div>
//   );
// }