'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { Work } from '@/lib/types';

function Row({ work }: { work: Work }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: work.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleDelete() {
    if (!confirm(`Delete "${work.title_kr}"?`)) return;
    const supabase = createClient();
    await supabase.from('works').delete().eq('id', work.id);
    router.refresh();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[2rem_1fr_8rem_6rem_8rem] items-center gap-4 px-3 py-2 border border-current text-sm"
    >
      <span {...attributes} {...listeners} className="cursor-grab select-none opacity-60">
        ⋮⋮
      </span>
      <div className="flex flex-col">
        <span>{work.title_kr}</span>
        <span className="opacity-60 text-xs">{work.title_en}</span>
      </div>
      <span className="opacity-70">{work.categories.join(' / ')}</span>
      <span className={work.published ? '' : 'opacity-50'}>
        {work.published ? 'published' : 'draft'}
      </span>
      <div className="flex gap-2 justify-end text-xs">
        <Link href={`/admin/works/${work.id}/edit`} className="underline">
          Edit
        </Link>
        <button type="button" onClick={handleDelete} className="underline">
          Delete
        </button>
      </div>
    </div>
  );
}

export function WorkOrderEditor({ initialWorks }: { initialWorks: Work[] }) {
  const [works, setWorks] = useState(initialWorks);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = works.findIndex((w) => w.id === active.id);
    const newIndex = works.findIndex((w) => w.id === over.id);
    const reordered = arrayMove(works, oldIndex, newIndex);
    setWorks(reordered);

    setSaving(true);
    const supabase = createClient();
    await Promise.all(
      reordered.map((w, idx) =>
        supabase.from('works').update({ order_index: idx + 1 }).eq('id', w.id)
      )
    );
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paths: ['/'] }),
    });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {saving && <p className="text-xs opacity-60">Saving order…</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={works.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {works.map((w) => (
              <Row key={w.id} work={w} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
