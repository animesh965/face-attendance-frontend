import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CheckCircle2, ImagePlus, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FaceScanScene } from "@/components/three/FaceScanScene";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { organizationApi } from "@/api/organization";
import { registerApi, RegisterUser } from "@/api/register";
import { useAppStore } from "@/store/useAppStore";
import { phoneError } from "@/lib/phone";




export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    const { authenticated, user } = useAppStore.getState();

    if (!authenticated || !user) {
      throw redirect({ to: "/login" });
    }

    if (!user.permissions.includes("employees.create")) {
      throw redirect({ to: "/dashboard" });
    }
  },

  head: () => ({
    meta: [
      { title: "Register Employee — VertexFace AI" },
      {
        name: "description",
        content:
          "Enroll a new person with profile details, reference face images and live camera capture for embedding generation.",
      },
      {
        property: "og:title",
        content: "Register Employee — VertexFace AI",
      },
      {
        property: "og:description",
        content: "Enroll new people and generate 512-D face embeddings.",
      },
    ],
  }),

  component: RegisterPage,
});


interface FormValues {
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  gender: string;
}
// interface User {
//   id: string;
//   name: string;
//   email: string;
//   face_registered: boolean;
// }


function RegisterPage() {
  const { register, handleSubmit, setValue, reset } = useForm<FormValues>();
  interface FaceImage {
  file: File;
  preview: string;
}

const [images, setImages] = useState<FaceImage[]>([]);
const [gender, setGender] = useState("");
  // const [images, setImages] = useState<string[]>([]);
  // const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // camara capture state
  const videoRef = useRef<HTMLVideoElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);
const [cameraOpen, setCameraOpen] = useState(false);
const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
const [selectedDesignation, setSelectedDesignation] = useState("");
const [selectedUser, setSelectedUser] =
  useState<RegisterUser | null>(null);
// const [selectedUser, setSelectedUser] = useState<User | null>(null);
const { data: users = [] } = useQuery({
  queryKey: ["register-users"],
  queryFn: registerApi.getUsers,
});
const { data: departments = [] } = useQuery({
  queryKey: ["departments"],
  queryFn: organizationApi.getDepartments,
});

const { data: designations = [] } = useQuery({
  queryKey: ["designations", selectedDepartment],
  queryFn: () => organizationApi.getDesignations(selectedDepartment),
  enabled: !!selectedDepartment,
});

  const addFiles = (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const selectedFiles = Array.from(files);

  if (images.length + selectedFiles.length > 5) {
    toast.error("Maximum 5 face images are allowed");
    return;
  }

  const newImages: FaceImage[] = selectedFiles.map((file) => ({
    file,
    preview: URL.createObjectURL(file),
  }));

  setImages((prev) => [...prev, ...newImages]);
};
const removeImage = (index: number) => {
  setImages((prev) => {
    const imageToRemove = prev[index];

    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    return prev.filter((_, i) => i !== index);
  });
};
// ==================== CAMERA FUNCTIONS ====================

const openCamera = async () => {
  try {
    if (images.length >= 5) {
      toast.error("Maximum 5 images are allowed");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera is not supported by this browser");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    setCameraStream(stream);
    setCameraOpen(true);

    // Video element render hone ke baad stream attach karein
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    }, 100);
  } catch (error) {
    console.error("Camera error:", error);
    toast.error(
      "Camera access denied. Please allow camera permission."
    );
  }
};

const closeCamera = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setCameraStream(null);
  setCameraOpen(false);
};

const takeSnapshot = () => {
  if (!videoRef.current) {
    toast.error("Camera is not ready");
    return;
  }

  if (!canvasRef.current) {
    toast.error("Unable to capture image");
    return;
  }

  if (images.length >= 5) {
    toast.error("Maximum 5 images are allowed");
    return;
  }

  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video.videoWidth || !video.videoHeight) {
    toast.error("Camera is still loading. Please try again.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    toast.error("Unable to capture image");
    return;
  }

  // Mirror ko actual photo me normal rakhein
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.restore();

  canvas.toBlob(
  (blob) => {
    if (!blob) {
      toast.error("Unable to create snapshot");
      return;
    }

    console.log("===== CAMERA BLOB =====");
    console.log("type:", blob.type);
    console.log("size:", blob.size);
    console.log("size KB:", (blob.size / 1024).toFixed(2));

    const file = new File(
      [blob],
      `camera-face-${Date.now()}.jpg`,
      {
        type: "image/jpeg",
      }
    );

    console.log("===== CAMERA FILE =====");
    console.log("name:", file.name);
    console.log("type:", file.type);
    console.log("size:", file.size);
    console.log("lastModified:", file.lastModified);

    const newImage: FaceImage = {
      file,
      preview: URL.createObjectURL(file),
    };

      // IMPORTANT:
      // Camera snapshot bhi same images array me jayega
      // jahan uploaded images jaati hain.
      setImages((prev) => [...prev, newImage]);

      toast.success("Snapshot added successfully");
    },
    "image/jpeg",
    0.92
  );
};

// Component close/unmount hone par camera band
useEffect(() => {
  return () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
  };
}, [cameraStream]);

  const onSubmit = handleSubmit(async (values) => {
  if (!selectedUser) {
    toast.error("Please select employee");
    return;
  }

  if (!selectedDept) {
    toast.error("Select department");
    return;
  }

  if (!selectedDesignation) {
    toast.error("Select designation");
    return;
  }

  if (!gender) {
    toast.error("Please select gender");
    return;
  }

  if (images.length < 3) {
    toast.error("Please upload minimum 3 face images");
    return;
  }

  if (images.length > 5) {
    toast.error("Maximum 5 face images are allowed");
    return;
  }

  try {
    setUploading(true);
    setProgress(0);
    setDone(false);

    const form = new FormData();

form.append("user_id", selectedUser.id);
form.append("name", selectedUser.name);
form.append("employee_id", selectedUser.id);
form.append("phone", values.phone || "");
form.append("department_id", selectedDept);
form.append("designation_id", selectedDesignation);
form.append("gender", gender);

images.forEach((image) => {
  console.log("========== UPLOADING IMAGE ==========");
  console.log("name:", image.file.name);
  console.log("type:", image.file.type);
  console.log("size:", image.file.size);
  console.log("sizeKB:", (image.file.size / 1024).toFixed(2));
  console.log("=====================================");

  form.append("images", image.file);
});

console.log("========== FORM DATA ==========");

for (const [key, value] of form.entries()) {
  if (value instanceof File) {
    console.log(key, {
      name: value.name,
      type: value.type,
      size: value.size,
    });
  } else {
    console.log(key, value);
  }
}

console.log("========== END FORM DATA ==========");
    console.log("REGISTER EMPLOYEE FORM:", {
      user_id: selectedUser.id,
      phone: values.phone,
      department_id: selectedDept,
      designation_id: selectedDesignation,
      gender,
      images: images.map((image) => image.file.name),
    });

    await registerApi.registerEmployee(form);

    setProgress(100);
    setDone(true);
    
    toast.success("Employee registered successfully");

    // Cleanup previews
    images.forEach((image) => {
      URL.revokeObjectURL(image.preview);
    });

    reset();

    setImages([]);
    setSelectedUser(null);
    setSelectedDept("");
    setSelectedDepartment("");
    setSelectedDesignation("");
    setGender("");
    setProgress(0);
  // } catch (err: any) {
  //   console.error("Register employee error:", err);

  //   toast.error(
  //     err?.response?.data?.detail ||
  //       err?.response?.data?.message ||
  //       "Registration failed"
  //   );
  // } 
  } catch (err: any) {
  console.error("========== REGISTER ERROR ==========");
  console.error("Status:", err?.response?.status);
  console.error("Response:", err?.response?.data);
  console.error("Headers:", err?.response?.headers);
  console.error("Error:", err);
  console.error("====================================");

  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    detail.forEach((item) => {
      console.error(
        "Validation:",
        item?.loc,
        item?.msg,
        item?.type
      );
    });
  }

  toast.error(
    typeof detail === "string"
      ? detail
      : err?.response?.data?.message ||
        "Backend returned 500 Internal Server Error"
  );
}

  finally {
    setUploading(false);
  }
});

  return (
    <DashboardLayout
      title="Register Employee"
      description="Capture identity metadata and reference imagery to generate a face embedding."
      breadcrumbs={[{ label: "Register Employee" }]}
    >
      
      <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Identity Details</CardTitle>
            <CardDescription>All fields are synced with the FastAPI /register endpoint</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" id="name">
              <Select
    onValueChange={(value) => {
      const user = users.find((u) => u.id === value);

      if (!user) return;

      setSelectedUser(user);

      setValue("name", user.name);
      setValue("employeeId", user.id);
      setValue("email", user.email);
    }}
  >
  <SelectTrigger>
    <SelectValue placeholder="Select Full Name" />
  </SelectTrigger>

  <SelectContent>
    {users.map((user) => (
      <SelectItem key={user.id} value={user.id}>
        {user.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
              {/* <Input id="name" placeholder="Jane Doe" required {...register("name", { required: true })} /> */}
            </Field>
            {/* <Field label="Employee ID" id="employeeId">
              <Input
  id="employeeId"
  readOnly
  {...register("employeeId")}
/>
            </Field>
            <Field label="Email" id="email">
              <Input
  id="email"
  readOnly
  {...register("email")}
/>
            </Field> */}
            <Field label="Phone Number" id="phone">
  <Input
    id="phone"
    placeholder="Enter Phone Number"
    maxLength={10}
    inputMode="numeric"
    {...register("phone", {
      required: "Phone number is required",
      pattern: {
        value: /^[6-9]\d{9}$/,
        message: "Enter a valid 10-digit mobile number",
      },
      validate: (value) => phoneError(value) ?? true,
      onChange: (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      },
    })}
  />
</Field>
            {/* <Field label="Phone Number" id="phone">
              <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
            </Field> */}
            <Field label="Department" id="department">
              <Select
  onValueChange={(value) => {
    setSelectedDepartment(value);
    setSelectedDept(value);
    setValue("department", value);

    setSelectedDesignation("");
    setValue("designation", "");
  }}
>
              {/* <Select
  onValueChange={(value) => {
    setSelectedDepartment(value);
    setValue("department", value);
    setValue("designation", "");
  }}
> */}
  <SelectTrigger>
    <SelectValue placeholder="Select department" />
  </SelectTrigger>

  <SelectContent>
    {departments.map((dept) => (
      <SelectItem key={dept.id} value={dept.id}>
        {dept.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
              {/* <Select onValueChange={(v) => setValue("department", v)}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
            </Field>
            <Field label="Designation" id="designation">
              <Select
  onValueChange={(value) => {
    setSelectedDesignation(value);
    setValue("designation", value);
  }}
  disabled={!selectedDepartment}
>
  <SelectTrigger>
    <SelectValue placeholder="Select designation" />
  </SelectTrigger>

  <SelectContent>
    {designations.map((des) => (
      <SelectItem key={des.id} value={des.id}>
        {des.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
              {/* <Input id="designation" placeholder="Security Supervisor" {...register("designation")} /> */}
            </Field>
<Field label="Gender" id="gender">
  <Select
    value={gender}
    onValueChange={(value) => {
      setGender(value);
      setValue("gender", value);
    }}
  >
    <SelectTrigger id="gender">
      <SelectValue placeholder="Select gender" />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="male">Male</SelectItem>
      <SelectItem value="female">Female</SelectItem>
      <SelectItem value="other">Other</SelectItem>
      <SelectItem value="prefer_not_to_say">
        Prefer not to say
      </SelectItem>
    </SelectContent>
  </Select>
</Field>
          <div className="sm:col-span-2">
  <Label className="mb-2 block">Face Images</Label>

  

  {/* Upload Box */}
{/* {images.length < 5 && (
  <div
    onClick={() => inputRef.current?.click()}
    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-background/50 px-6 py-7 text-center transition-all hover:border-primary/60 hover:bg-accent/40"
  >
    <ImagePlus className="size-8 text-muted-foreground" />

    <p className="mt-2 text-sm font-semibold">
      Upload profile & additional images
    </p>

    <p className="mt-1 text-xs text-muted-foreground">
      PNG or JPG · Upload minimum 3 and maximum 5 images
    </p>

    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/jpg"
      multiple
      hidden
      onChange={(e) => {
        addFiles(e.target.files);
        e.currentTarget.value = "";
      }}
    />
  </div>
)} */}
  {/* Image slots */}
  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
    {[0, 1, 2, 3, 4].map((slotIndex) => {
  const image = images[slotIndex];

  const labels = [
    "1. Front View",
    "2. Left View",
    "3. Right View",
    "4. Optional",
    "5. Optional",
  ];

  return (
    <motion.div
      key={slotIndex}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-w-0"
    >
      {image ? (
        /* ================= IMAGE ADDED ================= */
        <div className="relative overflow-hidden rounded-xl border bg-background">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={image.preview}
              alt={`Face ${slotIndex + 1}`}
              className="h-full w-full object-cover"
            />

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeImage(slotIndex)}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-red-50"
            >
              <X className="size-4 text-red-500" />
            </button>

            {/* Success */}
            <div className="absolute bottom-2 left-2 flex size-5 items-center justify-center rounded-full bg-green-500 text-white shadow">
              <CheckCircle2 className="size-4" />
            </div>
          </div>

          <div className="border-t px-3 py-2 text-center text-xs font-medium">
            {labels[slotIndex]}
          </div>
        </div>
      ) : (
        /* ================= EMPTY ADD IMAGE BOX ================= */
        <div>
          <input
            id={`face-image-${slotIndex}`}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (!file) return;

              // Maximum 5 check
              if (images.length >= 5) {
                toast.error("Maximum 5 images are allowed");
                e.currentTarget.value = "";
                return;
              }

              const newImage: FaceImage = {
                file,
                preview: URL.createObjectURL(file),
              }; 

              setImages((prev) => [...prev, newImage]);

              // Same file ko dobara select karne ke liye
              e.currentTarget.value = "";
            }}
          />

          <label
            htmlFor={`face-image-${slotIndex}`}
            className="block w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/20 bg-background/30 transition hover:border-primary/50 hover:bg-accent/30"
          >
            {/* Empty slot */}
            <div className="flex aspect-[4/3] flex-col items-center justify-center">
              <ImagePlus className="size-7 text-muted-foreground" />

              <span className="mt-2 text-xs font-medium text-muted-foreground">
                Add Image
              </span>

              <span className="mt-1 text-[10px] text-muted-foreground">
                Click to upload
              </span>
            </div>

            <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
              {labels[slotIndex]}
            </div>
          </label>
        </div>
      )}
    </motion.div>
  );
})}
  </div>

  {/* Image count */}
  <div className="mt-3 flex items-center justify-between">
    <p className="text-xs text-muted-foreground">
      {images.length}/5 images uploaded
    </p>

    {images.length < 3 ? (
      <p className="text-xs font-medium text-red-500">
        {3 - images.length} more image
        {3 - images.length > 1 ? "s" : ""} required
      </p>
    ) : (
      <p className="text-xs font-medium text-green-600">
        Minimum images completed
      </p>
    )}
  </div>
</div> 
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glass-panel relative overflow-hidden">
  <CardHeader>
    <CardTitle>Live Capture Preview</CardTitle>
    <CardDescription>
      Detected face crop & alignment
    </CardDescription>
  </CardHeader>

  <CardContent>
    {/* ================= CAMERA PREVIEW ================= */}
    <div className="relative aspect-square overflow-hidden rounded-xl border bg-[oklch(0.2_0.02_258)]">
      {cameraOpen ? (
        <>
          {/* Actual camera video */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: "scaleX(-1)",
            }}
          />

          {/* Face guide box */}
          <div className="absolute inset-x-[22%] inset-y-[16%] rounded-xl border-2 border-success/80" />

          {/* Live label */}
          <div className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-1 text-[11px] font-medium text-white">
            ● LIVE
          </div>

          {/* Camera info */}
          <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
            Look at camera
          </div>
        </>
      ) : (
        <>
          {/* Existing AI preview */}
          <FaceScanScene className="absolute inset-0" />

          {/* Face guide box */}
          <div className="absolute inset-x-[22%] inset-y-[16%] rounded-xl border-2 border-success/80" />

          <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
            crop 224×224 · yaw 3° · blur 0.04
          </div>
        </>
      )}
    </div>

    {/* Hidden canvas for taking snapshot */}
    <canvas
      ref={canvasRef}
      className="hidden"
    />

    {/* ================= CAMERA BUTTONS ================= */}
    <div className="mt-3 flex gap-2">
      {!cameraOpen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={openCamera}
          disabled={images.length >= 5}
        >
          <Camera className="mr-2 size-4" />
          Capture from camera
        </Button>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={takeSnapshot}
            disabled={images.length >= 5}
          >
            <Camera className="mr-2 size-4" />
            Snapshot
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closeCamera}
          >
            Close
          </Button>
        </>
      )}
    </div>

    {/* Image count */}
    <div className="mt-2 text-center text-xs text-muted-foreground">
      {images.length}/5 face images added
    </div>
  </CardContent>
</Card>

          <Card className="glass-panel">
            <CardContent className="space-y-3 pt-6">
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Generating embeddings…</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="mt-2" />
                </div>
              )}
              <AnimatePresence>
                {done && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success"
                  >
                    <CheckCircle2 className="size-5" /> Registration complete
                  </motion.div>
                )}
              </AnimatePresence>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
                Register Person
              </Button>
            </CardContent>
          </Card>
          {/* Information box */}
  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        i
      </div>

      <div className="space-y-1">
        <p>Capture minimum 3 and maximum 5 images</p>
        <p>Look at the camera and keep your face clearly visible</p>
        <p>Capture from different angles (front, left, right)</p>
        <p>Ensure good lighting and avoid wearing masks or sunglasses</p>
      </div>
    </div>
  </div>
        </div>
      </form>
    </DashboardLayout>
  );
  
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}