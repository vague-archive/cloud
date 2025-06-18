import { kysely } from "@deps"

/* 
 By default, the mysql2 driver (and by extension kysely) will transform timestamp
 columns to javascript Date objects, but our app prefers luxon DateTime objects
 which provide more powerful math and timezone functionality

 This plugin customizes the default behavior to transform the
 Date to a DateTime

*/

function serialize(value: unknown) {
  if (value instanceof DateTime) {
    return value.toJSDate()
  } else {
    return value
  }
}

function deserialize(value: unknown) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value)
  } else if (value === null) {
    return undefined
  } else {
    return value
  }
}

//-----------------------------------------------------------------------------

export class DateTimePlugin implements kysely.KyselyPlugin {
  #transformer = new DateTimeTransformer()

  public transformQuery(args: kysely.PluginTransformQueryArgs): kysely.RootOperationNode {
    return this.#transformer.transformNode(args.node)
  }

  public async transformResult(args: kysely.PluginTransformResultArgs): Promise<kysely.QueryResult<kysely.UnknownRow>> {
    args.result.rows.forEach((row) => {
      for (const [key, value] of Object.entries(row)) {
        row[key] = deserialize(value)
      }
    })
    return await Promise.resolve(args.result)
  }
}

//-----------------------------------------------------------------------------

class DateTimeTransformer extends kysely.OperationNodeTransformer {
  protected override transformValue(node: kysely.ValueNode): kysely.ValueNode {
    return {
      ...node,
      value: serialize(node.value),
    }
  }

  protected override transformPrimitiveValueList(node: kysely.PrimitiveValueListNode): kysely.PrimitiveValueListNode {
    return {
      ...node,
      values: node.values.map(serialize),
    }
  }
}

//-----------------------------------------------------------------------------

