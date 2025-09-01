import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  topbarProps?: {
    onSearchChange?: (query: string) => void;
    searchValue?: string;
    filters?: any;
    onFiltersChange?: (filters: any) => void;
  };
}

export function AppLayout({ children, topbarProps }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar {...topbarProps} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
