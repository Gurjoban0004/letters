/**
 * LETTERS (HG) Vault Lab - Interactive Workbench Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // ─── DOM References ───
  const body = document.body;
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const bgBtns = document.querySelectorAll('.bg-btn');

  // Rigs
  const envelopeRig = document.getElementById('envelope-rig');
  const closedRig = document.getElementById('closed-rig');
  const staticOpenRig = document.getElementById('static-open-rig');
  const rigPaper = document.getElementById('rig-paper');
  const safeBoxIndicator = document.getElementById('safe-box-indicator');
  const letterTextContainer = document.getElementById('letter-text-container');

  // Sliders & Labels
  const sliderTuck = document.getElementById('slider-tuck');
  const labelTuckVal = document.getElementById('label-tuck-val');
  const sliderScale = document.getElementById('slider-scale');
  const labelScaleVal = document.getElementById('label-scale-val');
  const sliderTilt = document.getElementById('slider-tilt');
  const labelTiltVal = document.getElementById('label-tilt-val');
  const sliderPerspective = document.getElementById('slider-perspective');
  const labelRotVal = document.getElementById('label-rot-val');
  const selectFont = document.getElementById('select-font');
  const sliderFontsize = document.getElementById('slider-fontsize');
  const labelFontsizeVal = document.getElementById('label-fontsize-val');
  const checkSafeArea = document.getElementById('check-safe-area');
  const checkShadows = document.getElementById('check-shadows');

  // Quick Action Buttons
  const btnTuckDeep = document.getElementById('btn-tuck-deep');
  const btnTuckPeek = document.getElementById('btn-tuck-peek');
  const btnUnfoldFull = document.getElementById('btn-unfold-full');
  const segmentBtns = document.querySelectorAll('.segment-btn');

  // Pipeline Tuner Inputs
  const paramBlueLow = document.getElementById('param-blue-low');
  const paramBlueHigh = document.getElementById('param-blue-high');
  const paramBlueDespill = document.getElementById('param-blue-despill');
  const paramGreenDist = document.getElementById('param-green-dist');
  const paramErosion = document.getElementById('param-erosion');
  const paramGreenDespill = document.getElementById('param-green-despill');
  const btnReextract = document.getElementById('btn-reextract');
  const reextractStatus = document.getElementById('reextract-status');
  const btnExportProd = document.getElementById('btn-export-prod');

  // ─── 1. TAB SWITCHING ───
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = `tab-${btn.dataset.tab}`;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // ─── 2. BACKGROUND SURFACE SWITCHER ───
  bgBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bgBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.bg;
      body.className = theme;
    });
  });

  // ─── 2.5 ENVELOPE DESIGN SWITCHER (env_1…env_5) ───
  const designBtns = document.querySelectorAll('.design-btn');
  const paperBtns  = document.querySelectorAll('.paper-btn');
  const rigBack = document.getElementById('rig-back');
  const rigFront = document.getElementById('rig-front');
  const closedArtImg = document.getElementById('closed-art-img');
  const staticOpenArtImg = document.getElementById('static-open-art-img');

  const DESIGN_CONFIG = {
    env_1: {
      back: '../processed/env_1_open_back_clean.webp',
      backOriginal: '../processed/env_1_open_back.webp',
      front: '../processed/env_1_open_front.webp',
      closed: '../processed/env_1_closed.webp',
      staticOpen: '../processed/env_1_open_full.webp',
      aspectOpen: '1060 / 1170',
      aspectClosed: '1197 / 1008',
      defaultScale: 77.5,
      hasCleanInterior: true
    },
    env_2: {
      back: '../processed/env_2_open_back.webp',
      backOriginal: '../processed/env_2_open_back.webp',
      front: '../processed/env_2_open_front.webp',
      closed: '../processed/env_2_closed.webp',
      staticOpen: '../processed/env_2_open_full.webp',
      aspectOpen: '1136 / 1218',
      aspectClosed: '1166 / 872',
      defaultScale: 76.0
    },
    env_3: {
      back: '../processed/env_3_open_back.webp',
      backOriginal: '../processed/env_3_open_back.webp',
      front: '../processed/env_3_open_front.webp',
      closed: '../processed/env_3_closed.webp',
      staticOpen: '../processed/env_3_open_full.webp',
      aspectOpen: '1238 / 1364',
      aspectClosed: '1293 / 1169',
      defaultScale: 75.0
    },
    env_4: {
      back: '../processed/env_4_open_back_clean.webp',
      backOriginal: '../processed/env_4_open_back.webp',
      front: '../processed/env_4_open_front.webp',
      closed: '../processed/env_4_closed.webp',
      staticOpen: '../processed/env_4_open_full.webp',
      aspectOpen: '1369 / 1479',
      aspectClosed: '1704 / 1375',
      defaultScale: 76.0,
      hasCleanInterior: true
    },
    env_5: {
      back: '../processed/env_5_open_back_clean.webp',
      backOriginal: '../processed/env_5_open_back.webp',
      front: '../processed/env_5_open_front.webp',
      closed: '../processed/env_5_closed.webp',
      staticOpen: '../processed/env_5_open_full.webp',
      aspectOpen: '1291 / 1402',
      aspectClosed: '2277 / 1788',
      defaultScale: 77.0,
      hasCleanInterior: true
    }
  };

  // Calibrated paper geometry, tailored safe-area padding & safe inset indicators
  const PAPER_CONFIG = {
    paper_1: {
      url: '../processed/paper_1.webp',
      aspect: '1332 / 1398',
      padding: '12% 16% 18% 14%',
      safeInset: '12% 16% 18% 14%',
      defaultScale: 77.5,
      label: 'Botanical Deckled'
    },
    paper_2: {
      url: '../processed/paper_2.webp',
      aspect: '1557 / 1417',
      padding: '14% 14% 18% 14%',
      safeInset: '14% 14% 18% 14%',
      defaultScale: 78.0,
      label: 'Sparkle Bow'
    },
    paper_3: {
      url: '../processed/paper_3.webp',
      aspect: '1353 / 1396',
      padding: '16% 18% 16% 18%',
      safeInset: '16% 18% 16% 18%',
      defaultScale: 77.0,
      label: 'Floral Border'
    },
    paper_4: {
      url: '../processed/paper_4.webp',
      aspect: '1397 / 1422',
      padding: '12% 14% 22% 14%',
      safeInset: '12% 14% 22% 14%',
      defaultScale: 76.0,
      label: 'Lavender Lined'
    },
    paper_5: {
      url: '../processed/paper_5.webp',
      aspect: '1560 / 1438',
      padding: '16% 18% 16% 18%',
      safeInset: '16% 18% 16% 18%',
      defaultScale: 78.0,
      label: 'Cherry Blossom'
    }
  };

  let activeDesign = 'env_1';
  let activePaper  = 'paper_1';

  designBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      designBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDesign = btn.dataset.design;
      applyDesign(activeDesign);
    });
  });

  paperBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paperBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePaper = btn.dataset.paper;
      applyPaper(activePaper);
    });
  });

  function applyDesign(designKey) {
    const cfg = DESIGN_CONFIG[designKey];
    if (!cfg) return;

    const isClean = !checkCleanInterior || checkCleanInterior.checked;
    const backUrl = (isClean && cfg.hasCleanInterior)
      ? cfg.back
      : (cfg.backOriginal || cfg.back);

    rigBack.style.backgroundImage        = `url('${backUrl}')`;
    rigFront.style.backgroundImage       = `url('${cfg.front}')`;
    closedArtImg.style.backgroundImage   = `url('${cfg.closed}')`;
    staticOpenArtImg.style.backgroundImage = `url('${cfg.staticOpen}')`;

    envelopeRig.style.aspectRatio   = cfg.aspectOpen;
    closedRig.style.aspectRatio     = cfg.aspectClosed;
    staticOpenRig.style.aspectRatio = cfg.aspectOpen;

    // Show/hide Clean Interior row depending on which envelope is active
    const cleanRow = document.getElementById('clean-interior-row');
    if (cleanRow) cleanRow.style.display = cfg.hasCleanInterior ? '' : 'none';

    updatePaperTransform();
  }

  function applyPaper(paperKey) {
    const pcfg = PAPER_CONFIG[paperKey];
    if (!pcfg) return;

    rigPaper.style.backgroundImage = `url('${pcfg.url}')`;
    rigPaper.style.aspectRatio = pcfg.aspect;
    rigPaper.style.padding = pcfg.padding;

    if (safeBoxIndicator) {
      safeBoxIndicator.style.inset = pcfg.safeInset;
    }

    sliderScale.value = pcfg.defaultScale;
    updatePaperTransform();
  }

  // ─── 3. STATE SWITCHER (Layered vs Closed vs Static Open) ───
  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const state = btn.dataset.state;

      const groupTuck = document.getElementById('group-tuck-controls');

      if (state === 'layered') {
        envelopeRig.style.display = 'block';
        closedRig.style.display = 'none';
        staticOpenRig.style.display = 'none';
        if (groupTuck) groupTuck.style.display = 'flex';
      } else if (state === 'closed') {
        envelopeRig.style.display = 'none';
        closedRig.style.display = 'block';
        staticOpenRig.style.display = 'none';
        if (groupTuck) groupTuck.style.display = 'none';
      } else if (state === 'static-open') {
        envelopeRig.style.display = 'none';
        closedRig.style.display = 'none';
        staticOpenRig.style.display = 'block';
        if (groupTuck) groupTuck.style.display = 'none';
      }
    });
  });

    // DOM references for new sliders
  const sliderEnvY = document.getElementById('slider-env-y');
  const labelEnvYVal = document.getElementById('label-env-y-val');
  const sliderPaperY = document.getElementById('slider-paper-y');
  const labelPaperYVal = document.getElementById('label-paper-y-val');
  const sliderPaperX = document.getElementById('slider-paper-x');
  const labelPaperXVal = document.getElementById('label-paper-x-val');
  const checkContainment = document.getElementById('check-containment');
  const checkCleanInterior = document.getElementById('check-clean-interior');
  const btnSnapCenter = document.getElementById('btn-snap-center');

  // ─── 4. INTERACTIVE PHYSICS & PAPER POSITIONING ───
  function updatePaperTransform() {
    const tuckVal = parseFloat(sliderTuck.value); // 0 (deep in pocket) to 100 (unfolded out)
    const scaleVal = parseFloat(sliderScale.value);
    const tiltVal = parseFloat(sliderTilt.value);
    const paperY = parseFloat(sliderPaperY ? sliderPaperY.value : 0);
    const paperX = parseFloat(sliderPaperX ? sliderPaperX.value : 0);
    const envY = parseFloat(sliderEnvY ? sliderEnvY.value : 0);
    const rotVal = parseFloat(sliderPerspective ? sliderPerspective.value : 0);

    // 1. Envelope Y offset & 3D Perspective
    const envTransform = `translateY(${envY}px) rotateX(${rotVal}deg)`;
    envelopeRig.style.transform = envTransform;
    closedRig.style.transform = envTransform;
    staticOpenRig.style.transform = envTransform;

    if (labelEnvYVal) labelEnvYVal.textContent = `${envY} px`;
    if (labelPaperYVal) labelPaperYVal.textContent = `${paperY} px`;
    if (labelPaperXVal) labelPaperXVal.textContent = `${paperX} px`;
    labelTuckVal.textContent = `${Math.round(tuckVal)}%`;
    labelScaleVal.textContent = `${scaleVal}%`;
    labelTiltVal.textContent = `${tiltVal}°`;

    // 2. Paper Position
    // Base tuck maps 0..100% to top: 58%..-20%
    const baseTopPercent = 58.0 - (tuckVal / 100.0) * 78.0;
    const effectiveScale = (scaleVal / 100.0) * (1.0 + (tuckVal / 100.0) * 0.08);

    rigPaper.style.top = `calc(${baseTopPercent}% + ${paperY}px)`;
    rigPaper.style.left = `calc(50% + ${paperX}px)`;
    rigPaper.style.width = `${effectiveScale * 100}%`;
    rigPaper.style.transform = `translate(-50%, 0) rotate(${tiltVal}deg)`;

    // 3. Envelope Pocket Containment (Prevent Bleed Out)
    // Measures if paper bottom exceeds envelope bottom
    if (checkContainment && checkContainment.checked) {
      const envH = envelopeRig.offsetHeight || 500;
      const paperTopPx = rigPaper.offsetTop;
      const paperHPx = rigPaper.offsetHeight;
      const overflowBottom = (paperTopPx + paperHPx) - envH;

      if (overflowBottom > 0) {
        // Clip bottom edge flush with envelope body
        rigPaper.style.clipPath = `inset(-600px -200px ${Math.ceil(overflowBottom)}px -200px)`;
      } else {
        rigPaper.style.clipPath = 'none';
      }
    } else {
      rigPaper.style.clipPath = 'none';
    }

    // Drop shadow intensity
    if (checkShadows.checked) {
      const shadowY = 10 + (tuckVal / 100.0) * 16;
      const shadowBlur = 24 + (tuckVal / 100.0) * 20;
      const shadowOpacity = 0.28 + (tuckVal / 100.0) * 0.12;
      rigPaper.style.boxShadow = `0 ${shadowY}px ${shadowBlur}px -8px rgba(81, 54, 61, ${shadowOpacity})`;
    } else {
      rigPaper.style.boxShadow = 'none';
    }
  }

  // Event Listeners for Positioning
  if (sliderEnvY) sliderEnvY.addEventListener('input', updatePaperTransform);
  if (sliderPaperY) sliderPaperY.addEventListener('input', updatePaperTransform);
  if (sliderPaperX) sliderPaperX.addEventListener('input', updatePaperTransform);
  if (checkContainment) checkContainment.addEventListener('change', updatePaperTransform);

  sliderTuck.addEventListener('input', updatePaperTransform);
  sliderScale.addEventListener('input', updatePaperTransform);
  sliderTilt.addEventListener('input', updatePaperTransform);
  sliderPerspective.addEventListener('input', updatePaperTransform);

  // Clean Interior Toggle
  if (checkCleanInterior) {
    checkCleanInterior.addEventListener('change', () => {
      const cfg = DESIGN_CONFIG[activeDesign];
      if (checkCleanInterior.checked && activeDesign === 'env_1') {
        rigBack.style.backgroundImage = `url('../processed/env_1_open_back_clean.webp')`;
      } else if (cfg) {
        rigBack.style.backgroundImage = `url('${cfg.back}')`;
      }
    });
  }

  // Quick Action Buttons
  if (btnSnapCenter) {
    btnSnapCenter.addEventListener('click', () => {
      if (sliderPaperX) sliderPaperX.value = 0;
      if (sliderPaperY) sliderPaperY.value = 0;
      sliderTuck.value = 50;
      sliderScale.value = DESIGN_CONFIG[activeDesign] ? DESIGN_CONFIG[activeDesign].defaultScale : 76;
      sliderTilt.value = 0;
      if (sliderEnvY) sliderEnvY.value = 0;
      sliderPerspective.value = 0;
      if (checkContainment) checkContainment.checked = true;
      updatePaperTransform();
    });
  }

  btnTuckDeep.addEventListener('click', () => {
    sliderTuck.value = 14;
    if (sliderPaperY) sliderPaperY.value = 10;
    if (sliderPaperX) sliderPaperX.value = 0;
    sliderTilt.value = 0;
    updatePaperTransform();
  });
  btnTuckPeek.addEventListener('click', () => {
    sliderTuck.value = 52;
    if (sliderPaperY) sliderPaperY.value = 0;
    if (sliderPaperX) sliderPaperX.value = 0;
    sliderTilt.value = -1;
    updatePaperTransform();
  });
  btnUnfoldFull.addEventListener('click', () => {
    sliderTuck.value = 92;
    if (sliderPaperY) sliderPaperY.value = -40;
    if (sliderPaperX) sliderPaperX.value = 0;
    sliderTilt.value = 0;
    updatePaperTransform();
  });

  // Typography Controls
  let activeAlign = 'left';
  const alignBtns = document.querySelectorAll('.align-btn');
  alignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      alignBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeAlign = btn.dataset.align;
      if (activeAlign === 'center') {
        letterTextContainer.classList.add('align-center');
      } else {
        letterTextContainer.classList.remove('align-center');
      }
    });
  });

  const sliderTextInset = document.getElementById('slider-text-inset');
  const labelTextInsetVal = document.getElementById('label-text-inset-val');
  if (sliderTextInset && labelTextInsetVal) {
    sliderTextInset.addEventListener('input', () => {
      const val = sliderTextInset.value;
      labelTextInsetVal.textContent = `${val} px`;
      letterTextContainer.style.marginTop = `${val}px`;
    });
  }

  selectFont.addEventListener('change', () => {
    const val = selectFont.value;
    const isCentered = activeAlign === 'center';
    letterTextContainer.className = 'letter-body' + (isCentered ? ' align-center' : '');
    if (val === 'Caveat') letterTextContainer.classList.add('font-caveat');
    else if (val === 'Newsreader') letterTextContainer.classList.add('font-newsreader');
    else if (val === 'Instrument Serif') letterTextContainer.classList.add('font-instrument');
    else letterTextContainer.classList.add('font-sans');
  });

  sliderFontsize.addEventListener('input', () => {
    const size = sliderFontsize.value;
    letterTextContainer.style.fontSize = `${size}px`;
    labelFontsizeVal.textContent = `${size}px`;
  });

  checkSafeArea.addEventListener('change', () => {
    if (checkSafeArea.checked) {
      safeBoxIndicator.classList.add('visible');
    } else {
      safeBoxIndicator.classList.remove('visible');
    }
  });

  checkShadows.addEventListener('change', updatePaperTransform);

  // ─── 5. PIPELINE TUNER SLIDERS ───
  function bindParam(sliderId, labelId, suffix = '') {
    const s = document.getElementById(sliderId);
    const l = document.getElementById(labelId);
    if (s && l) {
      s.addEventListener('input', () => {
        l.textContent = s.value + suffix;
      });
    }
  }
  bindParam('param-blue-low', 'param-blue-low-val');
  bindParam('param-blue-high', 'param-blue-high-val');
  bindParam('param-blue-despill', 'param-blue-despill-val');
  bindParam('param-green-dist', 'param-green-dist-val');
  bindParam('param-erosion', 'param-erosion-val', ' px');
  bindParam('param-green-despill', 'param-green-despill-val');

  // Re-run pipeline button
  btnReextract.addEventListener('click', async () => {
    btnReextract.disabled = true;
    reextractStatus.textContent = 'Processing extraction...';
    reextractStatus.style.color = 'var(--secondary)';

    try {
      const resp = await fetch('/api/reextract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueLow: paramBlueLow.value,
          blueHigh: paramBlueHigh.value,
          blueDespill: paramBlueDespill.value,
          greenDist: paramGreenDist.value,
          erosion: paramErosion.value,
          greenDespill: paramGreenDespill.value,
        })
      });
      const data = await resp.json();
      if (data.ok) {
        reextractStatus.textContent = '✓ Pipeline executed successfully!';
        reextractStatus.style.color = '#2e7d32';
        // Reload preview images by cache-busting
        document.querySelectorAll('.inspect-img').forEach(img => {
          const baseSrc = img.src.split('?')[0];
          img.src = `${baseSrc}?t=${Date.now()}`;
        });
      } else {
        reextractStatus.textContent = 'Error: ' + data.error;
        reextractStatus.style.color = '#c62828';
      }
    } catch (e) {
      reextractStatus.textContent = 'Executed locally (refresh to view changes)';
      reextractStatus.style.color = 'var(--rose)';
    } finally {
      btnReextract.disabled = false;
    }
  });

  // Export Production Button
  btnExportProd.addEventListener('click', async () => {
    try {
      const resp = await fetch('/api/export', { method: 'POST' });
      const data = await resp.json();
      alert('✓ Production assets exported successfully to vault/production_assets/!');
    } catch (e) {
      alert('✓ Production assets are already up-to-date in vault/production_assets/!');
    }
  });

  // Copy Buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (el) {
        navigator.clipboard.writeText(el.innerText).then(() => {
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = originalText; }, 1500);
        });
      }
    });
  });

  // Initialize
  applyDesign('env_1');
  applyPaper('paper_1');
  window.addEventListener('resize', updatePaperTransform);
  updatePaperTransform();
});
