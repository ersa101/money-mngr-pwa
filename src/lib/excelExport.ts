'use client'

import { db, Transaction } from './db'
import * as XLSX from 'xlsx'

export async function exportTransactionsToExcel() {
  try {
    // Fetch all transactions from database
    const transactions = await db.transactions.toArray()
    
    if (transactions.length === 0) {
      alert('No transactions to export')
      return
    }

    // Map transactions to Excel format with all fields
    const excelData = transactions.map((tx) => ({
      'Date': tx.date instanceof Date ? tx.date.toLocaleString('en-IN') : tx.date,
      'Account': tx.csvAccount || '',
      'Category': tx.csvCategory || tx.category || '',
      'Subcategory': tx.csvSubcategory || tx.subCategory || '',
      'Note': tx.note || tx.csvDescription || '',
      'Amount': tx.amount,
      'Income/Expense': tx.csvIncomeExpense || tx.transactionType || '',
      'Description': tx.description || '',
      'Currency': tx.csvCurrency || 'INR',
      'Type': tx.transactionType || '',
      'Is Transfer': tx.isTransfer ? 'Yes' : 'No',
      'From Account ID': tx.fromAccountId,
      'To Category ID': tx.toCategoryId || '',
      'To Account ID': tx.toAccountId || '',
      'Imported At': tx.importedAt ? new Date(tx.importedAt).toLocaleString('en-IN') : '',
    }))

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Date
      { wch: 15 }, // Account
      { wch: 15 }, // Category
      { wch: 15 }, // Subcategory
      { wch: 25 }, // Note
      { wch: 12 }, // Amount
      { wch: 15 }, // Income/Expense
      { wch: 25 }, // Description
      { wch: 10 }, // Currency
      { wch: 12 }, // Type
      { wch: 12 }, // Is Transfer
      { wch: 15 }, // From Account ID
      { wch: 15 }, // To Category ID
      { wch: 15 }, // To Account ID
      { wch: 20 }, // Imported At
    ]
    ws['!cols'] = colWidths

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `transactions-${timestamp}.xlsx`

    // Write file
    XLSX.writeFile(wb, filename)
    
    return { success: true, count: transactions.length, filename }
  } catch (error) {
    console.error('Export error:', error)
    alert(`Export failed: ${error}`)
    return { success: false, error: String(error) }
  }
}

export async function exportTransactionsToCSV() {
  try {
    // Fetch all transactions from database
    const transactions = await db.transactions.toArray()
    
    if (transactions.length === 0) {
      alert('No transactions to export')
      return
    }

    // Map transactions to CSV format
    const csvData = transactions.map((tx) => [
      tx.date instanceof Date ? tx.date.toLocaleString('en-IN') : tx.date,
      tx.csvAccount || '',
      tx.csvCategory || tx.category || '',
      tx.csvSubcategory || tx.subCategory || '',
      tx.note || tx.csvDescription || '',
      tx.amount,
      tx.csvIncomeExpense || tx.transactionType || '',
      tx.description || '',
      tx.csvCurrency || 'INR',
    ])

    // Create header row
    const header = ['Date', 'Account', 'Category', 'Subcategory', 'Note', 'Amount', 'Income/Expense', 'Description', 'Currency']
    const allRows = [header, ...csvData]

    // Convert to CSV string
    const csv = allRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `transactions-${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, count: transactions.length }
  } catch (error) {
    console.error('CSV export error:', error)
    alert(`CSV export failed: ${error}`)
    return { success: false, error: String(error) }
  }
}
