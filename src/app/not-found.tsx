import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="flex flex-col items-center text-center space-y-6 max-w-md">
        {/* Highlight 404 - No shadow effect, significantly larger */}
        <div className="relative">
          <h1 className="relative text-[10rem] sm:text-[14rem] leading-none font-black text-brand tracking-tighter">
            404
          </h1>
        </div>
        
        <div className="space-y-2 relative z-10">
          <h2 className="text-3xl font-bold tracking-tight">Halaman Tidak Ditemukan</h2>
          <p className="text-muted-foreground">
            Maaf, halaman yang Anda cari mungkin telah dihapus, namanya diubah, atau sementara tidak tersedia.
          </p>
        </div>

        <div className="pt-4 relative z-10">
          <Button 
            asChild 
            className="h-12 px-8 gap-2 rounded-lg bg-brand text-white text-base font-bold transition-all hover:!bg-brand/80 active:scale-[0.98] shadow-none"
          >
            <Link href="/">
              <Home className="size-4" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
