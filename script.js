/**
 * PinkPulse Calculator — Main Application Script
 * Features: Standard & Scientific Math, Tip & Unit Converter, History Persistence,
 * Web Audio Click Feedback, Theme Engine, Keyboard Support.
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Core State
    // -------------------------------------------------------------------------
    const state = {
        currentValue: '0',
        expression: '',
        lastResult: null,
        isEvaluated: false,
        angleMode: 'DEG', // 'DEG' or 'RAD'
        soundEnabled: localStorage.getItem('pinkpulse_sound') !== 'false',
        theme: localStorage.getItem('pinkpulse_theme') || 'blush',
        memory: 0,
        history: JSON.parse(localStorage.getItem('pinkpulse_history') || '[]'),
        activeTab: 'standard', // 'standard', 'scientific', 'converter'
        converterSubtab: 'tip', // 'tip', 'length', 'temp'
    };

    // -------------------------------------------------------------------------
    // 2. DOM Elements
    // -------------------------------------------------------------------------
    const mainDisplay = document.getElementById('mainDisplay');
    const expressionDisplay = document.getElementById('expressionDisplay');
    const memoryBadge = document.getElementById('memoryBadge');
    const angleModeBadge = document.getElementById('angleModeBadge');
    const angleToggleBtn = document.getElementById('angleToggleBtn');
    
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundOnIcon = soundToggleBtn.querySelector('.sound-on-icon');
    const soundOffIcon = soundToggleBtn.querySelector('.sound-off-icon');

    const themeDropdownBtn = document.getElementById('themeDropdownBtn');
    const themeMenu = document.getElementById('themeMenu');
    
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const historyDrawer = document.getElementById('historyDrawer');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    const copyBtn = document.getElementById('copyBtn');
    const toast = document.getElementById('toast');

    const calcView = document.getElementById('calcView');
    const scientificGrid = document.getElementById('scientificGrid');
    const converterView = document.getElementById('converterView');

    // Converter Elements
    const tipBill = document.getElementById('tipBill');
    const tipPercent = document.getElementById('tipPercent');
    const tipPercentVal = document.getElementById('tipPercentVal');
    const peopleMinus = document.getElementById('peopleMinus');
    const peoplePlus = document.getElementById('peoplePlus');
    const peopleVal = document.getElementById('peopleVal');
    const tipTotalRes = document.getElementById('tipTotalRes');
    const tipPerPersonRes = document.getElementById('tipPerPersonRes');

    const tipConverterCard = document.getElementById('tipConverterCard');
    const unitConverterCard = document.getElementById('unitConverterCard');
    const unitInput = document.getElementById('unitInput');
    const unitFrom = document.getElementById('unitFrom');
    const unitTo = document.getElementById('unitTo');
    const swapUnitsBtn = document.getElementById('swapUnitsBtn');
    const unitResultVal = document.getElementById('unitResultVal');

    // -------------------------------------------------------------------------
    // 3. Web Audio API Sound Generator
    // -------------------------------------------------------------------------
    let audioCtx = null;
    function playClickSound() {
        if (!state.soundEnabled) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            // Aesthetic pink click sound (soft high-pitched pop)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.04);
        } catch (e) {
            console.warn('Audio playback unavailable', e);
        }
    }

    // -------------------------------------------------------------------------
    // 4. UI Update Helpers
    // -------------------------------------------------------------------------
    function updateDisplay() {
        // Auto-scale main result text size based on string length
        const len = state.currentValue.length;
        if (len > 14) {
            mainDisplay.style.fontSize = '1.3rem';
        } else if (len > 10) {
            mainDisplay.style.fontSize = '1.7rem';
        } else if (len > 7) {
            mainDisplay.style.fontSize = '2rem';
        } else {
            mainDisplay.style.fontSize = '2.25rem';
        }

        mainDisplay.textContent = formatNumberForDisplay(state.currentValue);
        expressionDisplay.textContent = state.expression;

        // Memory badge
        if (state.memory !== 0) {
            memoryBadge.classList.remove('hidden');
        } else {
            memoryBadge.classList.add('hidden');
        }

        // Angle badge
        angleModeBadge.textContent = state.angleMode;
        if (angleToggleBtn) angleToggleBtn.textContent = state.angleMode;
    }

    function formatNumberForDisplay(valStr) {
        if (valStr === 'Error' || valStr === 'Infinity' || valStr === '-Infinity' || valStr === 'NaN') {
            return valStr;
        }
        // If current value contains operations or symbols, return directly
        if (/[+\-×÷^()!]/.test(valStr)) {
            return valStr;
        }
        const parts = valStr.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
        
        // Add thousand separators to integer part if numeric
        if (!isNaN(integerPart) && integerPart.length <= 15) {
            return Number(integerPart).toLocaleString('en-US') + decimalPart;
        }
        return valStr;
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    // Ripple effect on button click
    function createRipple(e) {
        const btn = e.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(btn.clientWidth, btn.clientHeight);
        const radius = diameter / 2;

        const rect = btn.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');

        const existingRipple = btn.querySelector('.ripple');
        if (existingRipple) existingRipple.remove();

        btn.appendChild(circle);
    }

    // -------------------------------------------------------------------------
    // 5. Calculator Input & Operations Logic
    // -------------------------------------------------------------------------
    function handleDigit(digit) {
        if (state.isEvaluated) {
            state.currentValue = digit === '.' ? '0.' : digit;
            state.expression = '';
            state.isEvaluated = false;
        } else {
            if (state.currentValue === '0' && digit !== '.') {
                state.currentValue = digit;
            } else {
                if (digit === '.' && state.currentValue.includes('.')) {
                    // Prevent duplicate decimal points in current token
                    const lastToken = state.currentValue.split(/[\+\-\*\/÷×^]/).pop();
                    if (lastToken.includes('.')) return;
                }
                state.currentValue += digit;
            }
        }
        updateDisplay();
    }

    function handleOperator(op) {
        const symbolMap = { '/': '÷', '*': '×', '-': '−', '+': '+', '^': '^' };
        const displayOp = symbolMap[op] || op;

        if (state.currentValue === 'Error') {
            state.currentValue = '0';
        }

        if (state.isEvaluated) {
            state.expression = state.currentValue + ' ' + displayOp + ' ';
            state.currentValue = '0';
            state.isEvaluated = false;
        } else {
            // Append current number and operator to expression
            if (state.currentValue !== '0' || state.expression === '') {
                state.expression += state.currentValue + ' ' + displayOp + ' ';
                state.currentValue = '0';
            } else {
                // If ending with an operator, replace it
                state.expression = state.expression.replace(/[÷×+−\^]\s*$/, displayOp + ' ');
            }
        }
        updateDisplay();
    }

    function handleInsert(char) {
        if (state.isEvaluated) {
            state.currentValue = char;
            state.expression = '';
            state.isEvaluated = false;
        } else {
            if (state.currentValue === '0') {
                state.currentValue = char;
            } else {
                state.currentValue += char;
            }
        }
        updateDisplay();
    }

    function handleClearAll() {
        state.currentValue = '0';
        state.expression = '';
        state.isEvaluated = false;
        updateDisplay();
    }

    function handleClearEntry() {
        state.currentValue = '0';
        updateDisplay();
    }

    function handleBackspace() {
        if (state.isEvaluated) {
            handleClearAll();
            return;
        }
        if (state.currentValue.length > 1) {
            state.currentValue = state.currentValue.slice(0, -1);
        } else {
            state.currentValue = '0';
        }
        updateDisplay();
    }

    function handleNegate() {
        if (state.currentValue === '0' || state.currentValue === 'Error') return;
        if (state.currentValue.startsWith('-')) {
            state.currentValue = state.currentValue.slice(1);
        } else {
            state.currentValue = '-' + state.currentValue;
        }
        updateDisplay();
    }

    function handleConstant(c) {
        let val;
        if (c === 'pi') val = Math.PI.toString();
        if (c === 'e') val = Math.E.toString();
        if (val) {
            state.currentValue = Number(val).toFixed(8).replace(/\.?0+$/, '');
            state.isEvaluated = false;
            updateDisplay();
        }
    }

    function handleScientificFunc(funcName) {
        let num = parseFloat(state.currentValue);
        if (isNaN(num)) return;

        let result = 0;
        switch (funcName) {
            case 'sin':
                const radSin = state.angleMode === 'DEG' ? (num * Math.PI) / 180 : num;
                result = Math.sin(radSin);
                break;
            case 'cos':
                const radCos = state.angleMode === 'DEG' ? (num * Math.PI) / 180 : num;
                result = Math.cos(radCos);
                break;
            case 'tan':
                const radTan = state.angleMode === 'DEG' ? (num * Math.PI) / 180 : num;
                result = Math.tan(radTan);
                break;
            case 'sqrt':
                if (num < 0) {
                    state.currentValue = 'Error';
                    updateDisplay();
                    return;
                }
                result = Math.sqrt(num);
                break;
            case 'sqr':
                result = Math.pow(num, 2);
                break;
            case 'recip':
                if (num === 0) {
                    state.currentValue = 'Error';
                    updateDisplay();
                    return;
                }
                result = 1 / num;
                break;
            case 'percent':
                result = num / 100;
                break;
            case 'log':
                if (num <= 0) {
                    state.currentValue = 'Error';
                    updateDisplay();
                    return;
                }
                result = Math.log10(num);
                break;
            case 'ln':
                if (num <= 0) {
                    state.currentValue = 'Error';
                    updateDisplay();
                    return;
                }
                result = Math.log(num);
                break;
            case 'abs':
                result = Math.abs(num);
                break;
            case 'exp':
                result = Math.exp(num);
                break;
            case 'pow10':
                result = Math.pow(10, num);
                break;
            case 'fact':
                if (num < 0 || !Number.isInteger(num)) {
                    state.currentValue = 'Error';
                    updateDisplay();
                    return;
                }
                result = factorial(num);
                break;
            default:
                return;
        }

        // Clean floating point rounding issues
        result = sanitizeMathResult(result);
        state.expression = `${funcName}(${num}) =`;
        state.currentValue = result.toString();
        state.isEvaluated = true;
        saveHistory(`${funcName}(${num})`, state.currentValue);
        updateDisplay();
    }

    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        if (n > 170) return Infinity;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    function sanitizeMathResult(val) {
        if (typeof val !== 'number' || isNaN(val)) return 'Error';
        if (!isFinite(val)) return val.toString();
        // Fix floating point precision artifacts like 0.1 + 0.2 = 0.30000000000000004
        return parseFloat(val.toPrecision(12)).toString();
    }

    // -------------------------------------------------------------------------
    // 6. Safe Math Evaluation Engine
    // -------------------------------------------------------------------------
    function calculateResult() {
        try {
            let fullExpr = state.expression + state.currentValue;
            if (!fullExpr.trim()) return;

            // Prepare mathematical string for evaluation
            let sanitized = fullExpr
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-')
                .replace(/\^/g, '**');

            // Evaluate expression using Function
            const res = evaluateMathString(sanitized);
            const finalVal = sanitizeMathResult(res);

            saveHistory(fullExpr, finalVal);

            state.expression = fullExpr + ' =';
            state.currentValue = finalVal;
            state.isEvaluated = true;
            updateDisplay();
        } catch (e) {
            console.error(e);
            state.currentValue = 'Error';
            state.isEvaluated = true;
            updateDisplay();
        }
    }

    function evaluateMathString(str) {
        // Safe check for valid characters (digits, operators, spaces, decimals, parens)
        if (!/^[0-9+\-*/().\s*]+$/.test(str)) {
            throw new Error('Invalid math characters');
        }
        // Use Function constructor in strict mode for math evaluation
        const evalFn = new Function(`'use strict'; return (${str});`);
        return evalFn();
    }

    // -------------------------------------------------------------------------
    // 7. Memory Functions
    // -------------------------------------------------------------------------
    function handleMemory(action) {
        const num = parseFloat(state.currentValue);
        switch (action) {
            case 'mc':
                state.memory = 0;
                showToast('Memory Cleared (MC)');
                break;
            case 'mr':
                state.currentValue = sanitizeMathResult(state.memory);
                state.isEvaluated = false;
                showToast(`Memory Recalled: ${state.memory}`);
                break;
            case 'm+':
                if (!isNaN(num)) {
                    state.memory += num;
                    showToast(`Added to Memory: ${num}`);
                }
                break;
            case 'm-':
                if (!isNaN(num)) {
                    state.memory -= num;
                    showToast(`Subtracted from Memory: ${num}`);
                }
                break;
            case 'ms':
                if (!isNaN(num)) {
                    state.memory = num;
                    showToast(`Stored in Memory: ${num}`);
                }
                break;
        }
        updateDisplay();
    }

    // -------------------------------------------------------------------------
    // 8. History Persistence Engine
    // -------------------------------------------------------------------------
    function saveHistory(expr, res) {
        if (res === 'Error') return;
        const item = {
            expr: expr,
            result: res,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        state.history.unshift(item);
        if (state.history.length > 50) state.history.pop();
        localStorage.setItem('pinkpulse_history', JSON.stringify(state.history));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (state.history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">No history yet. Start calculating! 🌸</div>';
            return;
        }

        state.history.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <span class="hist-expr">${item.expr} =</span>
                <span class="hist-res">${item.result}</span>
            `;
            div.addEventListener('click', () => {
                state.currentValue = item.result;
                state.isEvaluated = false;
                updateDisplay();
                closeHistoryDrawer();
                showToast('Loaded calculation into display 💕');
            });
            historyList.appendChild(div);
        });
    }

    // -------------------------------------------------------------------------
    // 9. Converter View Logic (Tip & Unit Converter)
    // -------------------------------------------------------------------------
    const unitData = {
        length: {
            Meter: 1,
            Kilometer: 1000,
            Centimeter: 0.01,
            Millimeter: 0.001,
            Mile: 1609.34,
            Yard: 0.9144,
            Foot: 0.3048,
            Inch: 0.0254
        },
        temp: ['Celsius', 'Fahrenheit', 'Kelvin']
    };

    function updateTipCalculator() {
        const bill = parseFloat(tipBill.value) || 0;
        const pct = parseInt(tipPercent.value, 10) || 0;
        const people = parseInt(peopleVal.textContent, 10) || 1;

        tipPercentVal.textContent = `${pct}%`;

        const tipAmount = (bill * pct) / 100;
        const total = bill + tipAmount;
        const perPerson = total / people;

        tipTotalRes.textContent = `$${tipAmount.toFixed(2)}`;
        tipPerPersonRes.textContent = `$${perPerson.toFixed(2)}`;
    }

    function initUnitConverter(type) {
        unitFrom.innerHTML = '';
        unitTo.innerHTML = '';

        if (type === 'length') {
            Object.keys(unitData.length).forEach((u, i) => {
                unitFrom.add(new Option(u, u, false, i === 0));
                unitTo.add(new Option(u, u, false, i === 6)); // Foot default
            });
        } else if (type === 'temp') {
            unitData.temp.forEach((u, i) => {
                unitFrom.add(new Option(u, u, false, i === 0));
                unitTo.add(new Option(u, u, false, i === 1));
            });
        }
        updateUnitConverter();
    }

    function updateUnitConverter() {
        const val = parseFloat(unitInput.value);
        if (isNaN(val)) {
            unitResultVal.textContent = '---';
            return;
        }

        const type = state.converterSubtab;
        const from = unitFrom.value;
        const to = unitTo.value;
        let res = 0;

        if (type === 'length') {
            const meters = val * unitData.length[from];
            res = meters / unitData.length[to];
        } else if (type === 'temp') {
            res = convertTemperature(val, from, to);
        }

        unitResultVal.textContent = res % 1 === 0 ? res.toString() : res.toFixed(4);
    }

    function convertTemperature(val, from, to) {
        if (from === to) return val;
        let celsius = val;
        if (from === 'Fahrenheit') celsius = (val - 32) * (5 / 9);
        if (from === 'Kelvin') celsius = val - 273.15;

        if (to === 'Celsius') return celsius;
        if (to === 'Fahrenheit') return (celsius * 9 / 5) + 32;
        if (to === 'Kelvin') return celsius + 273.15;
        return val;
    }

    // -------------------------------------------------------------------------
    // 10. Event Listeners Setup
    // -------------------------------------------------------------------------
    
    // Keypad Click Delegation
    document.querySelectorAll('.btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            playClickSound();
            createRipple(e);

            const action = btn.dataset.action;
            const val = btn.dataset.val;

            if (!action && val) {
                handleDigit(val);
                return;
            }

            switch (action) {
                case 'op':
                    handleOperator(val);
                    break;
                case 'func':
                    handleScientificFunc(val);
                    break;
                case 'constant':
                    handleConstant(val);
                    break;
                case 'insert':
                    handleInsert(val);
                    break;
                case 'clear-all':
                    handleClearAll();
                    break;
                case 'clear-entry':
                    handleClearEntry();
                    break;
                case 'backspace':
                    handleBackspace();
                    break;
                case 'negate':
                    handleNegate();
                    break;
                case 'calculate':
                    calculateResult();
                    break;
                case 'toggle-angle':
                    state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
                    updateDisplay();
                    break;
            }
        });
    });

    // Memory Bar Buttons
    document.querySelectorAll('.mem-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            playClickSound();
            handleMemory(btn.dataset.action);
        });
    });

    // Mode Tabs Switching
    document.querySelectorAll('.mode-tabs .tab-btn').forEach((tab) => {
        tab.addEventListener('click', () => {
            playClickSound();
            document.querySelectorAll('.mode-tabs .tab-btn').forEach((t) => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const selected = tab.dataset.tab;
            state.activeTab = selected;

            if (selected === 'standard') {
                calcView.classList.add('active');
                scientificGrid.classList.add('hidden');
                converterView.classList.remove('active');
            } else if (selected === 'scientific') {
                calcView.classList.add('active');
                scientificGrid.classList.remove('hidden');
                converterView.classList.remove('active');
            } else if (selected === 'converter') {
                calcView.classList.remove('active');
                converterView.classList.add('active');
            }
        });
    });

    // Subtab Converter Switching
    document.querySelectorAll('.subtab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            playClickSound();
            document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.conv-type;
            state.converterSubtab = type;

            if (type === 'tip') {
                tipConverterCard.classList.remove('hidden');
                unitConverterCard.classList.add('hidden');
            } else {
                tipConverterCard.classList.add('hidden');
                unitConverterCard.classList.remove('hidden');
                initUnitConverter(type);
            }
        });
    });

    // Tip Calculator Listeners
    if (tipBill) tipBill.addEventListener('input', updateTipCalculator);
    if (tipPercent) tipPercent.addEventListener('input', updateTipCalculator);
    if (peopleMinus) {
        peopleMinus.addEventListener('click', () => {
            playClickSound();
            let p = parseInt(peopleVal.textContent, 10);
            if (p > 1) {
                peopleVal.textContent = p - 1;
                updateTipCalculator();
            }
        });
    }
    if (peoplePlus) {
        peoplePlus.addEventListener('click', () => {
            playClickSound();
            let p = parseInt(peopleVal.textContent, 10);
            peopleVal.textContent = p + 1;
            updateTipCalculator();
        });
    }

    // Unit Converter Listeners
    if (unitInput) unitInput.addEventListener('input', updateUnitConverter);
    if (unitFrom) unitFrom.addEventListener('change', updateUnitConverter);
    if (unitTo) unitTo.addEventListener('change', updateUnitConverter);
    if (swapUnitsBtn) {
        swapUnitsBtn.addEventListener('click', () => {
            playClickSound();
            const tmp = unitFrom.value;
            unitFrom.value = unitTo.value;
            unitTo.value = tmp;
            updateUnitConverter();
        });
    }

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('pinkpulse_sound', state.soundEnabled);
        if (state.soundEnabled) {
            soundOnIcon.classList.remove('hidden');
            soundOffIcon.classList.add('hidden');
            showToast('Sound Effects On 🔊');
            playClickSound();
        } else {
            soundOnIcon.classList.add('hidden');
            soundOffIcon.classList.remove('hidden');
            showToast('Sound Effects Muted 🔇');
        }
    });

    // Theme Switcher Engine
    themeDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        themeMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!themeMenu.contains(e.target) && e.target !== themeDropdownBtn) {
            themeMenu.classList.add('hidden');
        }
    });

    document.querySelectorAll('.theme-option').forEach((opt) => {
        opt.addEventListener('click', () => {
            playClickSound();
            const targetTheme = opt.dataset.setTheme;
            setTheme(targetTheme);
            themeMenu.classList.add('hidden');
        });
    });

    function setTheme(themeName) {
        state.theme = themeName;
        document.body.setAttribute('data-theme', themeName);
        localStorage.setItem('pinkpulse_theme', themeName);
        
        document.querySelectorAll('.theme-option').forEach((o) => {
            if (o.dataset.setTheme === themeName) {
                o.classList.add('active');
            } else {
                o.classList.remove('active');
            }
        });
        showToast(`Theme changed to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} 💕`);
    }

    // History Drawer Toggle
    historyToggleBtn.addEventListener('click', openHistoryDrawer);
    closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
    drawerBackdrop.addEventListener('click', closeHistoryDrawer);
    clearHistoryBtn.addEventListener('click', () => {
        playClickSound();
        state.history = [];
        localStorage.removeItem('pinkpulse_history');
        renderHistory();
        showToast('History Cleared ✨');
    });

    function openHistoryDrawer() {
        playClickSound();
        historyDrawer.classList.add('open');
        drawerBackdrop.classList.add('open');
    }

    function closeHistoryDrawer() {
        historyDrawer.classList.remove('open');
        drawerBackdrop.classList.remove('open');
    }

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        playClickSound();
        const textToCopy = state.currentValue;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast('Copied to clipboard! 💕');
            }).catch(() => fallbackCopy(textToCopy));
        } else {
            fallbackCopy(textToCopy);
        }
    });

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard! 💕');
        } catch (err) {
            showToast('Failed to copy');
        }
        document.body.removeChild(textarea);
    }

    // -------------------------------------------------------------------------
    // 11. Full Keyboard Support & Visual Feedback
    // -------------------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        // Ignore typing when inside text inputs (e.g. converter input)
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        const key = e.key;

        // Number keys
        if (/^[0-9]$/.test(key)) {
            triggerButtonVisual(`[data-val="${key}"]`);
            handleDigit(key);
            playClickSound();
        } else if (key === '.') {
            triggerButtonVisual('[data-val="."]');
            handleDigit('.');
            playClickSound();
        } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '^') {
            triggerButtonVisual(`[data-val="${key}"]`);
            handleOperator(key);
            playClickSound();
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            triggerButtonVisual('[data-action="calculate"]');
            calculateResult();
            playClickSound();
        } else if (key === 'Backspace') {
            triggerButtonVisual('[data-action="backspace"]');
            handleBackspace();
            playClickSound();
        } else if (key === 'Escape') {
            triggerButtonVisual('[data-action="clear-all"]');
            handleClearAll();
            playClickSound();
        } else if (key === '(' || key === ')') {
            triggerButtonVisual(`[data-val="${key}"]`);
            handleInsert(key);
            playClickSound();
        } else if (key === '%') {
            triggerButtonVisual('[data-val="percent"]');
            handleScientificFunc('percent');
            playClickSound();
        }
    });

    function triggerButtonVisual(selector) {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.classList.add('pressed');
            setTimeout(() => btn.classList.remove('pressed'), 150);
        }
    }

    // -------------------------------------------------------------------------
    // 12. Initialization
    // -------------------------------------------------------------------------
    setTheme(state.theme);
    if (!state.soundEnabled) {
        soundOnIcon.classList.add('hidden');
        soundOffIcon.classList.remove('hidden');
    }
    renderHistory();
    updateTipCalculator();
    updateDisplay();
});
