'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Category, Work, WorkImage } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { ensureUniqueSlug, slugify } from '@/lib/slug';
import { ImageUploader } from './ImageUploader';

interface Props {
  initial?: Work;
  initialImages?: WorkImage[];
  mode: 'new' | 'edit';
}

export function WorkForm({ initial, initialImages = [], mode }: Props) {
  const router = useRouter();
  const [titleKr, setTitleKr] = useState(initial?.title_kr ?? '');
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [descriptionKr, setDescriptionKr] = useState(initial?.description_kr ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initial?.description_en ?? '');
  const [categories, setCategories] = useState<Category[]>(initial?.categories ?? ['W']);
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [published, setPublished] = useState(initial?.published ?? false);
  const [images, setImages] = useState<WorkImage[]>(initialImages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from English title until user edits it.
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(titleEn));
    }
  }, [titleEn, slugTouched]);

  const krCount = useMemo(() => Array.from(titleKr).length, [titleKr]);
  const enCount = useMemo(() => Array.from(titleEn).length, [titleEn]);

  function toggleCategory(c: Category) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titleKr.trim() || !titleEn.trim()) {
      setError('Both KR and EN titles are required.');
      return;
    }
    if (categories.length === 0) {
      setError('Pick at least one category.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Ensure slug uniqueness if changed.
    let finalSlug = slugify(slug) || slugify(titleEn) || 'work';
    if (mode === 'new' || finalSlug !== initial?.slug) {
      finalSlug = await ensureUniqueSlug(finalSlug, async (s) => {
        const { data } = await supabase
          .from('works')
          .select('id')
          .eq('slug', s)
          .maybeSingle();
        return Boolean(data && data.id !== initial?.id);
      });
    }

    let finalOrderIndex = orderIndex;
    if (mode === 'new' && !orderIndex) {
      const { data: last } = await supabase
        .from('works')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      finalOrderIndex = (last?.order_index ?? 0) + 1;
    }

    const payload = {
      title_kr: titleKr,
      title_en: titleEn,
      slug: finalSlug,
      description_kr: descriptionKr,
      description_en: descriptionEn,
      categories,
      order_index: finalOrderIndex,
      published,
    };

    let workId = initial?.id;
    if (mode === 'new') {
      const { data, error } = await supabase
        .from('works')
        .insert(payload)
        .select('id')
        .single();
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      workId = data!.id;
    } else {
      const { error } = await supabase.from('works').update(payload).eq('id', initial!.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        paths: ['/', `/works/${finalSlug}`, ...(initial?.slug && initial.slug !== finalSlug ? [`/works/${initial.slug}`] : [])],
      }),
    });

    setSaving(false);
    if (mode === 'new' && workId) {
      router.push(`/admin/works/${workId}/edit`);
    } else {
      router.push('/admin');
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl text-sm">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span>
            Title (KR) <span className="opacity-60">— {krCount} / 9</span>
            {krCount > 9 && (
              <span className="text-red-700 ml-1">over 9 chars; will be truncated with …</span>
            )}
          </span>
          <input
            value={titleKr}
            onChange={(e) => setTitleKr(e.target.value)}
            required
            className="border border-current px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>
            Title (EN) <span className="opacity-60">— {enCount} / 9</span>
            {enCount > 9 && (
              <span className="text-red-700 ml-1">over 9 chars; will be truncated with …</span>
            )}
          </span>
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            required
            className="border border-current px-3 py-2 bg-transparent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        Slug
        <input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="border border-current px-3 py-2 bg-transparent"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend>Categories</legend>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCategory(c)}
              className={`border border-current px-3 py-1 ${
                categories.includes(c) ? 'bg-black text-white' : ''
              }`}
            >
              {c === 'ETC' ? '+' : c}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          Description (KR)
          <textarea
            value={descriptionKr}
            onChange={(e) => setDescriptionKr(e.target.value)}
            rows={6}
            className="border border-current px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          Description (EN)
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={6}
            className="border border-current px-3 py-2 bg-transparent"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          Order index
          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            className="border border-current px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Published
        </label>
      </div>

      {mode === 'edit' && initial && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Images</h3>
          <ImageUploader
            workId={initial.id}
            images={images}
            onChange={setImages}
          />
        </div>
      )}

      {error && <p className="text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="border border-current px-4 py-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="border border-current px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
