// 定义state：把保存在storage的数据
// 关于state位置的约定：组件的state只在组件或者在background里set。
//    如果content想要改popup的state，那content应该发消息给 popup/background 去改。不然会乱
//    todo: 是否应该统一在background来管理state? 暂时content没有使用 storage.local.set。先这样吧。

chrome.runtime.onInstalled.addListener(async function initState() {
  initState();
  
  async function initState() {
    const { deGreeOfBlur, deGreeOfDarkness, spotlightSwitch } =
      await chrome.storage.local.get(['deGreeOfBlur', 'deGreeOfDarkness', 'spotlightSwitch']);
    
    if (deGreeOfBlur === undefined) {
      chrome.storage.local.set({ deGreeOfBlur: 1 })
    }
    if (deGreeOfDarkness === undefined) {
      chrome.storage.local.set({ deGreeOfDarkness: 30 })
    }

    if (spotlightSwitch === undefined) {
      chrome.storage.local.set({ spotlightSwitch: false })
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // 激活的tab变了
  await activeTabChange()
  // 从content中获取是否存在聚光灯
  await resetSpotlightSwitchDepsOnContent()

  async function activeTabChange() {
    await chrome.tabs.sendMessage(activeInfo.tabId, { action: 'activeTabChange'})
  }
  async function resetSpotlightSwitchDepsOnContent() {
    // 这里是根据currentTarget。而不是mask！
    //    要考虑到存在mask却不存在current的中间状态 -- 用户点了switch却没选聚光灯区域。记得在content重置mask
    const hasSpotLight = await chrome.tabs.sendMessage(activeInfo.tabId, { action: 'tellMeHasSpotLight'});
    if (hasSpotLight !== undefined) {
      chrome.storage.local.set({ spotlightSwitch: hasSpotLight })
    }
  }
})

// 处理来自content的action
chrome.runtime.onMessage.addListener(function handleActionFromContent(request, sender, sendResponse) {
  if (request.action === "startRunContent") {
    // run content意味着页面刚打开、或者刷新
    chrome.storage.local.set({ spotlightSwitch: false })
  }

  if (request.action === "resetSpotLight") {
    // content重制聚光灯
    chrome.storage.local.set({ spotlightSwitch: false })
  }
})
