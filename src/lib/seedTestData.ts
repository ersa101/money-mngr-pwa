'use client'

import { db } from "./db"

// deterministic pseudo-random generator
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randBetween(rnd: () => number, min: number, max: number) {
  return Math.round((min + rnd() * (max - min)) * 100) / 100
}

export async function seedComplexTestData(seed = 12345) {
  const rnd = mulberry32(seed)

  // wipe small set for repeatable tests in dev only
  await db.transaction("rw", db.accounts, db.categories, db.transactions, async () => {
    await db.transactions.clear()
    await db.accounts.clear()
    await db.categories.clear()

    // create accounts
    const accIds: number[] = []
    accIds.push(await db.accounts.add({ name: "HDFC Bank", type: "BANK", balance: 50234.57, thresholdValue: 5000, color: "#0b63d3", icon: "bank" }))
    accIds.push(await db.accounts.add({ name: "Paytm Wallet", type: "WALLET", balance: 1234.75, thresholdValue: 200, color: "#10B981", icon: "wallet" }))
    accIds.push(await db.accounts.add({ name: "Cash", type: "CASH", balance: 350.5, thresholdValue: 100, color: "#f59e0b", icon: "wallet" }))
    accIds.push(await db.accounts.add({ name: "Investment", type: "INVESTMENT", balance: 150000.0, thresholdValue: 0, color: "#8b5cf6", icon: "trending-up" }))

    // create main categories and sub-categories
    const catMap: Record<string, number> = {}
    const mainExpenses = ["Food", "Transport", "Shopping", "Bills", "Health"]
    const mainIncome = ["Salary", "Interest", "Freelance"]

    for (const name of mainExpenses) {
      const id = await db.categories.add({ name, type: "EXPENSE", icon: name.toLowerCase() })
      catMap[name] = id
      // add 2-3 subcategories
      for (const sub of ["Local", "Online", "Premium"]) {
        await db.categories.add({ name: `${name} - ${sub}`, parentId: id, type: "EXPENSE", icon: sub.toLowerCase() })
      }
    }

    for (const name of mainIncome) {
      const id = await db.categories.add({ name, type: "INCOME", icon: name.toLowerCase() })
      catMap[name] = id
      await db.categories.add({ name: `${name} - Bonus`, parentId: id, type: "INCOME", icon: "star" })
    }

    // generate transactions across 18 months
    const today = new Date()
    const monthsBack = 18
    const transactionsToCreate: any[] = []

    for (let m = monthsBack; m >= 0; m--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1)
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

      // create income: salary near start of month with small decimals
      const salaryCat = catMap["Salary"]
      const salaryAmt = randBetween(rnd, 30000, 120000)
      transactionsToCreate.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 3),
        amount: Math.round(salaryAmt * 100) / 100,
        fromAccountId: accIds[3], // investment/income placeholder
        toCategoryId: salaryCat,
        isTransfer: false,
        description: "Salary",
        smsRaw: null,
      })

      // recurring bills and expenses (varied, with decimals)
      const expenseCount = 8 + Math.floor(rnd() * 6)
      for (let i = 0; i < expenseCount; i++) {
        const day = 4 + Math.floor(rnd() * Math.max(1, daysInMonth - 6))
        const main = mainExpenses[Math.floor(rnd() * mainExpenses.length)]
        // pick one of its subcategories by matching name
        const subName = `${main} - ${["Local", "Online", "Premium"][Math.floor(rnd() * 3)]}`
        const category = await db.categories.where('name').equals(subName).first()
        const amount = randBetween(rnd, 15.5, 450.99)
        const fromAccount = accIds[Math.floor(rnd() * accIds.length)]

        transactionsToCreate.push({
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          amount: Math.round(amount * 100) / 100,
          fromAccountId: fromAccount,
          toCategoryId: category?.id || catMap[main],
          isTransfer: false,
          description: `${main} expense`,
          smsRaw: null,
        })
      }

      // random transfers between accounts
      if (rnd() > 0.6) {
        const from = accIds[Math.floor(rnd() * accIds.length)]
        let to = accIds[Math.floor(rnd() * accIds.length)]
        if (to === from) to = accIds[(accIds.indexOf(from) + 1) % accIds.length]
        const tAmt = randBetween(rnd, 50.0, 5000.0)
        transactionsToCreate.push({
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10 + Math.floor(rnd() * 10)),
          amount: Math.round(tAmt * 100) / 100,
          fromAccountId: from,
          toAccountId: to,
          isTransfer: true,
          description: "Transfer",
          smsRaw: null,
        })
      }
    }

    // add a few anomalies/spikes
    transactionsToCreate.push({
      date: new Date(today.getFullYear(), today.getMonth() - 2, 15),
      amount: 9999.99,
      fromAccountId: accIds[0],
      toCategoryId: catMap["Shopping"],
      isTransfer: false,
      description: "Large one-off purchase",
      smsRaw: null,
    })

    // persist transactions and also update balances accordingly
    for (const tx of transactionsToCreate) {
      const txId = await db.transactions.add({
        date: tx.date,
        amount: tx.amount,
        fromAccountId: tx.fromAccountId,
        toCategoryId: tx.toCategoryId,
        toAccountId: tx.toAccountId,
        description: tx.description,
        isTransfer: !!tx.isTransfer,
        smsRaw: tx.smsRaw,
      })

      // update account balances minimally (simple approach): debit fromAccount, credit toAccount if transfer
      if (tx.fromAccountId) {
        const acc = await db.accounts.get(tx.fromAccountId)
        if (acc) {
          await db.accounts.update(tx.fromAccountId, { balance: Math.round((acc.balance - tx.amount) * 100) / 100 })
        }
      }
      if (tx.toAccountId) {
        const accTo = await db.accounts.get(tx.toAccountId)
        if (accTo) {
          await db.accounts.update(tx.toAccountId, { balance: Math.round((accTo.balance + tx.amount) * 100) / 100 })
        }
      }
    }
  })

  return true
}

export default seedComplexTestData
