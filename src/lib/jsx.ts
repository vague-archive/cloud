import { JSX } from "@deps"
import { render as preactRender } from "preact/render"
import { prettyPrint } from "npm:html@1.0.0"

export function render(element: JSX.Element) {
  let content = preactRender(element, {}, { jsx: false, pretty: false })

  content = prettyPrint(content, {
    indent_size: 2,
    unformatted: ['pre', 'code'],
    max_char: 120,
  });

  if (content.startsWith("<html")) {
    // HACK: inject DOCTYPE, but ONLY for full page element
    return "<!DOCTYPE html>\n" + content
  } else {
    return content
  }
}

//-------------------------------------------------------------------------------------------------

export type Children =
  | string
  | number
  | undefined
  | false
  | JSX.Element
  | Children[]

//-------------------------------------------------------------------------------------------------

export type ComponentProps = JSX.IntrinsicAttributes & Partial<{
  children: Children
}>

//-------------------------------------------------------------------------------------------------

export function xdata<T extends object>(data: T): string {
  return JSON.stringify(data)
}

export function hxvals<T extends object>(data: T): string {
  return JSON.stringify(data)
}

//-------------------------------------------------------------------------------------------------

export function ExtendComponent<Component extends object, Attr extends object>(component: Component, attributes: Attr): Component & Attr {
  return Object.assign(component, attributes)
}

//-------------------------------------------------------------------------------------------------

type WebComponentProps = JSX.IntrinsicAttributes & Partial<{
  id: string
  name: string
  class: string
  "x-data": string
  children: Children
}>

declare module "npm:preact@10.24.1" { // keep in sync with deno.jsonc
  namespace JSX {
    // TODO: import this interface from the design system so it's easier to keep in sync
    interface IntrinsicElements {
      "card":                  WebComponentProps,
      "card-ribbon":           WebComponentProps,
      "card-header":           WebComponentProps,
      "card-header-rhs":       WebComponentProps,
      "card-title":            WebComponentProps,
      "card-body":             WebComponentProps,
      "card-buttons":          WebComponentProps,
      "field":                 WebComponentProps,
      "field-input":           WebComponentProps,
      "field-error":           WebComponentProps,
      "form-buttons":          WebComponentProps,
      "void-logo":             WebComponentProps,
      "fiasco-logo":           WebComponentProps,
      "fx-toggle":             WebComponentProps,
      "fx-modal":              WebComponentProps,
      "modal-outer-container": WebComponentProps,
      "modal-inner-container": WebComponentProps,
      "modal-card":            WebComponentProps,
    }
  }
}

//-------------------------------------------------------------------------------------------------
