import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  ImageUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  ConfirmDialog,
  CurrencyInput,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "./components/ui";
import { adminApi, apiMessage } from "./lib/api";
import { dateOnly, dateTime, money } from "./lib/format";
import type { Booking, BookingStatus, City, Service } from "./types";

const unwrap = (data: any) => data?.data?.data ?? data?.data ?? data;
const array = (data: any): any[] => {
  const v = unwrap(data);
  return Array.isArray(v) ? v : v?.items || v?.data || [];
};
const bookingStatuses: BookingStatus[] = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];
const legalTransitions: Record<BookingStatus, BookingStatus[]> = {
  NEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["QUOTED", "CANCELLED"],
  QUOTED: ["DEPOSIT_PENDING", "CANCELLED"],
  DEPOSIT_PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
function useSafeMutation(fn: (v: any) => Promise<any>, keys: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      toast.success("Đã lưu thay đổi thành công");
    },
    onError: (e) => toast.error(apiMessage(e)),
  });
}

export function Dashboard() {
  const q = useQuery({
    queryKey: ["bookings", "dashboard"],
    queryFn: () => adminApi.bookings({ page: 1, limit: 100 }),
  });
  if (q.isLoading) return <LoadingState rows={6} />;
  if (q.error)
    return (
      <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
    );
  const items = array(q.data) as Booking[];
  const stats = [
    ["Tổng booking", items.length, "text-zinc-900"],
    [
      "Booking mới",
      items.filter((x) => x.status === "NEW").length,
      "text-blue-600",
    ],
    [
      "Đã liên hệ",
      items.filter((x) => x.status === "CONTACTED").length,
      "text-violet-600",
    ],
    [
      "Chờ cọc",
      items.filter((x) => x.status === "DEPOSIT_PENDING").length,
      "text-orange-600",
    ],
    [
      "Đã xác nhận",
      items.filter((x) => x.status === "CONFIRMED").length,
      "text-emerald-600",
    ],
    [
      "Đã hủy",
      items.filter((x) => x.status === "CANCELLED").length,
      "text-red-600",
    ],
  ];
  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Theo dõi nhanh hoạt động booking và các yêu cầu mới nhất."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([n, v, c]) => (
          <div key={n as string} className="card p-5">
            <p className="text-sm font-medium text-zinc-500">{n}</p>
            <p className={`mt-2 text-3xl font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Booking mới nhất</h2>
          <Link
            to="/admin/booking-requests"
            className="inline-flex items-center gap-1 text-sm font-bold text-red-600"
          >
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        <BookingTable items={items.slice(0, 6)} />
      </section>
    </>
  );
}
function BookingTable({ items }: { items: Booking[] }) {
  if (!items.length) return <EmptyState title="Chưa có booking nào" />;
  return (
    <DataTable>
      <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
        <tr>
          {[
            "Mã booking",
            "Khách hàng",
            "Dịch vụ",
            "Ngày tổ chức",
            "Tạm tính",
            "Trạng thái",
            "",
          ].map((x) => (
            <th key={x} className="px-5 py-3.5 font-bold">
              {x}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((b) => (
          <tr key={b.id} className="hover:bg-zinc-50">
            <td className="px-5 py-4 font-bold text-red-700">
              {b.bookingCode || b.code || "—"}
            </td>
            <td className="px-5 py-4">
              <p className="font-semibold">{b.customerName || "—"}</p>
              <p className="text-xs text-zinc-500">{b.customerPhone}</p>
            </td>
            <td className="px-5 py-4">
              <p>{b.service?.name || "—"}</p>
              <p className="text-xs text-zinc-500">{b.city?.name}</p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
              {dateOnly(b.eventDate)}
            </td>
            <td className="px-5 py-4 whitespace-nowrap font-semibold">
              {money(b.totalPrice ?? b.totalAmount)}
            </td>
            <td className="px-5 py-4">
              <StatusBadge status={b.status} />
            </td>
            <td className="px-5 py-4">
              <Link
                className="text-sm font-bold text-red-600"
                to={`/admin/booking-requests/${b.id}`}
              >
                Chi tiết
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
export function Bookings() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState<BookingStatus | "">("");
  const q = useQuery({
    queryKey: ["bookings", page, status],
    queryFn: () =>
      adminApi.bookings({ page, limit: 20, ...(status ? { status } : {}) }),
  });
  const data = unwrap(q.data);
  const items = (
    Array.isArray(data) ? data : data?.items || data?.data || []
  ) as Booking[];
  const meta = data?.meta || data?.pagination;
  const filters: (BookingStatus | "")[] = ["", ...bookingStatuses];
  return (
    <>
      <PageHeader
        title="Quản lý booking"
        description="Xem, liên hệ và cập nhật tiến độ từng yêu cầu booking."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-2 text-xs font-bold ${status === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}
          >
            {s ? <StatusBadge status={s} /> : "Tất cả"}
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <LoadingState rows={7} />
      ) : q.error ? (
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <>
          <BookingTable items={items} />
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
            <span>
              Trang {page}
              {meta?.totalPages ? ` / ${meta.totalPages}` : ""}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary !p-2"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={meta?.totalPages && page >= meta?.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary !p-2"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const noteSchema = z.object({
  note: z.string().min(2, "Vui lòng nhập nội dung ghi chú"),
});
export function BookingDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["booking", id],
    queryFn: () => adminApi.booking(id),
  });
  const statusMutation = useMutation({
    mutationFn: (status: BookingStatus) =>
      adminApi.updateBookingStatus(id, status),
    onSuccess: (response) => {
      // The status endpoint returns the updated booking, so reflect it as soon
      // as the click succeeds instead of waiting for another detail request.
      queryClient.setQueryData(["booking", id], response);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Đã cập nhật trạng thái booking");
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const noteMutation = useSafeMutation(
    (v) => adminApi.addNote(id, v.note),
    [["booking", id]],
  );
  const noteForm = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note: "" },
  });
  if (q.isLoading) return <LoadingState rows={8} />;
  if (q.error)
    return (
      <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
    );
  const b = unwrap(q.data) as Booking;
  // API v2 stores a complete pricing snapshot on the booking. Prefer top-level
  // values when present so both the legacy and v2 responses render correctly.
  const pricingSnapshot =
    b.configurationSnapshot && typeof b.configurationSnapshot === "object"
      ? (b.configurationSnapshot as Record<string, any>)
      : {};
  const price = {
    basePrice: b.basePrice ?? pricingSnapshot.basePrice,
    extraHours: b.extraHours ?? pricingSnapshot.extraHours,
    extraHourAmount: b.extraHourAmount ?? pricingSnapshot.extraHourAmount,
    extraHourPrice: b.extraHourPrice ?? pricingSnapshot.extraHourPrice,
    travelFee: b.travelFee ?? pricingSnapshot.travelFee,
    subtotal: b.subtotal ?? pricingSnapshot.subtotal,
    vatAmount: b.vatAmount ?? pricingSnapshot.vatAmount,
    vatRate: b.vatRate ?? pricingSnapshot.vatRate,
    total:
      b.estimatedTotal ??
      b.totalPrice ??
      b.totalAmount ??
      pricingSnapshot.estimatedTotal,
    mainPackage: b.servicePackage ?? pricingSnapshot.mainPackage,
  };
  const selectedAddons = b.addons ?? pricingSnapshot.addons ?? b.options ?? [];
  const moneyOrDash = (value?: number | null) =>
    value === undefined || value === null ? "—" : money(value);
  const allowed = legalTransitions[b.status] || [];
  return (
    <>
      <button
        onClick={() => nav(-1)}
        className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft size={17} /> Quay lại danh sách
      </button>
      <PageHeader
        title={b.bookingCode || b.code || "Chi tiết booking"}
        description={`Tạo lúc ${dateTime(b.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">
                Tổng tạm tính
              </p>
              <p className="text-sm font-extrabold text-red-700">
                {moneyOrDash(price.total)}
              </p>
            </div>
            <BookingEditor booking={b} />
            <StatusBadge status={b.status} />
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <InfoCard title="Thông tin khách hàng">
            <Detail label="Họ tên" value={b.customerName} />
            <Detail label="Số điện thoại" value={b.customerPhone} />
            <Detail label="Email" value={b.customerEmail} />
          </InfoCard>
          <InfoCard title="Thông tin sự kiện">
            <Detail label="Dịch vụ" value={b.service?.name} />
            <Detail
              label="Gói dịch vụ"
              value={price.mainPackage?.name ?? price.mainPackage?.code}
            />
            <Detail label="Thành phố" value={b.city?.name} />
            <Detail label="Ngày tổ chức" value={dateOnly(b.eventDate)} />
            <Detail label="Loại sự kiện" value={b.eventType} />
            <Detail label="Địa điểm" value={b.eventLocation} />
          </InfoCard>
          <InfoCard title="Option & addon đã chọn">
            {selectedAddons.length ? (
              <div className="divide-y">
                {selectedAddons.map((addon: any, i: number) => (
                  <div key={i} className="flex justify-between py-3">
                    <span>
                      {addon.itemName || addon.name || "Addon"}
                      {addon.quantity > 1 && (
                        <small className="ml-1 text-zinc-500">
                          × {addon.quantity}
                        </small>
                      )}
                    </span>
                    <b>{moneyOrDash(addon.totalPrice ?? addon.price)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Không có option hoặc addon bổ sung.
              </p>
            )}
          </InfoCard>
          <InfoCard title="Ghi chú nội bộ">
            <div className="space-y-3">
              {b.notes?.map((n) => (
                <div className="rounded-xl bg-zinc-50 p-3" key={n.id}>
                  <p className="text-sm">{n.note}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {n.createdBy || "Admin"} · {dateTime(n.createdAt)}
                  </p>
                </div>
              ))}
              {!b.notes?.length && (
                <p className="text-sm text-zinc-500">Chưa có ghi chú.</p>
              )}
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={noteForm.handleSubmit((v) =>
                noteMutation.mutate(v, { onSuccess: () => noteForm.reset() }),
              )}
            >
              <input
                className="field !mt-0"
                placeholder="Thêm ghi chú…"
                {...noteForm.register("note")}
              />
              <button className="btn-primary" disabled={noteMutation.isPending}>
                Gửi
              </button>
            </form>
            {noteForm.formState.errors.note && (
              <p className="mt-1 text-xs text-red-600">
                {noteForm.formState.errors.note.message}
              </p>
            )}
          </InfoCard>
        </div>
        <div className="space-y-6">
          <InfoCard title="Cập nhật trạng thái">
            <p className="mb-3 text-sm text-zinc-500">
              Bạn chỉ có thể chuyển booking theo đúng quy trình.
            </p>
            {allowed.length ? (
              <div className="space-y-2">
                {allowed.map((s) => (
                  <button
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(s)}
                    key={s}
                    className="flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm font-bold hover:border-red-300 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {statusMutation.isPending &&
                    statusMutation.variables === s ? (
                      <>
                        <span>Đang cập nhật...</span>
                        <Loader2 size={16} className="animate-spin" />
                      </>
                    ) : (
                      <>
                        <StatusBadge status={s} />
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Booking đã ở trạng thái kết thúc.
              </p>
            )}
          </InfoCard>
          <InfoCard title="Tổng chi phí">
            <div className="space-y-3 text-sm">
              {price.total === undefined || pricingSnapshot.pricingPending ? (
                <p className="text-sm text-amber-700">
                  Giá đang chờ được xác nhận.
                </p>
              ) : (
                <>
                  <Detail
                    label="Giá gói"
                    value={moneyOrDash(price.basePrice)}
                  />
                  {Number(price.extraHours || 0) > 0 && (
                    <Detail
                      label={`Giờ phát sinh (${price.extraHours} giờ)`}
                      value={moneyOrDash(price.extraHourAmount)}
                    />
                  )}
                  <Detail
                    label="Phí triển khai"
                    value={moneyOrDash(price.travelFee)}
                  />
                  <Detail
                    label="Tạm tính"
                    value={moneyOrDash(price.subtotal)}
                  />
                  <Detail
                    label={`VAT${price.vatRate != null ? ` (${price.vatRate}%)` : ""}`}
                    value={moneyOrDash(price.vatAmount)}
                  />
                </>
              )}
              <div className="flex justify-between border-t pt-3 text-base font-bold">
                <span>Tổng cộng</span>
                <span className="text-red-600">{moneyOrDash(price.total)}</span>
              </div>
            </div>
          </InfoCard>
          <InfoCard title="Tệp đính kèm">
            {b.uploadedFiles?.length ? (
              b.uploadedFiles.map((f, i) => (
                <a
                  key={i}
                  href={f.url || f.path}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 flex items-center gap-2 rounded-lg bg-zinc-50 p-2 text-sm text-red-600"
                >
                  <FileText size={16} />
                  {f.name || "Mở file"}
                  <ExternalLink className="ml-auto" size={14} />
                </a>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                Khách chưa tải lên tệp nào.
              </p>
            )}
          </InfoCard>
        </div>
      </div>
    </>
  );
}
function BookingEditor({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const save = useSafeMutation(
    (v: any) => adminApi.updateBooking(booking.id, v),
    [["booking", booking.id], ["bookings"]],
  );
  const f = useForm({
    defaultValues: {
      customerName: booking.customerName || "",
      customerPhone: booking.customerPhone || "",
      customerEmail: booking.customerEmail || "",
      eventType: booking.eventType || "",
      eventLocation: booking.eventLocation || "",
      eventDate: booking.eventDate?.slice(0, 10) || "",
    },
  });
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary !px-3 !py-2"
      >
        <Pencil size={15} /> Sửa
      </button>
      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-zinc-950/40 p-4">
          <form
            onSubmit={f.handleSubmit((v) =>
              save.mutate(v, { onSuccess: () => setOpen(false) }),
            )}
            className="w-full max-w-xl rounded-2xl bg-white p-6"
          >
            <div className="flex justify-between">
              <h2 className="font-bold">Chỉnh sửa booking</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Khách hàng">
                <input className="field" {...f.register("customerName")} />
              </Field>
              <Field label="Số điện thoại">
                <input className="field" {...f.register("customerPhone")} />
              </Field>
              <Field label="Email">
                <input className="field" {...f.register("customerEmail")} />
              </Field>
              <Field label="Ngày tổ chức">
                <input
                  type="date"
                  className="field"
                  {...f.register("eventDate")}
                />
              </Field>
            </div>
            <Field label="Loại sự kiện">
              <input className="field" {...f.register("eventType")} />
            </Field>
            <Field label="Địa điểm">
              <textarea className="field" {...f.register("eventLocation")} />
            </Field>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
              >
                Hủy
              </button>
              <button className="btn-primary" disabled={save.isPending}>
                <Save size={16} /> Lưu
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function InfoCard({ title, children }: { title: string; children: any }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="mb-3 flex justify-between gap-5 text-sm last:mb-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-800">
        {value === undefined || value === null || value === "" ? "—" : value}
      </span>
    </div>
  );
}

const serviceSchema = z.object({
  name: z.string().min(2, "Tên dịch vụ tối thiểu 2 ký tự"),
  slug: z.string().min(2, "Slug là bắt buộc"),
  description: z.string().optional(),
  coverImagePath: z.string().optional(),
  startingPrice: z.coerce.number().min(0),
  isActive: z.boolean(),
});
type ServiceForm = z.infer<typeof serviceSchema>;
export function Services() {
  const q = useQuery({ queryKey: ["services"], queryFn: adminApi.services });
  const [editing, setEditing] = useState<Service | null>(null),
    [open, setOpen] = useState(false);
  const save = useSafeMutation(
    (v: { id?: string; data: ServiceForm }) =>
      v.id
        ? adminApi.updateService(v.id, v.data)
        : adminApi.createService(v.data),
    [["services"]],
  );
  const items = array(q.data) as Service[];
  return (
    <>
      <PageHeader
        title="Dịch vụ & Option"
        description="Quản lý các gói dịch vụ, ảnh cover, giá khởi điểm và lựa chọn kèm theo."
        action={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={17} /> Thêm dịch vụ
          </button>
        }
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState title="Chưa có dịch vụ" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((s) => (
            <div className="card overflow-hidden" key={s.id}>
              <CoverManager service={s} />
              <div className="p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{s.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {s.description || "Chưa có mô tả"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <b className="text-red-600">Từ {money(s.startingPrice)}</b>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
                  >
                    {s.isActive ? "Đang hoạt động" : "Tạm ẩn"}
                  </span>
                </div>
                {s.optionGroups?.length ? (
                  <div className="mt-3 text-xs text-zinc-500">
                    {s.optionGroups.length} nhóm tuỳ chọn ·{" "}
                    {s.optionGroups.reduce(
                      (n, g) => n + (g.options?.length || 0),
                      0,
                    )}{" "}
                    lựa chọn
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <ServiceDialog
        open={open}
        value={editing}
        busy={save.isPending}
        onClose={() => setOpen(false)}
        onSave={(data) =>
          save.mutate(
            { id: editing?.id, data },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
      <OptionManager />
    </>
  );
}
function CoverManager({ service }: { service: Service }) {
  const [preview, setPreview] = useState<string | null>(null);
  const upload = useSafeMutation(
    (file: File) => adminApi.uploadServiceCover(service.id, file),
    [["services"]],
  );
  const remove = useSafeMutation(
    () => adminApi.deleteServiceCover(service.id),
    [["services"]],
  );
  const choose = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    upload.mutate(file, { onSuccess: () => setPreview(null) });
  };
  const image = preview || service.coverImagePath;
  return (
    <div className="group relative h-40 bg-zinc-100">
      {image ? (
        <img
          src={image}
          alt={`Cover ${service.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
          <ImageUp size={25} />
          <span className="text-xs font-medium">Chưa có ảnh cover</span>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-zinc-950/45 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <label className="btn bg-white text-zinc-800 hover:bg-zinc-100">
          <ImageUp size={16} />
          {upload.isPending ? "Đang tải…" : "Thay ảnh"}
          <input
            onChange={(e) => choose(e.target.files?.[0])}
            accept="image/jpeg,image/png,image/webp"
            type="file"
            className="sr-only"
            disabled={upload.isPending}
          />
        </label>
        {service.coverImagePath && (
          <button
            onClick={() => remove.mutate(undefined)}
            disabled={remove.isPending}
            className="btn bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 size={16} />
            {remove.isPending ? "Đang xoá…" : "Xoá"}
          </button>
        )}
      </div>
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
  value: Service | null;
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
      coverImagePath: value?.coverImagePath || "",
      startingPrice: value?.startingPrice || 0,
      isActive: value?.isActive ?? true,
    },
  });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-zinc-950/40 p-4">
      <form
        onSubmit={f.handleSubmit(onSave)}
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex justify-between">
          <h2 className="text-lg font-bold">
            {value ? "Sửa dịch vụ" : "Thêm dịch vụ"}
          </h2>
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
        </div>
        <Field label="Mô tả">
          <textarea className="field min-h-20" {...f.register("description")} />
        </Field>
        <Field label="Đường dẫn ảnh cover">
          <input className="field" {...f.register("coverImagePath")} />
        </Field>
        <Field label="Giá khởi điểm">
          <CurrencyInput
            value={f.watch("startingPrice")}
            onChange={(v) => f.setValue("startingPrice", v)}
          />
        </Field>
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" {...f.register("isActive")} /> Đang hoạt động
        </label>
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
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: any;
}) {
  return (
    <label className="block mt-4">
      <span className="label">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
function OptionManager() {
  const q = useQuery({
    queryKey: ["option-groups"],
    queryFn: adminApi.optionGroups,
  });
  const groups = array(q.data);
  const [mode, setMode] = useState<"group" | "option" | null>(null),
    [selected, setSelected] = useState<any>(null);
  const [key, setKey] = useState("duration"),
    [name, setName] = useState(""),
    [price, setPrice] = useState(0),
    [sortOrder, setSortOrder] = useState(0),
    [active, setActive] = useState(true);
  const addGroup = useSafeMutation(
    (v: any) =>
      v.id ? adminApi.updateGroup(v.id, v.data) : adminApi.createGroup(v.data),
    [["option-groups"], ["services"]],
  );
  const addOption = useSafeMutation(
    (v: any) =>
      v.id
        ? adminApi.updateOption(v.id, v.data)
        : adminApi.createOption(v.data),
    [["option-groups"], ["services"]],
  );
  const reset = () => {
    setMode(null);
    setSelected(null);
    setName("");
    setKey("duration");
    setPrice(0);
    setSortOrder(0);
    setActive(true);
  };
  const editGroup = (g: any) => {
    setSelected(g);
    setKey(g.key);
    setName(g.name || "");
    setSortOrder(g.sortOrder || 0);
    setMode("group");
  };
  const editOption = (o: any, g: any) => {
    setSelected({ ...o, groupId: g.id });
    setName(o.name);
    setPrice(o.price || 0);
    setSortOrder(o.sortOrder || 0);
    setActive(o.isActive ?? true);
    setMode("option");
  };
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Nhóm tuỳ chọn</h2>
          <p className="text-sm text-zinc-500">
            duration, print hoặc merchandise · giá option có thể âm.
          </p>
        </div>
        <button onClick={() => setMode("group")} className="btn-secondary">
          <Plus size={16} /> Thêm nhóm
        </button>
      </div>
      {q.isLoading ? (
        <LoadingState rows={2} />
      ) : groups.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {groups.map((g: any) => (
            <div key={g.id} className="card p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{g.name || g.key}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                    {g.key}
                  </p>
                </div>
                <button onClick={() => editGroup(g)} className="text-zinc-500">
                  <Pencil size={15} />
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {g.options?.map((o: any) => (
                  <button
                    onClick={() => editOption(o, g)}
                    key={o.id}
                    className="flex w-full justify-between rounded-lg bg-zinc-50 px-2 py-1.5 text-left text-xs hover:bg-red-50"
                  >
                    <span>{o.name}</span>
                    <b>{money(o.price)}</b>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelected({ groupId: g.id });
                  setMode("option");
                }}
                className="mt-3 text-xs font-bold text-red-600"
              >
                + Thêm option
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có nhóm option" />
      )}
      {mode && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="flex justify-between">
              <h3 className="font-bold">
                {selected?.id ? "Chỉnh sửa" : "Thêm"}{" "}
                {mode === "group" ? "nhóm option" : "option"}
              </h3>
              <button onClick={reset}>
                <X size={18} />
              </button>
            </div>
            {mode === "group" ? (
              <>
                <Field label="Tên hiển thị">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field"
                  />
                </Field>
                <Field label="Group key">
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="field"
                  >
                    <option value="duration">duration</option>
                    <option value="print">print</option>
                    <option value="merchandise">merchandise</option>
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Tên option">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field"
                  />
                </Field>
                <Field label="Giá option (có thể âm)">
                  <CurrencyInput value={price} onChange={setPrice} />
                </Field>
                <Field label="Thứ tự">
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="field"
                  />
                </Field>
                <label className="mt-4 flex gap-2 text-sm font-semibold">
                  <input
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    type="checkbox"
                  />{" "}
                  Đang hoạt động
                </label>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={reset}>
                Hủy
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  mode === "group"
                    ? addGroup.mutate(
                        { id: selected?.id, data: { name, key, sortOrder } },
                        { onSuccess: reset },
                      )
                    : addOption.mutate(
                        {
                          id: selected?.id,
                          data: {
                            groupId: selected?.groupId,
                            name,
                            price,
                            isActive: active,
                            sortOrder,
                          },
                        },
                        { onSuccess: reset },
                      )
                }
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const citySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  isAvailable: z.boolean(),
  defaultTravelFee: z.coerce.number().min(0),
  note: z.string().optional(),
  sortOrder: z.coerce.number().min(0),
});
type CityForm = z.infer<typeof citySchema>;
export function Cities() {
  const q = useQuery({ queryKey: ["cities"], queryFn: adminApi.cities });
  const [editing, setEditing] = useState<City | null>(null),
    [open, setOpen] = useState(false);
  const save = useSafeMutation(
    (v: { id?: string; data: CityForm }) =>
      v.id ? adminApi.updateCity(v.id, v.data) : adminApi.createCity(v.data),
    [["cities"]],
  );
  const cities = array(q.data) as City[];
  return (
    <>
      <PageHeader
        title="Quản lý thành phố"
        description="Thiết lập khu vực phục vụ và phí triển khai mặc định."
        action={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={17} /> Thêm thành phố
          </button>
        }
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !cities.length ? (
        <EmptyState title="Chưa có thành phố" />
      ) : (
        <DataTable>
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              {[
                "Thành phố",
                "Slug",
                "Phí di chuyển mặc định",
                "Ghi chú",
                "Trạng thái",
                "",
              ].map((x) => (
                <th className="px-5 py-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {cities.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-4 font-bold">{c.name}</td>
                <td className="px-5 py-4 text-zinc-500">{c.slug}</td>
                <td className="px-5 py-4">{money(c.defaultTravelFee)}</td>
                <td className="max-w-xs truncate px-5 py-4 text-zinc-500">
                  {c.note || "—"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      c.isAvailable ? "text-emerald-700" : "text-zinc-500"
                    }
                  >
                    {c.isAvailable ? "Phục vụ" : "Tạm dừng"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                    className="text-red-600"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <CityDialog
        open={open}
        city={editing}
        busy={save.isPending}
        onClose={() => setOpen(false)}
        onSave={(d) =>
          save.mutate(
            { id: editing?.id, data: d },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </>
  );
}
function CityDialog({
  open,
  city,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  city: City | null;
  busy: boolean;
  onClose: () => void;
  onSave: (v: CityForm) => void;
}) {
  const f = useForm<CityForm>({
    resolver: zodResolver(citySchema),
    values: {
      name: city?.name || "",
      slug: city?.slug || "",
      isAvailable: city?.isAvailable ?? true,
      defaultTravelFee: city?.defaultTravelFee || 0,
      note: city?.note || "",
      sortOrder: city?.sortOrder || 0,
    },
  });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 p-4">
      <form
        onSubmit={f.handleSubmit(onSave)}
        className="w-full max-w-lg rounded-2xl bg-white p-6"
      >
        <div className="flex justify-between">
          <h2 className="font-bold">
            {city ? "Sửa thành phố" : "Thêm thành phố"}
          </h2>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên thành phố">
            <input className="field" {...f.register("name")} />
          </Field>
          <Field label="Slug">
            <input className="field" {...f.register("slug")} />
          </Field>
          <Field label="Phí triển khai">
            <CurrencyInput
              value={f.watch("defaultTravelFee")}
              onChange={(v) => f.setValue("defaultTravelFee", v)}
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
        <Field label="Ghi chú">
          <textarea className="field" {...f.register("note")} />
        </Field>
        <label className="mt-4 flex gap-2 text-sm font-semibold">
          <input type="checkbox" {...f.register("isAvailable")} /> Đang phục vụ
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button disabled={busy} className="btn-primary">
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

export function Pricing() {
  const pricing = useQuery({
    queryKey: ["pricing"],
    queryFn: adminApi.pricing,
  });
  const services = useQuery({
    queryKey: ["services"],
    queryFn: adminApi.services,
  });
  const cities = useQuery({ queryKey: ["cities"], queryFn: adminApi.cities });
  const [serviceId, setServiceId] = useState(""),
    [cityId, setCityId] = useState("");
  const records = array(pricing.data).filter(
    (p: any) =>
      (!serviceId || p.serviceId === serviceId) &&
      (!cityId || p.cityId === cityId),
  );
  const svcs = array(services.data) as Service[],
    cts = array(cities.data) as City[];
  const put = useSafeMutation(
    (v: any) => adminApi.updatePricing(v),
    [["pricing"]],
  );
  const [editing, setEditing] = useState<any>(null);
  return (
    <>
      <PageHeader
        title="Giá theo thành phố"
        description="Ghi đè giá gói và phí triển khai theo từng khu vực."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <select
          className="field !mt-0"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">Tất cả dịch vụ</option>
          {svcs.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="field !mt-0"
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
        >
          <option value="">Tất cả thành phố</option>
          {cts.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {pricing.isLoading ? (
        <LoadingState />
      ) : pricing.error ? (
        <ErrorState
          message={apiMessage(pricing.error)}
          onRetry={() => pricing.refetch()}
        />
      ) : !records.length ? (
        <EmptyState
          title="Chưa có cấu hình giá theo thành phố"
          description="Chọn dịch vụ và thành phố rồi cập nhật giá để tạo cấu hình."
        />
      ) : (
        <DataTable>
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              {[
                "Dịch vụ",
                "Thành phố",
                "Giá ghi đè",
                "Phí triển khai",
                "Khả dụng",
                "",
              ].map((x) => (
                <th key={x} className="px-5 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.map((p: any) => (
              <tr key={p.id || `${p.serviceId}-${p.cityId}`}>
                <td className="px-5 py-4 font-semibold">
                  {p.service?.name ||
                    svcs.find((x) => x.id === p.serviceId)?.name ||
                    p.serviceId}
                </td>
                <td className="px-5 py-4">
                  {p.city?.name ||
                    cts.find((x) => x.id === p.cityId)?.name ||
                    p.cityId}
                </td>
                <td className="px-5 py-4">{money(p.basePriceOverride)}</td>
                <td className="px-5 py-4">{money(p.travelFeeOverride)}</td>
                <td className="px-5 py-4">{p.isAvailable ? "Có" : "Không"}</td>
                <td className="px-5 py-4">
                  <button
                    className="text-red-600"
                    onClick={() => setEditing(p)}
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {editing && (
        <PricingDialog
          data={editing}
          busy={put.isPending}
          close={() => setEditing(null)}
          save={(v) => put.mutate(v, { onSuccess: () => setEditing(null) })}
        />
      )}
    </>
  );
}
function PricingDialog({
  data,
  busy,
  close,
  save,
}: {
  data: any;
  busy: boolean;
  close: () => void;
  save: (v: any) => void;
}) {
  const [base, setBase] = useState(data.basePriceOverride || 0),
    [travel, setTravel] = useState(data.travelFeeOverride || 0),
    [available, setAvailable] = useState(data.isAvailable ?? true),
    [note, setNote] = useState(data.note || "");
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="font-bold">Cập nhật giá theo thành phố</h2>
        <Field label="Giá dịch vụ ghi đè">
          <CurrencyInput value={base} onChange={setBase} />
        </Field>
        <Field label="Phí triển khai ghi đè">
          <CurrencyInput value={travel} onChange={setTravel} />
        </Field>
        <Field label="Ghi chú">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="field"
          />
        </Field>
        <label className="mt-4 flex gap-2 text-sm font-semibold">
          <input
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            type="checkbox"
          />{" "}
          Có thể phục vụ
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={close}>
            Hủy
          </button>
          <button
            disabled={busy}
            onClick={() =>
              save({
                serviceId: data.serviceId,
                cityId: data.cityId,
                basePriceOverride: base,
                travelFeeOverride: travel,
                isAvailable: available,
                note,
              })
            }
            className="btn-primary"
          >
            Lưu giá
          </button>
        </div>
      </div>
    </div>
  );
}

const configSchema = z.object({
  currency: z.string().min(1),
  vatRate: z.coerce.number().min(0).max(100),
  booking: z.object({
    minNoticeHours: z.coerce.number().min(0),
    successMessage: z.string().min(1),
    defaultNote: z.string().min(1),
  }),
});
type ConfigForm = z.infer<typeof configSchema>;
export function Configuration() {
  const q = useQuery({
    queryKey: ["configuration"],
    queryFn: adminApi.configuration,
  });
  const save = useSafeMutation(
    (v: ConfigForm) => adminApi.updateConfiguration(v),
    [["configuration"]],
  );
  const raw = unwrap(q.data) || {};
  const f = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    values: {
      currency: raw.currency || "VND",
      vatRate: raw.vatRate ?? 8,
      booking: {
        minNoticeHours: raw.booking?.minNoticeHours ?? 24,
        successMessage:
          raw.booking?.successMessage ||
          "Fotobooth.vn đã nhận yêu cầu. Chuyên viên sẽ xác nhận lịch và báo giá cuối cùng.",
        defaultNote:
          raw.booking?.defaultNote ||
          "Giá tạm tính chưa gồm hạng mục setup riêng theo yêu cầu.",
      },
    },
  });
  return (
    <>
      <PageHeader
        title="Cấu hình chung"
        description="Điều chỉnh quy tắc đặt lịch và thông điệp mặc định cho hệ thống."
      />
      {q.isLoading ? (
        <LoadingState rows={6} />
      ) : q.error ? (
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <form
          onSubmit={f.handleSubmit((v) => save.mutate(v))}
          className="max-w-3xl space-y-6"
        >
          <section className="card p-6">
            <h2 className="font-bold">Tài chính</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Đơn vị tiền tệ">
                <input className="field" {...f.register("currency")} />
              </Field>
              <Field label="VAT (%)">
                <input
                  type="number"
                  className="field"
                  {...f.register("vatRate")}
                />
              </Field>
            </div>
          </section>
          <section className="card p-6">
            <h2 className="font-bold">Quy tắc booking</h2>
            <Field label="Thời gian đặt trước tối thiểu (giờ)">
              <input
                type="number"
                className="field"
                {...f.register("booking.minNoticeHours")}
              />
            </Field>
            <Field label="Thông điệp thành công">
              <textarea
                className="field min-h-24"
                {...f.register("booking.successMessage")}
              />
            </Field>
            <Field label="Ghi chú mặc định">
              <textarea
                className="field min-h-24"
                {...f.register("booking.defaultNote")}
              />
            </Field>
          </section>
          <div className="flex justify-end">
            <button disabled={save.isPending} className="btn-primary">
              <Save size={16} /> Lưu cấu hình
            </button>
          </div>
        </form>
      )}
    </>
  );
}
