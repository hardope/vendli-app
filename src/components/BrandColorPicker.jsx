"use client";

import { useEffect, useState } from 'react';

// Shared helpers from onboarding
function hexFromHsl(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(1, Math.max(0, s / 100));
  const vv = Math.min(1, Math.max(0, l / 100));

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) {
    r1 = c;
    g1 = x;
  } else if (hh < 120) {
    r1 = x;
    g1 = c;
  } else if (hh < 180) {
    g1 = c;
    b1 = x;
  } else if (hh < 240) {
    g1 = x;
    b1 = c;
  } else if (hh < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const r = (r1 + m) * 255;
  const g = (g1 + m) * 255;
  const b = (b1 + m) * 255;

  const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslFromHex(hex) {
  if (!hex || typeof hex !== 'string') return { h: 24, s: 90, l: 40 };
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (value.length !== 6) return { h: 24, s: 90, l: 40 };

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = max === 0 ? 0 : d / max;

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360) || 0,
    s: Math.round((s || 0) * 100),
    l: Math.round(v * 100),
  };
}

export default function BrandColorPicker({
  id,
  label,
  value,
  defaultSwatch,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState(() => hslFromHex(value || defaultSwatch));
  const [draggingHue, setDraggingHue] = useState(false);

  useEffect(() => {
    setHsl(hslFromHex(value || defaultSwatch));
  }, [value, defaultSwatch]);

  const applyColor = (next) => {
    setHsl(next);
    const hex = hexFromHsl(next.h, next.s, next.l);
    onChange(hex);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor={id}>
        {label}
      </label>
      <div className="relative inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="h-9 w-9 rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          aria-label={label}
        >
          <span className="block h-full w-full" style={{ backgroundColor: value || defaultSwatch }} />
        </button>
        <span className="text-[11px] text-slate-500">Click to fine-tune color</span>

        {open && (
          <div className="absolute z-30 mt-40 left-0 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 space-y-2">
            <label className="block text-[11px] font-medium text-slate-600">{label}</label>
            <div
              className="relative h-32 w-full rounded-xl border border-slate-200 overflow-hidden cursor-crosshair"
              style={{
                backgroundImage:
                  `linear-gradient(to top, black, transparent), linear-gradient(to right, white, ${hexFromHsl(hsl.h, 100, 100)})`,
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = 1 - (e.clientY - rect.top) / rect.height;
                const s = Math.min(100, Math.max(0, x * 100));
                const l = Math.min(100, Math.max(0, y * 100));
                const next = { h: hsl.h, s, l };
                applyColor(next);
                setOpen(false);
              }}
            >
              <div
                className="pointer-events-none absolute h-3 w-3 rounded-full border border-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]"
                style={{
                  left: `${hsl.s}%`,
                  top: `${100 - hsl.l}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
            <div
              className="relative h-5 w-full rounded-full border border-slate-200 overflow-hidden cursor-pointer mt-1"
              style={{
                background:
                  'linear-gradient(to right, red, #ff0, #0f0, #0ff, #00f, #f0f, red)',
              }}
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const h = Math.round(x * 360);
                const next = { ...hsl, h };
                applyColor(next);
                setDraggingHue(true);
              }}
              onMouseMove={(e) => {
                if (!draggingHue) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const h = Math.round(x * 360);
                const next = { ...hsl, h };
                applyColor(next);
              }}
              onMouseUp={() => setDraggingHue(false)}
              onMouseLeave={() => setDraggingHue(false)}
            >
              <div
                className="pointer-events-none absolute top-1/2 h-4 w-4 -mt-[2px] rounded-full border border-slate-900/20 bg-white shadow"
                style={{
                  left: `${(hsl.h / 360) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
            <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Hex</span>
              <input
                id={id}
                name={id}
                type="text"
                value={value}
                onChange={(e) => {
                  const hex = e.target.value;
                  onChange(hex);
                  setHsl(hslFromHex(hex));
                }}
                className="ml-2 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
