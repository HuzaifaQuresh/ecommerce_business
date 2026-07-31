import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { CATEGORY_CATALOG, type CategoryNode } from "@/lib/categories";
import { cn } from "@/lib/utils";

const CLOSE_MS = 100;

function CategoryNavItem({ dept }: { dept: CategoryNode }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const children = dept.children ?? [];
  const hasSubs = children.length > 0;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.left, top: rect.bottom });
  }, []);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!hasSubs) return;
    updatePosition();
    setOpen(true);
  }, [hasSubs, updatePosition]);

  const hide = useCallback(() => {
    timer.current = setTimeout(() => setOpen(false), CLOSE_MS);
  }, []);

  const cancelHide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const dropdown =
    open &&
    hasSubs &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed z-[100] pt-1"
        style={{ left: pos.left, top: pos.top }}
        onMouseEnter={cancelHide}
        onMouseLeave={hide}
      >
        <div
          className={cn(
            "rounded-lg border border-slate-200 bg-white text-slate-800 shadow-xl ring-1 ring-black/5 py-2 animate-in fade-in-0 zoom-in-95 duration-150",
            children.length > 8 ? "min-w-[280px] max-w-[320px]" : "min-w-[200px] max-w-[260px]",
          )}
        >
          <Link
            to="/products"
            search={{ category: dept.name } as never}
            className="block px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 border-b border-slate-100 mb-1"
          >
            All {dept.name}
          </Link>
          <ul
            className={cn(
              "max-h-[min(70vh,360px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1",
              children.length > 8 && "columns-2 gap-x-2",
            )}
          >
            {children.map((sub) => (
              <li key={sub} className="break-inside-avoid">
                <Link
                  to="/products"
                  search={{ category: sub } as never}
                  className="block rounded-md px-3 py-2 text-xs text-slate-500 hover:text-primary hover:bg-slate-50 transition"
                >
                  {sub}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div ref={triggerRef} className="relative shrink-0" onMouseEnter={show} onMouseLeave={hide}>
        <Link
          to="/products"
          search={{ category: dept.name } as never}
          className={cn(
            "inline-flex items-center gap-1 px-3 h-10 text-xs font-semibold whitespace-nowrap transition",
            open
              ? "text-primary bg-slate-50"
              : "text-slate-600 hover:text-primary hover:bg-slate-50",
          )}
        >
          {dept.name}
          {hasSubs && (
            <ChevronDown
              className={cn(
                "h-3 w-3 opacity-70 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          )}
        </Link>
      </div>
      {dropdown}
    </>
  );
}

function MoreCategoriesDropdown({ depts }: { depts: CategoryNode[] }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ right: 0, top: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ right: window.innerWidth - rect.right, top: rect.bottom });
  }, []);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    timer.current = setTimeout(() => setOpen(false), CLOSE_MS);
  }, []);

  const cancelHide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const dropdown =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed z-[100] pt-1"
        style={{ right: pos.right, top: pos.top }}
        onMouseEnter={cancelHide}
        onMouseLeave={hide}
      >
        <div className="rounded-lg border border-slate-200 bg-white text-slate-800 shadow-xl ring-1 ring-black/5 p-5 animate-in fade-in-0 zoom-in-95 duration-150 w-[580px] max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="grid grid-cols-2 gap-6">
            {depts.map((dept) => (
              <div key={dept.name} className="space-y-1.5">
                <Link
                  to="/products"
                  search={{ category: dept.name } as never}
                  className="block text-xs font-bold text-slate-800 hover:text-primary transition"
                >
                  {dept.name}
                </Link>
                {dept.children && dept.children.length > 0 && (
                  <ul className="space-y-1">
                    {dept.children.slice(0, 5).map((sub) => (
                      <li key={sub}>
                        <Link
                          to="/products"
                          search={{ category: sub } as never}
                          className="block text-[11px] text-slate-500 hover:text-primary transition"
                        >
                          {sub}
                        </Link>
                      </li>
                    ))}
                    {dept.children.length > 5 && (
                      <li>
                        <Link
                          to="/products"
                          search={{ category: dept.name } as never}
                          className="block text-[11px] text-primary hover:underline font-medium"
                        >
                          + {dept.children.length - 5} more
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div ref={triggerRef} className="relative shrink-0" onMouseEnter={show} onMouseLeave={hide}>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 px-3 h-10 text-xs font-semibold whitespace-nowrap transition",
            open
              ? "text-primary bg-slate-50"
              : "text-slate-600 hover:text-primary hover:bg-slate-50",
          )}
        >
          More Categories
          <ChevronDown
            className={cn(
              "h-3 w-3 opacity-70 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {dropdown}
    </>
  );
}

export function CategoryNavBar() {
  const mainDepts = CATEGORY_CATALOG.slice(0, 5);
  const remainingDepts = CATEGORY_CATALOG.slice(5);

  return (
    <div className="hidden md:block border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-10 items-stretch gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-none">
          <Link
            to="/products"
            search={{}}
            className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 hover:text-primary whitespace-nowrap shrink-0 transition h-10"
          >
            All
          </Link>
          {mainDepts.map((dept) => (
            <CategoryNavItem key={dept.name} dept={dept} />
          ))}
          {remainingDepts.length > 0 && <MoreCategoriesDropdown depts={remainingDepts} />}
        </div>
      </div>
    </div>
  );
}
