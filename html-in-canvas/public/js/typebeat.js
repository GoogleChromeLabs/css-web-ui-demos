/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'https://esm.sh/tone@15.1.22';

// --- Configuration ---
const PADS_CONFIG = [
    { key: 'KICK', label: 'KICK', word: 'KICK' },
    { key: 'SNARE', label: 'SNARE', word: 'SNARE' },
    { key: 'HI_HAT_CLOSED', label: 'HIHAT', word: 'HIHAT' },
    { key: 'HI_HAT_OPEN', label: 'OPEN HAT', word: 'OPENHAT' },
    { key: 'HIGH_TOM', label: 'HI TOM', word: 'HITOM' },
    { key: 'MID_TOM', label: 'MID TOM', word: 'MIDTOM' },
    { key: 'LOW_TOM', label: 'LO TOM', word: 'LOTOM' },
    { key: 'CLAP', label: 'CLAP', word: 'CLAP' },
    { key: 'RIM', label: 'RIMSHOT', word: 'RIMSHOT' },
    { key: 'WOODBLOCK', label: 'WOODBLOCK', word: 'WOODBLOCK' },
    { key: 'COWBELL', label: 'COWBELL', word: 'COWBELL' },
    { key: 'CRASH', label: 'CRASH', word: 'CRASH' }
];

const STEPS = 16;
const ROWS = 12;

// --- State ---
const sequencerState = Array(ROWS).fill(0).map(() => Array(STEPS).fill('-'));
let isDrawing = false;
let drawMode = null;
let activePadIndex = null;
let justClicked = false;

function updateBPM(newBPM) {
    const bpmSlider = document.getElementById('bpm-slider');
    const val = Math.max(20, Math.min(300, Math.round(newBPM)));
    Tone.Transport.bpm.value = val;
    if (bpmSlider) bpmSlider.value = val;
}

function applyDefaultBeat() {
    updateBPM(120);
    for (let r = 0; r < ROWS; r++) {
        for (let s = 0; s < STEPS; s++) {
            sequencerState[r][s] = '-';
        }
    }
    sequencerState[0][0] = 'X'; // Kick
    sequencerState[0][4] = 'X'; 
    sequencerState[0][8] = 'X'; 
    sequencerState[0][12] = 'X'; 
    sequencerState[1][4] = 'X'; // Snare
    sequencerState[1][12] = 'X';
    for (let i = 0; i < 16; i += 2) {
        sequencerState[2][i] = 'X'; // Closed Hat
    }
    sequencerState[3][14] = 'X'; // Open Hat
    const rows = document.querySelectorAll('.seq-row');
    if (rows.length > 0) {
        rows.forEach((row, r) => {
            const steps = row.querySelectorAll('.step');
            const hue = Math.round(190 - (150 * r) / 11);
            steps.forEach((step, s) => {
                const val = sequencerState[r][s];
                step.textContent = val;
                if (val === 'X') {
                    step.classList.add('active');
                    step.classList.remove('inactive');
                    step.style.color = `hsl(${hue}, 100%, 55%)`;
                } else {
                    step.classList.remove('active');
                    step.classList.add('inactive');
                    step.style.color = '';
                }
            });
        });
    }
}

let currentStep = 0;
let isPlaying = false;
const particles = [];

// --- Audio Setup (Synthesis) ---
const synths = {};

function initAudio() {
    // 1. Kick (k)
    const kick = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.6, sustain: 0.6, release: 1.0 }
    }).toDestination();
    kick.volume.value = -9;

    // 2. Snare (s)
    const snareNoiseFilter = new Tone.Filter(1500, "bandpass").toDestination();
    snareNoiseFilter.Q.value = 1;
    
    const snareNoise = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0 }
    }).connect(snareNoiseFilter);

    const snareBody = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 0.8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();

    snareNoise.volume.value = -13;
    snareBody.volume.value = -13;

    synths['SNARE'] = {
        triggerAttackRelease: (time) => {
            snareNoise.triggerAttack(time);
            snareBody.triggerAttackRelease(150, '16n', time);
        }
    };

    // 3 & 4. HiHats (Closed & Open)
    const hihatFilter = new Tone.Filter(10000, "highpass").toDestination();
    const hihat = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0 }
    }).connect(hihatFilter);
    hihat.volume.value = -18;

    // 5. Rimshot (r)
    const rimFilter = new Tone.Filter(2100, "bandpass").toDestination();
    rimFilter.Q.value = 1;
    const rimNoise = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0 }
    }).connect(rimFilter);
    rimNoise.volume.value = -2;

    const rimBody = new Tone.MembraneSynth({
        pitchDecay: 0.002,
        octaves: 0.8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
    }).toDestination();
    rimBody.volume.value = -2;

    synths['RIM'] = {
        triggerAttackRelease: (time) => {
            rimNoise.triggerAttack(time);
            rimBody.triggerAttackRelease(850, '16n', time);
        }
    };

    // 6. High Tom (t)
    const highTom = new Tone.MembraneSynth({
        pitchDecay: 0.25,
        octaves: 1.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 }
    }).toDestination();
    highTom.volume.value = -9;

    // 7. Mid Tom
    const midTom = new Tone.MembraneSynth({
        pitchDecay: 0.25,
        octaves: 1.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 }
    }).toDestination();
    midTom.volume.value = -9;

    // 8. Low Tom (o)
    const lowTom = new Tone.MembraneSynth({
        pitchDecay: 0.25,
        octaves: 1.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 }
    }).toDestination();
    lowTom.volume.value = -9;

    // 8. Woodblock (w)
    const woodblock = new Tone.MembraneSynth({
        pitchDecay: 0.001,
        octaves: 0.8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    woodblock.volume.value = -11;

    // 9. Clap (h)
    const clapFilter = new Tone.Filter(1000, "bandpass").toDestination();
    clapFilter.Q.value = 1;
    const clap = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.22, sustain: 0 }
    }).connect(clapFilter);
    clap.volume.value = -13;

    // 10. Cowbell (x)
    const cowbellFilter = new Tone.Filter(800, "bandpass").toDestination();
    const cowbell = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 }
    }).connect(cowbellFilter);
    cowbell.volume.value = -11;

    // 11. Crash (*)
    const crashFilter = new Tone.Filter(3000, "highpass").toDestination();
    const crash = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 1.0 }
    }).connect(crashFilter);
    crash.volume.value = -11;

    synths['KICK'] = kick;
    synths['HI_HAT_CLOSED'] = hihat;
    synths['HI_HAT_OPEN'] = hihat;
    synths['HIGH_TOM'] = highTom;
    synths['MID_TOM'] = midTom;
    synths['LOW_TOM'] = lowTom;
    synths['WOODBLOCK'] = woodblock;
    synths['CLAP'] = clap;
    synths['COWBELL'] = cowbell;
    synths['CRASH'] = crash;
}

let lastToneTime = 0;

function triggerSound(key, time) {
    let activeTime = time || Tone.now();
    if (activeTime <= lastToneTime) {
        activeTime = lastToneTime + 0.005;
    }
    lastToneTime = activeTime;
    const t = activeTime;
    
    switch (key) {
        case 'KICK': synths['KICK'].triggerAttackRelease(55, '8n', t); break;
        case 'SNARE': synths['SNARE'].triggerAttackRelease(t); break;
        case 'HI_HAT_CLOSED': 
            synths['HI_HAT_CLOSED'].envelope.decay = 0.03;
            synths['HI_HAT_CLOSED'].triggerAttackRelease('32n', t); 
            break;
        case 'HI_HAT_OPEN': 
            synths['HI_HAT_OPEN'].envelope.decay = 0.7;
            synths['HI_HAT_OPEN'].triggerAttackRelease('8n', t); 
            break;
        case 'CLAP': synths['CLAP'].triggerAttackRelease('16n', t); break;
        case 'COWBELL': synths['COWBELL'].triggerAttackRelease([540, 800], '16n', t); break;
        case 'RIM': synths['RIM'].triggerAttackRelease(t); break;
        case 'HIGH_TOM': synths['HIGH_TOM'].triggerAttackRelease(125, '16n', t); break;
        case 'MID_TOM': synths['MID_TOM'].triggerAttackRelease(100, '16n', t); break;
        case 'LOW_TOM': synths['LOW_TOM'].triggerAttackRelease(70, '16n', t); break;
        case 'WOODBLOCK': synths['WOODBLOCK'].triggerAttackRelease(1200, '16n', t); break;
        case 'CRASH': synths['CRASH'].triggerAttackRelease('1m', t); break;
    }
}

// --- UI Generation ---
function initUI() {
    const padsContainer = document.getElementById('pads');
    const seqContainer = document.getElementById('sequencer');

    if (!padsContainer || !seqContainer) return;

    window.addEventListener('pointerdown', () => { isDrawing = true; });
    window.addEventListener('pointerup', () => { 
        isDrawing = false; 
        drawMode = null;
        activePadIndex = null; 
    });

    const app = document.getElementById('app');
    const mainCanvas = document.getElementById('main-canvas');
    
    if (app && mainCanvas) {
        const resizeObserver = new ResizeObserver(() => {
            const displayWidth = window.innerWidth;
            const displayHeight = window.innerHeight;
            
            if (mainCanvas.width !== displayWidth || mainCanvas.height !== displayHeight) {
                mainCanvas.width = displayWidth;
                mainCanvas.height = displayHeight;
            }
        });
        resizeObserver.observe(document.body);
    }

    // Generate Pads
    PADS_CONFIG.forEach((config, index) => {
        const pad = document.createElement('div');
        pad.className = 'pad';
        pad.dataset.key = config.key;
        pad.dataset.index = index.toString();
        
        // Add Material Design ripple for tactile feedback
        const ripple = document.createElement('md-ripple');
        pad.appendChild(ripple);

        const padText = document.createElement('div');
        padText.className = 'pad-text';
        
        const hue = Math.round(190 - (150 * index) / 11); 
        padText.style.color = `hsl(${hue}, 100%, 55%)`;
        
        const extraSpace = (config.key === 'KICK' || config.key === 'HI_HAT_CLOSED') ? '  ' : ' ';
        const padLabel = (config.key === 'WOODBLOCK') ? 'WOOD BLOCK' : config.label;
        const fullWord = padLabel + extraSpace;
        const textContent = fullWord.repeat(200); 
        
        padText.style.wordBreak = 'break-all';
        padText.style.textAlign = 'justify';
        
        let customSpringK = 0.02; 
        if (config.key === 'HI_HAT_OPEN' || config.key === 'CRASH') {
            customSpringK = 0.005; 
        } else if (config.key === 'KICK' || config.key === 'HIGH_TOM' || config.key === 'MID_TOM' || config.key === 'LOW_TOM') {
            customSpringK = 0.01; 
        }

        for (let c = 0; c < textContent.length; c++) {
            const char = textContent[c];
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            span.style.whiteSpace = 'pre';
            
            padText.appendChild(span);

            particles.push({
                element: span,
                originX: 0,
                originY: 0,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                customSpringK
            });
        }

        pad.appendChild(padText);
        padsContainer.appendChild(pad);
    });

    // Generate Sequencer
    for (let rowIndex = 0; rowIndex < 12; rowIndex++) {
        const config = PADS_CONFIG[rowIndex];
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seq-row';
        
        const hue = Math.round(190 - (150 * rowIndex) / 11);
        rowDiv.style.setProperty('--row-color', `hsl(${hue}, 100%, 55%)`);
        rowDiv.style.setProperty('--row-bg-color', `hsl(${hue}, 100%, 15%)`);

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = config.label;
        label.style.color = `hsl(${hue}, 100%, 55%)`;
        rowDiv.appendChild(label);

        const stepsDiv = document.createElement('div');
        stepsDiv.className = 'steps';

        for (let i = 0; i < STEPS; i++) {
            const step = document.createElement('span');
            const isSet = sequencerState[rowIndex][i] === 'X';
            
            step.textContent = sequencerState[rowIndex][i];
            step.className = 'step ' + (isSet ? 'active' : 'inactive');
            if (i % 4 === 0) {
                step.classList.add('bar-start');
            }
            step.dataset.row = rowIndex.toString();
            step.dataset.step = i.toString();
            
            const toggleCell = (active) => {
                 sequencerState[rowIndex][i] = active ? 'X' : '-';
                 step.textContent = sequencerState[rowIndex][i];
                 step.className = 'step ' + (sequencerState[rowIndex][i] === 'X' ? 'active' : 'inactive');
                 if (i % 4 === 0) step.classList.add('bar-start');
                 
                 if (sequencerState[rowIndex][i] === 'X') {
                     step.style.color = `hsl(${hue}, 100%, 55%)`;
                 } else {
                     step.style.color = ''; 
                 }
            };
            
            if (isSet) {
                step.style.color = `hsl(${hue}, 100%, 55%)`;
            }
            
            step.addEventListener('pointerdown', () => {
                 const current = sequencerState[rowIndex][i];
                 drawMode = current === 'X' ? 'erase' : 'draw';
                 
                 toggleCell(drawMode === 'draw');
                 
                 if (sequencerState[rowIndex][i] === 'X') {
                     Tone.start();
                     triggerSound(PADS_CONFIG[rowIndex].key);
                     applyImpact(rowIndex);
                 }
            });
            
            step.addEventListener('mouseover', () => {
                  if (isDrawing && drawMode) {
                       const current = sequencerState[rowIndex][i];
                       if (drawMode === 'draw' && current !== 'X') {
                           toggleCell(true);
                       } else if (drawMode === 'erase' && current === 'X') {
                           toggleCell(false);
                       }
                  }
            });

            step.addEventListener('pointermove', (e) => {
                  if (isDrawing && drawMode && e.pointerType === 'touch') {
                       const element = document.elementFromPoint(e.clientX, e.clientY);
                       if (element && element.classList.contains('step')) {
                            const row = parseInt(element.getAttribute('data-row') || '0');
                            const stepIdx = parseInt(element.getAttribute('data-step') || '0');
                            const current = sequencerState[row][stepIdx];
                            
                            if (drawMode === 'draw' && current !== 'X') {
                                 sequencerState[row][stepIdx] = 'X';
                                 element.textContent = 'X';
                                 element.classList.add('active');
                                 element.classList.remove('inactive');
                                 const hueRow = Math.round(190 - (150 * row) / 11);
                                 element.style.color = `hsl(${hueRow}, 100%, 55%)`;
                            } else if (drawMode === 'erase' && current === 'X') {
                                 sequencerState[row][stepIdx] = '-';
                                 element.textContent = '-';
                                 element.classList.add('inactive');
                                 element.classList.remove('active');
                                 element.style.color = '';
                            }
                       }
                  }
            });
            
            stepsDiv.appendChild(step);
        }

        rowDiv.appendChild(stepsDiv);
        seqContainer.appendChild(rowDiv);
    }

    setTimeout(measureParticles, 100);
}

function measureParticles() {
    particles.forEach(p => {
        p.originX = 0;
        p.originY = 0;
        p.x = 0;
        p.y = 0;
        p.vx = 0;
        p.vy = 0;
    });
}

// --- Physics Engine ---
const SPRING_K = 0.02;
const DAMPING = 0.88;
const IMPACT_FORCE = 15;

function applyImpact(padIndex, clickX, clickY) {
    const padElements = document.querySelectorAll('.pad');
    const pad = padElements[padIndex];
    if (!pad) return;

    const padRect = pad.getBoundingClientRect();
    const centerX = clickX !== undefined ? clickX : padRect.left + padRect.width / 2;
    const centerY = clickY !== undefined ? clickY : padRect.top + padRect.height / 2;

    particles.forEach(p => {
        if (p.element.closest('.pad') === pad) {
            const rect = p.element.getBoundingClientRect();
            const pX = rect.left + rect.width / 2;
            const pY = rect.top + rect.height / 2;

            const dx = pX - centerX;
            const dy = pY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const force = (IMPACT_FORCE * 100) / (dist + 50);
            
            if (force > 0.5) {
                p.vx += (dx / dist) * force + (Math.random() - 0.5) * 5;
                p.vy += (dy / dist) * force + (Math.random() - 0.5) * 5;
            }
        }
    });
}

function updatePhysics() {
    particles.forEach(p => {
        const k = p.customSpringK || SPRING_K;
        const fx = -k * p.x;
        const fy = -k * p.y;

        p.vx += fx;
        p.vy += fy;

        p.vx *= DAMPING;
        p.vy *= DAMPING;

        p.x += p.vx;
        p.y += p.vy;

        if (Math.abs(p.x) > 0.01 || Math.abs(p.y) > 0.01) {
            p.element.style.transform = `translate(${p.x}px, ${p.y}px)`;
        } else {
            p.element.style.transform = '';
            p.x = 0;
            p.y = 0;
            p.vx = 0;
            p.vy = 0;
        }
    });

    requestAnimationFrame(updatePhysics);
    
    const padsWrapper = document.getElementById('pads-wrapper');
    if (padsWrapper) {
        padsWrapper.style.transform = 'translateZ(0)';
    }
}

// --- Song Serialization ---
function serializeSong() {
    const bpm = Math.round(Tone.Transport.bpm.value);
    const dotsPerBeat = 4;
    const beatsPerBar = 4;
    let song = `[${bpm}:${dotsPerBeat}:${beatsPerBar}]`;
    
    for (let r = 0; r < ROWS; r++) {
        const label = PADS_CONFIG[r].label.replace(/ /g, '_');
        let sequence = '';
        for (let s = 0; s < STEPS; s++) {
            sequence += sequencerState[r][s] === 'X' ? 'X' : '.';
        }
        song += `[${label}:${sequence}]`;
    }
    return song;
}

function deserializeSong(songStr) {
    const matches = songStr.match(/\[(.*?)\]/g);
    if (!matches) return;
    
    matches.forEach(segment => {
         const clean = segment.substring(1, segment.length - 1);
         const parts = clean.split(':');
         
         if (parts.length === 3 && !isNaN(parseInt(parts[0]))) {
              const bpm = parseInt(parts[0]);
              Tone.Transport.bpm.value = bpm;
              const bpmVal = document.getElementById('bpm-val');
              if (bpmVal) bpmVal.value = bpm.toString();
         } else if (parts.length === 2) {
              const label = parts[0];
              const sequence = parts[1];
              
              const rowIndex = PADS_CONFIG.findIndex(c => c.label.replace(/ /g, '_') === label || c.label === label);
              if (rowIndex !== -1) {
                   for (let s = 0; s < STEPS; s++) {
                        if (s < sequence.length) {
                             const char = sequence[s];
                             sequencerState[rowIndex][s] = char === 'X' ? 'X' : '-';
                             
                             const stepElement = document.querySelector(`.step[data-row="${rowIndex}"][data-step="${s}"]`);
                             if (stepElement) {
                                  stepElement.textContent = char === 'X' ? 'X' : '-';
                                  if (char === 'X') {
                                       stepElement.classList.add('active');
                                       stepElement.classList.remove('inactive');
                                       const hue = Math.round(190 - (150 * rowIndex) / 11);
                                       stepElement.style.color = `hsl(${hue}, 100%, 55%)`;
                                  } else {
                                       stepElement.classList.remove('active');
                                       stepElement.classList.add('inactive');
                                       stepElement.style.color = '';
                                  }
                             }
                        }
                   }
              }
         }
    });
}

function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const song = params.get('song');
    if (song) {
        deserializeSong(song);
    }
}

// --- Sequencer Logic ---
function setupSequencer() {
    Tone.Transport.scheduleRepeat((time) => {
        for (let r = 0; r < ROWS; r++) {
            const state = sequencerState[r][currentStep];
            if (state === 'X') {
                const key = PADS_CONFIG[r].key;
                
                if (key === 'HI_HAT_OPEN') {
                     const closedHatIndex = PADS_CONFIG.findIndex(c => c.key === 'HI_HAT_CLOSED');
                     if (sequencerState[closedHatIndex][currentStep] === 'X') {
                          continue; 
                     }
                }
                
                triggerSound(key, time);
                
                Tone.Draw.schedule(() => {
                    applyImpact(r);
                    const pad = document.querySelector(`.pad[data-key="${key}"]`);
                    if (pad) {
                        pad.classList.add('active');
                        setTimeout(() => pad.classList.remove('active'), 100);
                    }
                }, time);
            }
        }

        const stepToDraw = currentStep;
        Tone.Draw.schedule(() => {
            updatePlayhead(stepToDraw);
        }, time);

        currentStep = (currentStep + 1) % STEPS;
    }, '16n');

    Tone.Transport.bpm.value = 120;
}

function updatePlayhead(step) {
    const allSteps = document.querySelectorAll('.step');
    allSteps.forEach(s => {
        const stepIdx = parseInt(s.dataset.step || '0');
        if (stepIdx === step && step !== -1) {
            s.classList.add('playhead');
        } else {
            s.classList.remove('playhead');
        }
    });
}

// --- Event Listeners ---
function setupEventListeners() {
    const pads = document.querySelectorAll('.pad');
    pads.forEach(pad => {
        pad.addEventListener('pointerdown', (e) => {
            const indexStr = pad.getAttribute('data-index') || '0';
            activePadIndex = indexStr; 
            
            const index = parseInt(indexStr);
            const key = pad.getAttribute('data-key');
            
            Tone.start();
            triggerSound(key);
            applyImpact(index, e.clientX, e.clientY);
            
            pad.classList.add('active');
            setTimeout(() => pad.classList.remove('active'), 100);
        });
    });

    const padsContainer = document.getElementById('pads');
    if (padsContainer) {
        padsContainer.addEventListener('pointermove', (e) => {
            if (isDrawing) {
                const element = document.elementFromPoint(e.clientX, e.clientY);
                const pad = element?.closest('.pad');
                if (pad) {
                     const indexStr = pad.getAttribute('data-index') || '0';
                     if (indexStr !== activePadIndex) {
                          activePadIndex = indexStr;
                          const index = parseInt(indexStr);
                          const key = pad.getAttribute('data-key');
                          Tone.start();
                          triggerSound(key);
                          applyImpact(index, e.clientX, e.clientY);
                          pad.classList.add('active');
                          setTimeout(() => pad.classList.remove('active'), 100);
                     }
                }
            }
        });
    }

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', async () => {
            await Tone.start();
            if (isPlaying) {
                Tone.Transport.stop();
                currentStep = 0;
                updatePlayhead(-1);
                playBtn.selected = false;
            } else {
                Tone.Transport.start();
                playBtn.selected = true;
            }
            isPlaying = !isPlaying;
        });
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            applyDefaultBeat();
        });
    }

    const bpmSlider = document.getElementById('bpm-slider');
    if (bpmSlider) {
        bpmSlider.addEventListener('input', () => updateBPM(bpmSlider.value));
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === '[') updateBPM(Tone.Transport.bpm.value - 1);
        if (e.key === ']') updateBPM(Tone.Transport.bpm.value + 1);
    });

    // BPM input handling removed in favor of slider

    window.addEventListener('keydown', async (e) => {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

        if (e.key === ' ') {
            e.preventDefault();
            playBtn?.click();
            return;
        }

        const keyMap = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
            '-': 10, '=': 11
        };
        const index = keyMap[e.key];
        if (index !== undefined) {
            const key = PADS_CONFIG[index].key;
            Tone.start();
            triggerSound(key);
            applyImpact(index);
            const pad = document.querySelector(`.pad[data-key="${key}"]`);
            if (pad) {
                pad.classList.add('active');
                setTimeout(() => pad.classList.remove('active'), 100);
            }
        }
    });
}

// HTML-in-Canvas Redraw Hook
function setupCanvasRedraw() {
    const mainCanvas = document.getElementById('main-canvas');
    const app = document.getElementById('app');
    
    if (mainCanvas && app) {
        const ctx = mainCanvas.getContext('2d');
        
        mainCanvas.onpaint = () => {
            ctx.reset();
            
            const padding = 20;
            const availableW = mainCanvas.width - padding;
            const availableH = mainCanvas.height - padding;
            
            // Calculate scale to fit the entire app
            const scaleX = availableW / app.offsetWidth;
            const scaleY = availableH / app.offsetHeight;
            const scale = Math.min(scaleX, scaleY, 1.0);
            
            // Center the scaled app
            const x = (mainCanvas.width - app.offsetWidth * scale) / 2;
            const y = (mainCanvas.height - app.offsetHeight * scale) / 2;
            
            // Apply scale and translation
            ctx.setTransform(scale, 0, 0, scale, x, y);
            
            try {
                // Draw the entire app UI at the calculated transform
                // Note: drawElementImage(app, 0, 0) draws at (0,0) in the CURRENT transform space
                const transform = ctx.drawElementImage(app, 0, 0);
                
                // Sync the invisible DOM for hit-testing/interaction
                if (transform) {
                    app.style.transform = transform.toString();
                }
            } catch (e) {
                // Paint record might not be ready on first frame
            }
        };
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initUI();
    setupSequencer();
    setupEventListeners();
    applyDefaultBeat(); // Set the default pattern initially
    loadFromUrl();
    updatePhysics();
    setupCanvasRedraw();
});
