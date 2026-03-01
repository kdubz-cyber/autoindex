(() => {
  const STORAGE_KEY = 'autoindex_build_planner_v1';

  const STEP_LABELS = [
    '1. Vehicle',
    '2. Goal',
    '3. Constraints',
    '4. Suggested Moves'
  ];

  const SKILL_RANK = {
    Beginner: 1,
    Intermediate: 2,
    Advanced: 3
  };

  const NOISE_RANK = {
    Low: 1,
    Medium: 2,
    High: 3
  };

  const defaultState = {
    step: 1,
    vehicle: {
      make: '',
      model: '',
      year: '',
      trim: '',
      vehicleId: ''
    },
    goalId: '',
    constraints: {
      budget: 5000,
      skillLevel: 'Beginner',
      region: 'US',
      noiseTolerance: 'Medium'
    },
    // User-selected IDs only; engine adds required IDs separately.
    selectedPartIds: [],
    // Asking prices by part ID (string to preserve user typing).
    askingPrices: {}
  };

  let state = loadState();
  let catalog = {
    vehicles: [],
    parts: [],
    rules: {
      goalArchetypes: [],
      skillLevels: ['Beginner', 'Intermediate', 'Advanced'],
      regions: ['US', 'CA'],
      noiseTolerances: ['Low', 'Medium', 'High'],
      rules: []
    }
  };

  const dom = {
    stepper: document.getElementById('stepper'),
    stepPanels: Array.from(document.querySelectorAll('[data-step]')),
    makeSelect: document.getElementById('make-select'),
    modelSelect: document.getElementById('model-select'),
    yearSelect: document.getElementById('year-select'),
    trimSelect: document.getElementById('trim-select'),
    goalGrid: document.getElementById('goal-grid'),
    budgetInput: document.getElementById('budget-input'),
    skillSelect: document.getElementById('skill-select'),
    regionSelect: document.getElementById('region-select'),
    noiseSelect: document.getElementById('noise-select'),
    suggestedParts: document.getElementById('suggested-parts'),
    selectedPartsTableBody: document.getElementById('selected-parts-table-body'),
    summaryKpis: document.getElementById('summary-kpis'),
    summaryNote: document.getElementById('summary-note'),
    questLog: document.getElementById('quest-log'),
    requiredList: document.getElementById('required-list'),
    warningList: document.getElementById('warning-list'),
    backBtn: document.getElementById('back-btn'),
    nextBtn: document.getElementById('next-btn'),
    resetBtn: document.getElementById('reset-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    exportTextBtn: document.getElementById('export-text-btn'),
    wizardStatus: document.getElementById('wizard-status')
  };

  init();

  async function init() {
    bindEvents();
    renderStepper();
    setWizardStatus('Loading Build Planner data...');

    try {
      const [vehiclesPayload, partsPayload, rulesPayload] = await Promise.all([
        loadJsonFromDataDir('vehicles.json'),
        loadJsonFromDataDir('parts.json'),
        loadJsonFromDataDir('rules.json')
      ]);

      catalog = {
        vehicles: vehiclesPayload.vehicles || [],
        parts: partsPayload.parts || [],
        rules: {
          goalArchetypes: rulesPayload.goalArchetypes || [],
          skillLevels: rulesPayload.skillLevels || ['Beginner', 'Intermediate', 'Advanced'],
          regions: rulesPayload.regions || ['US', 'CA'],
          noiseTolerances: rulesPayload.noiseTolerances || ['Low', 'Medium', 'High'],
          rules: rulesPayload.rules || []
        }
      };

      hydrateStateAgainstCatalog();
      renderAll();
      setWizardStatus('Build Planner ready. Start by selecting your vehicle.');
    } catch (error) {
      console.error(error);
      setWizardStatus('Could not load planner data files. Confirm /data/*.json exists on this deployment.');
    }
  }

  function bindEvents() {
    dom.makeSelect.addEventListener('change', () => {
      setState((prev) => ({
        ...prev,
        vehicle: {
          make: dom.makeSelect.value,
          model: '',
          year: '',
          trim: '',
          vehicleId: ''
        }
      }));
    });

    dom.modelSelect.addEventListener('change', () => {
      setState((prev) => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          model: dom.modelSelect.value,
          year: '',
          trim: '',
          vehicleId: ''
        }
      }));
    });

    dom.yearSelect.addEventListener('change', () => {
      setState((prev) => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          year: dom.yearSelect.value,
          trim: '',
          vehicleId: ''
        }
      }));
    });

    dom.trimSelect.addEventListener('change', () => {
      setState((prev) => {
        const vehicleId = getVehicleIdFromFields(
          prev.vehicle.make,
          prev.vehicle.model,
          prev.vehicle.year,
          dom.trimSelect.value
        );

        return {
          ...prev,
          vehicle: {
            ...prev.vehicle,
            trim: dom.trimSelect.value,
            vehicleId
          },
          // Vehicle change can invalidate selected parts; clear user selection.
          selectedPartIds: [],
          askingPrices: {}
        };
      });
    });

    dom.budgetInput.addEventListener('input', () => {
      const parsed = Number(dom.budgetInput.value);
      setState((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          budget: Number.isFinite(parsed) && parsed > 0 ? parsed : prev.constraints.budget
        }
      }));
    });

    dom.skillSelect.addEventListener('change', () => {
      setState((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          skillLevel: dom.skillSelect.value
        }
      }));
    });

    dom.regionSelect.addEventListener('change', () => {
      setState((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          region: dom.regionSelect.value
        },
        selectedPartIds: [],
        askingPrices: {}
      }));
    });

    dom.noiseSelect.addEventListener('change', () => {
      setState((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          noiseTolerance: dom.noiseSelect.value
        }
      }));
    });

    dom.backBtn.addEventListener('click', () => {
      setState((prev) => ({
        ...prev,
        step: Math.max(1, prev.step - 1)
      }));
    });

    dom.nextBtn.addEventListener('click', () => {
      const validation = validateStep(state.step);
      if (!validation.ok) {
        setWizardStatus(validation.message);
        return;
      }

      setState((prev) => ({
        ...prev,
        step: Math.min(4, prev.step + 1)
      }));
    });

    dom.resetBtn.addEventListener('click', () => {
      if (!window.confirm('Reset your build planner state and clear selected parts?')) return;
      state = deepClone(defaultState);
      persistState();
      renderAll();
      setWizardStatus('Build reset. Start again from vehicle selection.');
    });

    dom.exportJsonBtn.addEventListener('click', () => {
      const plan = evaluateBuildPlan();
      const payload = {
        exportedAt: new Date().toISOString(),
        state,
        selectedVehicle: getSelectedVehicle(),
        goal: catalog.rules.goalArchetypes.find((goal) => goal.id === state.goalId) || null,
        plan
      };

      downloadFile(
        `autoindex-build-${Date.now()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
    });

    dom.exportTextBtn.addEventListener('click', () => {
      const plan = evaluateBuildPlan();
      const text = buildTextSummary(plan);
      downloadFile(`autoindex-build-${Date.now()}.txt`, text, 'text/plain;charset=utf-8');
    });
  }

  async function loadJsonFromDataDir(filename) {
    const candidates = buildDataCandidates(filename);
    let lastError = null;

    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(`Failed to load ${filename}. Last error: ${String(lastError)}`);
  }

  function buildDataCandidates(filename) {
    // Derive deployment root from current page path so GitHub Pages project paths work.
    const pagePath = window.location.pathname;
    const buildFileIndex = pagePath.indexOf('/build.html');
    const basePath = buildFileIndex >= 0 ? pagePath.slice(0, buildFileIndex + 1) : '/';

    const rawCandidates = [
      `${basePath}data/${filename}`,
      `./data/${filename}`,
      `/data/${filename}`
    ];

    // Remove duplicates while preserving order.
    return Array.from(new Set(rawCandidates));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepClone(defaultState);
      const parsed = JSON.parse(raw);
      return {
        ...deepClone(defaultState),
        ...parsed,
        vehicle: {
          ...deepClone(defaultState).vehicle,
          ...(parsed.vehicle || {})
        },
        constraints: {
          ...deepClone(defaultState).constraints,
          ...(parsed.constraints || {})
        },
        selectedPartIds: Array.isArray(parsed.selectedPartIds) ? parsed.selectedPartIds : [],
        askingPrices: parsed.askingPrices && typeof parsed.askingPrices === 'object' ? parsed.askingPrices : {}
      };
    } catch {
      return deepClone(defaultState);
    }
  }

  function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setState(updater) {
    state = updater(state);
    persistState();
    renderAll();
  }

  function hydrateStateAgainstCatalog() {
    const vehicleId = getVehicleIdFromFields(
      state.vehicle.make,
      state.vehicle.model,
      state.vehicle.year,
      state.vehicle.trim
    );

    state.vehicle.vehicleId = vehicleId || '';

    const goalExists = catalog.rules.goalArchetypes.some((goal) => goal.id === state.goalId);
    if (!goalExists) state.goalId = '';

    state.constraints.skillLevel = catalog.rules.skillLevels.includes(state.constraints.skillLevel)
      ? state.constraints.skillLevel
      : catalog.rules.skillLevels[0];

    state.constraints.region = catalog.rules.regions.includes(state.constraints.region)
      ? state.constraints.region
      : catalog.rules.regions[0];

    state.constraints.noiseTolerance = catalog.rules.noiseTolerances.includes(state.constraints.noiseTolerance)
      ? state.constraints.noiseTolerance
      : catalog.rules.noiseTolerances[1] || catalog.rules.noiseTolerances[0];

    state.step = clamp(state.step, 1, 4);
    persistState();
  }

  function renderAll() {
    renderStepper();
    renderVehicleSelectors();
    renderGoalCards();
    renderConstraintSelectors();
    renderStepPanels();

    const plan = evaluateBuildPlan();
    renderSuggestedParts(plan);
    renderSelectedTable(plan);
    renderSummary(plan);
    renderQuestLog(plan);
    renderWarnings(plan);
    renderWizardButtons(plan);
  }

  function renderStepper() {
    dom.stepper.innerHTML = STEP_LABELS.map((label, index) => {
      const stepNum = index + 1;
      const statusClass = state.step === stepNum ? 'active' : state.step > stepNum ? 'done' : '';
      return `<div class="step ${statusClass}">${label}</div>`;
    }).join('');
  }

  function renderStepPanels() {
    dom.stepPanels.forEach((panel) => {
      const stepNum = Number(panel.getAttribute('data-step'));
      panel.classList.toggle('hidden', stepNum !== state.step);
    });
  }

  function renderVehicleSelectors() {
    const makes = uniqueSorted(catalog.vehicles.map((v) => v.make));
    fillSelect(dom.makeSelect, makes, state.vehicle.make, 'Select make');

    const models = uniqueSorted(
      catalog.vehicles
        .filter((v) => !state.vehicle.make || v.make === state.vehicle.make)
        .map((v) => v.model)
    );
    fillSelect(dom.modelSelect, models, state.vehicle.model, 'Select model');

    const years = uniqueSorted(
      catalog.vehicles
        .filter(
          (v) =>
            (!state.vehicle.make || v.make === state.vehicle.make) &&
            (!state.vehicle.model || v.model === state.vehicle.model)
        )
        .map((v) => String(v.year))
    );
    fillSelect(dom.yearSelect, years, state.vehicle.year, 'Select year');

    const trims = uniqueSorted(
      catalog.vehicles
        .filter(
          (v) =>
            (!state.vehicle.make || v.make === state.vehicle.make) &&
            (!state.vehicle.model || v.model === state.vehicle.model) &&
            (!state.vehicle.year || String(v.year) === state.vehicle.year)
        )
        .map((v) => v.trim)
    );
    fillSelect(dom.trimSelect, trims, state.vehicle.trim, 'Select trim');
  }

  function renderGoalCards() {
    dom.goalGrid.innerHTML = catalog.rules.goalArchetypes
      .map(
        (goal) => `
          <button
            class="goal-card ${state.goalId === goal.id ? 'active' : ''}"
            data-goal-id="${goal.id}"
            role="radio"
            aria-checked="${state.goalId === goal.id ? 'true' : 'false'}"
            type="button"
          >
            <p class="goal-name">${escapeHtml(goal.label)}</p>
            <p class="goal-desc">${escapeHtml(goal.description)}</p>
          </button>
        `
      )
      .join('');

    dom.goalGrid.querySelectorAll('[data-goal-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const goalId = button.getAttribute('data-goal-id');
        setState((prev) => {
          const goal = catalog.rules.goalArchetypes.find((item) => item.id === goalId);
          const defaults = Array.isArray(goal?.defaultPartIds) ? goal.defaultPartIds : [];
          return {
            ...prev,
            goalId,
            // Seed user selection with defaults when goal changes.
            selectedPartIds: defaults,
            askingPrices: {}
          };
        });
      });
    });
  }

  function renderConstraintSelectors() {
    dom.budgetInput.value = String(state.constraints.budget);
    fillSelect(dom.skillSelect, catalog.rules.skillLevels, state.constraints.skillLevel, 'Select skill');
    fillSelect(dom.regionSelect, catalog.rules.regions, state.constraints.region, 'Select region');
    fillSelect(dom.noiseSelect, catalog.rules.noiseTolerances, state.constraints.noiseTolerance, 'Select tolerance');
  }

  function evaluateBuildPlan() {
    const selectedVehicle = getSelectedVehicle();
    const selectedGoal = catalog.rules.goalArchetypes.find((goal) => goal.id === state.goalId) || null;

    if (!selectedVehicle) {
      return {
        selectedVehicle: null,
        selectedGoal,
        compatibleParts: [],
        suggestedParts: [],
        selectedParts: [],
        selectedReasonMap: new Map(),
        requiredParts: [],
        warnings: [],
        nextSteps: selectedGoal?.nextSteps || [],
        questLog: ['Select a vehicle to unlock fitment-aware recommendations.'],
        totals: { usedAvg: 0, aftermarket: 0, dealer: 0 }
      };
    }

    const compatibleParts = catalog.parts.filter((part) => isPartCompatible(part, selectedVehicle, state.constraints.region));

    const skillRankMax = SKILL_RANK[state.constraints.skillLevel] || 1;
    const noiseRankMax = NOISE_RANK[state.constraints.noiseTolerance] || 2;

    const goalOrAllParts = selectedGoal
      ? compatibleParts.filter((part) => part.goals.includes(selectedGoal.id))
      : compatibleParts;

    const constrainedParts = goalOrAllParts.filter(
      (part) =>
        (SKILL_RANK[part.skillLevelRequired] || 3) <= skillRankMax &&
        Number(part.noiseLevel || 0) <= noiseRankMax
    );

    const suggestedParts = constrainedParts
      .slice()
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
      .slice(0, 12);

    const userSelectedIds = state.selectedPartIds.filter((id) => compatibleParts.some((part) => part.id === id));

    const selectedReasonMap = new Map();
    const selectedById = new Map();
    const blockedIds = new Set();
    const warnings = [];
    const nextSteps = new Set(selectedGoal?.nextSteps || []);

    const addPart = (partId, reasonText) => {
      if (blockedIds.has(partId)) return false;
      const part = compatibleParts.find((item) => item.id === partId);
      if (!part) {
        warnings.push(`Required part ${partId} is unavailable for this vehicle/region.`);
        return false;
      }

      // Enforce direct part-level conflict rules.
      const conflictFound = Array.from(selectedById.values()).find(
        (existing) => existing.conflicts.includes(part.id) || part.conflicts.includes(existing.id)
      );

      if (conflictFound) {
        warnings.push(`${part.name} conflicts with ${conflictFound.name}; keeping ${conflictFound.name}.`);
        return false;
      }

      if (!selectedById.has(part.id)) {
        selectedById.set(part.id, part);
        selectedReasonMap.set(part.id, reasonText);
        return true;
      }

      return false;
    };

    // Start with user choices. If empty, seed with goal defaults for guided onboarding.
    const seedIds = userSelectedIds.length
      ? userSelectedIds
      : (selectedGoal?.defaultPartIds || []).filter((id) => compatibleParts.some((part) => part.id === id));

    seedIds.forEach((partId) => {
      const reason = userSelectedIds.length ? 'Selected by user' : 'Suggested by archetype';
      addPart(partId, reason);
    });

    // Multi-pass evaluation to settle dependencies and rule outcomes.
    for (let iteration = 0; iteration < 5; iteration += 1) {
      let changed = false;

      // Enforce part-level dependencies.
      Array.from(selectedById.values()).forEach((part) => {
        (part.dependencies || []).forEach((requiredId) => {
          if (addPart(requiredId, `Required by ${part.name}`)) changed = true;
        });
      });

      // Evaluate declarative rules from rules.json.
      catalog.rules.rules.forEach((rule) => {
        if (!isRuleMatch(rule, selectedById, selectedGoal, state.constraints)) return;

        (rule.warnings || []).forEach((message) => warnings.push(message));
        (rule.nextSteps || []).forEach((step) => nextSteps.add(step));

        (rule.blockPartIds || []).forEach((blockedId) => {
          blockedIds.add(blockedId);
          if (selectedById.has(blockedId)) {
            selectedById.delete(blockedId);
            selectedReasonMap.delete(blockedId);
            changed = true;
          }
        });

        (rule.requirePartIds || []).forEach((requiredId) => {
          if (addPart(requiredId, `Rule requirement (${rule.id})`)) changed = true;
        });
      });

      if (!changed) break;
    }

    const selectedParts = Array.from(selectedById.values()).sort(
      (a, b) => Number(b.priority || 0) - Number(a.priority || 0)
    );

    const requiredParts = selectedParts.filter((part) => {
      const reason = selectedReasonMap.get(part.id) || '';
      return reason !== 'Selected by user' && reason !== 'Suggested by archetype';
    });

    const totals = selectedParts.reduce(
      (acc, part) => {
        acc.usedAvg += Number(part.pricing.usedAvg || 0);
        acc.aftermarket += Number(part.pricing.aftermarketNewAvg || 0);
        acc.dealer += Number(part.pricing.dealerNew || 0);
        return acc;
      },
      { usedAvg: 0, aftermarket: 0, dealer: 0 }
    );

    if (totals.aftermarket > state.constraints.budget) {
      warnings.push('Estimated aftermarket total exceeds your budget. Consider phased upgrades.');
    }

    const questLog = buildQuestLog({
      selectedVehicle,
      selectedGoal,
      selectedParts,
      selectedReasonMap,
      warnings,
      nextSteps: Array.from(nextSteps)
    });

    return {
      selectedVehicle,
      selectedGoal,
      compatibleParts,
      suggestedParts,
      selectedParts,
      selectedReasonMap,
      requiredParts,
      warnings: uniqueSorted(warnings),
      nextSteps: Array.from(nextSteps),
      questLog,
      totals
    };
  }

  function renderSuggestedParts(plan) {
    if (state.step < 4) {
      dom.suggestedParts.innerHTML = '<div class="empty">Step into Suggested Moves to pick and review parts.</div>';
      return;
    }

    if (!plan.selectedVehicle) {
      dom.suggestedParts.innerHTML = '<div class="empty">Select a vehicle first.</div>';
      return;
    }

    if (plan.suggestedParts.length === 0) {
      dom.suggestedParts.innerHTML = '<div class="empty">No suggested parts matched your current constraints.</div>';
      return;
    }

    const selectedIds = new Set(plan.selectedParts.map((part) => part.id));

    dom.suggestedParts.innerHTML = plan.suggestedParts
      .map((part) => {
        const reason = plan.selectedReasonMap.get(part.id) || '';
        const isSelected = selectedIds.has(part.id);
        const isRequiredOnly = isSelected && !state.selectedPartIds.includes(part.id);

        return `
          <article class="part-item">
            <div class="part-top">
              <div>
                <p class="part-name">${escapeHtml(part.name)}</p>
                <p class="part-meta">${escapeHtml(part.description)}</p>
              </div>
              <label>
                <input
                  type="checkbox"
                  data-part-toggle="${part.id}"
                  ${isSelected ? 'checked' : ''}
                  ${isRequiredOnly ? 'disabled' : ''}
                  aria-label="Toggle ${escapeHtml(part.name)}"
                />
              </label>
            </div>
            <div class="chip-row">
              <span class="chip">${escapeHtml(part.category)}</span>
              <span class="chip">Skill: ${escapeHtml(part.skillLevelRequired)}</span>
              <span class="chip">Noise: ${escapeHtml(String(part.noiseLevel))}</span>
              ${reason ? `<span class="chip">${escapeHtml(reason)}</span>` : ''}
            </div>
            <div class="part-pricing">
              <div>Used range: $${fmt(part.pricing.usedRange[0])} - $${fmt(part.pricing.usedRange[1])} (avg $${fmt(part.pricing.usedAvg)})</div>
              <div>Aftermarket new avg: $${fmt(part.pricing.aftermarketNewAvg)}</div>
              <div>Dealer new: ${part.pricing.dealerNew ? `$${fmt(part.pricing.dealerNew)}` : 'N/A'}</div>
            </div>
          </article>
        `;
      })
      .join('');

    dom.suggestedParts.querySelectorAll('[data-part-toggle]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const partId = checkbox.getAttribute('data-part-toggle');
        setState((prev) => {
          const nextSelected = new Set(prev.selectedPartIds);
          if (checkbox.checked) nextSelected.add(partId);
          else nextSelected.delete(partId);
          return {
            ...prev,
            selectedPartIds: Array.from(nextSelected)
          };
        });
      });
    });
  }

  function renderSelectedTable(plan) {
    if (!plan.selectedParts.length) {
      dom.selectedPartsTableBody.innerHTML =
        '<tr><td colspan="7"><div class="empty">No selected parts yet. Complete the wizard and choose parts in Step 4.</div></td></tr>';
      return;
    }

    dom.selectedPartsTableBody.innerHTML = plan.selectedParts
      .map((part) => {
        const askingRaw = state.askingPrices[part.id] || '';
        const askingNumeric = parsePositiveNumber(askingRaw);
        const deal = computeDeal(part, askingNumeric);

        return `
          <tr>
            <td>
              <strong>${escapeHtml(part.name)}</strong>
              <div class="muted">${escapeHtml(part.category)} • ${escapeHtml(plan.selectedReasonMap.get(part.id) || 'Selected')}</div>
            </td>
            <td>
              $${fmt(part.pricing.usedRange[0])} - $${fmt(part.pricing.usedRange[1])}<br />
              <span class="muted">avg $${fmt(part.pricing.usedAvg)}</span>
            </td>
            <td>$${fmt(part.pricing.aftermarketNewAvg)}</td>
            <td>${part.pricing.dealerNew ? `$${fmt(part.pricing.dealerNew)}` : 'N/A'}</td>
            <td>
              <input type="number" min="0" step="1" data-asking-input="${part.id}" value="${escapeHtml(askingRaw)}" placeholder="USD" />
            </td>
            <td>
              ${deal
                ? `<span class="score-pill ${deal.className}">${deal.score.toFixed(1)} / 10</span><div class="muted">${escapeHtml(deal.label)}</div>`
                : '<span class="muted">Enter asking price</span>'}
            </td>
            <td>
              ${deal ? `${deal.savingsUsd >= 0 ? '+' : '-'}$${fmt(Math.abs(deal.savingsUsd))}` : '—'}
              ${deal ? `<div class="muted">${deal.savingsPct >= 0 ? '+' : ''}${deal.savingsPct.toFixed(1)}%</div>` : ''}
            </td>
          </tr>
        `;
      })
      .join('');

    dom.selectedPartsTableBody.querySelectorAll('[data-asking-input]').forEach((input) => {
      input.addEventListener('input', () => {
        const partId = input.getAttribute('data-asking-input');
        setState((prev) => ({
          ...prev,
          askingPrices: {
            ...prev.askingPrices,
            [partId]: input.value
          }
        }));
      });
    });
  }

  function renderSummary(plan) {
    const selectedCount = plan.selectedParts.length;
    const requiredCount = plan.requiredParts.length;
    const warningsCount = plan.warnings.length;

    const used = plan.totals.usedAvg;
    const aftermarket = plan.totals.aftermarket;

    dom.summaryKpis.innerHTML = `
      <div class="kpi">
        <div class="kpi-label">Selected parts</div>
        <div class="kpi-value">${selectedCount}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Required add-ons</div>
        <div class="kpi-value">${requiredCount}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Warnings</div>
        <div class="kpi-value">${warningsCount}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Budget vs aftermarket</div>
        <div class="kpi-value">$${fmt(state.constraints.budget - aftermarket)}</div>
      </div>
    `;

    dom.summaryNote.textContent = `Estimated used avg total: $${fmt(used)} • Estimated aftermarket total: $${fmt(aftermarket)}`;
  }

  function renderQuestLog(plan) {
    if (!plan.questLog.length) {
      dom.questLog.innerHTML = '<li class="muted">Complete the wizard to generate your build quest log.</li>';
      return;
    }

    dom.questLog.innerHTML = plan.questLog.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  }

  function renderWarnings(plan) {
    if (plan.requiredParts.length) {
      dom.requiredList.innerHTML = plan.requiredParts
        .map((part) => `<li>${escapeHtml(part.name)} <span class="muted">(${escapeHtml(plan.selectedReasonMap.get(part.id) || 'Required')})</span></li>`)
        .join('');
    } else {
      dom.requiredList.innerHTML = '<li class="muted">No extra required supporting mods.</li>';
    }

    if (plan.warnings.length) {
      dom.warningList.innerHTML = plan.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');
    } else {
      dom.warningList.innerHTML = '<li class="muted">No active warnings.</li>';
    }
  }

  function renderWizardButtons(plan) {
    dom.backBtn.disabled = state.step <= 1;
    dom.nextBtn.disabled = state.step >= 4;
    dom.nextBtn.textContent = state.step >= 4 ? 'Done' : 'Next';

    if (!plan.selectedVehicle) {
      setWizardStatus('Choose make/model/year/trim to start hard fitment filtering.');
    } else if (!state.goalId) {
      setWizardStatus('Select a build goal archetype to generate tailored recommendations.');
    } else if (state.step >= 4) {
      setWizardStatus('Use asking prices in the table to score deals and export your build.');
    }
  }

  function validateStep(step) {
    if (step === 1 && !getSelectedVehicle()) {
      return { ok: false, message: 'Select make, model, year, and trim before continuing.' };
    }

    if (step === 2 && !state.goalId) {
      return { ok: false, message: 'Choose a build goal archetype before continuing.' };
    }

    if (step === 3) {
      if (!Number.isFinite(state.constraints.budget) || state.constraints.budget < 200) {
        return { ok: false, message: 'Set a realistic budget (minimum $200).' };
      }
    }

    return { ok: true };
  }

  function buildQuestLog({ selectedVehicle, selectedGoal, selectedParts, selectedReasonMap, warnings, nextSteps }) {
    const log = [];

    if (selectedVehicle) {
      log.push(
        `Vehicle locked: ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.trim} (${selectedVehicle.drivetrain}).`
      );
    }

    if (selectedGoal) {
      log.push(`Build archetype: ${selectedGoal.label} — ${selectedGoal.description}`);
    }

    log.push(
      `Constraints: $${fmt(state.constraints.budget)} budget, ${state.constraints.skillLevel} skill, ${state.constraints.region} region, ${state.constraints.noiseTolerance} noise tolerance.`
    );

    selectedParts.forEach((part) => {
      const reason = selectedReasonMap.get(part.id) || 'Selected';
      log.push(`Part path: ${part.name} (${part.category}) → ${reason}.`);
    });

    if (warnings.length) {
      log.push(`Active warnings: ${warnings.length}. Review warning panel before finalizing purchases.`);
    }

    nextSteps.slice(0, 4).forEach((stepText) => {
      log.push(`Next step: ${stepText}`);
    });

    return log;
  }

  function isPartCompatible(part, vehicle, region) {
    const vehicleMatch = part.fitment.vehicleIds.includes(vehicle.id);
    const regionList = part.fitment.regions || [];
    const regionMatch = regionList.length === 0 || regionList.includes(region);
    return vehicleMatch && regionMatch;
  }

  function isRuleMatch(rule, selectedById, selectedGoal, constraints) {
    const when = rule.when || {};
    const selectedIds = Array.from(selectedById.keys());

    if (when.selectedPartIdsAny && !when.selectedPartIdsAny.some((id) => selectedIds.includes(id))) return false;
    if (when.selectedPartIdsAll && !when.selectedPartIdsAll.every((id) => selectedIds.includes(id))) return false;
    if (when.goalIds && (!selectedGoal || !when.goalIds.includes(selectedGoal.id))) return false;
    if (when.regions && !when.regions.includes(constraints.region)) return false;
    if (Number.isFinite(when.maxBudgetBelow) && !(constraints.budget < when.maxBudgetBelow)) return false;
    if (when.noiseToleranceIs && !when.noiseToleranceIs.includes(constraints.noiseTolerance)) return false;

    return true;
  }

  function computeDeal(part, asking) {
    if (!Number.isFinite(asking) || asking <= 0) return null;

    const usedMin = Number(part.pricing.usedRange[0] || 0);
    const usedMax = Number(part.pricing.usedRange[1] || 0);
    const usedAvg = Number(part.pricing.usedAvg || 0);
    const aftermarket = Number(part.pricing.aftermarketNewAvg || 0);
    const dealer = Number(part.pricing.dealerNew || 0);

    let score = 5;

    if (asking <= usedMin) score += 3;
    else if (asking <= usedAvg) score += 2;
    else if (asking <= usedMax) score += 0.5;
    else score -= Math.min(3, ((asking - usedMax) / Math.max(usedMax, 1)) * 4);

    if (aftermarket > 0 && asking > aftermarket) score -= 2;
    if (dealer > 0 && asking > dealer) score -= 3;

    // Extremely under-market prices can indicate incomplete or risky listings.
    if (asking < usedMin * 0.7) score -= 0.6;

    score = clamp(score, 0, 10);

    const referenceNew = dealer > 0 ? dealer : aftermarket;
    const savingsUsd = referenceNew - asking;
    const savingsPct = referenceNew > 0 ? (savingsUsd / referenceNew) * 100 : 0;

    let label = 'Fair value';
    let className = 'score-fair';

    if (score >= 7.5) {
      label = 'Strong deal';
      className = 'score-good';
    } else if (score <= 4.5) {
      label = 'Overpriced / risky';
      className = 'score-bad';
    }

    return { score, label, className, savingsUsd, savingsPct };
  }

  function getSelectedVehicle() {
    if (!state.vehicle.vehicleId) return null;
    return catalog.vehicles.find((v) => v.id === state.vehicle.vehicleId) || null;
  }

  function getVehicleIdFromFields(make, model, year, trim) {
    const match = catalog.vehicles.find(
      (vehicle) =>
        vehicle.make === make &&
        vehicle.model === model &&
        String(vehicle.year) === String(year) &&
        vehicle.trim === trim
    );

    return match ? match.id : '';
  }

  function fillSelect(selectEl, values, selectedValue, placeholder) {
    const optionsHtml = [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    ].join('');

    selectEl.innerHTML = optionsHtml;
    selectEl.value = values.includes(selectedValue) ? selectedValue : '';
  }

  function setWizardStatus(message) {
    dom.wizardStatus.textContent = message;
  }

  function buildTextSummary(plan) {
    const lines = [];
    lines.push('AutoIndex Build Planner Summary');
    lines.push('');
    lines.push(`Exported: ${new Date().toLocaleString()}`);

    if (plan.selectedVehicle) {
      lines.push(
        `Vehicle: ${plan.selectedVehicle.year} ${plan.selectedVehicle.make} ${plan.selectedVehicle.model} ${plan.selectedVehicle.trim}`
      );
    }

    if (plan.selectedGoal) lines.push(`Goal: ${plan.selectedGoal.label}`);

    lines.push(
      `Constraints: budget $${fmt(state.constraints.budget)}, skill ${state.constraints.skillLevel}, region ${state.constraints.region}, noise ${state.constraints.noiseTolerance}`
    );
    lines.push('');

    lines.push('Selected Parts:');
    if (!plan.selectedParts.length) {
      lines.push('- None selected');
    } else {
      plan.selectedParts.forEach((part) => {
        const ask = parsePositiveNumber(state.askingPrices[part.id]);
        const deal = computeDeal(part, ask);
        const reason = plan.selectedReasonMap.get(part.id) || 'Selected';

        lines.push(
          `- ${part.name} (${part.category}) | reason: ${reason} | used avg $${fmt(part.pricing.usedAvg)} | aftermarket new $${fmt(part.pricing.aftermarketNewAvg)}${part.pricing.dealerNew ? ` | dealer $${fmt(part.pricing.dealerNew)}` : ''}${deal ? ` | asking $${fmt(ask)} | score ${deal.score.toFixed(1)}/10` : ''}`
        );
      });
    }

    lines.push('');
    lines.push('Required Supporting Mods:');
    if (!plan.requiredParts.length) lines.push('- None');
    else plan.requiredParts.forEach((part) => lines.push(`- ${part.name}`));

    lines.push('');
    lines.push('Warnings:');
    if (!plan.warnings.length) lines.push('- None');
    else plan.warnings.forEach((warning) => lines.push(`- ${warning}`));

    lines.push('');
    lines.push('Quest Log:');
    plan.questLog.forEach((line) => lines.push(`- ${line}`));

    return lines.join('\n');
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function fmt(value) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function parsePositiveNumber(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(arr)).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
