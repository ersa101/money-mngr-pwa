// Quick test script to check Google Sheets connectivity
const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

// Load service account JSON directly
const serviceAccountPath = path.join(__dirname, 'moneymngr-googleprojectapi.json')
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))

// Load spreadsheet ID from env
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
let spreadsheetId = ''
envContent.split('\n').forEach(line => {
  const match = line.match(/^GOOGLE_SPREADSHEET_ID=(.*)$/)
  if (match) {
    spreadsheetId = match[1].replace(/^["']|["']$/g, '')
  }
})

async function test() {
  const email = serviceAccount.client_email
  const key = serviceAccount.private_key

  console.log('=== Configuration Check ===')
  console.log('Service Account Email:', email)
  console.log('Spreadsheet ID:', spreadsheetId)
  console.log('Private Key Length:', key.length)
  console.log('Private Key Valid:', key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY'))

  if (!email || !key || !spreadsheetId) {
    console.error('Missing required environment variables!')
    return
  }

  console.log('\n=== Testing API Connection ===')

  try {
    const auth = new google.auth.JWT({
      email: email,
      key: key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    // Test auth first
    console.log('Authorizing...')
    await auth.authorize()
    console.log('Auth successful!')

    const sheets = google.sheets({ version: 'v4', auth })

    // Try to get spreadsheet metadata
    console.log('Fetching spreadsheet...')
    const response = await sheets.spreadsheets.get({ spreadsheetId })
    console.log('SUCCESS! Spreadsheet Title:', response.data.properties.title)
    console.log('Existing Sheets:', response.data.sheets.map(s => s.properties.title).join(', '))
  } catch (error) {
    console.error('ERROR:', error.message)
    if (error.message.includes('unregistered callers')) {
      console.log('\n>>> FIX: Enable the Google Sheets API in your Google Cloud Console:')
      console.log('    1. Go to https://console.cloud.google.com/')
      console.log('    2. Select your project')
      console.log('    3. Go to APIs & Services > Library')
      console.log('    4. Search for "Google Sheets API"')
      console.log('    5. Click Enable')
    }
    if (error.message.includes('permission') || error.message.includes('403')) {
      console.log('\n>>> FIX: Share the spreadsheet with the service account as Editor')
    }
  }
}

test()
