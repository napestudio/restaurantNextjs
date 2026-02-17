"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { SerializedHomePageLink } from "@/actions/HomePageLinks";
import { SortableLinkItem } from "./sortable-link-item";

interface SortableLinkListProps {
  links: SerializedHomePageLink[];
  onReorder: (links: SerializedHomePageLink[]) => void;
  onEdit: (link: SerializedHomePageLink) => void;
  onLinkUpdated: (link: SerializedHomePageLink) => void;
  onLinkDeleted: (id: string) => void;
}

export function SortableLinkList({
  links,
  onReorder,
  onEdit,
  onLinkUpdated,
  onLinkDeleted,
}: SortableLinkListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over.id);

      const reordered = arrayMove(links, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {links.map((link) => (
            <SortableLinkItem
              key={link.id}
              link={link}
              onEdit={() => onEdit(link)}
              onLinkUpdated={onLinkUpdated}
              onLinkDeleted={onLinkDeleted}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
