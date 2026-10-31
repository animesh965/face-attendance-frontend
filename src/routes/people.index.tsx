import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Eye, Pencil, Search, Trash2, UserPlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription, 
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { employeesApi, type Employee } from "@/api/employees"; // Single source of truth for Employee type

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "Employee Records — VertexFace AI" },
      {
        name: "description", 
        content: "Search, filter and manage every enrolled person, their departments, face embeddings and enrollment status.",
      },
      { property: "og:title", content: "Employee Records — VertexFace AI" },
      { property: "og:description", content: "Manage enrolled people and their face embeddings." },
    ],
  }),
  component: PeoplePage,
});

const PAGE_SIZE = 8;

function PeoplePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetching Employees from Real API
  const { data, isLoading, isError, error, refetch } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: employeesApi.list,
  });

  // 2. Delete Employee Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      toast.success("Employee record deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setPendingDelete(null);
    },
    onError: (err: any) => {
      toast.error("Failed to delete employee", {
        description: err?.response?.data?.detail || err.message || "An error occurred",
      });
      setPendingDelete(null);
    },
  });

  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Extract unique departments dynamically
  const departments = useMemo(() => {
    if (!data) return [];
    return Array.from(
      new Set(data.map((p) => p.department).filter((d): d is string => Boolean(d)))
    );
  }, [data]);

  // Filter & Search Logic
  const filtered = useMemo(() => {
    const list = data ?? [];
    const rows = list.filter((p) => {
      const matchDept = dept === "all" || p.department?.toLowerCase() === dept.toLowerCase();
      const matchQuery =
        (p.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.employeeId || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.email || "").toLowerCase().includes(query.toLowerCase());
      return matchDept && matchQuery;
    });

    return [...rows].sort((a, b) => {
      const nameA = a.name || ""; 
      const nameB = b.name || "";
      return (asc ? 1 : -1) * nameA.localeCompare(nameB);
    });
  }, [data, query, dept, asc]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DashboardLayout
      title="Employee Records"
      description="Every enrolled identity, embedding quality and enrollment status in one registry."
      breadcrumbs={[{ label: "Employee Records" }]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh Data">
            <RefreshCw className="size-4" />
          </Button>
          <Button asChild>
            <Link to="/register">
              <UserPlus className="mr-2 size-4" /> Register person
            </Link>
          </Button>
        </div>
      }
    >
      <Card className="glass-panel">
        <CardContent className="space-y-4 pt-6">
          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, employee ID or email"
                className="pl-9"
              />
            </div>
            
            <Select
              value={dept}
              onValueChange={(v) => {
                setDept(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setAsc((a) => !a)}>
              <ArrowUpDown className="mr-2 size-4" /> {asc ? "A–Z" : "Z–A"}
            </Button>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              <p className="font-semibold">Failed to load employee records from API.</p>
              <p className="text-xs text-muted-foreground mt-1">{(error as Error)?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Registered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No employee records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 border">
                              <AvatarImage src={p.photo} alt={p.name} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {p.name ? p.name.slice(0, 2).toUpperCase() : "EM"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{p.name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground capitalize">{p.designation || "N/A"}</p>
                            </div> 
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.employeeId || p.id}</TableCell>
                        <TableCell className="capitalize">{p.department || "N/A"}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{p.email || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status || "active"} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate({ to: "/people/$personId", params: { personId: p.id } })}
                              title="View Details"
                            >
                              <Eye className="size-4" />
                            </Button>
                        
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                navigate({ to: "/updateEmployee" })
                              }
                              title="Edit Employee Details"
                            >
                              <Pencil className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(p.id)}
                              title="Delete Record"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Showing {rows.length} of {filtered.length} people
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button> 
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this person?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the identity record and all stored face embeddings from the server. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pendingDelete) {
                  deleteMutation.mutate(pendingDelete);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// import { useMemo, useState } from "react";
// import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
// import { useQuery } from "@tanstack/react-query";
// import { ArrowUpDown, Eye, Pencil, Search, Trash2, UserPlus } from "lucide-react";
// import { toast } from "sonner";
// import { DashboardLayout } from "@/components/layout/DashboardLayout";
// import { StatusBadge } from "@/components/dashboard/StatusBadge";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Skeleton } from "@/components/ui/skeleton";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription, 
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { employeesApi } from "@/api/employees";

// export const Route = createFileRoute("/people/")({
//   head: () => ({
//     meta: [
//       { title: "Employee Records — VertexFace AI" },
//       {
//         name: "description", 
//         content: "Search, filter and manage every enrolled person, their departments, face embeddings and enrollment status.",
//       },
//       { property: "og:title", content: "Employee Records — VertexFace AI" },
//       { property: "og:description", content: "Manage enrolled people and their face embeddings." },
//     ],
//   }),
//   component: PeoplePage,
// });

// const PAGE_SIZE = 8;

// function PeoplePage() {
//   const navigate = useNavigate();
//   const { data, isLoading } = useQuery({ queryKey: ["employees"], queryFn: employeesApi.list });
//   const [query, setQuery] = useState("");
//   const [dept, setDept] = useState("all");
//   const [asc, setAsc] = useState(true);
//   const [page, setPage] = useState(1);
//   const [pendingDelete, setPendingDelete] = useState<string | null>(null);

//   const departments = useMemo(
//     () => Array.from(new Set((data ?? []).map((p) => p.department))),
//     [data],
//   );

//   const filtered = useMemo(() => {
//     const rows = (data ?? []).filter(
//       (p) =>
//         (dept === "all" || p.department === dept) &&
//         (p.name.toLowerCase().includes(query.toLowerCase()) ||
//           p.employeeId.toLowerCase().includes(query.toLowerCase()) ||
//           p.email.toLowerCase().includes(query.toLowerCase())),
//     );
//     return [...rows].sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
//   }, [data, query, dept, asc]);

//   const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   return (
//     <DashboardLayout
//       title="Employee Records"
//       description="Every enrolled identity, embedding quality and enrollment status in one registry."
//       breadcrumbs={[{ label: "Employee Records" }]}
//       actions={
//         <Button asChild>
//           <Link to="/register">
//             <UserPlus className="mr-2 size-4" /> Register person
//           </Link>
//         </Button>
//       }
//     >
//       <Card className="glass-panel">
//         <CardContent className="space-y-4 pt-6">
//           <div className="flex flex-col gap-3 sm:flex-row">
//             <div className="relative flex-1">
//               <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
//               <Input
//                 value={query}
//                 onChange={(e) => {
//                   setQuery(e.target.value);
//                   setPage(1);
//                 }}
//                 placeholder="Search by name, employee ID or email"
//                 className="pl-9"
//               />
//             </div>
            
//             <Select
//               value={dept}
//               onValueChange={(v) => {
//                 setDept(v);
//                 setPage(1);
//               }}
//             >
//               <SelectTrigger className="w-full sm:w-[200px]">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All departments</SelectItem>
//                 {departments.map((d) => (
//                   <SelectItem key={d} value={d}>
//                     {d}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//             <Button variant="outline" onClick={() => setAsc((a) => !a)}>
//               <ArrowUpDown className="mr-2 size-4" /> {asc ? "A–Z" : "Z–A"}
//             </Button>
//           </div>

//           {isLoading ? (
//             <div className="space-y-2">
//               {Array.from({ length: 6 }).map((_, i) => (
//                 <Skeleton key={i} className="h-14 w-full" />
//               ))}
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Person</TableHead>
//                     <TableHead>Employee ID</TableHead>
//                     <TableHead>Department</TableHead>
//                     <TableHead className="hidden md:table-cell">Email</TableHead>
//                     <TableHead className="hidden lg:table-cell">Registered</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead className="text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {rows.map((p) => (
//                     <TableRow key={p.id}>
//                       <TableCell>
//                         <div className="flex items-center gap-3">
//                           <Avatar className="size-9 border">
//                             <AvatarImage src={p.photo} alt={p.name} />
//                             <AvatarFallback>{p.name.slice(0, 2)}</AvatarFallback>
//                           </Avatar>
//                           <div>
//                             <p className="font-medium">{p.name}</p>
//                             <p className="text-xs text-muted-foreground">{p.designation}</p>
//                           </div> 
//                         </div>
//                       </TableCell>
//                       <TableCell className="font-mono text-xs">{p.employeeId}</TableCell>
//                       <TableCell>{p.department}</TableCell>
//                       <TableCell className="hidden text-muted-foreground md:table-cell">{p.email}</TableCell>
//                       <TableCell className="hidden lg:table-cell">
//                         {new Date(p.registeredAt).toLocaleDateString()}
//                       </TableCell>
//                       <TableCell>
//                         <StatusBadge status={p.status} />
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex justify-end gap-1">
//                           <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/people/$personId", params: { personId: p.id } })}>
//                             <Eye className="size-4" />
//                           </Button>
//                           <Button variant="ghost" size="icon" onClick={() => toast.info("Edit mode", { description: p.name })}>
//                             <Pencil className="size-4" />
//                           </Button>
//                           <Button variant="ghost" size="icon" onClick={() => setPendingDelete(p.id)}>
//                             <Trash2 className="size-4 text-destructive" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           )}

//           <div className="flex items-center justify-between text-sm">
//             <p className="text-muted-foreground">
//               Showing {rows.length} of {filtered.length} people
//             </p>
//             <div className="flex items-center gap-2">
//               <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
//                 Previous
//               </Button> 
//               <span className="tabular-nums">
//                 {page} / {pages}
//               </span>
//               <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
//                 Next
//               </Button>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Delete this person?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This removes the identity record and all stored face embeddings. This action cannot be
//               undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={() => {
//                 toast.success("Person deleted");
//                 setPendingDelete(null);
//               }}
//             >
//               Delete
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </DashboardLayout>
//   );
// }