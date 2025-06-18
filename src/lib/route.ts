import { is } from "@lib"
import { Id } from "@domain"
import { QueryParams } from "@lib/params"

/*
 Routing is a web concern, and mostly handled inside src/web/router.ts...
 ... HOWEVER there are occasions where the domain layer needs to be able
 to GENERATE a route (e.g. when sending an email that includes a link back
 to the application)

 To support that, the @domain and @web layers share a small subset of types and
 helper methods (below) that allow the web layer to inject a `RouteGenerator` object
 that can be used by the domain layer.

 The domain still knows almost nothing about routing, but it does know how to use
 the RouteGenerator for generating (named) routes.
*/

//-------------------------------------------------------------------------------------------------

interface HasId {
  id: Id
}

interface HasSlug {
  slug: string
}

function hasId(value: unknown): value is HasId {
  return is.object(value) && ("id" in value)
}

function hasSlug(value: unknown): value is HasSlug {
  return is.object(value) && ("slug" in value)
}

//-------------------------------------------------------------------------------------------------

type RouteGeneratorOptions = {
  query?: QueryParams
  full?: boolean
}

//-------------------------------------------------------------------------------------------------

type RouteArgument = Id | HasId | HasSlug | string | undefined | Record<string, unknown> | RouteGeneratorOptions
type RouteGenerator = (name: string, ...args: RouteArgument[]) => string

function isRouteGeneratorOptions(arg: RouteArgument): arg is RouteGeneratorOptions {
  return is.object(arg) && !hasId(arg) && (("query" in arg) || ("full" in arg))
}

//-------------------------------------------------------------------------------------------------

function rid(arg: RouteArgument) {
  switch (typeof arg) {
    case "undefined":
      throw new Error("missing argument")
    case "string":
      return arg
    case "number":
      return arg.toString()
    case "bigint":
      return arg.toString()
    default:
      if (hasSlug(arg)) {
        return arg.slug
      } else if (hasId(arg)) {
        return arg.id.toString()
      } else {
        throw new Error(`unsupported argument ${arg}`)
      }
  }
}

function rtoken(arg: RouteArgument) {
  if (is.string(arg)) {
    return encodeURIComponent(arg)
  } else {
    throw new Error("token must be provided as a string")
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export {
  rid,
  rtoken,
  type RouteArgument,
  type RouteGenerator,
  type RouteGeneratorOptions,
  isRouteGeneratorOptions,
}

//-------------------------------------------------------------------------------------------------
