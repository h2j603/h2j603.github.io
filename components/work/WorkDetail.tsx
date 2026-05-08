'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { WorkWithImages } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';
import { localizedTitle } from '@/lib/i18n';
import { ControlPanel } from '@/components/panel/ControlPanel';
import { publicImageUrl } from '@/lib/works';

export function WorkDetailClient({
  work,
  showArchiveLink,
}: {
  work: WorkWithImages;
  showArchiveLink: boolean;
}) {
  const { lang, toggle: toggleLang } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const krFirst = lang === 'kr';
  const title = localizedTitle(work, lang);

  return (
    <div className="containers">
      <div className="container-1">
        <article className="work-detail">
          <h1 className="work-detail-title">{title}</h1>
          {work.images.length > 0 && (
            <div className="work-detail-images">
              {work.images.map((img) => {
                const src = publicImageUrl(img.storage_path);
                if (img.width && img.height) {
                  return (
                    <Image
                      key={img.id}
                      src={src}
                      alt={img.alt_text ?? ''}
                      width={img.width}
                      height={img.height}
                      sizes="(max-width: 767px) 100vw, calc((100vw - 3 * var(--outer-margin)) * var(--container-ratio) / (var(--container-ratio) + 1))"
                    />
                  );
                }
                // Fallback when dimensions are unknown
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={src}
                    alt={img.alt_text ?? ''}
                    loading="lazy"
                  />
                );
              })}
            </div>
          )}
          {(work.description_kr || work.description_en) && (
            <div className="work-detail-description">
              {krFirst ? (
                <>
                  <p lang="ko">{work.description_kr}</p>
                  <div className="divider" />
                  <p lang="en">{work.description_en}</p>
                </>
              ) : (
                <>
                  <p lang="en">{work.description_en}</p>
                  <div className="divider" />
                  <p lang="ko">{work.description_kr}</p>
                </>
              )}
            </div>
          )}
        </article>
      </div>
      <ControlPanel
        active={new Set()}
        onToggleCategory={() => router.push('/')}
        lang={lang}
        onToggleLang={toggleLang}
        onHome={() => {}}
        showArchiveLink={showArchiveLink}
      />
    </div>
  );
}
