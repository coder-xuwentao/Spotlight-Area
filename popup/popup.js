console.log('popup.js loaded')

document.addEventListener('DOMContentLoaded', () => {
  const startSelectBtn = document.getElementById("slaStartSelect");
  startSelectBtn.addEventListener("click", startSelect);
})

async function startSelect() {
  await sendMessageToActiveTab({ action: "startSelect" })
}
async function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true });
  if (tab === undefined) {
    console.error('no tab')
    return;
  }
  console.log('tab: ', tab)
  const response = await chrome.tabs.sendMessage(tab.id, message);
  return response;
}
