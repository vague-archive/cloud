import { assert, Test } from "@test"
import { ComponentProps, render } from "@lib/jsx"

//-------------------------------------------------------------------------------------------------

Test("render", () => {
  const jsx = <div>hello world</div>
  assert.equals(render(jsx), "<div>hello world</div>")
})

//-------------------------------------------------------------------------------------------------

Test("render with props", () => {
  const Component = (props: { name: string }) => <div>hello {props.name}</div>
  const jsx = <Component name="Jake" />
  assert.equals(render(jsx), "<div>hello Jake</div>")
})

//-------------------------------------------------------------------------------------------------

Test("render with children", () => {
  const Component = (props: ComponentProps) => <div>{props.children}</div>
  const jsx = (
    <Component>
      hello world
    </Component>
  )
  assert.equals(render(jsx), "<div>hello world</div>")
})

//-------------------------------------------------------------------------------------------------

Test("render with props and children", () => {
  const Component = (props: ComponentProps & { name: string }) => <div>{props.children} {props.name}</div>
  const jsx = (
    <Component name="Jake">
      hello
    </Component>
  )
  assert.equals(render(jsx), "<div>hello Jake</div>")
})

//-------------------------------------------------------------------------------------------------
