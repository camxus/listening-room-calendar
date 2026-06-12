import { describe, it, expect, vi, beforeEach } from 'vitest'

const docs = new Map<string, Record<string, unknown>>()
const collections = new Map<string, Map<string, Record<string, unknown>>>()

type DocData = Record<string, unknown>
const makeSnapshot = (store: Map<string, DocData>, ids: string[], filterStatus?: string, filterSlot?: string, limitVal = Infinity): { docs: { id: string; data: () => DocData }[]; empty: boolean } => {
  let items = ids.map(id => ({ id, data: () => store.get(id) || {} }))
  if (filterStatus !== undefined) items = items.filter(d => d.data().status === filterStatus)
  if (filterSlot !== undefined) items = items.filter(d => d.data().slotId === filterSlot || d.data().bookingId === filterSlot)
  const docs = items.slice(0, limitVal)
  return { docs, empty: docs.length === 0 }
}

const mockCollection = vi.fn((name: string) => {
  if (!collections.has(name)) collections.set(name, new Map())
  const store = collections.get(name)!
  return {
    id: name,
    doc: vi.fn((id?: string) => {
      const key = id || `auto-${Math.random().toString(36).slice(2, 9)}`
      return {
        id: key,
        path: `${name}/${key}`,
        set: vi.fn(async (data: DocData) => { store.set(key, data) }),
        update: vi.fn(async (patch: DocData) => { store.set(key, { ...(store.get(key) || {}), ...patch }) }),
        get: vi.fn(async () => {
          const d = store.get(key)
          if (!d) return { id: key, data: () => ({}), exists: false, ref: { id: key, path: `${name}/${key}` } }
          return { id: key, data: () => d, exists: true, ref: { id: key, path: `${name}/${key}` } }
        }),
        collection: (child: string) => mockCollection(key ? `${name}/${key}/${child}` : name),
      }
    }),
  }
})

const mockDoc = vi.fn((...args: unknown[]) => mockCollection(args[0] as string).doc(args[1] as string))
const mockQuery = vi.fn(() => ({}))
const mockWhere = vi.fn(() => ({}))
const mockOrderBy = vi.fn(() => ({}))
const mockLimit = vi.fn(() => ({}))

const mocks: Record<string, vi.Mock> = {}
mocks.collection = mockCollection
mocks.doc = mockDoc
mocks.query = mockQuery
mocks.where = mockWhere
mocks.orderBy = mockOrderBy
mocks.limit = mockLimit

function resetMocks() {
  vi.clearAllMocks()
  docs.clear()
  collections.clear()
}

vi.mock('firebase/firestore', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
  getFirestore: vi.fn(() => ({})),
  doc: (...a: unknown[]) => mockDoc(...a),
  collection: (...a: unknown[]) => mockCollection(...a),
  query: (...a: unknown[]) => mockQuery(...a),
  where: (...a: unknown[]) => mockWhere(...a),
  orderBy: (...a: unknown[]) => mockOrderBy(...a),
  limit: (...a: unknown[]) => mockLimit(...a),
  getDocs: vi.fn(async () => {
    const last = (mockQuery.mock as unknown as { calls: unknown[][] }).calls.at(-1)?.[0] as { constraints?: unknown[] } | undefined
    const c = last?.constraints || []
    let statusFilter: string | undefined
    let slotFilter: string | undefined
    let limitVal = Infinity
    for (const x of c) {
      const o = x as { type?: string; value?: unknown; args?: unknown[] }
      if (o.type === 'where') {
        const a = (o.args as string[] | undefined) || (Array.isArray(o.value) ? (o.value as string[]) : [])
        if (a[0] === 'status') statusFilter = a[2] as string
        if (a[0] === 'slotId' || a[0] === 'bookingId') slotFilter = a[2] as string
      }
      if (o.type === 'limit') limitVal = (o.args as number[])[0]
    }
    const colName = (mockQuery.mock as unknown as { calls: unknown[][] }).calls.at(-1)?.[0] ? 'bookings' : 'bookings'
    const store = collections.get('bookings') || new Map()
    const ids = Array.from(store.keys())
    const r = makeSnapshot(store, ids, statusFilter, slotFilter, limitVal)
    return { docs: r.docs, empty: r.empty, forEach: (fn: (d: { id: string; data: () => DocData }) => void) => r.docs.forEach(fn) } as { docs: { id: string; data: () => DocData }[]; empty: boolean; forEach: (fn: (d: { id: string; data: () => DocData }) => void) => void }
  }),
  getDoc: vi.fn(async (ref: { id: string; path: string }) => {
    const part = ref.path.split('/')
    const col = part[0]
    const id = part[1]
    const store = collections.get(col) || collections.get('bookings') || new Map()
    const d = store.get(id)
    if (!d) return { id, data: () => ({}), exists: false, ref }
    return { id, data: () => d, exists: true, ref }
  }),
  runTransaction: vi.fn(async (_d: unknown, fn: (tx: { update: vi.Mock; get: vi.Mock; set: vi.Mock }) => Promise<void>) => {
    const tx = {
      update: vi.fn(),
      get: vi.fn(async (r: { id: string; path: string }) => {
        const part = r.path.split('/')
        const d = (collections.get(part[0]) || new Map()).get(part[1])
        if (!d) return { id: part[1], data: () => ({}), exists: false, ref: r }
        return { id: part[1], data: () => d, exists: true, ref: r }
      }),
      set: vi.fn(),
    }
    vi.mocked(tx.update).mockImplementation(async (rr: { path: string }, patch: DocData) => {
      const part = rr.path.split('/')
      const store = collections.get(part[0]) || new Map()
      store.set(part[1], { ...(store.get(part[1]) || {}), ...patch })
    })
    ;(tx.get as any).mockImplementation(async (rr: { id: string; path: string }) => {
      const part = rr.path.split('/')
      const store = collections.get(part[0]) || new Map()
      const d = store.get(part[1])
      if (!d) return { id: part[1], data: () => ({}), exists: false, ref: rr }
      return { id: part[1], data: () => d, exists: true, ref: rr }
    })
    await fn(tx)
  }),
  updateDoc: vi.fn(async (ref: { id: string }, patch: DocData) => {
    const store = docs
    store.set(ref.id, { ...(store.get(ref.id) || {}), ...patch })
  }),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
  increment: vi.fn((n: number) => ({ __increment: n })),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) })),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
})

function reset() {
  vi.clearAllMocks()
  docs.clear()
  collections.clear()
}

import { GET as bookingsGet, POST as bookingsPost, PATCH as bookingsPatch } from '@/app/api/bookings/route'
import { GET as bookingsIdGet, DELETE as bookingsIdDelete } from '@/app/api/bookings/[id]/route'
import { GET as slotsGet, POST as slotsPost, PATCH as slotsPatch, DELETE as slotsDelete } from '@/app/api/slots/route'
import { POST as waitlistPost, GET as waitlistGet } from '@/app/api/waitlist/route'

function req(body = {}, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as unknown as Request
}

describe('DELETE /api/bookings/[id]', () => {
  beforeEach(reset)

  it('returns 400 when already cancelled', async () => {
    const { slots } = await Promise.resolve(
      collections.set('bookings', new Map([['bk1', {
        bookingId: 'BK1', slotId: 's1', status: 'cancelled', groupSize: 1, isWaitlist: false,
        createdAt: { toMillis: () => Date.now() },
      }]]))
    )
    const res = await bookingsIdDelete(req() as unknown as Request, { params: Promise.resolve({ id: 'BK1' }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Booking is already cancelled')
  })

  it('returns 404 when not found', async () => {
    const res = await bookingsIdDelete(req() as unknown as Request, { params: Promise.resolve({ id: 'NOPE' }) })
    expect(res.status).toBe(404)
  })

  it('cancels a waitlisted booking without touching slot counts', async () => {
    collections.set('bookings', new Map([['bk2', {
      bookingId: 'BK2', slotId: 's1', status: 'waitlist', groupSize: 2, isWaitlist: true,
      createdAt: { toMillis: () => Date.now() },
    }]]))
    collections.set('slots', new Map([['s1', { id: 's1', capacity: 8, bookedCount: 5 }]]))

    const res = await bookingsIdDelete(req() as unknown as Request, { params: Promise.resolve({ id: 'BK2' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('cancels a confirmed booking and decrements slot bookedCount', async () => {
    const slotId = 's1'
    const slotStore = new Map<string, Record<string, unknown>>([[slotId, { id: slotId, capacity: 10, bookedCount: 5 }]])
    collections.set('bookings', new Map([['bk3', {
      bookingId: 'BK3', slotId, status: 'confirmed', groupSize: 2, isWaitlist: false,
      createdAt: { toMillis: () => Date.now() }, email: 'x@y.com',
    }]]))
    collections.set('slots', slotStore)

    const res = await bookingsIdDelete(req() as unknown as Request, { params: Promise.resolve({ id: 'BK3' }) })
    expect(res.status).toBe(200)
    expect(slotStore.get(slotId)?.bookedCount).toBe(3)
  })

  it('includes error details in 500 response', async () => {
    const err = new Error('permission-denied') as Error & { code?: string }
    err.code = 'permission-denied'
    const { runTransaction } = await import('firebase/firestore')
    vi.mocked(runTransaction).mockImplementationOnce(async () => { throw err })

    collections.set('bookings', new Map([['bk4', {
      bookingId: 'BK4', slotId: 's1', status: 'confirmed', groupSize: 1, isWaitlist: false,
      createdAt: { toMillis: () => Date.now() }, email: 'x@y.com',
    }]]))

    const res = await bookingsIdDelete(req() as unknown as Request, { params: Promise.resolve({ id: 'BK4' }) })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to cancel booking')
    expect(body.message).toBe('permission-denied')
    expect(body.code).toBe('permission-denied')
  })
})

describe('GET /api/bookings/[id]', () => {
  beforeEach(reset)

  it('returns 404 when missing', async () => {
    const res = await bookingsIdGet(new Request('http://localhost/x') as unknown as Request, {
      params: Promise.resolve({ id: 'NOPE' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns booking by bookingId', async () => {
    collections.set('bookings', new Map([['bk1', { bookingId: 'BK1', slotId: 's1', status: 'confirmed' }]]))
    const res = await bookingsIdGet(new Request('http://localhost/x') as unknown as Request, {
      params: Promise.resolve({ id: 'BK1' }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).bookingId).toBe('BK1')
  })
})

describe('POST /api/bookings', () => {
  beforeEach(reset)

  it('returns 400 when fields missing', async () => {
    const res = await bookingsPost(req({}) as unknown as Request)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Missing required fields')
  })

  it('returns 400 when empty friend name', async () => {
    const res = await bookingsPost(req({
      slotId: 's1', fullName: 'A', email: 'a@b.com', groupSize: 2, friendNames: [''],
    }) as unknown as Request)
    expect(res.status).toBe(400)
  })

  it('returns bookingId in demo mode', async () => {
    const orig = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as unknown as string | undefined
    Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: '' })
    const res = await bookingsPost(req({
      slotId: 's1', slotDisplayTime: '8pm', fullName: 'A', email: 'a@b.com', groupSize: 1,
    }) as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bookingId).toMatch(/^LR-/)
    Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: orig })
  })

  it('creates confirmed booking and increments slot count', async () => {
    const slotId = 'slot1'
    collections.set('slots', new Map([[slotId, { id: slotId, capacity: 8, bookedCount: 2 }]]))

    const res = await bookingsPost(req({
      slotId, slotDisplayTime: '8pm', fullName: 'User', email: 'u@e.com', groupSize: 2,
    }) as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.isWaitlist).toBe(false)
    expect(collections.get('slots')!.get(slotId)?.bookedCount).toBe(4)
  })

  it('creates waitlist booking when over capacity', async () => {
    const slotId = 'slot2'
    collections.set('slots', new Map([[slotId, { id: slotId, capacity: 8, bookedCount: 8 }]]))

    const res = await bookingsPost(req({
      slotId, slotDisplayTime: '9pm', fullName: 'W', email: 'w@e.com', groupSize: 1,
    }) as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.isWaitlist).toBe(true)
  })
})

describe('GET /api/bookings', () => {
  beforeEach(reset)

  it('returns [] in demo mode', async () => {
    const orig = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as unknown as string | undefined
    Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: '' })
    const res = await bookingsGet()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: orig })
  })

  it('returns all bookings', async () => {
    collections.set('bookings', new Map([
      ['b1', { bookingId: 'b1', status: 'confirmed', createdAt: new Date().toISOString() }],
      ['b2', { bookingId: 'b2', status: 'waitlist', createdAt: new Date().toISOString() }],
    ]))
    const res = await bookingsGet()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
  })
})

describe('PATCH /api/bookings', () => {
  beforeEach(reset)

  it('returns 401 without session', async () => {
    const res = await bookingsPatch(req({ id: 'x' }) as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 400 without id', async () => {
    const res = await bookingsPatch(req({}) as unknown as Request, {
      headers: { cookie: 'admin_session=dummy' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when missing', async () => {
    const res = await bookingsPatch(req({ id: 'x' }) as unknown as Request, {
      headers: { cookie: 'admin_session=dummy' },
    })
    expect(res.status).toBe(404)
  })

  it('updates booking with auth', async () => {
    collections.set('bookings', new Map([['bk1', {
      bookingId: 'BK1', slotId: 's1', status: 'confirmed', email: 'a@b.com',
      groupSize: 2, isWaitlist: false, createdAt: { toMillis: () => Date.now() },
    }]]))
    vi.mock('@/lib/admin', () => ({ isAdminAuthenticated: () => true }))
    const res = await bookingsPatch(req({ id: 'BK1', status: 'cancelled' }) as unknown as Request, {
      headers: { cookie: 'admin_session=dummy' },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

describe('GET /api/slots', () => {
  beforeEach(reset)

  it('returns mock slots in demo mode', async () => {
    const orig = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as unknown as string | undefined
    Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: '' })
    const res = await slotsGet()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toHaveProperty('capacity')
    Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: orig })
  })

  it('returns slots from store', async () => {
    collections.set('slots', new Map([['s1', { id: 's1', time: '20:00', displayTime: '8pm', capacity: 8, bookedCount: 0 }]]))
    const res = await slotsGet()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.some((s: { id: string }) => s.id === 's1')).toBe(true)
  })
})

describe('POST /api/slots', () => {
  beforeEach(reset)

  it('returns 401 without auth', async () => {
    const res = await slotsPost(req({ time: '20:00', displayTime: '8pm' }) as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 400 when fields missing', async () => {
    vi.mock('@/lib/admin', () => ({ isAdminAuthenticated: () => true }))
    const res = await slotsPost(req({}) as unknown as Request)
    expect(res.status).toBe(400)
  })

  it('creates slot with defaults', async () => {
    vi.mock('@/lib/admin', () => ({ isAdminAuthenticated: () => true }))
    const res = await slotsPost(req({ time: '21:00', displayTime: '9pm' }) as unknown as Request)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.capacity).toBe(8)
    expect(body.bookedCount).toBe(0)
  })
})

describe('PATCH /api/slots', () => {
  beforeEach(reset)

  it('returns 401 without auth', async () => {
    const res = await slotsPatch(req({ id: 's1' }) as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 400 without id', async () => {
    vi.mock('@/lib/admin', () => ({ isAdminAuthenticated: () => true }))
    const res = await slotsPatch(req({}) as unknown as Request)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/slots', () => {
  beforeEach(reset)

  it('returns 401 without auth', async () => {
    const res = await slotsDelete(new Request('http://localhost?s=x'))
    expect(res.status).toBe(401)
  })

  it('returns 400 without id param', async () => {
    vi.mock('@/lib/admin', () => ({ isAdminAuthenticated: () => true }))
    const res = await slotsDelete(new Request('http://localhost'))
    expect(res.status).toBe(400)
  })

  it('deletes a slot', async () => {
    vi.mock('@/lib/admin', () => ({ isAdminAuthenticated: () => true }))
    collections.set('slots', new Map([['del1', { id: 'del1' }]]))
    const res = await slotsDelete(new Request('http://localhost?id=del1'))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

describe('POST /api/waitlist', () => {
  beforeEach(reset)

  it('returns 400 when fields missing', async () => {
    const res = await waitlistPost(req({}) as unknown as Request)
    expect(res.status).toBe(400)
  })

  it('creates a waitlist booking', async () => {
    const res = await waitlistPost(req({ slotId: 's1', fullName: 'N', email: 'n@e.com', groupSize: 1 }) as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.waitlistId).toBeDefined()
  })
})

describe('GET /api/waitlist', () => {
  beforeEach(reset)

  it('filters by slotId', async () => {
    collections.set('bookings', new Map([
      ['w1', { bookingId: 'w1', slotId: 's1', status: 'waitlist', createdAt: { toMillis: () => Date.now() - 1000 } }],
      ['w2', { bookingId: 'w2', slotId: 's2', status: 'waitlist', createdAt: { toMillis: () => Date.now() } }],
    ]))
    const res = await waitlistGet(new Request('http://localhost?slotId=s1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].bookingId).toBe('w1')
  })

  it('returns all waitlist entries without slotId', async () => {
    collections.set('bookings', new Map([
      ['w1', { bookingId: 'w1', slotId: 's1', status: 'waitlist', createdAt: { toMillis: () => Date.now() } }],
      ['w2', { bookingId: 'w2', slotId: 's2', status: 'waitlist', createdAt: { toMillis: () => Date.now() } }],
    ]))
    const res = await waitlistGet(new Request('http://localhost'))
    expect(res.status).toBe(200)
    expect((await res.json())).toHaveLength(2)
  })
})
