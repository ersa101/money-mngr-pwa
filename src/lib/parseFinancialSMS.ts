type Suggestion = {
  account: { name?: string; bank?: string; score: number }
  category: { name: string; score: number }
  description: { text: string; score: number }
}

export type SMSParseResult = {
  original: string
  amount?: number
  currency?: string
  suggestions: Suggestion[]
}

const BANK_KEYWORDS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'BoB', 'Citi', 'HSBC']

const VENDOR_MAP: Record<string, string> = {
  amazon: 'Shopping',
  flipkart: 'Shopping',
  uber: 'Transport',
  ola: 'Transport',
  zomato: 'Food',
  swiggy: 'Food',
  petrol: 'Fuel',
  shell: 'Fuel',
  hpcl: 'Fuel',
  salary: 'Income',
  'bank transfer': 'Transfer'
}

function extractAmount(text: string) {
  const m = text.match(/(?:INR|Rs\.?|₹)?\s?([0-9]+(?:[\.,][0-9]{1,2})?)/i)
  if (!m) return null
  const clean = m[1].replace(/,/g, '').replace(',', '.')
  const num = parseFloat(clean)
  if (Number.isNaN(num)) return null
  return num
}

function findBank(text: string) {
  const found: string[] = []
  for (const b of BANK_KEYWORDS) {
    if (text.toLowerCase().includes(b.toLowerCase())) found.push(b)
  }
  return found
}

export function parseFinancialSMS(text: string): SMSParseResult {
  const amount = extractAmount(text) || undefined
  const banks = findBank(text)
  const vendorMatch = text.match(/(?:at|to|via)\s+([A-Za-z0-9&\.\-\s]+)/i)
  const vendor = vendorMatch ? vendorMatch[1].trim() : undefined

  const suggestions: Suggestion[] = []

  // base candidate descriptors
  const bankCandidates = banks.length ? banks : ['Unknown Bank']
  const vendorCandidates = vendor ? [vendor] : ['Unknown Vendor']

  // build up to 5 ranked suggestions using simple heuristics
  for (let i = 0; i < 5; i++) {
    const bank = bankCandidates[i] || bankCandidates[0]
    const vend = vendorCandidates[i] || vendorCandidates[0]
    const lowerVend = vend.toLowerCase()
    let category = 'Uncategorized'
    for (const k of Object.keys(VENDOR_MAP)) {
      if (lowerVend.includes(k)) {
        category = VENDOR_MAP[k]
        break
      }
    }

    const score = 1 - i * 0.15
    suggestions.push({
      account: { name: bank + ' account', bank, score: Math.max(0.1, score) },
      category: { name: category, score: Math.max(0.05, score - 0.05) },
      description: { text: `${amount ? amount : ''} ${vend ? 'at ' + vend : ''}`.trim(), score: Math.max(0.05, score - 0.1) }
    })
  }

  return { original: text, amount, currency: 'USD', suggestions }
}

export default parseFinancialSMS
