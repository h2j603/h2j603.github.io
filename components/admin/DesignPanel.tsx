'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_SETTINGS, type SiteSettings } from '@/lib/types';
import { settingsToCssVars } from '@/lib/design-tokens';

type Section = 'layout' | 'grid' | 'typography' | 'colors' | 'panel' | 'detail';

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="opacity-60">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="color"
        value={value.startsWith('rgba') ? '#000000' : value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10"
      />
      <span className="flex-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-current px-2 py-1 bg-transparent text-xs w-32"
      />
    </label>
  );
}

export function DesignPanel({ initial }: { initial: SiteSettings }) {
  const [settings, setSettings] = useState<SiteSettings>(initial);
  const [section, setSection] = useState<Section>('layout');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showArchive, setShowArchive] = useState(initial.show_archive_link);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  // Apply CSS variables live to preview iframe + this admin doc.
  useEffect(() => {
    const vars = settingsToCssVars(settings);
    const apply = (root: HTMLElement) => {
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    };
    const docs: HTMLElement[] = [document.documentElement];
    const iframeDoc = previewRef.current?.contentDocument?.documentElement;
    if (iframeDoc) docs.push(iframeDoc);
    docs.forEach(apply);
  }, [settings]);

  // Block leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function update<K extends Section>(
    key: K,
    patch: Partial<SiteSettings[K]>
  ) {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('site_settings')
      .update({
        layout: settings.layout,
        grid: settings.grid,
        typography: settings.typography,
        colors: settings.colors,
        panel: settings.panel,
        detail: settings.detail,
        show_archive_link: showArchive,
      })
      .eq('id', 1);
    if (!error) {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths: ['/'] }),
      });
      setDirty(false);
    }
    setSaving(false);
  }

  function handleReset() {
    if (!confirm('Reset all design parameters to default?')) return;
    setSettings({ ...DEFAULT_SETTINGS, show_archive_link: showArchive });
    setDirty(true);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-4 h-[calc(100vh-9rem)]">
      <div className="border border-current">
        <iframe
          ref={previewRef}
          src="/"
          title="Live preview"
          className="w-full h-full"
        />
      </div>
      <aside className="border border-current p-4 overflow-y-auto flex flex-col gap-4 text-sm">
        <nav className="flex flex-wrap gap-2">
          {(['layout', 'grid', 'typography', 'colors', 'panel', 'detail'] as Section[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={`border border-current px-2 py-1 text-xs ${
                  section === s ? 'bg-black text-white' : ''
                }`}
              >
                {s}
              </button>
            )
          )}
        </nav>

        {section === 'layout' && (
          <div className="flex flex-col gap-3">
            <Slider
              label="Container ratio"
              min={3}
              max={7}
              value={settings.layout.containerRatio}
              onChange={(n) => update('layout', { containerRatio: n })}
            />
            <Slider
              label="Mobile ratio"
              min={2}
              max={5}
              value={settings.layout.mobileRatio}
              onChange={(n) => update('layout', { mobileRatio: n })}
            />
            <Slider
              label="Outer margin"
              min={0}
              max={80}
              value={settings.layout.outerMargin}
              unit="px"
              onChange={(n) => update('layout', { outerMargin: n })}
            />
            <label className="flex flex-col gap-1">
              Container 1 position
              <select
                value={settings.layout.container1Position}
                onChange={(e) =>
                  update('layout', {
                    container1Position: e.target.value as 'left' | 'right',
                  })
                }
                className="border border-current px-2 py-1 bg-transparent"
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
        )}

        {section === 'grid' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              Grid size
              <select
                value={settings.grid.size}
                onChange={(e) => update('grid', { size: Number(e.target.value) })}
                className="border border-current px-2 py-1 bg-transparent"
              >
                <option value={7}>7 × 7</option>
                <option value={9}>9 × 9</option>
                <option value={11}>11 × 11</option>
              </select>
            </label>
            <Slider
              label="Cell text size"
              min={50}
              max={95}
              value={settings.grid.cellTextSize}
              unit="%"
              onChange={(n) => update('grid', { cellTextSize: n })}
            />
            <Slider
              label="Cell border width"
              min={0}
              max={3}
              value={settings.grid.cellBorderWidth}
              unit="px"
              onChange={(n) => update('grid', { cellBorderWidth: n })}
            />
            <Slider
              label="Cell gap"
              min={0}
              max={4}
              value={settings.grid.cellGap}
              unit="px"
              onChange={(n) => update('grid', { cellGap: n })}
            />
            <label className="flex flex-col gap-1">
              Empty cell style
              <select
                value={settings.grid.emptyCellStyle}
                onChange={(e) =>
                  update('grid', {
                    emptyCellStyle: e.target.value as 'lines' | 'none' | 'dotted',
                  })
                }
                className="border border-current px-2 py-1 bg-transparent"
              >
                <option value="lines">Lines only</option>
                <option value="none">No border</option>
                <option value="dotted">Dotted</option>
              </select>
            </label>
          </div>
        )}

        {section === 'typography' && (
          <div className="flex flex-col gap-3">
            <Slider
              label="Base font size"
              min={12}
              max={20}
              value={settings.typography.baseFontSize}
              unit="px"
              onChange={(n) => update('typography', { baseFontSize: n })}
            />
            <Slider
              label="Line height"
              min={1.2}
              max={2}
              step={0.05}
              value={settings.typography.lineHeight}
              onChange={(n) => update('typography', { lineHeight: n })}
            />
          </div>
        )}

        {section === 'colors' && (
          <div className="flex flex-col gap-2">
            <ColorInput
              label="Background"
              value={settings.colors.background}
              onChange={(v) => update('colors', { background: v })}
            />
            <ColorInput
              label="Text"
              value={settings.colors.text}
              onChange={(v) => update('colors', { text: v })}
            />
            <ColorInput
              label="Border"
              value={settings.colors.border}
              onChange={(v) => update('colors', { border: v })}
            />
            <ColorInput
              label="Category active bg"
              value={settings.colors.categoryActive}
              onChange={(v) => update('colors', { categoryActive: v })}
            />
            <ColorInput
              label="Category active text"
              value={settings.colors.categoryActiveText}
              onChange={(v) => update('colors', { categoryActiveText: v })}
            />
            <ColorInput
              label="Hover"
              value={settings.colors.hover}
              onChange={(v) => update('colors', { hover: v })}
            />
          </div>
        )}

        {section === 'panel' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              Active style
              <select
                value={settings.panel.activeStyle}
                onChange={(e) =>
                  update('panel', {
                    activeStyle: e.target.value as 'fill' | 'outline' | 'invert',
                  })
                }
                className="border border-current px-2 py-1 bg-transparent"
              >
                <option value="fill">Fill</option>
                <option value="outline">Outline</option>
                <option value="invert">Invert</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Corner decoration
              <select
                value={settings.panel.cornerDecoration}
                onChange={(e) =>
                  update('panel', {
                    cornerDecoration: e.target.value as
                      | 'none'
                      | 'circled-numerals'
                      | 'asterisk'
                      | 'custom',
                  })
                }
                className="border border-current px-2 py-1 bg-transparent"
              >
                <option value="none">None</option>
                <option value="circled-numerals">㊀㊁㊂㊃</option>
                <option value="asterisk">✽</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {settings.panel.cornerDecoration === 'custom' && (
              <label className="flex flex-col gap-1">
                Corner custom text
                <input
                  value={settings.panel.cornerCustom}
                  onChange={(e) => update('panel', { cornerCustom: e.target.value })}
                  className="border border-current px-2 py-1 bg-transparent"
                />
              </label>
            )}
          </div>
        )}

        {section === 'detail' && (
          <div className="flex flex-col gap-3">
            <Slider
              label="Image gap"
              min={16}
              max={96}
              value={settings.detail.imageGap}
              unit="px"
              onChange={(n) => update('detail', { imageGap: n })}
            />
            <Slider
              label="Title to image gap"
              min={16}
              max={128}
              value={settings.detail.titleToImage}
              unit="px"
              onChange={(n) => update('detail', { titleToImage: n })}
            />
            <Slider
              label="Image to description gap"
              min={16}
              max={128}
              value={settings.detail.imageToDescription}
              unit="px"
              onChange={(n) => update('detail', { imageToDescription: n })}
            />
            <Slider
              label="Description line height"
              min={1.4}
              max={2.2}
              step={0.05}
              value={settings.detail.descriptionLineHeight}
              onChange={(n) => update('detail', { descriptionLineHeight: n })}
            />
          </div>
        )}

        <hr className="my-2 opacity-30" />

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showArchive}
            onChange={(e) => {
              setShowArchive(e.target.checked);
              setDirty(true);
            }}
          />
          Show archive link in footer
        </label>

        <div className="flex gap-2 sticky bottom-0 bg-[var(--color-bg)] pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="border border-current px-3 py-1 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="border border-current px-3 py-1"
          >
            Reset to default
          </button>
        </div>
      </aside>
    </div>
  );
}
