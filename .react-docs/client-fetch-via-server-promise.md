---
title: Client Component Data Fetching via Server Promises, Not Actions
impact: HIGH
impactDescription: prevents misuse of Server Actions for reads
tags: client, data-fetching, use, server-actions, server-components
---

## Client Component Data Fetching via Server Promises, Not Actions

Server Actions (`'use server'`) are designed for **mutations** that update server-side state. They are **not recommended for data fetching**. Frameworks process one action at a time and do not cache the return value.

### Correct: Pass Promises from Server Components

Create promises in Server Components and pass them to Client Components via the `use()` hook:

```tsx
// Server Component
import { fetchMessages } from './lib'
import { MessageList } from './message-list'
import { Suspense } from 'react'

export default function Page() {
  const messagesPromise = fetchMessages()
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <MessageList messagesPromise={messagesPromise} />
    </Suspense>
  )
}
```

```tsx
// Client Component
'use client'

import { use } from 'react'

export function MessageList({ messagesPromise }) {
  const messages = use(messagesPromise)
  return <ul>{messages.map(m => <li key={m.id}>{m.text}</li>)}</ul>
}
```

**Why this works:**
- Promises passed from Server Components are stable across re-renders (not recreated each render)
- Non-blocking: Server Component rendering continues while the promise resolves
- Integrates with Suspense boundaries for loading states and Error Boundaries for errors

### Correct: Await in Server Component (blocking)

```tsx
export default async function Page() {
  const messages = await fetchMessages()
  return <MessageList messages={messages} />
}
```

Tradeoff: `await` blocks the Server Component from rendering until the promise resolves.

### Wrong: Calling a Server Action to fetch data

```tsx
// actions.ts
'use server'
export async function getMessages() {
  return db.messages.findMany() // Don't do this
}

// Client Component
'use client'
import { getMessages } from './actions'
import { useEffect, useState } from 'react'

export function MessageList() {
  const [messages, setMessages] = useState([])
  useEffect(() => {
    getMessages().then(setMessages) // Anti-pattern
  }, [])
  return <ul>{messages.map(m => <li key={m.id}>{m.text}</li>)}</ul>
}
```

**Why this is wrong:**
- Server Functions are serialized one at a time — parallel reads become sequential
- No caching of return values
- Bypasses Suspense/streaming architecture
- Creates unnecessary client-server round trips when data could be fetched during SSR

### When you need client-triggered fetches

For data that must be fetched in response to user interaction (search, pagination), use:

1. **Route Handlers** (`app/api/...`) with `fetch()` or SWR/React Query
2. **`useActionState`** only when the fetch is tied to a form action and you need pending/error state
3. **Server Components with `searchParams`** — update the URL and let the server re-render

### Reference

- [react.dev/reference/react/use](https://react.dev/reference/react/use)
- [react.dev/reference/rsc/use-server](https://react.dev/reference/rsc/use-server)
