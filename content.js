console.log("content.js load");

const MASK_CLS = "slaDarkBackground";
const LIGHT_AREA_CLS = "slaLightArea";

let currentTarget = null;
let isSure = false;
function setCurrentTarget(value) {
  currentTarget = value;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelect") {
    setMask();
    startSelectEvnet();
  }
});

// 设置mask
function setMask() {
  const newMaskdiv = document.createElement("div");
  newMaskdiv.setAttribute("id", "slaDarkBackground");
  newMaskdiv.classList.add(MASK_CLS);
  document.body.appendChild(newMaskdiv);
}
// 移除mask
function removeMask() {
  const newMaskdiv = document.querySelector(`.${MASK_CLS}`);
  document.body.removeChild(newMaskdiv);
}

// 绑定事件
function startSelectEvnet() {
  const dehandleMousemoveToSelectArea = debounce(handleMousemoveToSelectArea);

  // 用户滑动选择高亮区域
  document.addEventListener("mousemove", dehandleMousemoveToSelectArea);
  // 用户点击确认高亮区域
  document.addEventListener("click", handleClickToSure);

  function handleClickToSure() {
    console.log("sure select light area");
    isSure = true;
    // 用户点击mask，取消高亮区域
    document.addEventListener("click", handleClickMaskToReset);
    document.addEventListener("scroll", handleScroll);
    document.removeEventListener("mousemove", dehandleMousemoveToSelectArea);
    document.removeEventListener("click", handleClickToSure);
  }

  function handleClickMaskToReset(event) {
    const { target } = event;
    if (target.closest(`.${LIGHT_AREA_CLS}`)) {
      return;
    }
    isSure = false;
    removeMask();
    currentTarget.classList.remove(LIGHT_AREA_CLS);
    setCurrentTarget(null);
    resetCssVar();
    document.removeEventListener("click", handleClickMaskToReset);
    document.removeEventListener("scroll", handleScroll);
  }

  function handleMousemoveToSelectArea(event) {
    const { target } = event;
    if (target !== currentTarget && currentTarget !== null) {
      currentTarget.classList.remove(LIGHT_AREA_CLS);
    }
    if (target !== currentTarget) {
      setCurrentTarget(target);
    }

    if (target) {
      target.classList.add(LIGHT_AREA_CLS);
      setCssVar(target);
    }
  }

  function handleScroll() {
    setCssVar(currentTarget);
  }

  function setCssVar(_target) {
    const { x, y, width, height } = _target.getBoundingClientRect();
    document.documentElement.style.setProperty("--slaLightAreaX", `${x}px`);
    document.documentElement.style.setProperty("--slaLightAreaY", `${y}px`);
    document.documentElement.style.setProperty(
      "--slaLightAreaWidth",
      `${width}px`
    );
    document.documentElement.style.setProperty(
      "--slaLightAreaHeight",
      `${height}px`
    );
  }

  function resetCssVar() {
    document.documentElement.style.removeProperty("--slaLightAreaX");
    document.documentElement.style.removeProperty("--slaLightAreaY");
    document.documentElement.style.removeProperty("--slaLightAreaWidth");
    document.documentElement.style.removeProperty("--slaLightAreaHeight");
  }
}

function debounce(fn, interval = 100) {
  let timeout = null;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, arguments);
    }, interval);
  };
}
