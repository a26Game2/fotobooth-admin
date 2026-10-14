import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ImageUp,
  Link2,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";
import { adminApi, apiMessage } from "../lib/api";
import { money } from "../lib/format";

type Role = "MAIN" | "ADDON";
type MediaType = "IMAGE" | "VIDEO";
type ServicePackage = {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  durationHours?: number | null;
  isFullDay: boolean;
  price?: number | null;
  includedMediaCount?: number | null;
  sortOrder: number;
  isActive: boolean;
};
type AddonPricing = {
  defaultPrice?: number | null;
  includedQuantity: number;
  incrementQuantity: number;
  incrementPrice?: number | null;
  unitLabel: string;
};
type AdminService = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverImagePath?: string | null;
  role: Role;
  mediaType?: MediaType | null;
  packageName?: string | null;
  extraHourPrice?: number | null;
  note?: string | null;
  hotLevel: 1 | 2 | 3;
  startingPrice?: number | null;
  isActive: boolean;
  mainPackages?: ServicePackage[];
  addonPricing?: AddonPricing | null;
  availableAddons?: { addonServiceId: string; addonService: AdminService }[];
};
const unpack = (value: any) => value?.data?.data ?? value?.data ?? value;
const servicesFrom = (value: any): AdminService[] => {
  const raw = unpack(value);
  return Array.isArray(raw) ? raw : raw?.items || [];
};
const numberOrNull = (value: unknown) =>
  value === "" || value === null || value === undefined ? null : Number(value);

const serviceSchema = z
  .object({
    name: z.string().min(2, "Tên dịch vụ tối thiểu 2 ký tự"),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
    description: z.string().optional(),
    role: z.enum(["MAIN", "ADDON"]),
    mediaType: z.enum(["IMAGE", "VIDEO"]).nullable(),
    packageName: z.string().optional(),
    extraHourPrice: z.coerce.number().int().min(0).nullable(),
    note: z.string().optional(),
    hotLevel: z.coerce.number().int().min(1).max(3),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "MAIN" && !value.mediaType)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaType"],
        message: "Chọn loại media cho dịch vụ chính",
      });
  });
type ServiceForm = z.infer<typeof serviceSchema>;
const packageSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]+$/, "Dùng CHỮ HOA, số và gạch dưới"),
  name: z.string().min(1),
  durationHours: z.coerce.number().int().positive().nullable(),
  isFullDay: z.boolean(),
  price: z.coerce.number().int().min(0).nullable(),
  includedMediaCount: z.coerce.number().int().min(0).nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});
type PackageForm = z.infer<typeof packageSchema>;
const pricingSchema = z.object({
  defaultPrice: z.coerce.number().int().min(0).nullable(),
  includedQuantity: z.coerce
    .number()
    .int()
    .min(50)
    .refine((v) => v % 50 === 0, "Phải là bội số 50"),
  incrementQuantity: z.coerce
    .number()
    .int()
    .min(50)
    .refine((v) => v % 50 === 0, "Phải là bội số 50"),
  incrementPrice: z.coerce.number().int().min(0).nullable(),
  unitLabel: z.string().min(1).max(50),
});
type PricingForm = z.infer<typeof pricingSchema>;

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="label">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
function useCatalogMutation<T>(fn: (value: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["services"] });
      toast.success("Đã lưu thay đổi");
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
}

export function Services() {
  const query = useQuery({
    queryKey: ["services"],
    queryFn: adminApi.services,
  });
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [manager, setManager] = useState<AdminService | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const save = useCatalogMutation<{ id?: string; data: ServiceForm }>(
    ({ id, data }) =>
      id ? adminApi.updateService(id, data) : adminApi.createService(data),
  );
  const services = servicesFrom(query.data);
  const mains = services.filter((s) => s.role === "MAIN");
  const addons = services.filter((s) => s.role === "ADDON");
  return (
    <>
      <PageHeader
        title="Dịch vụ & Addon"
        description="Tạo service chính, addon, gói giá và liên kết addon theo API catalog v2."
        action={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setCreateOpen(true);
            }}
          >
            <Plus size={17} /> Thêm dịch vụ
          </button>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState
          message={apiMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !services.length ? (
        <EmptyState
          title="Chưa có dịch vụ"
          description="Tạo service MAIN hoặc ADDON đầu tiên."
        />
      ) : (
        <div className="space-y-8">
          <ServiceSection
            title="Dịch vụ chính"
            description="MAIN có media, gói giá, giờ thêm và danh sách addon khả dụng."
            services={mains}
            onEdit={(s) => {
              setEditing(s);
              setCreateOpen(true);
            }}
            onManage={setManager}
          />
          <ServiceSection
            title="Dịch vụ thêm"
            description="ADDON có giá mặc định và giá phát sinh theo số lượng."
            services={addons}
            onEdit={(s) => {
              setEditing(s);
              setCreateOpen(true);
            }}
            onManage={setManager}
          />
        </div>
      )}
      <ServiceDialog
        key={editing?.id || "new"}
        open={createOpen}
        value={editing}
        busy={save.isPending}
        onClose={() => setCreateOpen(false)}
        onSave={(data) =>
          save.mutate(
            { id: editing?.id, data },
            { onSuccess: () => setCreateOpen(false) },
          )
        }
      />
      {manager && (
        <ServiceManager
          service={manager}
          allAddons={addons}
          onClose={() => setManager(null)}
        />
      )}
    </>
  );
}

function ServiceSection({
  title,
  description,
  services,
  onEdit,
  onManage,
}: {
  title: string;
  description: string;
  services: AdminService[];
  onEdit: (s: AdminService) => void;
  onManage: (s: AdminService) => void;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      {!services.length ? (
        <div className="rounded-2xl border border-dashed bg-white px-5 py-8 text-sm text-zinc-500">
          Chưa có {title.toLowerCase()}.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {services.map((s) => (
            <article className="card overflow-hidden" key={s.id}>
              <div className="relative h-36 bg-zinc-100">
                {s.coverImagePath ? (
                  <img
                    src={s.coverImagePath}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-zinc-400">
                    <ImageUp size={26} />
                  </div>
                )}
                <span
                  className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${s.role === "MAIN" ? "bg-red-600 text-white" : "bg-zinc-900 text-white"}`}
                >
                  {s.role}
                </span>
                <span className="absolute left-3 top-12 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-red-700 shadow-sm">
                  Hot {s.hotLevel}
                </span>
                <CoverUpload service={s} />
              </div>
              <div className="p-5">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{s.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {s.role === "MAIN"
                        ? `${s.mediaType || "—"} · ${s.mainPackages?.length || 0} gói giá`
                        : `${s.addonPricing?.unitLabel || "Chưa cấu hình giá addon"}`}
                    </p>
                  </div>
                  <button
                    onClick={() => onEdit(s)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                    title="Sửa service"
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <p className="mt-3 min-h-10 text-sm text-zinc-500">
                  {s.description || s.note || "Chưa có mô tả"}
                </p>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <b className="text-red-600">{money(s.startingPrice)}</b>
                  <button
                    onClick={() => onManage(s)}
                    className="btn-secondary !px-3 !py-2"
                  >
                    <SlidersHorizontal size={15} />
                    {s.role === "MAIN" ? "Quản lý gói" : "Cấu hình giá"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function CoverUpload({ service }: { service: AdminService }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPEG, PNG hoặc WebP.");
      return;
    }
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      await adminApi.uploadServiceCover(service.id, file);
      await client.invalidateQueries({ queryKey: ["services"] });
      toast.success("Đã cập nhật ảnh cover");
    } catch (error) {
      setPreview(null);
      toast.error(apiMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteServiceCover(service.id);
      await client.invalidateQueries({ queryKey: ["services"] });
      toast.success("Đã xóa ảnh cover");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="absolute bottom-3 right-3 flex gap-2">
      {preview && <img src={preview} alt="Xem trước" className="hidden" />}
      <label className="btn !rounded-lg !bg-white !px-3 !py-2 !text-xs !text-zinc-800 shadow hover:!bg-zinc-100">
        <ImageUp size={15} />
        {busy ? "Đang tải…" : "Thay ảnh"}
        <input
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
          accept="image/jpeg,image/png,image/webp"
          type="file"
          className="sr-only"
        />
      </label>
      {service.coverImagePath && (
        <button
          disabled={busy}
          onClick={remove}
          className="btn !rounded-lg !bg-red-600 !px-3 !py-2 !text-xs !text-white hover:!bg-red-700"
        >
          <Trash2 size={15} />
          Xóa
        </button>
      )}
    </div>
  );
}

function ServiceDialog({
  open,
  value,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  value: AdminService | null;
  busy: boolean;
  onClose: () => void;
  onSave: (v: ServiceForm) => void;
}) {
  const f = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    values: {
      name: value?.name || "",
      slug: value?.slug || "",
      description: value?.description || "",
      role: value?.role || "MAIN",
      mediaType: value?.mediaType ?? (value?.role === "ADDON" ? null : "IMAGE"),
      packageName: value?.packageName || "",
      extraHourPrice: value?.extraHourPrice ?? null,
      note: value?.note || "",
      hotLevel: value?.hotLevel ?? 3,
      isActive: value?.isActive ?? true,
    },
  });
  const role = f.watch("role");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-zinc-950/40 p-4">
      <form
        onSubmit={f.handleSubmit(onSave)}
        className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {value ? "Sửa" : "Thêm"} dịch vụ
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Chọn loại service trước khi nhập chi tiết.
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên dịch vụ" error={f.formState.errors.name?.message}>
            <input className="field" {...f.register("name")} />
          </Field>
          <Field label="Slug" error={f.formState.errors.slug?.message}>
            <input className="field" {...f.register("slug")} />
          </Field>
          <Field label="Loại service">
            <select
              disabled={!!value}
              value={role}
              onChange={(e) => {
                const next = e.target.value as Role;
                f.setValue("role", next);
                f.setValue("mediaType", next === "ADDON" ? null : "IMAGE");
              }}
              className="field disabled:bg-zinc-100"
            >
              <option value="MAIN">MAIN — Dịch vụ chính</option>
              <option value="ADDON">ADDON — Dịch vụ thêm</option>
            </select>
          </Field>
          {role === "MAIN" && (
            <Field
              label="Loại media"
              error={f.formState.errors.mediaType?.message}
            >
              <select
                className="field"
                value={f.watch("mediaType") || ""}
                onChange={(e) =>
                  f.setValue("mediaType", e.target.value as MediaType)
                }
              >
                <option value="IMAGE">IMAGE</option>
                <option value="VIDEO">VIDEO</option>
              </select>
            </Field>
          )}
        </div>
        <Field label="Mô tả">
          <textarea className="field min-h-20" {...f.register("description")} />
        </Field>
        <Field label="Độ hot">
          <select className="field" {...f.register("hotLevel")}>
            <option value={1}>1 — Hot nhất</option>
            <option value={2}>2 — Trung bình</option>
            <option value={3}>3 — Bình thường</option>
          </select>
        </Field>
        {role === "MAIN" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên nhóm gói">
                <input
                  placeholder="Ví dụ: Gói Mirror Booth"
                  className="field"
                  {...f.register("packageName")}
                />
              </Field>
              <Field label="Giá thêm mỗi giờ (VND)">
                <input
                  type="number"
                  placeholder="Có thể để trống"
                  className="field"
                  value={f.watch("extraHourPrice") ?? ""}
                  onChange={(e) =>
                    f.setValue("extraHourPrice", numberOrNull(e.target.value))
                  }
                />
              </Field>
            </div>
            <Field label="Ghi chú">
              <textarea className="field" {...f.register("note")} />
            </Field>
          </>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" {...f.register("isActive")} /> Đang hoạt động
        </label>
        <p className="mt-4 text-xs text-zinc-500">
          Ảnh cover được upload sau khi tạo dịch vụ.{" "}
          {role === "MAIN"
            ? "Gói giá và addon được quản lý ở bước tiếp theo."
            : "Giá addon được cấu hình sau khi tạo."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button disabled={busy} className="btn-primary">
            <Save size={16} /> Lưu dịch vụ
          </button>
        </div>
      </form>
    </div>
  );
}

function ServiceManager({
  service,
  allAddons,
  onClose,
}: {
  service: AdminService;
  allAddons: AdminService[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-950/40 p-4">
      <div className="mx-auto my-6 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-red-600">
              {service.role}
            </p>
            <h2 className="text-xl font-bold">{service.name}</h2>
          </div>
          <button onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {service.role === "MAIN" ? (
          <MainManager service={service} allAddons={allAddons} />
        ) : (
          <AddonManager service={service} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function MainManager({
  service,
  allAddons,
}: {
  service: AdminService;
  allAddons: AdminService[];
}) {
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [packageOpen, setPackageOpen] = useState(false);
  const linked = service.availableAddons?.map((x) => x.addonServiceId) || [];
  const [selected, setSelected] = useState<string[]>(linked);
  const packages = useCatalogMutation<{ id?: string; data: PackageForm }>(
    ({ id, data }) =>
      id
        ? adminApi.updateServicePackage(id, data)
        : adminApi.createServicePackage({ serviceId: service.id, ...data }),
  );
  const links = useCatalogMutation<string[]>((ids) =>
    adminApi.updateServiceAddons(service.id, ids),
  );
  const del = useCatalogMutation<string>((id) =>
    adminApi.deleteServicePackage(id),
  );
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Gói giá</h3>
            <p className="text-sm text-zinc-500">
              Giá thấp nhất của gói active là giá khởi điểm.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setPackageOpen(true);
            }}
            className="btn-primary !px-3 !py-2"
          >
            <PackagePlus size={16} /> Thêm gói
          </button>
        </div>
        <div className="space-y-2">
          {service.mainPackages?.map((p) => (
            <div className="rounded-xl border p-3" key={p.id}>
              <div className="flex justify-between gap-2">
                <div>
                  <b className="text-sm">{p.name}</b>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.code} ·{" "}
                    {p.isFullDay ? "Cả ngày" : `${p.durationHours || "—"} giờ`}{" "}
                    · {p.includedMediaCount ?? "—"} media
                  </p>
                </div>
                <b className="text-sm text-red-600">
                  {p.price === null ? "Chưa nhập giá" : money(p.price)}
                </b>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    setEditing(p);
                    setPackageOpen(true);
                  }}
                  className="text-xs font-bold text-zinc-600"
                >
                  Sửa
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Xóa gói “${p.name}”?`)) del.mutate(p.id);
                  }}
                  className="text-xs font-bold text-red-600"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
          {!service.mainPackages?.length && (
            <p className="rounded-xl border border-dashed p-4 text-sm text-zinc-500">
              Chưa có gói giá.
            </p>
          )}
        </div>
      </section>
      <section>
        <div className="mb-3">
          <h3 className="font-bold">Addon hiển thị cho service này</h3>
          <p className="text-sm text-zinc-500">
            Tick chọn các addon được khách nhìn thấy; thứ tự tick là thứ tự hiển
            thị.
          </p>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-3">
          {allAddons.map((addon) => (
            <label
              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-zinc-50"
              key={addon.id}
            >
              <input
                checked={selected.includes(addon.id)}
                onChange={() => toggle(addon.id)}
                type="checkbox"
                className="accent-red-600"
              />
              <span className="flex-1 text-sm font-medium">{addon.name}</span>
              <span className="text-xs text-zinc-500">
                {money(addon.addonPricing?.defaultPrice)}
              </span>
            </label>
          ))}
          {!allAddons.length && (
            <p className="text-sm text-zinc-500">Chưa tạo ADDON nào.</p>
          )}
        </div>
        <button
          disabled={links.isPending}
          onClick={() => links.mutate(selected)}
          className="btn-primary mt-3"
        >
          <Link2 size={16} /> Lưu danh sách addon
        </button>
      </section>
      {packageOpen && (
        <PackageDialog
          value={editing}
          busy={packages.isPending}
          close={() => setPackageOpen(false)}
          save={(data) =>
            packages.mutate(
              { id: editing?.id, data },
              { onSuccess: () => setPackageOpen(false) },
            )
          }
        />
      )}
    </div>
  );
}

function PackageDialog({
  value,
  busy,
  close,
  save,
}: {
  value: ServicePackage | null;
  busy: boolean;
  close: () => void;
  save: (value: PackageForm) => void;
}) {
  const f = useForm<PackageForm>({
    resolver: zodResolver(packageSchema),
    values: {
      code: value?.code || "",
      name: value?.name || "",
      durationHours: value?.durationHours ?? null,
      isFullDay: value?.isFullDay ?? false,
      price: value?.price ?? null,
      includedMediaCount: value?.includedMediaCount ?? null,
      sortOrder: value?.sortOrder ?? 0,
      isActive: value?.isActive ?? true,
    },
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4">
      <form
        onSubmit={f.handleSubmit(save)}
        className="w-full max-w-xl rounded-2xl bg-white p-6"
      >
        <div className="flex justify-between">
          <h3 className="font-bold">{value ? "Sửa" : "Thêm"} gói giá</h3>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mã gói" error={f.formState.errors.code?.message}>
            <input
              placeholder="TWO_HOURS"
              className="field"
              {...f.register("code")}
            />
          </Field>
          <Field label="Tên gói">
            <input
              placeholder="2 giờ"
              className="field"
              {...f.register("name")}
            />
          </Field>
          <Field label="Số giờ">
            <input
              type="number"
              className="field"
              value={f.watch("durationHours") ?? ""}
              onChange={(e) =>
                f.setValue("durationHours", numberOrNull(e.target.value))
              }
            />
          </Field>
          <Field label="Giá (VND)">
            <input
              type="number"
              className="field"
              value={f.watch("price") ?? ""}
              onChange={(e) =>
                f.setValue("price", numberOrNull(e.target.value))
              }
            />
          </Field>
          <Field label="Media đi kèm">
            <input
              type="number"
              className="field"
              value={f.watch("includedMediaCount") ?? ""}
              onChange={(e) =>
                f.setValue("includedMediaCount", numberOrNull(e.target.value))
              }
            />
          </Field>
          <Field label="Thứ tự">
            <input
              type="number"
              className="field"
              {...f.register("sortOrder")}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold">
          <label className="flex gap-2">
            <input type="checkbox" {...f.register("isFullDay")} /> Gói cả ngày
          </label>
          <label className="flex gap-2">
            <input type="checkbox" {...f.register("isActive")} /> Đang hoạt động
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={close}>
            Hủy
          </button>
          <button disabled={busy} className="btn-primary">
            Lưu gói
          </button>
        </div>
      </form>
    </div>
  );
}

function AddonManager({
  service,
  onClose,
}: {
  service: AdminService;
  onClose: () => void;
}) {
  const p = service.addonPricing;
  const [isActive, setIsActive] = useState(service.isActive);
  const f = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    values: {
      defaultPrice: p?.defaultPrice ?? null,
      includedQuantity: p?.includedQuantity ?? 100,
      incrementQuantity: p?.incrementQuantity ?? 50,
      incrementPrice: p?.incrementPrice ?? null,
      unitLabel: p?.unitLabel || "sản phẩm",
    },
  });
  const save = useCatalogMutation<PricingForm>(async (data) => {
    await adminApi.updateAddonPricing(service.id, data);
    return adminApi.updateService(service.id, { isActive });
  });
  return (
    <form
      onSubmit={f.handleSubmit((data) =>
        save.mutate(data, { onSuccess: onClose }),
      )}
      className="mt-6 max-w-2xl"
    >
      <h3 className="font-bold">Giá addon</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Số lượng mặc định và bước phát sinh phải là bội số của 50.
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Field
          label="Giá mặc định (VND)"
          error={f.formState.errors.defaultPrice?.message}
        >
          <input
            type="number"
            className="field"
            value={f.watch("defaultPrice") ?? ""}
            onChange={(e) =>
              f.setValue("defaultPrice", numberOrNull(e.target.value))
            }
          />
        </Field>
        <Field label="Số lượng đã gồm">
          <input
            type="number"
            className="field"
            {...f.register("includedQuantity")}
          />
        </Field>
        <Field label="Bước phát sinh">
          <input
            type="number"
            className="field"
            {...f.register("incrementQuantity")}
          />
        </Field>
        <Field label="Giá mỗi bước phát sinh (VND)">
          <input
            type="number"
            className="field"
            value={f.watch("incrementPrice") ?? ""}
            onChange={(e) =>
              f.setValue("incrementPrice", numberOrNull(e.target.value))
            }
          />
        </Field>
        <Field label="Đơn vị">
          <input className="field" {...f.register("unitLabel")} />
        </Field>
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          type="checkbox"
          className="h-4 w-4 accent-red-600"
        />{" "}
        Addon đang hoạt động
      </label>
      <button disabled={save.isPending} className="btn-primary mt-6">
        <Save size={16} /> Lưu giá addon
      </button>
    </form>
  );
}
