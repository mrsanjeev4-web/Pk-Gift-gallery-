"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";

export default function ImageAdjuster() {
  const canvasRef = useRef(null);
  const bgImgRef = useRef(null);
  const fgImgRef = useRef(null);

  const [bgSrc, setBgSrc] = useState("");
  const [fgSrc, setFgSrc] = useState("");

  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1, rot: 0 });
  const [fgTransform, setFgTransform] = useState({ x: 0, y: 0, scale: 1, rot: 0 });

  const [active, setActive] = useState("foreground");
  const draggingRef = useRef({ dragging: false, startX: 0, startY: 0, startTx: null });

  const resizeCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement || document.body;
    const w = Math.max(400, parent.clientWidth || 800);
    c.width = w;
    c.height = Math.round((w * 3) / 4);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // load images
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    if (bgSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        bgImgRef.current = img;
        const scale = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight);
        setBgTransform({ x: c.width / 2, y: c.height / 2, scale, rot: 0 });
      };
      img.src = bgSrc;
    } else {
      bgImgRef.current = null;
    }
  }, [bgSrc]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (fgSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        fgImgRef.current = img;
        const desiredW = c.width * 0.3;
        const scale = desiredW / img.naturalWidth;
        setFgTransform({ x: c.width / 2, y: c.height / 2, scale, rot: 0 });
      };
      img.src = fgSrc;
    } else {
      fgImgRef.current = null;
    }
  }, [fgSrc]);

  // draw loop
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let mounted = true;

    const draw = () => {
      if (!mounted) return;
      ctx.clearRect(0, 0, c.width, c.height);

      if (bgImgRef.current) {
        const img = bgImgRef.current;
        const t = bgTransform;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.rot * Math.PI) / 180);
        ctx.scale(t.scale, t.scale);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
      }

      if (fgImgRef.current) {
        const img = fgImgRef.current;
        const t = fgTransform;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.rot * Math.PI) / 180);
        ctx.scale(t.scale, t.scale);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
      }
    };

    const loop = () => {
      draw();
      requestAnimationFrame(loop);
    };
    loop();
    return () => {
      mounted = false;
    };
  }, [bgTransform, fgTransform, bgSrc, fgSrc]);

  const onPointerDown = (e) => {
    const c = canvasRef.current;
    if (!c) return;
    c.setPointerCapture?.(e.pointerId);
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    draggingRef.current = {
      dragging: true,
      startX: x,
      startY: y,
      startTx: active === "background" ? { ...bgTransform } : { ...fgTransform },
    };
  };

  const onPointerMove = (e) => {
    const d = draggingRef.current;
    if (!d.dragging) return;
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - d.startX;
    const dy = y - d.startY;
    if (active === "background") {
      setBgTransform({ ...d.startTx, x: d.startTx.x + dx, y: d.startTx.y + dy });
    } else {
      setFgTransform({ ...d.startTx, x: d.startTx.x + dx, y: d.startTx.y + dy });
    }
  };

  const onPointerUp = (e) => {
    const c = canvasRef.current;
    if (c) c.releasePointerCapture?.(e.pointerId);
    draggingRef.current.dragging = false;
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    if (e.shiftKey) {
      const d = delta > 0 ? 3 : -3;
      if (active === "background") setBgTransform((t) => ({ ...t, rot: t.rot + d }));
      else setFgTransform((t) => ({ ...t, rot: t.rot + d }));
    } else {
      const factor = 1 - delta * 0.001;
      if (active === "background") setBgTransform((t) => ({ ...t, scale: Math.max(0.01, Math.min(20, t.scale * factor)) }));
      else setFgTransform((t) => ({ ...t, scale: Math.max(0.01, Math.min(20, t.scale * factor)) }));
    }
  };

  const exportPNG = () => {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/jpeg", 0.9); // Use JPEG with 90% quality
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const resetActive = () => {
    const c = canvasRef.current;
    if (!c) return;
    if (active === "background") {
      if (!bgImgRef.current) return;
      setBgTransform({ x: c.width / 2, y: c.height / 2, scale: Math.min(c.width / bgImgRef.current.naturalWidth, c.height / bgImgRef.current.naturalHeight), rot: 0 });
    } else {
      if (!fgImgRef.current) return;
      setFgTransform({ x: c.width / 2, y: c.height / 2, scale: (c.width * 0.3) / fgImgRef.current.naturalWidth, rot: 0 });
    }
  };

  return (
    <div className="adjuster-root">
      <div className="controls">
        <label>
          Upload T-shirt (background)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBgSrc(URL.createObjectURL(f));
            }}
          />
        </label>

        <label>
          Upload Design (foreground)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFgSrc(URL.createObjectURL(f));
            }}
          />
        </label>

        <div className="mode">
          <div>Active:</div>
          <button className={active === "background" ? "active" : ""} onClick={() => setActive("background")}>Background</button>
          <button className={active === "foreground" ? "active" : ""} onClick={() => setActive("foreground")}>Foreground</button>
        </div>

        <div className="sliders">
          <label>
            Scale
            <input
              type="range"
              min="0.01"
              max="20"
              step="0.01"
              value={(active === "background" ? bgTransform.scale : fgTransform.scale) || 1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (active === "background") setBgTransform((t) => ({ ...t, scale: v }));
                else setFgTransform((t) => ({ ...t, scale: v }));
              }}
            />
          </label>

          <label>
            Rotation
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={(active === "background" ? bgTransform.rot : fgTransform.rot) || 0}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (active === "background") setBgTransform((t) => ({ ...t, rot: v }));
                else setFgTransform((t) => ({ ...t, rot: v }));
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8 }} className="actions">
            <button onClick={resetActive}>Reset Active</button>
            <button onClick={() => { setBgSrc(""); setFgSrc(""); }}>Clear</button>
            <button onClick={exportPNG}>Download Merged JPEG</button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12 }}>
            Tip: Drag on the canvas to move the active layer. Use mouse wheel to scale. Hold Shift + wheel to rotate.
          </div>
        </div>
      </div>

      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        />
      </div>
    </div>
  );
}
