import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KUNK_LOGO_EXPORT_SIZE, KUNK_LOGO_FRAME_SIZE } from '@kunk/config';

const STAGE = 280;
const SAFE_INSET = 28;

/**
 * Assistente de enquadramento: arrasta/zoom para caber a logo no quadrado fixo.
 * @param {{ src: string, onConfirm: (blob: Blob) => void|Promise<void>, onCancel: () => void, busy?: boolean }} props
 */
export function LogoCropModal({ src, onConfirm, onCancel, busy = false }) {
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [minZoom, setMinZoom] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setNatural({ w, h });
      // Cover the stage so there are no empty corners by default
      const cover = Math.max(STAGE / w, STAGE / h);
      setMinZoom(cover);
      setZoom(cover);
      setOffset({ x: (STAGE - w * cover) / 2, y: (STAGE - h * cover) / 2 });
      imgRef.current = img;
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = src;
  }, [src]);

  const clampOffset = useCallback((x, y, z, nw, nh) => {
    const iw = nw * z;
    const ih = nh * z;
    let nx = x;
    let ny = y;
    if (iw <= STAGE) nx = (STAGE - iw) / 2;
    else {
      nx = Math.min(0, Math.max(STAGE - iw, x));
    }
    if (ih <= STAGE) ny = (STAGE - ih) / 2;
    else {
      ny = Math.min(0, Math.max(STAGE - ih, y));
    }
    return { x: nx, y: ny };
  }, []);

  function onZoomChange(nextZoom) {
    const z = Math.max(minZoom, Math.min(minZoom * 4, Number(nextZoom)));
    const cx = STAGE / 2;
    const cy = STAGE / 2;
    const scale = z / zoom;
    const nx = cx - (cx - offset.x) * scale;
    const ny = cy - (cy - offset.y) * scale;
    setZoom(z);
    setOffset(clampOffset(nx, ny, z, natural.w, natural.h));
  }

  function onPointerDown(e) {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(
      clampOffset(
        dragRef.current.ox + dx,
        dragRef.current.oy + dy,
        zoom,
        natural.w,
        natural.h,
      ),
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = KUNK_LOGO_EXPORT_SIZE;
    canvas.height = KUNK_LOGO_EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = KUNK_LOGO_EXPORT_SIZE / STAGE;
    ctx.drawImage(
      img,
      offset.x * scale,
      offset.y * scale,
      natural.w * zoom * scale,
      natural.h * zoom * scale,
    );
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))),
        'image/png',
      );
    });
    await onConfirm(blob);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Enquadrar logo">
      <div className="modal-card logo-crop-modal">
        <h2 style={{ marginTop: 0 }}>Enquadrar logo</h2>
        <p className="muted">
          Arraste e ajuste o zoom para encaixar a logo no quadrado (
          {KUNK_LOGO_FRAME_SIZE}×{KUNK_LOGO_FRAME_SIZE}px no menu). A área tracejada é a margem
          recomendada.
        </p>

        <div
          className="logo-crop-stage"
          style={{ width: STAGE, height: STAGE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {ready ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="logo-crop-image"
              style={{
                width: natural.w * zoom,
                height: natural.h * zoom,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : (
            <div className="muted" style={{ padding: '1rem' }}>Carregando imagem…</div>
          )}
          <div className="logo-crop-frame" aria-hidden />
          <div
            className="logo-crop-safe"
            style={{
              inset: SAFE_INSET,
            }}
            aria-hidden
          />
        </div>

        <label className="field" style={{ marginTop: '1rem' }}>
          <span>Zoom</span>
          <input
            type="range"
            min={minZoom}
            max={minZoom * 4}
            step={0.01}
            value={zoom}
            disabled={!ready || busy}
            onChange={(e) => onZoomChange(e.target.value)}
          />
        </label>

        <div className="appearance-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={handleConfirm}>
            {busy ? 'Enviando…' : 'Usar este enquadramento'}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
