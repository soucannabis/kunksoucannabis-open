import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TermDocument } from '../editor/TermDocument.jsx';

function useSignatureCanvas(active) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    drawing.current = false;
    hasInk.current = false;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1c2416';
      hasInk.current = false;
    }

    resize();

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const src = e.touches?.[0] || e.changedTouches?.[0] || e;
      return {
        x: src.clientX - r.left,
        y: src.clientY - r.top,
      };
    }

    function start(e) {
      drawing.current = true;
      if (typeof e.pointerId === 'number' && canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    }
    function move(e) {
      if (!drawing.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasInk.current = true;
      e.preventDefault();
    }
    function end(e) {
      drawing.current = false;
      if (typeof e?.pointerId === 'number' && canvas.releasePointerCapture) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    }

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    window.addEventListener('resize', resize);

    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c2416';
    hasInk.current = false;
  }

  function toDataUrl() {
    if (!hasInk.current) return null;
    return canvasRef.current?.toDataURL('image/png') || null;
  }

  return { canvasRef, clear, toDataUrl };
}

function typedNameToDataUrl(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1c2416';
  ctx.font = '48px "Segoe Script", "Brush Script MT", cursive';
  ctx.fillText(name, 24, 95);
  return canvas.toDataURL('image/png');
}

export function SignPage({ api }) {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [method, setMethod] = useState('draw');
  const [typedName, setTypedName] = useState('');
  const [uploadDataUrl, setUploadDataUrl] = useState(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const drawActive = Boolean(payload) && method === 'draw' && !done;
  const { canvasRef, clear, toDataUrl } = useSignatureCanvas(drawActive);

  useEffect(() => {
    api
      .get(`/doc-sign/sign/${token}`)
      .then(async (res) => {
        setPayload(res.data);
        if (res.data?.status === 'completed' || res.data?.already_signed) {
          setAlreadySigned(true);
          setDone(true);
          return;
        }
        await api.post(`/doc-sign/sign/${token}/view`, {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      })
      .catch((err) => setError(err.message));
  }, [api, token]);

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      let signature_image_base64 = null;
      if (method === 'draw') signature_image_base64 = toDataUrl();
      if (method === 'type') {
        if (!typedName.trim()) throw new Error('Digite o nome completo');
        signature_image_base64 = typedNameToDataUrl(typedName.trim());
      }
      if (method === 'upload') {
        if (!uploadDataUrl) throw new Error('Envie uma imagem da assinatura');
        signature_image_base64 = uploadDataUrl;
      }
      await api.post(`/doc-sign/sign/${token}/complete`, {
        method,
        typed_name: method === 'type' ? typedName.trim() : null,
        signature_image_base64,
        consent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setAlreadySigned(false);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Falha ao assinar');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const name = payload?.variables?.responsible_full_name;
    return (
      <div className="shell sign-page">
        <div className="card sign-success">
          <p className="sign-success-kicker">Pronto</p>
          <h1 style={{ marginTop: 0 }}>
            {alreadySigned ? 'Termo já assinado' : 'Termo assinado com sucesso'}
          </h1>
          <p className="muted">
            {alreadySigned
              ? name
                ? `${name}, este termo já foi assinado anteriormente.`
                : 'Este termo já foi assinado anteriormente.'
              : name
                ? `Obrigado, ${name}. Sua assinatura foi registrada.`
                : 'Sua assinatura foi registrada com sucesso.'}
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Você já pode fechar esta página.
          </p>
        </div>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="shell sign-page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="shell sign-page">
        <p className="muted">Carregando termo…</p>
      </div>
    );
  }

  return (
    <div className="shell sign-page">
      <header className="sign-header">
        <p className="muted" style={{ margin: 0 }}>
          {payload.variables?.responsible_full_name || 'Associado'}
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <article className="card term-sheet">
        {payload.logo_url ? (
          <img className="term-logo-preview" src={payload.logo_url} alt="" style={{ marginBottom: '1rem' }} />
        ) : null}
        <h1 className="term-preview-title">{payload.title || 'Termo de adesão'}</h1>
        <TermDocument contentJson={payload.content_json} />
      </article>

      <section className="card sign-panel">
        <h2 style={{ marginTop: 0 }}>Assinatura</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Leia o termo acima e assine abaixo para concluir.
        </p>
        <div className="tabs">
          {['draw', 'type', 'upload'].map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${method === m ? 'active' : ''}`}
              onClick={() => setMethod(m)}
            >
              {m === 'draw' ? 'Desenhar' : m === 'type' ? 'Digitar' : 'Imagem'}
            </button>
          ))}
        </div>
        {method === 'draw' && (
          <>
            <canvas ref={canvasRef} className="signature-pad" />
            <button type="button" className="btn" onClick={clear} style={{ marginTop: 8 }}>
              Limpar
            </button>
          </>
        )}
        {method === 'type' && (
          <div className="field">
            <label htmlFor="typed">Nome completo</label>
            <input id="typed" type="text" value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </div>
        )}
        {method === 'upload' && (
          <div className="field">
            <label htmlFor="up">Foto da assinatura</label>
            <input
              id="up"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setUploadDataUrl(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </div>
        )}
          <label className="sign-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Li e concordo com o termo de adesão.</span>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-loading"
            style={{ marginTop: 12, width: '100%' }}
            disabled={busy || !consent}
            onClick={complete}
          >
            {busy ? (
              <>
                <span className="spinner" aria-hidden />
                Assinando…
              </>
            ) : (
              'Assinar e concluir'
            )}
          </button>
        <button
          type="button"
          className="btn"
          style={{ marginTop: 8, width: '100%' }}
          onClick={() => window.history.back()}
        >
          Voltar
        </button>
      </section>
    </div>
  );
}
