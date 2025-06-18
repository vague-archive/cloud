import { assert, Test } from "@test"
import { chunk, compare, shuffle, startsWith } from "@lib/array"

//-----------------------------------------------------------------------------

Test("startsWith", () => {
  const a1: string[] = []
  const a2: string[] = ["login"]
  const a3: string[] = ["organization", "members"]
  const a4: string[] = ["organization", "billing", "invoices"]

  assert.equals(startsWith(a1, "unknown"), false)
  assert.equals(startsWith(a2, "unknown"), false)
  assert.equals(startsWith(a3, "unknown"), false)
  assert.equals(startsWith(a4, "unknown"), false)

  assert.equals(startsWith(a1, "login"), false)
  assert.equals(startsWith(a2, "login"), true)
  assert.equals(startsWith(a3, "login"), false)
  assert.equals(startsWith(a4, "login"), false)

  assert.equals(startsWith(a1, "organization"), false)
  assert.equals(startsWith(a2, "organization"), false)
  assert.equals(startsWith(a3, "organization"), true)
  assert.equals(startsWith(a4, "organization"), true)

  assert.equals(startsWith(a1, ["organization"]), false)
  assert.equals(startsWith(a2, ["organization"]), false)
  assert.equals(startsWith(a3, ["organization"]), true)
  assert.equals(startsWith(a4, ["organization"]), true)

  assert.equals(startsWith(a1, ["organization", "members"]), false)
  assert.equals(startsWith(a2, ["organization", "members"]), false)
  assert.equals(startsWith(a3, ["organization", "members"]), true)
  assert.equals(startsWith(a4, ["organization", "members"]), false)

  assert.equals(startsWith(a1, ["organization", "billing"]), false)
  assert.equals(startsWith(a2, ["organization", "billing"]), false)
  assert.equals(startsWith(a3, ["organization", "billing"]), false)
  assert.equals(startsWith(a4, ["organization", "billing"]), true)

  assert.equals(startsWith(a1, ["organization", "unknown"]), false)
  assert.equals(startsWith(a2, ["organization", "unknown"]), false)
  assert.equals(startsWith(a3, ["organization", "unknown"]), false)
  assert.equals(startsWith(a4, ["organization", "unknown"]), false)
})

//-----------------------------------------------------------------------------

Test("chunk", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
  assert.equals(chunk(input, { size: 1 }), [[1], [2], [3], [4], [5], [6], [7], [8], [9], [0]])
  assert.equals(chunk(input, { size: 2 }), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 0]])
  assert.equals(chunk(input, { size: 3 }), [[1, 2, 3], [4, 5, 6], [7, 8, 9], [0]])
  assert.equals(chunk(input, { size: 4 }), [[1, 2, 3, 4], [5, 6, 7, 8], [9, 0]])
  assert.equals(chunk(input, { size: 5 }), [[1, 2, 3, 4, 5], [6, 7, 8, 9, 0]])
  assert.equals(chunk(input, { size: 6 }), [[1, 2, 3, 4, 5, 6], [7, 8, 9, 0]])
  assert.equals(chunk(input, { size: 7 }), [[1, 2, 3, 4, 5, 6, 7], [8, 9, 0]])
  assert.equals(chunk(input, { size: 8 }), [[1, 2, 3, 4, 5, 6, 7, 8], [9, 0]])
  assert.equals(chunk(input, { size: 9 }), [[1, 2, 3, 4, 5, 6, 7, 8, 9], [0]])
  assert.equals(chunk(input, { size: 10 }), [[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]])
  assert.equals(chunk(input, { size: 11 }), [[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]])
  assert.equals(chunk(input, { size: 12 }), [[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]])

  assert.equals(chunk(input, { count: 1 }), [[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]])
  assert.equals(chunk(input, { count: 2 }), [[1, 2, 3, 4, 5], [6, 7, 8, 9, 0]])
  assert.equals(chunk(input, { count: 3 }), [[1, 2, 3, 4], [5, 6, 7, 8], [9, 0]])
  assert.equals(chunk(input, { count: 4 }), [[1, 2, 3], [4, 5, 6], [7, 8, 9], [0]])
  assert.equals(chunk(input, { count: 5 }), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 0]]) // CORRECT
  assert.equals(chunk(input, { count: 6 }), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 0]]) // subjective - what to do when chunk.count > input.length/2
  assert.equals(chunk(input, { count: 7 }), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 0]]) // (ditto)
  assert.equals(chunk(input, { count: 8 }), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 0]]) // (ditto)
  assert.equals(chunk(input, { count: 9 }), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 0]]) // (ditto)
  assert.equals(chunk(input, { count: 10 }), [[1], [2], [3], [4], [5], [6], [7], [8], [9], [0]])
  assert.equals(chunk(input, { count: 11 }), [[1], [2], [3], [4], [5], [6], [7], [8], [9], [0]])
  assert.equals(chunk(input, { count: 12 }), [[1], [2], [3], [4], [5], [6], [7], [8], [9], [0]])

  assert.equals(chunk(input, { size: 3.14 }), [[1, 2, 3], [4, 5, 6], [7, 8, 9], [0]])
  assert.equals(chunk(input, { count: 3.14 }), [[1, 2, 3, 4], [5, 6, 7, 8], [9, 0]])
})
//-----------------------------------------------------------------------------

Test("shuffle", () => {
  const input = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
  shuffle(input)

  assert.equals(input.length, 10)
  assert.equals(input.includes(1), false)
  assert.equals(input.includes(2), true)
  assert.equals(input.includes(3), false)
  assert.equals(input.includes(4), true)
  assert.equals(input.includes(5), false)
  assert.equals(input.includes(6), true)
  assert.equals(input.includes(7), false)
  assert.equals(input.includes(8), true)
  assert.equals(input.includes(9), false)
  assert.equals(input.includes(10), true)
  assert.equals(input.includes(11), false)
  assert.equals(input.includes(12), true)
  assert.equals(input.includes(13), false)
  assert.equals(input.includes(14), true)
  assert.equals(input.includes(15), false)
  assert.equals(input.includes(16), true)
  assert.equals(input.includes(17), false)
  assert.equals(input.includes(18), true)
  assert.equals(input.includes(19), false)
  assert.equals(input.includes(20), true)

  assert.notEquals(input, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
  assert.equals(input.sort((a, b) => a - b), [2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
})

//-----------------------------------------------------------------------------

Test("compare", () => {
  assert.equals(compare([], []), {
    missingLocal: [],
    missingRemote: [],
  })

  assert.equals(compare(["a", "b", "c"], []), {
    missingLocal: [],
    missingRemote: ["a", "b", "c"],
  })

  assert.equals(compare([], ["a", "b", "c"]), {
    missingLocal: ["a", "b", "c"],
    missingRemote: [],
  })

  assert.equals(compare(["a", "b", "c"], ["b"]), {
    missingLocal: [],
    missingRemote: ["a", "c"],
  })

  assert.equals(compare(["b"], ["a", "b", "c"]), {
    missingLocal: ["a", "c"],
    missingRemote: [],
  })

  assert.equals(compare(["a", "b"], ["b", "c"]), {
    missingLocal: ["c"],
    missingRemote: ["a"],
  })

  assert.equals(compare(["a", "b", "c"], ["a", "b", "c"]), {
    missingLocal: [],
    missingRemote: [],
  })

  assert.equals(compare(["a", "b", "c"], ["c", "b", "a"]), {
    missingLocal: [],
    missingRemote: [],
  })
})

//-----------------------------------------------------------------------------

