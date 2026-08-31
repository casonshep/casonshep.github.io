"use client";

import { useEffect, useRef } from "react";
import { BACKDROP, TERMINAL } from "./visualConfig";
import { asciifyFrame, measureAsciiGrid } from "./ascii";

const VIDEO_SRC = "/bg.mp4";
const SECTION2_SRC = "/section2.jpg";

export default function VideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Video-grid canvases (BACKDROP resolution).
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    const videoCells = document.createElement("canvas");
    const videoCtx = videoCells.getContext("2d");
    const blendCells = document.createElement("canvas");
    const blendCtx = blendCells.getContext("2d");

    // Terminal-grid canvases (TERMINAL resolution — may differ from video).
    const termOff = document.createElement("canvas");
    const termOffCtx = termOff.getContext("2d", { willReadFrequently: true });
    const termCells = document.createElement("canvas");
    const termCellsCtx = termCells.getContext("2d");
    const termOut = document.createElement("canvas");
    const termOutCtx = termOut.getContext("2d");

    if (
      !offCtx || !videoCtx || !blendCtx ||
      !termOffCtx || !termCellsCtx || !termOutCtx
    ) return;

    const blendRows = TERMINAL.blendRows;
    const fontPx = BACKDROP.asciiFontPx;
    const tFontPx = TERMINAL.asciiFontPx || fontPx;

    const sectionImg = new Image();
    sectionImg.src = SECTION2_SRC;

    let cols = 0;
    let rows = 0;
    let tCols = 0;
    let tRows = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const grid = measureAsciiGrid(ctx, fontPx, canvas.width, canvas.height);
      cols = grid.cols;
      rows = grid.rows;
      off.width = cols;
      off.height = rows;
      videoCells.width = cols;
      videoCells.height = Math.ceil(rows * BACKDROP.videoScreens);
      blendCells.width = cols;
      blendCells.height = rows + blendRows;

      const tGrid = measureAsciiGrid(ctx, tFontPx, canvas.width, canvas.height);
      tCols = tGrid.cols;
      tRows = tGrid.rows;
      termOff.width = tCols;
      termOff.height = tRows;
      termCells.width = tCols;
      termCells.height = tRows;
      termOut.width = canvas.width;
      termOut.height = canvas.height;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawVideoCells = (): boolean => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return false;

      const cropSy = Math.round(vh * BACKDROP.videoCropTop);
      const cropSh = Math.round(vh * (1 - BACKDROP.videoCropTop - BACKDROP.videoCropBottom));
      if (cropSh <= 0) return false;
      const croppedAspect = vw / cropSh;

      const targetAspect =
        canvas.width / (canvas.height * BACKDROP.videoScreens);

      videoCtx.fillStyle = BACKDROP.videoFillColor;
      videoCtx.fillRect(0, 0, cols, videoCells.height);

      const fit = BACKDROP.videoFit;

      let cDx = 0, cDy = 0, cDw = cols, cDh = videoCells.height;
      if (croppedAspect < targetAspect) {
        cDw = Math.round(videoCells.height * croppedAspect / BACKDROP.videoScreens);
        cDx = Math.round((cols - cDw) / 2);
      } else {
        cDh = Math.round((cols / croppedAspect) * BACKDROP.videoScreens);
        cDy = Math.round((videoCells.height - cDh) / 2);
      }

      let covSx = 0, covSy = 0, covSw = vw, covSh = cropSh;
      if (croppedAspect > targetAspect) {
        covSw = cropSh * targetAspect;
        covSx = (vw - covSw) / 2;
      } else {
        covSh = vw / targetAspect;
        covSy = (cropSh - covSh) / 2;
      }

      const dx = Math.round(cDx * (1 - fit));
      const dy = Math.round(cDy * (1 - fit));
      const dw = Math.round(cDw + (cols - cDw) * fit);
      const dh = Math.round(cDh + (videoCells.height - cDh) * fit);
      const sx = Math.round(covSx * fit);
      const sy = cropSy + Math.round(covSy * fit);
      const sw = Math.round(vw - (vw - covSw) * fit);
      const sh = Math.round(cropSh - (cropSh - covSh) * fit);

      videoCtx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      return true;
    };

    // Cover-crop section image into a target canvas at arbitrary resolution.
    const drawSectionImageTo = (
      tCtx: CanvasRenderingContext2D, tw: number, th: number,
    ): boolean => {
      const iw = sectionImg.naturalWidth;
      const ih = sectionImg.naturalHeight;
      if (!iw || !ih) return false;

      const cropX = Math.round(iw * TERMINAL.imageCropLeft);
      const cropY = Math.round(ih * TERMINAL.imageCropTop);
      const cropW = Math.round(iw * (1 - TERMINAL.imageCropLeft - TERMINAL.imageCropRight));
      const cropH = Math.round(ih * (1 - TERMINAL.imageCropTop - TERMINAL.imageCropBottom));
      if (cropW <= 0 || cropH <= 0) return false;

      const targetAspect = tw / th;
      const imgAspect = cropW / cropH;
      const fit = TERMINAL.imageFit;

      let cDx = 0, cDy = 0, cDw = tw, cDh = th;
      if (imgAspect < targetAspect) {
        cDw = Math.round(th * imgAspect);
        cDx = Math.round((tw - cDw) / 2);
      } else {
        cDh = Math.round(tw / imgAspect);
        cDy = Math.round((th - cDh) / 2);
      }

      let covSx = 0, covSy = 0, covSw = cropW, covSh = cropH;
      if (imgAspect > targetAspect) {
        covSw = cropH * targetAspect;
        covSx = (cropW - covSw) / 2;
      } else {
        covSh = cropW / targetAspect;
        covSy = (cropH - covSh) / 2;
      }

      const dx = Math.round(cDx * (1 - fit));
      const dy = Math.round(cDy * (1 - fit));
      const dw = Math.round(cDw + (tw - cDw) * fit);
      const dh = Math.round(cDh + (th - cDh) * fit);
      const sx = cropX + Math.round(covSx * fit);
      const sy = cropY + Math.round(covSy * fit);
      const sw = Math.round(cropW - (cropW - covSw) * fit);
      const sh = Math.round(cropH - (cropH - covSh) * fit);

      tCtx.fillStyle = "#000";
      tCtx.fillRect(0, 0, tw, th);
      tCtx.drawImage(sectionImg, sx, sy, sw, sh, dx, dy, dw, dh);
      return true;
    };

    let raf = 0;
    let lastFrame = 0;

    const render = (t: number) => {
      raf = requestAnimationFrame(render);
      if (t - lastFrame < 1000 / BACKDROP.targetFps) return;
      lastFrame = t;
      if (cols === 0 || rows === 0) return;

      const viewportH = window.innerHeight;
      const scrollY = window.scrollY;
      const videoRow = Math.round(-scrollY / fontPx);

      // Pixel position of the terminal section's top edge in the viewport.
      const termPxY = viewportH * BACKDROP.videoScreens - scrollY;

      // Video-grid row where the terminal starts / blend begins.
      const terminalRow = Math.round(termPxY / fontPx);
      const terminalTop = terminalRow - blendRows;

      // === VIDEO PASS (BACKDROP grid, includes crossfade blend) ===

      if (terminalTop < rows) {
        blendCtx.globalCompositeOperation = "source-over";
        blendCtx.clearRect(0, 0, blendCells.width, blendCells.height);
        drawSectionImageTo(blendCtx, blendCells.width, blendCells.height);
        if (blendRows > 0) {
          const fade = blendCtx.createLinearGradient(0, 0, 0, blendRows * 2);
          fade.addColorStop(0, "rgba(0,0,0,0)");
          fade.addColorStop(1, "rgba(0,0,0,1)");
          blendCtx.globalCompositeOperation = "destination-in";
          blendCtx.fillStyle = fade;
          blendCtx.fillRect(0, 0, blendCells.width, blendCells.height);
          blendCtx.globalCompositeOperation = "source-over";
        }
      }

      offCtx.imageSmoothingEnabled = false;
      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, cols, rows);
      if (
        videoRow > -videoCells.height &&
        video.readyState >= 2 &&
        drawVideoCells()
      ) {
        offCtx.drawImage(videoCells, 0, videoRow);
      }
      if (terminalTop < rows) {
        offCtx.drawImage(blendCells, 0, terminalTop);
      }

      // Row where the blend ends (video pass stops here).
      const splitRow = Math.max(0, Math.min(rows, terminalTop + blendRows));

      if (splitRow > 0) {
        asciifyFrame(ctx, offCtx, cols, rows, {
          fontPx,
          ramp: BACKDROP.asciiRamp,
          tintFilter: BACKDROP.asciiTintFilter,
          gain: BACKDROP.liftGain,
          gamma: BACKDROP.liftGamma,
          startRow: 0,
          endRow: splitRow,
        });
      }

      // === TERMINAL PASS (TERMINAL grid, own font size) ===

      const splitPx = splitRow * fontPx;
      const termStartRow = Math.max(0, Math.floor(splitPx / tFontPx));
      const tTermRow = Math.round(termPxY / tFontPx);

      if (termStartRow < tRows) {
        // Rasterize the section image at terminal grid resolution.
        drawSectionImageTo(termCellsCtx, tCols, tRows);

        // Compose into the terminal off-canvas at the scroll position.
        termOffCtx.imageSmoothingEnabled = false;
        termOffCtx.fillStyle = "#000";
        termOffCtx.fillRect(0, 0, tCols, tRows);
        termOffCtx.drawImage(termCells, 0, tTermRow);

        // Render to the terminal output canvas.
        termOutCtx.clearRect(0, 0, termOut.width, termOut.height);
        const tRamp = TERMINAL.asciiRamp || BACKDROP.asciiRamp;
        asciifyFrame(termOutCtx, termOffCtx, tCols, tRows, {
          fontPx: tFontPx,
          ramp: tRamp,
          tintFilter: TERMINAL.asciiTintFilter,
          gain: TERMINAL.liftGain,
          gamma: TERMINAL.liftGamma,
          startRow: termStartRow,
          endRow: tRows,
        });

        // Composite terminal output onto main canvas.
        const sPx = termStartRow * tFontPx;
        ctx.drawImage(
          termOut,
          0, sPx, termOut.width, termOut.height - sPx,
          0, sPx, canvas.width, canvas.height - sPx,
        );
      }
    };

    const tryPlay = () => void video.play().catch(() => {});
    tryPlay();
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("keydown", tryPlay);

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        id="video-backdrop"
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ width: "100%", height: "100%", background: "#000" }}
      />
    </>
  );
}
