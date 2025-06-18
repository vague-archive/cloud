document.addEventListener("void:game:mounted", (e) => {
  const game = (e as CustomEvent).detail.game
  console.log("void:game:mounted", game)
  checkPasswordEvery(10 * 60 * 1000) // 10 minutes
})

function checkPasswordEvery(frequency: number) {
  setInterval(async () => {
    const result = await fetch(`password-check`)
    if (result.status !== 200) {
      document.location.reload()
    }
  }, frequency)
}
