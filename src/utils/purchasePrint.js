import JSZip from 'jszip'

function toRocYear(dateStr) {
  if (!dateStr) return { yy: '', mm: '', dd: '' }
  const [y, m, d] = dateStr.split('-')
  return {
    yy: String(Number(y) - 1911),
    mm: String(Number(m)),
    dd: String(Number(d))
  }
}

function calcItemTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
}

function calcAmount(items) {
  return (items || []).reduce((sum, item) => sum + calcItemTotal(item), 0)
}

function calcActualAmount(request) {
  if (
    request.manualAmount !== null &&
    request.manualAmount !== undefined &&
    request.manualAmount !== ''
  ) {
    return Number(request.manualAmount)
  }
  return calcAmount(request.items)
}

function splitDigits(amount) {
  const digits = String(Math.floor(amount)).split('').reverse()
  const result = {}
  for (let i = 0; i <= 8; i++) {
    result[String(i)] = digits[i] !== undefined ? digits[i] : '-'
  }
  return result
}

function makeBlankItem() {
  return {
    name: '',
    spec: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    _itemTotal: ''
  }
}

function placeholderRegex(name) {
  const chars = [...name].map(char =>
    char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  return new RegExp(
    `\\{(?:<[^>]+>)*${chars.join('(?:<[^>]+>)*')}(?:<[^>]+>)*\\}`,
    'g'
  )
}

function normalizeContentXml(xmlText) {
  xmlText = xmlText.replace(/<text:bookmark-[^>]*\/?>/g, '')
  xmlText = xmlText.replace(/<text:bookmark[^>]*\/?>/g, '')
  xmlText = xmlText.replace(/<text:reference-mark-[^>]*\/?>/g, '')

  const splitPlaceholders = [
    'purpose',
    'special_fund_name',
    'manufacturer',
    'yy',
    'mm',
    'dd',
    'note',
    'amount',
    '8',
    '7',
    '6',
    '5',
    '4',
    '3',
    '2',
    '1',
    '0'
  ]

  for (const name of splitPlaceholders) {
    xmlText = xmlText.replace(placeholderRegex(name), `{${name}}`)
  }

  return xmlText
}

function prepareItems(request) {
  const items = (request.items || []).map(item => ({
    name: item.name || '',
    spec: item.spec || '',
    unit: item.unit || '',
    quantity: String(item.quantity ?? ''),
    unitPrice: String(item.unitPrice ?? ''),
    _itemTotal: String(calcItemTotal(item))
  }))
  const minRows = 7
  if (items.length < minRows) {
    const padding = Array.from({ length: minRows - items.length }, () =>
      makeBlankItem()
    )
    return [...items, ...padding]
  }
  return items
}

export async function generateOdtBlob(request) {
  const resp = await fetch('/voucher_template.odt')
  if (!resp.ok) throw new Error('無法讀取範本檔')
  const buffer = await resp.arrayBuffer()

  const zip = await JSZip.loadAsync(buffer)
  let contentXml = await zip.files['content.xml'].async('string')

  contentXml = normalizeContentXml(contentXml)

  const { yy, mm, dd } = toRocYear(request.date)

  const placeholders = {
    purpose: request.description || '',
    special_fund_name: request.fundProject
      ? `【專款：${request.fundProject}】`
      : '',
    manufacturer: request.vendor || '',
    yy,
    mm,
    dd,
    note: request.remark || ''
  }

  const amount = calcAmount(request.items)
  placeholders.amount = String(amount)

  const actualAmount = calcActualAmount(request)
  const digitParts = splitDigits(actualAmount)
  Object.assign(placeholders, digitParts)

  const itemsData = prepareItems(request)

  const itemNamePos = contentXml.indexOf('{item_name}')
  if (itemNamePos !== -1) {
    const rowStart = contentXml.lastIndexOf('<table:table-row', itemNamePos)
    const rowEnd =
      contentXml.indexOf('</table:table-row>', itemNamePos) +
      '</table:table-row>'.length
    const fullRowXml = contentXml.slice(rowStart, rowEnd)

    const noteRowStart = contentXml.lastIndexOf(
      '<table:table-row',
      rowStart - 1
    )
    const noteRowEnd =
      contentXml.indexOf('</table:table-row>', noteRowStart) +
      '</table:table-row>'.length
    const noteRowXml = contentXml.slice(noteRowStart, noteRowEnd)

    const rightBlockUpdated = noteRowXml.replace(
      /(<table:table-cell[^>]*?)(table:number-rows-spanned)="\d+"/,
      (match, before, attr) => {
        const newRows = itemsData.length + 2
        return `${before}${attr}="${newRows}"`
      }
    )

    const itemRows = itemsData.map(item => {
      let row = fullRowXml
      const itemPlaceholders = {
        item_name: item.name,
        item_spec: item.spec,
        item_quantity: item.quantity,
        item_unit: item.unit,
        item_price: item.unitPrice,
        item_total: item._itemTotal
      }
      for (const [key, val] of Object.entries(itemPlaceholders)) {
        row = row.replaceAll(`{${key}}`, val)
      }
      return row
    })
    contentXml = contentXml.replace(fullRowXml, itemRows.join(''))
    contentXml = contentXml.replace(noteRowXml, rightBlockUpdated)
  }

  for (const [key, val] of Object.entries(placeholders)) {
    contentXml = contentXml.replaceAll(`{${key}}`, String(val))
  }

  zip.file('content.xml', contentXml)
  const outBlob = await zip.generateAsync({ type: 'blob' })
  return outBlob
}

export async function downloadOdt(request) {
  const blob = await generateOdtBlob(request)
  const fileName = `請購單_${request.date || '無日期'}_${(request.description || '未設定').slice(0, 20)}.odt`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
