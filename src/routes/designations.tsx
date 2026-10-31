import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type Designation,
} from "@/api/organization";

export const Route = createFileRoute("/designations")({
  head: () => ({
    meta: [
      { title: "Designations" },
      {
        name: "description",
        content: "Manage designations",
      },
      {
        property: "og:title",
        content: "Designations",
      },
      {
        property: "og:description",
        content: "Manage designations",
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

  component: DesignationsPage,
});

function DesignationsPage() {
  const [departments, setDepartments] = useState<Department[]>(
    []
  );

  const [designations, setDesignations] = useState<
    Designation[]
  >([]);

  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    departmentId?: string;
  }>({});

 
  const [loadingDesignations, setLoadingDesignations] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // =========================
  // Load Departments
  // =========================
  useEffect(() => {
    const loadDepartments = async () => {
      try {
      
        setError(null);

        const data =
          await organizationApi.getDepartments();

        setDepartments(data);
      } catch (err) {
        console.error(
          "Failed to load departments:",
          err
        );

        setError("Failed to load departments.");
      } 
    };

    loadDepartments();
  }, []);

  // =========================
  // Load Designations
  // =========================
  useEffect(() => {
    const loadDesignations = async () => {
      if (!departmentId) {
        setDesignations([]);
        return;
      }

      try {
        setLoadingDesignations(true);
        setError(null);

        const data =
          await organizationApi.getDesignations(
            departmentId
          );

        setDesignations(data);
      } catch (err) {
        console.error(
          "Failed to load designations:",
          err
        );

        setError("Failed to load designations.");
      } finally {
        setLoadingDesignations(false);
      }
    };

    loadDesignations();
  }, [departmentId]);

  // reset
const handleReset = () => {
  setName("");
  setDepartmentId("");
  setErrors({});
  setError(null);
  setDesignations([]);
};
  // =========================
  // Create Designation
  // =========================
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const newErrors: {
      name?: string;
      departmentId?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!departmentId) {
      newErrors.departmentId =
        "Department is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await organizationApi.createDesignation(
        name.trim(),
        departmentId
      );

      // Refresh current department's designations
      const data =
        await organizationApi.getDesignations(
          departmentId
        );

      setDesignations(data);

      // Reset form
      setName("");
      setErrors({});
    } catch (err) {
      console.error(
        "Failed to create designation:",
        err
      );

      setError("Failed to create designation.");
    } finally {
      setSubmitting(false);
    }
  };

  

  // =========================
  // UI
  // =========================
  return (
  <DashboardLayout
    title="Designations"
    description="Create and manage designations"
    breadcrumbs={[{ label: "Designations" }]}
  >
      

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Designation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Designation
          </CardTitle>

          <CardDescription>
            Enter the designation name and select a
            department.
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
                Name{" "}
                <span className="text-destructive">
                  *
                </span>
              </Label>

              <Input
                id="name"
                placeholder="e.g. Jr. Developer"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);

                  if (errors.name) {
                    setErrors((prev) => {
                      const { name: _, ...rest } = prev;
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

            {/* Department */}
            <div className="grid gap-2">
              <Label htmlFor="department">
                Department{" "}
                <span className="text-destructive">
                  *
                </span>
              </Label>

              <Select
                value={departmentId}
                onValueChange={(value) => {
                  setDepartmentId(value);

                  if (errors.departmentId) {
                    setErrors((prev) => {
                      const {
                        departmentId: _,
                        ...rest
                      } = prev;

                      return rest;
                    });
                  }
                }}
              >
                <SelectTrigger
                  id="department"
                  aria-invalid={!!errors.departmentId}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>

                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectItem
                      value="no-department"
                      disabled
                    >
                      No departments available
                    </SelectItem>
                  ) : (
                    departments.map((dept) => (
                      <SelectItem
                        key={dept.id}
                        value={dept.id}
                      >
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {errors.departmentId && (
                <p className="text-xs text-destructive">
                  {errors.departmentId}
                </p>
              )}
            </div>

            {/* Button */}
            <div className="flex gap-2 sm:col-span-2">
  <Button
    type="submit"
    disabled={
      submitting ||
      departments.length === 0
    }
  >
    

    {submitting
      ? "Adding..."
      : "Save"}
  </Button>

  <Button
    type="button"
    variant="outline"
    onClick={handleReset}
    disabled={submitting}
  >
    Reset
  </Button>
</div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Designation List
          </CardTitle>

          <CardDescription>
            {departmentId
              ? `${designations.length} designation(s) available`
              : "Select a department to view designations"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!departmentId ? (
            <p className="text-sm text-muted-foreground">
              Select a department above to view
              designations.
            </p>
          ) : loadingDesignations ? (
            <p className="text-sm text-muted-foreground">
              Loading designations...
            </p>
          ) : designations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No designations found for this department.
            </p>
          ) : (
            <Table>
              <TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Department</TableHead>
    <TableHead className="text-right">Action</TableHead>
  </TableRow>
</TableHeader>

              <TableBody>
  {designations.map((desig) => {
    const dept = departments.find(
      (d) => d.id === departmentId
    );

    return (
      <TableRow key={desig.id}>
        <TableCell className="font-medium">
          {desig.name}
        </TableCell>

        <TableCell>
          {dept
            ? `${dept.name} (${dept.code})`
            : "Unknown department"}
        </TableCell>

        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {/* Edit */}
            <Button
  type="button"
  variant="ghost"
  size="icon"
  className="text-primary hover:bg-primary/10 hover:text-primary"
  onClick={() => {
    console.log("Edit designation:", desig.id);
  }}
>
  <Pencil className="h-4 w-4" />
</Button>

          <Button
  type="button"
  variant="ghost"
  size="icon"
  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
  onClick={() => {
    console.log("Delete designation:", desig.id);
  }}
>
  <Trash2 className="h-4 w-4" />
</Button>
          </div>
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
);
}
