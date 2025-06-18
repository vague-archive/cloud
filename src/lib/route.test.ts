import { assert, Test } from "@test"
import { Id } from "@domain"
import { rid, rtoken } from "@lib/route"

class ThingWithId {
  id: Id
  constructor(id: Id) {
    this.id = id
  }
}

class ThingWithSlug {
  id: Id
  slug: string
  constructor(id: Id, slug: string) {
    this.id = id
    this.slug = slug
  }
}

//-----------------------------------------------------------------------------

Test("rid", () => {

  assert.equals(rid("value"), "value")
  assert.equals(rid(123), "123")
  assert.equals(rid(42n), "42")
  assert.equals(rid({ id: 123 }), "123")
  assert.equals(rid({ id: 123, name: "name" }), "123")
  assert.equals(rid({ id: 123, label: "label" }), "123")
  assert.equals(rid({ id: 123, slug: "slug" }), "slug")
  assert.equals(rid({ id: 123, slug: "slug", name: "name" }), "slug")
  assert.equals(rid({ id: 123, slug: "slug", label: "label" }), "slug")

  assert.throws(() => rid(undefined))

  assert.equals(rid({
    id: 123,
    slug: "slug",
    name: "name",
    label: "label",
    other: "other",
  }), "slug")

  const thing1 = new ThingWithId(42)
  const thing2 = new ThingWithSlug(42, "slug")
  assert.equals(rid(thing1), "42")
  assert.equals(rid(thing2), "slug")
})

//-----------------------------------------------------------------------------

Test("rtoken", () => {
  assert.equals(rtoken("label"), "label")
  assert.equals(rtoken("foo/bar"), "foo%2Fbar")
  assert.throws(() => rtoken(undefined))
  assert.throws(() => rtoken(1))
  assert.throws(() => rtoken(1n))
  assert.throws(() => rtoken({ id: 123 }))
  assert.throws(() => rtoken({ id: 123, slug: "slug" }))
})

//-----------------------------------------------------------------------------
