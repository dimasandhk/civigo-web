import Sidebar from "../components/admin/Sidebar";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen bg-board">
      <Sidebar />
      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
