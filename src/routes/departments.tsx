import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  organizationApi,
  type Department,
} from "@/api/organization";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments" },
      {
        name: "description",
        content: "Manage departments",
      },
      {
        property: "og:title",
        content: "Departments",
      },
      {
        property: "og:description",
        content: "Manage departments",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),

  component: DepartmentsPage,
});

function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    code?: string;
  }>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================
  // GET Departments
  // ============================
  useEffect(() => {
  const loadDepartments = async () => {
    try {
      const data = await organizationApi.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError("Failed to load departments.");
    }
  };

  loadDepartments();
}, []);

  // ============================
  // CREATE Department
  // ============================
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const newErrors: {
      name?: string;
      code?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!code.trim()) {
      newErrors.code = "Code is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await organizationApi.createDepartment(
        name.trim(),
        code.trim()
      );

      // API se latest department list reload
      const data = await organizationApi.getDepartments();

      setDepartments(data);

      // Form reset
      setName("");
      setCode("");
      setErrors({});
    } catch (err) {
      console.error("Failed to create department:", err);

      setError("Failed to create department.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================
  // Loading
  // ============================
  

  // ============================
  // UI
  // ============================
  return (
  <DashboardLayout
    title="Departments"
    description="Create and manage departments"
    breadcrumbs={[{ label: "Departments" }]}
  >
      

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Department */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </CardTitle>

          <CardDescription>
            Enter the department name and code below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-6 sm:grid-cols-2"
          >
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Department Name{" "}
                <span className="text-destructive">
                  *
                </span>
              </Label>

              <Input
                id="name"
                placeholder="e.g. Human Resources"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);

                  if (errors.name) {
  setErrors((prev) => {
    const { name, ...rest } = prev;
    return rest;
  });
}
                }}
                aria-invalid={!!errors.name}
              />

              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Code */}
            <div className="grid gap-2">
              <Label htmlFor="code">
                Department Code{" "}
                <span className="text-destructive">
                  *
                </span>
              </Label>

              <Input
                id="code"
                placeholder="e.g. HR"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);

                  if (errors.code) {
  setErrors((prev) => {
    const { code, ...rest } = prev;
    return rest;
  });
}
                }}
                aria-invalid={!!errors.code}
              />

              {errors.code && (
                <p className="text-xs text-destructive">
                  {errors.code}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={submitting}
              >
                {/* <Plus className="h-4 w-4" /> */}

                {submitting
                  ? "Saving..."
                  : "Save"}
              </Button>
              
            </div>
            
          </form>
        </CardContent>
      </Card>

      {/* Department List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Department List
          </CardTitle>

          <CardDescription>
            {departments.length} department(s) available
          </CardDescription>
        </CardHeader>

        <CardContent>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments found. Add one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">
                      {dept.name}
                    </TableCell>

                    <TableCell>
                      {dept.code}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  </DashboardLayout>
);
}