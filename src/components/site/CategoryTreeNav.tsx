import { useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { CATEGORY_CATALOG, getParentCategory } from "@/lib/categories";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function isActive(selected: string | undefined, name: string) {
  if (!selected) return false;
  if (selected === name) return true;
  return getParentCategory(selected) === name;
}

export function CategoryTreeNav({
  category,
  q,
  className,
  onSelect,
}: {
  category?: string;
  q?: string;
  className?: string;
  onSelect?: () => void;
}) {
  const navigate = useNavigate();
  const setCategory = (c?: string) => {
    navigate({ to: "/products", search: { ...(q ? { q } : {}), category: c, sort: undefined } });
    if (onSelect) {
      onSelect();
    }
  };

  const openDept = category ? getParentCategory(category) : undefined;

  return (
    <div
      className={cn(
        "space-y-0.5 text-sm max-h-[min(60vh,520px)] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setCategory(undefined)}
        className={cn(
          "block w-full text-left px-2 py-2 rounded-md hover:bg-muted font-medium",
          !category && "bg-primary/10 text-primary",
        )}
      >
        All departments
      </button>

      {CATEGORY_CATALOG.map((node) => {
        const hasChildren = (node.children?.length ?? 0) > 0;
        const deptActive = isActive(category, node.name);

        if (!hasChildren) {
          return (
            <button
              key={node.name}
              type="button"
              onClick={() => setCategory(node.name)}
              className={cn(
                "block w-full text-left px-2 py-2 rounded-md hover:bg-muted truncate",
                deptActive && "bg-primary/10 text-primary font-medium",
              )}
            >
              {node.name}
            </button>
          );
        }

        return (
          <Collapsible key={node.name} defaultOpen={openDept === node.name || deptActive}>
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-muted text-left font-medium",
                deptActive && "text-primary",
              )}
            >
              <span className="truncate">{node.name}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-2 pb-1 space-y-0.5 border-l border-muted ml-2">
              <button
                type="button"
                onClick={() => setCategory(node.name)}
                className={cn(
                  "block w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-xs text-muted-foreground",
                  category === node.name && "bg-primary/10 text-primary font-medium",
                )}
              >
                All {node.name}
              </button>
              {node.children!.map((child) => (
                <button
                  key={child}
                  type="button"
                  onClick={() => setCategory(child)}
                  className={cn(
                    "block w-full text-left px-2 py-1.5 rounded-md hover:bg-muted truncate text-xs",
                    category === child && "bg-primary/10 text-primary font-medium",
                  )}
                >
                  {child}
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
