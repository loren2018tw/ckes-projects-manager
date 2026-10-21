import test from 'node:test'
import assert from 'node:assert/strict'
import {
  requestAmount,
  projectDisbursed,
  projectRemaining
} from './projectBudget.js'

test('requestAmount：有手動金額時以手動金額為準', () => {
  assert.equal(
    requestAmount({
      manualAmount: 1200,
      items: [{ quantity: 2, unitPrice: 5000 }]
    }),
    1200
  )
})

test('requestAmount：手動金額為 0 時不退回品項合計', () => {
  assert.equal(
    requestAmount({
      manualAmount: 0,
      items: [{ quantity: 2, unitPrice: 5000 }]
    }),
    0
  )
})

test('requestAmount：手動金額為字串時轉為數字', () => {
  assert.equal(requestAmount({ manualAmount: '350.5' }), 350.5)
})

test('requestAmount：未填手動金額時合計品項小計', () => {
  assert.equal(
    requestAmount({
      manualAmount: null,
      items: [
        { quantity: 2, unitPrice: 500 },
        { quantity: '3', unitPrice: '100' }
      ]
    }),
    1300
  )
})

test('requestAmount：沒有品項時為 0', () => {
  assert.equal(requestAmount({ manualAmount: '' }), 0)
  assert.equal(requestAmount({}), 0)
  assert.equal(requestAmount(null), 0)
})

test('projectDisbursed：只合計指定專案的請購單', () => {
  const requests = [
    { fundProjectId: 'p1', manualAmount: 100 },
    {
      fundProjectId: 'p1',
      items: [{ quantity: 2, unitPrice: 50 }]
    },
    { fundProjectId: 'p2', manualAmount: 999 },
    { fundProjectId: null, manualAmount: 500 }
  ]

  assert.equal(projectDisbursed('p1', requests), 200)
  assert.equal(projectDisbursed('p2', requests), 999)
  assert.equal(projectDisbursed('p3', requests), 0)
  assert.equal(projectDisbursed('p1', null), 0)
})

test('projectRemaining：核定金額減去已動支金額', () => {
  const project = { id: 'p1', budget: 1000 }
  const requests = [
    { fundProjectId: 'p1', manualAmount: 250 },
    { fundProjectId: 'p2', manualAmount: 400 }
  ]

  assert.equal(projectRemaining(project, requests), 750)
})

test('projectRemaining：核定金額未填視為 0，可為負值', () => {
  const project = { id: 'p1', budget: null }
  const requests = [{ fundProjectId: 'p1', manualAmount: 250 }]

  assert.equal(projectRemaining(project, requests), -250)
  assert.equal(projectRemaining({ id: 'p1', budget: '' }, requests), -250)
})

test('projectRemaining：沒有任何請購單時等於核定金額', () => {
  assert.equal(projectRemaining({ id: 'p1', budget: 5000 }, []), 5000)
  assert.equal(projectRemaining(undefined, []), 0)
})
