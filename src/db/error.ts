interface MysqlError {
  code: string
  errno: number
  sqlState: string
  sqlMessage: string
  sql: string
}

function isMysqlError(value: object): value is MysqlError {
  return "code" in value && "errno" in value && "sqlState" in value && "sqlMessage" in value && "sql" in value
}

function violatedUniqueKey(value: object, index: string): value is MysqlError {
  if (!isMysqlError(value)) {
    return false
  }
  return value.code === "ER_DUP_ENTRY" && value.sqlMessage.includes(index)
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export {
  type MysqlError,
  isMysqlError,
  violatedUniqueKey,
}
