/**
 * 專案經費計算的單一來源。
 *
 * 名詞定義見根目錄 GLOSSARY.md：
 * - 實支金額：以手動填寫的金額為準，否則為品項小計合計。
 * - 已動支金額：某專案所有請購單的實支金額合計。
 * - 剩餘經費：核定金額 − 已動支金額。
 */

export function requestAmount(request) {
  if (!request) return 0

  const manual = request.manualAmount
  if (manual !== null && manual !== undefined && manual !== '') {
    return Number(manual) || 0
  }

  return (request.items || []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)
}

export function projectDisbursed(projectId, requests) {
  if (!projectId || !Array.isArray(requests)) return 0

  return requests
    .filter(request => request.fundProjectId === projectId)
    .reduce((sum, request) => sum + requestAmount(request), 0)
}

export function projectRemaining(project, requests) {
  const budget = Number(project?.budget) || 0
  return budget - projectDisbursed(project?.id, requests)
}
