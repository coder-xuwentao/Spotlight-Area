console.log('popup.js loaded')

document.addEventListener('DOMContentLoaded', async () => {
  const slaSpotlightSwitch = document.getElementById("slaSpotlightSwitch");
  const slaRangeOfBlur = document.getElementById("slaRangeOfBlur");
  const slaRangeOfDarkness = document.getElementById("slaRangeOfDarkness");
  const slaDeGreeOfBlur = document.getElementById("slaDeGreeOfBlur");
  const slaDeGreeOfDarkness = document.getElementById("slaDeGreeOfDarkness");

  slaSpotlightSwitch.addEventListener("click", handleSwitchSpotlight);
  slaRangeOfBlur.addEventListener("input", setDeGreeOfBlur);
  slaRangeOfDarkness.addEventListener("input", setDeGreeOfDarkness);
  
  // 根据state 修改 配置UI（但是打开popup后才生效，所以下面得init一下）
  chrome.storage.onChanged.addListener(function changeConfigUIFromState(changes, area) {
    if (area === 'local' && changes.deGreeOfBlur?.newValue) {
      console.log('tao deGreeOfBlur change')
      setDeGreeOfBlurUI(changes.deGreeOfBlur.newValue)
    }

    if (area === 'local' && changes.deGreeOfDarkness?.newValue) {
      console.log('tao deGreeOfDarkness change')
      setDeGreeOfDarknessUI(changes.deGreeOfDarkness.newValue)
    }

    if (area === 'local' && changes.spotlightSwitch?.newValue) {
      console.log('tao spotlightSwitch change')
      setSpotlightSwitchUI(changes.spotlightSwitch.newValue)
    }
  });
  // 根据state 初始化 配置UI
  await initUIState();

  // 处理SpotLight按钮的switch交互
  async function handleSwitchSpotlight() {
    // tip不要直接从dom里拿目前checked，要保证状态唯一性，switch state只能来自storage, 然后在changeConfigUIFromState。根据state来修改dom checked
    const { spotlightSwitch: oldSpotlightSwitch } = await chrome.storage.local.get(['spotlightSwitch']);
    const newSpotlightSwitch = !oldSpotlightSwitch;
    await chrome.storage.local.set({ spotlightSwitch: newSpotlightSwitch })
    console.log('tao handleSwitchSpotlight');
    if (newSpotlightSwitch) {
      startSelectArea()
    } else {
      resetSpotLight()
    }
  }

  // 开始选择聚光灯区域
  async function startSelectArea() {
    // 得关闭，焦点才不会留在popup上 -- 这会导致第一次点击页面无效。
    document.addEventListener('mouseleave', () => window.close(), { 
      once: true,
    })
    await sendMessageToActiveTab({
      action: "startSelectArea"
    })
  }

  // 重置content内的聚光灯样式
  async function resetSpotLight() {
    await sendMessageToActiveTab({
      action: "resetSpotLight"
    })
  }

  // set 模糊度 State 
  async function setDeGreeOfBlur(event) {
    const value = event.target.value;
    chrome.storage.local.set({ deGreeOfBlur: value })
  }

  // set 暗度 State 
  async function setDeGreeOfDarkness(event) {
    const value = event.target.value;
    chrome.storage.local.set({ deGreeOfDarkness: value })
  }

  // 初始化UI的state
  async function initUIState() {
    const { deGreeOfBlur, deGreeOfDarkness, spotlightSwitch } = 
      await chrome.storage.local.get(['deGreeOfBlur', 'deGreeOfDarkness', 'spotlightSwitch']);
    
    setDeGreeOfBlurUI(deGreeOfBlur)
    setDeGreeOfDarknessUI(deGreeOfDarkness)
    setSpotlightSwitchUI(spotlightSwitch)
  }

  // 设置模糊滑动条样式
  function setDeGreeOfBlurUI(value) {
    slaDeGreeOfBlur.textContent = value
    slaRangeOfBlur.value = value
  }

  // 设置暗度滑动条样式
  function setDeGreeOfDarknessUI(value) {
    slaDeGreeOfDarkness.textContent = value
    slaRangeOfDarkness.value = value
  }

  // 设置switch样式
  function setSpotlightSwitchUI(value) {
    slaSpotlightSwitch.checked = value
  }
})

// 发送msg到当前页的content中
async function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({
    active: true
  });
  if (tab === undefined) {
    console.error('no tab')
    return;
  }
  // console.log('tab: ', tab)
  const response = await chrome.tabs.sendMessage(tab.id, message);
  return response;
}