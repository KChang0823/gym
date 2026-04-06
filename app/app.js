// CONFIGURATION
const DEFAULT_VALUATION = 1.2;
const savedValuation = localStorage.getItem('gymValuation');

const CONFIG = {
  gasWebhookUrl: 'https://script.google.com/macros/s/AKfycbynZnMuPzKv8JBILf_WMoYLSqsB_a6owxUmkNl00cuKfKotIJE3j0ZFFz_ng8hQlcrh/exec',
  valuePerMinute: savedValuation ? parseFloat(savedValuation) : DEFAULT_VALUATION,
  monthlyCost: 988,
  mockData: {
    totalMinutes: 420,
    visits: 6
  }
};

let targetMinutes = Math.ceil(CONFIG.monthlyCost / CONFIG.valuePerMinute);

// DOM Elements
const elements = {
  totalMinutes: document.getElementById('total-minutes'),
  timeProgress: document.getElementById('time-progress'),
  earnedValue: document.getElementById('earned-value'),
  visitCount: document.getElementById('visit-count'),
  goalStatus: document.getElementById('goal-status'),
  valuationDesc: document.getElementById('valuation-desc'),
  // Modal Elements
  btnRoiSettings: document.getElementById('btn-roi-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  valuationSlider: document.getElementById('valuation-slider'),
  sliderValDisplay: document.getElementById('slider-val-display')
};

/**
 * 核心：取得健身紀錄資料
 */
async function fetchGymData() {
  if (!CONFIG.gasWebhookUrl) {
    console.log("Using mock data. Please set gasWebhookUrl to fetch real data.");
    return new Promise(resolve => setTimeout(() => resolve(CONFIG.mockData), 500));
  }

  try {
    const response = await fetch(CONFIG.gasWebhookUrl);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return {
      totalMinutes: data.totalMinutes || 0,
      visits: data.visits || 0
    };
  } catch (error) {
    console.error("Failed to fetch from GAS", error);
    return { totalMinutes: 0, visits: 0 };
  }
}

/**
 * 數字遞增動畫引擎 (Exponential easing to feel natural)
 */
function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);

    // ease-out-quint pattern for numbers
    const easeOutQuint = 1 - Math.pow(1 - progress, 5);
    const currentVal = Math.floor(easeOutQuint * (end - start) + start);

    element.innerHTML = currentVal.toLocaleString();
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.innerHTML = end.toLocaleString();
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * 初始化並渲染畫面
 */
async function initDashboard() {
  const data = await fetchGymData();

  const earned = Math.floor(data.totalMinutes * CONFIG.valuePerMinute);
  const progressRatio = Math.min((data.totalMinutes / targetMinutes) * 100, 100);

  // Trigger animations
  animateValue(elements.totalMinutes, 0, data.totalMinutes, 2000);
  animateValue(elements.earnedValue, 0, earned, 2200);
  animateValue(elements.visitCount, 0, data.visits, 1500);

  // Update progress bar horizontally via width
  // Use a slight delay so the number increments alongside the bar extending
  setTimeout(() => {
    elements.timeProgress.style.width = `${progressRatio}%`;
  }, 100);

  // Update subtext
  if (data.totalMinutes >= targetMinutes) {
    elements.goalStatus.innerHTML = `Break even achieved! You are in profit.`;
    elements.goalStatus.style.color = 'var(--accent)';
  } else {
    elements.goalStatus.innerHTML = `Target: ${targetMinutes} min to break even.`;
    elements.goalStatus.style.color = 'var(--text-muted)';
  }

  elements.valuationDesc.innerHTML = `Cost basis: NT$${CONFIG.monthlyCost} / month. Valuation at ${CONFIG.valuePerMinute}/min.`;
}

/**
 * 設定 Modal 與數值更新邏輯
 */
function setupModal() {
  // Init slider value
  elements.valuationSlider.value = CONFIG.valuePerMinute;
  elements.sliderValDisplay.innerText = `NT$ ${CONFIG.valuePerMinute}`;

  // Open modal
  elements.btnRoiSettings.addEventListener('click', () => {
    elements.settingsModal.showModal();
  });

  // Close modal
  elements.btnCloseModal.addEventListener('click', () => {
    elements.settingsModal.close();
  });

  // Close when clicking outside
  elements.settingsModal.addEventListener('click', (e) => {
    const dialogDimensions = elements.settingsModal.getBoundingClientRect()
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      elements.settingsModal.close();
    }
  });

  // Slider change
  elements.valuationSlider.addEventListener('input', (e) => {
    const newVal = parseFloat(e.target.value).toFixed(1);
    elements.sliderValDisplay.innerText = `NT$ ${newVal}`;
  });

  // Apply change on close
  elements.settingsModal.addEventListener('close', () => {
    const newVal = parseFloat(elements.valuationSlider.value);
    if (newVal !== CONFIG.valuePerMinute) {
      CONFIG.valuePerMinute = newVal;
      localStorage.setItem('gymValuation', newVal);
      targetMinutes = Math.ceil(CONFIG.monthlyCost / CONFIG.valuePerMinute);

      // Re-trigger visual updates
      initDashboard();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupModal();
  initDashboard();
});
