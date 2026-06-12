import 'dotenv/config'

const apiKey = process.env.MAILERLITE_API_KEY

if (!apiKey) {
  throw new Error('Missing MAILERLITE_API_KEY')
}

const BASE_URL = 'https://connect.mailerlite.com/api'

type Field = {
  name: string
  type: 'text' | 'number' | 'date'
}

const fields: Field[] = [
  { name: 'name', type: 'text' },
  { name: 'last_name', type: 'text' },
  { name: 'instagram', type: 'text' },
  { name: 'slot_time', type: 'text' },
  { name: 'group_size', type: 'number' },
  { name: 'friend_names', type: 'text' },
  { name: 'song_submitted', type: 'text' },
  { name: 'booking_date', type: 'date' },
  { name: 'booking_id', type: 'text' },
  { name: 'source', type: 'text' },
]

async function createField(field: Field) {
  try {
    const res = await fetch(`${BASE_URL}/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(field),
    })

    const data = await res.json()

    if (!res.ok) {
      // If field already exists, MailerLite returns 422
      console.log(`⚠️ Field skipped: ${field.name}`, data)
      return null
    }

    console.log(`✅ Created field: ${field.name}`)
    return data
  } catch (err) {
    console.error(`❌ Error creating field ${field.name}:`, err)
    return null
  }
}

export async function createMailerLiteFields() {
  console.log('🚀 Creating MailerLite fields...')

  for (const field of fields) {
    await createField(field)
  }

  console.log('🎉 Done creating fields')
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  createMailerLiteFields()
}