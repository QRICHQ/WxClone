import { cn } from "@/lib/utils"

export function AppIcon({
  large = false,
  iconPath,
}: {
  large?: boolean
  iconPath?: string | null
}) {
  const iconSrc = iconPath || null

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[10px] bg-[#16a34a] text-white shadow-sm ring-1 ring-black/10",
        large ? "size-14" : "size-11",
      )}
    >
      {iconSrc ? (
        <img
          alt=""
          src={iconSrc}
          className={cn("rounded-[10px] object-contain", large ? "size-14" : "size-11")}
        />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          className={large ? "size-10" : "size-8"}
        >
          <path
            fill="currentColor"
            d="M27.2 18.5c-9 0-16.3 5.8-16.3 13 0 4.1 2.4 7.7 6.1 10l-1.3 5.1 5.8-2.9c1.8.5 3.7.8 5.7.8 9 0 16.3-5.8 16.3-13s-7.3-13-16.3-13Zm-5.4 10.1a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Zm10.8 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z"
          />
          <path
            fill="currentColor"
            fillOpacity=".88"
            d="M38.4 30.5c8.1 0 14.7 5.2 14.7 11.7 0 3.6-2.1 6.9-5.4 9l1.1 4.6-5.1-2.6c-1.6.5-3.4.7-5.3.7-8.1 0-14.7-5.2-14.7-11.7s6.6-11.7 14.7-11.7Zm-4.8 8.9a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Zm9.7 0a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z"
          />
        </svg>
      )}
    </div>
  )
}
