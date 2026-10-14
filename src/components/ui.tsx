import { AlertCircle, Loader2, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type { BookingStatus } from "../types";

const statusStyle: Record<BookingStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-600/20",
  CONTACTED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  QUOTED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DEPOSIT_PENDING: "bg-orange-50 text-orange-700 ring-orange-600/20",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  COMPLETED: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20",
};
const statusName: Record<BookingStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUOTED: "Đã báo giá",
  DEPOSIT_PENDING: "Chờ cọc",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};
export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle[status] || statusStyle.NEW}`}
    >
      {statusName[status] || status}
    </span>
  );
}
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-red-600">
          Fotobooth.vn
        </p>
        <h1 className="font-display text-3xl text-zinc-900">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className={`card flex flex-col items-center justify-center gap-3 p-8 text-center ${rows > 6 ? "min-h-80" : "min-h-52"}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      <div>
        <h3 className="font-bold text-zinc-800">Đang tải dữ liệu</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Vui lòng chờ trong giây lát…
        </p>
      </div>
    </div>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu",
  description = "Dữ liệu sẽ hiển thị tại đây khi có cập nhật.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <Search className="mb-3 h-8 w-8 text-zinc-300" />
      <h3 className="font-bold text-zinc-800">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card flex min-h-52 flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
      <h3 className="font-bold text-zinc-800">Không thể tải dữ liệu</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        {children}
      </table>
    </div>
  );
}
export function CurrencyInput({
  value,
  onChange,
  name,
}: {
  value?: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  return (
    <div className="relative">
      <input
        name={name}
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field pr-12"
      />
      <span className="pointer-events-none absolute right-3 top-3 text-xs font-bold text-zinc-400">
        VND
      </span>
    </div>
  );
}
export function ConfirmDialog({
  open,
  title = "Xác nhận thay đổi",
  description,
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean;
  title?: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <button onClick={onClose} className="float-right text-zinc-400">
          <X size={18} />
        </button>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button disabled={busy} className="btn-primary" onClick={onConfirm}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
