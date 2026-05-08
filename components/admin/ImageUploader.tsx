'use client';

import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { WorkImage } from '@/lib/types';
import { publicImageUrl } from '@/lib/works';

interface Props {
  workId: string;
  images: WorkImage[];
  onChange: (images: WorkImage[]) => void;
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Could not read image dimensions'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function Tile({
  image,
  onAlt,
  onDelete,
}: {
  image: WorkImage;
  onAlt: (id: string, alt: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-current p-2 flex flex-col gap-2 text-xs"
    >
      <div className="flex items-center justify-between">
        <span {...attributes} {...listeners} className="cursor-grab opacity-60">
          ⋮⋮ #{image.order_index}
        </span>
        <button
          type="button"
          onClick={() => onDelete(image.id)}
          className="underline text-xs"
        >
          Delete
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={publicImageUrl(image.storage_path)}
        alt={image.alt_text ?? ''}
        className="w-full h-32 object-cover"
      />
      <input
        value={image.alt_text ?? ''}
        onChange={(e) => onAlt(image.id, e.target.value)}
        placeholder="Alt text (optional)"
        className="border border-current px-2 py-1 bg-transparent"
      />
    </div>
  );
}

export function ImageUploader({ workId, images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    let nextOrder =
      images.reduce((max, i) => Math.max(max, i.order_index), 0) + 1;
    const created: WorkImage[] = [];

    for (const file of Array.from(files)) {
      try {
        const dims = await loadImageDimensions(file).catch(() => null);
        const ext = file.name.split('.').pop() ?? 'jpg';
        const safeName = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9-_]/g, '-');
        const path = `${workId}/${nextOrder}_${Date.now()}_${safeName}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('work-images')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;

        const { data, error: insErr } = await supabase
          .from('work_images')
          .insert({
            work_id: workId,
            storage_path: path,
            order_index: nextOrder,
            alt_text: null,
            width: dims?.width ?? null,
            height: dims?.height ?? null,
          })
          .select('*')
          .single();
        if (insErr) throw insErr;

        created.push(data as WorkImage);
        nextOrder++;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }

    onChange([...images, ...created]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this image?')) return;
    const target = images.find((i) => i.id === id);
    if (!target) return;
    const supabase = createClient();
    await supabase.storage.from('work-images').remove([target.storage_path]);
    await supabase.from('work_images').delete().eq('id', id);
    onChange(images.filter((i) => i.id !== id));
  }

  function handleAlt(id: string, alt: string) {
    onChange(images.map((i) => (i.id === id ? { ...i, alt_text: alt } : i)));
    const supabase = createClient();
    supabase.from('work_images').update({ alt_text: alt }).eq('id', id).then();
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex).map((img, idx) => ({
      ...img,
      order_index: idx + 1,
    }));
    onChange(reordered);
    const supabase = createClient();
    await Promise.all(
      reordered.map((i) =>
        supabase.from('work_images').update({ order_index: i.order_index }).eq('id', i.id)
      )
    );
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border border-dashed border-current p-6 text-center text-sm"
      >
        Drag & drop images, or{' '}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="underline"
        >
          choose files
        </button>
        {uploading && <p className="opacity-60 mt-2">Uploading…</p>}
        {error && <p className="text-red-700 mt-2">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <Tile
                  key={img.id}
                  image={img}
                  onAlt={handleAlt}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
