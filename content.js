console.log("content.js load");

const MASK_CLS = "slaDarkBackground";
const DISABLED_MASK_CLS = "slaDisabledMask";
const LIGHT_AREA_CLS = "slaLightArea";

let currentTarget = null; // 当前被高亮的dom元素
function setCurrentTarget(value) {
  currentTarget = value;
}

// 初始化
(function init() {
  chrome.runtime.sendMessage({
    action: "startRunContent",
  });
  initConfigToMask();
  initOrResetLightRect();
})();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // 其他组件想要知道，现在content的聚光灯开了没有。
  if (request.action === "tellMeHasSpotLight") {
    const hasSpotLight = !!currentTarget;
    sendResponse(hasSpotLight);
  }

  if (request.action === "activeTabChange") {
    const maskDiv = document.querySelector(`.${MASK_CLS}`);
    // 有背景却没有聚光灯区域
    if (maskDiv && !currentTarget) {
      resetSpotLight();
    }
  }

  // 其他组件问下content加载了没
  if (request.action === "isContentThere") {
    sendResponse(true);
  }
});

// 处理暗度和模糊度(来自popup的range滑动条交互)
chrome.storage.onChanged.addListener(function handleBlurOrDarknessChange(
  changes,
  area
) {
  if (area === "local" && changes.deGreeOfBlur?.newValue) {
    setDeGreeOfBlurVar(changes.deGreeOfBlur.newValue);
  }

  if (area === "local" && changes.deGreeOfDarkness?.newValue) {
    setDeGreeOfDarknessVar(changes.deGreeOfDarkness.newValue);
  }
});

// 处理popup的SpotLight按钮的switch交互
chrome.runtime.onMessage.addListener(function handleSwitchSpotLightFromPopup(
  request,
  sender,
  sendResponse
) {
  //   tips:为什么不像上面一样storage监听switch的变化来处理，而是采用事件的方式？
  //    如果监听就会导致“双向数据流”！
  //    二者不一样。暗度和模糊度的change 只能在popup内。
  //    而switch按钮的checked（对应spotlightSwitch）变化的交互来源，既来自content，也可以是来自popup
  //      比如，popup的点击switch按钮。content的页面刷新、点击聚光灯外mask，得会导致spotlightSwitch change。
  //    可能造成一个循环：比如 点击聚光灯外mask -> resetSpotLight -> set switch false -> on switch change -> resetSpotLight
  //    这就是导致了“双向数据流”，难以理解且无法维护
  if (request.action === "startSelectArea") {
    createToSetMask();
    startSelectLightArea();
  }
  if (request.action === "resetSpotLight") {
    resetSpotLight();
  }
});

// 初始化mask配置
async function initConfigToMask() {
  const { deGreeOfBlur, deGreeOfDarkness } = await chrome.storage.local.get([
    "deGreeOfBlur",
    "deGreeOfDarkness",
  ]);
  setDeGreeOfBlurVar(deGreeOfBlur);
  setDeGreeOfDarknessVar(deGreeOfDarkness);
}

// 初始化或重置高亮区域
function initOrResetLightRect() {
  document.documentElement.style.setProperty("--slaLightAreaX", "0");
  document.documentElement.style.setProperty("--slaLightAreaY", "0");
  document.documentElement.style.setProperty("--slaLightAreaWidth", "0");
  document.documentElement.style.setProperty("--slaLightAreaHeight", "0");
}

// 开始选择聚光灯区域
function startSelectLightArea() {
  // 监听滑动选择高亮区域
  document.addEventListener("mousemove", handleMousemoveToSelectArea);
  // 监听点击确认高亮区域
  document.addEventListener("mousedown", handleMouseDownToSelect, {
    once: true,
    capture: true,
  });

  // 阻止捕获
  document.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { once: true, capture: true }
  );

  function handleMouseDownToSelect(event) {
    console.log("sure select light area");
    // 用户点击mask，取消高亮区域
    document.addEventListener("click", handleClickMaskToReset);
    document.addEventListener("scroll", handleScrollToChangeLightArea);
    document.removeEventListener("mousemove", handleMousemoveToSelectArea);
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
      setLightRect(target);
    }
  }
}

// 重置content内的聚光灯样式
// source:
// 1. popup的switch btn
// 2. 点击聚光灯外mask
// 3. active tab change，但发现没有currentTarget，却有mask
function resetSpotLight() {
  chrome.runtime.sendMessage({
    action: "resetSpotLight",
  });
  removeMaskDom();
  currentTarget?.classList.remove(LIGHT_AREA_CLS);
  setCurrentTarget(null);
  initOrResetLightRect();
  document.removeEventListener("scroll", handleScrollToChangeLightArea);
}

// 点击高亮区域外的mask，来取消聚光灯
function handleClickMaskToReset(event) {
  const { target } = event;
  if (target.closest(`.${LIGHT_AREA_CLS}`)) {
    return;
  }

  resetSpotLight();
  document.removeEventListener("click", handleClickMaskToReset);
}

// 用了debounce后不流畅，算了
function handleScrollToChangeLightArea() {
  setLightRect(currentTarget);
}

// 设置高亮区域
function setLightRect(_target) {
  const { x, y, width, height } = _target.getBoundingClientRect();
  // 不在视口了
  if (y > window.innerHeight || -y > height) {
    initOrResetLightRect();
    return;
  }
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

// 设置mask
function createToSetMask() {
  removeMaskDom();
  const maskDiv = document.createElement("div");
  maskDiv.classList.add(MASK_CLS);
  document.body.appendChild(maskDiv);
}
// 移除mask
function removeMaskDom() {
  const maskDiv = document.querySelector(`.${MASK_CLS}`);
  if (maskDiv) {
    document.body.removeChild(maskDiv);
  }
}

// 设置模糊度
function setDeGreeOfBlurVar(value) {
  document.documentElement.style.setProperty(
    "--slaDeGreeOfBlur",
    `${Number(value)}px`
  );
}

// 设置暗度
function setDeGreeOfDarknessVar(value) {
  document.documentElement.style.setProperty(
    "--slaDeGreeOfDark",
    `${Number(value) / 100}`
  );
}
