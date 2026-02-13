// SMS Bank Transaction Parser
// Extracts transaction details from Indian bank SMS messages

export interface ParsedSMS {
  amount: number
  transactionType: 'EXPENSE' | 'INCOME'
  bankName: string | null
  accountLast4: string | null
  balance: number | null
  merchantName: string | null
  upiRef: string | null
  date: Date | null
  confidence: number // 0-100
  rawText: string
  suggestions: {
    accountName: string | null
    categoryName: string | null
  }
}

// Bank patterns with their identifiers
const BANK_PATTERNS: Record<string, RegExp[]> = {
  HDFC: [/hdfc/i, /hdfcbank/i],
  SBI: [/sbi/i, /state bank/i, /statebank/i],
  ICICI: [/icici/i],
  Axis: [/axis/i],
  Kotak: [/kotak/i],
  PNB: [/pnb/i, /punjab national/i],
  BOB: [/bob/i, /bank of baroda/i],
  Canara: [/canara/i],
  IndusInd: [/indusind/i],
  Yes: [/yes bank/i, /yesbank/i],
  IDBI: [/idbi/i],
  Union: [/union bank/i],
  'Google Pay': [/gpay/i, /google pay/i, /googlepay/i],
  PhonePe: [/phonepe/i, /phone pe/i],
  Paytm: [/paytm/i],
  Amazon: [/amazon pay/i, /amazonpay/i],
  CRED: [/cred/i],
}

// Transaction type keywords
const DEBIT_KEYWORDS = [
  'debited', 'debit', 'spent', 'withdrawn', 'withdrawal', 'payment',
  'purchase', 'paid', 'sent', 'transferred', 'txn', 'dr', 'deducted',
  'charged', 'using', 'toward', 'for rs', 'of rs', 'amt of rs',
]

const CREDIT_KEYWORDS = [
  'credited', 'credit', 'received', 'deposited', 'deposit', 'refund',
  'cashback', 'reversed', 'cr', 'added', 'transferred to your',
]

// Category suggestions based on keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'hotel', 'pizza',
    'burger', 'chai', 'tea', 'coffee', 'dominos', 'mcdonalds', 'kfc',
    'starbucks', 'dunkin', 'subway', 'dineout', 'eazydiner',
  ],
  Transportation: [
    'uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'petrol',
    'fuel', 'diesel', 'parking', 'toll', 'fastag', 'cab', 'taxi',
    'redbus', 'bus', 'flight', 'airline', 'indigo', 'spicejet',
  ],
  Shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho',
    'snapdeal', 'bigbasket', 'grofers', 'blinkit', 'zepto', 'dmart',
    'reliance', 'mall', 'shopping', 'store', 'mart', 'decathlon',
  ],
  Entertainment: [
    'netflix', 'prime video', 'hotstar', 'spotify', 'gaana', 'wynk',
    'youtube', 'movie', 'cinema', 'pvr', 'inox', 'bookmyshow',
    'gaming', 'playstation', 'xbox', 'steam',
  ],
  Utilities: [
    'electricity', 'electric', 'power', 'water', 'gas', 'broadband',
    'wifi', 'internet', 'jio', 'airtel', 'vi', 'vodafone', 'bsnl',
    'mobile', 'recharge', 'postpaid', 'prepaid', 'dth', 'tatasky',
  ],
  Health: [
    'pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine',
    'apollo', 'medplus', 'netmeds', '1mg', 'pharmeasy', 'wellness',
    'gym', 'fitness', 'cult', 'healthify',
  ],
  Education: [
    'school', 'college', 'university', 'course', 'udemy', 'coursera',
    'unacademy', 'byju', 'vedantu', 'books', 'stationery', 'exam',
    'education', 'tuition', 'coaching',
  ],
  Bills: [
    'bill', 'emi', 'loan', 'insurance', 'premium', 'rent', 'society',
    'maintenance', 'subscription', 'payment', 'installment',
  ],
}

// Amount extraction patterns
const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{1,2})?)/i,
  /([0-9,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  /(?:debited|credited|amount|amt|paid|received|sent)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:debited|credited|has been|was|is)/i,
]

// Account number patterns (last 4 digits)
const ACCOUNT_PATTERNS = [
  /(?:a\/c|ac|account|acct|card)[\s:]*(?:no\.?|number)?[\s:]*[x*]+(\d{4})/i,
  /[x*]{4,}(\d{4})/i,
  /(?:ending|linked)\s*(?:with)?\s*(\d{4})/i,
]

// Balance patterns
const BALANCE_PATTERNS = [
  /(?:bal|balance|avl\.?\s*bal|available\s*balance)[\s:]*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:is your|as|available)/i,
]

// UPI Reference patterns
const UPI_PATTERNS = [
  /(?:upi\s*ref|upi\s*id|ref\s*no|txn\s*id|transaction\s*id)[\s:]*([a-z0-9]+)/i,
  /(\d{12,})/,
]

// Date patterns
const DATE_PATTERNS = [
  /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
  /(\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4})/i,
]

// ============= Main Parser Function =============

export function parseSMS(smsText: string): ParsedSMS {
  const text = smsText.toLowerCase()
  let confidence = 0

  // Extract amount
  let amount = 0
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''))
      confidence += 30
      break
    }
  }

  // Detect transaction type
  let transactionType: 'EXPENSE' | 'INCOME' = 'EXPENSE'
  const hasDebitKeyword = DEBIT_KEYWORDS.some(kw => text.includes(kw))
  const hasCreditKeyword = CREDIT_KEYWORDS.some(kw => text.includes(kw))

  if (hasCreditKeyword && !hasDebitKeyword) {
    transactionType = 'INCOME'
    confidence += 20
  } else if (hasDebitKeyword) {
    transactionType = 'EXPENSE'
    confidence += 20
  }

  // Detect bank
  let bankName: string | null = null
  for (const [bank, patterns] of Object.entries(BANK_PATTERNS)) {
    if (patterns.some(p => p.test(text))) {
      bankName = bank
      confidence += 15
      break
    }
  }

  // Extract account last 4 digits
  let accountLast4: string | null = null
  for (const pattern of ACCOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      accountLast4 = match[1]
      confidence += 10
      break
    }
  }

  // Extract balance
  let balance: number | null = null
  for (const pattern of BALANCE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      balance = parseFloat(match[1].replace(/,/g, ''))
      confidence += 5
      break
    }
  }

  // Extract UPI reference
  let upiRef: string | null = null
  for (const pattern of UPI_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      upiRef = match[1]
      break
    }
  }

  // Extract date
  let date: Date | null = null
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const parsed = new Date(match[1])
      if (!isNaN(parsed.getTime())) {
        date = parsed
        break
      }
    }
  }

  // Extract merchant name (heuristic)
  let merchantName: string | null = null
  const merchantPatterns = [
    /(?:at|to|from|for|@)\s+([a-z0-9\s]+?)(?:\s+on|\s+ref|\s+upi|\.|,|$)/i,
    /(?:paid|sent|received)\s+(?:to|from)?\s*([a-z0-9\s]+?)(?:\s+on|\s+ref|\.|,|$)/i,
  ]
  for (const pattern of merchantPatterns) {
    const match = smsText.match(pattern)
    if (match && match[1].trim().length > 2) {
      merchantName = match[1].trim()
      break
    }
  }

  // Suggest category based on keywords
  let categoryName: string | null = null
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      categoryName = category
      confidence += 10
      break
    }
  }

  // Suggest account name based on bank
  let accountName: string | null = null
  if (bankName) {
    accountName = bankName
    if (accountLast4) {
      accountName += ` ${accountLast4}`
    }
  }

  // Cap confidence at 100
  confidence = Math.min(confidence, 100)

  return {
    amount,
    transactionType,
    bankName,
    accountLast4,
    balance,
    merchantName,
    upiRef,
    date,
    confidence,
    rawText: smsText,
    suggestions: {
      accountName,
      categoryName,
    },
  }
}

// ============= Helper Functions =============

export function formatParsedSMS(parsed: ParsedSMS): string {
  const lines: string[] = []

  lines.push(`Amount: ₹${parsed.amount.toLocaleString('en-IN')}`)
  lines.push(`Type: ${parsed.transactionType}`)

  if (parsed.bankName) lines.push(`Bank: ${parsed.bankName}`)
  if (parsed.accountLast4) lines.push(`Account: ****${parsed.accountLast4}`)
  if (parsed.merchantName) lines.push(`Merchant: ${parsed.merchantName}`)
  if (parsed.balance !== null) lines.push(`Balance: ₹${parsed.balance.toLocaleString('en-IN')}`)
  if (parsed.upiRef) lines.push(`UPI Ref: ${parsed.upiRef}`)
  if (parsed.date) lines.push(`Date: ${parsed.date.toLocaleDateString('en-IN')}`)

  lines.push(`Confidence: ${parsed.confidence}%`)

  if (parsed.suggestions.accountName) {
    lines.push(`Suggested Account: ${parsed.suggestions.accountName}`)
  }
  if (parsed.suggestions.categoryName) {
    lines.push(`Suggested Category: ${parsed.suggestions.categoryName}`)
  }

  return lines.join('\n')
}

export function shouldAutoSubmit(parsed: ParsedSMS): boolean {
  return parsed.confidence >= 70 && parsed.amount > 0
}

// ============= Batch Parser =============

export function parseSMSBatch(messages: string[]): ParsedSMS[] {
  return messages.map(parseSMS).filter(p => p.amount > 0)
}

export default parseSMS
