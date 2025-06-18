import { type MinionsData, MinionsQueueName } from "@minions"

//-------------------------------------------------------------------------------------------------

function MockMinionsQueue() {
  return MockQueue<MinionsData>(MinionsQueueName)
}

//-------------------------------------------------------------------------------------------------

function MockQueue<Data>(name: string) {
  const messages: Data[] = []

  const enqueue = async (arg: Data) => {
    messages.push(arg)
    return await Promise.resolve()
  }

  const close = async () => {
    return await Promise.resolve()
  }

  return {
    messages,
    name,
    enqueue,
    close,
  }
}

//-------------------------------------------------------------------------------------------------

export { MockMinionsQueue, MockQueue }

//-------------------------------------------------------------------------------------------------
