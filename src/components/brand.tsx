import Image from "next/image";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand compact" : "brand"}>
      <Image
        src="/rundori-logo.png"
        alt="Rundori Shoe Care Studio"
        width={1200}
        height={295}
        priority
      />
    </div>
  );
}
